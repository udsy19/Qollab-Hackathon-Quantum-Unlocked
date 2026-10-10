=== PLAN ===
**Lane gameplay: plan as of consult 7 (2026-10-10 ~00:10 ET, 04:10 UTC).** G2 is due Sat 2026-10-10 17:00 ET. If we miss it, we cut to the one-room version (vision §13).

**Goal (plan row 5):** the playable graybox:
- Third-person follow camera, WASD + mouse + Shift + E + Esc, pointer lock.
- Collision and bounds.
- Alley + booth, Relay Chamber, Rooftop.
- Interaction detection.
- The §9 quest machine (idempotent, no invalid skips, `resetGame()`) and the §9.3 world reactions.
- A fake adapter matching `ExperimentResult`. Primitive geometry only.

**Judged this consult:** `gameplay-commit-fault-exit` @ 323bb8d.
- It contains integration (`merge-base --is-ancestor` is true).
- The product diff is small: `state.js` +16/−5, plus devTerminal, playthrough and tests.
- My re-run in `/tmp/sv7` at 323bb8d gave **56/56 pass, exit 0**. The worktree has been removed.
- I looked at both PNGs:
  - PNG 1: `measured_refused`, COMMIT greyed out, an honest SCIENTIFIC MODULE ERROR, and RESTART offered. The physics is right: m0=1, m1=1 with only Z applied gives fidelity 0.116, which is refused.
  - PNG 2: session 3 runs title→ENDING with X+Z, fidelity 1, latch `committed`.
- The sabotage table shows reds for the RESTART offer and for COMMIT re-arming. I am merging it.

**Done (merged):** quest-core, quest-review, contracts-migration, commit-fault-exit.

**Running:**
1. `gameplay-world-v2-port`. It ports world-controller onto contracts v2 plus integration, and it becomes the next integration tip. Integration moved under it with this merge. The overlap is small (`state.js` commit latch, about 16 lines), so when it lands the port must merge the current integration tip and keep `commitFault`/`restartOffered`.
2. `gameplay-real-engine-seam`. It is read-mostly and produces a delta list between the real engine output and missionRules.

**Next:**
1. Judge the v2 port in this order:
   - the walk video and PNGs through real input;
   - my own `/tmp` re-run;
   - `tools/contract-check` + `tools/qollab-caps`;
   - `grep quest:enter` = 0;
   - `commitFault` still present.

   Then MERGE.
2. Integration playthrough: 3 consecutive title→credits runs with reset, through the 3D world, on the worker's own port, recorded, plus a headed FPS reading.
3. Real adapter swap, from the seam report, once red-team's cross_lane_check passes.
4. MOMENT events + countdown, once platform adds them to contracts.js.
5. Relay to story-ui: the real teleport terminal renders `machine.commitFault` (error + RESTART → `resetGame()`). Reference stub: `dev/gameplay/devTerminal.js` `faultPanel()`.

**Risks:**
- The port's merge conflict in `state.js`/`eventBus.js`.
- No headed FPS reading yet; headless gives 12–46.
- Nothing lands on main until cross_lane_check passes.
- About 13 h to G2.

I am keeping the third slot open on purpose: every remaining task depends on the port's tip, and a parallel edit to `echo/game` now would only add conflicts.
=== END PLAN ===

=== MERGE branch=lane/gameplay/gameplay-commit-fault-exit ===

=== LEARN ===
2026-10-10 consult 7: I merged gameplay-commit-fault-exit at 323bb8d.
- My re-run in `/tmp/sv7` gave 56/56, exit 0.
- PNG 1 shows the measured_refused latch with an honest error and RESTART; PNG 2 shows the next session reaching ENDING.
- The sabotage reds covered RESTART removal and COMMIT re-arming (machine and terminal).

Known null: unit tests cannot see a dev-terminal DOM sabotage (1b, 2b); only the browser playthrough guards those. Any future UI that renders commitFault (story-ui's real terminal) needs its own browser check, not just unit tests.

Integration moved under the running world-v2-port, so its merge must keep `commitFault`/`restartOffered` in `state.js`. Check this with grep before merging the port.
=== END LEARN ===
