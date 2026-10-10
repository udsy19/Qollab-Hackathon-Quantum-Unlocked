| part | sabotage | what | validator path | verdict | first message |
|---|---|---|---|---|---|
| A contract | `control_phase2` | real phase-2 result (1,0) Z-only, theta/phi keyed | dry run | control ok | passed=true |
| A contract | `control_CLONE_INTRO` | real cloning result | generic | control ok | valid |
| A contract | `control_RELAY_BELL_CREATED` | real bell_signalling result | generic | control ok | valid |
| A contract | `control_TELEPORT_DRY_RUN_PASSED` | real teleportation result | generic | control ok | valid |
| A contract | `m0m1_swapped_in_bits` | measurementBits swapped (m0↔m1) in the result, request unchanged | dry run | caught | phase-2 result measurementBits {"m0":0,"m1":1} are not the requested m0=1, m1=0 |
| A contract | `m0m1_swapped_consistently` | engine labels source readout m1 throughout (bits + params + request built from them) | dry run | caught | phase-2 result fidelity 1 disagrees with the physics of this branch and choice (expected 0.149372599) |
| A contract | `m0m1_swapped_commit` | story commit result with m0↔m1 swapped (no commit validator exists) | commit | **NULL** | validateExperimentResult: valid |
| A contract | `branch_keyqubits_reversed` | branch table keyQubits [1,0] → [0,1] (keys still m1m0) | generic | **NULL** | validateExperimentResult: valid |
| A contract | `cloning_keyqubits_reversed` | cloning table keyQubits [1,0] → [0,1] on |0>⊗... (keys 00..11) | generic | **NULL** | validateExperimentResult: valid |
| A contract | `preview_with_counts` | documented_preview result carrying counts | generic | caught | counts are sampled shots and only allowed under engine qollab_selected_backend, not string "documented_preview" |
| A contract | `preview_with_counts_in_observables` | documented_preview smuggling shot counts as observables | generic | **NULL** | validateExperimentResult: valid |
| A contract | `missing_keyqubits_probs` | probabilities without keyQubits | generic | caught | keyQubits must list distinct qubit indices in [0, qubits) naming each key character left to right, got nothing |
| A contract | `missing_keyqubits_counts` | backend counts without keyQubits | generic | caught | keyQubits must list distinct qubit indices in [0, qubits) naming each key character left to right, got nothing |
| A contract | `fidelity_0_9_dry_run` | dry run: rule followed, fidelity 0.9, facts say PASS | dry run | caught | phase-2 result fidelity 0.9 disagrees with the physics of this branch and choice (expected 1.000000000) |
| A contract | `fidelity_0_9_commit` | story commit: fidelity 0.9, facts say transfer complete | commit | **NULL** | validateExperimentResult: valid |
| A contract | `fidelity_0_9_cloning_basis` | cloning |0>: joint fidelity 0.9 yet "two copies" | generic | **NULL** | validateExperimentResult: valid |
| A contract | `wrong_choice_reported_1` | dry run: wrong choice (X+Z on bits 1,0) reported fidelity 1 | dry run | caught | phase-2 result fidelity 1 disagrees with the physics of this branch and choice (expected 0.673959742) |
| B qollab-caps | `control` | merged echo/ unmodified | static | baseline exit 1 | RED: 4 failure(s) across 3 rule(s): backend-run-python, hardcoded-backend, hardcoded-secret |
| B qollab-caps | `second_js_site` | a second backend.run in a new game/ module | static | caught | echo/game/verify2.js:2 backend-run-count backend.run call site 1 of 2 in echo/**/*.js; at most one is allowed (a second job stops the run on IonQ) |
| B qollab-caps | `aliased_js_site` | const b = backend; b.run(...) | static | **NULL** | no finding names echo/game/alias.js (exit 1) |
| B qollab-caps | `destructured_js_site` | const { run } = backend; run(...) | static | **NULL** | no finding names echo/game/destructure.js (exit 1) |
| B qollab-caps | `bracket_js_site` | backend['run'](...) | static | caught | echo/game/bracket.js:1 backend-run-count backend.run call site 1 of 2 in echo/**/*.js; at most one is allowed (a second job stops the run on IonQ) |
| B qollab-caps | `loop_one_site` | ONE site called in a loop (two jobs at runtime) | static | caught | echo/game/loop.js:2 backend-run-count backend.run call site 1 of 2 in echo/**/*.js; at most one is allowed (a second job stops the run on IonQ) |
| B qollab-caps | `second_python_site` | a second backend.run in Python | static | caught | echo/quantum/extra.py:2 backend-run-python Python calls backend.run itself; only JS may, unless the owner rules otherwise |
| B qollab-caps | `python_getattr_site` | getattr(backend, "run")(...) in Python | static | **NULL** | no finding names echo/quantum/extra2.py (exit 1) |

20 sabotages; NULLS (9): m0m1_swapped_commit, branch_keyqubits_reversed, cloning_keyqubits_reversed, preview_with_counts_in_observables, fidelity_0_9_commit, fidelity_0_9_cloning_basis, aliased_js_site, destructured_js_site, python_getattr_site
exit 0
