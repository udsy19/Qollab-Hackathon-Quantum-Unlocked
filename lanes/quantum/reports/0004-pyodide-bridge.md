## TL;DR
- **Done in the local runner. Not run on Qollab.** `echo/quantum/bridge.js` (commit 95b0394) implements vision §8.4 `QuantumEngine` under the same names as gameplay's dev stand-in, so it drops in: `cloneTest`, `bellSignalling` and `teleportDryRun(stateId, X, Z, bits)`, plus `calibrationMeasurement` (bits come first), `commitTransfer` (latched once) and `verifySelectedBackendOnce` (memoised).
- In platform's runner (Pyodide 314.0.7, Python 3.14.2 on emscripten, Qollab's Qiskit 2.5.2 wheel), with Python from `contract-conformance` 42703f1, three consecutive runs each passed 61/61 checks. Every result was re-validated in Node, and the physics was re-derived from closed forms (for example dry-run F = cos²(1.137) = 0.176668). The harness was red first (exit 1) while bridge.js did not exist yet.
- **One job:** two `verifySelectedBackendOnce()` calls returned the same promise. The spy saw 1 `backend.run` attempted, 1 completed and 1 `qollab_job` entry. The validator **rejects** the result (`"bell_verification"` is not in EXPERIMENTS), so the bridge rejects with §8.6's wording. **Platform must add `backend_verification`.**
- Sabotage: no-memo, plain-call, swallow-validator and no-toJs are all **red**. **Null:** bare `toJs()`. On Pyodide 314.0.7 a bare `toJs()` already returns plain Objects, not Maps, so the brief's premise is stale.
- **Finding:** the runner's own `backend.run calls` counter reads 0 while a job ran, so its ionq-mock refusal never sees our job (it is submitted from Python).
- Evidence: `evidence/quantum/pyodide-bridge/out/SUMMARY.md`, `final-*-dump.json`, `renders/pyodide-bridge/runner-bridge-harness-final-3.png`. Re-run: `bash evidence/quantum/pyodide-bridge/round.sh`.

## Vault check
- **Read:** `vault/AGENTS.md`, `vault/Index.md` (grep), `vault/Research/qollab-backend-from-js-projects.md`, `vault/Design/experiment-result-contract.md`, `vault/Reports/quantum-physics-review.md` §5, `echo/tests/smoke_plan.md`, `echo/CONTRACTS.md` (on `lane/platform/integration`), `owner-answers.md` and `context.md`. Also read: the runner source on `lane/platform/g0-runner-smoke` (`server.mjs`, `frame.js`, `host.js`, `check.cjs`), vision §8.4–8.6 and §10.2, and gameplay's `dev/gameplay/fakeQuantum.js`.
- **Already known:** callPromising is required on IonQ. `dict_converter` is needed (that turned out stale, see below). `probabilities_dict` returns np types. Python state is fresh per Run. The owner rulings on backend_verification, bits-first and the commit latch.
- **Reused:** the runner as-is, platform's validator, platform's `toPlain` idiom (`echo/main.js`, same expression), gameplay's §8.4 adapter names, and the expected values in smoke_plan §2.4.
- **Wrong or stale:**
  - Research Q2, `CONTRACTS.md` "On the JS side" and smoke_plan §2.3 say a bare `toJs()` gives a Map. That is false on Pyodide 314.0.7 (measured).
  - smoke_plan §2.3 says `details.sourcePurity`. Since contract-conformance it is `observables.purityQ0`.
  - `where.mjs` reported `verifySelectedBackendOnce` as "EXISTS". Those hits are gameplay's dev fake, not an implementation.

## What I found
1. **The engine runs in Pyodide.** Every engine entry point the game needs returned contract-valid results in the runner: `run_calibration`, `bell_signalling`, `bell_measurement`, `teleport_branch` (all four X/Z), `live_commit` and `run_bell_verification_once`. This retires the physics-review §5 residual risk for these paths, in the runner.
2. **Timings:**
   - frame start → main.js body: 5.3–9.3 s, for Pyodide plus the wheel plus the preamble, before any game code runs;
   - the bridge's own Python imports: about 3 ms, because the preamble already imported Qiskit;
   - first adapter call: about 5–7 ms;
   - median call: about 1.6 ms;
   - backend verification (BasicSimulator, 256 shots): about 5–6 ms.
   
   The CALIBRATING wait is therefore all platform boot. Static imports in bridge.js cost nothing measurable.
