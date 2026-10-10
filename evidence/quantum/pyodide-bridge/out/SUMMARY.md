python HEAD@de3a66c · old bridge lane/quantum/integration@f7efb92 · old python lane/quantum/contract-conformance@42703f1

| run | scenario | expected | exit | verdict | checks |
|---|---|---|---|---|---|
| final-1 | conformant | exit 0 | 0 | OK | 80/80 checks passed |
| final-2 | conformant | exit 0 | 0 | OK | 80/80 checks passed |
| final-3 | conformant | exit 0 | 0 | OK | 80/80 checks passed |
| fault | fault | exit 0 | 1 | UNEXPECTED | 30/34 checks passed |
| head-old-bridge | conformant | exit 1 | 1 | OK | 47/72 checks passed |
| head-old-python | conformant | exit 1 | 1 | OK | no verdict |
| sab-bare-toJs | conformant | exit 1 | 0 | NULL | 80/80 checks passed |
| sab-no-toJs | conformant | exit 1 | 1 | OK | 16/59 checks passed |
| sab-no-memo | conformant | exit 1 | 1 | OK | 78/82 checks passed |
| sab-plain-call | conformant | exit 1 | 1 | OK | 76/78 checks passed |
| sab-no-theta-passthrough | conformant | exit 1 | 1 | OK | 59/76 checks passed |
| sab-no-latch | conformant | exit 1 | 1 | OK | 74/78 checks passed |
| sab-restart-no-python | conformant | exit 1 | 1 | OK | 76/79 checks passed |
| sab-restart-resets-memo | conformant | exit 1 | 1 | OK | 78/80 checks passed |
| sab-swallow-validator | fault | exit 1 | 1 | OK | 29/33 checks passed |
