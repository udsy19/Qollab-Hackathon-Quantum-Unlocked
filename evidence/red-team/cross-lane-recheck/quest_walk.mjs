// Walk gameplay's REAL quest machine (echo/game/state.js) from BOOT to CREDITS, feeding every
// experiment state a result and every other state the event its owning lane would fire
// (contracts EVENT_SOURCES). Reports every state that cannot advance, and why.
//
//   node quest_walk.mjs <echo-root> real <results.json> [fakeQuantum.js]
//       REAL engine output (dump_results.py). With a fake given, a stalled step is recorded and
//       then bridged with the control's result so the walk can show EVERY stall in machine order.
//   node quest_walk.mjs <echo-root> fake <fakeQuantum.js>
//       positive control: gameplay's own fake (UNPATCHED=1 runs it exactly as gameplay ships it)
//
// The fake run is the control that proves this walker CAN reach CREDITS (law 3): if it stalls,
// the walker is broken, not the product. Exit 0 = reached CREDITS with no real stall ·
// 1 = a stall · 2 = could not run.
import { pathToFileURL } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const [root, mode, input, bridgeFake] = process.argv.slice(2)
if (!root || !['real', 'fake'].includes(mode) || !input || !existsSync(input) || (bridgeFake && !existsSync(bridgeFake))) {
  console.error('usage: node quest_walk.mjs <echo-root> real|fake <results.json|fakeQuantum.js> [fakeQuantum.js]'); process.exit(2)
}
const imp = p => import(pathToFileURL(join(root, p)).href)
const C = await imp('contracts.js')
const { createQuestMachine, COMMIT_STATUS } = await imp('game/state.js')
const { createEventBus } = await imp('game/eventBus.js')

let faulted = 0
async function fakeSource(path) {
  const { createFakeQuantum } = await import(pathToFileURL(path).href)
  const q = createFakeQuantum({ delayMs: 0, random: () => 0.6 })  // 0.6 → bits m0=0, m1=1 (needs X)
  const bits = q.sampleBellBits()
  const want = C.expectedCorrections(bits.m0, bits.m1)
  // Control-only relabel: v2 requires bell_signalling under exact_qiskit_local and the fake labels
  // itself documented_preview (out/quest_walk_fake_unpatched.txt). Nothing else is touched.
  const exact = r => (process.env.UNPATCHED ? r : { ...r, engine: 'exact_qiskit_local' })
  return {
    experiment: s => ({
      CLONE_INTRO: () => q.cloneTest('zero'), CLONE_BASIS_PASSED: () => q.cloneTest('plus'),
      RELAY_INTRO: () => q.bellSignalling('I').then(exact), RELAY_BELL_CREATED: () => q.bellSignalling('X').then(exact),
      TELEPORT_DRY_RUN: () => q.teleportDryRun(want.applyX, want.applyZ, bits),
    })[s]?.(),
    // FAULT_FIRST_COMMIT=1: the fake's own dev fault (wrong X inside the commit) → MEASURED_REFUSED path
    commit: () => { if (process.env.FAULT_FIRST_COMMIT && !faulted++) q.faultNextCommit(); return q.commitStoryToken() },
  }
}
let source
if (mode === 'real') {
  const r = JSON.parse(readFileSync(input, 'utf8'))
  source = { experiment: s => r[s], commit: () => r.TELEPORT_DRY_RUN_PASSED }
} else {
  source = await fakeSource(input)
}
const bridge = mode === 'real' && bridgeFake ? await fakeSource(bridgeFake) : null

const bus = createEventBus({ onError: e => { throw e } })
const m = createQuestMachine(bus)
const log = []
bus.on(C.BUS_EVENTS.QUEST_STATE_CHANGED, p => log.push(`${p.from} -${p.event}-> ${p.to}`))

