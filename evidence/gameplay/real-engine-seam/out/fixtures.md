| fixture | quest state | expected (docs) | gameplay event | gameplay reason | verdict |
|---|---|---|---|---|---|
| good[0] cloning plus, exact | CLONE_INTRO | none | none | need a basis-state copy that succeeded | PASS |
| good[0] cloning plus, exact | CLONE_BASIS_PASSED | SUPERPOSITION_DEMO_FAILED | none | need a superposition copy attempt | FAIL |
| good[1] bell marginal X, sum within 1e-9 | RELAY_INTRO | PREPARE_BELL_PAIR | PREPARE_BELL_PAIR | result shows the lesson | PASS |
| good[1] bell marginal X, sum within 1e-9 | RELAY_BELL_CREATED | ATTEMPT_NO_SIGNALLING | ATTEMPT_NO_SIGNALLING | result shows the lesson | PASS |
| good[2] teleportation result m0=1 m1=0, fidelity float-rounded above 1 | TELEPORT_DRY_RUN | none | CORRECT_CALIBRATION | result shows the lesson | FAIL |
| good[3] backend_verification: the one selected-backend job, 256 shots | — | (no quest state consumes backend_verification) | — | — | n/a |
| good[4] documented preview | CLONE_INTRO | none | none | need a basis-state copy that succeeded | UNSETTLED |
| good[4] documented preview | CLONE_BASIS_PASSED | none | none | need a superposition copy attempt | UNSETTLED |
| teleport example bitsResult | TELEPORT_DRY_RUN | none | none | no measurement bits or fidelity | PASS |
| teleport example correction[0] X=false Z=false | TELEPORT_DRY_RUN | none | none | corrections do not match m0=1, m1=0 | PASS |
| teleport example correction[1] X=false Z=true | TELEPORT_DRY_RUN | CORRECT_CALIBRATION | none | corrections do not match m0=1, m1=0 | FAIL |
| teleport example correction[2] X=true Z=false | TELEPORT_DRY_RUN | none | none | corrections do not match m0=1, m1=0 | PASS |
| teleport example correction[3] X=true Z=true | TELEPORT_DRY_RUN | none | none | corrections do not match m0=1, m1=0 | PASS |

bad fixtures refused by gameplay eventForResult (CLONE_INTRO): 37/37
