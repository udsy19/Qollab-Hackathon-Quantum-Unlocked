=== PLAN ===
**Lane gameplay: plan as of consult 10 (2026-10-10 00:41 ET, 04:41 UTC).** G2 is due Sat 17:00 ET, about 16.3 h away. If we miss it, we cut to the one-room version (vision §13).

**Goal (plan row 5):** the playable graybox:
- third-person follow camera; WASD, mouse, Shift, E and Esc;
- collision and bounds;
- Alley + booth, Relay Chamber and Rooftop;
- interaction detection;
- the §9 quest machine (idempotent, no invalid skips, `resetGame()`) and the §9.3 world reactions;
- primitive geometry only.

The dry run runs on the real-Qiskit dev engine, not a JS fake.

**State this consult:** nothing new to judge.
- `gameplay-world-v2-port` is still at `8a4f7d4` (checked with `git log`). It has a checkpoint but no final report.
- `gameplay-fps-probe` has no commits of its own yet. Its branch tip is still the port tip it was based on.
- Neither is overdue.

**Done (merged):** quest-core, quest-review, contracts-migration, commit-fault-exit, real-engine-seam.

**Running:** `gameplay-world-v2-port` and `gameplay-fps-probe`. The FPS probe only writes evidence and touches no `echo/` file.

**Next, in order:**
1. **Judge the v2 port**, in this order:
   - walk video and PNGs driven by real input;
   - my own `/tmp` re-run of the unit suite and the playthrough;
   - `tools/contract-check/check.mjs` and `tools/qollab-caps/check.mjs`;
   - `git grep quest:enter` on `echo/` and `dev/` returns 0;
   - the port must contain integration tip 7c4741b (`merge-base --is-ancestor`), and `commitFault`/`restartOffered` must survive in `state.js`. If either fails, a port-merge task comes before MERGE.
2. Two tasks go out together right after the port merges. Their files must be checked as disjoint before both are dispatched; otherwise they run one after the other.
   - **`gameplay-real-result-rules`** (`echo/game/missionRules.js` plus tests):
     - cloning judged on observables;
     - the commit read through platform's validator, or a local check at ≥0.999999 on `exact_qiskit_local`;
     - acceptance on `seam.mjs`: 44/44 must-advance, 0 FAIL, CREDITS without the shim, plus a browser PNG;
     - fidelity sabotage goes red;
     - closes the `token_guard_removed` null;
     - marks `quest-state-machine-contract.md` outdated.
   - **`gameplay-qollab-input`** (`echo/game` controller and camera, `app.js` focus overlay hook), per the QOLLAB RUNTIME FACTS ruling:
     - camera orbits by mouse drag plus a keyboard orbit as the primary path;
     - `requestPointerLock()` only as an optional enhancement that fails silently;
     - a "Click to focus" overlay that comes back whenever focus is lost;
     - `startGame` returns a promise that resolves only at CREDITS or stop, so `main.js` can await it.
     - Proven in a `sandbox="allow-scripts"` iframe harness that mimics Qollab, with a video.
3. **Integration playthrough:** 3 consecutive title→credits runs with reset, through the 3D world, recorded in the sandboxed iframe. Plus an FPS reading on the final tip using the FPS probe's harness.
4. **MOMENT events + countdown**, once platform has them in `contracts.js`.
5. **After G2:** adopt art's atmosphere kit, per the art relay. `react()` stops writing materials.

**Cross-lane needs (unchanged; for the overseer):**
- Platform: S8 commit-result contract and validator (highest), S1 cloning observable, S11 fixture `good[2]`, the `startGame` promise contract for `main.js`.
- Quantum: S6 `{theta, phi}`, S7 bridge v2 signatures, S9 hidden token plus applied corrections, S10 `backend_verification`.
- Story-ui: render `commitFault` with RESTART; the focus overlay copy if it belongs to them.
- Red-team: re-run quest-state-audit after the port lands.

**Risks:**
- Port merge conflicts with integration (commit-fault-exit) in `state.js`/`eventBus.js`.
- Pointer-lock assumptions in the world-controller code fail silently on Qollab. The input task fixes this.
- The real engine swap depends on S6 and S8 from other lanes.
- FPS: headless readings were 15–24. If the headed, throttled reading is under 30, a perf task goes ahead of G3.

**Slots:** 2 of 3 in use. The third stays idle until the port merges, because every queued task edits `echo/game` files the port is rewriting.
=== END PLAN ===

=== LEARN ===
2026-10-10 consult 10: The QOLLAB RUNTIME FACTS ruling changes the input design the world-controller built:
- the Qollab iframe is `sandbox="allow-scripts"`, so there is no pointer lock and no auto-focus;
- `main.js` must never return before the game ends.

World-controller (0001) was built and verified with pointer lock in a top-level headless page. That proof does not carry over to Qollab. Any gameplay input or camera check from now on must run inside a `sandbox="allow-scripts"` iframe harness, with focus lost and regained. A top-level page passes by construction. This is queued as `gameplay-qollab-input` behind the port, because the camera and controller files are being rewritten there.
=== END LEARN ===
