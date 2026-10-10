// The quest: one deterministic finite state machine (vision §9). Every step the player can make
// is a named edge in TRANSITIONS; anything else is refused and emits nothing, so pressing E
// twice, or out of order, cannot replay or skip a mission.

export const QUEST_STATES = Object.freeze([
  'BOOT',
  'TITLE',
  'OPENING',
  'FREE_ROAM_ALLEY',
  'CLONE_INTRO',
  'CLONE_BASIS_PASSED',
  'CLONE_SUPERPOSITION_FAILED',
  'CLONE_UNDERSTOOD',
  'RELAY_UNLOCKED',
  'RELAY_INTRO',
  'RELAY_BELL_CREATED',
  'RELAY_SEND_FAILED',
  'RELAY_UNDERSTOOD',
  'ROOFTOP_UNLOCKED',
  'LINK_REPAIRED',
  'TELEPORT_DRY_RUN',
  'TELEPORT_DRY_RUN_PASSED',
  'TELEPORT_COMMITTED',
  'ENDING',
  'DECLASSIFIED',
  'CREDITS',
]);

const freezeRows = (table) => Object.freeze(Object.fromEntries(
  Object.entries(table).map(([state, row]) => [state, Object.freeze({ ...row })]),
));

// §9.2, plus BOOT→TITLE, the ending's DECLASSIFIED↔CREDITS pair and RESTART back to TITLE.
// Wrong teleport corrections are NOT a quest event: the terminal shows the failure and the player
// retries on a fresh calibration qubit while the quest stays in TELEPORT_DRY_RUN.
export const TRANSITIONS = freezeRows({
  BOOT: { BOOTED: 'TITLE' },
  TITLE: { START: 'OPENING' },
  OPENING: { FINISHED: 'FREE_ROAM_ALLEY', SKIP: 'FREE_ROAM_ALLEY' },
  FREE_ROAM_ALLEY: { OPEN_CLONE_BOOTH: 'CLONE_INTRO' },
  CLONE_INTRO: { BASIS_DEMO_OK: 'CLONE_BASIS_PASSED' },
  CLONE_BASIS_PASSED: { SUPERPOSITION_DEMO_FAILED: 'CLONE_SUPERPOSITION_FAILED' },
  CLONE_SUPERPOSITION_FAILED: { EXPLANATION_READ: 'CLONE_UNDERSTOOD' },
  CLONE_UNDERSTOOD: { EXIT_BOOTH: 'RELAY_UNLOCKED' },
  RELAY_UNLOCKED: { REACH_RELAY: 'RELAY_INTRO' },
  RELAY_INTRO: { PREPARE_BELL_PAIR: 'RELAY_BELL_CREATED' },
  RELAY_BELL_CREATED: { ATTEMPT_NO_SIGNALLING: 'RELAY_SEND_FAILED' },
  RELAY_SEND_FAILED: { VIEW_RECEIVER_MARGINAL: 'RELAY_UNDERSTOOD' },
  RELAY_UNDERSTOOD: { OPEN_ROOFTOP: 'ROOFTOP_UNLOCKED' },
  ROOFTOP_UNLOCKED: { REPAIR_CLASSICAL_LINK: 'LINK_REPAIRED' },
  LINK_REPAIRED: { RUN_DRY_TEST: 'TELEPORT_DRY_RUN' },
  TELEPORT_DRY_RUN: { CORRECT_CALIBRATION: 'TELEPORT_DRY_RUN_PASSED' },
  TELEPORT_DRY_RUN_PASSED: { COMMIT_TRANSFER: 'TELEPORT_COMMITTED' },
  TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING' },
  ENDING: { OPEN_SCIENCE: 'DECLASSIFIED', OPEN_CREDITS: 'CREDITS' },
  DECLASSIFIED: { OPEN_CREDITS: 'CREDITS', RESTART: 'TITLE' },
  CREDITS: { OPEN_SCIENCE: 'DECLASSIFIED', RESTART: 'TITLE' },
});

const INITIAL = 'BOOT';
const RESET_TO = 'TITLE';
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// The story token is measured once, at COMMIT_TRANSFER (§7.4 story integrity). Structural proof:
// exactly one edge carries COMMIT_TRANSFER, and from its target the only way back to that edge
// runs through TITLE — i.e. a new session with a fresh token. Checked when this module loads, so
// a table edited into a re-commit loop never runs.
export function commitIsOneShot(table) {
  const commits = [];
  for (const [from, row] of Object.entries(table)) {
    for (const [event, to] of Object.entries(row)) if (event === 'COMMIT_TRANSFER') commits.push({ from, to });
  }
  if (commits.length !== 1) return { ok: false, reason: `expected one COMMIT_TRANSFER edge, found ${commits.length}` };
  const [{ from: armed, to: committed }] = commits;
  const seen = new Set([committed]);
  const queue = [committed];
  while (queue.length) {
    const s = queue.shift();
    if (s === armed) return { ok: false, reason: `${armed} is reachable again from ${committed} without passing ${RESET_TO}` };
    for (const next of Object.values(table[s] ?? {})) {
      if (next !== RESET_TO && !seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return { ok: true, armed, committed };
}

const proof = commitIsOneShot(TRANSITIONS);
if (!proof.ok) throw new Error(`quest TRANSITIONS violate the one-shot commit: ${proof.reason}`);

export function createQuestMachine(bus) {
  let state = INITIAL;

  const can = (event) => typeof event === 'string' && has(TRANSITIONS[state], event);

  function send(event) {
    if (!can(event)) return { ok: false, state, reason: `"${String(event)}" is not valid in ${state}` };
    const from = state;
    const to = TRANSITIONS[from][event];
    state = to; // set before emitting, so a listener that sends next acts on the new state
    const payload = { from, to, event };
    bus.emit('quest:transition', payload);
    bus.emit(`quest:enter:${to}`, payload);
    return { ok: true, state };
  }

  // Back to TITLE from anywhere (vision §9.5). Listeners on quest:reset restore the player,
  // terminals, world flags, camera, audio and UI; the machine only owns the quest state.
  function reset() {
    const from = state;
    state = RESET_TO;
    bus.emit('quest:reset', { from, to: RESET_TO });
  }

  return { get state() { return state; }, send, can, reset };
}
