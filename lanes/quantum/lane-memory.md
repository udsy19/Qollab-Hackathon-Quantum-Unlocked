
- 2026-10-10 consult 1: Lane setup (consult 1): the worker model key is `opus` (org.json `worker_models`; `sonnet` also exists), and the lane's parallel cap is 2. The vision's §10.3 sets `isIndependentCloning` from the state name, and §10.5 is only a deferred-measurement check. Workers must derive cloning results from the computed state and must build a separate teleportation branch model (measurement bits → conditional state → X/Z → fidelity). The shared `ExperimentResult` schema belongs to the platform lane, so this lane only proposes it, in `vault/Design/experiment-result-contract.md`. Whether `backend` can be reached from Python in a JS/Qiskit project is unresolved and is being settled by research (backend-job worker) before anyone builds on an assumption.

- 2026-10-10 consult 2: 2026-10-10 consult 2: I merged backend-job after re-running its tests myself on a disposable `--detach` worktree: `git worktree add --detach /tmp/x <branch>`. A plain worktree add fails because each worker's branch is already checked out under `lanes/quantum/wt/<slug>`. Facts I can now rely on:
- In a JS project `backend` is a JS global; Python gets it only through `.callPromising(backend)`, because a plain call on IonQ fails with an XHR error.
- Count keys put clbit 0 on the right.
- `.toJs()` returns a Map unless `dict_converter: Object.fromEntries` is passed.
- No wasm Qiskit wheel exists on PyPI or in Pyodide's lockfile, so the APIs Qollab ships can only be learned by a probe on Qollab, which the overseer runs.

Two items are still open: the contract additions (`experiment:'bell_verification'`, `summary`) wait on platform's `echo/contracts.js`, and where the memoised JS call site lives is unresolved.

- 2026-10-10 consult 3: 2026-10-10 consult 3: I merged quantum-core after re-running it on a disposable detached worktree (363 passed, exit 0, merge-tree clean) and checking two things myself. First, cloning is derived from the joint-state fidelity (`cloning.py:31`), not from the state name. Second, `teleport_branch` is separate from `verify_deferred`. I accepted two of the three sabotage nulls as physics: (X⊗I)Φ+ = (I⊗X)Φ+, and both Bell-pair marginals are I/2. The cloning-trace null went to review. The lesson: platform's real contract is on `lane/platform/integration` (`echo/contracts.js` and `CONTRACTS.md`), with `experiment` ∈ {cloning, bell_signalling, teleportation}. Our extra fields (`kind`, `details`, `circuitText`, `bell_verification`, `summary`) must be measured against that validator, not against our own proposal note.

- 2026-10-10 consult 4: 2026-10-10 consult 4: I merged physics-review after re-running `evidence/physics-review/derive.py` myself: 81 OK, worst 4.99e-11, exit 0. **Gotcha:** the script needs the echo path as `argv[1]` (`python -I derive.py <worktree>/echo`). Run without it, it exits 1 with an IndexError. That is a usage error, not a physics failure.

- 2026-10-10 consult 4: Decision (autonomous mode, CLAUDE.md "story token is consumed ONCE at final commit" and vision §7.4/§7.5): the engine itself refuses a second `live_commit` within one interpreter run. It uses a module guard, the same pattern as `run_bell_verification_once`. Gameplay's in-run RESTART must call an explicit `reset_story_token()`. This is safe because the interpreter is fresh on every Run (owner-answers 2026-10-10). It closes physics-review finding 2, and goes to the quantum-hardening brief.

- 2026-10-10 consult 4: Sequencing: contract-conformance and the upcoming quantum-hardening worker both edit `echo/quantum/*.py`, so they must run one after the other, never in parallel. While a `.py` worker is running, use the parallel slot for non-`.py` work (`bridge.js`, Pyodide-runner proof). Platform's local runner lives on `lane/platform/g0-runner-smoke` (`tools/qollab-runner/`), not yet on platform integration. As of 6378677, `backend_verification` is NOT in platform's `EXPERIMENTS`, so platform has to add it.

- 2026-10-10 consult 5: 2026-10-10 consult 5: I merged contract-conformance after re-running it on disposable worktree `/tmp/q5cc`: 453 passed, exit 0, merge-tree clean. It still emits `experiment: "bell_verification"`, but the owner has since ruled `backend_verification`, so quantum-hardening does the rename. At `lane/platform/integration` 4e1b2ed, `EXPERIMENTS` still lacks the value, so the conformance test's single-value pending-gap filter has to follow the rename. The clock at consult 5 read Fri 23:46 ET, so G1 (Sat 04:00 ET) is 4 h away and not overdue. Decision (autonomous; CLAUDE.md "consumed ONCE" + the overseer's gameplay-consult-3 ruling): `live_commit` marks the token consumed only on success, and refuses a second call. `reset_story_token()` exists only for RESTART.

