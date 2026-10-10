// Sabotage round for the Declassified gate. Every mutation is applied to a DISPOSABLE copy of the
// files under test (echo/, the harness, the vision doc) in a temp dir; the worktree is never touched.
// Baseline first: if the unmutated copy is not green, every later red means nothing → refuse (exit 2).
// Usage: node sabotage.mjs   → writes 03-sabotage.md next to this file.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const drive = path.join(here, 'drive.mjs');

const M = [
  ['baseline (no mutation)', null, '', '', 'green'],
  ['kets left ASCII', 'echo/ui/accessibility.js', "return String(text).replace(/\\|([^|<>\\s]{1,8})>/g, '|$1⟩');", 'return String(text);', 'red'],
  ['missing number defaults to 0.5', 'echo/ui/declassified.js', ': NR);\nconst isPlain', ": '0.5');\nconst isPlain", 'red'],
  ['engine label dropped from groups', 'echo/ui/declassified.js', "head.append(el('span', 'echo-declass__engine', RUN_JOURNAL.engines[result.engine]));", '', 'red'],
  ['correction rule swapped (X↔Z)', 'echo/ui/declassified.js', 'rule = correctionText(e.applyX, e.applyZ);', 'rule = correctionText(e.applyZ, e.applyX);', 'red'],
  ['invalid result shown anyway', 'echo/ui/declassified.js', 'if (validateExperimentResult(result).length) return', 'if (false) return', 'red'],
  ['every choice shows the right why', 'echo/ui/declassified.js', "el('p', '', displayKets(c.why)),", "el('p', '', displayKets(q.choices[0].why)),", 'red'],
  ['a score is shown', 'echo/ui/declassified.js', "const out = [el('p', 'echo-declass__lead', DECLASSIFIED_UI.teachbackIntro)];", "const out = [el('p', 'echo-declass__lead', DECLASSIFIED_UI.teachbackIntro + ' Score: 2/3')];", 'red'],
  ['credits team line misspelt in data', 'echo/data/teachback.js', 'George, Harman, Epa', 'George, Harmon, Epa', 'red'],
  ['focus trap removed', 'echo/ui/declassified.js', 'if (trapTab(overlay, event)) return;', '', 'red'],
  ['Esc: no setPauseAllowed AND no stopPropagation', 'echo/ui/declassified.js', "      event.preventDefault();\n      event.stopPropagation();\n      close();", '      close();', 'red'],
  ['Esc: setPauseAllowed(false) removed only', 'echo/ui/declassified.js', '      if (menu) menu.setPauseAllowed(false);\n      fill', '      fill', 'null expected (stopPropagation still guards)'],
  ['reduced-motion rule deleted', 'echo/main.css', '  transition: none !important;\n  animation: none !important;', '', 'red'],
  ['panel cannot scroll (overflow hidden)', 'echo/main.css', '  overflow-y: auto;\n  overflow-x: hidden;\n  padding: 0.8em 1em 1.2em;', '  overflow: hidden;\n  padding: 0.8em 1em 1.2em;', 'red'],
  // A plain width: 70em is absorbed by flex-shrink (measured: stays green, no defect produced), so the
  // mutation forces the overflow with a min-width the flex item cannot shrink below.
  ['frame wider than the viewport (min-width 70em)', 'echo/main.css', '  width: min(62em, 100%);\n  height: 100%;', '  width: min(62em, 100%);\n  min-width: 70em;\n  height: 100%;', 'red'],
  ['tab focus ring removed', 'echo/main.css', '.echo-ui .echo-declass__panel:focus,\n.echo-ui .echo-declass__tab:focus {\n  outline: 3px solid var(--echo-focus);', '.echo-ui .echo-declass__panel:focus,\n.echo-ui .echo-declass__tab:focus {\n  outline: none;', 'red'],
  ['readings back in monospace (⟩ drawn like ")")', 'echo/main.css', '.echo-declass__readings dd,\n.echo-declass__expected {\n  font-variant-numeric: tabular-nums;', '.echo-declass__readings dd,\n.echo-declass__expected {\n  font-family: var(--echo-mono);', 'null expected (glyph shape; human read)'],
  ['probability keys unsorted (11 before 00)', 'echo/ui/declassified.js', '.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))', '', 'null expected (order not gated)'],
];

const rows = [];
for (const [name, file, from, to, expect] of M) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'declass-sab-'));
  fs.cpSync(path.join(repo, 'echo'), path.join(tmp, 'echo'), { recursive: true });
  fs.cpSync(path.join(repo, 'evidence/story-ui/harness'), path.join(tmp, 'evidence/story-ui/harness'), { recursive: true });
  fs.copyFileSync(path.join(repo, 'ECHO_MASTER_VISION.md'), path.join(tmp, 'ECHO_MASTER_VISION.md'));
  if (file) {
    const p = path.join(tmp, file);
    const src = fs.readFileSync(p, 'utf8');
    if (!src.includes(from)) { console.log(`REFUSED: mutation "${name}" did not apply (anchor not found in ${file})`); process.exit(2); }
    fs.writeFileSync(p, src.replace(from, to));
  }
  const r = spawnSync('node', [drive, path.join(tmp, 'out'), '--root', tmp], { encoding: 'utf8', timeout: 400000 });
  const fails = (r.stdout.match(/^FAIL .*/gm) || []).map((l) => l.replace(/\s+—.*$/, ''));
  const verdict = r.status === 0 ? 'green' : r.status === 1 ? 'RED' : `refused/no verdict (exit ${r.status})`;
  rows.push({ name, expect, verdict, fails });
  console.log(`${verdict.padEnd(8)} ${name}  ${fails.slice(0, 2).join(' | ')}`);
  if (!file && r.status !== 0) { console.log('REFUSED: baseline is not green'); process.exit(2); }
  fs.rmSync(tmp, { recursive: true, force: true });
}
const md = ['# Declassified gate: sabotage round', '', `Run: \`node evidence/story-ui/declassified/sabotage.mjs\` on ${new Date().toISOString()}. Each row is a disposable copy; the worktree was never mutated.`, '',
  '| mutation | expected | verdict | first failing checks |', '|---|---|---|---|',
  ...rows.map((r) => `| ${r.name} | ${r.expect} | ${r.verdict} | ${r.fails.slice(0, 3).join('<br>').replace(/\|/g, '\\|')} |`)];
fs.writeFileSync(path.join(here, '03-sabotage.md'), md.join('\n') + '\n');