3. **Bare `toJs()` gives plain objects on 314.0.7**, nested dicts and lists included (`toJsDefault` in every dump). The explicit `dict_converter` stays as a free version guard.
4. **The runner's job counter and its ionq-mock refusal sit in a JS Proxy around the backend.** Pyodide unwraps that Proxy when the backend is passed into Python, so a Python-side `backend.run` is invisible to them: the counter reads 0, while the runtime's Probabilities panel shows our 256-shot counts. I counted from below instead (`pb_spy.py` wraps `BasicSimulator.run`).
5. **Validator verdict on the backend job:** `experiment must be one of cloning|bell_signalling|teleportation, got string "bell_verification"`. That is the only rejection with conforming Python.
6. With current HEAD Python (before conformance), every adapter fails **loudly** with `ScientificModuleError` listing the validator errors (28/28). Nothing invalid is delivered.
7. One harness run out of 11 hung with no verdict in 300 s, cause unknown. The same assembly finished in 6 s on re-run. It was reported as no verdict, never as red or green (law 7).
8. Platform's static caps gate (`tools/qollab-caps/check.mjs` from integration), run on a disposable echo/ copy with bridge.js in it:
   - **0 findings in bridge.js**;
   - it flags `qollab_job.py:168` under the rule `backend-run-python` ("only JS may"). That conflicts with the owner-accepted design: Python submits the job, called via `callPromising(backend)`, the documented Qollab pattern;
   - it flags `echo/tests/test_qollab_job.py` (`"ionq_simulator"`, `api_key` fixture strings), because tests under `echo/` get uploaded.

## What I changed (commits on `lane/quantum/pyodide-bridge`)
- 95b0394: `echo/quantum/bridge.js`, plus the harness (assemble/drive/run, harness `project/`). Green 61/61.
- dffd4f5: harness probes for the toJs default and the cold-import timing, the `no-toJs` sabotage, and `round.sh`.
- ff24a71: full evidence round in `out/`, `README.md`, and `vault/Reports/pyodide-bridge.md`.
- No `.py`, platform file or protected path was edited.

## Bridge API (for platform's main.js and gameplay)
- `cloneTest(state)`, `bellSignalling(senderGate)` and `calibrationMeasurement(stateId)` each resolve to a validated ExperimentResult. `calibrationMeasurement` carries `measurementBits`.
- `teleportDryRun(stateId, correctionX, correctionZ, bits)`: `bits` is required, and is the `measurementBits` from `calibrationMeasurement`.
- `commitTransfer(stateId)`: the first valid result is latched, and every later call returns the same promise and object. A failed call unlatches, so the player may retry (overseer ruling, gameplay consult 3).
- `verifySelectedBackendOnce()`: no argument, it uses the global `backend`. The promise is memoised for the page, including a failure. It resolves to the validated result, or rejects with `ScientificModuleError("Quantum backend verification unavailable; educational circuit validated locally: …")`.
- **Every failure is a `ScientificModuleError`** with `.label` and `.errors`: a Python exception, a validator rejection, or bad bits.

## Evidence paths
- `evidence/quantum/pyodide-bridge/out/SUMMARY.md`: every run with its expected and actual exit code.
- `out/final-{1,2,3}-dump.json`: every returned object with its in-page and Node verdicts, the spy counts, the runner counters, timings, the runner log tail and `assembly` provenance (refs, harness commit, sha256 per file).
- `out/red-before-bridge-results.json`: the red run before the bridge existed.
- `out/head-python-*`: the negative control.
- `out/sab-*`: the sabotages.
- `out/*-runner-page.png`: screenshots. Each run wrote a fresh build token (`pb-<tag>-<timestamp>-<rand>`) into main.js, loaded with the cache off in a new profile, and the driver aborted with exit 2 if the rendered token did not match (law 16).
- `/Users/udsy/agent-org/lanes/quantum/renders/pyodide-bridge/runner-bridge-harness-final-3.png` and `sabotage-no-memo-red.png`.

