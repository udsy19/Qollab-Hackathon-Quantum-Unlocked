=== PLAN ===
**Lane goal:** G1, plan row 4, due Sat 2026-10-10 04:00 ET. The clock read Sat 00:57 ET at this consult, so about 3 h remain.
- `echo/quantum/*.py` and `echo/quantum/bridge.js` must return contract-v2-valid results that the real game can consume.
- Tests live in `echo/tests/`. Proof comes from the local runner (Pyodide) first, then from Qollab through the overseer.

**Done (integration 5684a5c)**
- Merged so far: backend-job, quantum-core, physics-review, contract-conformance, pyodide-bridge, ionq-sim-rehearsal, main-sync, integration-catchup, quantum-hardening, tests-caps-clean, bridge-rewire and backend-site-research.
- Merging now: engine-bridge-review (9c19024).
  - It is evidence and vault only: `git diff integration...branch -- echo/` is empty, and I ran `merge-tree` at this consult (exit 0).
  - Its physics derivation is independent: 715 numbers from numpy, on host and in Pyodide, worst difference 4.98e-11.
  - Its `seam.mjs` (7/13 today) is the acceptance gate for commit-seam-fix.

**Running**
- **backend-site-move** (row 3, Option A). Checkpoint cb4ab4c: 90/90; separate spies read JS=1 and Python=0; runner counter 1; caps RED only on entry-index and entry-main; pytest 595. It is now in its sabotage round, with nulls predicted in writing (`bare-toJs`, `plain-call`).
- **commit-seam-fix**: B1 (commit `{stateId:"story_token", applyX, applyZ}`, validated with `validateCommitResult`), B2 (top-level cloning `fidelity`), S1 (no JS un-latch after Python has consumed the token), then S5, S3 and S4. Its gate is `seam.mjs`, which must go from 7/13 to 13/13.
- I am leaving the third slot empty on purpose. Every remaining quantum item (S2, Declassified exposure) touches `bridge.js`, and two workers are already editing it. A third editor raises the merge-conflict risk before G1 for no gain on the critical path.

**Next**
1. Judge backend-site-move on a disposable merged copy (`commit-tree` of the `merge-tree` result, then `worktree add --detach`). I need to see:
   - caps RED only on entry-index and entry-main;
   - JS spy = 1 and Python spy = 0 across verify ×2, RESTART and verify again;
   - the X-on-q0 control decoding to q0=1, with `status` meaning only "the job completed" and the agreement stated in the facts;
   - round.sh green, the fault control green and the sabotages red, with only the predicted nulls;
   - pytest and contract-check green.
2. Judge commit-seam-fix the same way, plus `seam.mjs` 13/13 and the per-phase validators. Whichever of the two lands second merges integration and re-runs the full round on the combined tree. A `bridge.js` conflict goes to a short catch-up worker; I never resolve one by picking a side.
3. With both merged, dispatch one short G1 proof worker on integration: the full round, pytest, contract-check, caps, `seam.mjs`, and one runner screenshot per mission result plus the backend verification. Then propose row 4 DONE (`propose.mjs --kind done`), and ask the overseer for a Built-in smoke run of the merged build on Qollab.
4. Cross-lane relay through the overseer, held until row 3 and B1/B2 have merged so it cites final signatures:
   - **platform:**
     - `main.js` imports `bridge.js` and has no `backend.run` or `build_bell_verification_circuit`;
     - RESTART calls `resetStoryToken()`;
     - fix the `main.js:183` comment (the one-job guard is the `fetch` override);
     - strip `__pycache__` from the upload.
   - **gameplay:**
     - commit fields `stateId/applyX/applyZ`;
     - cloning `fidelity`;
     - the `fakeQuantum.js` signatures follow the bridge;
     - gameplay `integration` still reads `correctionX/Z`.
5. After G1: S2 (expose `verify_deferred`/`corrections_withheld` for Declassified, or delete them), and settle no-bloat between `DEFAULT_SHOTS` and `BACKEND_SHOTS`.

**Risks**
- G1 margin: if row 3 and B1/B2 have not merged by 03:45 ET, report G1 PARTIAL and name the open rows.
- Both running workers edit `bridge.js` (different functions), so conflict risk is low but real.
- The hubs and the Index conflict on every merge. Regenerate them (`vault-hubs.mjs`, `gen-subject-index.py`, `--check` exit 0); never pick a side.
=== END PLAN ===

=== MERGE branch=lane/quantum/engine-bridge-review ===

=== LEARN ===
2026-10-10 consult 16: I merged engine-bridge-review (9c19024) without a re-run because it is evidence and vault only: `git diff integration...branch -- echo/` was empty and `merge-tree` exited 0, both measured at this consult. Its `evidence/quantum/engine-bridge-review/seam.mjs` is now the lane's seam gate. It checks real engine output against main's per-phase contract validators and gameplay's mission rules. Every future quantum emitter change must leave `seam.mjs` at 13/13, alongside round.sh, pytest and contract-check.

Two sabotage nulls stay open until commit-seam-fix closes them: the hyphenated "faster-than-light" spelling (S3) and swapped m0/m1 labels (S4).

I kept the third slot empty on purpose: with two workers already editing `bridge.js`, a third editor before G1 adds conflict risk and does not shorten the critical path.
=== END LEARN ===
