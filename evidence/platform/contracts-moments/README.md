# contracts-moments-and-land: evidence

Part 1 branch `lane/platform/contracts-moments-and-land` @ 88cd09b (base e22cc7e). Landing branch `lane/platform/contracts-land` @ 5a90cdf (base main 99dfc54).
All runs are local (node / python3 on udsy's Mac). No browser and no Qollab run.

| # | command | exit | log |
|---|---|---|---|
| 01 | `node tools/contract-check/check.mjs`: gate written first, before the contracts.js change | 1 (RED, 36 FAIL, 1169/1205) | [01-gate-first-red.log](01-gate-first-red.log) |
| 02 | `node tools/contract-check/check.mjs` after the change | 0 (GREEN 1206/1206) | [02-green.log](02-green.log) |
| 03 | `python3 tools/contract-check/sabotage.py` (disposable copies) | 0 (89 cases: 81 red as expected, 8 declared nulls, 0 mismatches) | [03-sabotage.log](03-sabotage.log) |
| 04 | `git diff --stat main...lane/platform/contracts-land` | 0 (4 files, all allowed paths) | [04-land-diff-stat.txt](04-land-diff-stat.txt) |
| 05a | `git archive lane/platform/contracts-land` → extract → `node tools/contract-check/check.mjs` | 0 (GREEN 1206/1206) | [05-archive-check-contracts-land.log](05-archive-check-contracts-land.log) |
| 05b | same on `lane/platform/contracts-moments-and-land` | 0 (GREEN 1206/1206) | [05-archive-check-contracts-moments-and-land.log](05-archive-check-contracts-moments-and-land.log) |
| 06a/b | `python3 tools/contract-check/sabotage.py` inside each archive extract | 0 / 0 (0 mismatches) | [06-archive-sabotage-contracts-land.log](06-archive-sabotage-contracts-land.log), [06-archive-sabotage-contracts-moments-and-land.log](06-archive-sabotage-contracts-moments-and-land.log) |
| 07a | `node tools/qollab-caps/check.mjs` on the contracts-land extract | 1 (RED: entry-index, entry-main; expected, since main has no echo/index.html or main.js) | [07-archive-qollab-caps-contracts-land.log](07-archive-qollab-caps-contracts-land.log) |
| 07b | same on the Part 1 extract | 1 (RED: 8 import-unresolved/import-specifier in echo/main.js; identical on base e22cc7e, so it predates this change) | [07-archive-qollab-caps-contracts-moments-and-land.log](07-archive-qollab-caps-contracts-moments-and-land.log) |

Ad-hoc null probes (not in sabotage.py, run by hand on a temp copy): ceil→round RED, ceil+1e-9 RED,
teleport_dry_run_00 via renamed RED, an extra export `COUNTDOWN_GAME_OVER` **GREEN (null)**, closed by the export-surface
check and then added to sabotage.py as RED, and the "fires once" comment contradicted **GREEN (declared null)**.
