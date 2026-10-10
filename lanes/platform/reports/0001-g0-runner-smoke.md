# 0001 g0-runner-smoke: FINAL (2026-10-09 ~23:55 ET)

## TL;DR
- **G0 is ready for the owner's Qollab run. It has run only on the LOCAL RUNNER, never on Qollab or IonQ.** `echo/` has 6 files (cap 100): a Three.js scene, the Python bridge to `quantum/smoke.py` (`callPromising` + `toJs`), and one guarded `backend.run`. The owner's steps are in `echo/QOLLAB_SMOKE_TEST.md`.
- **The runner is faithful where it matters.** It uses the same Pyodide v314.0.7 and the **same Qollab Qiskit 2.5.2 wasm wheel** Qollab loads (found in the network log of a public signed-out run), compiled and injected the way Qollab's shipped runtime does it. No CPython bridge was needed, so "works locally" covers Pyodide and Qiskit compatibility.
- `check.cjs` → exit 0, **16/16** on both `builtin` and `ionq-mock`. Bridge: P(00)=P(11)=0.5 in Pyodide (`platform: emscripten`). Counts: one job of 256 shots. Second press: visible refusal, and the runner still counts 1 job.
- **Sabotage: 7 of 7 caught** (the guard removed under both backends, wrong bridge physics, wrong backend circuit, no render, wrong build token, sandbox loosened). The guard-removed run turns the runner red with Qollab's exact one-job error.
- Evidence: `evidence/platform/g0/` (README lists commands and exit codes). Renders: `lanes/platform/renders/g0-runner-smoke/1..4-*.png`.
- **Recommend:** hand `echo/QOLLAB_SMOKE_TEST.md` to the owner now. Merge this branch so every lane develops against `tools/qollab-runner/`.

