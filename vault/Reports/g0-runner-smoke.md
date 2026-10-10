---
type: report
status: current
date: 2026-10-09
updated: 2026-10-09
owner: platform (g0-runner-smoke)
tags:
  - g0
  - qollab
  - runner
---

# G0 platform smoke and local Qollab-like runner (measured, local runner only)

`echo/` now holds a 6-file G0 smoke project: a Three.js scene, `quantum/smoke.py` reached through `callPromising` + `toJs`, and one guarded `backend.run`. `tools/qollab-runner/` runs it on the same Pyodide v314.0.7 and the same Qollab Qiskit 2.5.2 wasm wheel that Qollab loads ([[qollab-js-runtime-internals]]). **None of this has run on Qollab.** The owner's steps are in `echo/QOLLAB_SMOKE_TEST.md`.

## Measured (branch `lane/platform/g0-runner-smoke`, 2026-10-09 ~23:45 ET, headless Chrome 155)

| check (from `tools/qollab-runner/check.cjs`) | builtin | ionq-mock |
|---|---|---|
| exit code, checks passed | 0, 16/16 | 0, 16/16 |
| bridge `probabilities` | `{"11":0.5,"00":0.5}` | same |
| bridge `platform`, `qiskit_version`, `python_version` | emscripten, 2.5.2, 3.14.2 | same |
| one-job counts (256 shots) | `{"11":139,"00":117}` | `{"11":128,"00":128}` |
| runner `backend.run` count after 2 presses | 1 | 1 |
| cyan cube pixels in canvas screenshot (threshold 2000) | 37,324 | 36,494 |
| page ready after Run (warm HTTP cache) | 5.5 s | 6.0 s |

Evidence: `evidence/platform/g0/` (README lists each command and its exit code).

## Sabotage round (`tools/qollab-runner/sabotage.sh`, disposable copies)

| sabotage | result |
|---|---|
| JS guard removed, IonQ mock | red: the runner refuses job 2 with Qollab's message and the header turns red |
| JS guard removed, built-in | red: the runner counts 2 jobs |
| H→X in the bridge state | red: bridge probs `{"11":1}`, purity 1 |
| X added to the backend circuit only | red: counts are only 01/10 |
| `renderer.render` removed | red: 0 cyan pixels |
| `--expect-build` wrong | refused (exit 2) |
| frame given `allow-same-origin` | red: the sandbox check sees localStorage allowed |

**Null found and fixed during the round:** with the backend circuit changed to |11>, the first counts checks ("256 shots", "only 00/11") stayed green. A binomial balance check (88..168 of 256 for each of 00 and 11, ±5 sd) was added, and it catches that case.

## Found while building

- Qollab's Qiskit wheel imports `reportCounts`, `reportNumQubits` and `sendFile` from `js`. Any runner that uses that wheel must provide them.
- Reading a WebGL canvas back in 2D returns a cleared buffer, so a scene check must grade screenshot pixels instead.
