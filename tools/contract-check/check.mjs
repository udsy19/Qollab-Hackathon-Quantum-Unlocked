#!/usr/bin/env node
// tools/contract-check/check.mjs — does echo/contracts.js say what the vision says?
//
//   node tools/contract-check/check.mjs                      # exit 0 green · 1 red · 2 refused
//   node tools/contract-check/check.mjs --contracts <path>   # grade a disposable copy (sabotage)
//
// INDEPENDENCE (gate-independence law 8): the expected state set and the expected edges are
// parsed from ECHO_MASTER_VISION.md §9.1 / §9.2, never read back out of the module under test.
// The only edges the module may carry beyond the vision are the ADDITIONS listed below, each
// with the reason it exists; any other extra edge is red. Reachability walks the public
// transition() function, not the TRANSITIONS object, so a table/function drift is caught too.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../..')
const argPath = process.argv.indexOf('--contracts')
const CONTRACTS = argPath > 0 ? resolve(process.argv[argPath + 1]) : resolve(ROOT, 'echo/contracts.js')

let checks = 0
let failures = 0
function ok(cond, msg) {
  checks++
  if (!cond) { failures++; console.log(`  FAIL  ${msg}`) }
}
// Strict enums throw on a missing key by design; the check must record that as a FAIL, not crash.
const get = (obj, k) => (obj && Object.hasOwn(obj, k) ? obj[k] : undefined)
function refuse(msg) { console.log(`REFUSED: ${msg}`); process.exit(2) }

// ---------------------------------------------------------------- ground truth from the vision
const vision = readFileSync(resolve(ROOT, 'ECHO_MASTER_VISION.md'), 'utf8')
function codeBlockAfter(heading) {
  const at = vision.indexOf(heading)
  if (at < 0) refuse(`heading "${heading}" not found in ECHO_MASTER_VISION.md`)
  const m = /```[a-z]*\n([\s\S]*?)```/.exec(vision.slice(at))
  if (!m) refuse(`no code block after "${heading}"`)
  return m[1]
}
const VISION_STATES = codeBlockAfter('## 9.1 Required states').split('\n').map(s => s.trim()).filter(Boolean)
const VISION_EDGES = []
for (const line of codeBlockAfter('## 9.2 Type-safe-ish transition design').split('\n')) {
  const m = /^\s*([A-Z_]+):\s*\{(.*)\},?\s*$/.exec(line)
  if (!m) continue
  for (const pair of m[2].matchAll(/([A-Z_]+):\s*'([A-Z_]+)'/g)) VISION_EDGES.push([m[1], pair[1], pair[2]])
}
// Guards in the units of what they defend: §9.1 lists 21 states and §9.2 18 rows carrying 20 edges (OPENING and ENDING have two). A parser
// that silently matched fewer would make every later comparison vacuous.
if (VISION_STATES.length !== 21) refuse(`parsed ${VISION_STATES.length} states from §9.1, expected 21`)
if (VISION_EDGES.length !== 20) refuse(`parsed ${VISION_EDGES.length} edges from §9.2, expected 20`)

// Edges the vision's table does not carry but its text requires. Each must stay justified.
const ADDITIONS = [
  ['BOOT', 'BOOT_COMPLETE', 'TITLE', '§9.1 requires BOOT and §3.4 flows BOOT → TITLE; §9.2 has no BOOT row'],
  ['DECLASSIFIED', 'OPEN_CREDITS', 'CREDITS', '§3.4 flows DECLASSIFIED → CREDITS; §9.2 only reaches CREDITS from ENDING'],
  ['DECLASSIFIED', 'CLOSE_SCIENCE', 'ENDING', 'owner 2026-10-10 "13 lane design questions" #1: DECLASSIFIED goes back to ENDING'],
  ['ENDING', 'RESTART', 'TITLE', 'owner 2026-10-10 "13 lane design questions" #12: ENDING offers RESTART; §9.5 resetGame()'],
]
const EXPECTED_EDGES = [...VISION_EDGES, ...ADDITIONS.map(a => a.slice(0, 3))]
const EXPECTED_EVENTS = [...new Set(EXPECTED_EDGES.map(e => e[1]))]

