I checked the world-v2-port. Its own gates are green: unit tests pass with exit 0, and contract-check passes 1264/1264. It can't be merged yet because it doesn't contain the integration tip: the trial merge conflicts, and the port has dropped `commitFault`. I'm sending a merge worker and a Qollab-input worker on separate files.

=== PLAN ===
**Lane gameplay: plan as of consult 11 (2026-10-10 00:52 ET).** G2 is due Sat 17:00 ET, about 16 h away. If we miss it, we cut to the one-room version (§13).

**Goal (plan row 5):** the playable graybox:
- third-person follow camera; WASD, mouse, Shift, E and Esc;
- collision and bounds;
- Alley + booth, Relay and Rooftop;
- interaction detection;
- the §9 quest machine (idempotent, no skips, `resetGame()`) and the §9.3 world reactions;
- primitive geometry only;
- runs inside Qollab's sandboxed iframe.

**Judged this consult: `gameplay-world-v2-port`, tip 6660774** (final report 0006; it has main's contracts land 2 and `validateCommitResult`).

What I re-ran myself in `/tmp/sv11` at 6660774:
- unit tests: exit 0;
- contract-check: GREEN, 1264/1264;
- qollab-caps: exit 1, only `entry-index`/`entry-main`. Those are platform's files, absent from this branch, so this is expected.
- `git grep quest:enter|quest:transition|BOOTED` on `echo/` and `dev/` finds nothing.

What I looked at:
- **PNG 10:** a wrong dry run (Z only, for m0=1, m1=1) on a generic state gives F=0.0022. My own check: |⟨ψ|X|ψ⟩|² = (sinθ cosφ)² ≈ 0.0022, so it matches.
- **PNG 04:** booth cloning fidelity 0.5, purity 0.5.
- **PNG 13:** city lit at TELEPORT_COMMITTED.

**Why NOT merged:**
- The port does not contain integration 7c4741b (`merge-base --is-ancestor` is false).
- A trial merge conflicts in `dev/gameplay/devTerminal.js`, `dev/gameplay/playthrough.mjs` and two vault hubs.
- The port's `state.js` still has `measured_refused_awaiting_ruling` and no `commitFault`/`restartOffered`. If I merged as-is, the commit-fault-exit fix (consult 7) would be lost.

**Running:**
- `gameplay-fps-probe`: evidence only. Checkpoint: this display is vsync-locked at 30 Hz; uncapped it runs 175–360 FPS. Final report pending.
- `gameplay-port-merge` (new): brings integration into the port tip and restores `commitFault` + RESTART on v2's `validateCommitResult`.
- `gameplay-qollab-input` (new): base 6660774. It touches only `echo/game/{input,camera,controller,app}.js` plus a new iframe harness, so its files are disjoint from port-merge's.

**Next, in order:**
1. Judge port-merge → MERGE into integration.
2. Judge qollab-input → it rebases or merges onto the new integration tip → MERGE.
3. **`gameplay-real-result-rules`** (`missionRules.js` plus tests), sequenced after port-merge because both touch missionRules/state:
   - cloning judged on observables;
   - commit through `validateCommitResult`;
   - `seam.mjs`: 44/44 must-advance, 0 FAIL, CREDITS with no shim;
   - fidelity sabotage goes red;
   - closes the `token_guard_removed` null.
4. **Integration playthrough:** 3 consecutive title→credits runs in the sandboxed iframe, plus a headed FPS reading using the probe's harness.
5. MOMENT events + countdown, once platform has them in contracts.js.
6. After G2: adopt art's atmosphere kit; `react()` stops writing materials.

**Cross-lane needs (for the overseer):**
- Platform:
  - `main.js` sends `BOOT_COMPLETE` via 'boot';
  - `onRestart` → `game.reset()`;
  - awaits the `startGame` promise;
  - S1 cloning observable;
  - S11 fixture.
- Quantum: S6/S7 v2 dry-run shapes in `bridge.js` (`teleportBits`/`teleportCorrection`/`commitStoryToken`), S9, S10.
- Story-ui:
  - `send(event, via)` per EVENT_SOURCES;
  - render `commitFault` + RESTART;
  - the two-phase dry-run UI;
  - focus-overlay copy.
- Red-team: re-run quest-state-audit after the port-merge lands.

**Risks:**
- The headless FPS readings of 23 come from SwiftShader/ANGLE, not a measurement.
- Merge drift if qollab-input edits `app.js` while port-merge also changes it. Port-merge is told not to touch `app.js`.
- The real engine depends on quantum's S6.

**Slots:** 3 of 3 in use.
=== END PLAN ===

=== AGENT name=gameplay-port-merge model=opus base=lane/gameplay/gameplay-world-v2-port ===
**GOAL.** One gameplay branch that has both the 3D world on contracts v2 (the world-v2-port, tip 6660774) and everything already on `lane/gameplay/integration` (tip 7c4741b). The supervisor can then merge it without losing anything. The player-visible outcome to keep: when a story commit comes back measured but refused, the player sees an honest scientific-module error, COMMIT stays disabled forever, and RESTART (`resetGame()`) is offered. After RESTART, the next session commits and reaches ENDING. This must now hold in the 3D world flow too, not only the flat harness.

**VISION.** ECHO §7.4 (the story token is consumed once; never re-measure it), §9.5 (resetGame), §12.3 (honest errors). The player must never be soft-locked and the physics must never lie.

**WHAT WE ARE BUILDING.** The Qollab-native graybox under `echo/game` and `echo/scene`, plus the dev harness under `dev/gameplay/`.

**WHAT HAS NOT WORKED.**
- The port was written before commit-fault-exit landed (323bb8d, merged at cbd8098). It still has `MEASURED_REFUSED: 'measured_refused_awaiting_ruling'` in `echo/game/state.js:53` and no `commitFault`/`restartOffered`.
- A trial `git merge lane/gameplay/integration` into the port conflicts in `dev/gameplay/devTerminal.js`, `dev/gameplay/playthrough.mjs`, `vault/Map.md` and `vault/Reports/README.md`. `state.js` auto-merges, but do not trust an auto-merge: check the semantics.
- Running workers briefed before a contract change rarely reconcile on their own (lane memory, consult 6).

**Read first (vault):**
- `vault/AGENTS.md`, `vault/Index.md`;
- `lanes/gameplay/reports/0004-gameplay-commit-fault-exit.md` and `0006-gameplay-world-v2-port.md`;
- `vault/Reports/gameplay-real-engine-seam.md`;
- `echo/CONTRACTS.md` § commit / `validateCommitResult`;
- `lanes/gameplay/rulings.md` (consult-3 commit ruling: an errored call may be retried; latched once recorded).

**Where to start.** On your branch (based at 6660774):
1. `git merge lane/gameplay/integration`.
2. Resolve the conflicts so that:
   - (a) the commit is judged by contracts' `validateCommitResult` + `STORY_TOKEN_ID`, as on the port;
   - (b) a refusal of a measured result sets the latch to `measured_refused`, exposes `machine.commitFault = {tokenConsumed:true, verified:false, reason, result, restartOffered:true}`, never re-arms COMMIT, and the dev terminal shows the fault panel with RESTART;
   - (c) the port's two-phase dev terminal and real-Qiskit dev engine survive;
   - (d) `git grep -nE "awaiting_ruling|quest:enter|quest:transition|BOOTED" -- echo dev` returns nothing.
3. For vault hub conflicts, regenerate with `node scripts/vault-hubs.mjs`; don't hand-merge.

**Do NOT edit** `echo/game/{input,camera,controller,app}.js`; a parallel worker owns them right now. If you must touch one, stop and say so in your report.

**Deliver (write each check red first, where it is new):**
- unit suite green;
- `tools/contract-check/check.mjs` green;
- `qollab-caps`: report it; only entry-index/entry-main may be red;
- `node evidence/gameplay/real-engine-seam/seam.mjs` run and its numbers reported. Gameplay-rules rows may still fail; that is the next task. Report them, don't fix missionRules beyond the merge.
- `dev/gameplay/world-playthrough.mjs --falsify --publish` on your OWN port: two full runs with real input.
- The flat `playthrough.mjs` including the commit-fault session reaching ENDING after RESTART.
- A PNG of the fault panel with RESTART, in the 3D world flow if the world terminal can force a refused commit, or else the harness, and say which.
- Sabotage on disposable copies, each after an unbroken control:
  - restartOffered false;
  - COMMIT re-armed after measured_refused;
  - validateCommitResult bypassed.

  Each must go red. Report the nulls.
- Build token bumped and read back from the served page.

**How I will judge it:**
- `git merge-base --is-ancestor 7c4741b <tip>` is true.
- My own re-run of the suite and both playthroughs in a `/tmp` worktree.
- The PNGs.
- The grep returns nothing.
- `git diff --stat lane/gameplay/integration...<tip>` contains only gameplay/dev/evidence/vault files plus main's commits.

**Report** `lanes/gameplay/reports/NNNN-gameplay-port-merge.md`. Open it with a Vault check; checkpoint within 1 h. Include commands with exit codes, artifact paths, nulls and requests for other lanes.
=== END AGENT ===

=== AGENT name=gameplay-qollab-input model=opus base=6660774 ===
**GOAL.** A judge opening ECHO on Qollab can look around and move with mouse and keyboard, and the game keeps running until the credits. Today the controls assume pointer lock in a top-level page. Qollab runs the project in an iframe with `sandbox="allow-scripts"`: origin null, **no pointer lock**, never auto-focused. If `main.js` returns, Qollab stops listening to the frame.

**VISION.**
- §3.1: pointer lock only while exploring; unlock when browser focus changes.
- §6.6: keyboard alternatives.
- §17: playable without help.

Owner ruling "QOLLAB RUNTIME FACTS" (`lanes/gameplay/owner-answers.md`, newest entries) is binding:
1. Camera orbits by mouse DRAG (hold a button) and by keyboard (arrow keys; pick a set that does not collide with E = interact, and cite why). This is the primary path. `requestPointerLock()` is only an optional enhancement that fails silently.
2. A "Click to focus" overlay shows until the frame has focus and comes back whenever focus or visibility is lost. Movement keys must not stick across a blur.
3. `startGame()` returns a promise (or an object with one; coordinate the shape in your report) that resolves only at CREDITS or an explicit stop, so `main.js` can `await` it and never return early.

**WHAT WE ARE BUILDING.** `echo/game/input.js`, `camera.js`, `controller.js` and `app.js` (gameplay-owned) on the v2 world (tip 6660774, build `v2p-0006-b`), plus a new dev-only harness under `dev/gameplay/` that loads the world inside `<iframe sandbox="allow-scripts">` from a different-origin parent, the way Qollab does.

**WHAT HAS NOT WORKED.**
- The world-controller was proven with pointer lock in a top-level headless page. That proof says nothing about Qollab: a top-level page passes by construction.
- On real Qollab the overseer's automated clicks and keys registered 0 because the frame never had focus. So your harness must actually start unfocused, prove the overlay blocks until a click, and prove that a blur then a re-click restores control.
- **Do NOT edit** `echo/game/state.js`, `missionRules.js`, `dev/gameplay/devTerminal.js` or `playthrough.mjs`. A parallel worker is merging those. Keep your diff to the four files above, your new harness, evidence and the vault.

**Read first:**
- `vault/AGENTS.md`, `vault/Index.md`;
- `lanes/gameplay/reports/0001-gameplay-world-controller.md` and `0006-gameplay-world-v2-port.md`;
- platform's `*g0-input-diagnostic*` report under `lanes/platform/reports/`;
- `vault/Research/qollab-platform-and-submission.md`;
- `evidence/qollab/g0c-*` README on main.

Run `node scripts/where.mjs focusOverlay --branches` (and similar names) before writing anything. Story-ui may own overlay copy; put the text in one exported constant and list it as a request.

**Deliver:**
- The sandboxed-iframe harness and a playthrough driven by real CDP mouse and keyboard input:
  - starts unfocused, overlay visible, keys ignored;
  - click → focus → WASD moves the player;
  - drag orbits the camera;
  - keyboard orbit works;
  - E interacts at the booth;
  - window blur → overlay returns and no key sticks;
  - re-click resumes;
  - Esc pauses.
- `document.pointerLockElement` stays null throughout, and the console has no uncaught errors.
- Asserted, not eyeballed: the `startGame` promise is still pending mid-game and resolves only after reaching CREDITS.
- A short video (webm/mp4) plus PNGs under `renders/gameplay-qollab-input/`. Evidence under `evidence/gameplay/qollab-input/` with a README listing commands and exit codes.
- Sabotage on disposable copies, each after an unbroken control:
  - overlay never shown;
  - pointer lock made mandatory;
  - promise resolves immediately;
  - drag orbit removed.

  Each must go red. Report the nulls.
- Unit suite and contract-check still green.
- Build token bumped and read back from the served page.
- Serve on your OWN port.

**How I will judge it:** the video first, then my own `/tmp` re-run of your iframe playthrough, then the diff-scope check (only the four files plus harness, evidence and vault).

**Report** `lanes/gameplay/reports/NNNN-gameplay-qollab-input.md`. Open it with a Vault check; checkpoint within 1 h. Include requests to platform (the `main.js` await shape) and story-ui (overlay copy).
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 11: I did not merge `gameplay-world-v2-port` at 6660774, even though its own gates were green. My `/tmp/sv11` re-run gave unit exit 0 and contract-check 1264/1264, and its PNGs show correct physics: the wrong-correction F=0.0022 matches (sinθ cosφ)². But `merge-base --is-ancestor 7c4741b` was false. A trial merge conflicted in devTerminal.js, playthrough.mjs and the vault hubs, and the port's state.js still had `measured_refused_awaiting_ruling` with no `commitFault`. Merging as-is would have quietly undone commit-fault-exit. Rule: before every MERGE, trial-merge in a scratch worktree and grep for the previous fix's marker fields. Green gates on the branch alone don't prove integration. I dispatched `gameplay-port-merge` to reconcile them.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 11: When two workers run in parallel on the same base, each brief lists the files the other owns as "do not edit". Here, port-merge owns state/missionRules/devTerminal/playthrough and qollab-input owns input/camera/controller/app.js. A worker that needs a forbidden file must stop and report, not edit it. This is what keeps the later merges conflict-free.
=== END LEARN ===
