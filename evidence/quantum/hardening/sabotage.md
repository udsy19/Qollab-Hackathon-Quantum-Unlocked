| mutation | breaks | pytest -x exit / tail | derive.py | suite verdict |
|---|---|---|---|---|
| `z-iff-m1` | rule: Z iff m1, X iff m0 | 1 `1 failed, 347 passed in 4.31s` | red | RED |
| `live-commit-swapped` | live_commit alone applies the swapped rule | 1 `1 failed, 410 passed in 4.01s` | red | RED |
| `no-bell-cx` | Bell measurement drops CX(q0,q1) | 1 `1 failed, 16 passed in 0.48s` | red | RED |
| `no-bellpair-h` | Bell pair prepared without H(q1) | 1 `1 failed, 16 passed in 0.81s` | red | RED |
| `deferred-cz-wrong-control` | deferred CZ controlled by q1 | 1 `1 failed, 555 passed in 9.37s` | red | RED |
| `deferred-cx-wrong-control` | deferred CX controlled by q0 | 1 `1 failed, 553 passed in 7.29s` | red | RED |
| `correction-order-ZX` | Bob applies Z before X (global phase: true null) | 0 `595 passed in 5.85s` | green | **NULL (green)** |
| `correction-as-Y` | X+Z replaced by Y (global phase: true null) | 0 `595 passed in 7.85s` | green | **NULL (green)** |
| `sampler-hardcoded-uniform` | sampler ignores Qiskit, uses 1/4 (F5) | 1 `1 failed, 310 passed in 5.10s` | green | RED |
| `source-left-is-bob` | sourceFidelityAfterMeasurement reads Bob | 1 `1 failed, 430 passed in 5.98s` | red | RED |
| `bob-bloch-uncorrected` | receiver Bloch reported BEFORE the correction (F1) | 1 `1 failed, 347 passed in 2.92s` | red | RED |
| `bloch-y-sign` | bloch_vector flips <Y> (F1) | 1 `1 failed, 347 passed in 3.94s` | red | RED |
| `prep-order-rz-first` | generic states prepared RZ then RY | 1 `1 failed, 22 passed in 1.44s` | red | RED |
| `withheld-one-branch` | corrections_withheld reports branch 00, not the average | 1 `1 failed, 546 passed in 7.11s` | red | RED |
| `clone-blank-is-plus` | blank copy starts in |+> | 1 `1 failed in 0.55s` | red | RED |
| `clone-by-purity` | copy verdict from source purity (correct physics, other route: control) | 0 `595 passed in 7.93s` | green | **NULL (green)** |
| `clone-loose-threshold` | copy verdict threshold 0.4 | 1 `1 failed, 2 passed in 0.29s` | green | RED |
| `clone-by-name-variant` | copy verdict from a name list incl. the tests' names (F6) | 1 `1 failed, 311 passed in 3.26s` | green | RED |
| `clone-by-name-prefix` | copy verdict from name patterns (F6, widened) | 1 `1 failed, 311 passed in 2.91s` | green | RED |
| `relay-partial-bell` | relay pair is RY(pi/3), not H | 1 `1 failed, 23 passed in 1.45s` | red | RED |
| `relay-xagree-one-H` | X-basis comparison rotates only the sender | 1 `1 failed, 30 passed in 1.91s` | red | RED |
| `relay-sender-Z-on-receiver` | sender's Z on the receiver (true null: (Z⊗I)Φ+=(I⊗Z)Φ+) | 0 `595 passed in 5.58s` | green | **NULL (green)** |
| `job-endianness` | count keys read leftmost char as clbit 0 | 1 `1 failed, 313 passed in 2.87s` | green | RED |
| `job-hand-built-dict` | interpret_counts bypasses the guarded builder (F7) | 1 `1 failed, 16 passed in 1.27s` | green | RED |
| `token-angles-in-parameters` | ruling 2: live_commit leaks the token's angles in parameters | 1 `1 failed, 16 passed in 0.81s` | red | RED |
| `token-bloch-in-observables` | ruling 2: live_commit reports the token's receiver Bloch vector | 1 `1 failed, 408 passed in 3.92s` | green | RED |
| `token-accepted-for-calibration` | ruling 2: the token can be used as a dry-run state | 1 `1 failed, 403 passed in 5.18s` | green | RED |
| `token-label-shows-angles` | ruling 2: the token's catalogue label carries its angles | 1 `1 failed, 402 passed in 3.66s` | green | RED |
| `second-commit-allowed` | ruling 8: a second live_commit in one run is allowed | 1 `1 failed, 411 passed in 4.10s` | green | RED |
| `consumed-on-error` | ruling 8: token marked consumed BEFORE the computation | 1 `1 failed, 413 passed in 2.94s` | green | RED |
| `reset-does-nothing` | ruling 8: reset_story_token() leaves the latch set | 1 `1 failed, 16 passed in 0.39s` | red | RED |
| `parameters-rounded` | contract: dry-run parameters rounded, so the requested angles do not round-trip | 1 `1 failed, 22 passed in 1.66s` | green | RED |
| `calibration-not-generic` | ruling 1: the draw can return a near-axis point | 1 `1 failed, 22 passed in 1.46s` | red | RED |
| `calibration-generic-check-off` | ruling 1: corrections call accepts non-generic angles | 1 `1 error in 0.11s` | red | RED |
| `calibration-hidden-state` | ruling 1: corrections call ignores the passed angles (module state) | 1 `1 failed, 22 passed in 1.90s` | red | RED |
| `calibration-fixed-state` | ruling 1: every dry run uses the same calibration point | 1 `1 failed, 345 passed in 5.66s` | green | RED |
| `m1-label-old` | ruling 5: m1 labelled 'local Bell-half readout' (old label) | 1 `1 failed, 420 passed in 6.93s` | green | RED |
| `backend-experiment-old` | ruling 6: experiment value bell_verification | 1 `1 failed, 16 passed in 0.56s` | green | RED |
| `relay-exact-label-dropped` | ruling 7: relay receiver panel loses its EXACT label | 1 `1 failed, 417 passed in 4.67s` | green | RED |
| `relay-counts-for-receiver` | ruling 7: relay result carries sampled counts for the receiver | 1 `1 failed, 16 passed in 0.81s` | red | RED |
| `fidelity-text-measured` | F4: fidelity text loses 'computed exactly' | 1 `1 failed, 308 passed in 1.51s` | green | RED |
| `source-fact-false-cause` | F3: basis source fact restores the false cause | 1 `1 failed, 306 passed in 1.14s` | green | RED |

42 mutations, 38 red, 4 null, 0 refused