// ---------------------------------------------------------------- the module under test
let C
try {
  C = await import(pathToFileURL(CONTRACTS).href)
} catch (e) {
  console.log(`  FAIL  cannot import ${CONTRACTS}: ${e.message}`)
  console.log('contract-check: RED — module did not load (0 checks ran)')
  process.exit(1)
}

console.log('· states')
ok(Array.isArray(C.QUEST_STATE_LIST), 'QUEST_STATE_LIST is exported as an array')
const states = C.QUEST_STATE_LIST || []
ok(JSON.stringify(states) === JSON.stringify(VISION_STATES),
  `QUEST_STATE_LIST equals §9.1 verbatim and in order (got ${JSON.stringify(states)})`)
for (const s of VISION_STATES) ok(get(C.QUEST_STATES, s) === s, `QUEST_STATES.${s} === '${s}'`)
ok(C.INITIAL_STATE === 'BOOT', 'INITIAL_STATE is BOOT (§9.1 first, §3.4 first)')

console.log('· loud failure on a wrong name')
for (const [name, obj] of [['QUEST_STATES', C.QUEST_STATES], ['QUEST_EVENTS', C.QUEST_EVENTS],
  ['BUS_EVENTS', C.BUS_EVENTS], ['INTERACTABLE_IDS', C.INTERACTABLE_IDS], ['ENGINE_KINDS', C.ENGINE_KINDS],
  ['EXPERIMENTS', C.EXPERIMENTS], ['EVENT_SOURCES', C.EVENT_SOURCES], ['UI_HOOKS', C.UI_HOOKS]]) {
  ok(obj && Object.isFrozen(obj), `${name} is frozen`)
  let threw = false
  try { void obj.CLONE_UNDERSTOD } catch { threw = true }
  ok(threw, `${name}.<misspelt> throws instead of returning undefined`)
}

console.log('· transitions: vision edges present, nothing unexplained added')
const tr = C.transition
ok(typeof tr === 'function', 'transition is exported')
for (const [from, ev, to] of EXPECTED_EDGES) {
  let r
  try { r = tr(from, ev) } catch (e) { r = { threw: e.message } }
  ok(r.ok === true && r.state === to, `${from} --${ev}--> ${to} (got ${JSON.stringify(r)})`)
}
for (const ev of EXPECTED_EVENTS) ok(Object.hasOwn(C.QUEST_EVENTS || {}, ev), `QUEST_EVENTS.${ev} exists`)
const eventList = Object.keys(C.QUEST_EVENTS || {})
ok(eventList.length === EXPECTED_EVENTS.length,
  `QUEST_EVENTS has exactly the ${EXPECTED_EVENTS.length} vision+addition events (got ${eventList.length})`)

console.log('· invalid events are refused, state unchanged')
const allowed = new Set(EXPECTED_EDGES.map(([f, e]) => `${f}|${e}`))
let refusals = 0
for (const s of VISION_STATES) for (const ev of EXPECTED_EVENTS) {
  if (allowed.has(`${s}|${ev}`)) continue
  let r
  try { r = tr(s, ev) } catch (e) { r = { threw: e.message } }
  ok(r.ok === false && r.state === s && typeof r.reason === 'string' && r.reason.length > 0,
    `${s} --${ev}--> refused (got ${JSON.stringify(r)})`)
  refusals++
}
ok(refusals === 21 * EXPECTED_EVENTS.length - EXPECTED_EDGES.length, `refusal grid covered (${refusals})`)
for (const [st, ev, what] of [['TITLE', 'STRAT', 'misspelt event'], ['TITEL', 'START', 'misspelt state'],
  ['TITLE', undefined, 'missing event'], ['TITLE', 'constructor', 'inherited property name as event']]) {
  let threw = false
  try { tr(st, ev) } catch { threw = true }
  ok(threw, `transition(${st}, ${ev}) throws (${what})`)
}

console.log('· happy path, replayed through transition()')
// Written out by hand from §4 / §9.2, not generated from any table.
const HAPPY = ['BOOT_COMPLETE', 'START', 'FINISHED', 'OPEN_CLONE_BOOTH', 'BASIS_DEMO_OK',
  'SUPERPOSITION_DEMO_FAILED', 'EXPLANATION_READ', 'EXIT_BOOTH', 'REACH_RELAY', 'PREPARE_BELL_PAIR',
  'ATTEMPT_NO_SIGNALLING', 'VIEW_RECEIVER_MARGINAL', 'OPEN_ROOFTOP', 'REPAIR_CLASSICAL_LINK',
  'RUN_DRY_TEST', 'CORRECT_CALIBRATION', 'COMMIT_TRANSFER', 'ANIMATION_END', 'OPEN_SCIENCE', 'OPEN_CREDITS']
