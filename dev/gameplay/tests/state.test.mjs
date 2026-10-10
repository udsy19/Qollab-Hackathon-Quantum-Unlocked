// Quest machine checks. Ground truth is the vision doc (spec.mjs), never contracts.js's own table.
// Run: node --test 'dev/gameplay/tests/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSpec, edgeKey } from './spec.mjs';
import { createEventBus } from '../../../echo/game/eventBus.js';
import { QUEST_STATE_LIST, TRANSITIONS, BUS_EVENTS, EVENT_SOURCES } from '../../../echo/contracts.js';
import { createQuestMachine, commitIsOneShot, COMMIT_STATUS, worldChangesFor } from '../../../echo/game/state.js';

const spec = loadSpec();
const CHANGED = 'QUEST_STATE_CHANGED'; // the name as the owner accepted it, not read from contracts
const ACKS = ['EXPLANATION_READ', 'VIEW_RECEIVER_MARGINAL'];

// A correct story-token transfer, as the atomic commit call returns it (shape: CONTRACTS.md).
const goodCommit = () => ({
  experiment: 'teleportation', engine: 'exact_qiskit_local', qubits: 3,
  circuitDescription: 'live teleport of the story token', facts: ['committed'],
  parameters: { stateId: 'story_token', applyX: true, applyZ: false },
  measurementBits: { m0: 0, m1: 1 }, fidelity: 1,
});
// Send as the event's rightful source (EVENT_SOURCES), the way the product's caller would.
const viaOf = (ev) => { try { return EVENT_SOURCES[ev].via; } catch { return undefined; } };
const sendAs = (m, ev) => m.send(ev, viaOf(ev));
const deferred = () => { let resolve; let reject; const p = new Promise((a, b) => { resolve = a; reject = b; }); return { p, resolve, reject }; };

function tableEdges(table) {
  const out = [];
  for (const [from, row] of Object.entries(table)) for (const [event, to] of Object.entries(row)) out.push({ from, event, to });
  return out;
}

function recorder(bus) {
  const log = [];
  bus.on(CHANGED, (p) => log.push(p));
  return log;
}

// Send one event the way the product does: acknowledgements need their result panel first,
// and the commit goes through commitTransfer.
async function play(m, ev) {
  if (ev === 'COMMIT_TRANSFER') return (await m.commitTransfer(async () => goodCommit())).ok;
  if (ACKS.includes(ev)) m.resultPanelShown();
  return sendAs(m, ev).ok;
}

async function machineIn(state) {
  const bus = createEventBus();
  const m = createQuestMachine(bus);
  const prev = new Map([['BOOT', null]]);
  const queue = ['BOOT'];
  while (queue.length) {
    const s = queue.shift();
    for (const e of spec.edges.filter((x) => x.from === s)) if (!prev.has(e.to)) { prev.set(e.to, e); queue.push(e.to); }
  }
  assert.ok(prev.has(state), `spec: ${state} unreachable from BOOT`);
  const path = [];
  for (let s = state; prev.get(s); s = prev.get(s).from) path.unshift(prev.get(s).event);
  for (const ev of path) assert.equal(await play(m, ev), true, `path to ${state}: ${ev} refused`);
  assert.equal(m.state, state);
  return { bus, m };
}

const WALK = [
  ['BOOT_COMPLETE', 'TITLE'], ['START', 'OPENING'], ['FINISHED', 'FREE_ROAM_ALLEY'],
  ['OPEN_CLONE_BOOTH', 'CLONE_INTRO'], ['BASIS_DEMO_OK', 'CLONE_BASIS_PASSED'],
  ['SUPERPOSITION_DEMO_FAILED', 'CLONE_SUPERPOSITION_FAILED'], ['EXPLANATION_READ', 'CLONE_UNDERSTOOD'],
  ['EXIT_BOOTH', 'RELAY_UNLOCKED'], ['REACH_RELAY', 'RELAY_INTRO'], ['PREPARE_BELL_PAIR', 'RELAY_BELL_CREATED'],
  ['ATTEMPT_NO_SIGNALLING', 'RELAY_SEND_FAILED'], ['VIEW_RECEIVER_MARGINAL', 'RELAY_UNDERSTOOD'],
  ['OPEN_ROOFTOP', 'ROOFTOP_UNLOCKED'], ['REPAIR_CLASSICAL_LINK', 'LINK_REPAIRED'],
  ['RUN_DRY_TEST', 'TELEPORT_DRY_RUN'], ['CORRECT_CALIBRATION', 'TELEPORT_DRY_RUN_PASSED'],
  ['COMMIT_TRANSFER', 'TELEPORT_COMMITTED'], ['ANIMATION_END', 'ENDING'],
  ['OPEN_SCIENCE', 'DECLASSIFIED'], ['OPEN_CREDITS', 'CREDITS'],
];

