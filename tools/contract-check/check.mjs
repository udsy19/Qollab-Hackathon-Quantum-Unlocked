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
  ['EXPERIMENTS', C.EXPERIMENTS]]) {
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
  ['TITLE', undefined, 'missing event']]) {
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

const verdict = failures === 0 && checks > 0 ? 'GREEN' : 'RED'
console.log(`contract-check: ${verdict} — ${checks - failures}/${checks} checks passed (contracts: ${CONTRACTS})`)
process.exit(verdict === 'GREEN' ? 0 : 1)