let s = C.INITIAL_STATE
const trace = [s]
for (const ev of HAPPY) {
  let r
  try { r = tr(s, ev) } catch (e) { r = { threw: e.message } }
  ok(r.ok, `happy path: ${s} --${ev}--> (got ${JSON.stringify(r)})`)
  if (!r.ok) break
  s = r.state
  trace.push(s)
}
ok(s === 'CREDITS', `happy path ends at CREDITS (ended at ${s})`)
console.log(`  trace: ${trace.join(' → ')}`)
const dbl = (() => { try { return tr('TELEPORT_COMMITTED', 'COMMIT_TRANSFER') } catch { return {} } })()
ok(dbl.ok === false && dbl.state === 'TELEPORT_COMMITTED', 'no double commit (§7.4 story token consumed once)')
const skip = (() => { try { return tr('ENDING', 'OPEN_CREDITS') } catch { return {} } })()
ok(skip.state === 'CREDITS', 'ENDING can go straight to CREDITS')
// The pause-menu restart (story-ui onRestart → gameplay resetGame(), §9.5) lands where ENDING's RESTART does.
ok(C.RESET_STATE === 'TITLE', `RESET_STATE is TITLE, where RESTART lands (got ${JSON.stringify(C.RESET_STATE)})`)
const back = (() => { try { return tr('DECLASSIFIED', 'CLOSE_SCIENCE') } catch { return {} } })()
ok(back.state === 'ENDING', 'DECLASSIFIED goes back to ENDING')

console.log('· who fires each quest event (owner 2026-10-10 "13 lane design questions" #6)')
const SRC = C.EVENT_SOURCES || {}
ok(Object.isFrozen(SRC), 'EVENT_SOURCES is frozen')
for (const ev of EXPECTED_EVENTS) {
  const s = get(SRC, ev)
  ok(s && ['platform', 'gameplay', 'story-ui'].includes(s.lane) && typeof s.via === 'string' && s.via.length > 0,
    `EVENT_SOURCES.${ev} names a lane and a trigger (got ${JSON.stringify(s)})`)
}
ok(Object.keys(SRC).length === EXPECTED_EVENTS.length, `EVENT_SOURCES covers exactly the ${EXPECTED_EVENTS.length} events`)
// Ruled by the owner, typed here from owner-answers.md, not read from the module.
for (const [ev, lane, via] of [['OPEN_ROOFTOP', 'gameplay', 'world_trigger'], ['EXIT_BOOTH', 'gameplay', 'world_trigger'],
  ['EXPLANATION_READ', 'story-ui', 'terminal_acknowledgement'], ['VIEW_RECEIVER_MARGINAL', 'story-ui', 'terminal_acknowledgement']]) {
  const s = get(SRC, ev)
  ok(s?.lane === lane && s?.via === via, `owner ruling: ${ev} is fired by ${lane} (${via}) (got ${JSON.stringify(s)})`)
}
for (const [id, b] of Object.entries(C.INTERACTABLE_BINDINGS || {})) {
  const s = get(SRC, b.action)
  ok(s?.lane === 'gameplay' && s?.via === 'interactable', `${b.action} (interactable ${id}) is fired by gameplay on E (got ${JSON.stringify(s)})`)
}

console.log('· every §9.1 state reachable from BOOT through transition()')
const seen = new Set([C.INITIAL_STATE])
const queue = [C.INITIAL_STATE]
while (queue.length) {
  const cur = queue.shift()
  for (const ev of eventList) {
    let r
    try { r = tr(cur, ev) } catch { continue }
    if (r.ok && !seen.has(r.state)) { seen.add(r.state); queue.push(r.state) }
  }
}
for (const st of VISION_STATES) ok(seen.has(st), `reachable: ${st}`)

