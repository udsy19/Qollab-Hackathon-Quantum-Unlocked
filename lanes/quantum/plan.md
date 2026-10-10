**Lane goal:** G1, plan row 4. Due Sat 2026-10-10 04:00 ET; the clock read Sat 00:57 ET at this consult, so about 3 h remain.
- `echo/quantum/*.py` and `echo/quantum/bridge.js` must return contract-valid results that the real game can consume.
- The tests live in `echo/tests/`.
- Proof comes from the local runner (Pyodide) first, then from Qollab through the overseer.

**Done (integration 24e0ba7)**
- Merged: backend-job, quantum-core, physics-review, contract-conformance, pyodide-bridge, ionq-sim-rehearsal, main-sync, integration-catchup, quantum-hardening, tests-caps-clean, bridge-rewire, backend-site-research and engine-bridge-review.
- engine-bridge-review gave us two things:
  - an independent numpy derivation of the physics (715 numbers, 0 mismatches);
  - `seam.mjs`, which is the lane's seam gate (7/13 today).

**Running**
- **backend-site-move** (row 3, Option A). Its tip is 8146589.
  - After cb4ab4c it added a round.sh head-control update and rehearsal replays that follow the split.
  - It deleted `DEFAULT_SHOTS`, so the no-bloat item between `DEFAULT_SHOTS` and `BACKEND_SHOTS` is being settled there.
  - It is not yet based on current main.
- **commit-seam-fix** has merged main (b18b878). That brings in `validateCommitResult` and `STORY_TOKEN_ID` (ae39421) plus the MOMENT_EVENTS and countdown sections.
  - It has no engine commits yet.
  - Its gate is `seam.mjs` 7/13 → 13/13.
- **g1-proof-harness** (new, evidence only). It builds the one-command G1 proof and trial-merges both running tips now, so a `bridge.js` or contracts conflict shows up early instead of at 03:30.

**Next**
1. **Judge backend-site-move** on a disposable merged copy (`commit-tree` of the `merge-tree` result, then `worktree add --detach`). I need to see:
   - caps RED only on entry-index and entry-main;
   - JS spy = 1 and Python spy = 0 across verify ×2, RESTART and verify again;
   - the X-on-q0 control decoding to q0=1, with `status` meaning only "the job completed";
   - round.sh, pytest and contract-check green;
   - the sabotages red, with only the predicted nulls (`bare-toJs`, `plain-call`).
2. **Judge commit-seam-fix** the same way, plus `seam.mjs` 13/13. Its merge brings main's contracts into integration.
   - Whichever of the two lands second merges integration and re-runs the full round.
   - A `bridge.js` conflict goes to a short catch-up worker; I never resolve one by picking a side.
3. **Prove G1:** run g1-proof-harness's script on the final integration tip. Then propose row 4 DONE (`propose.mjs --kind done`) and ask the overseer for a Built-in smoke run of the merged build on Qollab.
4. **Cross-lane relay**, held until both have merged:
   - **platform:**
     - `main.js` calls bridge.js `verifySelectedBackendOnce` and has no `backend.run` of its own;
     - RESTART calls `resetStoryToken()`;
     - fix the `main.js:183` comment;
     - strip `__pycache__` from the upload;
     - consider having CONTRACTS.md say "phase-1 request = the angles the engine reports".
   - **gameplay:**
     - commit fields `stateId/applyX/applyZ`;
     - cloning `fidelity`;
     - `fakeQuantum.js` signatures follow the bridge;
     - gameplay integration still reads `correctionX/Z`.
5. **After G1:** S2 (expose or delete `verify_deferred` / `corrections_withheld`).

**Risks**
- G1 margin: if row 3 and B1/B2 are not merged by 03:45 ET, report G1 PARTIAL and name the open rows.
- backend-site-move lacks the newest main (contracts ae39421), so it may conflict with commit-seam-fix. The harness trial merge measures this now.
- The hubs and the Index conflict on every merge. Regenerate them; never pick a side.