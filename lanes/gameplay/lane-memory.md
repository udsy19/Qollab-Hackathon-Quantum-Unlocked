
- 2026-10-10 consult 1: Consult 1: `echo/` didn't exist and no sibling lane had commits. So gameplay builds against frozen contracts:
- `startGame({root, quantum, ui})` from `echo/game/app.js`, which platform's `main.js` calls.
- The eventBus/questMachine API, stated in both briefs.
- Dev-only harness, fake adapter and dev terminal under `dev/gameplay/`, outside `echo/`, so nothing dev-only ships or counts toward the 100-file limit.

Interactable anchor positions live in `scene/district.js` because they are tied to the geometry. `data/` refers to them by id.

- 2026-10-10 consult 1: The worker model key is assumed to be "opus" (the context did not name the keys). If a dispatch fails on the model key, check the loop's accepted keys before re-dispatching.

- 2026-10-10 consult 2: 2026-10-10 consult 2: I merged gameplay-quest-core after re-running its suite myself in a scratch worktree off the branch tip 934b8c2 (36 pass, exit 0) and looking at all its screenshots. The physics check on the wrong-correction screenshot was right. With m0=1, m1=0 the receiver holds Z|+⟩. Applying X gives fidelity 0, and the rule gave no progress. Judging habit: use a `/tmp` worktree for re-runs, then remove it.

- 2026-10-10 consult 2: 2026-10-10 consult 2: The quest table (QUEST_STATES/TRANSITIONS) now lives in `echo/game/state.js`. The owner has ruled that shared contracts live in platform's `echo/contracts.js`. Once platform lands it, `state.js` must import from contracts.js and delete its own copy in the same change (no-bloat). Our table is the proposal we hand to platform; it is not a second source of truth.

- 2026-10-10 consult 3: 2026-10-10 consult 3: The quest-core review found that platform's `echo/contracts.js` (lane/platform/integration @ 6378677) and gameplay's `state.js` defined two diverging quest tables:
- BOOT_COMPLETE vs BOOTED
- `QUEST_STATE_CHANGED` vs `quest:enter:*`
- `resetGame()` vs a RESTART edge

Lesson: once the owner has ruled that a contract is shared and platform-owned, do not let gameplay build further on its own copy. Migrate at the first chance by merging lane/platform/integration and deleting the copy. Every gameplay worker codes against contracts.js names. Evidence: `evidence/gameplay-quest-review/out-a1_table.txt`, `vault/Reports/quest-core-adversarial-review.md`.

- 2026-10-10 consult 3: 2026-10-10 consult 3: The dev fake's calibration states included Pauli eigenstates (|0>, |+>, …). On those, 20 of 80 wrong corrections still show fidelity 1, which contradicts the vision's promise that wrong corrections visibly fail. The owner then ruled that dry runs use fresh random generic Bloch states. Never use named basis states for any check whose job is to expose a wrong correction. Evidence: `evidence/gameplay-quest-review/out-a2_physics.txt`.

- 2026-10-10 consult 3: 2026-10-10 consult 3: World-controller was briefed before the contracts migration, so it subscribes to `quest:enter:*`. Merge rule: it must rebase onto the post-migration integration branch and use `QUEST_STATE_CHANGED`/`WORLD_CHANGES` from contracts.js before I merge it. Grep for `quest:enter` must return zero.

- 2026-10-10 consult 4: 2026-10-10 consult 4: I merged gameplay-contracts-migration even though its worker died before writing a final report (only a checkpoint and a safety-net commit). Judging is on artifacts, not the report: I re-ran 55/55 at 78a9c9a in `/tmp/sv4`, read the review-port outputs (they flipped), checked that sabotage S8–S12 went red, and looked at 13 PNGs. A worker with no final report can still be merged when its artifacts carry the proof.

- 2026-10-10 consult 4: 2026-10-10 consult 4, decided from the docs. §7.4 l.507 says the final commit applies X/Z from the LIVE bits through the calibrated rule, so the player picks no corrections at commit. A measured-but-refused commit is therefore an engine fault. The token is consumed and COMMIT stays latched forever. The player sees an honest error (§12.3) and RESTART (`resetGame()`, §9.5) as the way forward. A latch with no exit is a soft-lock. Evidence: `evidence/gameplay-contracts-migration/playthrough/11-commit-measured-but-refused-latched.png`.

- 2026-10-10 consult 4: 2026-10-10 consult 4: The world-controller PNGs show headless FPS of 15–24 on ANGLE Metal. That is not a laptop measurement, but it is under the ≥30 FPS bar (§17). The integration playthrough worker must take a headed FPS reading before G3, so the bar is not discovered missing at freeze.

- 2026-10-10 consult 6: 2026-10-10 consult 6: World-controller finished at 1a89bfb without rebasing onto integration. It still carries `quest:enter` in eventBus.js and state.js, and `merge-base --is-ancestor` shows it lacks integration. I refused the merge per the consult-3 rule and dispatched `gameplay-world-v2-port`, based on its tip, to merge integration + main (v2) and port the world onto contracts. Lesson: a running worker briefed before a contract change rarely rebases on its own. When the contract moves, plan the port as its own task instead of hoping.

- 2026-10-10 consult 6: 2026-10-10 consult 6: Contracts v2 landed on main (2133d8a/80d685f), but `lane/gameplay/integration` did not yet contain main (checked with `git merge-base --is-ancestor main lane/gameplay/integration`, which was false). v2 has RESTART and EVENT_SOURCES and the two-phase dry run, but does NOT yet have story-ui's 4 MOMENT events or a countdown (grep of main:echo/contracts.js). The moment-event work stays blocked on platform. Bring main in through the port worker's branch rather than a separate merge, to avoid two conflicting resolutions of state.js.

