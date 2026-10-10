# Sabotage round — echo/quantum

Produced by `evidence/quantum-core/sabotage_round.py` (python 3.13.0).
Unmutated suite: exit 0 — `363 passed in 0.67s`

| mutation | breaks | pytest exit | verdict | summary |
|---|---|---|---|---|
| `rule-swap-xz` | X/Z <-> m0/m1 mapping swapped in the correction rule | 1 | RED (caught) | 30 failed, 333 passed in 0.82s |
| `bit-label-swap` | m0/m1 swapped when projecting the Bell measurement | 1 | RED (caught) | 52 failed, 311 passed in 0.86s |
| `no-bell-H` | H(q0) removed from the Bell measurement | 1 | RED (caught) | 284 failed, 79 passed in 3.02s |
| `trace-wrong-qubit-branch` | branch model keeps Alice's half instead of Bob | 1 | RED (caught) | 101 failed, 262 passed in 1.07s |
| `trace-wrong-qubit-withheld` | corrections-withheld keeps the source instead of Bob | 1 | RED (caught) | 4 failed, 359 passed in 0.88s |
| `trace-wrong-qubit-deferred` | deferred check keeps the source instead of Bob | 1 | RED (caught) | 22 failed, 341 passed in 0.83s |
| `hardcoded-fidelity-branch` | branch model returns fidelity 1.0 regardless | 1 | RED (caught) | 64 failed, 299 passed in 0.94s |
| `hardcoded-fidelity-deferred` | deferred check returns fidelity 1.0 regardless | 1 | RED (caught) | 17 failed, 346 passed in 0.79s |
| `deferred-no-cz` | deferred check drops the coherent Z correction | 1 | RED (caught) | 14 failed, 349 passed in 0.80s |
| `sampler-order-swap` | sampler walks branches in a different order than labelled | 1 | RED (caught) | 2 failed, 361 passed in 0.80s |
| `trace-wrong-qubit-cloning` | cloning reports the source twice instead of source and copy | 0 | **NULL — stayed green** | 363 passed in 0.73s |
| `clone-by-name` | isTwoIndependentCopies looked up by name (the §10.3 trap) | 1 | RED (caught) | 1 failed, 362 passed in 0.76s |
| `clone-no-cx` | duplicator CNOT removed | 1 | RED (caught) | 13 failed, 350 passed in 0.77s |
| `trace-wrong-qubit-receiver` | relay reports the sender's marginal instead of the receiver's | 0 | **NULL — stayed green** | 363 passed in 0.74s |
| `sender-gate-on-receiver` | sender's X applied to the receiver's qubit | 0 | **NULL — stayed green** | 363 passed in 0.72s |
| `formats-allow-complex` | builder lets complex/objects through | 1 | RED (caught) | 3 failed, 360 passed in 0.80s |
| `formats-allow-counts-exact` | exact results may carry shot counts | 1 | RED (caught) | 1 failed, 362 passed in 0.77s |
| `formats-no-phrase-guard` | forbidden-claim guard removed | 1 | RED (caught) | 1 failed, 362 passed in 0.78s |
| `formats-no-rounding-plain` | numpy ints leak through unconverted | 1 | RED (caught) | 1 failed, 362 passed in 0.78s |

19 mutations, 3 null(s).
