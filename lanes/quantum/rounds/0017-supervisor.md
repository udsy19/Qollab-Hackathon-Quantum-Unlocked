=== PLAN ===
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
=== END PLAN ===

=== AGENT name=g1-proof-harness model=sonnet base=lane/quantum/integration ===
**GOAL:** When the two running fixes land, the supervisor proves G1 with one command in minutes, not an hour of hand-run gates. Any conflict between the two running branches is found NOW, not at 03:30 ET.

**VISION:** G1, "quantum verified", is due Sat 04:00 ET (`ROADMAP_48_HOURS.md`; `.claude/rules/deadline-gates.md`). The bar is that every puzzle result the real game consumes is real Qiskit output that passes the platform's per-phase contract validators, with exactly one `backend.run` in `bridge.js` (vision §7, §8.4, §10.3–10.7).

**WHAT WE ARE BUILDING:** the quantum engine `echo/quantum/` plus `bridge.js`, consumed by the Qollab game in `echo/`. You build **evidence tooling only**. Edit nothing under `echo/`; two other workers own those files right now.

**WHAT HAS NOT WORKED**
- Green lane tests on a fake adapter hid a total integration break: 12/13 cross-lane checks were red.
- 595 tests plus 1087/1087 contract-check passed while the commit was rejected by `validateCommitResult`. Generic-shape validation is not conformance.
- `cmd | tail` hid exit codes.
- pytest's `__pycache__` inflated the caps file count.
- Branches cut before the last hub regeneration conflict in `vault/Map.md`, `vault/Reports/README.md` and `vault/Index.md`.

**Vault notes to read first:** `vault/AGENTS.md`, `vault/Index.md`, `vault/Reports/engine-bridge-review.md` (`seam.mjs`), `vault/Reports/bridge-rewire.md` (`round.sh`), `vault/Reports/tests-caps-clean.md`, `vault/Research/backend-run-site.md`, `evidence/quantum/pyodide-bridge/README.md`, `evidence/quantum/engine-bridge-review/README.md`. Your report opens with a **Vault check**.

**Deliver**
1. **`evidence/quantum/g1-proof/prove.sh <git-ref> [port]`.**
   - It builds a disposable detached worktree of the ref under /tmp. It never touches the lane checkout.
   - It runs, each with its own exit code captured (no pipes that hide them) and `PYTHONDONTWRITEBYTECODE=1`:
     - `pytest echo/tests`
     - `node tools/contract-check/check.mjs`
     - `node tools/qollab-caps/check.mjs`
     - `seam.mjs`
     - `PB_PORT=<port> round.sh`
   - It writes `out/<ref-sha>/SUMMARY.md`, with one line per gate: command, exit code, verdict line, log path.
   - It exits 0 only if every gate is at its expected verdict.
     - caps is "expected RED only on entry-index and entry-main", checked by rule id, not by exit code.
     - A gate that did not run is a REFUSAL (exit 2), never a pass.
     - A hang has a timeout and is reported as NO VERDICT.
   - Reuse the existing scripts. Do not reimplement them.
2. **A falsification of `prove.sh` itself**, on a disposable copy: break one gate input (for example flip one fidelity threshold, or add a second `backend.run`) and show `prove.sh` goes red on that gate. Report any null.
3. **A trial merge now.**
   - Run `git merge-tree --write-tree` on integration + `lane/quantum/backend-site-move` + `lane/quantum/commit-seam-fix`, using their current tips. Name the tips by SHA.
   - Report every conflicting path. Note that commit-seam-fix carries main's new contracts (ae39421 `validateCommitResult`) and backend-site-move does not.
   - If the merge is clean, run `prove.sh` on the trial commit (`commit-tree`, detached) and report the per-gate table. Red gates are expected there, because the fixes are still in progress; this is a dry run of the tool.
   - If it conflicts, do not resolve anything. List the hunks.
4. Then a vault note `vault/Reports/g1-proof-harness.md`. Merge current integration and regenerate the hubs (`node scripts/vault-hubs.mjs`, `python3 scripts/gen-subject-index.py`, both `--check` exit 0) before your final report.

**How I will judge it**
- I re-run `prove.sh` on integration myself and get the same table.
- The sabotage turns its gate red.
- The trial-merge conflict list matches my own `merge-tree`.

**Report:** `lanes/quantum/reports/NNNN-g1-proof-harness.md`. It contains TL;DR, Vault check, commands with exit codes, nulls, and what you did NOT do. Write a checkpoint within 1 h; the trial-merge result goes first, as soon as you have it. Pick a free port (not 5193 or 5213).
=== END AGENT ===

=== LEARN ===
- 2026-10-10 consult 17: commit-seam-fix merged main at b18b878, so its echo/ diff against integration currently shows only `echo/CONTRACTS.md` and `echo/contracts.js` from main: ae39421 `validateCommitResult` + `STORY_TOKEN_ID`, plus the MOMENT_EVENTS and countdown sections. backend-site-move (8146589) is cut from 807cc39 and lacks that main. Its rehearsal replays and round.sh head controls changed, and it deleted `DEFAULT_SHOTS`, which settles the no-bloat question in favour of contracts `BACKEND_SHOTS`; verify that when I judge it. I used the free third slot for an evidence-only worker (g1-proof-harness, no `echo/` edits), not for a third `bridge.js` editor. It trial-merges both tips now and builds a one-command G1 proof, so a conflict surfaces before 03:45 ET.
=== END LEARN ===
