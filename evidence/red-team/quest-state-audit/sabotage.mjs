// Sabotage round (gate-independence laws 2, 3, 10, 15). Works ONLY on disposable copies of the export.
//   node sabotage.mjs --game <dir> --contracts <dir> --results <json> --scenarios <module> --out <file.json>
// --scenarios is a module exporting SCEN: [{ kind, id, want, why, patches, results? }]. When --game and
// --contracts are the same dir (gameplay imports ../contracts.js), one copy is patched for both.
// The d5ec620 round of 0003 used the pre-regrade run.mjs; it is at git 21c6187 (this file, in-line).
// Three kinds of scenario:
//   break  — a mutation of the audited code that should turn a GREEN check red;
//   fix    — minimal fixes that should turn every RED check green (positive control: the red is
//            not stuck — a correct implementation can pass it);
//   l1o    — all fixes but one: exactly the checks that one fix serves go red again (attribution).
// A patch whose `find` text is not present exactly as expected REFUSES the scenario (exit 2): a
// sabotage that silently did not apply would read as a null.
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const GAME = arg('--game'); const CONTRACTS = arg('--contracts'); const RESULTS = arg('--results'); const SCENARIOS = arg('--scenarios'); const OUT = arg('--out');
if (!GAME || !CONTRACTS || !RESULTS || !SCENARIOS || !OUT) { console.error('usage: node sabotage.mjs --game <dir> --contracts <dir> --results <json> --scenarios <module> --out <file.json>'); process.exit(2); }
const SAME = resolve(GAME) === resolve(CONTRACTS);
const HERE = dirname(fileURLToPath(import.meta.url));
const { SCEN } = await import(pathToFileURL(resolve(SCENARIOS)).href);

// ------------------------------------------------------------------ runner
function applyPatches(roots, patches) {
  // Fixes that anchor on the same line are applied in order, each on the previous one's output.
  for (const q of patches) {
    const f = join(roots[q.root], q.file);
    const src = readFileSync(f, 'utf8');
    const n = src.split(q.find).length - 1;
    if (n === 0 || (!q.all && n !== 1)) throw new Error(`patch anchor found ${n}x in ${q.file}: ${JSON.stringify(q.find.slice(0, 60))}`);
    writeFileSync(f, q.all ? src.split(q.find).join(q.repl) : src.replace(q.find, q.repl));
  }
}
function runOn(patches, mutateResults) {
  const tmp = mkdtempSync(join(tmpdir(), 'qsa-sab-'));
  const roots = { game: join(tmp, 'game'), contracts: SAME ? join(tmp, 'game') : join(tmp, 'contracts') };
  cpSync(GAME, roots.game, { recursive: true }); if (!SAME) cpSync(CONTRACTS, roots.contracts, { recursive: true });
  const results = join(tmp, 'results.json');
  const real = JSON.parse(readFileSync(RESULTS, 'utf8'));
  writeFileSync(results, JSON.stringify(mutateResults ? mutateResults(real) : real));
  try {
    applyPatches(roots, patches);
    const r = spawnSync('node', [join(HERE, 'run.mjs'), '--game', roots.game, '--contracts', roots.contracts, '--results', results], { encoding: 'utf8', timeout: 120000 });
    if (r.status === null) return { red: ['NO-VERDICT(hang)'], note: '' };
    if (r.status === 2) return { red: ['REFUSED'], note: (r.stderr || '').trim().split('\n')[0] };
    const lines = r.stdout.split('\n').filter((l) => /^(PASS|FAIL) /.test(l));
    return { red: lines.filter((l) => l.startsWith('FAIL')).map((l) => l.split(/\s+/)[1]), all: lines.map((l) => l.split(/\s+/)[1]), note: '' };
  } catch (e) { return { red: ['PATCH-REFUSED'], note: e.message }; } finally { rmSync(tmp, { recursive: true, force: true }); }
}
const base = runOn([]);
const BASE = base.red;
if (!base.all?.length) { console.error(`REFUSED: the unpatched copy gave no verdict (${base.red.join(',')} ${base.note})`); process.exit(2); }
console.log(`baseline red (unpatched copy): [${BASE.join(',')}]`);
const rows = []; let bad = 0;
for (const sc of SCEN) {
  const { red: observed, note } = runOn(sc.patches, sc.results);
  // A check already red at baseline cannot go "newly" red; its bite is shown by l1o instead.
  // break: judged on what goes red IN ADDITION to baseline; want ⊆ newRed (want [] = a null probe:
  // newRed must be empty). fix / l1o: judged on the full red set.
  const newRed = sc.kind === 'break' ? observed.filter((x) => !BASE.includes(x)) : observed;
  const same = sc.kind === 'break' && sc.want.length
    ? sc.want.every((w) => newRed.includes(w))
    : JSON.stringify([...newRed].sort()) === JSON.stringify([...sc.want].sort());
  if (!same) bad++;
  rows.push({ ...sc, patches: sc.patches.length, results: Boolean(sc.results), observed, newRed, note, ok: same });
  console.log(`${same ? 'AS-EXPECTED' : 'UNEXPECTED '} ${sc.kind.padEnd(5)} ${sc.id.padEnd(18)} want red=[${sc.want.join(',')}] ${sc.kind === 'break' ? 'newly red' : 'red'}=[${newRed.join(',')}]  — ${sc.why}${note ? `  (${note})` : ''}`);
}
console.log(`\n${rows.length} scenarios: ${rows.length - bad} as expected, ${bad} unexpected`);
// Every check must go red in at least one scenario: a break that turns it newly red, or the
// leave-one-out of its own fix (a check red at baseline cannot go newly red).
const bit = Object.fromEntries(base.all.map((id) => [id, rows.filter((r) => r.ok && (r.kind === 'break' ? r.newRed : r.kind === 'l1o' ? r.observed : []).includes(id)).map((r) => r.id)]));
const never = Object.entries(bit).filter(([, by]) => !by.length).map(([id]) => id);
for (const [id, by] of Object.entries(bit)) console.log(`coverage ${id.padEnd(22)} red under: ${by.join(', ') || 'NOTHING'}`);
console.log(`coverage: ${base.all.length - never.length}/${base.all.length} checks went red at least once${never.length ? `; never red: ${never.join(', ')}` : ''}`);
writeFileSync(OUT, JSON.stringify({ baselineRed: BASE, checks: base.all, coverage: bit, rows }, null, 2));
if (never.length) bad++;
process.exit(bad ? 1 : 0);
