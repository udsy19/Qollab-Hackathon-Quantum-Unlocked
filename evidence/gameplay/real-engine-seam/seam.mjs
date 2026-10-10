// Feed REAL engine results (out/results.jsonl from gen_results.py) into gameplay's quest machine and
// mission rules, and grade each row against the doc-derived expectation (expected.mjs).
//
// Usage: node seam.mjs --gameplay <gameplay worktree> --main <main worktree> [--results out/results.jsonl] [--out out]
//
// Gameplay's code is COPIED into a scratch tree next to the contracts.js under test, so it runs
// unmodified against (a) the contracts it was built on and (b) main's v2 contracts:
//   as-built   gameplay echo/game + gameplay's own echo/contracts.js (v1)
//   on-v2      gameplay echo/game + main's echo/contracts.js (v2)
//   on-v2+shim on-v2, with results passed through rename() below: names only, no number changes.
//              It is a DIAGNOSTIC of what is left once the names agree, not a proposed adapter.
// Exit: 0 every graded row matches the docs · 1 at least one does not · 2 could not run.
import { readFileSync, writeFileSync, mkdirSync, cpSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { expectedFor, STATES_FOR } from './expected.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const GAMEPLAY = resolve(arg('--gameplay', '/tmp/seam-gameplay'));
const MAIN = resolve(arg('--main', '/tmp/seam-main'));
const RESULTS = resolve(arg('--results', 'out/results.jsonl'));
const OUT = resolve(arg('--out', 'out'));
mkdirSync(OUT, { recursive: true });

async function load(contractsPath, label) {
  const dir = mkdtempSync(join(tmpdir(), `seam-${label}-`));
  cpSync(join(GAMEPLAY, 'echo/game'), join(dir, 'echo/game'), { recursive: true });
  cpSync(contractsPath, join(dir, 'echo/contracts.js'));
  const url = (f) => pathToFileURL(join(dir, 'echo', f)).href;
  return {
    label,
    contracts: await import(url('contracts.js')),
    state: await import(url('game/state.js')),
    rules: await import(url('game/missionRules.js')),
  };
}

let rows;
try {
  rows = readFileSync(RESULTS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
} catch (e) { console.error(`cannot read ${RESULTS}: ${e.message}`); process.exit(2); }
if (!rows.length) { console.error('zero rows: refusing to grade nothing'); process.exit(2); }

const v1 = await load(join(GAMEPLAY, 'echo/contracts.js'), 'v1');
const v2 = await load(join(MAIN, 'echo/contracts.js'), 'v2');
const V2 = v2.contracts;

// Names only. Every value comes from the engine's own result (commit: the bits the engine measured,
// and the rule its circuitDescription says it applied).
function rename(row) {
  const r = structuredClone(row.result);
  const p = r.parameters;
  if (row.mission === 'cloning' && r.observables?.jointFidelityWithTwoCopies !== undefined) r.fidelity = r.observables.jointFidelityWithTwoCopies;
  if ('applyX' in p) p.correctionX = p.applyX;
  if ('applyZ' in p) p.correctionZ = p.applyZ;
  if ('state' in p) p.stateId = p.state;
  if (row.mission === 'commit') {
    p.stateId = 'story_token';
    p.correctionX = r.measurementBits.m1 === 1;
    p.correctionZ = r.measurementBits.m0 === 1;
  }
  return r;
}

// Canonical §9.2 path; acknowledgements are sent after resultPanelShown() (owner ruling 13).
const PATH = ['BOOT_COMPLETE', 'START', 'SKIP', 'OPEN_CLONE_BOOTH', 'BASIS_DEMO_OK', 'SUPERPOSITION_DEMO_FAILED',
  'EXPLANATION_READ', 'EXIT_BOOTH', 'REACH_RELAY', 'PREPARE_BELL_PAIR', 'ATTEMPT_NO_SIGNALLING',
  'VIEW_RECEIVER_MARGINAL', 'OPEN_ROOFTOP', 'REPAIR_CLASSICAL_LINK', 'RUN_DRY_TEST', 'CORRECT_CALIBRATION'];
const ACK = new Set(['EXPLANATION_READ', 'VIEW_RECEIVER_MARGINAL']);
const bus = { emit() {}, on() { return () => {}; } };

function machineAt(G, target) {
  const m = G.state.createQuestMachine(bus);
  for (const ev of PATH) {
    if (m.state === target) break;
    if (ACK.has(ev)) m.resultPanelShown();
    const r = m.send(ev);
    if (!r.ok) throw new Error(`driving to ${target}: ${ev} refused in ${m.state}: ${r.reason}`);
  }
  if (m.state !== target) throw new Error(`could not drive to ${target}, stopped in ${m.state}`);
  return m;
}

async function runOn(G, row, questState, result) {
  const m = machineAt(G, questState);
  if (row.mission === 'commit') {
    const first = await m.commitTransfer(async () => result);
    const second = await m.commitTransfer(async () => { throw new Error('a second engine call left gameplay'); });
    return { event: first.ok ? 'COMMIT_TRANSFER' : null, reached: m.state, reason: first.reason ?? '', commit: m.commit,
      secondRefused: second.ok === false && !second.error };
  }
  const out = await m.experiment(async () => result);
  return { event: out.event, reached: m.state, reason: out.event ? '' : out.reason };
}

function v2Checks(row) {
  if (!row.result) return { valid: false, errors: [`engine raised: ${row.error}`] };
  const errors = V2.validateExperimentResult(row.result).map((e) => `shape: ${e}`);
  let verdict = null;
  if (row.mission === 'teleport_bits') errors.push(...V2.validateTeleportBitsResult(row.request, row.result).filter((e) => !e.startsWith('phase-1 result: ')).map((e) => `phase1: ${e}`));
  if (row.mission === 'teleport_correction') {
    if (!row.request) errors.push('phase2: no v2 request derivable — the engine takes a state NAME, v2 requires { theta, phi } (and this named state is not generic)');
    else {
      errors.push(...V2.validateTeleportCorrectionResult(row.request, row.result).filter((e) => !e.startsWith('phase-2 result: ')).map((e) => `phase2: ${e}`));
      verdict = V2.dryRunVerdict(row.request, row.result);
    }
  }
  if (row.mission === 'commit') errors.push('commit: v2 has no commit validator (no contract for the story-token transfer)');
  return { valid: errors.length === 0, errors, verdict };
}

// v2 again, with the engine's result echoing the angles it was GIVEN (parameters.theta/phi) — names
// only, so this measures what is left on the v2 side once the engine takes { theta, phi }.
function v2ShimChecks(row) {
  if (!row.result || !row.request) return null;
  const r = structuredClone(row.result);
  r.parameters.theta = row.theta; r.parameters.phi = row.phi;
  if (row.mission === 'teleport_bits') return { errors: V2.validateTeleportBitsResult(row.request, r) };
  if (row.mission === 'teleport_correction') {
    const v = V2.dryRunVerdict(row.request, r);
    return { errors: v.errors, passed: v.passed, unlocksCommit: v.unlocksCommit };
  }
  return null;
}

const grade = (expected, got) => (expected === undefined ? 'UNSETTLED' : expected === got ? 'PASS'
  : expected && !got ? 'FAIL-STUCK' : !expected && got ? 'FAIL-WRONG-ADVANCE' : 'FAIL-WRONG-EVENT');

const table = [];
for (const row of rows) {
  const v2c = v2Checks(row);
  for (const qs of STATES_FOR[row.mission]) {
    const expected = expectedFor(row, qs);
    const line = { id: row.id, call: row.call, questState: qs, expected: expected === undefined ? 'UNSETTLED' : expected,
      v1Valid: row.result ? v1.contracts.validateExperimentResult(row.result).length === 0 : false,
      v2Valid: v2c.valid, v2Errors: v2c.errors, v2DryRun: v2c.verdict && { passed: v2c.verdict.passed, unlocksCommit: v2c.verdict.unlocksCommit },
      v2Shim: v2ShimChecks(row), fidelity: row.result?.fidelity, oracleFidelity: row.oracleFidelity };
    for (const [key, G, xf] of [['asBuilt', v1, (r) => r.result], ['onV2', v2, (r) => r.result], ['onV2Shim', v2, rename]]) {
      if (!row.result) { line[key] = { event: null, reached: qs, reason: `engine raised: ${row.error}`, verdict: grade(expected, null) }; continue; }
      const got = await runOn(G, row, qs, xf(row));
      line[key] = { ...got, verdict: grade(expected, got.event) };
    }
    table.push(line);
  }
}

// One playthrough per configuration, BOOT → CREDITS, using only real results.
const pick = (id) => rows.find((r) => r.id === id);
const firstNon00 = rows.find((r) => r.mission === 'teleport_correction' && r.request && (r.m0 || r.m1) && r.applyX === (r.m1 === 1) && r.applyZ === (r.m0 === 1));
async function playthrough(G, xf) {
  const m = G.state.createQuestMachine(bus);
  const log = [];
  const step = (ev) => { if (ACK.has(ev)) m.resultPanelShown(); const r = m.send(ev); log.push(`${ev}:${r.ok ? 'ok' : 'REFUSED'}`); return r.ok; };
  const exp = async (row) => { const o = await m.experiment(async () => xf(row)); log.push(`${row.id}→${o.event ?? `null (${o.reason})`}`); return Boolean(o.event); };
  const plan = [() => step('BOOT_COMPLETE'), () => step('START'), () => step('SKIP'), () => step('OPEN_CLONE_BOOTH'),
    () => exp(pick('clone:zero')), () => exp(pick('clone:plus')), () => step('EXPLANATION_READ'), () => step('EXIT_BOOTH'),
    () => step('REACH_RELAY'), () => exp(pick('bell:I')), () => exp(pick('bell:X')), () => step('VIEW_RECEIVER_MARGINAL'),
    () => step('OPEN_ROOFTOP'), () => step('REPAIR_CLASSICAL_LINK'), () => step('RUN_DRY_TEST'), () => exp(firstNon00),
    async () => { const c = await m.commitTransfer(async () => xf(pick('commit:bloch_a:10'))); log.push(`commit→${c.ok ? 'COMMITTED' : `refused (${c.reason}) latch=${m.commit}`}`); return c.ok; },
    () => step('ANIMATION_END'), () => step('OPEN_CREDITS')];
  for (const s of plan) if (!(await s())) break;
  return { reached: m.state, commit: m.commit, log };
}
const plays = {
  asBuilt: await playthrough(v1, (r) => r.result),
  onV2: await playthrough(v2, (r) => r.result),
  onV2Shim: await playthrough(v2, rename),
};

writeFileSync(join(OUT, 'table.jsonl'), table.map((t) => JSON.stringify(t)).join('\n') + '\n');
writeFileSync(join(OUT, 'playthroughs.json'), JSON.stringify(plays, null, 2) + '\n');

// Markdown table (law 14): one row per experiment × branch × quest state.
const short = (s, n = 70) => (s && s.length > n ? `${s.slice(0, n)}…` : s ?? '');
const md = ['| row | quest state | expected (docs) | v2 valid | as-built: event → state | as-built | on-v2 | on-v2+shim | F engine | F oracle | first v2 error / refusal |',
  '|---|---|---|---|---|---|---|---|---|---|---|'];
for (const t of table) {
  md.push(`| ${t.id} | ${t.questState} | ${t.expected ?? '—'} | ${t.v2Valid ? 'VALID' : 'INVALID'} | ${t.asBuilt.event ?? 'none'} → ${t.asBuilt.reached} | ${t.asBuilt.verdict} | ${t.onV2.verdict} | ${t.onV2Shim.verdict} | ${t.fidelity ?? ''} | ${t.oracleFidelity === undefined ? '' : t.oracleFidelity.toFixed(6)} | ${short(t.v2Errors[0] ?? t.asBuilt.reason)} |`);
}
writeFileSync(join(OUT, 'table.md'), md.join('\n') + '\n');

// Counted, not typed.
const tally = (key) => table.reduce((a, t) => ((a[t[key].verdict] = (a[t[key].verdict] ?? 0) + 1), a), {});
const v2ValidByMission = rows.reduce((a, r) => { const k = r.mission; a[k] ??= { valid: 0, of: 0 }; a[k].of++; if (v2Checks(r).valid) a[k].valid++; return a; }, {});
const v2Shim = table.filter((t) => t.v2Shim).reduce((a, t) => { const k = t.id.split(':')[0]; a[k] ??= { valid: 0, of: 0, unlocksCommit: 0 }; a[k].of++; if (!t.v2Shim.errors.length) a[k].valid++; if (t.v2Shim.unlocksCommit) a[k].unlocksCommit++; return a; }, {});
const commitRows = table.filter((t) => t.id.startsWith('commit:')).map((t) => ({ id: t.id, asBuilt: t.asBuilt.commit, onV2Shim: t.onV2Shim.commit, secondRefused: [t.asBuilt.secondRefused, t.onV2Shim.secondRefused] }));
const summary = { rows: rows.length, v2Shim, commitRows, gradedLines: table.length, v2ValidByMission,
  asBuilt: tally('asBuilt'), onV2: tally('onV2'), onV2Shim: tally('onV2Shim'),
  playthroughs: Object.fromEntries(Object.entries(plays).map(([k, p]) => [k, `${p.reached} (commit ${p.commit})`])) };
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
const fails = table.filter((t) => t.asBuilt.verdict.startsWith('FAIL')).length;
process.exit(fails ? 1 : 0);
