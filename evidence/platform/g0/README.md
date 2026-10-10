# evidence/platform/g0: G0 platform smoke on the LOCAL RUNNER (not Qollab)

Produced by `tools/qollab-runner/check.cjs`, which writes to `evidence/platform/g0` by default, and by `tools/qollab-runner/sabotage.sh` (writes `sabotage/`). Measured at 2026-10-09 23:42 ET on branch `lane/platform/g0-runner-smoke`, with build token `g0-smoke-2026-10-10b`, in headless Chrome 155.

Commands and exit codes:

- `node tools/qollab-runner/server.mjs --port 4871` serves `echo/`.
- `node tools/qollab-runner/check.cjs --port 4871 --backend builtin --out evidence/platform/g0 --expect-build g0-smoke-2026-10-10b` → exit 0, 16/16 (`check-builtin.log`, `builtin-results.json`).
- The same with `--backend ionq-mock` → exit 0, 16/16 (`check-ionq-mock.log`, `ionq-mock-results.json`).
- `bash tools/qollab-runner/sabotage.sh 4880 evidence/platform/g0/sabotage` → 2 controls green, 6 of 6 sabotages caught (`sabotage/sabotage-summary.txt`). This run happened before the sandbox check was added.
- Sandbox-check sabotage (`allow-same-origin` added to the frame, then reverted) → exit 1 (`sabotage/runner-sandbox-allow-same-origin-check.log`).

| file | shows |
|---|---|
| `*-1-scene-and-bridge.png` | The Three.js cube, plus the Python-bridge JSON computed by Qiskit 2.5.2 in Pyodide (`platform: emscripten`) |
| `*-2-one-job-counts.png` | Counts from the one `backend.run` (256 shots, only 00/11); header shows `backend.run calls: 1` |
| `*-3-second-press-refused.png` | The page's visible refusal; the runner counter still shows 1 |
| `sabotage/sabotage-no-guard-ionq-mock-3-…png` | Guard removed: the runner's IonQ mock refuses job 2 and the header turns red |
| `sabotage/sabotage-no-render-1-…png`, `wrong-bridge-1`, `wrong-backend-circuit-2`, `no-guard-builtin-3` | The other sabotages, each caught |

The `ionq-mock` backend is BasicSimulator plus a one-job counter. It is not IonQ.
