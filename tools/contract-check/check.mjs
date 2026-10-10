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
const call = (f, ...a) => { try { return typeof f === 'function' ? f(...a) : { threw: 'not exported' } } catch (e) { return { threw: e.message } } }
const show = v => (typeof v === 'number' ? String(v) : JSON.stringify(v))
function pin(name, got, want, ruling) {
  ok(JSON.stringify(got) === JSON.stringify(want), `PIN ${name} must be ${show(want)} (${ruling}); got ${show(got)}`)
}

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

// MOMENT events: reactions that are not state changes, fired by gameplay and consumed by story-ui.
// Typed from their sources, never read from the module: the first four are the overseer relay
// (owner-answers.md 2026-10-10 "new contract names"); the last two are the keys story-ui's
// echo/data/story.js MOMENTS already consumes (lane/story-ui/integration), so gameplay fires the
// names story-ui listens for. Each: [id, lane, via, consumer].
const EXPECTED_MOMENTS = [
  ['clone_increase_voltage', 'gameplay', 'moment', 'story-ui', 'overseer relay 2026-10-10'],
  ['relay_bay_cable', 'gameplay', 'moment', 'story-ui', 'overseer relay 2026-10-10'],
  ['teleport_commit_locked', 'gameplay', 'moment', 'story-ui', 'overseer relay 2026-10-10'],
  ['teleport_dry_run_failed', 'gameplay', 'moment', 'story-ui', 'overseer relay 2026-10-10'],
  ['teleport_dry_run_00', 'gameplay', 'moment', 'story-ui', 'story-ui data/story.js MOMENTS (owner ruling: 00 does not unlock COMMIT)'],
  ['countdown_zero', 'gameplay', 'countdown', 'story-ui', 'story-ui data/story.js MOMENTS; overseer relay: the countdown holds at 00:00'],
]

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
ok(Object.keys(SRC).length === EXPECTED_EVENTS.length + EXPECTED_MOMENTS.length,
  `EVENT_SOURCES covers exactly the ${EXPECTED_EVENTS.length} quest events and the ${EXPECTED_MOMENTS.length} moments (got ${Object.keys(SRC).length})`)
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

console.log('· MOMENT events (overseer relay 2026-10-10): fired by gameplay, consumed by story-ui, never a state change')
ok(C.MOMENT_EVENTS && Object.isFrozen(C.MOMENT_EVENTS), 'MOMENT_EVENTS is exported and frozen')
{
  let threw = false
  try { void C.MOMENT_EVENTS.teleport_dry_run_fail } catch { threw = true }
  ok(Boolean(C.MOMENT_EVENTS) && threw, 'MOMENT_EVENTS.<misspelt> throws instead of returning undefined')
}
const momentList = Object.keys(C.MOMENT_EVENTS || {})
ok(JSON.stringify([...momentList].sort()) === JSON.stringify(EXPECTED_MOMENTS.map(m => m[0]).sort()),
  `MOMENT_EVENTS is exactly ${JSON.stringify(EXPECTED_MOMENTS.map(m => m[0]))} (got ${JSON.stringify(momentList)})`)
for (const [id, lane, via, consumer, why] of EXPECTED_MOMENTS) {
  ok(get(C.MOMENT_EVENTS, id) === id, `MOMENT_EVENTS.${id} === '${id}' (${why})`)
  const s = get(SRC, id)
  ok(s?.lane === lane && s?.via === via && s?.consumer === consumer,
    `EVENT_SOURCES.${id} is fired by ${lane} (${via}) and consumed by ${consumer} (got ${JSON.stringify(s)})`)
  ok(!Object.hasOwn(C.QUEST_EVENTS || {}, id), `${id} is not a quest event`)
  // A moment never moves the quest: transition() must reject it as an unknown event in every state.
  let accepted = 0
  for (const st of VISION_STATES) { try { tr(st, id); accepted++ } catch { /* refused: correct */ } }
  ok(accepted === 0, `transition(<any §9.1 state>, '${id}') throws: a moment is not a state change (accepted in ${accepted} states)`)
}
// Quest events carry no consumer: only moments are routed to a consumer lane.
for (const ev of EXPECTED_EVENTS) ok(get(SRC, ev)?.consumer === undefined, `EVENT_SOURCES.${ev} (quest event) has no consumer field`)

