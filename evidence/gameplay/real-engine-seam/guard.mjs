// Fidelity guard, measured on REAL engine results (out/results.jsonl), then sabotaged.
//
// Usage: node guard.mjs [--sabotage <name>] [--gameplay dir] [--main dir] [--results file]
//        node guard.mjs --round      runs the baseline and every sabotage in a fresh process each
//
// Gameplay is judged through the names-only shim (lib.rename) so a result REACHES the rule and the
// fidelity check; unshimmed, gameplay refuses every teleport row on field names (seam.mjs), which
// would make any fidelity check here pass vacuously. v2 is judged by dryRunVerdict with the request
// built from the angles the engine was given.
//
// Expected values come from vision §7.4 (≥ 0.999999 ideal validation; corrections by §7.1's rule)
// and owner rulings, not from either implementation. Exit: 0 all checks hold · 1 a check failed · 2 could not run.
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, readRows, rename, machineAt } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const HERE = fileURLToPath(new URL('.', import.meta.url));
const GAMEPLAY = resolve(arg('--gameplay', '/tmp/seam-gameplay'));
const MAIN = resolve(arg('--main', '/tmp/seam-main'));
const RESULTS = resolve(arg('--results', join(HERE, 'out/results.jsonl')));

// Each sabotage edits a disposable copy only (lib.load). `side` says which judge it weakens.
const GP = 'game/missionRules.js';
const CT = 'contracts.js';
const SABOTAGES = {
  'gp-threshold-0.9': [[GP, 'const FIDELITY_OK = 0.999999;', 'const FIDELITY_OK = 0.9;']],
  'gp-no-fidelity-check': [[GP, "  if (r.fidelity < FIDELITY_OK) return `fidelity ${r.fidelity} below ${FIDELITY_OK}`;\n", '']],
  'gp-no-rule-check': [[GP, 'if (r.parameters.correctionX !== want.applyX || r.parameters.correctionZ !== want.applyZ) {', 'if (false) {']],
  'v2-threshold-0.9': [[CT, 'export const FIDELITY_PASS = 0.999999', 'export const FIDELITY_PASS = 0.9']],
  'v2-no-crosscheck': [[CT, 'export const FIDELITY_CROSSCHECK_TOLERANCE = 1e-6', 'export const FIDELITY_CROSSCHECK_TOLERANCE = 1']],
  'v2-threshold-0.9-and-no-crosscheck': [[CT, 'export const FIDELITY_PASS = 0.999999', 'export const FIDELITY_PASS = 0.9'],
    [CT, 'export const FIDELITY_CROSSCHECK_TOLERANCE = 1e-6', 'export const FIDELITY_CROSSCHECK_TOLERANCE = 1']],
};

if (process.argv.includes('--round')) {
  const lines = [];
  for (const name of ['baseline', ...Object.keys(SABOTAGES)]) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...(name === 'baseline' ? [] : ['--sabotage', name]),
      '--gameplay', GAMEPLAY, '--main', MAIN, '--results', RESULTS], { encoding: 'utf8', timeout: 120000 });
    const verdict = r.status === 0 ? 'GREEN' : r.status === 1 ? 'RED' : `NO-VERDICT(status ${r.status}, signal ${r.signal})`;
    const failed = (r.stdout.match(/^FAIL .*$/gm) ?? []).map((l) => l.replace(/^FAIL /, '').split(':')[0]);
    lines.push(`${name.padEnd(36)} ${verdict.padEnd(6)} failed checks: ${[...new Set(failed)].join(', ') || '-'}`);
    if (r.status !== 0 && r.status !== 1) lines.push(r.stderr.trim());
  }
  console.log(lines.join('\n'));
  process.exit(0);
}

const sab = arg('--sabotage', null);
if (sab && !SABOTAGES[sab]) { console.error(`unknown sabotage ${sab}`); process.exit(2); }
const edits = sab ? SABOTAGES[sab] : [];
const G = await load(GAMEPLAY, join(MAIN, 'echo/contracts.js'), `guard-gp-${sab ?? 'base'}`, edits.filter((e) => e[0] === GP));
const V = await load(GAMEPLAY, join(MAIN, 'echo/contracts.js'), `guard-v2-${sab ?? 'base'}`, edits.filter((e) => e[0] === CT));

