# G0 input diagnostic (build g0-smoke-2026-10-10c) — LOCAL RUNNER, not Qollab

Produced on branch `lane/platform/g0-input-diagnostic`, 2026-10-10, headless Chrome, by:

```bash
node tools/qollab-caps/check.mjs --root echo                       # caps.log, exit 0, one backend.run site
node tools/qollab-runner/server.mjs --port 4901
node tools/qollab-runner/check.cjs --port 4901 --backend <b> --scenario <s> \
     --out evidence/platform/g0-input-diagnostic --expect-build g0-smoke-2026-10-10c
bash tools/qollab-runner/sabotage.sh 4903 /tmp/...                 # copied to sabotage/
```

| run | exit | checks |
|---|---|---|
| builtin auto / cancel / button | 0 / 0 / 0 | 28 / 23 / 25 |
| ionq-mock auto / cancel / button | 0 / 0 / 0 | 28 / 23 / 25 |

Screenshots per run (`<backend>-<scenario>-…`): `a-counters-zero` (on load), `b-counters-after-input`
(after a CDP mouse click on the canvas and a K keypress), `c-auto-send-one-job` + `c2-press-refused`
(auto), `d-cancel-no-job` (cancel), `e-button-one-job` (button), `1-scene-and-bridge`.

`sabotage/sabotage-summary.txt`: 6 controls green, 13 cases caught, 1 declared-green case (bubble phase
alone). `pointer-lock-control/`: the same panel in a frame with `allow-scripts` reads REFUSED, with
`allow-scripts allow-pointer-lock` GRANTED (run: serve `site/` + `../../../../echo/diag.js` with
`srv.cjs` on 4902, then `node probe.cjs`).
