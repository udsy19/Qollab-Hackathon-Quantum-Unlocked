| run | scenario | expected | exit | verdict | checks |
|---|---|---|---|---|---|
| final-1 | conformant | exit 0 | 0 | OK | 61/61 checks passed |
| final-2 | conformant | exit 0 | 0 | OK | 61/61 checks passed |
| final-3 | conformant | exit 0 | 0 | OK | 61/61 checks passed |
| head-python | head | exit 0 | 0 | OK | 28/28 checks passed |
| sab-bare-toJs | conformant | exit 1 | 2 | UNEXPECTED | no verdict |
| sab-no-toJs | conformant | exit 1 | 1 | OK | 11/43 checks passed |
| sab-no-memo | conformant | exit 1 | 1 | OK | 58/61 checks passed |
| sab-plain-call | conformant | exit 1 | 1 | OK | 60/61 checks passed |
| sab-swallow-validator | conformant | exit 1 | 1 | OK | 61/62 checks passed |
| sab-swallow-validator-head | head | exit 1 | 1 | OK | 10/47 checks passed |
| sab-bare-toJs (re-run after the hang) | conformant | exit 1 | 0 | NULL | 61/61 checks passed |
