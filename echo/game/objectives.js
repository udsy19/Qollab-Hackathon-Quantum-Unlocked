// Quest state -> objective id. The words the player reads belong to story-ui (echo/data/); this
// map only names WHICH objective is current, so the HUD and the world's target marker agree.
const OBJECTIVE_BY_STATE = Object.freeze({
  BOOT: 'obj.none',
  TITLE: 'obj.none',
  OPENING: 'obj.none',
  FREE_ROAM_ALLEY: 'obj.find_booth',
  CLONE_INTRO: 'obj.copy_basis',
  CLONE_BASIS_PASSED: 'obj.copy_token',
  CLONE_SUPERPOSITION_FAILED: 'obj.read_scan',
  CLONE_UNDERSTOOD: 'obj.leave_booth',
  RELAY_UNLOCKED: 'obj.reach_relay',
  RELAY_INTRO: 'obj.prepare_pair',
  RELAY_BELL_CREATED: 'obj.try_signal',
  RELAY_SEND_FAILED: 'obj.read_receiver',
  RELAY_UNDERSTOOD: 'obj.go_rooftop',
  ROOFTOP_UNLOCKED: 'obj.repair_link',
  LINK_REPAIRED: 'obj.start_calibration',
  TELEPORT_DRY_RUN: 'obj.calibrate',
  TELEPORT_DRY_RUN_PASSED: 'obj.commit',
  TELEPORT_COMMITTED: 'obj.none',
  ENDING: 'obj.none',
  DECLASSIFIED: 'obj.none',
  CREDITS: 'obj.none',
});

export function objectiveFor(state) {
  const id = OBJECTIVE_BY_STATE[state];
  if (!id) throw new Error(`no objective for quest state "${state}"`);
  return id;
}
