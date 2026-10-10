---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: platform (integration-shell)
tags:
  - integration
  - qollab
  - runner
---

# Integration shell: one echo/ tree assembled from every lane, run on the local runner

Measured on the **local runner** only, never on Qollab. Branch `lane/platform/integration-shell`.

## What exists
- `tools/assemble-echo/assemble.mjs` builds one `echo/` tree from the five `lane/*/integration` refs, by lane ownership. It prints every path held by more than one ref (DUPLICATE when the bytes are identical, CONFLICT when they differ) and flags NON-OWNER and UNOWNED paths. Exit codes: 0 green, 1 violation, 2 could not run. `run-fixtures.mjs` covers these cases in a throw-away git repo, 8/8.
- `tools/assemble-echo/retyped-names.mjs` checks whether a module retypes a contract name as a string literal or an object key.
- `echo/index.html` holds the canvas, `#echo-ui` (contracts `UI_ROOT_ID`) and a system box. `echo/main.js` runs the boot of §8.3:
  1. renderer and placeholder room;
  2. story-ui's menu, HUD and dialogue;
  3. gameplay's `createQuestMachine` on `contracts.js`;
  4. Settings `quality` → pixel ratio and shadows, `volume` → audio stub;
  5. Restart → `resetGame()`;
  6. pointer lock released while a menu or dialogue is open;
  7. the cloning bridge answer, and the one guarded `backend.run`.
- `tools/qollab-runner/check.cjs` now drives the shell: title → Start → Settings → quantum → Verify ×2 → Restart. The G0 smoke check it replaces is gone.

## Measured (2026-10-10)
| fact | value |
|---|---|
| `import … from './contracts.js'` in main.js, and `'../contracts.js'` from `game/state.js`, under the CJS transform | **works** on the runner (quest goes BOOT→TITLE→OPENING) |
| Pyodide v314.0.7 `toJs()` with no options, on a dict | plain `Object`, **not** a `Map` (the earlier note's inference was wrong) |
| canvas pixel ratio at DPR 2: low / high | 1 / 1.75, read from `canvas.width / clientWidth` |
| cold load on the runner (warm HTTP cache) | 5.7–6.3 s |
| `echo/tests/*.py` in the tree | makes Pyodide load pytest and 10 other packages on every Run (`loadPackagesFromImports` scans all .py) |

## Sabotage (disposable copies of the assembled tree)
Caught: no `#echo-ui`; a quest state redefined with a drifted value; a Map handed to the validator; the guard removed (builtin and ionq-mock); the render removed; quality not routed; restart not wired; wrong build.

**Nulls:**
- A redefinition with the *same* value: behaviour cannot see it. `retyped-names.mjs` catches it.
- Removing `dict_converter`: no effect on Pyodide 314.
- With quality unrouted, the "low → ratio 1" check also passes, because 1 is the default. Only the high check catches that case.
- The first pixel floor (2,000 cyan pixels) was below its band. The HUD text alone gave 5,080 on a canvas that was never rendered, so it was moved to the middle of the canvas with a floor of 20,000 (real scene: about 75,000).

## Open cross-lane defects
- Quantum `qollab_job.py:131` returns `experiment: "bell_verification"`; contracts v2 requires `backend_verification`.
- Quantum `qollab_job.py:168`: `backend.run` is called inside Python, which caps flags. That call is also invisible to the JS-side job accounting.
- Quantum `tests/test_qollab_job.py:91,207` trips caps (hardcoded-backend, hardcoded-secret).
- `lane/gameplay/integration` carries a stale v1 copy of `echo/contracts.js` and `echo/CONTRACTS.md`.
- Story-ui settings still use `subtitles`; v2 `DEFAULT_SETTINGS` uses `captionStyle`.
- 70 retyped contract names in `data/objectives.js`, `data/story.js`, `data/teachback.js` and `game/objectives.js`.

Evidence: `evidence/platform/shell/` (README lists commands and exit codes).
