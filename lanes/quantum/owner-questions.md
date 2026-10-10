
## Consult 2 (2026-10-10 03:29 UTC)
Two checks only Qollab can settle. Per your ruling, the overseer runs these in your Chrome on the free Built-in simulator; no IonQ and no publish.

1. **Pyodide Qiskit probe (top risk for G1).** Run the ~10 s probe in `vault/Research/qollab-backend-from-js-projects.md` § The probe in a scratch project (merged to `lane/quantum/integration`). Paste the console output into `owner-answers.md`. It tells us:
   - whether `Statevector`, `DensityMatrix`, `partial_trace`, `state_fidelity` and `BasicSimulator` work on Qollab's Python 3.14;
   - what `backend.name` reports;
   - the format of the count keys.

   If any of these are missing, the lane has to change its approach before Sat 04:00.
2. **Does Python state survive Stop → Run?** Run the scratch project twice (Run, Stop, Run) with a module-level counter that prints and increments. Does it print 0 both times? The once-per-run guard on the backend job depends on the answer.
3. **Shots for the one Bell job:** keep 256 (vision §10.7, faster on IonQ sims) or use Qollab's default 1024? Unless you say otherwise, I keep 256 because the vision doc says 256.

## Consult 3 (2026-10-10 03:33 UTC)
1. **Rooftop calibration states.** On the named states |0>, |1>, |+>, |−> and phase, some WRONG X/Z correction still scores fidelity 1.000000. The evidence is the table in `evidence/quantum-core/transcript.txt` on `lane/quantum/integration`. There are two options:
   - (a) Use only generic states for the dry run (a fixed off-axis Bloch point, or a fresh random one each run), so every wrong choice visibly fails.
   - (b) Keep the named states and show "this mistake doesn't show on this state" as a teaching moment.

   I recommend (a): fresh random Bloch points, with (b)'s message kept as an optional fact. Which do you want?
2. **The story token.** Vision §7.4 says it is "unknown". Should it be a fixed generic Bloch point that is never shown to the player (my recommendation), or randomised per playthrough?
3. **Shots for the one selected-backend job.** Keep 256 (§10.7, faster on IonQ simulators), or use Qollab's default of 1024?
4. **For the overseer's next Qollab session.** Please run:
   - the ~10 s probe in `vault/Research/qollab-backend-from-js-projects.md` § The probe. It settles whether Pyodide's Qiskit has `Statevector`/`DensityMatrix`/`partial_trace`/`state_fidelity`, and every puzzle depends on that;
   - `echo/tests/smoke_plan.md` §2 steps 1–5.

   Later, once the verify step exists: run, Stop, Run again, and tell us whether the second run is refused.
5. **The JS adapter `verifySelectedBackendOnce`** (the memoised one-job call). I propose it lives in a quantum-owned `echo/quantum/bridge.js`, imported by platform's `main.js`. The other option is to put it in `main.js` itself (platform). Do you approve the quantum-owned file?