console.log('· countdown: holds at 00:00, never negative, never a game-over (overseer relay 2026-10-10; vision §1 anti-goals, §9.3)')
const CD = C.countdownRemaining
ok(typeof CD === 'function', 'countdownRemaining is exported')
// Not owner-ruled: a platform design value. Vision §6.3 shows GRID SHUTDOWN 08:42 at the relay (mission 2),
// so the start must exceed 522 s; 12:00 leaves room for the opening and mission 1 before it.
pin('COUNTDOWN_START_SECONDS', C.COUNTDOWN_START_SECONDS, 720,
  'platform design value (not owner-ruled): 12:00, above §6.3\'s 08:42 shown at the relay')
ok(C.COUNTDOWN_START_SECONDS > 8 * 60 + 42, `COUNTDOWN_START_SECONDS exceeds §6.3's relay reading 08:42 = 522 s (got ${C.COUNTDOWN_START_SECONDS})`)
const START = 720  // typed, not read back
const cd = (...a) => call(CD, ...a)
ok(cd(START, 0) === START, `countdownRemaining(${START}, 0) = ${START} (got ${JSON.stringify(cd(START, 0))})`)
ok(cd(START, -5) === START, `negative elapsed clamps to the start, never above it (got ${JSON.stringify(cd(START, -5))})`)
ok(cd(START, 100.7) === 620, `fractional elapsed rounds the display up to whole seconds remaining: 720 - 100.7 = 619.3 → 620 (got ${JSON.stringify(cd(START, 100.7))})`)
let prev = Infinity, monotone = true, negative = [], nonInt = []
for (const e of [0, 0.5, 1, 59.9, 360, 719, 719.999, 720, 720.001, 721, 1440, 1e6, 1e12, Infinity]) {
  const r = cd(START, e)
  if (!(typeof r === 'number' && r >= 0) || Object.is(r, -0)) negative.push([e, r])
  if (!Number.isInteger(r)) nonInt.push([e, r])
  if (r > prev) monotone = false
  prev = r
}
ok(negative.length === 0, `never negative (nor -0) for any elapsed time (bad: ${JSON.stringify(negative)})`)
ok(nonInt.length === 0, `always whole seconds (bad: ${JSON.stringify(nonInt)})`)
ok(monotone, 'never counts back up as elapsed time grows')
for (const e of [720, 721, 1e6, Infinity]) ok(cd(START, e) === 0, `holds at 00:00 at elapsed ${e} (got ${JSON.stringify(cd(START, e))})`)
ok(cd(START, 719.5) === 1, `shows 00:01, not 00:00, until the start has fully elapsed (got ${JSON.stringify(cd(START, 719.5))})`)
for (const bad of [[START, NaN], [START, '10'], [START, undefined], [NaN, 0], [-1, 0], [Infinity, 0]]) {
  const r = cd(...bad)
  ok(typeof CD === 'function' && r && typeof r.threw === 'string', `countdownRemaining(${bad.map(String).join(', ')}) throws (a bug at the call site, not a silent 0) (got ${JSON.stringify(r)})`)
}
// Never a game-over: §9.1 (pinned verbatim above) has no failure state, and no quest event is a timer.
ok(!VISION_STATES.some(st => /GAME_OVER|FAIL_END|TIME_UP|TIMEOUT/.test(st)), '§9.1 has no game-over state')
ok(!eventList.some(ev => /COUNTDOWN|TIMER|TIMEOUT|TIME_UP|GAME_OVER|EXPIRE/.test(ev)),
  `no quest event is driven by the countdown (got ${JSON.stringify(eventList.filter(ev => /COUNTDOWN|TIMER|TIMEOUT|TIME_UP|GAME_OVER|EXPIRE/.test(ev)))})`)
ok(Object.values(C.EVENT_SOURCES || {}).filter(s => s?.via === 'countdown').length === 1 && get(SRC, 'countdown_zero')?.via === 'countdown',
  'the countdown fires exactly one event, and it is the moment countdown_zero (a caption, not a transition)')

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