## Vault check
- **Read:** `vault/AGENTS.md`, `vault/Index.md` (no runner, smoke test or Pyodide entry), `vault/Research/qollab-platform-and-submission.md`, `QOLLAB_DEPLOYMENT.md`, `.claude/rules/qollab-runtime.md`, `lanes/platform/context.md`, and the earlier org's `0001-ionq-sim-spike.md` (read-only). `where.mjs runner --branches` found no implementation on main or any branch. `git grep -i pyodide` returned only docs.
- **Already known and reused:** Python 3.14 / Qiskit 2.x; `three` 0.186.1 by name; no `<script>`; JS cannot read files; plain calls fail on IonQ; one job per IonQ run; upload strips one wrapping folder; "Credits apply" on IonQ rows when signed out.
- **New:** where Qiskit comes from (Qollab's own patched wasm wheel), and the exact compile, inject and import semantics. Written up in `vault/Research/qollab-js-runtime-internals.md`.
- **Stale or wrong:**
  - The brief says "a dev-only bridge to CPython may be needed". It is not.
  - The docs' `JSON.stringify(counts)` example likely prints `{}`, because `toJs()` gives a `Map` by Pyodide default (Qollab calls `loadPyodide()` with no options). Inferred, not observed on Qollab. Our code uses `dict_converter: Object.fromEntries`.
  - `QOLLAB_DEPLOYMENT.md` suggests `quantum/__init__.py`. The docs' example works without it, so I left it out; it is in the failure table if Qollab disagrees.

## What the runner mimics, with citations
The full table is in `tools/qollab-runner/README.md`. Sources: [doc] Qollab docs, [rt] `jsworker-C6a5_czr.js`, [cc] `BWPMdZ7B.js`, [net] network log, all GET-only reads on 2026-10-09.
- Pyodide v314.0.7 from jsdelivr, `loadPyodide()` [rt, net].
- Qollab's wheel installed with micropip `pre=True` [net, rt].
- The js hooks the wheel imports: `reportCounts`, `reportNumQubits`, `sendFile` (wheel source). Without them `import qiskit` fails; this is how the first run went red.
- The Python preamble and `backend = BasicSimulator()` [rt].
- Babel `transform-modules-commonjs` with `importInterop: none`, then `await require` [cc].
- `AsyncFunction(console, parent, setTimeout, require, backend, exports, module)` [rt].
- Python-first bare imports [rt].
- Import map for three, addons and postprocessing [rt].
- `backend.run` → `callPromisingKwargs` [rt].
- The IonQ one-job error text [rt].
- XHR throws [rt]; the async `setTimeout` [rt].
- `innerHTML` body fragment, `main.css` as the only stylesheet [doc, rt].
- Null-origin sandbox, so storage throws, non-GET is refused, and there is no WebSocket or Worker [doc]. Measured by a check that goes red when the sandbox is loosened.
- 100-file / 2 MB caps [doc].

## What it does NOT mimic
- Any real IonQ: `ionq-mock` is BasicSimulator plus a counter (no qiskit-ionq, noise, network or credits).
- The plain-call XHR `ConnectionError` on IonQ.
- Qollab's console panels (shown here as console lines).
- The exact data-file literal rule (approximated).
- tween/meshline versions.
- Run settings, Stop grace, the credits dialog.
- Any browser other than headless Chrome 155.
- Load time on Qollab (local: 5.5–6.0 s with a warm cache).

## Commands and exit codes (worktree, commit 71d2477)
- `node tools/qollab-runner/server.mjs --port 4871` → serving. It cached the 6,127,028-byte wheel with one GET.
- `node tools/qollab-runner/check.cjs --port 4871 --backend builtin --out evidence/platform/g0 --expect-build g0-smoke-2026-10-10b` → **0** (16/16). Counts `{"11":139,"00":117}`, 37,324 cyan pixels.
- The same with `--backend ionq-mock` → **0** (16/16). Counts `{"11":128,"00":128}`.
- `bash tools/qollab-runner/sabotage.sh 4880 evidence/platform/g0/sabotage` → controls 0/0, sabotages 1,1,1,1,1,2 (all as expected). This run predates the sandbox check.
- The sandbox loosened to `allow-same-origin` (temporary edit, reverted) → **1**.
- `node scripts/gates/sprawl.mjs` → PASS (11 checks).
- **Provenance (law 16):** the token was changed from `…10a` to `…10b`, the page reloaded, and `…10b` was read back from the rendered page. `--expect-build` with a wrong token aborts with exit 2.
- **Gate-first:** the first check run went red for real (the `sendFile` ImportError, then a pixel check that read a cleared WebGL buffer). The runner and the check were fixed, not loosened: the scene check now grades screenshot pixels.

## Nulls (sabotage that did NOT go red)
- **Found and fixed:** with the backend circuit changed to |11⟩ (bridge sabotage H→X), the counts checks "256 shots" and "only 00/11" **stayed green**. I added a binomial balance check (each of 00 and 11 within 88..168 of 256, ±5 sd), and the `wrong-bridge` and `wrong-backend-circuit` cases now go red on it.
- **Not sabotaged:**
  - The caps banner (more than 100 files / over 2 MB).
  - The data-file literal rule.
  - The XHR stub.
  - The Babel compile step. A broken compile would fail every check, which shows it is load-bearing, but it was not run as a separate case.

## Evidence paths
- `evidence/platform/g0/{builtin,ionq-mock}-{1-scene-and-bridge,2-one-job-counts,3-second-press-refused}.png`, `check-*.log`, `*-results.json`
- `evidence/platform/g0/sabotage/sabotage-summary.txt` and 5 sabotage PNGs
- Renders for the supervisor: `lanes/platform/renders/g0-runner-smoke/` (1 scene+bridge, 2 one-job counts, 3 refusal, 4 guard removed → runner red)
- Vault: `vault/Research/qollab-js-runtime-internals.md` and `vault/Reports/g0-runner-smoke.md`. Hubs were not regenerated, per the brief; `vault-hubs --check` shows Research/README and Map stale.

## What I changed (commits on `lane/platform/g0-runner-smoke`)
- `e2f0ab6`: `echo/{index.html,main.js,main.css,requirements.txt,quantum/smoke.py}` and `tools/qollab-runner/{server.mjs,host.html,host.js,frame.html,frame.js,check.cjs,.gitignore}`.
- `67b7a7f`: `sabotage.sh`, runner README, `echo/QOLLAB_SMOKE_TEST.md`, the balance and sandbox checks, the docs-shaped backend circuit, build token `10b`, evidence, and both vault notes.
- `71d2477`: `evidence/platform/README.md` (sprawl gate).
- **Outside my lane:** `echo/quantum/smoke.py`, the one smoke module the brief allowed in the quantum lane's folder. I added no `__init__.py`. `echo/requirements.txt` is comment-only on purpose: naming qiskit might change Qollab's install path.

## Not done / not verified
- **No Qollab run and no IonQ run.** Only the owner can do these.
- Firefox, Edge and other browsers were not tried. JSPI is needed.
- `echo/` has no `README.md` or `LICENSE` yet. These are release files for later; not needed for G0.
- The puppeteer dependency for `check.cjs` is the copy bundled with the global MCP install (override with `PUPPETEER_CORE`). It works on this Mac and is fragile elsewhere.

## Questions for the owner
1. After you run `echo/QOLLAB_SMOKE_TEST.md` on the built-in simulator, please send back the screenshot after step 7 and the copied console text.
2. Signed in, do the IonQ remote simulators in Select QPU show **Free** or **Credits apply**? If credits apply, do you want the optional IonQ step run at all before submission? (The FAQ says to run on IonQ before submitting.)
3. Is it OK that `QOLLAB_SMOKE_TEST.md` is uploaded as a file inside the Qollab project for this draft test? I will drop it from the release upload unless you want it kept.

## What the supervisor should do next
1. Send the owner `echo/QOLLAB_SMOKE_TEST.md` now; G0 closes only on their screenshot.
2. Merge this branch so the gameplay, quantum and story lanes develop on `node tools/qollab-runner/server.mjs --port <own>` and gate with `check.cjs`. Each lane will need its own check; `check.cjs` is G0-specific.
3. Tell every lane the contracts this proves:
   - Python is reached via `import * as m from 'pkg.mod'` + `m.fn.callPromising()`.
   - Convert results with `.toJs({ dict_converter: Object.fromEntries })`.
   - `backend` is a parameter, not a global.
   - Make at most one `backend.run` per run, guarded before the first `await`.
4. Have the loop regenerate the vault hubs, so the two new notes get linked.
