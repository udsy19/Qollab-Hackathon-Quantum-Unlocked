#!/usr/bin/env node
// Player-text checker. Reads raw bytes of the scanned files (never story-ui's own tests or metadata),
// extracts string literals with a tokenizer, and grades them against expected.mjs.
// Usage: node check.mjs --root <dir containing echo/> [--files a,b,..] [--out <dir>] [--quiet]
// Exit: 0 no finding at/above MED · 1 findings · 2 refused (no files / no strings).
import fs from 'node:fs'; import path from 'node:path';
import * as E from './expected.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = arg('--root'); const OUT = arg('--out'); const QUIET = process.argv.includes('--quiet');
const OWNER = (f) => f.startsWith('echo/data/') || f.startsWith('echo/ui/') || f === 'echo/main.css' ? 'story-ui'
  : f.startsWith('echo/game/') || f.startsWith('echo/scene/') ? 'gameplay' : f.startsWith('echo/quantum/') ? 'quantum' : 'platform';
if (!ROOT || !fs.existsSync(path.join(ROOT, 'echo'))) { console.error('REFUSED: --root has no echo/'); process.exit(2); }
const DEFAULT_GLOBS = ['echo/data', 'echo/ui', 'echo/main.css'];
const want = (arg('--files') || DEFAULT_GLOBS.join(',')).split(',');
const files = [];
for (const w of want) {
  const p = path.join(ROOT, w); if (!fs.existsSync(p)) { console.error(`REFUSED: missing ${w}`); process.exit(2); }
  if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p).sort()) { if (/\.(m?js|css|html)$/.test(f)) files.push(path.join(w, f)); }
  else files.push(w);
}

// --- tokenizer: string literals (', ", `) with line numbers; comments skipped ---
function literals(src, isCss) {
  const out = []; let i = 0, line = 1;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && n === '*') { const j = src.indexOf('*/', i + 2); const e = j < 0 ? src.length : j + 2; line += (src.slice(i, e).match(/\n/g) || []).length; i = e; continue; }
    if (!isCss && c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c, start = line, key = (src.slice(Math.max(0, i - 40), i).match(/(\w+)\s*:\s*$/) || [])[1] || ''; let s = ''; i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') { const e = src[i + 1]; s += e === 'n' ? '\n' : e === 'u' ? String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16)) : e; i += e === 'u' ? 6 : 2; continue; }
        if (q === '`' && src[i] === '$' && src[i + 1] === '{') { let d = 1; i += 2; while (i < src.length && d) { if (src[i] === '{') d++; else if (src[i] === '}') d--; if (src[i] === '\n') line++; i++; } s += '‹…›'; continue; }
        if (src[i] === '\n') { line++; if (q !== '`') break; }
        s += src[i]; i++;
      }
      i++; out.push({ line: start, s, key }); continue;
    }
    i++;
  }
  return out;
}