console.log('· owner-ruled values, pinned from the ruling text (never read back from the module)')
// Every expected value below is typed from lanes/platform/owner-answers.md or the vision, with its
// source. The behavioural checks above cannot see these drift: on generic states the rule and the
// fidelity floor each imply the other, so FIDELITY_PASS 0.999999 → 0.9 changed no verdict (consult 5).
pin('FIDELITY_PASS', C.FIDELITY_PASS, 0.999999,
  'vision §7.4 "receiver reduced-state fidelity ≥0.999999"; owner-answers § overseer relay: "fidelity threshold is ≥0.999999"')
pin('BACKEND_SHOTS', C.BACKEND_SHOTS, 256, 'owner-answers § 13 lane design questions #9: "the one backend job uses 256 shots"')
pin('TELEPORT_TEST_STATE', C.TELEPORT_TEST_STATE, { theta: 1.137, phi: 0.44 },
  'owner-answers § red-team physics ambiguities (3): "ry(1.137) then rz(0.44) in circuit order (§10.5)"')
pin('BIT_LABELS.m1', get(C.BIT_LABELS, 'm1'), 'LOCAL BELL-HALF READOUT m1',
  'owner-answers § red-team physics ambiguities (1): m1 is labelled "LOCAL BELL-HALF READOUT m1" everywhere')
// m0 has no owner ruling of its own: ruling (1) renamed only m1. Its label is the vision's text, checked present.
if (!vision.includes('labeled `SOURCE READOUT m0` and')) refuse('vision §7.4 Beat 2 no longer labels m0 "SOURCE READOUT m0"')
pin('BIT_LABELS.m0', get(C.BIT_LABELS, 'm0'), 'SOURCE READOUT m0',
  'vision §7.4 Beat 2 "labeled `SOURCE READOUT m0`" (no owner ruling renames m0)')
pin('BIT_LABELS keys', Object.keys(C.BIT_LABELS || {}).sort(), ['m0', 'm1'], 'exactly the two classical bits of §7.1')
const RULED_RULE = (m0, m1) => ({ applyX: m1 === 1, applyZ: m0 === 1 })  // CLAUDE.md, §7.1, context.md: X iff m1=1, Z iff m0=1
for (const [m0, m1] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
  if (JSON.stringify(RULE(m0, m1)) !== JSON.stringify(RULED_RULE(m0, m1))) refuse('vision §7.1 rule sentence disagrees with the ruled rule X iff m1=1, Z iff m0=1')
  pin(`correction rule expectedCorrections(${m0}, ${m1})`, call(C.expectedCorrections, m0, m1), RULED_RULE(m0, m1),
    'CLAUDE.md + vision §7.1: receiver X iff m1=1, Z iff m0=1')
}
pin('EXPERIMENTS.backend_verification', get(C.EXPERIMENTS, 'backend_verification'), 'backend_verification',
  'owner-answers § 13 lane design questions #4: the selected-backend job is experiment "backend_verification"')
// Not an owner ruling: a contracts-v2 design value (reports/0003-contracts-v2.md) so that every wrong
// X/Z choice visibly fails. Its meaning is checked against the Qiskit oracle, not the module.
pin('GENERIC_MAX_WRONG_FIDELITY', C.GENERIC_MAX_WRONG_FIDELITY, 0.9,
  'contracts-v2 design value (not owner-ruled): a wrong correction must score ≤ 0.9 on a dry-run state')
const oracleWorstWrong = Math.max(...T.states.flatMap(st => st.rows.filter(r => r.fidelity < T.pass).map(r => r.fidelity)))
ok(oracleWorstWrong <= 0.9 && T.pass === 0.999999,
  `Qiskit oracle: worst wrong choice on the fixture states is ${oracleWorstWrong.toFixed(6)} ≤ 0.9, and its pass is 0.999999 (got pass ${T.pass})`)