- 2026-10-10 consult 7: 2026-10-10 consult 7: I merged gameplay-commit-fault-exit at 323bb8d.
- My re-run in `/tmp/sv7` gave 56/56, exit 0.
- PNG 1 shows the measured_refused latch with an honest error and RESTART; PNG 2 shows the next session reaching ENDING.
- The sabotage reds covered RESTART removal and COMMIT re-arming (machine and terminal).

Known null: unit tests cannot see a dev-terminal DOM sabotage (1b, 2b); only the browser playthrough guards those. Any future UI that renders commitFault (story-ui's real terminal) needs its own browser check, not just unit tests.

Integration moved under the running world-v2-port, so its merge must keep `commitFault`/`restartOffered` in `state.js`. Check this with grep before merging the port.

- 2026-10-10 consult 8: 2026-10-10 consult 8: I merged gameplay-real-engine-seam at 762c615, which is evidence plus a vault report with no product code. Its main finding: gameplay's green unit suite was green on the fake alone. On real engine output the quest stalls at CLONE_INTRO (as built and on v2), and every commit strands the token. The as-built "must refuse" rows scored 191/191 only because gameplay refused everything for its field names, so they were correct by accident. Lesson: a refusal-heavy rule set looks perfect on must-refuse rows. Always grade must-advance rows on real results as well. Evidence: `evidence/gameplay/real-engine-seam/out/table.md` and `renders/gameplay-real-engine-seam/seam-matrix.png`.

- 2026-10-10 consult 8: 2026-10-10 consult 8: The acceptance check for any gameplay change to `missionRules.js` is `node evidence/gameplay/real-engine-seam/seam.mjs`: 44/44 must-advance rows match, 0 FAIL, and real results reach CREDITS without the names-only shim. A names-only rename is NOT enough. The shim wrongly advances CORRECT_CALIBRATION on 9/9 named non-generic states, and 3/5 non-basis cloning rows stay stuck. The fix has to go through v2's `dryRunVerdict` and judge cloning on observables.

- 2026-10-10 consult 8: 2026-10-10 consult 8: I left two slots idle on purpose while world-v2-port rewrites `echo/game`. Every queued gameplay task (real-result rules, integration playthrough, moments) touches the same files. Under the raised cap the rule is still: parallelise only work with disjoint files, and sequence work that edits the same file behind the branch that is rewriting it.

- 2026-10-10 consult 9: 2026-10-10 consult 9: Using a running worker's branch as the base is fine for an evidence-only worker. That worker writes only to `evidence/`, `renders/` and `vault/Reports/`, so it can measure the newest world (here, the FPS probe on the world-v2-port tip 8a4f7d4) without conflicting with the port's rewrite. Check this with `git diff --stat` before merging. The rule is "disjoint files", not "wait for the merge". The port has also already moved the dry run onto `dryRunVerdict` (afcaf17), so the real-result-rules brief shrinks to cloning on observables, the commit validator, and seam acceptance.

- 2026-10-10 consult 10: 2026-10-10 consult 10: The QOLLAB RUNTIME FACTS ruling changes the input design the world-controller built:
- the Qollab iframe is `sandbox="allow-scripts"`, so there is no pointer lock and no auto-focus;
- `main.js` must never return before the game ends.

World-controller (0001) was built and verified with pointer lock in a top-level headless page. That proof does not carry over to Qollab. Any gameplay input or camera check from now on must run inside a `sandbox="allow-scripts"` iframe harness, with focus lost and regained. A top-level page passes by construction. This is queued as `gameplay-qollab-input` behind the port, because the camera and controller files are being rewritten there.

- 2026-10-10 consult 11: 2026-10-10 consult 11: I did not merge `gameplay-world-v2-port` at 6660774, even though its own gates were green. My `/tmp/sv11` re-run gave unit exit 0 and contract-check 1264/1264, and its PNGs show correct physics: the wrong-correction F=0.0022 matches (sinθ cosφ)². But `merge-base --is-ancestor 7c4741b` was false. A trial merge conflicted in devTerminal.js, playthrough.mjs and the vault hubs, and the port's state.js still had `measured_refused_awaiting_ruling` with no `commitFault`. Merging as-is would have quietly undone commit-fault-exit. Rule: before every MERGE, trial-merge in a scratch worktree and grep for the previous fix's marker fields. Green gates on the branch alone don't prove integration. I dispatched `gameplay-port-merge` to reconcile them.

- 2026-10-10 consult 11: 2026-10-10 consult 11: When two workers run in parallel on the same base, each brief lists the files the other owns as "do not edit". Here, port-merge owns state/missionRules/devTerminal/playthrough and qollab-input owns input/camera/controller/app.js. A worker that needs a forbidden file must stop and report, not edit it. This is what keeps the later merges conflict-free.

- 2026-10-10 consult 12: 2026-10-10 consult 12: A finished worker's branch can keep moving after the tip I judged. world-v2-port went 6660774 → 7792382 (evidence re-runs, a vault refresh and a `world-playthrough.mjs` `--publish` fix) after I had already based two workers on 6660774. Rule: when I judge a branch, record the exact SHA. Before basing new workers on a finished branch, re-read its tip with `git log -1`. Any commits added later are merged separately, after checking with `git diff --stat <judged> <tip>` that they don't touch product files.
