// STAND-IN for gameplay-quest-core's eventBus.js + state.js (frozen API, vision §9.1/§9.2).
// Delete this file, and switch the imports in app.js, when lane/gameplay/gameplay-quest-core lands.

export const STATES = [
  'BOOT', 'TITLE', 'OPENING', 'FREE_ROAM_ALLEY',
  'CLONE_INTRO', 'CLONE_BASIS_PASSED', 'CLONE_SUPERPOSITION_FAILED', 'CLONE_UNDERSTOOD',
  'RELAY_UNLOCKED', 'RELAY_INTRO', 'RELAY_BELL_CREATED', 'RELAY_SEND_FAILED', 'RELAY_UNDERSTOOD',
  'ROOFTOP_UNLOCKED', 'LINK_REPAIRED', 'TELEPORT_DRY_RUN', 'TELEPORT_DRY_RUN_PASSED',
  'TELEPORT_COMMITTED', 'ENDING', 'DECLASSIFIED', 'CREDITS',
];

const TRANSITIONS = {
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
};

export function createEventBus() {
  const subs = new Map();
  return {
    on(type, fn) {
      if (!subs.has(type)) subs.set(type, new Set());
      subs.get(type).add(fn);
      return () => subs.get(type)?.delete(fn);
    },
    emit(type, payload) {
      for (const fn of [...(subs.get(type) ?? [])]) fn(payload);
    },
  };
}

export function createQuestMachine(bus) {
  const m = {
    state: 'BOOT',
    can: (event) => Boolean(TRANSITIONS[m.state]?.[event]),
    send(event) {
      const to = TRANSITIONS[m.state]?.[event];
      if (!to) return { ok: false, state: m.state, reason: 'invalid transition' };
      const from = m.state;
      m.state = to;
      bus.emit('quest:transition', { from, to, event });
      bus.emit(`quest:enter:${to}`, { from, event });
      return { ok: true, state: to };
    },
    reset() {
      m.state = 'TITLE';
      bus.emit('quest:reset', { state: m.state });
    },
  };
  return m;
}
