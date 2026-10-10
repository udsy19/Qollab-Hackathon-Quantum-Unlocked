# Qollab-native project deployment and compatibility checklist

**Last researched:** October 9, 2026. This is a technical plan, not proof the project has been deployed.

## Why Qollab native is the required target

A native HTML/JS project on Qollab can display interactive content and import the bundled `three` library, while using Qiskit through the browser's Pyodide-backed Python modules. This is a feasible path to a fully playable small 3D game that judges can run on the official platform.

**Do not rely exclusively on an external React website.** If a more elaborate external edition exists, it must use an MIT code license and must not be necessary to see the actual quantum experiments.

## Runtime facts

- Qollab treats a root `index.html` + `main.js` as an HTML/JS project; `main.css` is optional and automatically loaded.
- `index.html` content is inserted into the body; use only body children, not full document scaffolding or inline scripts.
- `main.js` and local JS modules import `three` and supported `three/addons/...` by name; bundled Three.js is documented.
- Python module imports through JS use dotted names; `import * as cloning from 'quantum.cloning'`; invoke Python functions through `.callPromising` and convert results with `.toJs()`.
- Selected quantum `backend` is injected into project code. Choose it in the Run dialog, not with hardcoded provider credentials.
- `backend.run(qc, {shots:256})` is asynchronous for JS/Qiskit. Use actual job results, not made-up probabilities.
- Built-in simulator supports repeated backend jobs; **IonQ backends allow one backend job per run**, including remote simulators. Design to this stricter common denominator.
- One project file <=2 MB; maximum 100 files; account project storage max 200 MB.
- No persistent localStorage, sessionStorage, IndexedDB, cookies or durable files between runs.
- External network GET only with CORS allowed; POST, PUT, DELETE, XHR, workers and WebSocket unavailable.
- Python is Pyodide. Compiled Python wheels may not work unless Pyodide provides them. Qiskit is provided; avoid heavy extras until tested.
- Browser support depends on WebAssembly JSPI, so check the Qollab docs and compatibility warning.

## Suggested Qollab root files

`index.html`, `main.js`, `main.css`, `requirements.txt`, `quantum/*.py`, `game/*.js`, `scene/*.js`, `ui/*.js`, `data/*.js`, `LICENSE`, `README.md`, and small `assets/*`.

## Minimal in-world UI markup

```html
<!-- index.html fragment: do NOT add html/head/body wrappers -->
<div id="game-root" role="application" aria-label="ECHO game world"></div>
<div id="hud" aria-live="polite"></div>
<div id="dialogue" aria-live="polite"></div>
<div id="terminal" role="dialog" aria-modal="true" hidden></div>
<div id="pause-menu" hidden></div>
```

Don't use `role="application"` carelessly if it interferes with assistive-tech navigation; adjust in actual accessibility testing.

## Exact backend strategy

**Interactive puzzle calculations:** Python Qiskit `Statevector`, `DensityMatrix`, `partial_trace`, `state_fidelity` operate locally in browser and return structured data to JS; no selected backend job per click.

**One proof on selected backend:** Qollab-compatible circuit executed once with `backend.run` and real counts. Use a valid simple Bell-pair sampling circuit if full dynamic teleportation isn't supported, and label it as Bell verification. Teleportation itself remains backed by exact local Qiskit mathematical validation and published code.

**Do not claim:** “teleportation run on IonQ simulator” when only Bell sampling was submitted. If dynamic feedforward is unsupported on an IonQ-selected backend, explain deferred-measurement mathematical verification clearly.

## First test to execute in Qollab

1. New Qollab project with `index.html`, `main.js`, `main.css`.
2. `main.js` imports `three` and renders a camera, one emissive cube, a plane, and a label.
3. Project includes `quantum/cloning.py`, `__init__.py`, a `run_calibration` returning a dict.
4. JS asynchronously calls that Python function with `.callPromising`.
5. JS calls `backend.run` **once** with a Bell circuit and displays actual counts.
6. Test in built-in free simulator, then IonQ simulator if available.
7. Only after this works: build player movement, scene and story.

## Official sources

- https://qollab.xyz/learn/docs/runtime-environment
- https://qollab.xyz/learn/docs/js-qiskit-projects
- https://qollab.xyz/learn/docs/run-your-code
- https://qollab.xyz/learn/docs/python-qiskit-projects
- https://qollab.xyz/programs/hackathon/terms

## Publishing requirements

- Use Qiskit.
- Run on Qollab free simulators including the IonQ simulator compatibility path. Judges use free local simulator by default.
- Publish runnable MIT-licensed project on Qollab by October 11, 2026, 19:00 ET.
- Any outside repo it relies upon for required experience must also be MIT.
- 2–3 minute public no-login video.
- Project page explains the game, technical contribution, execution steps and results.
- Disclose prior code, templates, library content and externally sourced assets.
- Include required exact attribution: **This effort is supported by Qollab & IonQ**.
- Follow Qollab's accessibility best-practices requirement.

## Checklist before publishing

- [ ] Run Qollab project from scratch inside public runner.
- [ ] Verify default simulator selected and sample circuit completes.
- [ ] Test IonQ simulator pathway where possible; no second selected-backend job.
- [ ] Three.js scene renders and is interactive.
- [ ] Python bridge returns actual local Qiskit data.
- [ ] File sizes and number within platform caps.
- [ ] No confidential API keys or copyrighted proprietary game assets.
- [ ] Source and dependencies licensed appropriately.
- [ ] Demo video link public, 2–3 min.
- [ ] Controls, subtitles, reduced motion and instructions.
- [ ] Required Qollab/IonQ credit.

**If publishing is blocked:** maintain a working local source bundle, document the exact error and manual upload steps, and do not claim submission succeeded.
