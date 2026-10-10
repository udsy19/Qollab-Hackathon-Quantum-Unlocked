---
type: design
status: proposed
date: 2026-10-09
updated: 2026-10-09
owner: quantum-core (quantum lane); final schema belongs to the platform lane
---

# ExperimentResult contract: what the quantum engine returns to JS

**Status:** proposed. Implemented by `echo/quantum/formats.py` on branch `lane/quantum/quantum-core`.
The platform lane owns the shared schema; this note proposes it, it does not decide it.
**Answers:** mission [[echo-hackathon-submission]], Plan row 4 (G1 quantum accuracy).

## Problem

Three terminals (the booth, the relay, the rooftop) and the Declassified panel all show Qiskit
results. Vision §8.4 sketches `ExperimentResult`, but it has no place for experiment-specific
outputs such as purities, the receiver marginal or the branch probability. It does not say how the
deferred-measurement check is labelled. It does not say how Python values survive Pyodide's
`.toJs()`.

## Prior art here

`node scripts/where.mjs cloning --branches` (2026-10-09) found no implementation on main or on any
lane branch. Only the vision docs mention the engine. The schema below keeps every §8.4 field name
verbatim.

## Design

### Fields

| field | type | from | reason |
|---|---|---|---|
| `experiment` | `'cloning' \| 'bell_signalling' \| 'teleportation'` | §8.4 | |
| `engine` | `'exact_qiskit_local' \| 'qollab_selected_backend' \| 'documented_preview'` | §8.4 | every puzzle result here is `exact_qiskit_local` |
| `circuitDescription` | string | §8.4 | names the registers explicitly (q0 = source …) |
| `qubits` | int | §8.4 | |
| `parameters` | flat dict of str/number/bool | §8.4 | the inputs the call was made with |
| `probabilities` | `{label: number}`, sums to 1 | §8.4 | **exact** only; labels are explicit (`"m0=1,m1=0"`, `"sender=0,receiver=1"`, `"source=1,copy=1"`), never raw Qiskit bitstrings |
| `counts` | `{label: int}` | §8.4 | **sampled** only. The builder refuses `counts` with `exact_qiskit_local`, refuses `probabilities` with `qollab_selected_backend`, and refuses both together |
| `fidelity` | number | §8.4 | the Qiskit `state_fidelity`, never derived from the rule |
| `facts` | string[] (non-empty) | §8.4 | player-facing explanations, computed from the numbers |
| `measurementBits` | `{m0: 0\|1, m1: 0\|1}` | §8.4 | m0 = source readout, m1 = Alice's Bell-half readout |
| `createdAt` | string, optional | §8.4 | not set by the engine (results stay deterministic); JS may stamp it |
| **`kind`** | string | **added** | separates results that share `experiment`: `naive_cnot_clone`, `receiver_marginal`, `bell_measurement_sample`, `branch_model`, `live_commit`, `corrections_withheld`, `deferred_measurement_verification`. The UI must label `deferred_measurement_verification` as a mathematical check, never as a link |
| **`circuitText`** | string, optional | **added** | `qc.draw(output="text")` for Declassified |
| **`details`** | dict | **added** | experiment-specific outputs (below). Kept apart from `parameters` so inputs and outputs never mix |

All floats are rounded to 10 decimals and `-0.0` becomes `0.0`. numpy scalars are converted. The
builder raises on complex, NaN/inf, any non-str key or any object, and on a short list of forbidden
claims (vision §2.4, §7.5).

### `details` by kind

- `naive_cnot_clone`: `sourcePurity`, `copyPurity`, `sourceFidelity`, `copyFidelity`,
  `jointFidelityWithTwoCopies`, `isTwoIndependentCopies` (derived from the state, not the name),
  `isEntangled`, `amplitudes` (`{label: [re, im]}`).
- `receiver_marginal`: `receiverMarginal` `{"0","1"}`, `receiverPurity`, `receiverBlochVector`,
  `zBasisAgreement`, `xBasisAgreement`.
