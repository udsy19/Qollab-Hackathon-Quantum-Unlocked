---
type: research
status: current
date: 2026-10-10
updated: 2026-10-10
owner: quantum (backend-site-research)
tags:
  - qollab
  - backend
  - ionq
  - pyodide
---

# Where the one selected-backend `backend.run` lives: JS, in `echo/quantum/bridge.js`

**Answer: Option A.** JS can submit a circuit that Python built. Python builds the circuit and reads the counts. The single `backend.run` and its once-per-run memo live in `bridge.js`. This route is documented, and Qollab's own runtime uses it. In the local runner it shows exactly 1 job from both sides, and it removes the caps `backend-run-python` line. Neither route changes what Qollab itself enforces: the real IonQ one-job check sits on the network layer and counts a job from either language.

Labels: **DOC** = Qollab docs; **RT** = Qollab's shipped runtime JS, read with GET only; **MEASURED** = local runner or pytest, with an artifact. **Nothing here ran on Qollab or IonQ.**

## Sources (fetched 2026-10-10, ~00:30 ET)

- https://qollab.xyz/learn/docs/js-qiskit-projects, /runtime-environment, /run-your-code, fetched with `curl` and converted to text.
- `https://qollab.xyz/_nuxt/jsworker-C6a5_czr.js`, 41,255 bytes, sha256 `9c0cf2815c9f…9b7752b`. This is the same chunk platform's `vault/Research/qollab-js-runtime-internals.md` (on `lane/platform/integration`, not yet here) read on 2026-10-09, and it still returns 200. Nobody re-checked that the live site still loads this chunk: the project page is a client-rendered shell.
- Platform's runner at `lane/platform/integration` f08dd0b, `tools/qollab-runner/frame.js`.
- Harness and results: `evidence/quantum/backend-site-research/` (README, `out/SUMMARY.md`).

## (a) Can JS call `backend.run` with a circuit built in Python? What comes back?

| finding | label | source |
|---|---|---|
| In JS, "`await backend.run(circuit, { shots })` returns a job, and `await job.result()` gives the result." | DOC | runtime-environment § The backend variable |
| A JS circuit is itself a Python object: `import { QuantumCircuit } from 'qiskit'` imports the **Python** package, so `QuantumCircuit(2, 2)` in JS is a PyProxy of a Python `QuantumCircuit`. A circuit that a Python function returns through `callPromising` is the same type. | DOC + RT | js-qiskit-projects § "Import from qiskit"; RT `dt()` tries `import <name>` in Python first |
| The JS `backend` is a Proxy whose `run(...)` calls `run.callPromisingKwargs(...)` on the Python backend. `job.status()` and `job.result()` are async and go through `callPromising`. So a JS `backend.run` enters Python on a promising stack, which is what the IonQ HTTP client needs. | RT | `ft()`, at byte offset 35672 of the runtime |
| The return value: `job.result()` is a PyProxy of a Qiskit `Result`. `.get_counts()` gives a PyProxy dict, which can go straight back into a Python function. Pyodide unwraps it to the original dict. | DOC + MEASURED | js-qiskit-projects minimal example; `out/A-*-dump.json` |
| **QASM is not needed.** No doc mentions a QASM route, and the PyProxy route is the documented one. | DOC | — |

## (b) Does the runner's mock support that route?

| finding | label | source |
|---|---|---|
| Yes. The runner's `wrapBackend` mirrors `ft()`: it calls `callPromisingKwargs` and wraps the job's `status` and `result`, and it adds a JS-side counter plus the ionq-mock refusal of a second call. | MEASURED | `frame.js` `wrapBackend`; runs `A-1..3` |
| The runner's counter sees **only** the JS route. With today's Python route it reads **0** while a 256-shot job runs. This reproduces [[pyodide-bridge]] finding 2. | MEASURED | `out/B-baseline*.log` |
| The runner does **not** model Qollab's real guard, which is network-level (next section). Its counter is a JS-proxy counter. | RT vs runner | — |

## Qollab's real one-job check is on the network, not on the JS proxy

| finding | label | source |
|---|---|---|
| The frame replaces `self.fetch`. Requests to IonQ are rewritten to `api.qollab.xyz/api/ionq/` by `rewriteIonqRequest`. A second `POST jobs` throws `The code has already filed one circuit execution job; only one job is allowed per code run`. | RT | runtime, near byte offsets 29815–30700 and 38321 |
| So on IonQ, Qollab counts a job **whichever language submitted it**: both routes end in the same `fetch`. Platform's `echo/main.js` comment says "Qollab's job accounting … sit[s] on the JS backend proxy". The shipped runtime contradicts that. Only the **local runner's** counter sits there. | RT | `lane/platform/integration:echo/main.js:183` |
| `ft()` itself counts nothing. | RT | `ft()` |

## (c) A or B?

**A.** Measured in the local runner (ionq-mock backend, fresh disposable copy and fresh browser profile per run). `out/SUMMARY.md`:

| run | runner JS counter | Python spy (`BasicSimulator.run`) | result |
|---|---|---|---|
| A ×3 (Bell, verify asked twice) | 1 | 1 | 14/14 each: same promise, raw keys only 00/11, 256 shots, validator-clean, `backend_verification` |
| A-control (X on q0) | 1 | 1 | raw `{"01":256}`, so clbit 0 is on the right; delivered `{"01":256}` with keyQubits `[1,0]` decodes to q0=1, q1=0 |
| B baseline (today: bridge-rewire bridge.js, Python submits) | **0** | 1 | red only on the runner counter |
| sabotage: memo removed | 2 (1 refused) | 1 | red |
| sabotage: Python also calls `backend.run` | 1 | **2** | red. The runner cannot see this; only the spy can |
| sabotage: parser reads clbit 0 from the left | 1 | 1 | control red; **Bell null** (00/11 are symmetric, as predicted) |

Why A carries the least risk:
- It meets the ruling literally. owner-answers says "exactly one guarded backend.run site (echo/quantum/bridge.js)", and line 84 (e) says to "delete the Python-side `backend.run` site". A needs no exemption.
- It is the documented JS call shape: the runtime-environment and js-qiskit-projects examples call `backend.run` from JS.
- It clears caps `backend-run-python` (`out/caps.log`).
- The local runner can then see the job, so the gate can prove "1 job" from two places that do not trust each other.
- B needs a caps exemption plus a new runner hook. It keeps the job invisible to today's gate, for no Qollab-side gain, because Qollab counts both routes the same way.

Residual risks, for both routes equally:
- No IonQ run has exercised either route.
- The overseer's G0 screenshot (`evidence/qollab/g0-builtin-verify-no-response-2026-10-10.jpg`) leaves UNRESOLVED whether a click handler that fires after `Done.` still reaches Python on Qollab.

## What it changes in other notes

- [[qollab-backend-from-js-projects]] "What this settles": "`qollab_job.py` … called from `main.js` with `.callPromising(backend)`" is superseded by A. Python now receives `backend` only to read its name.
- platform's `vault/Research/qollab-js-runtime-internals.md` (on `lane/platform/integration`, not yet here) is right about `ft()` and `rewriteIonqRequest`. The `main.js:183` comment that cites it draws the wrong conclusion from it.

## Related
[[qollab-backend-from-js-projects]] · [[qollab-platform-and-submission]] · [[pyodide-bridge]] · [[qollab-caps-gate]] · [[ionq-sim-rehearsal]]
