# red-team cross-lane-recheck (report 0005)

Does a REAL quantum result flow through platform's contract into gameplay's quest? Pins: main 6cc19a6,
quantum d9b42d0, gameplay c49a922, platform 43be7d9 (newer tips in `out/tips/`). Findings:
`vault/Reports/cross-lane-recheck.md`.

| script | what | exit |
|---|---|---|
| `compose.sh <dir>` | merged `echo/` from pinned SHAs by `git archive`, provenance TSV | 0 ok · 2 refused |
| `quest_walk.mjs <echo> real <json> [fake]` / `fake <fake.js>` | gameplay's real `state.js` BOOT→CREDITS on real results; fake = positive control | 0 CREDITS · 1 stall · 2 refused |
| `dump_teleport_v2.py` + `teleport_v2_check.mjs` | real two-phase results vs contracts v2 validators | 0 · 1 · 2 |
| `bridge_probe.mjs` | `bridge.js` in Node with stubs replaying recorded real output (NOT Pyodide) | 0 · 1 · 2 |
| `platform_tools_sabotage.mjs` | sabotage on contract validators and `tools/qollab-caps` (disposable copies) | 0 ran (nulls reported) · 2 refused |
| `sabotage_probes.sh` | falsifies this round's own probes | 0 all flip · 1 a null in ours · 2 refused |

Reused from `../physics-code-audit/`: driver, `dump_results.py`, `cross_lane_check.mjs`, sabotage harnesses, C4 probe.