- 2026-10-10 consult 6: 2026-10-10 consult 6: I merged pyodide-bridge after re-running it myself on disposable worktree `/tmp/q6pb`, port 5193 (set `PB_PORT`/`PB_OUT` so it never collides), with `run.sh <tag> conformant --python-from lane/quantum/integration`. The green run was 61/61, exit 0, and the `no-memo` sabotage was 58/61, exit 1. Platform added `backend_verification` to `EXPERIMENTS` at `lane/platform/integration` 43be7d9 (`contracts.js:151`), so the only remaining rejection is our own `"bell_verification"` string, which quantum-hardening renames. The bridge is wired to the pre-hardening Python API, so a bridge-rewire worker must follow the hardening merge before G1 can be shown with a resolving `verifySelectedBackendOnce`.

- 2026-10-10 consult 7: 2026-10-10 consult 7: Lane integration was 10 commits behind main, including contracts v2 at 80d685f. A `merge-tree` of main into integration conflicts only in the generated hubs (`vault/Map.md`, `vault/Reports/README.md`). Resolve those by regenerating with `vault-hubs.mjs`. quantum-hardening also lacks main, but it conformed to v2 through `lane/platform/integration` (0893403). Merge it only after main-sync, and re-run `tools/contract-check` on the merged result.

- 2026-10-10 consult 8: 2026-10-10 consult 8: Merged ionq-sim-rehearsal after re-running its keyless replays (4/4 exit 0) and its `sabotage.sh` (6 red, 4 predicted nulls) on the disposable worktree `/tmp/q8ir`. `merge-tree` was clean.
- `~/.config/echo/ionq.env` is absent on this host. Per the owner's ruling, skip the step and do not ask for the key; the live IonQ simulator rehearsal stays optional and is not a G1 blocker.
- Durable physics/test fact: a Bell (00/11) run cannot detect a bit-order bug, because the outcomes are symmetric. Only an asymmetric control (X on q0) can. So the one Qollab job proves only that the backend works; endianness is proven locally.
- qiskit-ionq rounds p×shots on noisy sims (255 of 256 counts were seen), so validators must not demand sum == shots for noisy runs.

- 2026-10-10 consult 8: 2026-10-10 consult 8: To save G1 time, I based bridge-rewire on `lane/quantum/quantum-hardening` (tip 10925be) rather than on integration. Its API was already final per the code: `bell_measurement` returns theta/phi, plus `live_commit(seed)` and `reset_story_token`. This is safe because bridge-rewire edits only `bridge.js` and evidence, never `.py`, and must merge hardening's final tip before its last run. Merge order: main-sync → hardening → bridge-rewire.

- 2026-10-10 consult 9: 2026-10-10 consult 9: I did not merge main-sync (7c72712) directly. I re-ran it on the disposable worktree `/tmp/q9ms`: contract-check GREEN 1087/1087; caps RED with 6 findings (entry-index, entry-main, backend-run-python, hardcoded-backend, hardcoded-secret); pytest 452 passed and 1 failed (`test_contract_conformance`, `bell_verification`). Those numbers match its report. But `merge-tree` into integration conflicts in `vault/Map.md` and `vault/Reports/README.md`, because it was cut at d9b42d0 before ionq-sim-rehearsal plus bfcfbc3. The rule: any branch cut before the latest hub regeneration will conflict in the hubs. Have a short worker merge it onto current integration and regenerate the hubs, rather than risk a conflicted MERGE. Every brief from now on says "merge current integration and regenerate hubs before your final report".

- 2026-10-10 consult 9: 2026-10-10 consult 9: contract-check grades `echo/contracts.js` only; it never runs the engine or bridge.js (main-sync finding). Engine conformance has to be measured with contracts.js's exported validators (`validate.mjs`, `validate_teleport_v2.mjs`) and in the Pyodide runner. A green contract-check is never evidence that quantum output conforms. Remaining gap rows the hardening tip does not close: 3 (Python `backend.run` site), 4–5 (caps-flagged test literals), 7 (shots must be 256 in parameters, with drift in facts), and 9–11 (bridge.js). Rows 1–2 belong to platform (`main.js` and `index.html` are not on main), so qollab-caps cannot go fully green on a quantum branch until platform lands them.

- 2026-10-10 consult 10: 2026-10-10 consult 10: I merged integration-catchup (bdb6261, a fast-forward over bfcfbc3) after re-running it on the disposable worktree `/tmp/q10ic`. Results matched the worker's report exactly:
- contract-check: GREEN 1087/1087.
- caps: RED, 6 failures across 5 rules.
- pytest: 452 passed, 1 failed (`bell_verification`).
- hubs `--check`: 0.

