# Sabotage round — after contract conformance

Produced by `evidence/quantum/contract-conformance/sabotage_round.py` (python 3.13.0), contracts.js = `/tmp/cc-conf/contracts.js`.
Unmutated suite: exit 0 — `453 passed in 1.26s`

| set | mutation | breaks | pytest exit | verdict | summary |
|---|---|---|---|---|---|
| quantum-core | `rule-swap-xz` | X/Z <-> m0/m1 mapping swapped in the correction rule | 1 | RED (caught) | 58 failed, 395 passed in 1.43s |
| quantum-core | `bit-label-swap` | m0/m1 swapped when projecting the Bell measurement | 1 | RED (caught) | 52 failed, 401 passed in 1.49s |
| quantum-core | `no-bell-H` | H(q0) removed from the Bell measurement | 1 | RED (caught) | 320 failed, 133 passed in 3.58s |
| quantum-core | `trace-wrong-qubit-branch` | branch model keeps Alice's half instead of Bob | 1 | RED (caught) | 101 failed, 352 passed in 1.56s |
| quantum-core | `trace-wrong-qubit-withheld` | corrections-withheld keeps the source instead of Bob | 1 | RED (caught) | 4 failed, 449 passed in 1.27s |
| quantum-core | `trace-wrong-qubit-deferred` | deferred check keeps the source instead of Bob | 1 | RED (caught) | 22 failed, 431 passed in 1.33s |
| quantum-core | `hardcoded-fidelity-branch` | branch model returns fidelity 1.0 regardless | 1 | RED (caught) | 64 failed, 389 passed in 1.41s |
| quantum-core | `hardcoded-fidelity-deferred` | deferred check returns fidelity 1.0 regardless | 1 | RED (caught) | 17 failed, 436 passed in 1.27s |
| quantum-core | `deferred-no-cz` | deferred check drops the coherent Z correction | 1 | RED (caught) | 14 failed, 439 passed in 1.28s |
| quantum-core | `sampler-order-swap` | sampler walks branches in a different order than labelled | 1 | RED (caught) | 2 failed, 451 passed in 1.27s |
| quantum-core | `trace-wrong-qubit-cloning` | cloning reports the source twice instead of source and copy | 1 | RED (caught) | 1 failed, 452 passed in 1.23s |
| quantum-core | `clone-by-name` | isTwoIndependentCopies looked up by name (the §10.3 trap) | 1 | RED (caught) | 1 failed, 452 passed in 1.43s |
| quantum-core | `clone-no-cx` | duplicator CNOT removed | 1 | RED (caught) | 13 failed, 440 passed in 1.29s |
| quantum-core | `trace-wrong-qubit-receiver` | relay reports the sender's marginal instead of the receiver's | 1 | RED (caught) | 1 failed, 452 passed in 1.27s |
| quantum-core | `sender-gate-on-receiver` | sender's X applied to the receiver's qubit | 1 | RED (caught) | 1 failed, 452 passed in 1.24s |
| quantum-core | `formats-allow-complex` | builder lets complex/objects through | 1 | RED (caught) | 4 failed, 449 passed in 1.25s |
| quantum-core | `formats-allow-counts-exact` | exact results may carry shot counts | 1 | RED (caught) | 1 failed, 452 passed in 1.25s |
| quantum-core | `formats-no-phrase-guard` | forbidden-claim guard removed | 1 | RED (caught) | 1 failed, 452 passed in 1.25s |
| quantum-core | `formats-no-rounding-plain` | numpy ints leak through unconverted | 1 | RED (caught) | 1 failed, 452 passed in 1.24s |
| contract | `builder-readds-kind` | builder emits a field the contract does not know | 1 | RED (caught) | 3 failed, 450 passed in 1.22s |
| contract | `cloning-keyqubits-reversed` | cloning declares keyQubits [0, 1] (valid shape, wrong qubit order) | 1 | RED (caught) | 7 failed, 446 passed in 1.26s |
| contract | `teleport-keyqubits-reversed` | branch table declares m0 on the left (valid shape, wrong qubit order) | 1 | RED (caught) | 112 failed, 341 passed in 1.64s |
| contract | `relay-shows-joint-table` | relay shows the joint table (which changes with X) instead of the receiver-only view | 1 | RED (caught) | 5 failed, 448 passed in 1.24s |
| contract | `job-bypasses-builder-summary` | selected-backend result re-grows the retired summary field | 1 | RED (caught) | 2 failed, 451 passed in 1.23s |
| contract | `observable-allows-bool` | builder lets a boolean verdict into observables (paired with the next mutation's use) | 1 | RED (caught) | 2 failed, 451 passed in 1.24s |
| contract | `verdict-as-observable` | cloning puts a boolean verdict in observables | 1 | RED (caught) | 4 failed, 449 passed in 1.24s |
| contract | `withheld-drops-bloch` | corrections-withheld drops the Bloch vector that fixes Bob's state | 1 | RED (caught) | 7 failed, 446 passed in 1.31s |
| gate | `validator-accepts-everything` | contracts.js replaced by a stub returning [] | 1 | RED (caught) | 1 failed, 5 passed in 0.57s |

28 mutations, 0 null(s).
