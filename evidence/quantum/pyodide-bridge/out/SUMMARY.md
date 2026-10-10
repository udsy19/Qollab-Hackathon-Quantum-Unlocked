python HEAD@8146589 · old bridge lane/quantum/bridge-rewire@2bfc51e · old python lane/quantum/contract-conformance@42703f1 · pre-move python lane/quantum/bridge-rewire@2bfc51e

| run | scenario | expected | exit | verdict | checks |
|---|---|---|---|---|---|
| final-1 | conformant | exit 0 | 0 | OK | 88/88 checks passed |
| final-2 | conformant | exit 0 | 0 | OK | 84/84 checks passed |
| final-3 | conformant | exit 0 | 0 | OK | 84/84 checks passed |
| fault | fault | exit 0 | 0 | OK | 33/33 checks passed |
| head-old-bridge | conformant | exit 1 | 1 | OK | 76/81 checks passed |
| head-old-python | conformant | exit 1 | 1 | OK | 37/71 checks passed |
| head-pre-move-python | conformant | exit 1 | 1 | OK | 83/84 checks passed |
| sab-bare-toJs | conformant | exit 1 | 0 | NULL | 84/84 checks passed |
| sab-no-toJs | conformant | exit 1 | 1 | OK | 19/62 checks passed |
| sab-no-memo | conformant | exit 1 | 1 | OK | 80/84 checks passed |
| sab-plain-call | conformant | exit 1 | 0 | NULL | 84/84 checks passed |
| sab-no-theta-passthrough | conformant | exit 1 | 1 | OK | 65/82 checks passed |
| sab-no-latch | conformant | exit 1 | 1 | OK | 78/82 checks passed |
| sab-restart-no-python | conformant | exit 1 | 1 | OK | 80/83 checks passed |
| sab-restart-resets-memo | conformant | exit 1 | 1 | OK | 82/84 checks passed |
| sab-second-js-run | conformant | exit 1 | 1 | OK | 80/83 checks passed |
| sab-py-python-runs-again | conformant | exit 1 | 1 | OK | 82/84 checks passed |
| sab-swallow-validator | fault | exit 1 | 1 | OK | 33/37 checks passed |
