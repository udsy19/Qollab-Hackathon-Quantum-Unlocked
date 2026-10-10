# pyodide-bridge evidence

This harness drives every adapter in `echo/quantum/bridge.js` inside platform's **local** Qollab-like runner. The runner uses Pyodide 314.0.7 and Qollab's own Qiskit 2.5.2 wasm wheel, running in headless Chrome. **This is a local runner, not Qollab.**

| file | what it is |
|---|---|
| `assemble.sh` | Builds a disposable copy under `/tmp` with `git archive`, so the shared `.git` is never touched. The copy holds the runner (`lane/platform/g0-runner-smoke`), `contracts.js` (`lane/platform/integration`), `echo/quantum/*.py` from `--python-from <ref>`, this branch's `bridge.js`, and `project/` as the entry. It writes `ASSEMBLY.json`, with every ref, the harness commit and the sha256 of every file. |
| `project/main.js` | The harness entry. It calls every adapter, calls `verifySelectedBackendOnce()` twice and renders the JSON. It grades nothing. |
| `project/pb_spy.py` | Wraps `BasicSimulator.run` at class level, plus `qollab_job.run_bell_verification_once`, so jobs are counted from below the bridge. Under `ionq-mock` it calls `run_sync`, which needs a stack entered through `callPromising`, the same structural need as IonQ's HTTP call. |
| `drive.cjs` | Headless driver. It reads only the rendered page and `window.__runner`, re-validates every delivered result in Node from the contract bytes, and re-derives the physics from closed forms. Exit codes: 0 green, 1 red, 2 no verdict. |
| `sabotage.mjs` | One named sabotage applied to the copy's `bridge.js`. If the pattern is not found, it exits 2. |
| `run.sh` | One graded run on port `PB_PORT` (default 5147). |
| `round.sh` | The full round: three greens, the HEAD-Python negative control and every sabotage. It writes `out/SUMMARY.md`. |

Re-run everything: `bash evidence/quantum/pyodide-bridge/round.sh lane/quantum/contract-conformance`. Takes about 3 minutes and needs Chrome plus a global `@modelcontextprotocol/server-puppeteer`, or set `PUPPETEER_CORE`.

`out/<tag>-dump.json` holds every returned object with the in-page and Node verdicts, the spy counts, the runner's counters, timings and the assembly provenance. `out/<tag>-runner-page.png` is the runner page after the run.
