const R = process.argv[2];
const { createEventBus } = await import(R + '/echo/game/eventBus.js');
const { createQuestMachine, TRANSITIONS } = await import(R + '/echo/game/state.js');
const { eventForResult } = await import(R + '/echo/game/missionRules.js');
const { createFakeQuantum } = await import(R + '/dev/gameplay/fakeQuantum.js');
const walk = (m, evs) => evs.map((e) => m.send(e).ok);

// A. re-entrant send from a quest:enter handler: what order do OTHER subscribers observe?
{
  const bus = createEventBus(); const m = createQuestMachine(bus); const seen = [];
  walk(m, ['BOOTED', 'START']);
  bus.on('quest:enter:FREE_ROAM_ALLEY', () => m.send('OPEN_CLONE_BOOTH')); // e.g. auto-advance / driver reacting
  bus.on('quest:enter:FREE_ROAM_ALLEY', (p) => seen.push(`world sees enter:FREE_ROAM_ALLEY (machine.state=${m.state})`));
  bus.on('quest:enter:CLONE_INTRO', () => seen.push(`world sees enter:CLONE_INTRO (machine.state=${m.state})`));
  m.send('SKIP');
  console.log('A. re-entrant send, order seen by a later subscriber:'); seen.forEach((s) => console.log('   ', s));
}
// A2. same via quest:transition subscriber: transition log order
{
  const bus = createEventBus(); const m = createQuestMachine(bus); const log = [];
  bus.on('quest:transition', (p) => { if (p.to === 'OPENING') m.send('SKIP'); });
  bus.on('quest:transition', (p) => log.push(`${p.from}->${p.to}`));
  walk(m, ['BOOTED', 'START']);
  console.log('A2. transition log seen by 2nd subscriber:', log.join(' , '));
}
// B. reset() called inside a quest:enter handler: later subscribers still get enter:X after reset
{
  const bus = createEventBus(); const m = createQuestMachine(bus); const seen = [];
  bus.on('quest:enter:OPENING', () => m.reset());
  bus.on('quest:reset', () => seen.push('reset'));
  bus.on('quest:enter:OPENING', () => seen.push(`enter:OPENING delivered while state=${m.state}`));
  walk(m, ['BOOTED', 'START']);
  console.log('B. reset inside handler:', seen.join(' , '));
}
// C. throwing listener
{
  const errs = []; const bus = createEventBus({ onError: (e, t) => errs.push(t) }); const m = createQuestMachine(bus); let after = 0;
  bus.on('quest:transition', () => { throw new Error('boom'); }); bus.on('quest:transition', () => after++);
  const r = m.send('BOOTED');
  console.log('C. throwing listener: send ok', r.ok, 'state', m.state, 'later listener ran', after, 'errors reported', errs);
}
// D. stale async result after reset — the guard devTerminal uses (state name compare) is ABA-blind
{
  const bus = createEventBus(); const m = createQuestMachine(bus); const q = createFakeQuantum({ delayMs: 50 });
  walk(m, ['BOOTED', 'START', 'SKIP', 'OPEN_CLONE_BOOTH']);
  const askedIn = m.state; // CLONE_INTRO, exactly as devTerminal.experiment() does
  const pending = q.cloneTest('zero');
  m.reset(); walk(m, ['START', 'SKIP', 'OPEN_CLONE_BOOTH']); // new session, player is quick (or bridge slow)
  const result = await pending;
  const stale = m.state !== askedIn; // devTerminal's check
  const v = eventForResult(askedIn, result);
  if (!stale && v.event) m.send(v.event);
  console.log(`D. stale result from the PREVIOUS session: guard says stale=${stale}; applied -> state ${m.state}`);
}
// E. eventForResult on malformed results: contract says it returns {event|null, reason}
for (const [name, st, r] of [
  ['bits as strings', 'TELEPORT_DRY_RUN', { experiment: 'teleportation', parameters: { stateId: 'bloch', correctionX: false, correctionZ: false }, measurementBits: { m0: '0', m1: 0 }, fidelity: 1 }],
  ['parameters null', 'CLONE_INTRO', { experiment: 'cloning', parameters: null, fidelity: 1 }],
  ['no engine field', 'CLONE_INTRO', { experiment: 'cloning', parameters: { state: 'zero' }, fidelity: 1 }],
  ['engine=documented_preview commit', 'TELEPORT_DRY_RUN_PASSED', { experiment: 'teleportation', engine: 'documented_preview', parameters: { stateId: 'story_token', correctionX: false, correctionZ: false }, measurementBits: { m0: 0, m1: 0 }, fidelity: 1 }],
  ['bell: receiver=1 contradicts receiver=0', 'RELAY_BELL_CREATED', { experiment: 'bell_signalling', parameters: { senderGate: 'X' }, probabilities: { 'receiver=0': 0.5, 'receiver=1': 0.9 } }],
]) {
  try { console.log(`E. ${name}:`, JSON.stringify(eventForResult(st, r))); } catch (e) { console.log(`E. ${name}: THROWS ${e.message}`); }
}
// F. fuzz: 1000 random sequences of events (+ reset), invariants from the doc-derived order
const EVENTS = [...new Set(Object.values(TRANSITIONS).flatMap((r) => Object.keys(r))), 'RESET', '__proto__', 'constructor', 'toString', '', null, undefined, 42];
const MISSION = ['CLONE_INTRO', 'CLONE_BASIS_PASSED', 'CLONE_SUPERPOSITION_FAILED', 'CLONE_UNDERSTOOD', 'RELAY_UNLOCKED', 'RELAY_INTRO', 'RELAY_BELL_CREATED', 'RELAY_SEND_FAILED', 'RELAY_UNDERSTOOD', 'ROOFTOP_UNLOCKED', 'LINK_REPAIRED', 'TELEPORT_DRY_RUN', 'TELEPORT_DRY_RUN_PASSED', 'TELEPORT_COMMITTED'];
let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const vk = {}; let steps = 0, okSends = 0, viol = 0, commits = 0, reachedEnd = 0;
for (let run = 0; run < 1000; run++) {
  const bus = createEventBus({ onError: () => viol++ }); const m = createQuestMachine(bus);
  let visited = [], commitsThisSession = 0, emitted = 0;
  bus.on('quest:transition', (p) => { emitted++; if (TRANSITIONS[p.from]?.[p.event] !== p.to) viol++; });
  bus.on('quest:reset', () => { visited = []; commitsThisSession = 0; });
  // bias toward legal events so deep states are reached
  for (let i = 0; i < 300; i++) {
    steps++;
    const legal = Object.keys(TRANSITIONS[m.state]);
    const ev = rnd() < 0.6 ? legal[Math.floor(rnd() * legal.length)] : EVENTS[Math.floor(rnd() * EVENTS.length)];
    if (ev === 'RESET' && rnd() < 0.3) { m.reset(); continue; }
    const before = emitted, s0 = m.state, r = m.send(ev);
    if (!r.ok && (emitted !== before || m.state !== s0)) viol++;
    if (r.ok) { okSends++; if (m.state === 'TITLE') { visited = []; commitsThisSession = 0; } visited.push(m.state); if (ev === 'COMMIT_TRANSFER') { commits++; commitsThisSession++; if (commitsThisSession > 1) viol++;
      // every mission state must have been visited, in order, this session
      const idx = MISSION.map((s) => visited.indexOf(s)); if (idx.some((x) => x < 0) || idx.some((x, k) => k && x < idx[k - 1])) viol++; } }
    if (m.state === 'CREDITS') reachedEnd++;
    if (!TRANSITIONS[m.state]) viol++;
  }
}
console.log(`F. fuzz: 1000 runs, ${steps} steps, ${okSends} accepted, ${commits} commits, ${reachedEnd} steps in CREDITS, invariant violations = ${viol}`);
