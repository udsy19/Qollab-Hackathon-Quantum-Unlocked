=== PLAN ===
**Lane goal:** G1, plan row 4, due Sat 2026-10-10 04:00 ET. It is now Sat 00:43 ET, so 3 h 17 min remain.
- Build `echo/quantum/{__init__,cloning,entanglement,teleportation,formats,qollab_job}.py` and the quantum-owned `echo/quantum/bridge.js`.
- Every result must pass platform's `validateExperimentResult` under contracts v2.
- Tests go in `echo/tests/`, per vision §7 and §10.3–10.7.
- Prove it in Pyodide through the local runner, then on Qollab through the overseer.

**Done (merged into integration, now at 807cc39)**
- Earlier merges: backend-job, quantum-core, physics-review, contract-conformance, pyodide-bridge, ionq-sim-rehearsal, main-sync, integration-catchup, quantum-hardening, tests-caps-clean and bridge-rewire.
- Integration state, measured on the merged copy at consult 13:
  - `round.sh`: final runs 81/81, 81/81 and 83/83. Fault control green. Both "before" versions red. 8 of 9 sabotages red.
  - pytest: 595 passed. contract-check: 1087/1087.
  - caps: RED with 3 findings. entry-index and entry-main belong to platform; backend-run-python at `qollab_job.py:169` is row 3.
  - Gap rows 4–11 are closed.

**Running (all 3 slots in use; none overdue)**
- **backend-site-research**, checkpoint at 00:45:
  - It leans toward Option A. Its evidence is three local-runner screenshots in `renders/backend-site-research/`.
  - In 2-optionA, the runner counter reads 1 and the result is `backend_verification` with counts 00 = 128, 11 = 128 and 256 shots.
  - In 3-control, X on q0 gives `{"01":256}`, which decodes to q0 = 1, matching the right-to-left key order.
  - In 1-today, the Python route leaves the runner counter at 0 while the spy counts 1. This confirms the runner cannot see Python-side runs.
  - **Open item I found in the images:**
    - On the Option A screenshots the row labelled "Python-side backend.run calls (spy)" still reads 1. Either the label is wrong (the spy counts both routes) or variant A still submits from Python.
    - The research and backend-site-move must each count the JS and Python routes on separate spies.
    - Done for row 3 means JS = 1 and Python = 0.
  - **Honesty gap:**
    - The control run (0 of 256 agree) still gets `status: "verified"`.
    - Before G1 is proposed, `status` must mean only "the job completed". The facts state the agreement honestly, which is acceptable.
    - The player-facing text must never imply the Bell correlation was confirmed when agreement is low.
    - This goes to the reviewer and to the move worker's judging.
- **backend-site-move** (Option A for row 3): bridge.js makes the one JS `backend.run` on a circuit Python builds, and the Python `backend.run` is deleted. It starts with a probe that can refute Option A.
- **engine-bridge-review**: an adversarial read-only review against vision §7 and §10.3–10.7 and the rulings.

**Next**
1. When backend-site-move reports, I judge it on a disposable merged copy (`commit-tree` + `worktree add --detach`):
   - caps RED only on entry-index and entry-main;
   - separate spies: JS `backend.run` = 1 and Python `backend.run` = 0, across verify ×2, RESTART and verify again;
   - the X-on-q0 control decodes q0 = 1;
   - full `round.sh` green, with the fault control green and the sabotages red;
   - pytest and contract-check still green.
2. Fold in the research note. If it refutes Option A with evidence, kill backend-site-move.
3. Judge the review. Any blocker gets one bug-fix worker. Run `.py` workers one at a time.
4. Propose row 4 done with the runner evidence, then ask the overseer for a Pyodide smoke test on Qollab.
5. **Cross-lane relay, through the overseer:**
   - main.js imports bridge.js and uses its signatures: `calibrationMeasurement()`, `teleportDryRun(result, X, Z)`, `commitTransfer()` and `verifySelectedBackendOnce()`.
   - RESTART calls `await resetStoryToken()`.
   - main.js holds no `backend.run` of its own and drops the deleted `build_bell_verification_circuit`.
   - The upload strips `__pycache__`.
   - gameplay's `fakeQuantum.js` has diverged from the bridge and must follow it.
   - The runner's counter cannot see Python-side runs.

**Risks**
- G1 margin. If row 3 has not merged by 03:45 ET, report G1 PARTIAL with row 3 named as the open item.
- The spy label ambiguity above could hide a second submit route. Judge by separate counters, never by a single label.
- Merges keep conflicting in the generated hubs. Regenerate them rather than pick a side.
=== END PLAN ===

=== LEARN ===
2026-10-10 consult 14: I read backend-site-research's checkpoint screenshots myself, and they show two things the report's TL;DR does not say.
1. On both Option A screenshots (A and A-control), the row labelled "Python-side backend.run calls (spy)" reads 1, and the runner counter also reads 1. Under Option A the Python count should be 0. Either that spy counts both routes under a misleading label, or A still submits from Python.
   - Rule from now on: judge row 3 only on two separate counters, one for the JS proxy and one for Python `backend.run`. Done means JS = 1 and Python = 0. One label that says "1" is not evidence.
2. The control run's result (X on q0, 0 of 256 agree) still gets `status: "verified"`.
   - `status` may mean only "the one job completed". The agreement belongs in the facts, which already state it.
   - Player-facing text must never say the correlation was confirmed. Before G1 is proposed, the reviewer or the move worker must confirm this.
Evidence: `renders/backend-site-research/{2-optionA-js-submits-counter-1,3-optionA-control-x-q0-decodes-q0-1,1-today-python-route-runner-counter-0}.png`.
=== END LEARN ===
