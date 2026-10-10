---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---

# README and demo-video script: first draft, every claim sourced

`echo/README.md` (the Qollab write-up, created from upload) and `docs/VIDEO_SCRIPT.md` (2:40 shot list) were drafted on branch `lane/platform/readme-and-video-draft` from what the lane branches actually contain on 2026-10-10 ~00:20 ET, not from the vision. Structure follows [[Research/qollab-platform-and-submission]] § 6C (Soundtrack exemplar order).

## Measured
- README: 7,381 characters (limit 65,000), rendered with `marked {gfm:true, breaks:true}` in headless Chrome: `lanes/platform/renders/readme-and-video-draft/readme.png`. Tables, `\|0⟩` escapes and HTML-comment placeholders render as intended (comments invisible).
- `node tools/qollab-caps/check.mjs --root echo`: GREEN, exit 0; file count 8 → 9 (README only).
- Video script: 10 shots, 160 s total, every shot names ≥1 state in `QUEST_STATE_LIST`. Checked by a throw-away parser (`/tmp/vscheck.mjs`, in the lane report) that re-derives lengths from the start/end timecodes; sabotage: an unknown state → exit 1, a 0:37 shot → exit 1.
- Quantum tests on `lane/quantum/integration` f7efb92: 452 passed, 1 failed (`test_contract_conformance.py::test_every_bridge_result_passes_the_platform_validator`). The README therefore makes NO test-count claim.

## Findings worth keeping
- Nothing is integrated yet: `echo/` on every integration branch is still the G0 smoke or a single lane's slice. README gameplay claims are sourced to lane-branch code (quantum, gameplay world-v2-port, story-ui), and the Qollab-status rows are `<!-- FILL AFTER OVERSEER RUN -->`.
- story-ui's `menu.js` CONTROLS list shows `Q · Field scan` and `Tab · Journal`; no gameplay or UI code handles `KeyQ`, and `Tab` is only focus-trapping. The README omits both keys. Either wire them or drop them from the menu.
- The ruling "COMMIT unlocks only after a correct NON-00 dry run" is not visible in `missionRules.js` on `gameplay-real-engine-seam` or `gameplay-world-v2-port`; the README only claims what the contract enforces (commit only from `TELEPORT_DRY_RUN_PASSED`).
- Third-party list from grep of every lane branch's `echo/`: bare-name imports are `three` only (plus Qollab's `quantum.*` Python modules). No jsdelivr URL, no `postprocessing`. Pyodide and Qiskit are supplied by Qollab (`echo/requirements.txt` carries no Qiskit line).
