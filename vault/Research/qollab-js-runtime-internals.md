---
type: research
status: current
date: 2026-10-09
updated: 2026-10-09
owner: platform (g0-runner-smoke)
tags:
  - qollab
  - runtime
  - pyodide
---

# How Qollab actually runs a JS / Qiskit project (observed and read from its shipped code)

Qollab runs a JS project in a sandboxed frame (`https://qollab.xyz/jsworker.html`). It loads Pyodide **v314.0.7** from jsdelivr and installs **its own WebAssembly Qiskit 2.5.2 wheel** from `qollab.xyz/py/`. It compiles the project's ES modules to CommonJS with Babel, then calls `main.js` as an async function that receives `backend` as a parameter. Stock Pyodide has no Qiskit; Qollab's wheel is the missing piece. The wheel is public (GET), so a local runner can use the same bytes.

**How this was read (2026-10-09, ~23:00 ET).** Three sources, all signed out and GET only:

- **[net]** Headless Chrome opened `https://qollab.xyz/u/qollab/qcflows-multifile` (a public example), pressed *Run on Qollab*, chose *Built-in simulator (24q)*, pressed *Run*, and logged every request.
- **[rt]** The runtime it loaded, `https://qollab.xyz/_nuxt/jsworker-C6a5_czr.js` (41 KB), plus the frame page `https://qollab.xyz/jsworker.html`.
- **[cc]** The compiler chunk `https://qollab.xyz/_nuxt/BWPMdZ7B.js` (function `pl`).

This is shipped code, not documentation, so it can change with any deploy. The hashed file names above will change too.

## Findings

| fact | source |
|---|---|
| Pyodide `https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs`, called as `loadPyodide()` with no options. Python reports `3.14.2`. | [rt] line 1, [net]; measured in the local runner |
| Qiskit wheel: `https://qollab.xyz/py/qiskit-2.5.2-cp310-abi3-pyemscripten_2026_0_wasm32.whl?v=27`, 6,127,028 bytes, served with **no** `Access-Control-Allow-Origin`. | [net], `curl -sI` |
| micropip index URLs are `[<origin>/py, PYPI]`, and installs use `pre=True`. The dependencies seen were rustworkx 0.18.1 (wasm, from PyPI), numpy 2.4.6 and scipy 1.18.0 (Pyodide), plus stevedore, dill and typing_extensions. | [rt] `ve()`, [net] |
| The wheel is **patched for Qollab**. `qiskit/providers/basic_provider/basic_simulator.py:67` has `from js import reportCounts, reportNumQubits`, and `qiskit/visualization/circuit/circuit_visualization.py:37` has `from js import sendFile`. These globals feed the Probabilities panel, the Circuit panel and the file list. Without them, `import qiskit` raises `ImportError: cannot import name 'sendFile' from 'js'`. | wheel source; observed in the runner before the hooks were added |
| Python preamble before `backend`: a DeprecationWarning filter, `QISKIT_PARALLEL=FALSE`, `RAYON_NUM_THREADS=1`, and `ThreadPoolExecutor` replaced by a main-thread executor. Then, per backend: built-in `BasicSimulator()`; IonQ simulator `IonQProvider("STUB").get_backend("simulator")` + `set_options(noise_model=…)`; IBM `Fake<Name>()`; AWS `BraketLocalBackend()`. | [rt] `ke`, `Ae`, `je`, `Me`, `Ne` |
| **Compile:** Babel `transform-modules-commonjs` with `importInterop: "none"`. A `//PREFIX` marker is prepended, and `require(` becomes `await require(` only in the hoisted imports before the marker. | [cc] `pl()` |
| **Execute:** `new AsyncFunction("console","parent","setTimeout","require","backend","exports","module", code)`. So `backend` is a **parameter** of `main.js` and of every imported JS module, not a `window` global. `parent` is `null`. | [rt] run loop |
| **Bare imports:** `@tweenjs/tween.js` and `meshline` are bundled. A name matching `^[\w\d@_.-]+$` is first tried as Python (`import <name> as m`, with a guard against empty namespace packages), and otherwise goes to `import(name)` (the import map). `qiskit.providers.jobstatus` is wrapped so `JobStatus.X` is a string. | [rt] `dt()`, `ut()`, `ot()` |
| **Import map:** `three` → three@0.186.1 `build/three.module.js`; `three/addons/` → `examples/jsm/`; `postprocessing` → 6.39.5 `+esm`. | `jsworker.html` |
| **backend proxy:** `run(...)` → `run.callPromisingKwargs(...)`. The returned job's `status()` is async and returns a string, and `result()` is async. | [rt] `ft()` |
| **One job on IonQ:** IonQ HTTP calls are rewritten through `api.qollab.xyz/api/ionq/`. A second `POST jobs` throws `The code has already filed one circuit execution job; only one job is allowed per code run`. On error, IonQ runs try to cancel the job. | [rt] `rewriteIonqRequest` |
| `XMLHttpRequest` is replaced by a class that throws `XHR is not supported, please use fetch() API`. This is the root of the documented plain-call `ConnectionError` on IonQ. | [rt] `ye()` |
| The injected `setTimeout` is **async**. Given a function, it schedules it; given a number, it returns a promise. | [rt] `V` |
| `index.html` goes in with `document.body.innerHTML +=`, which is why `<script>` never runs. `main.css` becomes one `<style>`. | [rt] run loop |
| `.toJs()` uses Pyodide's default, so a Python `dict` becomes a JS **`Map`**. The docs' `JSON.stringify(counts)` example would then print `{}`. **Inferred, not seen on Qollab.** Safe form: `.toJs({ dict_converter: Object.fromEntries })`. | [rt] `loadPyodide()` with no options; Pyodide default |
| A cold start in the local runner is about 5–7 s on this Mac with a warm HTTP cache. The time on Qollab is **not measured**. | runner check logs |

## What this means for us

- A local runner can be **faithful in the part that matters**: the same Pyodide, the same Qiskit bytes, the same compile and the same call shape. "Works in the runner" therefore covers Pyodide and Qiskit compatibility, which a CPython bridge could not. The runner is `tools/qollab-runner/`. Its fidelity table and its gaps are in its README.
- Python is reached only through `import * as m from 'pkg.mod'` + `m.fn.callPromising(...)`. Keep `backend` out of module-level state that outlives the run.
- Always convert with `dict_converter: Object.fromEntries`.

## Open

- Is the frame sandboxed without `allow-same-origin`? The docs say origin `null`, but puppeteer reported the frame URL as `https://qollab.xyz/jsworker.html`. The runner follows the docs.
- What do IonQ remote simulators show in Select QPU when signed in? (Owner question, carried from [[qollab-platform-and-submission]].)

## Related

- [[qollab-platform-and-submission]]: docs-level facts, limits and submission.
- `tools/qollab-runner/README.md`: what the runner mimics and what it does not.