console.log('· interactables')
const V94 = [...codeBlockAfter('## 9.4 World interaction data example')
  .matchAll(/id: '([a-z_]+)'.*?requiredQuest: '([A-Z_]+)', action: '([A-Z_]+)'/g)].map(m => m.slice(1))
if (V94.length !== 3) refuse(`parsed ${V94.length} interactables from §9.4, expected 3`)
for (const [id, requiredQuest, action] of V94) {
  ok(get(C.INTERACTABLE_IDS, id) === id, `§9.4 id ${id}`)
  const b = get(C.INTERACTABLE_BINDINGS, id)
  ok(b?.requiredQuest === requiredQuest && b?.action === action, `§9.4 binding ${id}: ${requiredQuest} / ${action} (got ${JSON.stringify(b)})`)
}
for (const [id, b] of Object.entries(C.INTERACTABLE_BINDINGS || {})) {
  ok(Object.hasOwn(C.INTERACTABLE_IDS, id), `binding ${id} is a declared id`)
  let r
  try { r = tr(b.requiredQuest, b.action) } catch (e) { r = { threw: e.message } }
  ok(r.ok, `binding ${id}: ${b.action} is valid in ${b.requiredQuest}`)
}
ok(Object.keys(C.INTERACTABLE_BINDINGS || {}).length > 0 &&
  Object.keys(C.INTERACTABLE_BINDINGS).length === Object.keys(C.INTERACTABLE_IDS || {}).length,
  'every interactable id has a binding')

console.log('· world changes keyed by the §9.3 states')
const W = C.WORLD_CHANGES || {}
const V93 = ['CLONE_UNDERSTOOD', 'RELAY_BELL_CREATED', 'RELAY_UNDERSTOOD', 'LINK_REPAIRED', 'TELEPORT_COMMITTED']
ok(JSON.stringify(Object.keys(W)) === JSON.stringify(V93), 'WORLD_CHANGES keys are exactly §9.3\'s states')
for (const k of V93) ok(Array.isArray(W[k]) && W[k].length > 0 && Object.isFrozen(W[k]), `WORLD_CHANGES.${k} is a frozen non-empty list`)

console.log('· ExperimentResult validator')
const V = C.validateExperimentResult
ok(typeof V === 'function', 'validateExperimentResult is exported')
const fixtures = JSON.parse(readFileSync(resolve(HERE, 'fixtures.json'), 'utf8'))
if (fixtures.good.length < 4 || fixtures.bad.length < 10) refuse('fixture file is too small to mean anything')
const safeV = x => { try { return V(x) } catch (e) { return [`THREW: ${e.message}`] } }
for (const f of fixtures.good) {
  const errs = safeV(f.result)
  ok(Array.isArray(errs) && errs.length === 0, `good: ${f.name} (errors: ${JSON.stringify(errs)})`)
}
for (const f of fixtures.bad) {
  const errs = safeV(f.result)
  ok(Array.isArray(errs) && errs.some(e => e.includes(f.expectError) && !e.startsWith('THREW')),
    `bad: ${f.name} → an error mentioning "${f.expectError}" (got ${JSON.stringify(errs)})`)
}
// Pyodide's toJs() turns a dict into a Map unless dict_converter is passed — the one shape
// that cannot be written in JSON, so it lives here.
const asMap = new Map(Object.entries(fixtures.good[0].result))
ok(safeV(asMap).some(e => e.includes('Map')), 'a Map (toJs without dict_converter) is rejected by name')
for (const g of [null, undefined, 'x', 42, []]) {
  const errs = safeV(g)
  ok(Array.isArray(errs) && errs.length > 0 && !errs[0].startsWith('THREW'), `garbage ${JSON.stringify(g)} returns errors, never throws`)
}

console.log('· ExperimentResult.marginalProbabilities (the only sanctioned way to read one qubit out of a key)')
const M = C.marginalProbabilities
ok(typeof M === 'function', 'marginalProbabilities is exported')
// Hand-derived: keyQubits [1, 0] means the RIGHT character is q0. {"01": 0.7} is q1=0, q0=1.
const skew = { probabilities: { '01': 0.7, '10': 0.3 }, keyQubits: [1, 0] }
const mq = (r, q) => { try { return M(r, q) } catch (e) { return { threw: e.message } } }
ok(JSON.stringify(mq(skew, 0)) === JSON.stringify({ 0: 0.3, 1: 0.7 }), `marginal of q0 reads the right-hand character (got ${JSON.stringify(mq(skew, 0))})`)
ok(JSON.stringify(mq(skew, 1)) === JSON.stringify({ 0: 0.7, 1: 0.3 }), `marginal of q1 reads the left-hand character (got ${JSON.stringify(mq(skew, 1))})`)
ok(typeof M === 'function' && mq(skew, 2).threw !== undefined, 'marginal of a qubit not in keyQubits throws')