test('the one quest table: contracts QUEST_STATE_LIST is exactly §9.1, in order', () => {
  assert.deepEqual([...QUEST_STATE_LIST], spec.states);
});

test('contracts TRANSITIONS is exactly §9.2 + the owner-accepted additions (missing or skip edge both fail)', () => {
  const got = tableEdges(TRANSITIONS).map(edgeKey).sort();
  const want = spec.edges.map(edgeKey).sort();
  assert.deepEqual({ missing: want.filter((k) => !got.includes(k)), extra: got.filter((k) => !want.includes(k)) }, { missing: [], extra: [] });
});

test('the machine emits the contracts bus name, and only it', () => {
  assert.equal(BUS_EVENTS.QUEST_STATE_CHANGED, CHANGED);
});

test('full walk BOOT -> CREDITS: one QUEST_STATE_CHANGED {from,to,event} per step, nothing else', async () => {
  const bus = createEventBus();
  const seen = [];
  const realEmit = bus.emit;
  bus.emit = (type, p) => { seen.push(type); realEmit(type, p); };
  const log = recorder(bus);
  const m = createQuestMachine(bus);
  assert.equal(m.state, 'BOOT');
  for (const [ev, to] of WALK) {
    const from = m.state;
    assert.equal(await play(m, ev), true, `${from} --${ev}`);
    assert.equal(m.state, to);
    assert.deepEqual(log.at(-1), { from, to, event: ev });
  }
  assert.equal(log.length, WALK.length);
  assert.deepEqual([...new Set(seen)], [CHANGED]);
  const visited = new Set(['BOOT', ...WALK.map(([, to]) => to)]);
  assert.deepEqual(spec.states.filter((s) => !visited.has(s)), []);
});

test('every illegal (state, known event) pair is refused and emits nothing; unknown names throw and emit nothing', async () => {
  const legal = new Set(spec.edges.map((e) => `${e.from}|${e.event}`));
  let checked = 0;
  for (const s of spec.states) {
    for (const ev of spec.events) {
      if (legal.has(`${s}|${ev}`)) continue;
      const { bus, m } = await machineIn(s);
      const log = recorder(bus);
      assert.equal(m.can(ev, viaOf(ev)), false, `can(${ev}) in ${s}`);
      const r = ev === 'COMMIT_TRANSFER' ? await m.commitTransfer(async () => goodCommit()) : sendAs(m, ev);
      assert.equal(r.ok, false, `${s} accepted ${ev}`);
      assert.equal(m.state, s);
      assert.deepEqual(log, [], `${s}/${ev} emitted`);
      checked++;
    }
    for (const bad of ['NOT_AN_EVENT', '', null, 42]) {
      const { bus, m } = await machineIn(s);
      const log = recorder(bus);
      assert.equal(m.can(bad, viaOf(bad)), false);
      assert.throws(() => sendAs(m, bad), TypeError, `${s}/${bad}`);
      assert.equal(m.state, s);
      assert.deepEqual(log, []);
      checked++;
    }
  }
  assert.equal(checked, spec.states.length * (spec.events.length + 4) - legal.size);
});

test('every legal spec edge is accepted from its state', async () => {
  for (const e of spec.edges) {
    const { m } = await machineIn(e.from);
    assert.equal(await play(m, e.event), true, edgeKey(e));
    assert.equal(m.state, e.to, edgeKey(e));
  }
});

test('pressing E again at booth, relay or socket does nothing', async () => {
  for (const [state, ev] of [['FREE_ROAM_ALLEY', 'OPEN_CLONE_BOOTH'], ['RELAY_UNLOCKED', 'REACH_RELAY'], ['ROOFTOP_UNLOCKED', 'REPAIR_CLASSICAL_LINK']]) {
    const { bus, m } = await machineIn(state);
    assert.equal(sendAs(m, ev).ok, true);
    const after = m.state;
    const log = recorder(bus);
    for (let i = 0; i < 5; i++) assert.equal(sendAs(m, ev).ok, false);
    assert.equal(m.state, after);
    assert.deepEqual(log, []);
  }
});

