The bridge-rewire branch checks out, so I'm merging it into the lane's integration branch. I re-ran the whole graded round on a throwaway merged copy, and every number matches the worker's report.

=== PLAN ===
**Lane goal:** G1, plan row 4, due Sat 2026-10-10 04:00 ET. It is now Sat 00:37 ET, so 3 h 23 min remain.
- Build `echo/quantum/{__init__,cloning,entanglement,teleportation,formats,qollab_job}.py` and the quantum-owned `echo/quantum/bridge.js`.
- Every result must pass the platform lane's `validateExperimentResult` under contracts v2.
- Put the tests in `echo/tests/`, per vision §7 and §10.3–10.7.
- Prove it in Pyodide through the local runner, then on Qollab through the overseer.

**Done**
- Merged in earlier consults: backend-job, quantum-core, physics-review, contract-conformance, pyodide-bridge, ionq-sim-rehearsal, main-sync, integration-catchup, quantum-hardening and tests-caps-clean.
- **bridge-rewire (2bfc51e) is being merged now.** The merge with integration is clean (`merge-tree` exit 0); the branch had not picked up tests-caps-clean, but the two touch different files. Measured on a disposable merged copy `/tmp/q13br` (commit 8f7e896, since removed):
  - **`round.sh`:**
    - The three normal runs passed every check (81/81, 81/81, 83/83). The count varies because the calibration states are random.
    - The fault control passed 32/32: the bridge refuses an engine that lies.
    - Both "before" versions fail, as they should: the old bridge scores 48/73 and the pre-hardening Python 37/69.
    - 8 of 9 deliberate sabotages went red. The one that stayed green, `bare-toJs`, was predicted.
  - **Other gates:** pytest 595 passed; contract-check GREEN 1087/1087.
  - **caps:** RED with 3 findings. Only entry-index and entry-main (platform rows 1–2) and backend-run-python (row 3) remain.
  - **Screenshots:**
    - `verifySelectedBackendOnce` called twice and again after RESTART still makes exactly one `backend.run` (the spy counts 1). It returns `backend_verification` with 256 shots and counts on 00 and 11 only.
    - The token latches: commit #2 and #3 return the same recorded result. After RESTART, commit #4 is a fresh measurement.
    - In the fault run, the lying engine is refused with a `ScientificModuleError`.
  - Gap rows 9–11 (all in bridge.js) are closed.

**Running**
- **backend-site-research** (cutoff 01:30 ET). It leans toward Option A: JS calls `backend.run` from bridge.js on a circuit Python builds. Its argument is that Qollab's real one-job guard is the frame's `fetch` override, which counts both routes.
- **backend-site-move** (new). Row 3 under Option A:
  - bridge.js does the one JS `backend.run` on the Python-built circuit, and the Python `backend.run` is deleted.
  - Its first step is a runner probe that can refute Option A. If the probe fails, it stops and reports, so this does not wait on the research ruling.
- **engine-bridge-review** (new). An adversarial read-only review of the hardened engine plus bridge.js against vision §7 and §10.3–10.7 and the owner rulings.

**Next**
1. Judge backend-site-move:
   - caps must be RED only on entry-index and entry-main;
   - the spy must count 1 JS `backend.run` and 0 Python `backend.run` across verify ×2 and RESTART;
   - the X-on-q0 control must still decode q0=1 locally;
   - the full `round.sh` must still be green.
2. Fold in the research findings, and kill backend-site-move if the research refutes Option A with evidence.
3. Judge the review and fix any blockers.
4. Propose row 4 as done, with runner evidence, and ask the overseer for a Pyodide smoke test on Qollab.
5. **Cross-lane, for the overseer to relay to platform and gameplay:**
   - main.js must import bridge.js and use its new signatures: `calibrationMeasurement()`, `teleportDryRun(result, X, Z)`, `commitTransfer()` and `verifySelectedBackendOnce()`.
   - RESTART must call `await resetStoryToken()`.
   - main.js must stop calling the deleted `build_bell_verification_circuit` and hold no `backend.run` of its own.
   - The upload must strip `__pycache__`.
   - gameplay's `fakeQuantum.js` signatures have diverged from the bridge.
   - The runner's counter cannot see Python-side runs.

**Risks**
- The G1 margin is thin. If row 3 has not merged by 03:45, report G1 as PARTIAL with row 3 named as the open item.
- backend-site-move and the research both touch the row-3 question. Their conclusions must agree, or the evidence settles it.
- Generated hubs conflict on every merge, so regenerate them rather than pick a side.
=== END PLAN ===

=== MERGE branch=lane/quantum/bridge-rewire ===

=== AGENT name=backend-site-move model=opus base=lane/quantum/bridge-rewire ===
**GOAL:** In the game there must be exactly ONE place that sends a job to the selected backend. That place is `verifySelectedBackendOnce` in `echo/quantum/bridge.js`, which calls the JS `backend.run`. Python only builds the Bell-verification circuit and interprets the counts. Its own `backend.run` at `echo/quantum/qollab_job.py:169` is deleted. After this change, `node tools/qollab-caps/check.mjs` should be RED only on `entry-index` and `entry-main`, the two platform files that are missing.

