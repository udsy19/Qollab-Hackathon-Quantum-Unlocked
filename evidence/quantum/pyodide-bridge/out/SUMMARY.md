python HEAD@cba4fd6 · old bridge lane/quantum/integration@f7efb92 · old python lane/quantum/contract-conformance@42703f1

| run | scenario | expected | exit | verdict | checks |
|---|---|---|---|---|---|
| final-1 | conformant | exit 0 | 0 | OK | 81/81 checks passed |
| final-2 | conformant | exit 0 | 0 | OK | 83/83 checks passed |
| final-3 | conformant | exit 0 | 0 | OK | 81/81 checks passed |
| fault | fault | exit 0 | 0 | OK | 32/32 checks passed |
| head-old-bridge | conformant | exit 1 | 1 | OK | 48/73 checks passed |
| head-old-python | conformant | exit 1 | 1 | OK | 37/69 checks passed |
| sab-bare-toJs | conformant | exit 1 | 0 | NULL | 83/83 checks passed |
| sab-no-toJs | conformant | exit 1 | 1 | OK | 17/60 checks passed |
| sab-no-memo | conformant | exit 1 | 1 | OK | 77/81 checks passed |
| sab-plain-call | conformant | exit 1 | 1 | OK | 77/79 checks passed |
| sab-no-theta-passthrough | conformant | exit 1 | 1 | OK | 62/79 checks passed |
| sab-no-latch | conformant | exit 1 | 1 | OK | 75/79 checks passed |
| sab-restart-no-python | conformant | exit 1 | 1 | OK | 77/80 checks passed |
| sab-restart-resets-memo | conformant | exit 1 | 1 | OK | 79/81 checks passed |
| sab-swallow-validator | fault | exit 1 | 1 | OK | 30/34 checks passed |