test('commitIsOneShot holds on the contracts table and fails on a re-commit edge or a second commit edge', () => {
  assert.equal(commitIsOneShot(TRANSITIONS).ok, true);
  const bad = JSON.parse(JSON.stringify(TRANSITIONS));
  bad.ENDING.RETRY_COMMIT = 'TELEPORT_DRY_RUN_PASSED';
  assert.equal(commitIsOneShot(bad).ok, false);
  const two = JSON.parse(JSON.stringify(TRANSITIONS));
  two.ENDING.COMMIT_TRANSFER = 'TELEPORT_COMMITTED';
  assert.equal(commitIsOneShot(two).ok, false);
});

test('resetGame() from every state: TITLE, a new epoch, one QUEST_STATE_CHANGED with event null, and the run replays', async () => {
  for (const s of spec.states) {
    const { bus, m } = await machineIn(s);
    const e0 = m.epoch;
    const log = recorder(bus);
    m.resetGame();
    assert.equal(m.state, 'TITLE');
    assert.equal(m.epoch, e0 + 1);
    assert.deepEqual(log, [{ from: s, to: 'TITLE', event: null }]);
    assert.equal(sendAs(m, 'START').ok, true, `fresh run after reset from ${s}`);
  }
});

test('RESTART from ENDING (owner ruling 12), DECLASSIFIED and CREDITS is resetGame(), and a second run commits again', async () => {
  for (const end of ['ENDING', 'DECLASSIFIED', 'CREDITS']) {
    const { m } = await machineIn(end);
    assert.equal(m.commit, COMMIT_STATUS.COMMITTED);
    m.resetGame();
    assert.equal(m.commit, COMMIT_STATUS.IDLE, 'a new session carries a fresh token');
    for (const [ev] of WALK.slice(1, 17)) assert.equal(await play(m, ev), true, `${end} rerun: ${ev}`);
    assert.equal(m.state, 'TELEPORT_COMMITTED');
  }
});

test('RESTART on the ENDING screen (owner ruling 12) is resetGame(): TITLE, a new epoch, the latch re-armed', async () => {
  const { bus, m } = await machineIn('ENDING');
  const e0 = m.epoch;
  const log = recorder(bus);
  assert.equal(sendAs(m, 'RESTART').ok, true);
  assert.equal(m.state, 'TITLE');
  assert.equal(m.epoch, e0 + 1, 'RESTART starts a new session (§9.5): old tickets go stale');
  assert.equal(m.commit, COMMIT_STATUS.IDLE, 'the new session carries a fresh token');
  assert.deepEqual(log, [{ from: 'ENDING', to: 'TITLE', event: 'RESTART' }]);
});

test('EVENT_SOURCES: an event from the wrong source is refused and emits nothing (a terminal cannot walk you through a door)', async () => {
  for (const [state, ev, wrong] of [
    ['CLONE_UNDERSTOOD', 'EXIT_BOOTH', 'terminal_acknowledgement'], ['RELAY_UNDERSTOOD', 'OPEN_ROOFTOP', 'interactable'],
    ['RELAY_UNDERSTOOD', 'OPEN_ROOFTOP', undefined], ['FREE_ROAM_ALLEY', 'OPEN_CLONE_BOOTH', 'menu'],
    ['CLONE_INTRO', 'BASIS_DEMO_OK', 'interactable'], ['TELEPORT_COMMITTED', 'ANIMATION_END', 'menu'],
    ['ENDING', 'RESTART', 'world_trigger'],
  ]) {
    const { bus, m } = await machineIn(state);
    const log = recorder(bus);
    assert.equal(m.can(ev, wrong), false, `can(${ev}, ${wrong})`);
    const r = m.send(ev, wrong);
    assert.equal(r.ok, false, `${state}: ${ev} via ${wrong} accepted`);
    assert.equal(m.state, state);
    assert.deepEqual(log, []);
  }
  const { m } = await machineIn('CLONE_UNDERSTOOD');
  assert.equal(m.send('EXIT_BOOTH', 'world_trigger').ok, true, 'the rightful source still works');
});

// ---------------------------------------------------------------- F2: run-to-completion

