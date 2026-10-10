# 0005 cross-lane-recheck — CHECKPOINT (PARTIAL)

## TL;DR (PARTIAL, checkpoint 1)
- Pins: main 6cc19a6 (tip moved to 99dfc54, org-only change) · quantum d9b42d0 · gameplay c49a922 · platform 43be7d9.
- C0 baseline: 523 passed, oracle sabotage exit 0 (`out/c0_baseline.txt`).
- Oracle driver vs quantum d9b42d0: **86 passed, exit 0** after porting the driver to the contracts-v2 shape (`out/driver_d9b42d0.txt`, `out/driver_merged.txt`).
- cross_lane_check on REAL d9b42d0 output vs contracts v2 + gameplay missionRules: **5 of 13 fail, exit 1** (was 12/13). Contract: 6/7 results valid; backend job still `bell_verification`. Gameplay: stuck at CLONE_INTRO (reads `fidelity`), TELEPORT_DRY_RUN (reads `correctionX/Z`), commit (needs `stateId == story_token`).
- Gameplay sabotage at c49a922: FIDELITY_OK→0.9 and fidelity check removed are still **NULL** (55/55 green).
- Quantum's OWN suite on the merged tree: 1 failed (contract conformance: `bell_verification` rejected by v2).
- Still to do: quest walk, bridge runtime probe, backend_run_audit, C4, platform tools + sabotage, closure table.
