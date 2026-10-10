---
type: report
status: current
date: 2026-10-09
updated: 2026-10-09
---

# Quantum bridge results vs the platform's ExperimentResult validator

Measured whether every dict `echo/quantum/` returns to the game passes platform's
`validateExperimentResult`. The validator came from `echo/contracts.js` on `lane/platform/integration`
at commit 6378677. The engine was on branch `lane/quantum/contract-conformance`, commit e1a9d5c. Runs
used Python 3.13.0, qiskit 2.5.2 and Node, all locally. **Not run in Pyodide or on Qollab.**

## Measurements

| what | before (a9edce2) | after (e1a9d5c) |
|---|---|---|
| bridge calls rejected by platform's validator | **181 / 181** | **3 / 181** |
| the 3 left | — | `qollab_job` ×3: `experiment "bell_verification"` is not in the union |
| with a disposable contracts.js that adds only `'bell_verification'` | — | **0 / 181** |
| pytest `echo/tests` | 409 passed (updated assertions) | 453 passed |
| sabotage mutations / nulls | 19 / 3 (quantum-core) | 28 / **0** |

Producer: `evidence/quantum/contract-conformance/{dump_results.py,validate.mjs,sabotage_round.py}`.
The README in that folder names each artifact.

## Findings

1. **Every result was rejected, for four reasons.** The reasons were unknown fields (`kind`,
   `details`, `circuitText`, `summary`), missing `keyQubits`, labelled keys (`"source=0,copy=1"`)
   where the contract wants 0/1 keys, and `experiment "bell_verification"`. The UI shows "scientific
   module error" on any rejection, so before this change no terminal could have shown a result.
2. **Where each retired field went, without changing what it means:**
   - Exact numbers (purities, Bloch components, branch probability, agreements) now go in
     `observables`.
   - Verdicts (copy or not, the rule asked for) now go in `facts`. Whether a choice follows the
     rule is computed by the UI's `correctionsMatch` (vision §10.6), not by the engine.
   - The sampled selected-backend tallies stay in `counts` and `facts`. They never go in
     `observables`, which the contract describes as exact.
   - The relay's probability table is now the **receiver-only** marginal (`keyQubits [1]`). The
     joint table changes with the sender's X, so a UI that showed it would look like signalling.
3. **Source vs copy (cloning), and sender vs receiver (relay), cannot be distinguished on the real
   circuits, by any output.** `a|00>+b|11>` is invariant under swapping the qubits, so both reduced
   states equal `diag(|a|²,|b|²)` for every catalogue state. On the Bell pair, both marginals are I/2
   and `(X⊗I)Φ+ = (I⊗X)Φ+`. The tests now include positive controls that disable the CNOT, which breaks
   the symmetry. All three sabotage nulls from [[Reports/quantum-engine-g1]] are now red.
4. **The contract cannot honestly label the one selected-backend job.** Its union is
   `cloning | bell_signalling | teleportation`. Vision §10.7 forbids presenting the Bell check as
   teleportation, and it is not the relay puzzle. Vision §8.4 itself requires
   `verifySelectedBackendOnce(): ExperimentResult`. Requested from platform: add `'bell_verification'`.