| sabotage | result | what went red |
|---|---|---|
| bare `toJs()` | **NULL** (61/61 green, twice; 1 earlier no-verdict hang) | nothing: a bare `toJs()` already gives plain Objects on Pyodide 314.0.7 |
| no `toJs` at all (stronger, added) | red, 11/43 | every adapter: "result must be a plain object, got a PyProxy object" |
| memo removed | red, 58/61 | same promise, same value, 1 qollab_job entry. **Null inside it:** the `backend.run` count stays 1, because Python's own guard in qollab_job refuses the second call |
| plain call instead of `callPromising` | red, 60/61 | backend.run attempted but not completed (the `run_sync` emulation of IonQ's network requirement) |
| validator errors swallowed | red, 61/62 conforming Python; 10/47 HEAD Python | Node re-validation of a delivered result |

## What I did NOT do or could not verify
- **Nothing ran on Qollab or IonQ.** All results are from the local runner.
- The IonQ "XHR ConnectionError" was emulated with `run_sync`, which has the same structural requirement (a stack entered via callPromising). It was not observed against IonQ.
- Not tested:
  - Stop→Run inside one page;
  - whether the `backend` global is a PyProxy on real Qollab;
  - fresh random calibration states for dry runs (owner ruling 7). The engine has only the named states `bloch_a` and `bloch_b`. That is an engine (Python) feature, not a bridge one.
- `bridge.js` imports `'../contracts.js'`, which exists only on `lane/platform/integration`. On this branch alone it is not runnable until the branches merge.
- The cause of the one hang was not investigated.

## Decisions inferred from the docs
- **Adapter names:** taken from vision §8.4 `QuantumEngine`, the same as gameplay's `dev/gameplay/fakeQuantum.js`, so swapping the fake out is a one-line change. The bits-first split (`calibrationMeasurement`, then `teleportDryRun(…, bits)`) follows the owner's 2026-10-10 red-team ruling (2).
- **`verifySelectedBackendOnce()` rejects on failure instead of resolving to a status object.** This keeps §8.4's `Promise<ExperimentResult>` and uses §8.6 step 5's wording. The memo includes the failure, because qollab_job.py counts a failed submission as spent (§10.7).
- **The commit latch lives in the bridge.** Source: the overseer's ruling (1) for gameplay consult 3, and §7.4 "consumed once". It is defence in depth alongside gameplay's quest latch.
- **The bridge uses the global `backend`, with no argument.** The Qollab docs say it is available "in every JS file it imports". This stops a caller from passing some other backend.

## Requests for platform
1. Add `"backend_verification"` to `EXPERIMENTS` in `echo/contracts.js` (owner ruling item 4). Quantum then renames it in `qollab_job.py`; today the bridge rejects that result.
2. Correct `echo/CONTRACTS.md` § "On the JS side": a bare `toJs()` gives plain Objects on Pyodide 314.0.7, measured. Keep `dict_converter` as a guard.
3. Runner, `tools/qollab-runner/frame.js` `wrapBackend`: its counter and its ionq-mock refusal cannot see a `backend.run` made from Python, and our one job is made from Python. Wrap the Python `run` too, as `pb_spy.py` does, or `check.cjs` will report 0 jobs for the real game.
4. Caps gate rule `backend-run-python` conflicts with the accepted design (Python submits via `callPromising(backend)`, which the Qollab docs document). Exempt `echo/quantum/qollab_job.py`, or raise it with the owner.
5. Have `echo/main.js` import from `./quantum/bridge.js` and drop `quantum.smoke` and its local `toPlain`, once integration and quantum merge.

## Questions for the owner
None. Every choice above was inferred from the docs.

## What the supervisor should do next
1. Re-run `bash evidence/quantum/pyodide-bridge/round.sh lane/quantum/contract-conformance` on a disposable worktree. It takes about 3 minutes, uses port 5147 (or set `PB_PORT`), and expects exit 0 ×3, head 0 and sabotages 1, with the bare-toJs NULL.
2. Merge `contract-conformance` before this branch: with HEAD Python every adapter fails loudly (as designed).
3. Send requests 1, 3 and 4 to platform. Request 1 is the only thing stopping a "verified" backend panel.
4. Commission the engine's fresh-random calibration states (owner ruling 7) for the quantum lane. The bridge passes `stateId` straight through.
5. Remove the echo/tests fixture strings the caps gate flags (`ionq_simulator`, `api_key`), or move the quantum tests out of the upload.