// Circuit ORDER of the test state: ry then rz. rz-then-ry would leave |0> rotated only by ry, Bloch
// (sin θ, 0, cos θ). Hand-derived here; the module's cross-check must accept the ry→rz number from
// Qiskit and refuse the rz→ry one on the X-error branch (F = x²).
const ts = T.states.find(st => st.theta === 1.137 && st.phi === 0.44)
if (!ts) refuse('teleport-fixtures.json has no ry(1.137) rz(0.44) state')
const dryRes = (bits, choice, f, what) => ({ experiment: 'teleportation', engine: 'exact_qiskit_local', circuitDescription: what, qubits: 3,
  parameters: { theta: 1.137, phi: 0.44, ...choice }, measurementBits: bits, fidelity: f, facts: [what] })
const xRow = ts.rows.find(r => r.m0 === 0 && r.m1 === 1 && !r.applyX && !r.applyZ)
const wrongOrderF = Math.sin(1.137) ** 2
const orderReq = { theta: 1.137, phi: 0.44, m0: 0, m1: 1, applyX: false, applyZ: false }
const orderRes = f => dryRes({ m0: 0, m1: 1 }, { applyX: false, applyZ: false }, f, 'order probe')
ok(Math.abs(xRow.fidelity - wrongOrderF) > 0.1 &&
  errs(call(C.validateTeleportCorrectionResult, orderReq, orderRes(xRow.fidelity))).length === 0 &&
  errs(call(C.validateTeleportCorrectionResult, orderReq, orderRes(wrongOrderF))).some(x => x.includes('fidelity')),
  `PIN TELEPORT_TEST_STATE circuit order is ry then rz (owner-answers § red-team physics ambiguities (3)): Qiskit F=${xRow.fidelity} accepted, rz-then-ry F=${wrongOrderF.toFixed(6)} refused`)

// The cross-check tolerance and the rounding epsilon (contracts-fidelity-band). Neither is owner-ruled;
// both are DERIVED here from the ruled band, never read back from the module. The cross-check must
// accept every correct result the §7.4 band accepts, so its tolerance is the band width 1 - 0.999999
// (law 12: a guard the same size as its band, compared without slack, refused F = 0.999999 itself,
// because 1 - 0.999999 = 1e-6 + 2.9e-17 in doubles). The epsilon absorbs that rounding: it must
// exceed the measured analytic/Qiskit disagreement on the oracle fixtures and sit far below the band.
const BAND = 1e-6  // 1 - 0.999999, vision §7.4
pin('FIDELITY_CROSSCHECK_TOLERANCE', C.FIDELITY_CROSSCHECK_TOLERANCE, BAND,
  'derived: the §7.4 pass band width 1 - 0.999999 (a wider cross-check accepts forged fidelities; a narrower one refuses correct ones)')
pin('FIDELITY_EPSILON', C.FIDELITY_EPSILON, 1e-12,
  'derived: float rounding allowance, above the oracle/analytic disagreement and 1e6 below the band')
const handBloch = (th, ph) => ({ x: Math.sin(th) * Math.cos(ph), y: Math.sin(th) * Math.sin(ph), z: Math.cos(th) })
const handF = (st, r) => {
  const b = handBloch(st.theta, st.phi), ex = (r.m1 === 1) !== r.applyX, ez = (r.m0 === 1) !== r.applyZ
  return ex && ez ? b.y ** 2 : ex ? b.x ** 2 : ez ? b.z ** 2 : 1
}
const oracleGap = Math.max(...T.states.flatMap(st => st.rows.map(r => Math.abs(handF(st, r) - r.fidelity))))
ok(oracleGap < 1e-12 && 1e-12 * 1e6 <= BAND,
  `FIDELITY_EPSILON 1e-12 exceeds the measured hand-analytic/Qiskit disagreement ${oracleGap.toExponential(2)} over ${T.states.length} oracle states, and is ≤ band/1e6`)

