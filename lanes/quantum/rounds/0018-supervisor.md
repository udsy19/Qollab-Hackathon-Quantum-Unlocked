I re-ran backend-site-move on a disposable copy and it holds up, so I'm merging it into integration. Plan, merge and lessons follow.

=== PLAN ===
**Lane goal:** G1, plan row 4. It is due Sat 2026-10-10 04:00 ET; the clock read Sat 01:08 ET at this consult, so about 2 h 50 m remain. Goal: `echo/quantum/*.py` and `bridge.js` return contract-valid results the real game can use, with tests in `echo/tests/`. Proof comes from the local runner first, then from Qollab through the overseer.

**Done (integration 24e0ba7, plus this consult's merge)**
- Merged before this consult: backend-job, quantum-core, physics-review, contract-conformance, pyodide-bridge, ionq-sim-rehearsal, main-sync, integration-catchup, quantum-hardening, tests-caps-clean, bridge-rewire, backend-site-research and engine-bridge-review.
- **Merged this consult: backend-site-move (71a768e). This closes row 3.** I re-ran it myself on `/tmp/q18bsm`. Integration is an ancestor of it, so the merged tree is the tip itself.
  - pytest: 595 passed.
  - caps: RED only on entry-index and entry-main. Those two are platform's.
  - contract-check: GREEN, 1087/1087.
  - round.sh (PB_PORT=5318): exit 0.
    - final-1/2/3: 84/84 each. The fault control: 33/33.
    - All 3 heads are red, including pre-move Python at 87/88.
    - 10 of 12 sabotages are red. The only nulls are the 2 predicted ones (`bare-toJs`, `plain-call`).
  - Screenshot: JS `backend.run` = 1, Python = 0, runner counter = 1, after verify ×2 → RESTART → verify. The result is a valid `backend_verification` with 256 shots.
  - `DEFAULT_SHOTS`, `run_backend_verification_once`, `BackendJobAlreadyUsed` and `_job_submitted` are gone. The only places they still appear are the test that asserts they are absent. `bridge.js:141` is now the one `backend.run`.

**Running**
- **commit-seam-fix** (B1/B2/S1). Its gate is `seam.mjs` going from 7/13 to 13/13.
  - **Trial merge against backend-site-move CONFLICTS** in `echo/quantum/bridge.js` and `evidence/quantum/pyodide-bridge/project/pb_spy.py` (measured at 01:08).
  - It lands second, so before its final report it must merge the new integration tip, resolve both files keeping both changes, and re-run round.sh, seam.mjs, pytest, contract-check and caps.
  - If its report arrives without that merge, I dispatch a short catch-up worker. I never pick a side myself.
- **g1-proof-harness** (evidence only). It builds the one-command G1 proof. It should also cover the X-on-q0 control, with `status` meaning only "job completed".

**Next**
1. Judge commit-seam-fix on a disposable merged copy. I need to see:
   - `seam.mjs` 13/13;
   - round.sh green, with only the predicted nulls;
   - pytest, contract-check, and caps at RED 2;
   - the S3 and S4 sabotage nulls closed.
2. Prove G1: run the harness script on the final integration tip. Then `propose.mjs --row 4 --kind done`, and ask the overseer for a Built-in smoke run of the merged build on Qollab.
3. Cross-lane relay, sent after commit-seam-fix merges:
   - **Platform:**
     - `main.js` deletes its inline `backend.run` (lane/platform/integration lines 181–199) and calls `verifySelectedBackendOnce()`. Without that, caps reports 2 `backend.run` sites.
     - RESTART calls `resetStoryToken()`.
     - Fix the `main.js:183` comment: the guard is the `fetch` override (`rewriteIonqRequest`).
     - Strip `__pycache__` from the upload.
     - CONTRACTS.md should say "phase-1 request = the angles the engine reports".
   - **Gameplay:** commit fields `stateId/applyX/applyZ`; cloning `fidelity`; `fakeQuantum.js` signatures follow the bridge.
4. After G1: S2 (expose or delete `verify_deferred` and `corrections_withheld`), and S5 wording.

**Risks**
- G1 margin: if commit-seam-fix is not merged by 03:45 ET, report G1 PARTIAL and name the open rows (B1/B2).
- The `bridge.js` conflict between the two tips is the main schedule risk.
- Hubs and the Index conflict on every merge. Regenerate them; never pick a side.
=== END PLAN ===

=== MERGE branch=lane/quantum/backend-site-move ===

=== LEARN ===
2026-10-10 consult 18: I merged backend-site-move (71a768e) after re-running it on the disposable worktree `/tmp/q18bsm`. Integration is an ancestor of the tip, so the tip itself is the merged tree. Results:
- pytest: 595 passed.
- caps: RED 2 (entry-index, entry-main).
- contract-check: GREEN, 1087/1087.
- round.sh: exit 0. final-1/2/3 84/84 each; fault 33/33; 3 heads red, including head-pre-move-python at 87/88; 10 of 12 sabotages red; nulls only `bare-toJs` and `plain-call`, both predicted.
- Screenshot `renders/backend-site-move/runner-spy-js1-python0-final-1.png`: JS 1, Python 0, runner counter 1.

Row 3 is closed in the lane. It is fully closed in the game only once platform's `main.js` drops its own `backend.run`.

Measured at 01:08 ET: the trial merge of commit-seam-fix (b18b878) with backend-site-move conflicts in `echo/quantum/bridge.js` and `evidence/quantum/pyodide-bridge/project/pb_spy.py`. commit-seam-fix must merge the new integration tip and re-run every gate before I judge it. In zsh, `${PIPESTATUS[0]}` prints empty, so read the verdict lines or use zsh's `$pipestatus`.
=== END LEARN ===

**Status:** G1 is not met yet. About 2 h 50 m remain to the 04:00 ET deadline.

**Merged:** backend-site-move closes row 3 inside the lane. The game still has a second `backend.run` until platform's `main.js` calls `verifySelectedBackendOnce()` instead of its own.

**Blocking:** commit-seam-fix, which fixes B1/B2, now has a measured merge conflict with that merge in `bridge.js` and `pb_spy.py`. It has to resolve that before I can judge it. If it isn't merged by 03:45 ET, I report G1 as PARTIAL.
