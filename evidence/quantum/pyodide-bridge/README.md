# pyodide-bridge evidence

This harness drives every adapter in `echo/quantum/bridge.js` inside platform's **local** Qollab-like runner. The runner uses Pyodide 314.0.7 and Qollab's own Qiskit 2.5.2 wasm wheel, running in headless Chrome. **This is a local runner, not Qollab.**

| file | what it is |
|---|---|
| `assemble.sh` | Builds a disposable copy under `/tmp` with `git archive`, so the shared `.git` is never touched. The copy holds the runner (`lane/platform/integration`), `contracts.js` (`lane/platform/integration`), `echo/quantum/*.py` from `--python-from <ref>`, this branch's `bridge.js`, and `project/` as the entry. It writes `ASSEMBLY.json`, with every ref, the harness commit and the sha256 of every file. |
| `project/main.js` | The harness entry. It calls every adapter. Then the two-phase dry run: fresh calibration draws until one lands on a non-00 branch, then all four X/Z choices on THAT result. Then `commitTransfer` three times, Python's own second-commit refusal, `verifySelectedBackendOnce()` twice, `resetStoryToken()` (RESTART), a fourth commit and a third verify. It renders the JSON and grades nothing. |
| `project/pb_spy.py` | Wraps `BasicSimulator.run` at class level, plus `qollab_job.run_backend_verification_once` and `teleportation.{live_commit, reset_story_token, teleport_branch}`, so jobs, commits, resets and the angles Python actually received are counted from below the bridge. Built with `--fault`, it plays a lying engine: F=1 on a wrong X/Z, and the job named `bell_verification`. Under `ionq-mock` it calls `run_sync`, which needs a stack entered through `callPromising`, the same structural need as IonQ's HTTP call. |
| `drive.cjs` | Headless driver. Scenarios `conformant` and `fault`. It reads only the rendered page and `window.__runner`, re-validates every delivered result in Node from the contract bytes, and re-derives the physics from closed forms. Exit codes: 0 green, 1 red, 2 no verdict. |
| `sabotage.mjs` | One named sabotage applied to the copy's `bridge.js`. If the pattern is not found, it exits 2. |
| `run.sh` | One graded run on port `PB_PORT` (default 5147; use your own). |
| `round.sh` | The full round. Three greens. The `fault` control (the bridge must refuse every lie loudly). Two head controls, which must be red: the pre-rewire bridge (`lane/quantum/integration`) and the pre-hardening Python (`lane/quantum/contract-conformance`). Then every sabotage. It writes `out/SUMMARY.md`. |

Re-run everything: `PB_PORT=<your port> bash evidence/quantum/pyodide-bridge/round.sh` (Python from HEAD). Takes about 8 minutes and needs Chrome plus a global `@modelcontextprotocol/server-puppeteer`, or set `PUPPETEER_CORE`.

`out/<tag>-dump.json` holds every returned object with the in-page and Node verdicts, the spy counts, the runner's counters, timings and the assembly provenance. `out/<tag>-runner-page.png` is the runner page after the run.

`red-before/` holds the new checks run against the OLD bridge before the rewire (47/72, commit 3ed9478; gate-independence law 3).
