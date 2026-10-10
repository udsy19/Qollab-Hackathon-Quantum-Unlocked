# backend-site-research evidence

Where should the ONE selected-backend `backend.run` live? This harness runs both candidate routes in platform's
**local** Qollab-like runner (`lane/platform/integration` `tools/qollab-runner/`: Pyodide 314.0.7, Qollab's
Qiskit 2.5.2 wasm wheel, headless Chrome, backend `ionq-mock`). **Local runner, not Qollab, not IonQ.**
Nothing under `echo/` is modified; every run is a disposable copy under `/tmp`.

| file | what it is |
|---|---|
| `proposed/bridge.js`, `proposed/qollab_job.py` | Option A: JS submits in bridge.js, Python builds the circuit and reads the counts. `*.base.*` are the files they were made from (bridge-rewire `cba4fd6` bridge.js, HEAD qollab_job.py). |
| `proposed/test_qollab_job.py`, `proposed/conftest.py` | the test changes Option A needs (the Python once-guard tests go; a no-`.run(` AST test and a contract test come in). |
| `*.diff` | the same changes as unified diffs (what the report proposes). |
| `assemble.sh <dest> <token> <variant>` | builds a disposable copy. Variants: `A`, `B-baseline` (today's route: bridge-rewire bridge.js + HEAD Python), suffixes `-control` (X on q0), `-sab-no-memo`, `-sab-parse-left`, `-sab-python-also-runs`. |
| `project/` | harness entry: asks `verifySelectedBackendOnce()` twice; `bs_spy.py` counts `BasicSimulator.run` from below and records the raw counts. |
| `drive.cjs` | grades from the page + the runner's own `window.__runner` counter; decodes bit order from the raw keys and from `keyQubits` independently. 0 green · 1 red · 2 no verdict. |
| `run.sh`, `round.sh` | one run / the full round (writes `out/SUMMARY.md`). `BS_PORT` default 5193. |
| `out/caps.log`, `out/pytest.log` | static caps gate and pytest on disposable copies, with the sabotage. |

Re-run: `bash evidence/quantum/backend-site-research/round.sh` (~3 min; needs Chrome and puppeteer-core).
