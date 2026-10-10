| mutation | breaks | pytest -x exit / tail | derive.py | suite verdict |
|---|---|---|---|---|
| `z-iff-m1` | rule: Z iff m1, X iff m0 | 1 `1 failed, 346 passed in 2.21s` | red | RED |
| `live-commit-swapped` | live_commit alone applies the swapped rule | 1 `1 failed, 408 passed in 2.59s` | red | RED |
| `no-bell-cx` | Bell measurement drops CX(q0,q1) | 1 `1 failed, 16 passed in 0.28s` | red | RED |
| `no-bellpair-h` | Bell pair prepared without H(q1) | 1 `1 failed, 16 passed in 0.31s` | red | RED |
| `deferred-cz-wrong-control` | deferred CZ controlled by q1 | 1 `1 failed, 547 passed in 2.95s` | red | RED |
| `deferred-cx-wrong-control` | deferred CX controlled by q0 | 1 `1 failed, 545 passed in 3.15s` | red | RED |
| `correction-order-ZX` | Bob applies Z before X (global phase: true null) | 0 `587 passed in 3.71s` | green | **NULL (green)** |
| `correction-as-Y` | X+Z replaced by Y (global phase: true null) | 0 `587 passed in 3.77s` | green | **NULL (green)** |
| `sampler-hardcoded-uniform` | sampler ignores Qiskit, uses 1/4 (F5) | 1 `1 failed, 309 passed in 1.96s` | green | RED |
| `source-left-is-bob` | sourceFidelityAfterMeasurement reads Bob | 1 `1 failed, 422 passed in 3.49s` | red | RED |
| `bob-bloch-uncorrected` | receiver Bloch reported BEFORE the correction (F1) | 1 `1 failed, 346 passed in 2.39s` | red | RED |
| `bloch-y-sign` | bloch_vector flips <Y> (F1) | 1 `1 failed, 346 passed in 2.37s` | red | RED |
| `prep-order-rz-first` | generic states prepared RZ then RY | 1 `1 failed, 344 passed in 2.06s` | red | RED |
| `withheld-one-branch` | corrections_withheld reports branch 00, not the average | 1 `1 failed, 538 passed in 3.35s` | red | RED |
| `clone-blank-is-plus` | blank copy starts in |+> | 1 `1 failed in 0.26s` | red | RED |
| `clone-by-purity` | copy verdict from source purity (correct physics, other route: control) | 0 `587 passed in 3.91s` | green | **NULL (green)** |
| `clone-loose-threshold` | copy verdict threshold 0.4 | 1 `1 failed, 2 passed in 0.25s` | green | RED |
| `clone-by-name-variant` | copy verdict from a name list incl. the tests' names (F6) | 1 `1 failed, 310 passed in 2.05s` | green | RED |
| `clone-by-name-prefix` | copy verdict from name patterns (F6, widened) | 1 `1 failed, 310 passed in 2.04s` | green | RED |
| `relay-partial-bell` | relay pair is RY(pi/3), not H | 1 `1 failed, 22 passed in 0.93s` | red | RED |
| `relay-xagree-one-H` | X-basis comparison rotates only the sender | 1 `1 failed, 29 passed in 0.96s` | red | RED |
| `relay-sender-Z-on-receiver` | sender's Z on the receiver (true null: (Z⊗I)Φ+=(I⊗Z)Φ+) | 0 `587 passed in 3.99s` | green | **NULL (green)** |
| `job-endianness` | count keys read leftmost char as clbit 0 | 1 `1 failed, 312 passed in 3.29s` | green | RED |
| `job-hand-built-dict` | interpret_counts bypasses the guarded builder (F7) | 1 `1 failed, 16 passed in 1.05s` | green | RED |
| `token-angles-in-parameters` | ruling 2: live_commit leaks the token's angles in parameters | 1 `1 failed, 16 passed in 0.78s` | red | RED |
| `token-bloch-in-observables` | ruling 2: live_commit reports the token's receiver Bloch vector | 1 `1 failed, 406 passed in 9.27s` | green | RED |
| `token-accepted-for-calibration` | ruling 2: the token can be used as a dry-run state | 1 `1 failed, 401 passed in 2.94s` | green | RED |
| `token-label-shows-angles` | ruling 2: the token's catalogue label carries its angles | 1 `1 failed, 400 passed in 2.68s` | green | RED |
| `second-commit-allowed` | ruling 8: a second live_commit in one run is allowed | 1 `1 failed, 409 passed in 2.89s` | green | RED |
| `consumed-on-error` | ruling 8: token marked consumed BEFORE the computation | 1 `1 failed, 411 passed in 2.79s` | green | RED |
| `reset-does-nothing` | ruling 8: reset_story_token() leaves the latch set | 1 `1 failed, 16 passed in 0.39s` | red | RED |
| `calibration-not-generic` | ruling 1: the draw can return a near-axis point | 1 `1 failed, 16 passed in 0.28s` | red | RED |
| `calibration-generic-check-off` | ruling 1: corrections call accepts non-generic angles | 1 `1 failed, 387 passed in 2.65s` | green | RED |
| `calibration-hidden-state` | ruling 1: corrections call ignores the passed angles (module state) | 1 `1 failed, 386 passed in 2.62s` | red | RED |
| `calibration-fixed-state` | ruling 1: every dry run uses the same calibration point | 1 `1 failed, 344 passed in 2.21s` | green | RED |
| `m1-label-old` | ruling 5: m1 labelled 'local Bell-half readout' (old label) | 1 `1 failed, 414 passed in 2.92s` | green | RED |
| `backend-experiment-old` | ruling 6: experiment value bell_verification | 1 `1 failed, 16 passed in 0.36s` | green | RED |
| `relay-exact-label-dropped` | ruling 7: relay receiver panel loses its EXACT label | 1 `1 failed, 416 passed in 3.27s` | green | RED |
| `relay-counts-for-receiver` | ruling 7: relay result carries sampled counts for the receiver | 1 `1 failed, 16 passed in 0.29s` | red | RED |
| `fidelity-text-measured` | F4: fidelity text loses 'computed exactly' | 1 `1 failed, 307 passed in 1.15s` | green | RED |
| `source-fact-false-cause` | F3: basis source fact restores the false cause | 1 `1 failed, 305 passed in 1.36s` | green | RED |

41 mutations, 37 red, 4 null, 0 refused
