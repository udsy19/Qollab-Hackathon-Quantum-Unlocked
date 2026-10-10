// Quest machine checks. Ground truth is the vision doc (spec.mjs), never state.js's own table.
// Run: node --test dev/gameplay/tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSpec, edgeKey } from './spec.mjs';
import { createEventBus } from '../../../echo/game/eventBus.js';
import { QUEST_STATES, TRANSITIONS, createQuestMachine, commitIsOneShot } from '../../../echo/game/state.js';

const spec = loadSpec();

function tableEdges(table) {
  const out = [];
  for (const [from, row] of Object.entries(table)) {
    for (const [event, to] of Object.entries(row)) out.push({ from, event, to });
  }
  return out;
}

function recorder(bus) {
  const log = [];
  const types = ['quest:transition', 'quest:reset', ...spec.states.map((s) => `quest:enter:${s}`)];
  for (const t of types) bus.on(t, (p) => log.push({ type: t, payload: p }));
  return log;
}

function machineIn(state) {
  // Drive a fresh machine to `state` along a shortest path in the SPEC graph — the only way to
  // reach a state is by legal events, so this also exercises reachability.
  const bus = createEventBus();
  const m = createQuestMachine(bus);
  const prev = new Map([['BOOT', null]]);
  const queue = ['BOOT'];
  while (queue.length) {
    const s = queue.shift();
    for (const e of spec.edges.filter((x) => x.from === s)) {
      if (!prev.has(e.to)) { prev.set(e.to, e); queue.push(e.to); }
    }
  }
  assert.ok(prev.has(state), `spec: ${state} unreachable from BOOT`);
  const path = [];
  for (let s = state; prev.get(s); s = prev.get(s).from) path.unshift(prev.get(s).event);
  for (const ev of path) assert.equal(m.send(ev).ok, true, `path to ${state}: ${ev} refused`);
  assert.equal(m.state, state);
  return { bus, m };
}

test('QUEST_STATES is exactly the §9.1 list (no integer counter, no missing or extra state)', () => {
  assert.deepEqual([...QUEST_STATES].sort(), [...spec.states].sort());
});

test('TRANSITIONS is exactly §9.2 + the brief additions (catches a removed edge or a skip edge)', () => {
  const got = tableEdges(TRANSITIONS).map(edgeKey).sort();
  const want = spec.edges.map(edgeKey).sort();
  const missing = want.filter((k) => !got.includes(k));
  const extra = got.filter((k) => !want.includes(k));
  assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
});

test('full legal walk: BOOT -> TITLE -> ... -> ENDING -> DECLASSIFIED -> CREDITS, one event each', () => {
  const bus = createEventBus();
  const log = recorder(bus);
  const m = createQuestMachine(bus);
  assert.equal(m.state, 'BOOT');
  // The player's actual path, written as the player plays it (not read from any table).
  const walk = [
    ['BOOTED', 'TITLE'], ['START', 'OPENING'], ['FINISHED', 'FREE_ROAM_ALLEY'],
    ['OPEN_CLONE_BOOTH', 'CLONE_INTRO'], ['BASIS_DEMO_OK', 'CLONE_BASIS_PASSED'],
    ['SUPERPOSITION_DEMO_FAILED', 'CLONE_SUPERPOSITION_FAILED'], ['EXPLANATION_READ', 'CLONE_UNDERSTOOD'],
    ['EXIT_BOOTH', 'RELAY_UNLOCKED'], ['REACH_RELAY', 'RELAY_INTRO'], ['PREPARE_BELL_PAIR', 'RELAY_BELL_CREATED'],
    ['ATTEMPT_NO_SIGNALLING', 'RELAY_SEND_FAILED'], ['VIEW_RECEIVER_MARGINAL', 'RELAY_UNDERSTOOD'],
    ['OPEN_ROOFTOP', 'ROOFTOP_UNLOCKED'], ['REPAIR_CLASSICAL_LINK', 'LINK_REPAIRED'],
    ['RUN_DRY_TEST', 'TELEPORT_DRY_RUN'], ['CORRECT_CALIBRATION', 'TELEPORT_DRY_RUN_PASSED'],
    ['COMMIT_TRANSFER', 'TELEPORT_COMMITTED'], ['ANIMATION_END', 'ENDING'],
    ['OPEN_SCIENCE', 'DECLASSIFIED'], ['OPEN_CREDITS', 'CREDITS'],
  ];
  for (const [ev, to] of walk) {
    const from = m.state;
    const r = m.send(ev);
    assert.deepEqual({ ok: r.ok, state: r.state }, { ok: true, state: to }, `${from} --${ev}`);
    assert.equal(m.state, to);
    const tail = log.slice(-2);
    assert.deepEqual(tail, [
      { type: 'quest:transition', payload: { from, to, event: ev } },
      { type: `quest:enter:${to}`, payload: { from, to, event: ev } },
    ]);
  }
  assert.equal(log.length, walk.length * 2, 'exactly two emissions per transition');
  // Every §9.1 state except the ending's alternative route is visited by the walk.
  const visited = new Set(['BOOT', ...walk.map(([, to]) => to)]);
  assert.deepEqual(spec.states.filter((s) => !visited.has(s)), []);
});