**VISION:** CLAUDE.md says IonQ on Qollab allows one backend job per run. Owner ruling 2026-10-10 says "exactly one guarded backend.run site (echo/quantum/bridge.js)". Red-team fix (e) says "delete the Python-side backend.run site". The judge must be able to trust that the one IonQ job is spent exactly once, and honestly.

**WHAT WE ARE BUILDING:** The quantum-owned `bridge.js` that platform's `main.js` will import, plus `qollab_job.py`. You own `echo/quantum/` and `echo/tests/` and nothing else. Do not edit `main.js`, `tools/` or `contracts.js`. List any request for platform in your report.

**WHAT HAS NOT WORKED / KNOWN FACTS:**
- **Python route:** Python reaches `backend` only through `.callPromising(backend)`. A plain call on IonQ fails with an XHR error.
- **Local runner counter:** it counts only JS-proxy calls, so it reads 0 for Python-side runs. Use the harness spy (`evidence/quantum/pyodide-bridge/project/pb_spy.py`) and extend it to count JS calls too.
- **Why the X-on-q0 control stays local:** a Bell (00/11) run cannot detect a bit-order bug. Only an asymmetric control (X on q0) can, so that control stays a local proof and the Bell run must not replace it.
- **Count keys:** clbit 0 is on the right.
- **Converting to JS:** `toJs()` needs `dict_converter: Object.fromEntries`.
- **One-shot check:** a parallel research worker (backend-site-research, branch `lane/quantum/backend-site-research`) found that a JS `backend.run` accepts a Python-built `QuantumCircuit` PyProxy. Qollab's real guard is the frame's `fetch` override (`rewriteIonqRequest`). Read its branch and report (`/Users/udsy/agent-org/lanes/quantum/reports/0011-backend-site-research.md`) first. **Your first step is to try to refute this in the runner.** Pass a Python-built circuit to the runner's JS `backend.run` on both backends, `basic_simulator` and ionq-mock. If that fails, STOP and write your report at once with the failing log. Do not build a workaround.

**VAULT:** Read `vault/AGENTS.md`, `vault/Index.md`, `vault/Research/qollab-backend-from-js-projects.md`, `vault/Reports/pyodide-bridge.md`, `vault/Reports/bridge-rewire.md`, `vault/Reports/quantum-vs-contracts-v2.md` (gap row 3), `vault/Reports/ionq-sim-rehearsal.md` and `vault/Reports/qollab-caps-gate.md`. Your report opens with a Vault check.

**WHERE TO START:**
- `echo/quantum/qollab_job.py`: the `run_backend_verification_once` path.
- `echo/quantum/bridge.js`: `verifySelectedBackendOnce`.
- `evidence/quantum/pyodide-bridge/{round.sh,run.sh,sabotage.mjs,project/}`.
- `evidence/quantum/ionq-sim-rehearsal/` (the replays call `qollab_job`; keep them working or update them).

**DELIVER:**
1. **The split.** Python exposes a builder for the circuit and an interpreter for the counts. `interpret_counts` keeps 256 shots pinned and records any drift in `facts`. bridge.js does the following:
   - memoises one promise;
   - calls `backend.run(circuit, {shots:256})` exactly once per interpreter run;
   - reads the counts;
   - has Python interpret them;
   - validates the result with the contract validator.

   RESTART must not reset that memo. Delete the Python `backend.run` and any helper it alone used, then grep that no references remain.
2. **Checks written first and watched red on the current tip.** Across verify ×2, RESTART and verify again, the spy must count JS `backend.run` = 1 and Python `backend.run` = 0. The result must be accepted as `backend_verification` with 256 shots. The caps line `backend-run-python` must be gone.
3. **The full `round.sh` on your tip:** 3 green runs, the fault control, the head controls (the old head is now bridge-rewire), and the sabotages. Add sabotages of your own:
   - a second JS `backend.run`;
   - Python calling `backend.run` again;
   - the memo dropped.

   Report every null.
4. **The other gates must not regress:** pytest `echo/tests` (`PYTHONDONTWRITEBYTECODE=1`), contract-check GREEN, and the ionq-sim-rehearsal replays green.
5. One screenshot of the runner page showing the JS/Python spy counts, saved to `renders/backend-site-move/`.
6. Use your own `PB_PORT`, chosen in the range 5220–5229. Never use a shared port.
7. Before your final report, merge current `lane/quantum/integration` and regenerate the hubs (`node scripts/vault-hubs.mjs`, `python3 scripts/gen-subject-index.py`). Both `--check` runs must exit 0.