console.log('· teleport dry run, two phases (owner 2026-10-10 "red-team physics ambiguities" #2: bits first, corrections second)')
// Ground truth 1: the rule, parsed from the words of §7.1 — not from the module.
const ruleText = /X on q2 iff (m[01])=1; Z on q2 iff (m[01])=1/.exec(vision)
if (!ruleText) refuse('§7.1 correction rule sentence not found in ECHO_MASTER_VISION.md')
const RULE = (m0, m1) => ({ applyX: { m0, m1 }[ruleText[1]] === 1, applyZ: { m0, m1 }[ruleText[2]] === 1 })
// Ground truth 2: Qiskit fidelities for all 16 combinations on four generic states (teleport_oracle.py).
const T = JSON.parse(readFileSync(resolve(HERE, 'teleport-fixtures.json'), 'utf8'))
if (T.states.length < 4 || T.states.some(s => s.rows.length !== 16)) refuse('teleport-fixtures.json must hold 16 rows for each of at least 4 states')
const call = (f, ...a) => { try { return typeof f === 'function' ? f(...a) : { threw: 'not exported' } } catch (e) { return { threw: e.message } } }
const errs = v => Array.isArray(v) ? v : [`NOT A LIST: ${JSON.stringify(v)}`]
for (const [m0, m1] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
  ok(JSON.stringify(call(C.expectedCorrections, m0, m1)) === JSON.stringify(RULE(m0, m1)),
    `expectedCorrections(${m0}, ${m1}) = §7.1 ${JSON.stringify(RULE(m0, m1))} (got ${JSON.stringify(call(C.expectedCorrections, m0, m1))})`)
}
ok(typeof C.expectedCorrections === 'function' && call(C.expectedCorrections, 2, 0).threw !== undefined, 'expectedCorrections(2, 0) throws')
ok(C.TELEPORT_TEST_STATE?.theta === 1.137 && C.TELEPORT_TEST_STATE?.phi === 0.44, 'TELEPORT_TEST_STATE is ry(1.137) then rz(0.44)')

let passesSeen = 0
for (const st of T.states) {
  for (const r of st.rows) {
    const req = { theta: st.theta, phi: st.phi, m0: r.m0, m1: r.m1, applyX: r.applyX, applyZ: r.applyZ }
    const res = { experiment: 'teleportation', engine: 'exact_qiskit_local', circuitDescription: 'oracle row', qubits: 3,
      parameters: { theta: st.theta, phi: st.phi, applyX: r.applyX, applyZ: r.applyZ },
      measurementBits: { m0: r.m0, m1: r.m1 }, fidelity: r.fidelity, facts: ['oracle row'] }
    const tag = `${st.name} m0=${r.m0} m1=${r.m1} X=${r.applyX} Z=${r.applyZ} F=${r.fidelity}`
    const qiskitPass = r.fidelity >= T.pass
    passesSeen += qiskitPass
    ok(errs(call(C.validateTeleportCorrectionRequest, req)).length === 0, `phase-2 request valid: ${tag}`)
    const e = errs(call(C.validateTeleportCorrectionResult, req, res))
    ok(e.length === 0, `phase-2 Qiskit result accepted: ${tag} (errors ${JSON.stringify(e)})`)
    const v = call(C.dryRunVerdict, req, res)
    ok(v?.passed === qiskitPass, `verdict.passed === Qiskit (${qiskitPass}): ${tag} (got ${JSON.stringify(v)})`)
    ok(v?.unlocksCommit === (qiskitPass && (r.m0 === 1 || r.m1 === 1)),
      `verdict.unlocksCommit only on a correct non-00 pass (owner gameplay consult 3 #2): ${tag} (got ${JSON.stringify(v)})`)
    // A fabricated fidelity — success on a wrong choice, failure on the right one — must be refused.
    const forged = { ...res, fidelity: qiskitPass ? 0.5 : 1 }
    ok(errs(call(C.validateTeleportCorrectionResult, req, forged)).some(x => x.includes('fidelity')),
      `phase-2 forged fidelity ${forged.fidelity} refused: ${tag}`)
  }
}
ok(passesSeen === 4 * T.states.length, `exactly 4 of 16 combinations pass on every state (${passesSeen})`)

