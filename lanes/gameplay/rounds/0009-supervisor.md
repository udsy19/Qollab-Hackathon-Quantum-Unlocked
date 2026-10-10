=== PLAN ===
**Lane gameplay: plan as of consult 9 (2026-10-10 00:37 ET, 04:37 UTC).** G2 is due Sat 17:00 ET, about 16.4 h away. If we miss it, we cut to the one-room version (vision §13).

**Goal (plan row 5):** the playable graybox:
- third-person follow camera; WASD, mouse, Shift, E and Esc with pointer lock;
- collision and bounds;
- Alley + booth, Relay Chamber and Rooftop;
- interaction detection;
- the §9 quest machine (idempotent, no invalid skips, `resetGame()`) and the §9.3 world reactions;
- primitive geometry only.

The dry run now runs on the real-Qiskit dev engine, not the JS fake: v2 refuses `documented_preview` results for `bell_signalling` and the dry run.

**State this consult:**
- `gameplay-world-v2-port` is still running and making progress. It committed `8a4f7d4` at 00:36 ET, which covers:
  - the world on `QUEST_STATE_CHANGED` and WORLD_CHANGES ids;
  - OPEN/CLOSE_TERMINAL;
  - a two-phase dev terminal;
  - a playthrough with two full runs, a wrong dry run and copy-based sabotage.

  Its earlier commit `afcaf17` moved the dry run onto `dryRunVerdict` and replaced the JS fake with `dev/gameplay/dev_engine.py` (real Qiskit). There is no final report yet. Its merge base is c49a922, so it still lacks cbd8098 (commit-fault-exit) and the seam merge.
- No new report needs judging.

**Done (merged):** quest-core, quest-review, contracts-migration, commit-fault-exit, real-engine-seam.

**Running:**
- `gameplay-world-v2-port`.
- New: `gameplay-fps-probe`. It only adds evidence and touches no `echo/` file, so it cannot conflict with the port. It gives the first headed FPS reading, with CPU throttling as a mid-range stand-in, before G3 finds the ≥30 FPS bar missing.

**Next, in order:**
1. **Judge the v2 port**, in this order:
   - walk video and PNGs driven by real input;
   - my own `/tmp` re-run;
   - `tools/contract-check/check.mjs` and `tools/qollab-caps/check.mjs`;
   - `git grep quest:enter` on `echo/` and `dev/` returns 0;
   - `commitFault`/`restartOffered` survive in `state.js` after the port merges integration (cbd8098). If not, the port must merge integration before I MERGE.
2. **`gameplay-real-result-rules`**, dispatched on the merged port tip. It covers cloning judged on observables, the commit through a validator (or a local check at ≥0.999999 on `exact_qiskit_local`), and acceptance on `seam.mjs` (44/44 must-advance, 0 FAIL, CREDITS without the shim, plus a browser PNG). It also marks `quest-state-machine-contract.md` outdated. The port already did the `dryRunVerdict` part, so this brief shrinks to cloning, commit, and seam acceptance.
3. **Integration playthrough:** 3 consecutive title→credits runs with reset, through the 3D world, recorded. It uses the FPS probe's harness for a reading on the final tip.
4. **MOMENT events + countdown**, once platform has them in contracts.js.
5. **After G2:** adopt art's atmosphere kit, per the art relay. `react()` stops writing materials.

**Cross-lane needs (unchanged; for the overseer):**
- Platform: S8 commit-result contract and validator (highest), S1 cloning observable, S11 fixture `good[2]`.
- Quantum: S6 `{theta, phi}`, S7 bridge v2 signatures, S9 hidden token plus applied corrections, S10 `backend_verification`.
- Story-ui: render `commitFault` with RESTART.
- Red-team: re-run quest-state-audit after the port lands.

**Risks:**
- Port merge conflicts in `state.js`/`eventBus.js`, and the commitFault regression.
- The real swap depends on S6 and S8 from other lanes.
- FPS: headless readings were 15–24. If the headed, throttled reading is under 30, a perf task goes ahead of G3.

**Slots:** 2 of 3 in use. The third stays idle until the port merges, because everything else edits `echo/game`.
=== END PLAN ===

=== AGENT name=gameplay-fps-probe model=opus base=lane/gameplay/gameplay-world-v2-port ===
**GOAL:** We need to know, with evidence, whether ECHO's graybox world holds ≥30 FPS on a mid-range laptop (vision §17, §1.4 bar) before art and G3 add load. If it doesn't, we need to know what is costing frames. The owner judges by looking: deliver a readable FPS-over-time chart for each space, plus screenshots from the real walk path.

**VISION:** A judge plays ECHO end to end in a desktop browser on Qollab, and stutter breaks the immersion the rubric scores. The ≥30 FPS bar is part of the definition of done.

