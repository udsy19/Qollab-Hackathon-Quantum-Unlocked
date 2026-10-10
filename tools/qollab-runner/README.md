# Local Qollab-like runner

Runs `echo/` in Chrome the way Qollab runs a JS / Qiskit project, so "works here" predicts "works on Qollab". **It is a local runner. Nothing it shows is a Qollab or IonQ result.**

```bash
node tools/qollab-runner/server.mjs --port <your own port>      # then open http://127.0.0.1:<port>/
node tools/qollab-runner/check.cjs  --port <port> --backend builtin|ionq-mock --out <dir> [--expect-build <token>]   # drives the integration shell
bash tools/qollab-runner/sabotage.sh <base-port> <out-dir> <assembled echo/ dir>   # falsification round on disposable copies
```

`--project <dir>` serves another project folder (the default is `echo/`). On first start the server makes one GET to fetch Qollab's Qiskit wheel (6.1 MB) into `.cache/` (gitignored). After that the page needs only jsdelivr and PyPI. Use Chrome or another JSPI browser, as on Qollab.

In the page: choose a backend, press **Run** (each Run makes a fresh frame, as Qollab keeps nothing between runs), and press **Stop**. The header counts every `backend.run` call. It turns amber on a second job on the built-in backend ("would be refused on IonQ") and red when the IonQ mock refuses one.

## What it mimics, and the source for each behaviour

Sources: **[doc]** pages under https://qollab.xyz/learn/docs/ (read 2026-10-09). **[rt]** Qollab's shipped runtime `/_nuxt/jsworker-C6a5_czr.js` and compiler chunk `/_nuxt/BWPMdZ7B.js`, both read with GET only on 2026-10-09. **[net]** the network log of a signed-out Built-in simulator run of `qollab/qcflows-multifile` on 2026-10-09. Details are in `vault/Research/qollab-js-runtime-internals.md`.

| behaviour | source |
|---|---|
| Pyodide **v314.0.7** from `cdn.jsdelivr.net/pyodide/v314.0.7/full/`, loaded with no options. Python reports 3.14.2. | [rt] line 1, [net] |
| Qiskit is **Qollab's own wasm wheel**, `qiskit-2.5.2-cp310-abi3-pyemscripten_2026_0_wasm32.whl`, installed by micropip with `pre=True`. Its dependencies come from PyPI and Pyodide (rustworkx 0.18.1 wasm, numpy 2.4.6, scipy 1.18.0). | [net], [rt] |
| The wheel is patched to `from js import reportCounts, reportNumQubits, sendFile`. The runner provides these globals, which feed the console's "Probabilities panel" and "Circuit panel" lines. Without them `import qiskit` fails. | wheel source, [rt] `Te()` |
| Python preamble: warnings filter, `QISKIT_PARALLEL=FALSE`, `RAYON_NUM_THREADS=1`, a main-thread executor, then `backend = BasicSimulator()`. | [rt] `ke`/`Ae`/`je`/`Ne` |
| Project JS is compiled by Babel `transform-modules-commonjs` (`importInterop: none`), with the hoisted `require(` changed to `await require(`. It runs as `AsyncFunction(console, parent, setTimeout, require, backend, exports, module)`. | [rt] `pl()`, run loop |
| Bare imports try Python first (`import <dotted> as m`) and fall back to a URL/import-map import. `qiskit.providers.jobstatus` stringifies `JobStatus`. A default import of a Python module gives `undefined`. | [rt] `dt()`/`ut()`/`ot()`, [doc] runtime-environment |
| `./` and `../` imports try the exact path, then `.js`, `.mjs`, `index.js`, `index.mjs`. Only `.js`/`.mjs` files can be imported. | [rt] `xt()`/`bt()`, [doc] |
| Import map: `three`@0.186.1, `three/addons/`, `postprocessing`@6.39.5 from jsdelivr. | [rt] `jsworker.html` |
| `backend.run(c, {shots})` → `run.callPromisingKwargs(c, {shots})`. `job.status()` and `job.result()` are async. | [rt] `ft()`, [doc] js-qiskit-projects |
| **IonQ one-job mock**: the second `backend.run` throws `The code has already filed one circuit execution job; only one job is allowed per code run`. | [rt] `rewriteIonqRequest`, [doc] runtime-environment § One job per run |
| `index.html` loses its html/head/body tags and is appended with `innerHTML`, so `<script>` never runs. `main.css` becomes one `<style>`. | [doc], [rt] |
| The injected `setTimeout` is async (pass a number to get a promise to await). `parent` is `null`. `console.*` sends each argument as a separate text line. | [rt] `V`, run loop, [doc] |
| Sandboxed frame with origin `null`: localStorage, sessionStorage, IndexedDB and cookies throw. Every method except GET/HEAD/OPTIONS is refused. `XMLHttpRequest` throws "XHR is not supported, please use fetch() API". `WebSocket`/`Worker` are undefined. | [doc] § Network access, § Saving data; [rt] `ye()` |
| The project root is the cwd and `sys.path[0]`. Data files load only when their path appears as a quoted literal in Python. | [doc] § Importing, § Data files |
| Caps check: more than 100 files, a file over 2 MB, or a missing root `index.html`/`main.js` shows a red banner. | [doc] § Limits, upload-your-files |

## What it does NOT mimic (so "works here" does not prove these)

- **Any real IonQ path.** The "IonQ one-job mock" is a `BasicSimulator` with a counter. It has no qiskit-ionq, no noise model, no network, no queue and no credits. The runner does not mimic the XHR `ConnectionError` that a plain (non-`callPromising`) Python call raises on IonQ, so always use `.callPromising`.
- **Qollab's own console UI.** The Probabilities and Circuit panels appear here only as console lines.
- **The exact data-file rule.** The runner uses a substring test for a quoted path. Qollab's real scanner may differ on edge cases.
- **Versions of `@tweenjs/tween.js` and `meshline`.** Qollab bundles them at versions not visible to us; the runner loads jsdelivr's latest.
- **Run settings, Stop's 5-second grace, the credits dialog, and per-user storage limits.**
- **Browser coverage.** It is tested headless in Chrome 155 only.