New fact: integration now commits a regenerated `vault/Index.md` (the brief ordered it), so a branch cut earlier can conflict in Index.md as well as in Map.md and the Reports hub. Resolve all three by regenerating (`vault-hubs.mjs`, `gen-subject-index.py`) and confirm with `--check` exit 0.

Quick judge recipe: `git merge-base --is-ancestor integration <branch>` plus an empty `git diff <source-branch> <branch> -- echo/` proves a catch-up merge changed no product code.

- 2026-10-10 consult 11: 2026-10-10 consult 11: I merged quantum-hardening (4db9aba) after re-running it on the disposable worktree `/tmp/q11h` (integration f7efb92 with hardening merged in, exit 0):
- pytest: 595 passed.
- contract-check: GREEN, 1087/1087.
- Sabotage round (`ECHO_CONTRACTS_JS=<tree>/echo/contracts.js python evidence/quantum/hardening/sabotage.py echo`): 42 mutations, 38 red, 4 nulls, 0 refused.
- caps: RED with 6 findings.
The branch was not a descendant of integration, but `merge-tree` exited 0, so I did not need a catch-up worker. Gap rows 6, 7 and 8 are closed. Row 7 is closed because `interpret_counts` pins `parameters.shots` to the requested count and records any drift in `facts`. Still open:
- row 3: the Python `backend.run` at `qollab_job.py:169`, which bridge-rewire keeps;
- rows 4–5: `test_qollab_job.py:91,207`;
- rows 1–2: platform.

- 2026-10-10 consult 11: 2026-10-10 consult 11: Row 3 is a conflict between the ruling's wording and the documented route. The ruling says "one guarded backend.run site (bridge.js)". The documented Qollab route is Python `backend.run` through `callPromising(backend)`, and the caps rule `backend-run-python` forbids it. I have not decided this by assumption: the research worker backend-site-research settles it with doc citations plus a runner proof. Option A moves the call into bridge.js. Option B keeps the Python route and asks platform for a narrow caps exemption plus a runner counter for Python-side runs. Until then, a green caps run on a quantum branch can be red only on entry-index, entry-main and backend-run-python.

- 2026-10-10 consult 12: 2026-10-10 consult 12: I merged tests-caps-clean (08bf8c2) after re-running it on the disposable worktree `/tmp/q12tc`. Integration is an ancestor and `merge-tree` exits 0. Results:
- caps: RED 3 (entry-index, entry-main, backend-run-python). Gap rows 4–5 are closed.
- pytest: 595 passed.
- `sabotage.sh`: 9/9 OK, 0 nulls.

Gotchas:
- Run gates with `PYTHONDONTWRITEBYTECODE=1`. Without it, pytest's `__pycache__` inflates caps' file count (19→34 files) and would count toward Qollab's 100-file cap if `echo/` were uploaded from a working tree.
- `cmd | tail` hides the exit code (caps showed `=0` while the printed verdict was RED). Read the verdict line, or use `${PIPESTATUS[0]}`.
- A literal regex in a "never names X" test misses spelling variants (the before-edit nulls were `ionq-simulator` and `apikey`). Use character classes for separators.

- 2026-10-10 consult 12: 2026-10-10 consult 12: backend-site-research checkpoint (not yet proven):
- Qollab's real one-job guard is the frame's `fetch` override (`rewriteIonqRequest`), which refuses a second `POST jobs` from either the JS or the Python route. Only the local runner's counter is JS-proxy-only.
- A JS `backend.run` accepts a Python-built `QuantumCircuit` PyProxy.
- Platform's main.js on `lane/platform/integration` calls `build_bell_verification_circuit`, which no longer exists after hardening.

The row-3 follow-up must therefore come with a cross-lane note to platform: main.js must call bridge.js `verifySelectedBackendOnce` and hold no `backend.run` of its own. I will confirm all of this against the research's runner proof before I act on it.

- 2026-10-10 consult 13: 2026-10-10 consult 13: I merged bridge-rewire (2bfc51e) after re-running it on the disposable merged copy `/tmp/q13br`. That copy was built with `git commit-tree $(git merge-tree --write-tree integration branch) -p integration -p branch`, then `git worktree add --detach`. This recipe tests the merged result itself, before a real merge exists.
- `round.sh` (PB_PORT=5213): final runs 81/81, 81/81 and 83/83. The check count varies with the random calibration states, so a different count alone is not a regression. Fault control 32/32. Old bridge 48/73 and old Python 37/69, both red as they should be. Sabotages 8/9 red; the green one, `bare-toJs`, was predicted.
- pytest 595 passed; contract-check 1087/1087; caps RED 3 (entry-index, entry-main, backend-run-python at `qollab_job.py:169`).

Decision (time-boxed, autonomous): I dispatched backend-site-move (Option A) before backend-site-research finished. Its first step is a runner probe that can refute Option A, and it stops if the probe fails. Basis: the CLAUDE.md priority order, plus the ruling "exactly one guarded backend.run site (bridge.js)" and red-team fix (e).

