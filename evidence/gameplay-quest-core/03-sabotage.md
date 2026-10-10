# Sabotage round — each row a disposable copy under /tmp/gq-sab; bytes-changed verified before running
| sabotage | verdict | fail count | tests that went red |
|---|---|---|---|
| S1-remove-edge | exit 1 | ℹ fail 8 | COMMIT_TRANSFER fires exactly once per session: a second commit is impossible;RESTART from DECLASSIFIED and CREDITS returns to TITLE and a full second run commits again;TRANSITIONS is exactly §9.2 + the brief additions (catches a removed edge or a skip edge);every illegal (state, event) pair is rejected and emits nothing;every legal pair in the spec is accepted from its state, and can() agrees;failing tests:;full legal walk: BOOT -> TITLE -> ... -> ENDING -> DECLASSIFIED -> CREDITS, one event each;idempotency: pressing E again at booth, relay or socket does nothing harmful;reset() from every state returns to TITLE, emits quest:reset once, and the run replays; |
| S2-skip-edge-new-event | exit 1 | ℹ fail 1 | TRANSITIONS is exactly §9.2 + the brief additions (catches a removed edge or a skip edge);failing tests:; |
| S3-skip-edge-existing-event | exit 1 | ℹ fail 2 | TRANSITIONS is exactly §9.2 + the brief additions (catches a removed edge or a skip edge);every illegal (state, event) pair is rejected and emits nothing;failing tests:; |
| S4-recommit-loop | exit 1 | ℹ fail 1 | dev/gameplay/tests/state.test.mjs;failing tests:; |
| S5-oneshot-check-disabled | exit 1 | ℹ fail 1 | commitIsOneShot(TRANSITIONS) holds, and fails on a table with a re-commit edge;failing tests:; |
| S6-can-uses-in | exit 1 | ℹ fail 1 | every illegal (state, event) pair is rejected and emits nothing;failing tests:; |
| S7-emit-before-set | exit 1 | ℹ fail 1 | a listener that sends during quest:enter sees the new state (no lost or doubled step);failing tests:; |
| S8-reset-silent | exit 1 | ℹ fail 1 | failing tests:;reset() from every state returns to TITLE, emits quest:reset once, and the run replays; |
| S9-reset-to-boot | exit 1 | ℹ fail 1 | dev/gameplay/tests/state.test.mjs;failing tests:; |
| S10-no-freeze | exit 1 | ℹ fail 1 | TRANSITIONS cannot be mutated at runtime;failing tests:; |
| S11-bus-no-catch | exit 1 | ℹ fail 1 | a throwing listener does not stop the others, and the error is reported;failing tests:; |
| S12-bus-no-snapshot | exit 0 | ℹ fail 0 |  |
| S13-rules-fidelity-only | exit 0 | ℹ fail 0 |  |
| S14-rules-token-allowed-in-calibration | exit 1 | ℹ fail 1 | dry run: advances only with corrections matching the bits AND fidelity ~1, never on the story token;failing tests:; |
| S15-rules-swap-XZ | exit 1 | ℹ fail 3 | commit: only a correct transfer of the story token advances TELEPORT_DRY_RUN_PASSED;dry run: advances only with corrections matching the bits AND fidelity ~1, never on the story token;expectedCorrections is the §7.1 rule: X iff m1=1, Z iff m0=1;failing tests:; |
| S16-rules-any-bell-signals | exit 1 | ℹ fail 1 | failing tests:;relay: any Bell result prepares the pair; only a local X/Z attempt with a 50/50 receiver counts as the failed send; |
| S17-fake-swap-bits | exit 1 | ℹ fail 3 | commit: only a correct transfer of the story token advances TELEPORT_DRY_RUN_PASSED;dry run: advances only with corrections matching the bits AND fidelity ~1, never on the story token;failing tests:;§7.4 teleportation: for six+ states and all four branches, fidelity 1 iff X==m1 and Z==m0 (generic states); |
| S18-fake-no-entangle | exit 1 | ℹ fail 1 | failing tests:;§7.2 cloning: basis states copy, |+> and phase states do not; |
| S19-fake-signals | exit 0 | ℹ fail 0 |  |
| S20-fake-backend-twice | exit 1 | ℹ fail 1 | failing tests:;verifySelectedBackendOnce: no fabricated counts, and a second call is refused (one job per run); |
| S21-fake-failure-sticky | exit 1 | ℹ fail 1 | failing tests:;injectable failure rejects the next call only, then the adapter recovers; |
| S22-doc-drop-92-line | exit 1 | ℹ fail 7 | COMMIT_TRANSFER fires exactly once per session: a second commit is impossible;RESTART from DECLASSIFIED and CREDITS returns to TITLE and a full second run commits again;TRANSITIONS is exactly §9.2 + the brief additions (catches a removed edge or a skip edge);every illegal (state, event) pair is rejected and emits nothing;every legal pair in the spec is accepted from its state, and can() agrees;failing tests:;idempotency: pressing E again at booth, relay or socket does nothing harmful;reset() from every state returns to TITLE, emits quest:reset once, and the run replays; |
| S23-doc-drop-91-state | exit 1 | ℹ fail 3 | QUEST_STATES is exactly the §9.1 list (no integer counter, no missing or extra state);every illegal (state, event) pair is rejected and emits nothing;failing tests:;full legal walk: BOOT -> TITLE -> ... -> ENDING -> DECLASSIFIED -> CREDITS, one event each; |
| S24-objective-missing | exit 1 | ℹ fail 1 | every §9.1 state has exactly one objective id (states from the doc, not the map);failing tests:; |
| S13b-rules-fidelity-only-whole-condition | exit 1 | ℹ fail 1 | dry run: advances only with corrections matching the bits AND fidelity ~1, never on the story token |
| S19b-fake-receiver-gate-no-entangle | exit 1 | ℹ fail 2 | relay rule; §7.3 no-signalling |
| S12b-bus-no-snapshot (after new check) | exit 1 | ℹ fail 1 | a listener subscribed during emit is not called until the next emit |

## Nulls and what they meant
- S12 (bus iterates the live Set): went green. JS Set iteration already tolerates delete-during-iterate, so the existing check could not see it. Real gap for subscribe-during-emit -> added a check, S12b goes red.
- S13 (drop correction check): went green because the sabotage itself was wrong — `false && A || B` only disabled the X half (precedence); X errors are still caught by fidelity. Correct sabotage S13b goes red.
- S19 (apply sender gate to the receiver half instead): green, and correctly so — a local unitary on either half of |Phi+> gives the same receiver marginal (0.5/0.5) and the same Z-basis agreement. Not a defect the physics can show. A real signalling bug (S19b: no entanglement, gate on receiver) goes red.
- S4 / S9 show as a file-level failure: the module refuses to load (S4: one-shot proof throws at import) or the walk test fails at reset (S9).
