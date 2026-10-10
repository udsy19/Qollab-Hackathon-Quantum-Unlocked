// PORT of evidence/gameplay-quest-review/a3_robust.mjs to the contracts API. Same scenarios A-F;
// only the vocabulary changes: BOOTED->BOOT_COMPLETE, quest:enter:X / quest:transition ->
// QUEST_STATE_CHANGED filtered on p.to, reset()->resetGame(), D uses machine.experiment (the path
// the terminals now take) and also prints what the OLD name-compare guard would have said.
const R = process.argv[2];
const { createEventBus } = await import(R + '/echo/game/eventBus.js');
const { createQuestMachine } = await import(R + '/echo/game/state.js');
const { TRANSITIONS, BUS_EVENTS } = await import(R + '/echo/contracts.js');
const { eventForResult } = await import(R + '/echo/game/missionRules.js');
const { createFakeQuantum } = await import(R + '/dev/gameplay/fakeQuantum.js');
const CH = BUS_EVENTS.QUEST_STATE_CHANGED;
const walk = (m, evs) => evs.map((e) => m.send(e).ok);

{ // A. re-entrant send from a listener: what order do OTHER subscribers observe?
  const bus = createEventBus(); const m = createQuestMachine(bus); const seen = [];
  walk(m, ['BOOT_COMPLETE', 'START']);
  bus.on(CH, (p) => { if (p.to === 'FREE_ROAM_ALLEY') m.send('OPEN_CLONE_BOOTH'); });
  bus.on(CH, (p) => { if (p.to === 'FREE_ROAM_ALLEY') seen.push(`world sees enter:FREE_ROAM_ALLEY (machine.state=${m.state})`); });
  bus.on(CH, (p) => { if (p.to === 'CLONE_INTRO') seen.push(`world sees enter:CLONE_INTRO (machine.state=${m.state})`); });
  m.send('SKIP');
  console.log('A. re-entrant send, order seen by a later subscriber:'); seen.forEach((s) => console.log('   ', s));
}
{ // A2. transition log order seen by a 2nd subscriber
  const bus = createEventBus(); const m = createQuestMachine(bus); const log = [];
  bus.on(CH, (p) => { if (p.to === 'OPENING') m.send('SKIP'); });
  bus.on(CH, (p) => log.push(`${p.from}->${p.to}`));
  walk(m, ['BOOT_COMPLETE', 'START']);
  console.log('A2. transition log seen by 2nd subscriber:', log.join(' , '));
}
{ // B. resetGame() inside a handler
  const bus = createEventBus(); const m = createQuestMachine(bus); const seen = [];
  bus.on(CH, (p) => { if (p.to === 'OPENING') m.resetGame(); });
  bus.on(CH, (p) => { if (p.event === null) seen.push('reset'); else if (p.to === 'OPENING') seen.push(`enter:OPENING delivered while state=${m.state}`); });
  walk(m, ['BOOT_COMPLETE', 'START']);
  console.log('B. reset inside handler:', seen.join(' , '));
}
{ // C. throwing listener
  const errs = []; const bus = createEventBus({ onError: (e, t) => errs.push(t) }); const m = createQuestMachine(bus); let after = 0;
  bus.on(CH, () => { throw new Error('boom'); }); bus.on(CH, () => after++);
  const r = m.send('BOOT_COMPLETE');
  console.log('C. throwing listener: send ok', r.ok, 'state', m.state, 'later listener ran', after, 'errors reported', errs);
}
{ // D. stale async result after resetGame(), new session back in the same state (ABA)
  const bus = createEventBus(); const m = createQuestMachine(bus); const q = createFakeQuantum({ delayMs: 50 });
  walk(m, ['BOOT_COMPLETE', 'START', 'SKIP', 'OPEN_CLONE_BOOTH']);
  const askedIn = m.state;
  const pending = m.experiment(() => q.cloneTest('zero'));
  m.resetGame(); walk(m, ['START', 'SKIP', 'OPEN_CLONE_BOOTH']);
  const r = await pending;
  console.log(`D. stale result from the PREVIOUS session: old name-compare guard would say stale=${m.state !== askedIn}; machine.experiment says stale=${r.stale}; state now ${m.state}`);
}
// E. eventForResult on malformed results: contract says it returns {event|null, reason}
for (const [name, st, r] of [
  ['bits as strings', 'TELEPORT_DRY_RUN', { experiment: 'teleportation', parameters: { stateId: 'bloch', correctionX: false, correctionZ: false }, measurementBits: { m0: '0', m1: 0 }, fidelity: 1 }],
  ['parameters null', 'CLONE_INTRO', { experiment: 'cloning', parameters: null, fidelity: 1 }],
  ['no engine field', 'CLONE_INTRO', { experiment: 'cloning', parameters: { state: 'zero' }, fidelity: 1 }],
  ['engine=documented_preview commit', 'TELEPORT_DRY_RUN_PASSED', { experiment: 'teleportation', engine: 'documented_preview', circuitDescription: 'c', qubits: 3, facts: ['preview'], parameters: { stateId: 'story_token', correctionX: false, correctionZ: false }, measurementBits: { m0: 0, m1: 0 }, fidelity: 1 }],
  ['bell: receiver=1 contradicts receiver=0', 'RELAY_BELL_CREATED', { experiment: 'bell_signalling', engine: 'exact_qiskit_local', circuitDescription: 'c', qubits: 2, facts: ['f'], parameters: { senderGate: 'X' }, probabilities: { 0: 0.5, 1: 0.9 }, keyQubits: [1] }],
]) {
  try { console.log(`E. ${name}:`, JSON.stringify(eventForResult(st, r))); } catch (e) { console.log(`E. ${name}: THROWS ${e.message}`); }
}
// F. fuzz: 1000 random sequences of events (+ resetGame, + commit attempts), doc-order invariants
const GOOD = { experiment: 'teleportation', engine: 'exact_qiskit_local', circuitDescription: 'c', qubits: 3, facts: ['f'], parameters: { stateId: 'story_token', correctionX: true, correctionZ: false }, measurementBits: { m0: 0, m1: 1 }, fidelity: 1 };
const EVENTS = [...new Set(Object.values(TRANSITIONS).flatMap((r) => Object.keys(r))), 'RESET', '__proto__', 'constructor', 'toString', '', null, undefined, 42];
const MISSION = ['CLONE_INTRO', 'CLONE_BASIS_PASSED', 'CLONE_SUPERPOSITION_FAILED', 'CLONE_UNDERSTOOD', 'RELAY_UNLOCKED', 'RELAY_INTRO', 'RELAY_BELL_CREATED', 'RELAY_SEND_FAILED', 'RELAY_UNDERSTOOD', 'ROOFTOP_UNLOCKED', 'LINK_REPAIRED', 'TELEPORT_DRY_RUN', 'TELEPORT_DRY_RUN_PASSED', 'TELEPORT_COMMITTED'];
let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
let steps = 0, okSends = 0, viol = 0, commits = 0, engineCalls = 0, reachedEnd = 0, throwsNoEmit = 0;
for (let run = 0; run < 1000; run++) {
  const bus = createEventBus({ onError: () => viol++ }); const m = createQuestMachine(bus);
  let visited = [], commitsThisSession = 0, emitted = 0;
  bus.on(CH, (p) => {
    emitted++;
    if (p.event === null) { visited = []; commitsThisSession = 0; return; }
    if (TRANSITIONS[p.from]?.[p.event] !== p.to) viol++;
    visited.push(p.to);
    if (p.event === 'COMMIT_TRANSFER') {
      commits++; commitsThisSession++; if (commitsThisSession > 1) viol++;
      const idx = MISSION.map((s) => visited.indexOf(s)); if (idx.some((x) => x < 0) || idx.some((x, k) => k && x < idx[k - 1])) viol++;
    }
  });
  for (let i = 0; i < 300; i++) {
    steps++;
    const legal = Object.keys(TRANSITIONS[m.state]);
    const ev = rnd() < 0.6 ? legal[Math.floor(rnd() * legal.length)] : EVENTS[Math.floor(rnd() * EVENTS.length)];
    if (ev === 'RESET') { if (rnd() < 0.3) m.resetGame(); continue; }
    if (ev === 'EXPLANATION_READ' || ev === 'VIEW_RECEIVER_MARGINAL') m.resultPanelShown();
    const before = emitted, s0 = m.state;
    if (ev === 'COMMIT_TRANSFER' && rnd() < 0.5) {
      const r = await m.commitTransfer(async () => { engineCalls++; return GOOD; });
      if (!r.ok && (emitted !== before || m.state !== s0)) viol++;
      if (r.ok) okSends++;
    } else {
      let r;
      try { r = m.send(ev); } catch { if (emitted !== before || m.state !== s0) viol++; else throwsNoEmit++; continue; }
      if (!r.ok && (emitted !== before || m.state !== s0)) viol++;
      if (r.ok) okSends++;
    }
    if (m.state === 'CREDITS') reachedEnd++;
    if (!TRANSITIONS[m.state]) viol++;
  }
}
console.log(`F. fuzz: 1000 runs, ${steps} steps, ${okSends} accepted, ${commits} commits, ${engineCalls} commit engine calls, ${throwsNoEmit} unknown names thrown (nothing emitted), ${reachedEnd} steps in CREDITS, invariant violations = ${viol}`);
