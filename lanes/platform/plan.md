**Lane goal:** platform. G0 comes first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`) that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`. It ships with a local Qollab-like runner in `tools/` and `echo/QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Sat 00:05. G1 Sat 04:00 · G2 Sat 17:00 (else the one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- `shared-contracts` (c2), `echo-caps-gate` (c3), `g0-runner-smoke` (c4).
- `contracts-v2` (c5), merged and landed on main as 80d685f. Grounds: 1087/1087 on my own extract, merge-tree clean, screenshot 04 showing the two-phase dry run.
- G0 on real Qollab (overseer run, built-in sim): steps 1–5 PASS. Steps 6–7 (Verify click) NOT CONFIRMED, cause unknown. `g0-input-diagnostic` covers it.

**In flight:**
- `integration-shell` (adopted after the loop restart at 04:05). Checkpoint 1: the assembler works, and it is RED on the `main.css` and `quantum/smoke.py` ownership conflicts, as predicted. It is now building the real `main.js`/`index.html` on contracts v2.
- `g0-input-diagnostic` (adopted). Build `10c` adds on-page input counters, an auto-send countdown for the one job through the same guard, and iframe sandbox/allow facts from Qollab's runtime source.
- **`contracts-pin-thresholds` (dispatched now).** I decided it in consult 5, but it never started: there is no branch and no lane.log start line. The consult-5 dispatch was lost at the 04:05 restart, or before it. It pins the owner-ruled constants so that changing any of them turns the gate red.

**Relay (overseer → lanes):** the contracts-v2 migration table in `reports/0003-contracts-v2.md`:
- quantum first: `bell_verification` → `backend_verification`, and `{theta, phi}` two-phase entry points;
- gameplay: `marginalProbabilities` / `dryRunVerdict`; delete its local constants;
- story-ui: `captionStyle`, `QUALITY_LEVELS`, `BIT_LABELS`, the two-phase terminal.

**Next:**
1. The overseer re-runs G0 with build `10c`. That closes steps 6–7 or names the input cause, and it decides the controls design (pointer lock or click-to-focus/drag).
2. Judge `integration-shell` on runner screenshots plus my own caps and contract runs. Once merged, run assemble + caps + contract check after every lane landing.
3. Merge `contracts-pin-thresholds` after my own sabotage: `FIDELITY_PASS` 0.999999 → 0.9 must go red.
4. Integrated product code waits on red-team's `cross_lane_check`.
5. First playthrough once gameplay has a controller and scene. Then the README/project page, the video script, and 3 consecutive full runs (row 8).

**Risks:**
- **Iframe input on Qollab** (top G2 risk).
- Lane restarts drop dispatches: verify every new AGENT block shows a "start" line in lane.log at the next consult.
- Contract churn while lanes migrate.
- `echo/tests/` counts toward the 100-file cap.
- The puppeteer dependency is borrowed from the MCP install.