**JUDGING:** I will re-run `round.sh`, caps, pytest and the replays on a disposable worktree. I accept the work only if caps is RED on entry-index and entry-main alone, the spy shows JS=1 and Python=0, and every sabotage is red apart from nulls you named in advance. Results are "local runner", never "Qollab".

**REPORT:** `reports/00NN-backend-site-move.md` (TL;DR, Vault check, commands with exit codes, evidence paths, nulls, decisions with doc citations, and requests for platform: what main.js must call). Write it to `vault/Reports/backend-site-move.md` as well. Checkpoint commit and report within 1 h. Hard cutoff 03:15 ET.
=== END AGENT ===

=== AGENT name=engine-bridge-review model=opus base=lane/quantum/bridge-rewire ===
**GOAL:** Before we propose that G1 is done, an adversarial review must look for any way the quantum engine or bridge could show a judge or player something false or broken. Read-only on product files. Your output is findings, each backed by a reproduction.

**VISION:** Truthful quantum (CLAUDE.md, vision §2.4, §7.5):
- An unknown qubit is never cloned.
- No faster-than-light message is ever sent.
- Teleportation uses a Bell pair, a Bell measurement, two classical bits and X/Z corrections, and consumes the source.
- m0 is the source readout and m1 is the local Bell-half readout. The receiver applies X iff m1=1 and Z iff m0=1.
- The story token is consumed once, and only on a successful commit.
- Dry-run states are random and generic.
- Shots are 256.
- There is one selected-backend job.

**WHAT WE ARE BUILDING:** These are the files platform's main.js will import:
- `echo/quantum/{cloning,entanglement,teleportation,formats,qollab_job}.py`;
- `echo/quantum/bridge.js`;
- the tests in `echo/tests/`.

**WHAT HAS NOT WORKED:**
- **Fake adapter:** tests on a fake adapter hid a total integration break.
- **Named states:** named Pauli states hide a dropped X or Z, and a wrong correction can still score F=0.957.
- **Literal regexes:** they missed spelling variants.
- **Tests that pass while broken:** the gameplay tests stayed green with the fidelity check removed.
- **contract-check:** it grades only contracts.js, never engine output.

**VAULT:** Read `vault/AGENTS.md`, `vault/Index.md` (the promoted lessons), `vault/Reports/{quantum-physics-review,quantum-engine-g1,quantum-hardening,bridge-rewire,quantum-vs-contracts-v2}.md` and `vault/Design/gate-independence-cases.md`. Your report opens with a Vault check.

**DO:**
- Independently re-derive at least the following, with your own numpy code outside `echo/`, under `evidence/quantum/engine-bridge-review/`:
  - teleportation for 6+ random states × 4 branches × 4 corrections;
  - cloning purity of 0.5 for |+> and phase states;
  - no-signalling marginals.

  Compare your numbers against engine output from the real Pyodide runner (reuse `evidence/quantum/pyodide-bridge/run.sh` with your own `PB_PORT`, chosen in the range 5230–5239) and from host Python.
- Audit these against the rulings:
  - the token latch and RESTART;
  - the commit unlock rule (at least one correct dry run whose bits are not 00);
  - the `{theta, phi}` pass-through;
  - the m0/m1 labels and the `circuitDescription` text;
  - the deferred-measurement circuit, which must be labelled a verification, not a link;
  - numpy scalars leaking to JS;
  - any wording in returned `facts` or messages that overclaims (FTL, "certified random", matter teleportation).
- Choose 3 tests and sabotage each on a disposable copy. Report every null.

**DO NOT:** Edit `echo/`. Do not fix anything; each finding goes in the report with its file:line, a reproduction command and a severity (blocker / should / nit).

**REPORT:** `reports/00NN-engine-bridge-review.md`, and write it to `vault/Reports/engine-bridge-review.md` as well. Checkpoint within 1 h. Hard cutoff 02:45 ET.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 13: I merged bridge-rewire (2bfc51e) after re-running it on the disposable merged copy `/tmp/q13br`. That copy was built with `git commit-tree $(git merge-tree --write-tree integration branch) -p integration -p branch`, then `git worktree add --detach`. This recipe tests the merged result itself, before a real merge exists.
- `round.sh` (PB_PORT=5213): final runs 81/81, 81/81 and 83/83. The check count varies with the random calibration states, so a different count alone is not a regression. Fault control 32/32. Old bridge 48/73 and old Python 37/69, both red as they should be. Sabotages 8/9 red; the green one, `bare-toJs`, was predicted.
- pytest 595 passed; contract-check 1087/1087; caps RED 3 (entry-index, entry-main, backend-run-python at `qollab_job.py:169`).

Decision (time-boxed, autonomous): I dispatched backend-site-move (Option A) before backend-site-research finished. Its first step is a runner probe that can refute Option A, and it stops if the probe fails. Basis: the CLAUDE.md priority order, plus the ruling "exactly one guarded backend.run site (bridge.js)" and red-team fix (e).
=== END LEARN ===
