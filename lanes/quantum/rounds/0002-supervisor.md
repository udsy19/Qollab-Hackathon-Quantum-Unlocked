=== PLAN ===
**Lane goal (G1, due Sat 2026-10-10 04:00 ET; plan row 4).** Build `echo/quantum/{__init__,cloning,entanglement,teleportation,formats,qollab_job}.py` to match vision §7 and §10.3–10.7. Every function returns JSON-safe dicts for the JS bridge. Tests go in `echo/tests/` and cover:
- basis states copy; |+>, |−> and phase states do not (reduced purity 0.5, and the output is not ψ⊗ψ);
- the receiver marginal stays 50/50 for sender I/X/Z;
- teleportation for 6+ states × 4 branches at fidelity ≥ 0.999999;
- an endianness fixture;
- the deferred-measurement circuit labelled as a verification;
- the one selected-backend Bell verification.

**Done**
- `backend-job` (commits 2ba55f1, 9a09400) is judged and merged this consult.
  - `qollab_job.py`: Bell circuit, an explicit clbit←qubit map, a once-per-run guard that spends the allowance before submitting, and honest facts.
  - 32 tests. I re-ran them myself on a disposable detached worktree with the lane venv: exit 0, 32 passed.
  - 14-row sabotage table with one null that was reported (S5, which is covered by S6).
  - Research note `vault/Research/qollab-backend-from-js-projects.md`. Settled: `backend` is a JS global and reaches Python only via `.callPromising(backend)`; the rightmost bit of a count key is clbit 0; use `toJs({dict_converter: Object.fromEntries})`.

**Running:** `quantum-core` (cloning/entanglement/teleportation/formats, plus the proposed contract note).

**Next**
1. When core reports, judge it. Check that expected values are hand-derived, that cloning is computed rather than named, and that the teleportation branch model is separate from the deferred-measurement check. Then merge, and reconcile `qollab_job`'s result dict onto `formats.py`. That means folding in `experiment:'bell_verification'` and `summary`, pending platform's ruling in `echo/contracts.js`.
2. Then dispatch a reviewer or red-team pass over the merged lane. Sabotage targets: the m0/m1 correction swap, dropping the H, flipping endianness, and a cloning result keyed by state name. It also checks that every function uses only the APIs on the Pyodide probe list.
3. JS adapter for the one job: the memoised `verifySelectedBackendOnce` from the backend-job report. Its location is undecided: platform's `main.js`, or a quantum-owned `echo/quantum/bridge.js`. I am proposing to platform (via the overseer) that quantum owns `echo/quantum/bridge.js` and platform imports it.
4. Pyodide probe and the Stop→Run state test. Only the overseer can run them on Qollab (owner ruling, "who drives Qollab"). I am asking below.

**Risks**
- **Q3 (top risk):** whether Pyodide's Qiskit on Qollab has `Statevector` / `DensityMatrix` / `partial_trace` / `state_fidelity` is UNKNOWN, and every puzzle depends on it.
- If Python module state survives Stop→Run, the once-only guard wrongly refuses the next run.
- Schema drift with platform's `contracts.js`.
- Over-claiming: nothing has run on Qollab or IonQ.
=== END PLAN ===

=== MERGE branch=lane/quantum/backend-job ===

=== ASK_OWNER ===
Two checks only Qollab can settle. Per your ruling, the overseer runs these in your Chrome on the free Built-in simulator; no IonQ and no publish.

1. **Pyodide Qiskit probe (top risk for G1).** Run the ~10 s probe in `vault/Research/qollab-backend-from-js-projects.md` § The probe in a scratch project (merged to `lane/quantum/integration`). Paste the console output into `owner-answers.md`. It tells us:
   - whether `Statevector`, `DensityMatrix`, `partial_trace`, `state_fidelity` and `BasicSimulator` work on Qollab's Python 3.14;
   - what `backend.name` reports;
   - the format of the count keys.

   If any of these are missing, the lane has to change its approach before Sat 04:00.
2. **Does Python state survive Stop → Run?** Run the scratch project twice (Run, Stop, Run) with a module-level counter that prints and increments. Does it print 0 both times? The once-per-run guard on the backend job depends on the answer.
3. **Shots for the one Bell job:** keep 256 (vision §10.7, faster on IonQ sims) or use Qollab's default 1024? Unless you say otherwise, I keep 256 because the vision doc says 256.
=== END ASK ===

=== LEARN ===
2026-10-10 consult 2: I merged backend-job after re-running its tests myself on a disposable `--detach` worktree: `git worktree add --detach /tmp/x <branch>`. A plain worktree add fails because each worker's branch is already checked out under `lanes/quantum/wt/<slug>`. Facts I can now rely on:
- In a JS project `backend` is a JS global; Python gets it only through `.callPromising(backend)`, because a plain call on IonQ fails with an XHR error.
- Count keys put clbit 0 on the right.
- `.toJs()` returns a Map unless `dict_converter: Object.fromEntries` is passed.
- No wasm Qiskit wheel exists on PyPI or in Pyodide's lockfile, so the APIs Qollab ships can only be learned by a probe on Qollab, which the overseer runs.

Two items are still open: the contract additions (`experiment:'bell_verification'`, `summary`) wait on platform's `echo/contracts.js`, and where the memoised JS call site lives is unresolved.
=== END LEARN ===
