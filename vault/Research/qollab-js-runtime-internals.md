---
type: research
status: current
date: 2026-10-09
updated: 2026-10-10
owner: platform (g0-runner-smoke, g0-input-diagnostic)
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

## The preview iframe and the end of a run (re-read 2026-10-10, g0-input-diagnostic)

Read 2026-10-10 ~00:15 ET, GET only, signed out: the SPA entry `/_nuxt/C30t4T_n.js` and the 351 chunks it references, plus their CSS. Same file names as on 2026-10-09. sha256: `BWPMdZ7B.js` 522afd376b52…, `jsworker-C6a5_czr.js` 9c0cf2815c9f…, `entry.Boyg86oZ.css` c87eba9ac6d1…, `_project_.DmQDnk_I.css` 58db928b665a….

| fact | source |
|---|---|
| The preview iframe is created by class `Ol`: `document.createElement("iframe")`, `e.sandbox="allow-scripts"`, `className="js-runtime"`, `src="/jsworker.html?1#<runtime url>"`, appended to `document.body`. **No `allow` attribute, no other sandbox token.** | `BWPMdZ7B.js`, `Ol` constructor |
| So the frame's origin is **opaque** (`window.origin === "null"`): it is cross-origin to qollab.xyz even though its URL is `https://qollab.xyz/jsworker.html` (that URL is what puppeteer reported). This settles the 2026-10-09 open question. | sandbox semantics; measured in the runner with the same attribute |
| **No `allow-pointer-lock`**: `requestPointerLock()` inside the frame is refused. Also no `allow-modals`, `allow-forms`, `allow-popups`, and no `allow="fullscreen"`, so the Fullscreen API is refused too. (Qollab has its own fullscreen toggle, which restyles the iframe from outside.) | `Ol`; runner control: the same page reads REFUSED under `allow-scripts` and GRANTED under `allow-scripts allow-pointer-lock` (`evidence/platform/g0-input-diagnostic/pointer-lock-control/`) |
| **Nothing focuses the frame.** No `.focus()` on the iframe or its window in either file; the QPU dialog focuses its own `[data-qpu]` buttons. So keys go to Qollab's page until the player clicks inside the frame. | `BWPMdZ7B.js`, `jsworker-C6a5_czr.js` (grep `focus(`) |
| The runtime inside the frame adds **no** input listeners (its only `addEventListener` is `message`) and removes its loading overlay before `main.js` runs. | `jsworker-C6a5_czr.js` |
| Placement: the iframe is `position:absolute`, no `z-index`, sized and placed with CSS anchor positioning over `.pp-preview-anchor` (`anchor-name:--code-iframe-wrapper`). Whether any Qollab element sits transparently above it is **not** settled by reading; the in-page diagnostic settles it per run. | `entry.Boyg86oZ.css` `iframe.js-runtime`; `_project_.DmQDnk_I.css` `.pp-preview-anchor`; `attachIframe` |
| **When `main.js` returns**, the frame posts `Done.` and `done`. The parent's `done` handler `Te` calls `De()`, which aborts the `AbortController` that registered its `out`, `err`, `system`, `debug`, `running`, `file`, `job-posting`, `cost`, `cost-consent`, `cost-rejected`, `circuit` and `probabilities` listeners. **After `Done.`, Qollab's console, Probabilities panel, Circuit panel and credits prompt ignore the frame.** The frame stays visible and its DOM handlers keep working. | `BWPMdZ7B.js` `Ee`, `De`, `Te` |
| Also when `main.js` returns, the frame clears its run flag `W`. While `W` is set, `self.fetch` sends IonQ requests through `rewriteIonqRequest` (Qollab's proxy, the one-job rule, credits) and refuses non-GET requests; when `W` is clear it calls the native fetch. `reportCounts`/`reportNumQubits`/`sendFile` also do nothing when `W` is clear. So **an IonQ `backend.run` after `Done.` bypasses Qollab's proxy**; that it then fails is inferred, not observed. | `jsworker-C6a5_czr.js` `self.fetch`, `Te(self,U,()=>W)`, `finally{W=!1}` |

**Consequences.** (1) `main.js` must not return while the game is running: it should `await` the ending (G0 smoke 10c awaits its one job). (2) Mouse-look cannot use pointer lock on Qollab; use drag-to-look. (3) The game needs a "click to start" moment so keys reach the frame. (4) The 2026-10-10 G0 symptom (Verify press did nothing, not even DOM text) is not explained by the after-`Done.` behaviour, which leaves DOM handlers alive; the 10c diagnostic tells input-blocked from handlers-dead on the next run.

## What this means for us

- A local runner can be **faithful in the part that matters**: the same Pyodide, the same Qiskit bytes, the same compile and the same call shape. "Works in the runner" therefore covers Pyodide and Qiskit compatibility, which a CPython bridge could not. The runner is `tools/qollab-runner/`. Its fidelity table and its gaps are in its README.
- Python is reached only through `import * as m from 'pkg.mod'` + `m.fn.callPromising(...)`. Keep `backend` out of module-level state that outlives the run.
- Always convert with `dict_converter: Object.fromEntries`.

## Open

- ~~Is the frame sandboxed without `allow-same-origin`?~~ Settled 2026-10-10: `sandbox="allow-scripts"` only (section above).
- Does a real or automated click on Qollab's page reach the frame? Answered per run by the 10c input diagnostic (`echo/diag.js`).
- What do IonQ remote simulators show in Select QPU when signed in? (Owner question, carried from [[qollab-platform-and-submission]].)

## Related

- [[qollab-platform-and-submission]]: docs-level facts, limits and submission.
- `tools/qollab-runner/README.md`: what the runner mimics and what it does not.
