---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---

# One backend.run site: bridge.js submits, Python builds and interprets (local runner)

Lane quantum, consult 13, branch `lane/quantum/backend-site-move`. Measured in platform's **local Qollab-like runner** (`lane/platform/integration`, Pyodide 314.0.7, Python 3.14.2, Qiskit 2.5.2 wasm, headless Chrome, `ionq-mock` backend). **Local runner, not Qollab or IonQ.** It closes gap row 3 of [[quantum-vs-contracts-v2]] (and row 7, because the bridge always passes `BACKEND_SHOTS`). It implements Option A from [[backend-run-site]].

## What changed

- `echo/quantum/bridge.js` `verifySelectedBackendOnce` is now the only `backend.run` in the game. It is memoised once per page, failure included, and RESTART does not reset it. It calls `qollab_job.build_backend_verification_circuit` → `backend.run(circuit, {shots: BACKEND_SHOTS})` → `job.result().get_counts()` → `qollab_job.interpret_counts(counts, backend, 256)` → `validateExperimentResult`.
- `echo/quantum/qollab_job.py` has no submitter any more. `run_backend_verification_once`, `BackendJobAlreadyUsed`, `_job_submitted` and `DEFAULT_SHOTS` are deleted. `interpret_counts` also accepts the backend object and labels the result with the name the backend reports for itself.
- Refutation probe (`evidence/quantum/backend-site-move/probe/`): a Python-built `QuantumCircuit` passed to the runner's JS `backend.run` runs on both `builtin` and `ionq-mock`. **Not refuted.**

## Measurements

| what | result | artifact |
|---|---|---|
| new checks on the old tip 807cc39 | red: spy JS 0 / Python 1, runner counter 0 | `evidence/quantum/backend-site-move/red-before/` |
| `round.sh` on 8146589 | final ×3 green (88, 84, 84 checks), fault green, 3 heads red, 10/12 sabotages red, 2 nulls predicted in advance | `evidence/quantum/pyodide-bridge/out/SUMMARY.md` |
| spy, final-1 | `backendRunFromJs` 1, `backendRunFromPython` 0, runner counter 1, `interpret_counts` 1 call; result `backend_verification`, shots 256, backend `basic_simulator` | `out/final-1-dump.json` |
| caps on the branch | RED only on `entry-index` and `entry-main`; `backend-run-python` is gone | `evidence/quantum/backend-site-move/caps-after.txt` (before: `caps-before-807cc39.txt`) |
| caps with platform's current `main.js` added (disposable copy) | `backend-run-count` 2 sites: `main.js:199` + `bridge.js` | `caps-with-platform-main.txt` |
| pytest `echo/tests` | 595 passed | — |
| contract-check | GREEN 1087/1087 | — |
| ionq-sim-rehearsal replays | 4/4 exit 0. Before this change 2/4 were red: the Bell replays called a function that no longer existed. Sabotage table all as expected. | `evidence/quantum/backend-site-move/rehearsal/` |

## Nulls (predicted before the round)

- `sab-bare-toJs`: Pyodide 314.0.7's bare `toJs()` already gives plain Objects.
- `sab-plain-call`: no bridge→Python call needs a JSPI stack any more. The only one that did was Python's own `backend.run`, and the JS `backend.run` enters Python through the runner's own `callPromisingKwargs`.
- `head-pre-move-python` is red **only** on the backend-name check. At runtime the new bridge never calls the old Python submitter, so the runtime harness cannot see a leftover Python `backend.run`. The static caps rule `backend-run-python` is what catches that.

## Lessons

- Attribute a job by the Python stack (`sys._getframe(1).f_back`, walking up for a project `quantum/` frame). Cross-check the result against the runner's JS-only counter. `sys._getframe(2)` raises when JS calls `run` directly.
- The assembler takes Python from a git ref (`--python-from HEAD`), so uncommitted Python is not what runs. Commit before you grade.
