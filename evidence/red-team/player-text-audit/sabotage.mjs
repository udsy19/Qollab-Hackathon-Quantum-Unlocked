#!/usr/bin/env node
// Sabotage round (law 15): every check must go red at least once. Each case mutates a DISPOSABLE copy of
// the export (law 10), re-runs check.mjs, and compares rule ids against the unmutated baseline.
// kind 'red': the named rule must appear (new finding). kind 'green': a repair; the named rule must vanish.
// kind 'refuse': the checker must exit 2. Usage: node sabotage.mjs --root <export> [--out <dir>]
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawnSync } from 'node:child_process';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = arg('--root'); const OUT = arg('--out', path.join(HERE, 'out'));
if (!ROOT || !fs.existsSync(path.join(ROOT, 'echo'))) { console.error('REFUSED: --root has no echo/'); process.exit(2); }
const D = 'echo/data/', S = D + 'story.js', O = D + 'objectives.js', T = D + 'teachback.js', M = 'echo/ui/menu.js', CSS = 'echo/main.css';
const L = (s) => `'${s}'`;
const CASES = [
  // (b) forbidden claims: the docs' own wording, then paraphrases (law 4a), injected into a plain line
  ['red', 'F-FTL', 'FTL: vision\'s banned sentence', S, L('The state now exists only at the vault.'), L('Quantum entanglement transmits the secret instantly.')],
  ['red', 'F-FTL', 'FTL paraphrase: faster than light', S, L('The state now exists only at the vault.'), L('The pair sent it to the vault faster than light.')],
  ['red', 'F-FTL', 'FTL paraphrase: story-ui null 1 (verb outside list)', S, L('The state now exists only at the vault.'), L('The Bell pair alone got the token to the vault.')],
  ['red', 'F-FTL', 'FTL paraphrase: story-ui null 2 (excused by "in no time")', S, L('The state now exists only at the vault.'), L('The pair carried the secret across the city in no time.')],
  ['red', 'F-FTL', 'FTL paraphrase: message down the blue cable', S, L('The state now exists only at the vault.'), L('The message travelled down the blue cable to the vault.')],
  ['red', 'F-CLONE', 'clone: two copies of the token', S, L('Two outputs. Not two copies.'), L('Now you have two copies of the token.')],
  ['red', 'F-CLONE', 'clone paraphrase: story-ui null 3 (duplicated the |+> state)', S, L('Two outputs. Not two copies.'), L('The booth duplicated the |+> state.')],
  ['red', 'F-CLONE', 'clone paraphrase: Rin kept a copy', S, L('Not anymore.'), L('Yes. I kept a copy of the state.')],
  ['red', 'F-RANDOM', 'certified quantum random', T, L('Thank you for playing.'), L('Every bit was certified quantum random.')],
  ['red', 'F-RANDOM', 'random paraphrase: story-ui null 4 (truly quantum)', T, L('Thank you for playing.'), L('Simulator randomness is truly quantum.')],
  ['red', 'F-RANDOM', 'random paraphrase: genuine randomness', T, L('Thank you for playing.'), L('These bits are genuinely random, straight from nature.')],
  ['red', 'F-MATTER', 'matter: the particle travelled', S, L('The state now exists only at the vault.'), L('The particle travelled to the vault.')],
  ['red', 'F-MATTER', 'matter paraphrase: teleported Rin', S, L('The state now exists only at the vault.'), L('We teleported Rin to the vault.')],
  ['red', 'F-TOKEN-REUSE', 'token reuse: retry the token', O, L('Commit locked. First pass a dry run whose bits are not 00: the token can be measured only once.'), L('Commit failed. Retry the story token as often as you need.')],
  ['red', 'F-TOKEN-REUSE', 'token paraphrase: token restored', O, L('Transfer complete. The source was measured; there is nothing left to send.'), L('Transfer failed. The token was restored to the capsule.')],
  ['red', 'F-RELAY-M1', 'RELAY READOUT for m1', O, L('LOCAL BELL-HALF READOUT m1'), L('RELAY READOUT m1')],
  ['red', 'F-RELAY-M1', 'relay paraphrase: m1 from the relay', O, L('Read the two bits: m0 is the source readout, m1 is your Bell half.'), L('Read the two bits: m0 is the source readout, m1 comes from the relay.')],
  ['red', 'F-RAN-ON', 'ran on IonQ', T, L('Thank you for playing.'), L('Your transfer ran on IonQ hardware.')],
  ['red', 'F-RAN-ON', 'ran-on paraphrase: real quantum computer', T, L('Thank you for playing.'), L('Every puzzle was computed on a real quantum computer.')],
  ['red', 'F-WCAG', 'WCAG claim', M, L('Controls'), L('WCAG 2.2 AA compliant')],
  ['red', 'F-EYE', 'measurement as an eye', S, L('Two outputs. Not two copies.'), L('Just by looking at the qubit you changed it.')],
  ['red', 'F-NOCLONE-OVERREACH', 'no-cloning forbids classical copying', T, L('Thank you for playing.'), L('No-cloning means classical data can never be copied either.')],
  ['red', 'F-DEFERRED-REMOTE', 'deferred circuit as remote quantum control', T, L('Thank you for playing.'), L('Quantum controlled corrections reach across to the remote receiver.')],
  ['red', 'F-ONE-SHOT', 'one shot proves', T, L('Thank you for playing.'), L('A single shot proves the transfer was perfect.')],
  ['red', 'F-ZBASIS-COPIES', 'two copies in Z basis', O, L('TWO BASIS VALUES MATCHED: YES'), L('TWO COPIES IN Z BASIS: YES')],
  ['red', 'F-RECEIVER-SAMPLED', 'sampled counts on Mission 2 receiver', O, L('RECEIVER-ONLY DATA'), L('RECEIVER-ONLY DATA (256 shots)')],
  ['red', 'F-PLACEHOLDER', 'placeholder in a plain line', S, L('Not anymore.'), L('FIXME line')],
  ['red', 'F-EMAIL', 'email in credits', T, L('Thank you for playing.'), L('Contact: udaya@example.com')],
  // (a) required strings deleted
  ['red', 'MISSING R-M1-LABEL', 'delete m1 label', O, L('LOCAL BELL-HALF READOUT m1'), L('READOUT m1')],
  ['red', 'MISSING R-M0-LABEL', 'delete m0 label', O, L('SOURCE READOUT m0'), L('READOUT m0')],
  ['red', 'MISSING R-ATTRIB', 'delete attribution (both copies)', M + '|' + T, 'This effort is supported by Qollab & IonQ', 'Supported by our sponsors'],
  ['red', 'MISSING R-LICENSE-HOLDER', 'delete license holder', T, 'udsy19 and contributors', 'the authors'],
  ['red', 'MISSING R-MIT', 'delete MIT', T, 'MIT', 'open'],
  ['red', 'MISSING R-CLONE-LEARN', 'delete learning text (all copies)', S + '|' + O + '|' + T, 'CNOT copies a known computational-basis bit', 'CNOT works on a known computational-basis bit'],
  ['red', 'MISSING R-RULE-X', 'delete X rule (all copies)', S + '|' + O + '|' + T, /if m1 = 1/g, 'as needed'],
  ['red', 'MISSING R-RULE-Z', 'delete Z rule (all copies)', S + '|' + O + '|' + T, /if m0 = 1/g, 'as needed'],
  ['red', 'MISSING R-CHOICES-4', 'remove the Z switch from the plan row', O, '  Z [{z}]', ''],
  ['red', 'MISSING R-BITS-FIRST', 'plan row shows switches before bits', O, L('IF m0 = {m0}, m1 = {m1}:  X [{x}]  Z [{z}]'), L('X [{x}]  Z [{z}]  (bits follow)')],
  ['red', 'MISSING R-TB-Q1', 'delete teach-back Q1', T, "Why didn't the copying machine work on the unknown state?", 'Question one.'],
  ['red', 'MISSING R-TB-Q2', 'delete teach-back Q2', T, 'Why was entanglement alone insufficient?', 'Question two.'],
  ['red', 'MISSING R-TB-Q3', 'delete teach-back Q3', T, 'What did the classical bits control after the Bell measurement?', 'Question three.'],
  ['red', 'MISSING TB-A1-NOCLONE', 'vacuous teach-back answer 1 (all no-clone strings)', T, /(answer|right): '[^']*copy[^']*'/g, "$1: 'Physics.'"],
  ['red', 'MISSING TB-A2-NOSIGNAL', 'vacuous teach-back answer 2', T, /(answer|right|why|text): ("[^"]*50\/50[^"]*"|'[^']*(50\/50|message)[^']*')/g, "$1: 'Physics.'"],
  ['red', 'MISSING TB-A3-BITS', 'vacuous teach-back answer 3', T, /(answer|right|why): '[^']*(X|Z)[^']*'/g, "$1: 'Physics.'"],
  // (c) rule order and endianness
  ['red', 'C-RULE-SWAP', 'swap m0/m1 in the hint rule', O, 'Apply X if m1 = 1 and Z if m0 = 1.', 'Apply X if m0 = 1 and Z if m1 = 1.'],
  ['red', 'C-RULE-SWAP', 'swap via arrow form', T, L('Thank you for playing.'), L('m0 = 1 → X.')],
  ['red', 'C-RAW-KEY', 'asymmetric raw key without m0/m1', O, L('Commit locked. First pass a dry run whose bits are not 00: the token can be measured only once.'), L('Result key 01 means apply X.')],
  // byte-level (law 13a)
  ['red', 'HOMOGLYPH', 'hyphen lookalike U+2010 in the m1 label', O, 'BELL-HALF', 'BELL‐HALF'],
  ['red', 'HOMOGLYPH', 'Cyrillic a in Quantubians', T, 'Quantubians', 'Quаntubians'],
  ['red', 'HOMOGLYPH', 'zero-width space in attribution', M, 'Qollab & IonQ', 'Qollab &​ IonQ'],
  ['red', 'MISSING R-M1-LABEL', 'non-breaking space in the m1 label (exact bytes)', O, 'READOUT m1', 'READOUT m1'],
  // repairs: baseline-red checks can also go green
  ['green', 'MISSING R-EXACT', 'repair: EXACT label on receiver panel', O, L('RECEIVER-ONLY DATA'), L('RECEIVER-ONLY DATA (EXACT)')],
  ['green', 'MISSING R-CREDITS', 'repair: ruled credits line', T, 'Engineering): Udaya', 'Engineering) — Udaya'],
  ['green', 'MISSING R-THEME', 'repair: theme named', T, L('Thank you for playing.'), L('Theme: Quantum Unlocked')],
  ['green', 'C-CAPTIONS-OFF', 'repair: remove the caption-hiding rule', CSS, /\.echo-ui\[data-subtitles="off"\] \.echo-dialogue \{[^}]*\}/, ''],
  ['green', 'F-PLACEHOLDER', 'repair: remove the TODO in credits', T, 'TODO_OWNER: third-party assets and their licenses (art lane to list; none yet)', 'Third-party assets: none'],
  // enabling steps (law 15): the checker must refuse, not pass, when it cannot read its inputs
  ['refuse', 'exit 2', 'remove echo/data', '__rmdir__', D, ''],
  ['refuse', 'exit 2', 'all literals stripped (empty files)', '__empty__', '', ''],
];