// Forged fidelities: a number that lies about the physics by more than the band is refused by the
// CROSS-CHECK itself (the error names it), on a wrong choice (where the verdict cannot help) and on
// the right one. Gaps 1e-5 … 0.05 sit inside a tolerance loosened to 1e-2 or 1e-1, outside the real one.
for (const gap of [1e-5, 1e-3, 0.05]) {
  for (const [sign, what] of [[1, 'above'], [-1, 'below']]) {
    const f = xRow.fidelity + sign * gap
    const e = errs(call(C.validateTeleportCorrectionResult, orderReq, orderRes(f)))
    ok(e.some(x => x.includes('disagrees with the physics')),
      `cross-check refuses a forged wrong-choice fidelity ${gap} ${what} Qiskit's ${xRow.fidelity} (got ${JSON.stringify(e)})`)
  }
}
const okRow = ts.rows.find(r => r.m0 === 1 && r.m1 === 1 && r.applyX && r.applyZ)
const vReq = { theta: 1.137, phi: 0.44, m0: 1, m1: 1, applyX: true, applyZ: true }
const vRes = f => dryRes({ m0: 1, m1: 1 }, { applyX: true, applyZ: true }, f, 'floor probe')
for (const gap of [1e-5, 1e-3, 0.05]) {
  const e = errs(call(C.validateTeleportCorrectionResult, vReq, vRes(okRow.fidelity - gap)))
  ok(e.some(x => x.includes('disagrees with the physics')),
    `cross-check refuses a forged right-choice fidelity ${gap} below Qiskit's ${okRow.fidelity} (got ${JSON.stringify(e)})`)
}

// The verdict's effective floor, probed on a correct, non-00 choice with only the fidelity varied.
// Exactly 0.999999, and 0.999999 less 1e-15 of rounding noise, PASS ("≥0.999999", vision §7.4);
// 0.999999 less 1e-9 (a thousand epsilons), 0.99999 and 0.9 do not.
for (const [f, want] of [[okRow.fidelity, true], [0.9999995, true], [0.999999, true], [0.999999 - 1e-15, true],
  [0.999999 - 1e-9, false], [0.99999, false], [0.9, false]]) {
  const got = call(C.dryRunVerdict, vReq, vRes(f))?.passed
  ok(got === want, `PIN verdict floor FIDELITY_PASS 0.999999 (vision §7.4): correct choice at F=${f} ${want ? 'passes' : 'does not pass'} (got ${JSON.stringify(got)})`)
}
// The rule half: the right fidelity on the WRONG choice never passes (all 12 wrong choices).
for (const r of ts.rows.filter(r => JSON.stringify({ applyX: r.applyX, applyZ: r.applyZ }) !== JSON.stringify(RULED_RULE(r.m0, r.m1)))) {
  const req = { theta: 1.137, phi: 0.44, m0: r.m0, m1: r.m1, applyX: r.applyX, applyZ: r.applyZ }
  const got = call(C.dryRunVerdict, req, dryRes({ m0: r.m0, m1: r.m1 }, { applyX: r.applyX, applyZ: r.applyZ }, 1, 'rule probe'))?.passed
  ok(got === false, `PIN verdict requires the ruled correction (X iff m1=1, Z iff m0=1): wrong choice m0=${r.m0} m1=${r.m1} X=${r.applyX} Z=${r.applyZ} at F=1 does not pass (got ${JSON.stringify(got)})`)
}

console.log('· the one story commit (vision §7.4; owner, gameplay consult 3: one atomic local exact call)')
// Ground truth: Qiskit's fidelity on every rule-following branch of the oracle states (teleport_oracle.py),
// the ruled rule RULED_RULE, and the marker typed here. The token's state is hidden, so a commit carries no
// angles: what it can be graded on is the bits, the corrections applied to THOSE bits, and the fidelity.
// The commit is the game's last step, so nothing behind it catches a wrong verdict: each guard below is the
// only one for its defect (red-team 0005 §5: fidelity 0.9 and swapped m0/m1 were "valid").
const MARKER = 'story_token'  // red-team 0005 §5 / gameplay missionRules.js STORY_TOKEN_ID; supervisor brief consult 11: ONE name, parameters.stateId
pin('STORY_TOKEN_ID', C.STORY_TOKEN_ID, MARKER, 'supervisor brief consult 11: the commit names its state parameters.stateId === "story_token"')
const VC = r => errs(call(C.validateCommitResult, r))
const commitRes = (bits, f, choice = RULED_RULE(bits.m0, bits.m1), extra = {}) => ({
  experiment: 'teleportation', engine: 'exact_qiskit_local', circuitDescription: 'commit probe', qubits: 3,
  parameters: { stateId: MARKER, ...choice, ...extra }, probabilities: { '00': 0.25, '01': 0.25, '10': 0.25, '11': 0.25 },
  keyQubits: [1, 0], measurementBits: bits, fidelity: f, facts: ['commit probe'] })