- 2026-10-10 consult 14: 2026-10-10 consult 14: I read backend-site-research's checkpoint screenshots myself, and they show two things the report's TL;DR does not say.
1. On both Option A screenshots (A and A-control), the row labelled "Python-side backend.run calls (spy)" reads 1, and the runner counter also reads 1. Under Option A the Python count should be 0. Either that spy counts both routes under a misleading label, or A still submits from Python.
   - Rule from now on: judge row 3 only on two separate counters, one for the JS proxy and one for Python `backend.run`. Done means JS = 1 and Python = 0. One label that says "1" is not evidence.
2. The control run's result (X on q0, 0 of 256 agree) still gets `status: "verified"`.
   - `status` may mean only "the one job completed". The agreement belongs in the facts, which already state it.
   - Player-facing text must never say the correlation was confirmed. Before G1 is proposed, the reviewer or the move worker must confirm this.
Evidence: `renders/backend-site-research/{2-optionA-js-submits-counter-1,3-optionA-control-x-q0-decodes-q0-1,1-today-python-route-runner-counter-0}.png`.

- 2026-10-10 consult 15: 2026-10-10 consult 15: B1 (commit `parameters {"state":"token"}` against the contract's `{stateId:"story_token", applyX, applyZ}`) got through 595 tests and 1087/1087 contract-check. The reason: our conformance tests only ever called `validateExperimentResult`, and contracts v2 has per-phase validators (`validateTeleportBitsResult`, `validateTeleportCorrectionResult`, `validateCommitResult`). Every emitter must be checked with the most specific validator for its phase. A generic-shape pass is not conformance. Evidence: `renders/engine-bridge-review/01-pyodide-probe-commit-rejected-by-contract.png`, `evidence/quantum/engine-bridge-review/seam.out` (7/13).

- 2026-10-10 consult 15: 2026-10-10 consult 15: I relaxed the ".py workers run one at a time" rule for commit-seam-fix alongside backend-site-move. The reason is the G1 clock (3 h left), and their files do not overlap: the fix owns cloning.py, teleportation.py and commitTransfer; the move owns qollab_job.py, test_qollab_job.py and verifySelectedBackendOnce. Both touch bridge.js, but in different functions. Mitigation: whichever lands second merges integration and re-runs the full round. If merge-tree conflicts in bridge.js, a short catch-up worker resolves it. I never resolve it by picking a side.

- 2026-10-10 consult 15: 2026-10-10 consult 15: I merged backend-site-research without a re-run. That was safe because it is evidence and vault only: `git diff integration...branch -- echo/` was empty and merge-tree exited 0. Its conclusion stands as research, not proof: Qollab's one-job guard is the frame's `fetch` override (`rewriteIonqRequest`), found by reading shipped JS and never observed firing. Option A needs no caps exemption. My earlier "spy reads 1 under Option A" worry was a single combined spy. backend-site-move's checkpoint uses separate spies (JS=1, Python=0), which is the measurement row 3 is judged on.

- 2026-10-10 consult 16: 2026-10-10 consult 16: I merged engine-bridge-review (9c19024) without a re-run because it is evidence and vault only: `git diff integration...branch -- echo/` was empty and `merge-tree` exited 0, both measured at this consult. Its `evidence/quantum/engine-bridge-review/seam.mjs` is now the lane's seam gate. It checks real engine output against main's per-phase contract validators and gameplay's mission rules. Every future quantum emitter change must leave `seam.mjs` at 13/13, alongside round.sh, pytest and contract-check.

Two sabotage nulls stay open until commit-seam-fix closes them: the hyphenated "faster-than-light" spelling (S3) and swapped m0/m1 labels (S4).

I kept the third slot empty on purpose: with two workers already editing `bridge.js`, a third editor before G1 adds conflict risk and does not shorten the critical path.

- 2026-10-10 consult 17: - 2026-10-10 consult 17: commit-seam-fix merged main at b18b878, so its echo/ diff against integration currently shows only `echo/CONTRACTS.md` and `echo/contracts.js` from main: ae39421 `validateCommitResult` + `STORY_TOKEN_ID`, plus the MOMENT_EVENTS and countdown sections. backend-site-move (8146589) is cut from 807cc39 and lacks that main. Its rehearsal replays and round.sh head controls changed, and it deleted `DEFAULT_SHOTS`, which settles the no-bloat question in favour of contracts `BACKEND_SHOTS`; verify that when I judge it. I used the free third slot for an evidence-only worker (g1-proof-harness, no `echo/` edits), not for a third `bridge.js` editor. It trial-merges both tips now and builds a one-command G1 proof, so a conflict surfaces before 03:45 ET.