const ex = T.example
ok(errs(call(C.validateTeleportBitsRequest, ex.bitsRequest)).length === 0, `phase-1 request ${JSON.stringify(ex.bitsRequest)} valid`)
const e1 = errs(call(C.validateTeleportBitsResult, ex.bitsRequest, ex.bitsResult))
ok(e1.length === 0, `phase-1 Qiskit result accepted (errors ${JSON.stringify(e1)})`)
for (const [what, mutate, needle] of [
  ['fidelity before the player chose', r => ({ ...r, fidelity: 1 }), 'fidelity'],
  ['corrections before the bits', r => ({ ...r, parameters: { ...r.parameters, applyX: true } }), 'applyX'],
  ['no bits', r => { const { measurementBits, ...rest } = r; return rest }, 'measurementBits'],
  ['a different state than requested', r => ({ ...r, parameters: { ...r.parameters, theta: 0.5 } }), 'theta'],
  ['a documented preview', r => ({ ...r, engine: 'documented_preview' }), 'exact_qiskit_local'],
  ['an invalid ExperimentResult', r => ({ ...r, facts: [] }), 'facts'],
  ['parameters.m0/m1 contradicting measurementBits', r => ({ ...r, parameters: { ...r.parameters, m0: 1 - r.measurementBits.m0, m1: r.measurementBits.m1 } }), 'parameters.m0'],
]) {
  ok(errs(call(C.validateTeleportBitsResult, ex.bitsRequest, mutate(ex.bitsResult))).some(x => x.includes(needle)),
    `phase-1 result with ${what} refused (an error mentioning "${needle}")`)
}
for (const c of ex.corrections) {
  const built = call(C.makeCorrectionRequest, ex.bitsRequest, ex.bitsResult, { applyX: c.request.applyX, applyZ: c.request.applyZ })
  ok(JSON.stringify(built) === JSON.stringify(c.request), `makeCorrectionRequest builds phase 2 from phase 1's bits (got ${JSON.stringify(built)})`)
  ok(errs(call(C.validateTeleportCorrectionResult, c.request, c.result)).length === 0, `worked example phase 2 X=${c.request.applyX} Z=${c.request.applyZ} accepted`)
}
ok(typeof C.makeCorrectionRequest === 'function' && call(C.makeCorrectionRequest, ex.bitsRequest, { ...ex.bitsResult, measurementBits: undefined }, { applyX: true, applyZ: false }).threw !== undefined,
  'makeCorrectionRequest throws without phase-1 bits (no corrections before bits)')