const rows = readRows(RESULTS);
const corr = rows.filter((r) => r.mission === 'teleport_correction' && r.result);
const follows = (r) => r.applyX === (r.m1 === 1) && r.applyZ === (r.m0 === 1);
const generic = (r) => Boolean(r.request);
const withAngles = (r, res) => { const o = structuredClone(res); o.parameters.theta = r.theta; o.parameters.phi = r.phi; return o; };
const perturb = (r, f) => { const o = structuredClone(r); o.result.fidelity = f; return o; };

async function gpEvent(row, mutate = (x) => x) {
  const m = machineAt(G, 'TELEPORT_DRY_RUN');
  const out = await m.experiment(async () => mutate(rename(row)));
  return out.event;
}
const v2Verdict = (row) => V.contracts.dryRunVerdict(row.request, withAngles(row, row.result));

let checks = 0;
let fails = 0;
const check = (name, ok, detail) => { checks++; if (!ok) { fails++; console.log(`FAIL ${name}: ${detail}`); } };

// G1 real wrong-correction results (generic states: F = x², y² or z² ≤ 0.9) are refused.
const wrongGeneric = corr.filter((r) => generic(r) && !follows(r));
for (const r of wrongGeneric) {
  check('G1-gameplay-refuses-real-wrong', (await gpEvent(r)) === null, `${r.id} F=${r.result.fidelity} advanced`);
  check('G1-v2-refuses-real-wrong', !v2Verdict(r).unlocksCommit, `${r.id} F=${r.result.fidelity} unlocked`);
}
// G1b real wrong choice on a NON-generic named state that still scores F = 1 (§7.4 blind spot): the
// rule, not the fidelity, must refuse it.
const wrongButPerfect = corr.filter((r) => !generic(r) && !follows(r) && r.result.fidelity >= 0.999999);
for (const r of wrongButPerfect) check('G1b-gameplay-refuses-wrong-with-F1', (await gpEvent(r)) === null, `${r.id} F=${r.result.fidelity} advanced`);

// G2 a real CORRECT non-00 result, perturbed below §7.4's 0.999999, is refused.
const rightGeneric = corr.filter((r) => generic(r) && follows(r) && (r.m0 || r.m1));
for (const r of rightGeneric) {
  for (const f of [0.9999, 0.99999, 0.5, 0.0]) {
    const p = perturb(r, f);
    check('G2-gameplay-refuses-perturbed', (await gpEvent(p)) === null, `${r.id} F=${f} advanced`);
    check('G2-v2-refuses-perturbed', !v2Verdict(p).unlocksCommit, `${r.id} F=${f} unlocked`);
  }
  // Positive control: the unperturbed real result does advance (else G2 would pass vacuously).
  check('G2-control-real-correct-advances-gameplay', (await gpEvent(r)) === 'CORRECT_CALIBRATION', `${r.id} did not advance`);
  check('G2-control-real-correct-unlocks-v2', v2Verdict(r).unlocksCommit === true, `${r.id} did not unlock: ${v2Verdict(r).errors.join('; ')}`);
}

// G3 the commit: a real live_commit perturbed to 0.9999 must not commit.
for (const r of rows.filter((x) => x.mission === 'commit')) {
  const m = machineAt(G, 'TELEPORT_DRY_RUN_PASSED');
  const c = await m.commitTransfer(async () => rename(perturb(r, 0.9999)));
  check('G3-gameplay-commit-refuses-perturbed', !c.ok, `${r.id} committed at F=0.9999`);
}

console.log(`${sab ?? 'baseline'}: ${checks - fails}/${checks} checks hold (wrong generic ${wrongGeneric.length}, wrong-but-F1 ${wrongButPerfect.length}, right non-00 ${rightGeneric.length})`);
if (checks === 0) process.exit(2);
process.exit(fails ? 1 : 0);
