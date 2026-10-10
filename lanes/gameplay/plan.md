**Lane gameplay: plan as of consult 8 (2026-10-10 ~00:16 ET, 04:16 UTC).** G2 is due Sat 2026-10-10 17:00 ET, about 16.7 h away. If we miss it, we cut to the one-room version (vision §13).

**Goal (plan row 5):** the playable graybox:
- third-person follow camera; WASD, mouse, Shift, E and Esc with pointer lock;
- collision and bounds;
- Alley + booth, Relay Chamber and Rooftop;
- interaction detection;
- the §9 quest machine (idempotent, no invalid skips, `resetGame()`) and the §9.3 world reactions;
- a fake adapter in the `ExperimentResult` shape; primitive geometry only.

**Judged this consult: `gameplay-real-engine-seam` @ 762c615.**
- The branch holds evidence and `vault/Reports/gameplay-real-engine-seam.md` only. No `echo/` file is touched.
- I looked at the matrix PNG. It agrees with the report's table: as built and on v2, real results stall at CLONE_INTRO. With a names-only shim they reach CREDITS, but they make 9 wrong advances on named non-generic states and leave 3 Mission 1 rows stuck.
- It is based on c49a922, so it lacks cbd8098. That is harmless because the two branches touch disjoint files. I am merging it as the lane's measured specification for the real-adapter swap.

**Done (merged):** quest-core, quest-review, contracts-migration, commit-fault-exit, real-engine-seam.

**Running:** `gameplay-world-v2-port`. It ports world-controller onto contracts v2 plus integration and becomes the next integration tip. Its checkpoint plan already includes:
- a dev-only Python engine server built on platform's `teleport_oracle.py`;
- `send(event, via)` enforcing EVENT_SOURCES;
- world reactions keyed by WORLD_CHANGES ids.

**Next, in order:**
1. **Judge the v2 port**, in this order:
   - walk video and PNGs driven by real input;
   - my own `/tmp` re-run;
   - `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs`;
   - `git grep quest:enter` on `echo/` and `dev/` returns 0;
   - `commitFault`/`restartOffered` are still in `state.js` (integration moved to cbd8098 under it);
   - then MERGE.
2. **`gameplay-real-result-rules`** (dispatch on the port's merged tip; it cannot run in parallel because it edits `missionRules.js`, which the port also changes). It implements seam Requests/gameplay 1–4:
   - **Teleport dry run:** the rule holds the phase-1 request and result, builds phase 2 with `makeCorrectionRequest`, and fires CORRECT_CALIBRATION iff `dryRunVerdict(...).unlocksCommit`. Delete the local duplicate expected-corrections logic.
   - **Cloning:** judged on result observables, not on state names.
   - **Commit:** read through platform's commit validator once one exists. Until then, keep the local check at fidelity ≥0.999999 and on `exact_qiskit_local`.
   - **Acceptance:** `seam.mjs` shows all must-advance rows matching (44/44) and 0 FAIL. The playthrough reaches CREDITS on real results without the names-only shim, with a browser playthrough PNG as proof.
   - **Housekeeping:** mark `vault/Reports/quest-state-machine-contract.md` `status: outdated`, because its table moved to contracts.js.
3. **Integration playthrough:** 3 consecutive title→credits runs with reset, through the 3D world, on the worker's own port, recorded. It also takes a headed FPS reading.
4. **MOMENT events + countdown**, once platform adds them to contracts.js.

**Cross-lane needs (for the overseer; recorded in this plan and the seam report):**
- **Platform:**
  - S8, highest priority: there is no commit-result contract or validator, so every real commit strands the token and blocks the ending.
  - S1: name the cloning observable that decides Mission 1.
  - S11: fixture `good[2]` still uses v1 names on a non-generic state.
- **Quantum:**
  - S6: `bell_measurement`/`teleport_branch` must accept and echo `{theta, phi}`.
  - S7: `bridge.js` must use v2 request signatures.
  - S9: a fixed, hidden story token, and `live_commit` must emit the corrections it applied.
  - S10: rename `bell_verification` to `backend_verification`.
- **Story-ui:** the real teleport terminal must render `machine.commitFault` (error + RESTART → `resetGame()`). Reference: `dev/gameplay/devTerminal.js` `faultPanel()`.
- **Red-team:** re-run the quest-state-audit harness on integration after the port lands. Seam evidence already shows Q1 (second commit refused 8/8 under the shim) and Q2 (bits 00 never unlock, 11/11) behaving correctly. Q3, Q4 and Q5 are believed closed by contracts-migration but are unconfirmed.

**Risks:**
- The port's merge conflicts in `state.js`/`eventBus.js`.
- The real-adapter swap depends on two other lanes (S6, S8). Until they land, gameplay can only reach CREDITS through the oracle-backed dev engine.
- No headed FPS reading exists yet.
- Nothing lands on main until red-team's `cross_lane_check` passes.

**Slots:** 1 of 3 in use. I am deliberately not filling the other two. Every remaining gameplay task edits `echo/game` files that the port is rewriting, so dispatching now would only buy merge conflicts. The real-result-rules worker goes out the moment the port merges.