test('F2: a send() inside a listener is delivered after the outer change reaches every listener', async () => {
  const { bus, m } = await machineIn('OPENING');
  const seen = [];
  bus.on(CHANGED, (p) => { if (p.to === 'FREE_ROAM_ALLEY') sendAs(m, 'OPEN_CLONE_BOOTH'); });
  bus.on(CHANGED, (p) => seen.push(`${p.to} (machine.state=${m.state})`));
  sendAs(m, 'SKIP');
  assert.deepEqual(seen, ['FREE_ROAM_ALLEY (machine.state=FREE_ROAM_ALLEY)', 'CLONE_INTRO (machine.state=CLONE_INTRO)']);
  assert.equal(m.state, 'CLONE_INTRO');
});

test('F2: resetGame() inside a listener is delivered after the outer change, never before it', async () => {
  const { bus, m } = await machineIn('TITLE');
  const seen = [];
  bus.on(CHANGED, (p) => { if (p.to === 'OPENING') m.resetGame(); });
  bus.on(CHANGED, (p) => seen.push(`${p.from}->${p.to} (state=${m.state})`));
  sendAs(m, 'START');
  assert.deepEqual(seen, ['TITLE->OPENING (state=OPENING)', 'OPENING->TITLE (state=TITLE)']);
});

test('F2: a listener sending a refused event mid-delivery is judged against the queued state', async () => {
  const { bus, m } = await machineIn('TITLE');
  const results = [];
  bus.on(CHANGED, (p) => { if (p.to === 'OPENING') results.push(sendAs(m, 'START').ok, sendAs(m, 'SKIP').ok); });
  sendAs(m, 'START');
  assert.deepEqual(results, [false, true]);
  assert.equal(m.state, 'FREE_ROAM_ALLEY');
});

// ---------------------------------------------------------------- F3: epoch

test('F3: a result asked before resetGame() is stale even when the new session is back in the same state (ABA)', async () => {
  const { m } = await machineIn('CLONE_INTRO');
  const d = deferred();
  const pending = m.experiment(() => d.p);
  m.resetGame();
  for (const ev of ['START', 'SKIP', 'OPEN_CLONE_BOOTH']) sendAs(m, ev);
  assert.equal(m.state, 'CLONE_INTRO');
  d.resolve({ experiment: 'cloning', engine: 'exact_qiskit_local', qubits: 2, circuitDescription: 'CX', facts: ['copied'], parameters: { state: 'zero' }, fidelity: 1 });
  const r = await pending;
  assert.equal(r.stale, true);
  assert.equal(m.state, 'CLONE_INTRO', 'the stale result did not advance the new session');
});

test('F3: a current result does advance (the ticket is not stale by default)', async () => {
  const { m } = await machineIn('CLONE_INTRO');
  const r = await m.experiment(async () => ({ experiment: 'cloning', engine: 'exact_qiskit_local', qubits: 2, circuitDescription: 'CX', facts: ['copied'], parameters: { state: 'zero' }, fidelity: 1 }));
  assert.equal(r.stale, false);
  assert.equal(r.event, 'BASIS_DEMO_OK');
  assert.equal(m.state, 'CLONE_BASIS_PASSED');
});

// ---------------------------------------------------------------- F4: commit latch

test('F4: COMMIT_TRANSFER cannot be sent directly, only through commitTransfer()', async () => {
  const { m } = await machineIn('TELEPORT_DRY_RUN_PASSED');
  assert.equal(sendAs(m, 'COMMIT_TRANSFER').ok, false);
  assert.equal(m.can('COMMIT_TRANSFER', viaOf('COMMIT_TRANSFER')), false);
  assert.equal(m.state, 'TELEPORT_DRY_RUN_PASSED');
});

test('F4: while a commit is in flight a second request never reaches the engine', async () => {
  const { m } = await machineIn('TELEPORT_DRY_RUN_PASSED');
  let calls = 0;
  const d = deferred();
  const first = m.commitTransfer(() => { calls++; return d.p; });
  const second = await m.commitTransfer(async () => { calls++; return goodCommit(); });
  assert.equal(second.ok, false);
  d.resolve(goodCommit());
  assert.equal((await first).ok, true);
  assert.equal(calls, 1);
  assert.equal(m.state, 'TELEPORT_COMMITTED');
  assert.equal((await m.commitTransfer(async () => { calls++; return goodCommit(); })).ok, false);
  assert.equal(calls, 1);
});