let commitsSeen = 0
for (const st of T.states) {
  for (const r of st.rows.filter(r => JSON.stringify({ applyX: r.applyX, applyZ: r.applyZ }) === JSON.stringify(RULED_RULE(r.m0, r.m1)))) {
    commitsSeen++
    const e = VC(commitRes({ m0: r.m0, m1: r.m1 }, r.fidelity))
    ok(e.length === 0, `commit with Qiskit's rule-following branch accepted: ${st.name} m0=${r.m0} m1=${r.m1} F=${r.fidelity} (errors ${JSON.stringify(e)})`)
  }
}
ok(commitsSeen === 4 * T.states.length, `every oracle state contributes its 4 rule-following commits (${commitsSeen})`)
// Every wrong correction, at a perfect fidelity: the rule is the only guard that can see it.
for (const [m0, m1] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
  for (const applyX of [false, true]) for (const applyZ of [false, true]) {
    if (JSON.stringify({ applyX, applyZ }) === JSON.stringify(RULED_RULE(m0, m1))) continue
    ok(VC(commitRes({ m0, m1 }, 1, { applyX, applyZ })).some(x => x.includes('rule')),
      `commit with corrections X=${applyX} Z=${applyZ} on m0=${m0} m1=${m1} (not the rule) refused at F=1`)
  }
}
const one = { m0: 1, m1: 0 }
for (const [what, res, needle] of [
  ['fidelity 0.9 (red-team row fidelity_0_9_commit)', commitRes(one, 0.9), 'fidelity'],
  ['m0/m1 swapped: bits 1,0 with the corrections of 0,1 (red-team row m0m1_swapped_commit)', commitRes(one, 1, RULED_RULE(0, 1)), 'rule'],
  ['no story-token marker', (r => { delete r.parameters.stateId; return r })(commitRes(one, 1)), 'stateId'],
  ['the engine\'s pre-contract marker parameters.state "token"', (r => { delete r.parameters.stateId; r.parameters.state = 'token'; return r })(commitRes(one, 1)), 'stateId'],
  ['a calibration marker', commitRes(one, 1, undefined, { stateId: 'calibration' }), 'stateId'],
  ['counts on an exact result', { ...commitRes(one, 1), counts: { '00': 64, '01': 64, '10': 64, '11': 64 } }, 'counts'],
  ['a documented preview', { ...commitRes(one, 1), engine: 'documented_preview' }, 'exact_qiskit_local'],
  ['experiment cloning', { ...commitRes(one, 1), experiment: 'cloning', measurementBits: undefined }, 'teleportation'],
  ['no fidelity', (({ fidelity, ...r }) => r)(commitRes(one, 1)), 'fidelity'],
  ['no measurementBits', (({ measurementBits, ...r }) => r)(commitRes(one, 1)), 'measurementBits'],
  ['no applied corrections in parameters', (r => { delete r.parameters.applyX; delete r.parameters.applyZ; return r })(commitRes(one, 1)), 'applyX'],
  ['applyZ as the number 1', commitRes(one, 1, { applyX: false, applyZ: 1 }), 'applyZ'],
  ['the token\'s angles (the token is never shown)', commitRes(one, 1, undefined, { theta: 2.03, phi: -2.61 }), 'theta'],
  ['parameters.m0 contradicting measurementBits', commitRes(one, 1, undefined, { m0: 0 }), 'parameters.m0'],
  ['an invalid ExperimentResult (empty facts)', { ...commitRes(one, 1), facts: [] }, 'facts'],
]) {
  const e = VC(res)
  ok(e.some(x => x.includes(needle)), `commit with ${what} refused (an error mentioning "${needle}"; got ${JSON.stringify(e)})`)
}
for (const junk of [null, undefined, 'commit', [], new Map()]) {
  const e = VC(junk)
  ok(e.length > 0 && !e[0].startsWith('NOT A LIST'), `validateCommitResult(${describeJunk(junk)}) returns errors, never throws (got ${JSON.stringify(e)})`)
}
function describeJunk(v) { return v instanceof Map ? 'a Map' : JSON.stringify(v) ?? 'undefined' }
// The floor is the §7.4 band on the commit too: the same probes as the dry-run verdict.
for (const [f, want] of [[1, true], [0.999999, true], [0.999999 - 1e-15, true], [0.999999 - 1e-9, false], [0.99999, false], [0.9, false]]) {
  const got = VC(commitRes({ m0: 1, m1: 1 }, f)).length === 0
  ok(got === want, `PIN commit floor FIDELITY_PASS 0.999999 (vision §7.4): rule-following commit at F=${f} ${want ? 'accepted' : 'refused'} (got ${got ? 'accepted' : 'refused'})`)
}
// The token never enters a dry run (§7.4): a dry-run result carrying the marker is refused in both phases.
ok(errs(call(C.validateTeleportBitsResult, ex.bitsRequest, { ...ex.bitsResult, parameters: { ...ex.bitsResult.parameters, stateId: MARKER } })).some(x => x.includes('stateId')),
  'phase-1 result carrying the story-token marker refused')
