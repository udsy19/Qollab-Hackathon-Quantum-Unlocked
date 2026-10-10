---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---

# The quantum bridge running in Pyodide (local runner)

Measured: `echo/quantum/bridge.js` driving the quantum engine inside platform's **local Qollab-like runner**. The runner (`lane/platform/g0-runner-smoke` e2f0ab6) uses Pyodide **314.0.7**, Python **3.14.2** on `emscripten` and Qollab's Qiskit **2.5.2** wasm wheel, in headless Chrome 155. The engine came from `lane/quantum/contract-conformance` 42703f1, the validator from `lane/platform/integration` `echo/contracts.js`, and the harness from commit dffd4f5. **Local runner, not Qollab or IonQ.** Evidence: `evidence/quantum/pyodide-bridge/out/` (SUMMARY.md, `final-{1,2,3}-dump.json`).

## Which Qiskit calls worked in the runner's Pyodide

Every engine entry point the game needs ran and returned contract-valid results, with values matching closed forms re-derived in Node:
- `cloning.run_calibration`: plus, zero, one, bloch_a.
- `entanglement.bell_signalling`: I, X, Z.
- `teleportation.bell_measurement`, `teleport_branch` (all four X/Z choices) and `live_commit`.
- `qollab_job.run_bell_verification_once`, through `.callPromising(backend)`.

This settles the residual risk in [[quantum-physics-review]] §5 for these paths, in the runner. The following all ran in Pyodide: `Statevector`, `DensityMatrix`, `partial_trace`, `state_fidelity`, `.ry/.rz/.s/.cz`, `.probabilities(qargs)`, `.purity()`, `.expectation_value(Pauli)`.

## Timings (three consecutive runs, fresh browser profile each)

| | run 1 | run 2 | run 3 |
|---|---|---|---|
| frame start → main.js body (Pyodide + wheel install + runtime preamble + imports) | 9260 ms | 5868 ms | 5338 ms |
| bridge's own Python imports (`quantum.*`, measured in Python) | 3 ms | 3 ms | 3 ms |
| first adapter call (`cloneTest('plus')`) | 5.2 ms | 6.6 ms | 5.1 ms |
| median adapter call | 1.5 ms | 1.6 ms | 1.7 ms |
| `verifySelectedBackendOnce` (BasicSimulator, 256 shots) | 5.5 ms | 6.1 ms | 5.2 ms |

Qiskit is already imported by the runtime preamble (`from qiskit.providers.basic_provider import BasicSimulator`). The bridge's static imports therefore add only about 3 ms. The multi-second wait comes before main.js runs at all, and the game cannot avoid it.

## Findings that change what other notes say

1. **A bare `toJs()` does NOT give a Map on Pyodide 314.0.7.** A dict holding a dict and a list converts to a plain `Object`, nested dicts included (`toJsDefault` in every dump). [[qollab-backend-from-js-projects]] Q2, `echo/CONTRACTS.md` and vision §10.2 assume the older Map default. `dict_converter: Object.fromEntries` stays in the bridge as a version guard: it costs nothing. A sabotage that removes it is therefore a measured **null**. Dropping `toJs` altogether is red on every adapter: the validator says "got a PyProxy object".
2. **The runner's `backend.run calls` counter cannot see a job submitted from Python.** The counter reads 0 while a 256-shot job ran; the runtime's own Probabilities panel shows its counts. The counter lives in a JS Proxy, and Pyodide unwraps the Proxy to the Python object when the backend is passed through `callPromising`. The runner's `ionq-mock` one-job refusal is bypassed the same way. Counting has to happen below the bridge (`pb_spy.py` wraps `BasicSimulator.run`).
3. **Validator verdict on the selected-backend result:** `experiment must be one of cloning|bell_signalling|teleportation, got string "bell_verification"`. The owner ruled `backend_verification`, and platform's `EXPERIMENTS` lacks it. The bridge rejects the result with §8.6's message. It never passes it on. *Superseded 2026-10-10 by [[bridge-rewire]]: the engine now emits `backend_verification`, and the job resolves.*
4. One harness run out of 11 hung: no verdict in 300 s, and the cause was not established. Re-running the same assembly finished in 6 s.

## Related
- [[quantum-physics-review]], [[contract-conformance]], [[qollab-backend-from-js-projects]], [[experiment-result-contract]]
