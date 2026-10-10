| row | quest state | expected (docs) | v2 valid | as-built: event → state | as-built | on-v2 | on-v2+shim | F engine | F oracle | first v2 error / refusal |
|---|---|---|---|---|---|---|---|---|---|---|
| clone:zero | CLONE_INTRO | BASIS_DEMO_OK | VALID | none → CLONE_INTRO | FAIL-STUCK | FAIL-STUCK | PASS |  |  | need a basis-state copy that succeeded |
| clone:zero | CLONE_BASIS_PASSED | — | VALID | none → CLONE_BASIS_PASSED | PASS | PASS | PASS |  |  | need a superposition copy attempt |
| clone:one | CLONE_INTRO | BASIS_DEMO_OK | VALID | none → CLONE_INTRO | FAIL-STUCK | FAIL-STUCK | PASS |  |  | need a basis-state copy that succeeded |
| clone:one | CLONE_BASIS_PASSED | — | VALID | none → CLONE_BASIS_PASSED | PASS | PASS | PASS |  |  | need a superposition copy attempt |
| clone:plus | CLONE_INTRO | — | VALID | none → CLONE_INTRO | PASS | PASS | PASS |  |  | need a basis-state copy that succeeded |
| clone:plus | CLONE_BASIS_PASSED | SUPERPOSITION_DEMO_FAILED | VALID | none → CLONE_BASIS_PASSED | FAIL-STUCK | FAIL-STUCK | PASS |  |  | need a superposition copy attempt |
| clone:minus | CLONE_INTRO | — | VALID | none → CLONE_INTRO | PASS | PASS | PASS |  |  | need a basis-state copy that succeeded |
| clone:minus | CLONE_BASIS_PASSED | SUPERPOSITION_DEMO_FAILED | VALID | none → CLONE_BASIS_PASSED | FAIL-STUCK | FAIL-STUCK | FAIL-STUCK |  |  | need a superposition copy attempt |
| clone:phase | CLONE_INTRO | — | VALID | none → CLONE_INTRO | PASS | PASS | PASS |  |  | need a basis-state copy that succeeded |
| clone:phase | CLONE_BASIS_PASSED | SUPERPOSITION_DEMO_FAILED | VALID | none → CLONE_BASIS_PASSED | FAIL-STUCK | FAIL-STUCK | PASS |  |  | need a superposition copy attempt |
| clone:bloch_a | CLONE_INTRO | — | VALID | none → CLONE_INTRO | PASS | PASS | PASS |  |  | need a basis-state copy that succeeded |
| clone:bloch_a | CLONE_BASIS_PASSED | SUPERPOSITION_DEMO_FAILED | VALID | none → CLONE_BASIS_PASSED | FAIL-STUCK | FAIL-STUCK | FAIL-STUCK |  |  | need a superposition copy attempt |
| clone:bloch_b | CLONE_INTRO | — | VALID | none → CLONE_INTRO | PASS | PASS | PASS |  |  | need a basis-state copy that succeeded |
| clone:bloch_b | CLONE_BASIS_PASSED | SUPERPOSITION_DEMO_FAILED | VALID | none → CLONE_BASIS_PASSED | FAIL-STUCK | FAIL-STUCK | FAIL-STUCK |  |  | need a superposition copy attempt |
| bell:I | RELAY_INTRO | PREPARE_BELL_PAIR | VALID | PREPARE_BELL_PAIR → RELAY_BELL_CREATED | PASS | PASS | PASS |  |  |  |
| bell:I | RELAY_BELL_CREATED | UNSETTLED | VALID | none → RELAY_BELL_CREATED | UNSETTLED | UNSETTLED | UNSETTLED |  |  | the sender must act locally (X or Z) to try to signal |
| bell:X | RELAY_INTRO | PREPARE_BELL_PAIR | VALID | PREPARE_BELL_PAIR → RELAY_BELL_CREATED | PASS | PASS | PASS |  |  |  |
| bell:X | RELAY_BELL_CREATED | ATTEMPT_NO_SIGNALLING | VALID | ATTEMPT_NO_SIGNALLING → RELAY_SEND_FAILED | PASS | PASS | PASS |  |  |  |
| bell:Z | RELAY_INTRO | PREPARE_BELL_PAIR | VALID | PREPARE_BELL_PAIR → RELAY_BELL_CREATED | PASS | PASS | PASS |  |  |  |
| bell:Z | RELAY_BELL_CREATED | ATTEMPT_NO_SIGNALLING | VALID | ATTEMPT_NO_SIGNALLING → RELAY_SEND_FAILED | PASS | PASS | PASS |  |  |  |
| bits:bloch_a:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:bloch_a:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:bloch_a:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:bloch_a:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:bloch_b:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 2… |
| bits:bloch_b:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 2… |
| bits:bloch_b:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 2… |
| bits:bloch_b:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 2… |
| bits:gen0:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen0:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen0:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen0:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen1:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 0… |
| bits:gen1:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 0… |
| bits:gen1:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 0… |
| bits:gen1:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 0… |
| bits:gen2:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen2:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen2:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen2:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen3:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen3:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen3:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen3:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen4:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 0… |
| bits:gen4:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 0… |
| bits:gen4:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 0… |
| bits:gen4:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 0… |
| bits:gen5:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen5:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen5:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| bits:gen5:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS |  |  | phase1: phase-1 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:00:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:00:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.1766676593 | 0.176668 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:00:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.6739597419 | 0.673960 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:00:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.1493725989 | 0.149373 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:01:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.6739597419 | 0.673960 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:01:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.1493725989 | 0.149373 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:01:10 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:01:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.1766676593 | 0.176668 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:10:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.1766676593 | 0.176668 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:10:01 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:10:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.1493725989 | 0.149373 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:10:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.6739597419 | 0.673960 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:11:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.1493725989 | 0.149373 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:11:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.6739597419 | 0.673960 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:11:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.1766676593 | 0.176668 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_a:11:11 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:bloch_b:00:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:00:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4439237365 | 0.443924 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:00:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0581189469 | 0.058119 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:00:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4979573166 | 0.497957 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:01:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0581189469 | 0.058119 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:01:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4979573166 | 0.497957 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:01:10 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:01:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4439237365 | 0.443924 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:10:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4439237365 | 0.443924 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:10:01 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:10:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4979573166 | 0.497957 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:10:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0581189469 | 0.058119 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:11:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4979573166 | 0.497957 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:11:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0581189469 | 0.058119 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:11:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4439237365 | 0.443924 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:bloch_b:11:11 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 2… |
| corr:gen0:00:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:00:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0897704026 | 0.089770 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:00:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2505778102 | 0.250578 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:00:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.6596517872 | 0.659652 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:01:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2505778102 | 0.250578 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:01:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.6596517872 | 0.659652 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:01:10 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:01:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0897704026 | 0.089770 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:10:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0897704026 | 0.089770 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:10:01 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:10:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.6596517872 | 0.659652 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:10:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2505778102 | 0.250578 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:11:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.6596517872 | 0.659652 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:11:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2505778102 | 0.250578 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:11:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0897704026 | 0.089770 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen0:11:11 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen1:00:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:00:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.83839571 | 0.838396 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:00:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0388620567 | 0.038862 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:00:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.1227422333 | 0.122742 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:01:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0388620567 | 0.038862 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:01:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.1227422333 | 0.122742 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:01:10 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:01:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.83839571 | 0.838396 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:10:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.83839571 | 0.838396 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:10:01 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:10:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.1227422333 | 0.122742 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:10:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0388620567 | 0.038862 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:11:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.1227422333 | 0.122742 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:11:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0388620567 | 0.038862 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:11:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.83839571 | 0.838396 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen1:11:11 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen2:00:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:00:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2359649765 | 0.235965 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:00:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.5064476909 | 0.506448 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:00:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2575873325 | 0.257587 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:01:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.5064476909 | 0.506448 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:01:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2575873325 | 0.257587 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:01:10 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:01:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2359649765 | 0.235965 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:10:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2359649765 | 0.235965 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:10:01 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:10:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2575873325 | 0.257587 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:10:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.5064476909 | 0.506448 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:11:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2575873325 | 0.257587 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:11:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.5064476909 | 0.506448 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:11:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2359649765 | 0.235965 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen2:11:11 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:00:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:00:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0821652828 | 0.082165 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:00:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4474597831 | 0.447460 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:00:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4703749342 | 0.470375 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:01:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4474597831 | 0.447460 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:01:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4703749342 | 0.470375 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:01:10 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:01:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0821652828 | 0.082165 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:10:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0821652828 | 0.082165 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:10:01 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:10:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4703749342 | 0.470375 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:10:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4474597831 | 0.447460 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:11:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4703749342 | 0.470375 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:11:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4474597831 | 0.447460 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:11:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0821652828 | 0.082165 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen3:11:11 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen4:00:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:00:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4260798557 | 0.426080 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:00:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.3503421158 | 0.350342 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:00:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2235780285 | 0.223578 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:01:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.3503421158 | 0.350342 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:01:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2235780285 | 0.223578 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:01:10 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:01:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4260798557 | 0.426080 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:10:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4260798557 | 0.426080 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:10:01 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:10:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2235780285 | 0.223578 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:10:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.3503421158 | 0.350342 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:11:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2235780285 | 0.223578 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:11:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.3503421158 | 0.350342 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:11:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.4260798557 | 0.426080 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen4:11:11 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 0… |
| corr:gen5:00:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:00:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0006933481 | 0.000693 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:00:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2192676244 | 0.219268 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:00:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.7800390275 | 0.780039 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:01:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2192676244 | 0.219268 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:01:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.7800390275 | 0.780039 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:01:10 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:01:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0006933481 | 0.000693 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:10:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0006933481 | 0.000693 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:10:01 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:10:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.7800390275 | 0.780039 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:10:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2192676244 | 0.219268 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:11:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.7800390275 | 0.780039 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:11:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.2192676244 | 0.219268 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:11:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0.0006933481 | 0.000693 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:gen5:11:11 | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | INVALID | none → TELEPORT_DRY_RUN | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | phase2: phase-2 result parameters.theta nothing is not the requested 1… |
| corr:zero:00:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:00:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:00:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:00:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:01:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:01:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:01:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | FAIL-WRONG-ADVANCE | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:01:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:10:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:10:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | FAIL-WRONG-ADVANCE | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:10:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:10:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:11:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:11:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:11:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:zero:11:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | FAIL-WRONG-ADVANCE | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:00:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:00:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:00:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:00:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:01:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:01:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:01:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | FAIL-WRONG-ADVANCE | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:01:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:10:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:10:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | FAIL-WRONG-ADVANCE | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:10:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:10:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:11:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:11:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:11:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:plus:11:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | FAIL-WRONG-ADVANCE | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:00:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:00:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:00:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:00:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:01:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:01:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:01:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | FAIL-WRONG-ADVANCE | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:01:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:10:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:10:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | FAIL-WRONG-ADVANCE | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:10:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:10:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:11:00 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:11:01 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:11:10 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | PASS | 0 | 0.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| corr:phase:11:11 | TELEPORT_DRY_RUN | — | INVALID | none → TELEPORT_DRY_RUN | PASS | PASS | FAIL-WRONG-ADVANCE | 1 | 1.000000 | phase2: no v2 request derivable — the engine takes a state NAME, v2 re… |
| commit:bloch_a:00 | TELEPORT_DRY_RUN_PASSED | COMMIT_TRANSFER | INVALID | none → TELEPORT_DRY_RUN_PASSED | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | commit: v2 has no commit validator (no contract for the story-token tr… |
| commit:bloch_a:01 | TELEPORT_DRY_RUN_PASSED | COMMIT_TRANSFER | INVALID | none → TELEPORT_DRY_RUN_PASSED | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | commit: v2 has no commit validator (no contract for the story-token tr… |
| commit:bloch_a:10 | TELEPORT_DRY_RUN_PASSED | COMMIT_TRANSFER | INVALID | none → TELEPORT_DRY_RUN_PASSED | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | commit: v2 has no commit validator (no contract for the story-token tr… |
| commit:bloch_a:11 | TELEPORT_DRY_RUN_PASSED | COMMIT_TRANSFER | INVALID | none → TELEPORT_DRY_RUN_PASSED | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | commit: v2 has no commit validator (no contract for the story-token tr… |
| commit:gen0:00 | TELEPORT_DRY_RUN_PASSED | COMMIT_TRANSFER | INVALID | none → TELEPORT_DRY_RUN_PASSED | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | commit: v2 has no commit validator (no contract for the story-token tr… |
| commit:gen0:01 | TELEPORT_DRY_RUN_PASSED | COMMIT_TRANSFER | INVALID | none → TELEPORT_DRY_RUN_PASSED | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | commit: v2 has no commit validator (no contract for the story-token tr… |
| commit:gen0:10 | TELEPORT_DRY_RUN_PASSED | COMMIT_TRANSFER | INVALID | none → TELEPORT_DRY_RUN_PASSED | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | commit: v2 has no commit validator (no contract for the story-token tr… |
| commit:gen0:11 | TELEPORT_DRY_RUN_PASSED | COMMIT_TRANSFER | INVALID | none → TELEPORT_DRY_RUN_PASSED | FAIL-STUCK | FAIL-STUCK | PASS | 1 | 1.000000 | commit: v2 has no commit validator (no contract for the story-token tr… |