// The non-experiment event each state's owner fires (EVENT_SOURCES), in §9.2 order.
const NEXT = {
  BOOT: 'BOOT_COMPLETE', TITLE: 'START', OPENING: 'FINISHED', FREE_ROAM_ALLEY: 'OPEN_CLONE_BOOTH',
  CLONE_SUPERPOSITION_FAILED: 'EXPLANATION_READ', CLONE_UNDERSTOOD: 'EXIT_BOOTH', RELAY_UNLOCKED: 'REACH_RELAY',
  RELAY_SEND_FAILED: 'VIEW_RECEIVER_MARGINAL', RELAY_UNDERSTOOD: 'OPEN_ROOFTOP', ROOFTOP_UNLOCKED: 'REPAIR_CLASSICAL_LINK',
  LINK_REPAIRED: 'RUN_DRY_TEST', TELEPORT_COMMITTED: 'ANIMATION_END', ENDING: 'OPEN_CREDITS',
}
const EXPERIMENT_STATES = ['CLONE_INTRO', 'CLONE_BASIS_PASSED', 'RELAY_INTRO', 'RELAY_BELL_CREATED', 'TELEPORT_DRY_RUN']

// One step in state s with results from src; returns null on advance, else the stall.
async function step(s, src) {
  if (EXPERIMENT_STATES.includes(s)) {
    const result = await src.experiment(s)
    if (!result) return { state: s, reason: 'no result supplied for this state' }
    const out = await m.experiment(() => Promise.resolve(result))
    return out.event ? null : { state: s, reason: out.reason, invalid: C.validateExperimentResult(result) }
  }
  if (s === 'TELEPORT_DRY_RUN_PASSED') {
    const result = await src.commit()
    const out = await m.commitTransfer(() => Promise.resolve(result))
    // consumed once, whatever the first outcome: a second commit must never reach the engine
    let calls = 0
    const again = await m.commitTransfer(() => { calls++; return Promise.resolve(result) })
    log.push(`second commitTransfer: ok=${again.ok}, engine calls=${calls}, reason=${again.reason}`)
    if (calls) return { state: s, reason: `a second commit reached the engine (token re-measured; first: ${out.ok ? 'ok' : out.reason})` }
    if (!out.ok) return { state: s, reason: out.reason, commit: out.commit, invalid: C.validateExperimentResult(result) }
    return null
  }
  const ev = NEXT[s]
  if (!ev) return { state: s, reason: 'walker has no event for this state' }
  if (ev === 'EXPLANATION_READ' || ev === 'VIEW_RECEIVER_MARGINAL') m.resultPanelShown()  // story-ui showed the panel
  const r = m.send(ev)
  return r.ok ? null : { state: s, reason: r.reason }
}

const stalls = []
let fatal = false
for (let n = 0; n < 40 && m.state !== 'CREDITS'; n++) {
  const s = m.state
  const stall = await step(s, source)
  if (!stall) continue
  stalls.push(stall)
  if (!bridge) { fatal = true; break }
  // A refused commit has spent the token (MEASURED_REFUSED): the machine refuses any retry, so the
  // walk honestly ends there. Anything else is bridged with the control's result.
  if (stall.commit === COMMIT_STATUS.MEASURED_REFUSED) { fatal = true; break }
  log.push(`  [bridged ${s} with the control's result to keep walking]`)
  const again = await step(s, bridge)
  if (again) { stalls.push({ ...again, reason: `control also stalled: ${again.reason}` }); fatal = true; break }
}

console.log(`quest walk (${mode}${bridge ? ', stalls bridged' : ''}) on ${root}`)
for (const l of log) console.log(`  ${l}`)
for (const st of stalls) {
  console.log(`STALL at ${st.state}: ${st.reason}`)
  if (st.commit) console.log(`  commit status: ${st.commit}${st.commit === COMMIT_STATUS.MEASURED_REFUSED ? ' (token spent; the machine refuses any retry — the quest is stuck for this session)' : ''}`)
  if (st.invalid?.length) console.log(`  contract errors: ${st.invalid.join('; ')}`)
}
const transitions = log.filter(l => l.includes('->')).length
if (transitions < 4) { console.log('REFUSED: fewer than 4 transitions observed'); process.exit(2) }
console.log(`${stalls.length} stall(s); ended in ${m.state} after ${transitions} transitions; commit=${m.commit}${fatal ? ' (walk could not continue)' : ''}`)
process.exit(stalls.length || m.state !== 'CREDITS' ? 1 : 0)