test('F4: a commit call that errors measured nothing, so it may be retried once more (owner ruling, consult 3)', async () => {
  const { m } = await machineIn('TELEPORT_DRY_RUN_PASSED');
  let calls = 0;
  const failed = await m.commitTransfer(async () => { calls++; throw new Error('bridge timeout'); });
  assert.equal(failed.ok, false);
  assert.equal(m.commit, COMMIT_STATUS.IDLE);
  assert.equal(m.state, 'TELEPORT_DRY_RUN_PASSED');
  const retry = await m.commitTransfer(async () => { calls++; return goodCommit(); });
  assert.equal(retry.ok, true);
  assert.equal(calls, 2);
});

test('F4: a commit result that came back but was refused latches: no second request, quest does not move', async () => {
  const { m } = await machineIn('TELEPORT_DRY_RUN_PASSED');
  let calls = 0;
  const bad = { ...goodCommit(), parameters: { stateId: 'story_token', correctionX: false, correctionZ: false } };
  const r = await m.commitTransfer(async () => { calls++; return bad; });
  assert.equal(r.ok, false);
  assert.equal(m.commit, COMMIT_STATUS.MEASURED_REFUSED);
  assert.equal(m.state, 'TELEPORT_DRY_RUN_PASSED');
  assert.equal((await m.commitTransfer(async () => { calls++; return goodCommit(); })).ok, false);
  assert.equal(calls, 1);
  m.resetGame();
  assert.equal(m.commit, COMMIT_STATUS.IDLE, 'only a new session re-arms the latch');
});

test('F4: a commit result that lands after resetGame() neither commits nor latches the new session', async () => {
  const { m } = await machineIn('TELEPORT_DRY_RUN_PASSED');
  const d = deferred();
  const pending = m.commitTransfer(() => d.p);
  m.resetGame();
  d.resolve(goodCommit());
  const r = await pending;
  assert.equal(r.ok, false);
  assert.equal(m.state, 'TITLE');
  assert.equal(m.commit, COMMIT_STATUS.IDLE);
});

// ---------------------------------------------------------------- ruling 13: acknowledgement gate

test('ruling 13: EXPLANATION_READ / VIEW_RECEIVER_MARGINAL advance only after the result panel was shown in that state', async () => {
  for (const [state, ack] of [['CLONE_SUPERPOSITION_FAILED', 'EXPLANATION_READ'], ['RELAY_SEND_FAILED', 'VIEW_RECEIVER_MARGINAL']]) {
    const { m } = await machineIn(state);
    assert.equal(m.can(ack, viaOf(ack)), false);
    assert.equal(sendAs(m, ack).ok, false, `${ack} before the panel`);
    assert.equal(m.state, state);
    m.resultPanelShown();
    assert.equal(sendAs(m, ack).ok, true, `${ack} after the panel`);
  }
});

test('ruling 13: a panel shown in an earlier state or session does not unlock a later acknowledgement', async () => {
  const { m } = await machineIn('CLONE_SUPERPOSITION_FAILED');
  m.resultPanelShown();
  m.resetGame();
  for (const ev of ['START', 'SKIP', 'OPEN_CLONE_BOOTH']) sendAs(m, ev);
  const r = await m.experiment(async () => ({ experiment: 'cloning', engine: 'exact_qiskit_local', qubits: 2, circuitDescription: 'CX', facts: ['ok'], parameters: { state: 'zero' }, fidelity: 1 }));
  assert.equal(r.event, 'BASIS_DEMO_OK');
  await m.experiment(async () => ({ experiment: 'cloning', engine: 'exact_qiskit_local', qubits: 2, circuitDescription: 'CX', facts: ['no'], parameters: { state: 'plus' }, fidelity: 0.5 }));
  assert.equal(m.state, 'CLONE_SUPERPOSITION_FAILED');
  assert.equal(sendAs(m, 'EXPLANATION_READ').ok, false);
});

// ---------------------------------------------------------------- §9.3 world changes

test('worldChangesFor names the §9.3 consequences per state and nothing for the rest', () => {
  assert.ok(worldChangesFor('TELEPORT_COMMITTED').includes('city_lighting_wave'));
  assert.deepEqual([...worldChangesFor('TITLE')], []);
  const states = spec.states.filter((s) => worldChangesFor(s).length);
  assert.deepEqual(states.sort(), ['CLONE_UNDERSTOOD', 'LINK_REPAIRED', 'RELAY_BELL_CREATED', 'RELAY_UNDERSTOOD', 'TELEPORT_COMMITTED'].sort());
});