**WHAT WE ARE BUILDING:** The Qollab-native Three.js graybox in `echo/`. The entry for gameplay is `startGame` in `echo/game/app.js`. Gameplay's dev harness is `dev/gameplay/world.html` with `dev/gameplay/world-playthrough.mjs`, which drives real keyboard and mouse input in Chrome, and `dev/gameplay/dev_engine.py`, the real-Qiskit dev engine.

**WHAT HAS NOT WORKED:**
- The only FPS numbers so far are headless Chrome on ANGLE Metal: 15–24 FPS under headless pacing (world-controller report 0001; `renders/gameplay-world-controller/`) and about 110 uncapped. Headless rAF pacing is not a frame-rate measurement, so neither number answers the question.
- "Counting what a renderer emitted is not visibility": a `perf:fps` event that the game reports about itself is the producer's own account. Measure frame times independently, from CDP `Tracing`/`Performance.getMetrics` or a page-injected rAF timestamp recorder that does not use the game's counter. Cross-check against the game's own `perf:fps` and report any disagreement.

**Your branch is based on `lane/gameplay/gameplay-world-v2-port`, a running worker's branch.** You add evidence only. Do **not** edit any file under `echo/` or `dev/gameplay/` (the port is rewriting them). Put everything in `evidence/gameplay/fps-probe/` (with a README), `renders/gameplay-fps-probe/` and `vault/Reports/gameplay-fps-probe.md`. If you need a driver, write your own under `evidence/gameplay/fps-probe/`. You may import or copy techniques from `world-playthrough.mjs`, but do not modify it.

**Vault notes to read first:** `vault/AGENTS.md`, `vault/Index.md`, `vault/Research/qollab-platform-and-submission.md` (three 0.186.1, Chrome-family browsers only), `lanes/gameplay/reports/0001-gameplay-world-controller.md` (FPS section, harness usage), `lanes/gameplay/context.md`.

**Where to start:**
1. Serve the repo on your OWN port (not 8612 or 27798; pick a random high port).
2. Use **headed** Chrome via puppeteer (`headless: false`) and confirm the window is actually visible and composited. Disable background throttling.
3. Read a token out of the served `echo/game/app.js` to prove the build (law 16).
4. Measure on the walk path: alley → booth → connector → relay chamber → rooftop with the city lit (late quest state). Run three CPU profiles via CDP `Emulation.setCPUThrottlingRate`: 1× (this M4 Pro), 4× and 6×. 4–6× is the commonly used stand-in for a mid-range laptop; state that this is an approximation, not a laptop.
5. Run it at 1280×720 and 1920×1080.
6. For each space, profile and resolution, record median, p5 and p1 FPS and the longest frame.
7. Also capture `renderer.info` (draw calls, triangles, geometries, textures) per space, plus the device pixel ratio used.
8. If any space falls under 30 at 4×, find the top costs with a CDP performance profile (shadows? light count? pixel ratio? rain?) and say which `echo/` file and line they live in. Do NOT fix them; list the fixes as requests.

**What to deliver:**
- `evidence/gameplay/fps-probe/` with the driver, raw JSON and a README with the re-run command.
- A chart PNG: FPS over time per space, with the 30 FPS line, one panel per throttle level.
- One screenshot per space from the headed run.
- A table of numbers.
- The vault report, linked from the Reports hub (`node scripts/vault-hubs.mjs`).
- A commit on your branch.

**Falsification:** show your independent frame-timer goes red. Inject a busy-loop of about 40 ms per frame into a disposable copy of the served page via `evaluateOnNewDocument`, not into the repo, and show the reading drops under 30. Report that control.

**How I will judge it:**
- The chart and screenshots come from the real walk path.
- The build token matches.
- The frame timer is independent of the game's counter and shown to fail under the busy-loop control.
- Every number has the command that produced it.
- No product file is touched: I will check this with `git diff --stat lane/gameplay/gameplay-world-v2-port...` showing only evidence, renders and vault.

**Report:** `lanes/gameplay/reports/0007-gameplay-fps-probe.md`. Open with a Vault check, then TL;DR, Evidence, Nulls (what you sabotaged that did not go red), Requests (perf fixes per lane: gameplay for `echo/scene` and `echo/game`, art for lighting/rain/effects), and Questions for the owner (only spend/access). Write a checkpoint within 1 h. Budget 2 h.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 9: Using a running worker's branch as the base is fine for an evidence-only worker. That worker writes only to `evidence/`, `renders/` and `vault/Reports/`, so it can measure the newest world (here, the FPS probe on the world-v2-port tip 8a4f7d4) without conflicting with the port's rewrite. Check this with `git diff --stat` before merging. The rule is "disjoint files", not "wait for the merge". The port has also already moved the dry run onto `dryRunVerdict` (afcaf17), so the real-result-rules brief shrinks to cloning on observables, the commit validator, and seam acceptance.
=== END LEARN ===