- `bell_measurement_sample`: `shots: 1`, `seed`.
- `branch_model`: `branchProbability`, `expectedCorrections`, `choiceFollowsRule`,
  `receiverBlochVector`, `sourceFidelityAfterMeasurement`.
- `live_commit`: `shots: 1`, `seed`, `appliedCorrections`, `branchProbability`,
  `sourceFidelityAfterMeasurement`.
- `corrections_withheld`: `receiverAverageState` `{re: 2x2, im: 2x2}`, `receiverBlochVector`,
  `receiverPurity`.
- `deferred_measurement_verification`: `receiverBlochVector`.

### Calls (vision §8.4 `QuantumEngine` → Python)

| §8.4 | Python |
|---|---|
| `cloneTest(state)` | `quantum.cloning.run_calibration(state)` |
| `bellSignalling(gate)` | `quantum.entanglement.bell_signalling(gate)` |
| `teleportDryRun(stateId, X, Z)` | `quantum.teleportation.bell_measurement(stateId)` gives the bits, then `teleport_branch(stateId, m0, m1, X, Z)` |
| (commit) | `quantum.teleportation.live_commit(tokenState)`: call it **once** per story token |
| (Declassified) | `corrections_withheld(state)`, `verify_deferred(state, controlled_x, controlled_z)` |
| `verifySelectedBackendOnce()` | `quantum/qollab_job.py` (a different worker) |

State ids are `zero`, `one`, `plus`, `minus`, `phase`, `bloch_a` (RY 1.137, then RZ 0.44) and
`bloch_b` (RY 2.3, then RZ -1.9).

**JS side:** convert with `.toJs({dict_converter: Object.fromEntries})`. A bare `.toJs()` turns every
dict into a JS `Map` (Pyodide's default). This has not been checked on Qollab; see
`echo/tests/smoke_plan.md`.

### One example per experiment

The full JSON is in `evidence/quantum-core/transcript.txt`. Abridged:

```json
{"experiment":"cloning","engine":"exact_qiskit_local","kind":"naive_cnot_clone","qubits":2,
 "parameters":{"state":"plus"},
 "probabilities":{"source=0,copy=0":0.5,"source=1,copy=0":0.0,"source=0,copy=1":0.0,"source=1,copy=1":0.5},
 "details":{"sourcePurity":0.5,"copyPurity":0.5,"jointFidelityWithTwoCopies":0.5,"isTwoIndependentCopies":false,"isEntangled":true}}
{"experiment":"bell_signalling","engine":"exact_qiskit_local","kind":"receiver_marginal","qubits":2,
 "parameters":{"senderGate":"X"},
 "probabilities":{"sender=0,receiver=0":0.0,"sender=1,receiver=0":0.5,"sender=0,receiver=1":0.5,"sender=1,receiver=1":0.0},
 "details":{"receiverMarginal":{"0":0.5,"1":0.5},"zBasisAgreement":0.0,"xBasisAgreement":1.0}}
{"experiment":"teleportation","engine":"exact_qiskit_local","kind":"branch_model","qubits":3,
 "parameters":{"state":"bloch_a","m0":1,"m1":0,"applyX":false,"applyZ":false},
 "measurementBits":{"m0":1,"m1":0},"fidelity":0.176668…,
 "details":{"branchProbability":0.25,"expectedCorrections":{"applyX":false,"applyZ":true},"choiceFollowsRule":false}}
```

## Verification

`echo/tests/test_formats.py` checks every public call (150 results) with an exact type census,
`json.dumps(allow_nan=False)` and a round-trip. It checks that no result carries both
`probabilities` and `counts`, and it scans every string against its own forbidden-phrase list. The
builder's refusals are tested one by one. The sabotage round is `evidence/quantum-core/sabotage.md`.

## Out of scope

The single selected-backend job (`qollab_job.py`); JS adapter code; the UI copy.