test('every illegal (state, event) pair is rejected and emits nothing', () => {
  const legal = new Set(spec.edges.map((e) => `${e.from}|${e.event}`));
  const probes = [...spec.events, 'NOT_AN_EVENT', '', 'constructor', '__proto__', 'toString'];
  let checked = 0;
  for (const s of spec.states) {
    for (const ev of probes) {
      if (legal.has(`${s}|${ev}`)) continue;
      const { bus, m } = machineIn(s);
      const log = recorder(bus);
      assert.equal(m.can(ev), false, `can(${ev}) in ${s}`);
      const r = m.send(ev);
      assert.equal(r.ok, false, `${s} accepted ${ev}`);
      assert.equal(r.state, s);
      assert.equal(typeof r.reason, 'string');
      assert.equal(m.state, s);
      assert.deepEqual(log, [], `${s}/${ev} emitted`);
      checked++;
    }
  }
  // States × probes minus legal pairs: derived, then counted — zero checks would be a refusal.
  assert.equal(checked, spec.states.length * probes.length - legal.size);
  assert.ok(checked > 0);
});

test('every legal pair in the spec is accepted from its state, and can() agrees', () => {
  for (const e of spec.edges) {
    const { m } = machineIn(e.from);
    assert.equal(m.can(e.event), true, edgeKey(e));
    const r = m.send(e.event);
    assert.deepEqual({ ok: r.ok, state: r.state }, { ok: true, state: e.to }, edgeKey(e));
  }
});

test('idempotency: pressing E again at booth, relay or socket does nothing harmful', () => {
  for (const [state, ev] of [['FREE_ROAM_ALLEY', 'OPEN_CLONE_BOOTH'], ['RELAY_UNLOCKED', 'REACH_RELAY'], ['ROOFTOP_UNLOCKED', 'REPAIR_CLASSICAL_LINK']]) {
    const { bus, m } = machineIn(state);
    assert.equal(m.send(ev).ok, true);
    const after = m.state;
    const log = recorder(bus);
    for (let i = 0; i < 5; i++) assert.equal(m.send(ev).ok, false);
    assert.equal(m.state, after);
    assert.deepEqual(log, []);
  }
});

test('COMMIT_TRANSFER fires exactly once per session: a second commit is impossible', () => {
  const { bus, m } = machineIn('TELEPORT_DRY_RUN_PASSED');
  const log = recorder(bus);
  assert.equal(m.send('COMMIT_TRANSFER').ok, true);
  // Every state reachable after the commit, before a reset, refuses COMMIT_TRANSFER.
  for (const ev of [...spec.events, 'COMMIT_TRANSFER']) {
    if (ev === 'RESTART') continue;
    m.send(ev); // wander forward through whatever is legal
    if (m.state !== 'TITLE') assert.equal(m.can('COMMIT_TRANSFER'), false, `in ${m.state}`);
  }
  assert.equal(log.filter((x) => x.type === 'quest:enter:TELEPORT_COMMITTED').length, 1);
});

test('commitIsOneShot(TRANSITIONS) holds, and fails on a table with a re-commit edge', () => {
  assert.equal(commitIsOneShot(TRANSITIONS).ok, true);
  const bad = JSON.parse(JSON.stringify(TRANSITIONS));
  bad.ENDING.RETRY_COMMIT = 'TELEPORT_DRY_RUN_PASSED';
  assert.equal(commitIsOneShot(bad).ok, false);
  const twoCommits = JSON.parse(JSON.stringify(TRANSITIONS));
  twoCommits.ENDING.COMMIT_TRANSFER = 'TELEPORT_COMMITTED';
  assert.equal(commitIsOneShot(twoCommits).ok, false);
});

test('TRANSITIONS cannot be mutated at runtime', () => {
  assert.throws(() => { TRANSITIONS.ENDING.COMMIT_TRANSFER = 'TELEPORT_COMMITTED'; });
  assert.throws(() => { TRANSITIONS.ENDING = {}; });
  assert.equal(TRANSITIONS.ENDING.COMMIT_TRANSFER, undefined);
});

test('reset() from every state returns to TITLE, emits quest:reset once, and the run replays', () => {
  for (const s of spec.states) {
    const { bus, m } = machineIn(s);
    const log = recorder(bus);
    m.reset();
    assert.equal(m.state, 'TITLE');
    assert.deepEqual(log, [{ type: 'quest:reset', payload: { from: s, to: 'TITLE' } }]);
    assert.equal(m.send('START').ok, true, `fresh run after reset from ${s}`);
  }
});

test('RESTART from DECLASSIFIED and CREDITS returns to TITLE and a full second run commits again', () => {
  const { m } = machineIn('CREDITS');
  assert.equal(m.send('RESTART').state, 'TITLE');
  for (const ev of ['START', 'SKIP', 'OPEN_CLONE_BOOTH', 'BASIS_DEMO_OK', 'SUPERPOSITION_DEMO_FAILED',
    'EXPLANATION_READ', 'EXIT_BOOTH', 'REACH_RELAY', 'PREPARE_BELL_PAIR', 'ATTEMPT_NO_SIGNALLING',
    'VIEW_RECEIVER_MARGINAL', 'OPEN_ROOFTOP', 'REPAIR_CLASSICAL_LINK', 'RUN_DRY_TEST',
    'CORRECT_CALIBRATION', 'COMMIT_TRANSFER']) {
    assert.equal(m.send(ev).ok, true, ev);
  }
  assert.equal(m.state, 'TELEPORT_COMMITTED');
});

test('a listener that sends during quest:enter sees the new state (no lost or doubled step)', () => {
  const bus = createEventBus();
  const m = createQuestMachine(bus);
  bus.on('quest:enter:OPENING', () => m.send('SKIP'));
  m.send('BOOTED');
  m.send('START');
  assert.equal(m.state, 'FREE_ROAM_ALLEY');
});
