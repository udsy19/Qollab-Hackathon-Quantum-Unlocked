**Lane gameplay: plan as of consult 12 (2026-10-10 00:57 ET).** G2 is due Sat 17:00 ET, about 16 h away. If we miss it, we cut to the one-room version (§13).

**Goal (plan row 5):** the playable graybox:
- third-person follow camera; WASD, mouse, Shift, E and Esc;
- collision and bounds;
- Alley + booth, Relay and Rooftop;
- interaction detection;
- the §9 quest machine (idempotent, no skips, `resetGame()`) and the §9.3 world reactions;
- primitive geometry only;
- runs inside Qollab's sandboxed iframe.

**This consult:** no new worker report. All three workers were dispatched about 5 minutes ago.

`gameplay-world-v2-port` has finished. Its branch moved past the 6660774 I judged last consult to **7792382**. The extra commits (cb803ff, abd0a1a, 7792382) contain:
- evidence re-runs;
- a vault report refresh;
- one dev-tool fix in `dev/gameplay/world-playthrough.mjs`: `--publish` no longer wipes the gate logs.

They add no `echo/` product changes; I checked with `git diff --stat 6660774 7792382`.

I re-checked the new PNGs:
- **PNG 10:** a wrong dry run for m0=0, m1=1 with no correction shows F=0.37135. My own check: (sinθ cosφ)² with θ=1.9068, φ=0.8692 gives 0.3715, so it matches.
- **PNG 14:** ENDING shows "The city is lit" with Credits and Restart.

**Running (3/3 slots):**
- `gameplay-fps-probe`: evidence only. This display is vsync-locked at 30 Hz; uncapped it runs 175–360 FPS. Final report pending.
- `gameplay-port-merge`: base 6660774. Brings integration 7c4741b into the port and restores `commitFault` + RESTART on v2's `validateCommitResult`. It owns `state.js`, `missionRules.js`, `devTerminal.js` and `playthrough.mjs`.
- `gameplay-qollab-input`: base 6660774. Owns `input`, `camera`, `controller`, `app.js` and a new sandboxed-iframe harness.

**Next, in order:**
1. **Judge port-merge.** Trial-merge it into integration in a `/tmp` worktree. Grep for `commitFault`/`restartOffered` in `state.js` and for zero hits of `awaiting_ruling`. Re-run the unit tests, contract-check and the world playthrough. Then MERGE.
2. **Merge the leftover port commits (to 7792382) into integration.** They are disjoint from port-merge's files, so the merge should be trivial. If port-merge already merged that tip, skip this.
3. **Judge qollab-input.** It must merge the new integration tip. The check is the sandboxed iframe harness with focus lost and regained, drag/keyboard orbit, and the click-to-focus overlay. Then MERGE.
4. **`gameplay-real-result-rules`** (`missionRules.js` plus tests), dispatched once port-merge is merged:
   - cloning judged on observables;
   - commit through `validateCommitResult`;
   - `seam.mjs`: 44/44 must-advance, 0 FAIL, CREDITS with no shim;
   - fidelity sabotage goes red;
   - closes the `token_guard_removed` null.

   Red-team regrade items R2, R3 and R4 are folded into the same brief:
   - R2: `resetGame()` resets the latch and the token.
   - R3: every token measurement goes through the latch.
   - R4: CORRECT_CALIBRATION requires a recorded passing non-00 result.

   R1 (real output stalls at CLONE_INTRO) is covered by the cloning-on-observables item.
5. **Integration playthrough:** 3 consecutive title→credits runs in the sandboxed iframe, plus the uncapped FPS reading from the probe harness.
6. MOMENT events + countdown, once platform has them in contracts.js.
7. After G2: adopt art's atmosphere kit; `react()` stops writing materials.

**Cross-lane needs (for the overseer):** unchanged from consult 11.
- Platform:
  - `main.js` sends `BOOT_COMPLETE` via 'boot';
  - `onRestart` → `game.reset()`;
  - awaits the `startGame` promise;
  - S1 cloning observable;
  - S11 fixture.
- Quantum: S6/S7 v2 dry-run shapes in `bridge.js`, plus S9 and S10.
- Story-ui:
  - `send(event, via)`;
  - render `commitFault` + RESTART;
  - the two-phase dry-run UI;
  - focus-overlay copy.
- Red-team: re-run the quest-state audit after port-merge plus real-result-rules land.

**Risks:**
- Port-merge and qollab-input are both on 6660774, without the 7792382 publish fix. Whichever merges second must take integration first.
- Headless FPS readings are not laptop measurements.
- The real engine depends on quantum's S6.