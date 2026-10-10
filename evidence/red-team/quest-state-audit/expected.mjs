// Expected quest transitions, derived ONLY from the owner's documents — written before reading
// echo/game/state.js or echo/contracts.js (gate-independence law 4). Every row cites its source.
//   V§9.2   = ECHO_MASTER_VISION.md §9.2 transitions table (lines ~749-767)
//   R13.n   = owner-answers § "13 lane design questions" item n (2026-10-10)
//   RG3.n   = owner-answers § "overseer rulings — gameplay consult 3" item n (2026-10-10)
//   V§7.4   = §7.4 Story-integrity constraint; V§9.3 = idempotence; V§9.5 = resetGame
export const EXPECTED = [
  // [from, event, to, source]
  ['BOOT', 'BOOT_COMPLETE', 'TITLE', 'R13.1'],
  ['TITLE', 'START', 'OPENING', 'V§9.2'],
  ['OPENING', 'FINISHED', 'FREE_ROAM_ALLEY', 'V§9.2'],
  ['OPENING', 'SKIP', 'FREE_ROAM_ALLEY', 'V§9.2'],
  ['FREE_ROAM_ALLEY', 'OPEN_CLONE_BOOTH', 'CLONE_INTRO', 'V§9.2'],
  ['CLONE_INTRO', 'BASIS_DEMO_OK', 'CLONE_BASIS_PASSED', 'V§9.2'],
  ['CLONE_BASIS_PASSED', 'SUPERPOSITION_DEMO_FAILED', 'CLONE_SUPERPOSITION_FAILED', 'V§9.2'],
  ['CLONE_SUPERPOSITION_FAILED', 'EXPLANATION_READ', 'CLONE_UNDERSTOOD', 'V§9.2 + guard R13.13'],
  ['CLONE_UNDERSTOOD', 'EXIT_BOOTH', 'RELAY_UNLOCKED', 'V§9.2'],
  ['RELAY_UNLOCKED', 'REACH_RELAY', 'RELAY_INTRO', 'V§9.2'],
  ['RELAY_INTRO', 'PREPARE_BELL_PAIR', 'RELAY_BELL_CREATED', 'V§9.2'],
  ['RELAY_BELL_CREATED', 'ATTEMPT_NO_SIGNALLING', 'RELAY_SEND_FAILED', 'V§9.2'],
  ['RELAY_SEND_FAILED', 'VIEW_RECEIVER_MARGINAL', 'RELAY_UNDERSTOOD', 'V§9.2 + guard R13.13'],
  ['RELAY_UNDERSTOOD', 'OPEN_ROOFTOP', 'ROOFTOP_UNLOCKED', 'V§9.2'],
  ['ROOFTOP_UNLOCKED', 'REPAIR_CLASSICAL_LINK', 'LINK_REPAIRED', 'V§9.2'],
  ['LINK_REPAIRED', 'RUN_DRY_TEST', 'TELEPORT_DRY_RUN', 'V§9.2'],
  ['TELEPORT_DRY_RUN', 'CORRECT_CALIBRATION', 'TELEPORT_DRY_RUN_PASSED', 'V§9.2 + guard RG3.2 (correct AND bits != 00)'],
  ['TELEPORT_DRY_RUN_PASSED', 'COMMIT_TRANSFER', 'TELEPORT_COMMITTED', 'V§9.2 + V§7.4 (token measured here, once)'],
  ['TELEPORT_COMMITTED', 'ANIMATION_END', 'ENDING', 'V§9.2'],
  ['ENDING', 'OPEN_SCIENCE', 'DECLASSIFIED', 'V§9.2'],
  ['ENDING', 'OPEN_CREDITS', 'CREDITS', 'V§9.2'],
  ['DECLASSIFIED', 'OPEN_CREDITS', 'CREDITS', 'R13.1'],
  // R13.1 "DECLASSIFIED -> back to ENDING": event name not given by the docs; matched by target only.
  ['DECLASSIFIED', '*', 'ENDING', 'R13.1 (event name unspecified)'],
  // R13.12 "the ENDING screen offers RESTART directly"; V§9.5 resetGame. Target not specified by the
  // docs (TITLE or BOOT); accepted as either — open question to the owner.
  ['ENDING', 'RESTART', ['TITLE', 'BOOT', 'OPENING'], 'R13.12 + V§9.5 (target unspecified)'],
];

// The mission ordering a player must pass through to reach ENDING (V§9.1 order, V§9.2 chain).
export const MUST_VISIT_BEFORE_ENDING = [
  'CLONE_SUPERPOSITION_FAILED', 'CLONE_UNDERSTOOD', 'RELAY_SEND_FAILED', 'RELAY_UNDERSTOOD',
  'LINK_REPAIRED', 'TELEPORT_DRY_RUN', 'TELEPORT_DRY_RUN_PASSED', 'TELEPORT_COMMITTED',
];

// Behavioural properties the docs require beyond the table:
//  P-NOSKIP   every path BOOT -> ENDING visits MUST_VISIT_BEFORE_ENDING            (V§9.2, CLAUDE.md "Playable")
//  P-ONCE     the story token is measured exactly once, only on COMMIT_TRANSFER;  (V§7.4, V§2.4, RG3.1)
//             a second COMMIT_TRANSFER (or one fired in any other state) does not measure it again (V§9.3)
//  P-ERRCOMMIT a commit whose quantum call errors records NO measurement and may be retried     (RG3.1)
//  P-FRESH    a wrong dry run retries on a fresh calibration state (not the same one)            (R13.11, R13.7)
//  P-DRYGUARD COMMIT unlocks only after >=1 correct dry run with bits != 00; all four X/Z offered  (RG3.2)
//  P-BITS     corrections are chosen after m0, m1 are produced (bits first)       (owner § red-team physics (2))
//  P-ACK      EXPLANATION_READ / VIEW_RECEIVER_MARGINAL advance only after the result panel was shown (R13.13)
//  P-REJECT   every (state, event) pair not in EXPECTED leaves the state unchanged          (V§9.2 transition())
export const DOC_STATES = ['BOOT', 'TITLE', 'OPENING', 'FREE_ROAM_ALLEY', 'CLONE_INTRO', 'CLONE_BASIS_PASSED',
  'CLONE_SUPERPOSITION_FAILED', 'CLONE_UNDERSTOOD', 'RELAY_UNLOCKED', 'RELAY_INTRO', 'RELAY_BELL_CREATED',
  'RELAY_SEND_FAILED', 'RELAY_UNDERSTOOD', 'ROOFTOP_UNLOCKED', 'LINK_REPAIRED', 'TELEPORT_DRY_RUN',
  'TELEPORT_DRY_RUN_PASSED', 'TELEPORT_COMMITTED', 'ENDING', 'DECLASSIFIED', 'CREDITS']; // V§9.1