const c0 = ex.corrections[0]
for (const [what, req, res, needle] of [
  ['bits that differ from the request', c0.request, { ...c0.result, measurementBits: { m0: 1 - c0.request.m0, m1: c0.request.m1 } }, 'measurementBits'],
  ['a correction that differs from the request', c0.request, { ...c0.result, parameters: { ...c0.result.parameters, applyX: !c0.request.applyX } }, 'applyX'],
  ['no fidelity', c0.request, (({ fidelity, ...r }) => r)(c0.result), 'fidelity'],
  ['parameters.m1 contradicting measurementBits', c0.request, { ...c0.result, parameters: { ...c0.result.parameters, m0: c0.request.m0, m1: 1 - c0.request.m1 } }, 'parameters.m1'],
]) ok(errs(call(C.validateTeleportCorrectionResult, req, res)).some(x => x.includes(needle)), `phase-2 result with ${what} refused`)
for (const [what, req, needle] of [
  ['applyX as a string', { ...c0.request, applyX: 'yes' }, 'applyX'],
  ['m0 = 2', { ...c0.request, m0: 2 }, 'm0'],
  ['no phi', (({ phi, ...r }) => r)(c0.request), 'phi'],
  ['an extra field', { ...c0.request, stateId: 'story_token' }, 'stateId'],
]) ok(errs(call(C.validateTeleportCorrectionRequest, req)).some(x => x.includes(needle)), `phase-2 request with ${what} refused`)
// A non-generic state lets a wrong choice score 1 (on |0> a spurious Z is a global phase), so the lesson would be fake.
for (const [what, req] of [['|0>', { theta: 0, phi: 0 }], ['|+>', { theta: Math.PI / 2, phi: 0 }], ['|+i>', { theta: Math.PI / 2, phi: Math.PI / 2 }],
  ['NaN', { theta: NaN, phi: 0 }], ['an extra field', { theta: 1.137, phi: 0.44, stateId: 'plus' }]]) {
  ok(typeof C.validateTeleportBitsRequest === 'function' && errs(call(C.validateTeleportBitsRequest, req)).length > 0, `phase-1 request on ${what} refused`)
}
// Fresh random generic states: every draw valid, and draws differ.
let seed = 12345
const lcg = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
const draws = Array.from({ length: 200 }, () => call(C.randomGenericState, lcg))
ok(draws.every(d => errs(call(C.validateTeleportBitsRequest, d)).length === 0), 'randomGenericState: 200 draws, all valid generic phase-1 requests')
ok(new Set(draws.map(d => JSON.stringify(d))).size > 150, 'randomGenericState: draws are fresh, not one fixed state')

console.log('· UI root and settings (overseer relay from story-ui, 2026-10-10)')
ok(C.UI_ROOT_ID === 'echo-ui', `UI_ROOT_ID is "echo-ui" (got ${JSON.stringify(C.UI_ROOT_ID)})`)
for (const hook of ['setPauseAllowed', 'onRestart']) ok(get(C.UI_HOOKS, hook) === hook, `UI_HOOKS.${hook}`)
const VS = C.validateSettings
ok(errs(call(VS, C.DEFAULT_SETTINGS)).length === 0, `DEFAULT_SETTINGS is valid (got ${JSON.stringify(call(VS, C.DEFAULT_SETTINGS))})`)
ok(Object.isFrozen(C.DEFAULT_SETTINGS), 'DEFAULT_SETTINGS is frozen')
const base = { captionStyle: 'standard', reducedMotion: false, textScale: 100, quality: 'med', volume: 80 }
for (const s of [base, { ...base, captionStyle: 'high-contrast', reducedMotion: true, textScale: 200, quality: 'low', volume: 0 },
  { ...base, textScale: 125, quality: 'high', volume: 100 }]) ok(errs(call(VS, s)).length === 0, `settings ${JSON.stringify(s)} valid`)
for (const [what, s, needle] of [
  ['captionStyle "large"', { ...base, captionStyle: 'large' }, 'captionStyle'],
  ['a captions on/off field (captions are always on)', { ...base, subtitles: false }, 'subtitles'],
  ['textScale 99', { ...base, textScale: 99 }, 'textScale'], ['textScale 201', { ...base, textScale: 201 }, 'textScale'],
  ['textScale 150.5', { ...base, textScale: 150.5 }, 'textScale'],
  ['quality "ultra"', { ...base, quality: 'ultra' }, 'quality'],
  ['volume -1', { ...base, volume: -1 }, 'volume'], ['volume 101', { ...base, volume: 101 }, 'volume'],
  ['reducedMotion "yes"', { ...base, reducedMotion: 'yes' }, 'reducedMotion'],
  ['no volume', (({ volume, ...r }) => r)(base), 'volume'],
]) ok(errs(call(VS, s)).some(x => x.includes(needle)), `settings with ${what} refused`)
for (const g of [null, 'x', new Map(Object.entries(base))]) {
  const e = errs(call(VS, g))
  ok(e.length > 0 && !String(e[0]).startsWith('NOT A LIST'), `settings garbage ${g instanceof Map ? 'Map' : JSON.stringify(g)} returns errors, never throws`)
}

const verdict = failures === 0 && checks > 0 ? 'GREEN' : 'RED'
console.log(`contract-check: ${verdict} — ${checks - failures}/${checks} checks passed (contracts: ${CONTRACTS})`)
process.exit(verdict === 'GREEN' ? 0 : 1)