const strings = []; const census = []; const findings = [];
const add = (f) => findings.push(f);
for (const f of files) {
  const buf = fs.readFileSync(path.join(ROOT, f)); const src = buf.toString('utf8');
  // byte census (law 13a): every non-ASCII code point, classified
  let line = 1;
  for (let k = 0; k < src.length; k++) {
    const cp = src.codePointAt(k); if (cp > 0xffff) k++;
    if (cp === 10) { line++; continue; }
    if (cp < 128) continue;
    const conf = E.CONFUSABLE_RANGES.find(([a, b]) => cp >= a && cp <= b);
    const prev = src[k - 1] || '', next = src[k + (cp > 0xffff ? 2 : 1)] || '';
    const letterInWord = /\p{L}/u.test(String.fromCodePoint(cp)) && !/[\u0000-ɏ]/.test(String.fromCodePoint(cp)) && (/[A-Za-z]/.test(prev) || /[A-Za-z]/.test(next));
    const cls = conf ? `CONFUSABLE ${conf[2]}` : letterInWord ? 'CONFUSABLE non-Latin letter inside a Latin word' : E.ALLOWED_NONASCII[cp] ? 'allowed' : 'UNLISTED';
    census.push({ file: f, line, cp: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'), ch: String.fromCodePoint(cp), cls });
    if (cls.startsWith('CONFUSABLE')) add({ file: f, line, str: src.split('\n')[line - 1].trim().slice(0, 120), rule: 'HOMOGLYPH', why: `${cls} U+${cp.toString(16).toUpperCase()}`, cite: 'gate-independence law 13a; exact owner strings OA:41, OA:50', sev: 'HIGH' });
  }
  for (const l of literals(src, f.endsWith('.css'))) if (l.s.trim().length > 1) strings.push({ file: f, ...l });
}
if (!strings.length) { console.error('REFUSED: zero string literals extracted'); process.exit(2); }

const sentences = (s) => s.split(/(?<=[.!?])\s+|\n+/).filter((x) => x.trim());
// (a) required
const requiredResult = [];
for (const r of E.REQUIRED) {
  const hit = r.anyOf ? (r.anyOf.map((set) => set.map((re) => strings.find((x) => re.test(x.s)))).find((hits) => hits.every(Boolean)) || [])[0]
    : strings.find((x) => r.text ? x.s.includes(r.text) : r.re.test(x.s));
  requiredResult.push({ id: r.id, ok: !!hit, at: hit ? `${hit.file}:${hit.line}` : '' });
  if (!hit) add({ file: '(absent)', line: 0, str: r.text || r.desc, rule: `MISSING ${r.id}`, why: 'required string not found in any scanned literal (exact bytes)', cite: r.cite, sev: r.sev });
}
// (b) forbidden + (c) rule swap / raw key
const negatedOk = [];
for (const x of strings) for (const sen of sentences(x.s)) {
  for (const F of E.FORBIDDEN) for (const re of F.re) {
    if (!re.test(sen)) continue;
    if (!F.nonegate && E.NEG.test(sen.replace(E.NEG_IDIOMS, ''))) { negatedOk.push({ file: x.file, line: x.line, id: F.id, sen }); continue; }
    // A misconception quoted so the game can refute it: downgraded to MED only if the gate can VALIDATE
    // the refutation (the next literal is a `why` that contains a negator). Rendering is not visible here.
    const nx = strings[strings.indexOf(x) + 1];
    const voiced = x.key === 'wrong' && nx && nx.key === 'why' && E.NEG.test(nx.s.replace(E.NEG_IDIOMS, ''));
    add({ file: x.file, line: x.line, str: sen.slice(0, 160), rule: F.id + (voiced ? ' (voiced misconception, refuted)' : ''), why: `matches ${re}` + (voiced ? `; refutation at line ${nx.line}` : ''), cite: F.cite + (voiced ? '; V:283 "misconception corrected"' : ''), sev: voiced && F.sev === 'HIGH' ? 'MED' : F.sev }); break;
  }
  for (const re of E.RULE_SWAP) if (re.test(sen)) add({ file: x.file, line: x.line, str: sen.slice(0, 160), rule: 'C-RULE-SWAP', why: `X bound to m0 or Z bound to m1: ${re}`, cite: 'V:453; V:263', sev: 'HIGH' });
  const rk = sen.match(E.RAW_KEY);
  if (rk && !/\bm0\b/.test(sen) && !/\bm1\b/.test(sen)) {
    const sym = /\b(00|11)\b/.test(rk[0]); // 00/11 read the same in either bit order: no endianness hazard, only unlabeled
    add({ file: x.file, line: x.line, str: sen.slice(0, 160), rule: 'C-RAW-KEY', why: (sym ? 'symmetric key, unlabeled (UX)' : 'asymmetric raw key, no m0/m1 naming: Qiskit key order is m1 m0') + ' (physics-oracle/out/endianness_table.txt)', cite: 'V:454; V:428', sev: sym ? 'LOW' : 'MED' });
  }
}
// (b2) structural: a stylesheet rule that hides the dialogue captions on a setting (OA:41; V:436)
for (const f of files.filter((f) => f.endsWith('.css'))) {
  const css = fs.readFileSync(path.join(ROOT, f), 'utf8'); const re = /([^{}]*(subtitle|caption)[^{}]*)\{([^}]*)\}/gi; let m;
  while ((m = re.exec(css))) if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0\b/.test(m[3]) && /off|false|hidden|none/i.test(m[1]))
    add({ file: f, line: css.slice(0, m.index + m[1].search(/\S/)).split('\n').length, str: m[1].trim() + ' { ' + m[3].trim() + ' }', rule: 'C-CAPTIONS-OFF', why: 'a setting hides the dialogue captions; the owner ruled captions always on (setting = style only)', cite: 'OA:41 "Captions are always on"; V:436', sev: 'HIGH' });
}
// (d) teach-back truths: graded on echo/data/teachback.* only if present
const tb = strings.filter((x) => /teachback/i.test(x.file));
const tbResult = [];
for (const T of E.TEACHBACK_TRUTHS) {
  const hit = tb.find((x) => T.all.every((re) => re.test(x.s)));
  tbResult.push({ id: T.id, ok: !!hit, at: hit ? `${hit.file}:${hit.line}` : '' });
  if (!hit) add({ file: tb[0]?.file || '(no teachback file)', line: 0, str: T.id, rule: `MISSING ${T.id}`, why: 'no single teach-back string carries all the truth markers', cite: T.cite, sev: 'MED' });
}

for (const f of findings) f.owner = f.file.startsWith('echo/') ? OWNER(f.file) : 'story-ui';
const rank = { HIGH: 0, MED: 1, LOW: 2 };
findings.sort((a, b) => rank[a.sev] - rank[b.sev] || a.file.localeCompare(b.file) || a.line - b.line);
const red = findings.filter((f) => f.sev !== 'LOW').length;
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = ['| # | file:line | string | rule | why | doc | owner | sev |', '|---|---|---|---|---|---|---|---|',
  ...findings.map((f, i) => `| ${i + 1} | ${f.file}:${f.line} | ${esc(f.str)} | ${f.rule} | ${esc(f.why)} | ${f.cite} | ${f.owner} | ${f.sev} |`)].join('\n');
const summary = { root: ROOT, files, strings: strings.length, nonAscii: census.length, findings: findings.length,
  bySev: Object.fromEntries(['HIGH', 'MED', 'LOW'].map((s) => [s, findings.filter((f) => f.sev === s).length])),
  required: requiredResult, teachback: tbResult, negatedOk: negatedOk.length };
if (OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'findings.md'), table + '\n');
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');
  fs.writeFileSync(path.join(OUT, 'census.tsv'), 'file\tline\tcp\tchar\tclass\n' + census.map((c) => `${c.file}\t${c.line}\t${c.cp}\t${c.ch}\t${c.cls}`).join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, 'negated_ok.tsv'), negatedOk.map((n) => `${n.file}:${n.line}\t${n.id}\t${n.sen.replace(/\s+/g, ' ')}`).join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, 'strings.tsv'), strings.map((x) => `${x.file}:${x.line}\t${x.s.replace(/\s+/g, ' ')}`).join('\n') + '\n');
}
if (!QUIET) console.log(table);
console.log(`checked ${files.length} files, ${strings.length} literals, ${census.length} non-ASCII chars → ${findings.length} findings (HIGH ${summary.bySev.HIGH}, MED ${summary.bySev.MED}, LOW ${summary.bySev.LOW}); negated-ok ${negatedOk.length}`);
process.exit(red ? 1 : 0);