ok(errs(call(C.validateTeleportCorrectionResult, c0.request, { ...c0.result, parameters: { ...c0.result.parameters, stateId: MARKER } })).some(x => x.includes('stateId')),
  'phase-2 result carrying the story-token marker refused')

console.log('· the export surface is exactly the documented contract')
// Typed here, not read from the module: a new export is a contract change (CONTRACTS.md migration row
// + this list). Without it an undeclared name such as COUNTDOWN_GAME_OVER passed green (consult 9 null).
const EXPECTED_EXPORTS = ['BACKEND_SHOTS', 'BELL_RECEIVER_QUBIT', 'BIT_LABELS', 'BUS_EVENTS', 'CAPTION_STYLES',
  'COUNTDOWN_START_SECONDS', 'DEFAULT_SETTINGS', 'ENGINE_KINDS', 'EVENT_SOURCES', 'EXPERIMENTS',
  'FIDELITY_CROSSCHECK_TOLERANCE', 'FIDELITY_EPSILON', 'FIDELITY_PASS', 'GENERIC_MAX_WRONG_FIDELITY', 'INITIAL_STATE',
  'INTERACTABLE_BINDINGS', 'INTERACTABLE_IDS', 'MOMENT_EVENTS', 'PROBABILITY_TOLERANCE', 'QUALITY_LEVELS',
  'QUEST_EVENTS', 'QUEST_STATES', 'QUEST_STATE_LIST', 'RESET_STATE', 'STORY_TOKEN_ID', 'TELEPORT_TEST_STATE', 'TRANSITIONS',
  'UI_HOOKS', 'UI_ROOT_ID', 'WORLD_CHANGES', 'countdownRemaining', 'dryRunVerdict', 'expectedCorrections',
  'makeCorrectionRequest', 'marginalProbabilities', 'randomGenericState', 'transition', 'validateCommitResult', 'validateExperimentResult',
  'validateSettings', 'validateTeleportBitsRequest', 'validateTeleportBitsResult',
  'validateTeleportCorrectionRequest', 'validateTeleportCorrectionResult']
const gotExports = Object.keys(C)
const extra = gotExports.filter(k => !EXPECTED_EXPORTS.includes(k))
const missing = EXPECTED_EXPORTS.filter(k => !gotExports.includes(k))
ok(extra.length === 0 && missing.length === 0, `exports match the contract (extra ${JSON.stringify(extra)}, missing ${JSON.stringify(missing)})`)

const verdict = failures === 0 && checks > 0 ? 'GREEN' : 'RED'
console.log(`contract-check: ${verdict} — ${checks - failures}/${checks} checks passed (contracts: ${CONTRACTS})`)
process.exit(verdict === 'GREEN' ? 0 : 1)