function copyTree(src, dst) { fs.cpSync(src, dst, { recursive: true }); }
function run(root, out) { const r = spawnSync(process.execPath, [path.join(HERE, 'check.mjs'), '--root', root, '--out', out, '--quiet'], { encoding: 'utf8' });
  const f = fs.existsSync(path.join(out, 'findings.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'findings.json'))) : null; return { code: r.status, f }; }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pta-sab-'));
const base = run(ROOT, path.join(tmp, 'base'));
if (base.code === 2 || !base.f) { console.error('REFUSED: baseline did not grade'); process.exit(2); }
// a finding is identified by rule + string, so a mutation that replaces a flagged line with a new flagged line still counts
const keys = (f, id) => new Set(f.filter((x) => x.rule === id || x.rule.startsWith(id + ' ')).map((x) => x.rule + '|' + x.str));
const count = (f, id) => keys(f, id).size;
const fresh = (b, a, id) => [...keys(a, id)].filter((k) => !keys(b, id).has(k)).length;
const rows = []; let bad = 0;
for (const [i, [kind, id, name, files, find, repl]] of CASES.entries()) {
  const root = path.join(tmp, 'c' + i); copyTree(ROOT, root); let applied = 0;
  if (files === '__rmdir__') { fs.rmSync(path.join(root, find), { recursive: true }); applied = 1; }
  else if (files === '__empty__') { for (const d of ['echo/data', 'echo/ui']) for (const f of fs.readdirSync(path.join(root, d))) fs.writeFileSync(path.join(root, d, f), '// emptied\n'); fs.writeFileSync(path.join(root, CSS), '/* emptied */\n'); applied = 1; }
  else for (const f of files.split('|')) {
    const p = path.join(root, f); const before = fs.readFileSync(p, 'utf8');
    const after = typeof find === 'string' ? before.split(find).join(repl) : before.replace(find, repl);
    if (after !== before) { applied++; fs.writeFileSync(p, after); }
  }
  let verdict;
  if (!applied) verdict = 'NOT APPLIED (mutation target missing)';
  else {
    const r = run(root, path.join(tmp, 'o' + i));
    if (kind === 'refuse') verdict = r.code === 2 ? 'REFUSED (exit 2) as expected' : `NULL: exit ${r.code}`;
    else if (!r.f) verdict = `NO VERDICT (exit ${r.code})`;
    else { const b = count(base.f, id), a = count(r.f, id);
      verdict = kind === 'red' ? (fresh(base.f, r.f, id) > 0 ? `RED (${id}: ${b}→${a})` : `NULL (${id}: ${b}→${a})`) : (a < b ? `GREEN (${id}: ${b}→${a})` : `NULL (${id}: ${b}→${a})`); }
  }
  const ok = /^(RED|GREEN|REFUSED)/.test(verdict); if (!ok) bad++;
  rows.push(`| ${i + 1} | ${kind} | ${id} | ${name.replace(/\|/g, '\\|')} | ${verdict} |`);
}
fs.rmSync(tmp, { recursive: true, force: true });
const md = ['| # | kind | check | mutation | verdict |', '|---|---|---|---|---|', ...rows,
  '', `${CASES.length} cases · ${CASES.length - bad} as expected · ${bad} null / not applied / no verdict`].join('\n');
fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'sabotage.md'), md + '\n'); console.log(md);
process.exit(bad ? 1 : 0);
