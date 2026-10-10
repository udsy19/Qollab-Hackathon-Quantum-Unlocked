// Sabotage round on PLATFORM's own checkers, on disposable copies only (law 10).
//   node platform_tools_sabotage.mjs <repo-root> <echo-root> <results.json> <teleport_v2.json>
//
// Part A — the contract (echo/contracts.js, the validator tools/contract-check certifies): start from
// a REAL engine result that is valid, apply one defect, and ask every validator the contract offers
// for that result kind. Caught = at least one validator returns an error / refuses to pass.
// Part B — tools/qollab-caps/check.mjs: copy the merged echo/, inject one extra backend.run shape,
// and ask whether a NEW finding names the injected file:line (the baseline is already red, so only
// a new finding counts).
// Every row is a verdict; a row that could not be built is REFUSED and makes the exit 2.
// Exit 0 = ran (nulls are REPORTED, not failed: they are the product of this round) · 2 = refused.
import { readFileSync, cpSync, mkdtempSync, writeFileSync, appendFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const [repo, echoRoot, resultsPath, tpPath] = process.argv.slice(2)
if (!tpPath) { console.error('usage: node platform_tools_sabotage.mjs <repo> <echo-root> <results.json> <teleport_v2.json>'); process.exit(2) }
const R = JSON.parse(readFileSync(resultsPath, 'utf8'))
const T = JSON.parse(readFileSync(tpPath, 'utf8'))
const C = await import(pathToFileURL(join(echoRoot, 'contracts.js')).href)
const clone = o => structuredClone(o)
let refused = 0
const rows = []

// The real phase-2 result for bits (1,0) with the rule's choice (Z only), re-keyed to the contract's
// phase-2 parameters (theta/phi) so the UNSABOTAGED baseline passes every validator: otherwise every
// row would be "caught" by the naming defect alone and the round would measure nothing.
const base2 = (() => {
  const r = clone(T.phase2.find(x => x.parameters.m0 === 1 && x.parameters.m1 === 0 && !x.parameters.applyX && x.parameters.applyZ))
  const { state, ...p } = r.parameters
  r.parameters = { ...p, theta: T.state.theta, phi: T.state.phi }
  return r
})()
const req2 = r => ({ theta: T.state.theta, phi: T.state.phi, m0: r.parameters.m0, m1: r.parameters.m1, applyX: r.parameters.applyX, applyZ: r.parameters.applyZ })
const teleportValidators = (res, req = req2(res)) => {
  const generic = C.validateExperimentResult(res)
  const phase2 = C.validateTeleportCorrectionResult(req, res)
  const v = C.dryRunVerdict(req, res)
  return { generic, phase2, passed: v.passed }
}

function resultRow(id, what, kind, mutated, judge) {
  try {
    const out = judge(mutated)
    rows.push({ part: 'A contract', id, what, kind, caught: out.caught, detail: out.detail })
  } catch (e) { refused++; rows.push({ part: 'A contract', id, what, kind, caught: 'REFUSED', detail: String(e.message ?? e).slice(0, 160) }) }
}
const genericOnly = r => { const e = C.validateExperimentResult(r); return { caught: e.length > 0, detail: e[0] ?? 'validateExperimentResult: valid' } }
const viaDryRun = (r, req) => {
  const t = teleportValidators(r, req)
  const caught = t.generic.length > 0 || t.phase2.length > 0 || !t.passed
  return { caught, detail: t.generic[0] ?? t.phase2[0] ?? (t.passed ? 'dryRunVerdict: passed' : 'dryRunVerdict: not passed') }
}

// controls: the unsabotaged baselines must pass, or the round measures nothing
const c1 = teleportValidators(base2)
rows.push({ part: 'A contract', id: 'control_phase2', what: 'real phase-2 result (1,0) Z-only, theta/phi keyed', kind: 'dry run', caught: !(c1.generic.length === 0 && c1.phase2.length === 0 && c1.passed) ? 'CONTROL RED' : 'control ok', detail: c1.phase2[0] ?? `passed=${c1.passed}` })
for (const k of ['CLONE_INTRO', 'RELAY_BELL_CREATED', 'TELEPORT_DRY_RUN_PASSED']) {
  const e = C.validateExperimentResult(R[k])
  rows.push({ part: 'A contract', id: `control_${k}`, what: `real ${R[k].experiment} result`, kind: 'generic', caught: e.length ? 'CONTROL RED' : 'control ok', detail: e[0] ?? 'valid' })
}

// 1. wrong m0/m1 order
resultRow('m0m1_swapped_in_bits', 'measurementBits swapped (m0↔m1) in the result, request unchanged', 'dry run',
  (() => { const r = clone(base2); r.measurementBits = { m0: 0, m1: 1 }; r.parameters.m0 = 0; r.parameters.m1 = 1; return r })(),
  r => viaDryRun(r, req2(base2)))
resultRow('m0m1_swapped_consistently', 'engine labels source readout m1 throughout (bits + params + request built from them)', 'dry run',
  (() => { const r = clone(base2); r.measurementBits = { m0: 0, m1: 1 }; r.parameters.m0 = 0; r.parameters.m1 = 1; return r })(),
  r => viaDryRun(r))
resultRow('m0m1_swapped_commit', 'story commit result with m0↔m1 swapped (no commit validator exists)', 'commit',
  (() => { const r = clone(R.TELEPORT_DRY_RUN_PASSED); const b = r.measurementBits; r.measurementBits = { m0: b.m1, m1: b.m0 }; return r })(), genericOnly)
resultRow('branch_keyqubits_reversed', 'branch table keyQubits [1,0] → [0,1] (keys still m1m0)', 'generic',
  (() => { const r = clone(R.TELEPORT_DRY_RUN); r.keyQubits = [0, 1]; return r })(), genericOnly)
resultRow('cloning_keyqubits_reversed', 'cloning table keyQubits [1,0] → [0,1] on |0>⊗... (keys 00..11)', 'generic',
  (() => { const r = clone(R.CLONE_INTRO); r.keyQubits = [0, 1]; return r })(), genericOnly)
// 2. documented_preview carrying counts
resultRow('preview_with_counts', 'documented_preview result carrying counts', 'generic',
  (() => { const r = clone(R.RELAY_BELL_CREATED); r.experiment = 'cloning'; r.engine = 'documented_preview'; r.keyQubits = [1, 0]; r.qubits = 2; delete r.probabilities; r.counts = { '00': 128, '11': 128 }; return r })(), genericOnly)
resultRow('preview_with_counts_in_observables', 'documented_preview smuggling shot counts as observables', 'generic',
  (() => { const r = clone(R.CLONE_INTRO); r.engine = 'documented_preview'; r.observables = { ...r.observables, shots00: 128, shots11: 128 }; return r })(), genericOnly)
// 3. missing keyQubits
resultRow('missing_keyqubits_probs', 'probabilities without keyQubits', 'generic', (() => { const r = clone(R.CLONE_BASIS_PASSED); delete r.keyQubits; return r })(), genericOnly)
resultRow('missing_keyqubits_counts', 'backend counts without keyQubits', 'generic',
  (() => { const r = clone(R.BACKEND_VERIFICATION); r.experiment = 'backend_verification'; delete r.keyQubits; return r })(), genericOnly)
// 4. fidelity 0.9 labelled pass
resultRow('fidelity_0_9_dry_run', 'dry run: rule followed, fidelity 0.9, facts say PASS', 'dry run',
  (() => { const r = clone(base2); r.fidelity = 0.9; r.facts = ['Calibration PASS.']; return r })(), r => viaDryRun(r))
resultRow('fidelity_0_9_commit', 'story commit: fidelity 0.9, facts say transfer complete', 'commit',
  (() => { const r = clone(R.TELEPORT_DRY_RUN_PASSED); r.fidelity = 0.9; r.facts = ['Transfer complete: PASS.']; return r })(), genericOnly)
resultRow('fidelity_0_9_cloning_basis', 'cloning |0>: joint fidelity 0.9 yet "two copies"', 'generic',
  (() => { const r = clone(R.CLONE_INTRO); r.observables.jointFidelityWithTwoCopies = 0.9; return r })(), genericOnly)
resultRow('wrong_choice_reported_1', 'dry run: wrong choice (X+Z on bits 1,0) reported fidelity 1', 'dry run',
  (() => { const r = clone(base2); r.parameters.applyX = true; r.fidelity = 1; return r })(), r => viaDryRun(r))

// Part B — qollab-caps on a disposable copy
function capsRun(root) {
  const p = spawnSync('node', [join(repo, 'tools/qollab-caps/check.mjs'), '--root', root], { encoding: 'utf8' })
  return { code: p.status, out: p.stdout + p.stderr }
}
const baseRoot = mkdtempSync(join(tmpdir(), 'caps-base-')); cpSync(echoRoot, join(baseRoot, 'echo'), { recursive: true })
const baseline = capsRun(join(baseRoot, 'echo'))
rows.push({ part: 'B qollab-caps', id: 'control', what: 'merged echo/ unmodified', kind: 'static', caught: `baseline exit ${baseline.code}`, detail: (baseline.out.match(/^(RED|GREEN).*$/m) ?? ['?'])[0] })
const INJECT = [
  ['second_js_site', 'a second backend.run in a new game/ module', 'game/verify2.js', 'export async function again() {\n  return backend.run(null, { shots: 256 })\n}\n', 2],
  ['aliased_js_site', 'const b = backend; b.run(...)', 'game/alias.js', 'const b = backend\nexport const go = () => b.run(null, { shots: 256 })\n', 2],
  ['destructured_js_site', 'const { run } = backend; run(...)', 'game/destructure.js', 'const { run } = backend\nexport const go = () => run(null, { shots: 256 })\n', 2],
  ['bracket_js_site', "backend['run'](...)", 'game/bracket.js', "export const go = () => backend['run'](null, { shots: 256 })\n", 1],
  ['loop_one_site', 'ONE site called in a loop (two jobs at runtime)', 'game/loop.js', 'export async function go() {\n  for (let i = 0; i < 2; i++) await backend.run(null, { shots: 256 })\n}\n', 2],
  ['second_python_site', 'a second backend.run in Python', 'quantum/extra.py', 'def again(backend):\n    return backend.run(None, shots=256)\n', 2],
  ['python_getattr_site', 'getattr(backend, "run")(...) in Python', 'quantum/extra2.py', 'def again(backend):\n    return getattr(backend, "run")(None, shots=256)\n', 2],
]
for (const [id, what, rel, code, line] of INJECT) {
  const d = mkdtempSync(join(tmpdir(), 'caps-sab-')); cpSync(echoRoot, join(d, 'echo'), { recursive: true })
  writeFileSync(join(d, 'echo', rel), code)
  // import it from main.js so it is reachable, the way a real second site would be
  if (rel.endsWith('.js')) appendFileSync(join(d, 'echo', 'main.js'), `\nimport './${rel}';\n`)
  const r = capsRun(join(d, 'echo'))
  const hit = r.out.split('\n').filter(l => l.includes(`echo/${rel}:`) && !l.includes('info:'))
  rows.push({ part: 'B qollab-caps', id, what, kind: 'static', caught: hit.length > 0, detail: hit[0]?.trim() ?? `no finding names echo/${rel} (exit ${r.code})` })
  rmSync(d, { recursive: true, force: true })
}
rmSync(baseRoot, { recursive: true, force: true })

console.log('| part | sabotage | what | validator path | verdict | first message |')
console.log('|---|---|---|---|---|---|')
for (const r of rows) {
  const v = r.caught === true ? 'caught' : r.caught === false ? '**NULL**' : r.caught
  console.log(`| ${r.part} | \`${r.id}\` | ${r.what} | ${r.kind} | ${v} | ${String(r.detail).replace(/\|/g, '/').slice(0, 170)} |`)
}
const nulls = rows.filter(r => r.caught === false).map(r => r.id)
const controlsRed = rows.filter(r => r.caught === 'CONTROL RED').map(r => r.id)
console.log(`\n${rows.filter(r => typeof r.caught === 'boolean').length} sabotages; NULLS (${nulls.length}): ${nulls.join(', ') || 'none'}`)
if (controlsRed.length) console.log(`controls red (a row measured against a red control is weaker): ${controlsRed.join(', ')}`)
process.exit(refused ? 2 : 0)
