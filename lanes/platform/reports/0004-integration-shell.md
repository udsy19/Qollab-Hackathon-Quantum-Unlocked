# 0004 integration-shell: FINAL

## TL;DR
- **The shell runs on the ASSEMBLED tree on the local runner** (not Qollab). On both builtin and ionq-mock: title over the canvas → Start (`TITLE —START→ OPENING`) → Settings quality low→high (canvas ratio 1 → 1.75, measured from the DOM) → the cloning module's answer through the bridge (overlap 0.5, purity 0.5) → one job, second press refused (runner counted 1) → Restart → TITLE. Result: 21/22. The one red is a real cross-lane contract defect (below).
- **CJS import of `./contracts.js` is PROVEN on the runner**, and so is gameplay's nested `../contracts.js`. Screenshots: `renders/integration-shell/builtin-{1..5}-*.png`.
- `tools/assemble-echo/` (assembler + 8/8 fixtures + `retyped-names.mjs`). On the current refs it is **RED (exit 1)** for a real reason: `lane/gameplay/integration` carries a stale v1 `echo/contracts.js`/`CONTRACTS.md`. Platform's v2 is taken.
- The G0 smoke path is retired: `quantum/smoke.py`, platform `main.css`, the smoke UI and the smoke check are gone. `QOLLAB_SMOKE_TEST.md` is rewritten for the shell.
- Caps on the assembled tree: **RED, 4 lines, all in quantum files**. Contract check on the assembled `contracts.js`: **GREEN, 1087/1087**.
- New measured fact: in Pyodide v314.0.7, `toJs()` already returns plain objects, so the "remove dict_converter" sabotage is a genuine null.
- Recommend: quantum renames `bell_verification` → `backend_verification`, deletes the Python-side `run_bell_verification_once`, and ships `bridge.js`. Gameplay drops its `contracts.js` copy. Then re-run the assembler and the check.

## Vault check
- **Read:**
  - `vault/AGENTS.md`;
  - `vault/Research/qollab-js-runtime-internals.md`;
  - `vault/Reports/g0-runner-smoke.md`;
  - `tools/qollab-runner/README.md`;
  - `echo/CONTRACTS.md` (v1, then v2 after the merge);
  - `lanes/platform/context.md` and `owner-answers.md`;
  - vision §8.2–8.7, §9.5, §12.1–12.3.
  - `where.mjs assemble --branches`: nothing anywhere.
- **Already known / reused:**
  - the runner (server, frame, the IonQ one-job mock, the sandbox), extended rather than forked;
  - G0's guard pattern, binomial counts check and pixel-grading approach;
  - the caps and contract-check tools, used as they are.
- **Wrong or stale:**
  - The research note's `.toJs()` → `Map` row (marked "inferred") is **wrong for Pyodide 314**: measured plain `Object`. I added a dated correction under "Open" and did not rewrite the row.
  - The G0 check's pixel floor (2,000) would have passed a never-rendered canvas under the shell's HUD.

## What I found
1. **Imports.** `contracts.js` resolves under the runner's Babel CJS transform, from `main.js` (`./`) and from `game/state.js` (`../`).
2. **Where the job must run.** The runner's job counter and refusal mock sit on the **JS** `backend` proxy, and Qollab's are on its network layer. Quantum's `run_bell_verification_once(backend)` calls `backend.run` *inside Python*, which the runner cannot count. So `main.js` calls `backend.run` from JS. It uses quantum's `build_bell_verification_circuit` and `interpret_counts`, plus the contract's `BACKEND_SHOTS`. This is the shape `verifySelectedBackendOnce` should take.
3. **First-press contract break.** Quantum returns `experiment: "bell_verification"`. v2 allows only `backend_verification` with `qollab_selected_backend`. A player's first Verify press shows *"1 job done, but its result breaks the shared contract…"*. This is the check's one red.
4. **Tests in the upload.** `echo/tests/*.py` inside the uploaded tree makes Pyodide load pytest and 10 more packages on every Run, because `loadPackagesFromImports` scans every .py. Those files also trip caps.
5. **Settings shape.** Story-ui's settings still use `subtitles: bool`; v2 `DEFAULT_SETTINGS` uses `captionStyle` (owner: captions always on).
6. **Retyped names.** 70 contract names are retyped as keys in `data/objectives.js`, `data/story.js`, `data/teachback.js` and `game/objectives.js`. `main.js` has 0.

## What I changed (branch `lane/platform/integration-shell`)
- `31a85f7` `tools/assemble-echo/assemble.mjs` + `run-fixtures.mjs`: gate first, red on the real refs before any fix.
- `60bdcd7` real `echo/index.html` + `echo/main.js`; `git rm echo/quantum/smoke.py echo/main.css`.
- `be665bf` `check.cjs` rewritten for the shell (supersedes the G0 smoke check); `sabotage.sh` takes the assembled tree; `retyped-names.mjs`.
- `4f3c257` merged `lane/platform/integration` (contracts v2, clean).
- `cb20a32` `main.js` imports v2 names: `UI_ROOT_ID`, `QUALITY_LEVELS` (checked against the renderer table at load) and `BACKEND_SHOTS`.
- `1330fc9` first-press contract check, `QOLLAB_SMOKE_TEST.md` for the shell, evidence, vault report, research correction.
- Last commit: runner README usage.

## Commands, exit codes, artifacts (tree `/tmp/echo-shell-asm-3/echo`, build `shell-2026-10-10c` read back from the page)
| command | exit |
|---|---|
| `node tools/assemble-echo/assemble.mjs --out … --ref platform=HEAD` | **1**: CONFLICT contracts.js / CONTRACTS.md (gameplay's stale v1) |
| same, with gameplay = `gameplay-contracts-migration`, before the v2 merge | 0 (DUPLICATE ×2 printed) |
| `node tools/assemble-echo/run-fixtures.mjs` | 0 (8/8) |
| `check.cjs --backend builtin` / `ionq-mock` | 1 / 1 (21/22 each; the only FAIL is the first-press contract) |
| `node tools/qollab-caps/check.mjs --root <tree>` | **1**: `quantum/qollab_job.py:168` backend-run-python; `tests/test_qollab_job.py:91,207` (×3) |
| `node tools/contract-check/check.mjs --contracts <tree>/contracts.js` | 0 (1087/1087) |
| `retyped-names.mjs --only main.js` / all | 0 / 1 (70) |

Artifacts: `evidence/platform/shell/`, with a README, logs, `*-results.json`, PNGs and `sabotage/`. Renders: `/Users/udsy/agent-org/lanes/platform/renders/integration-shell/builtin-{1-title-over-canvas,2-after-start,3a-settings-quality-low,3b-settings-quality-high,4-quantum-answer,5-second-job-refused}.png`. Those PNGs are from the run before the first-press check was added; the page is identical.

## Sabotage round (disposable copies; `sabotage/sabotage-summary.txt`)
**Caught:**
- `no-echo-ui` (exit 2: the run errors, then no verdict);
- `local-quest-state-drifted` (exit 2);
- `dict-as-map` (exit 1);
- `no-guard-ionq-mock`: the IonQ mock refused job 2;
- `no-guard-builtin`: the runner counted 2 jobs;
- `no-render`: 0 cyan pixels;
- `quality-unrouted`: high gives ratio 1;
- `restart-unwired`;
- `wrong-build` (exit 2).

Two lanes claiming one path: the fixtures (`conflict-main-css`, `duplicate-drifted`, `non-owner`, `art-file-from-gameplay`, `unowned`) and the real refs are all red.

**The gates themselves, sabotaged on copies:**
- The assembler with conflict detection off: fixtures RED 6/8.
- The assembler with the ownership check off: RED 6/8.
- The art ownership rule removed: RED 1/8.
- `retyped-names` on a `main.js` that redefines `QUEST_STATES`: RED.

**NULLS:**
1. `local-quest-state-same`: a redefinition with the identical value is invisible to behaviour (exit 0). Only `retyped-names.mjs` catches it.
2. `no-dict-converter`: exit 0, because Pyodide 314 already returns plain objects (probe: `[object Object]`, prototype === Object.prototype).
3. In `quality-unrouted`, the "low → ratio 1" check stays green (1 is the default). The high check carries the case.
4. The first pixel floor (2,000) passed a never-rendered canvas (5,080 "cyan" pixels from HUD text). Fixed: middle region, floor 20,000; real scene ~75,000; the sabotage now gives 0.
5. One run of `quality-unrouted` returned NO VERDICT, with the frame's DOM empty at 14.2 s. In isolation it reproduced as red (exit 1). That was an instrument flake and counts as no verdict, not a pass.
6. One ionq-mock run failed to fetch `three` from jsdelivr, and the next hung (no verdict, law 7). The third run passed. Flaky network, reported as such.

## What I did NOT do or could not verify
- Nothing ran on Qollab. Every result here is from the local runner.
- No controller, scene or dialogue beats in OPENING: gameplay's scene and controller and story-ui's story data are not wired. The player stops in OPENING in an empty placeholder room.
- Volume goes to a stub (art owns `game/audio.js`).
- Pointer-lock release is wired, but untested: nothing takes pointer lock yet.
- The shadows low/high difference is visible in `3a`/`3b`, but no check grades it; the pixel ratio is the graded signal.
- Story-ui settings are not run through `validateSettings`, because the shapes differ (finding 5).
- `bridge.js` does not exist, so `main.js` keeps the one guarded JS `backend.run` path (TODO in the code).

## Decisions inferred from the docs
- Quality table: low = DPR cap 1 / no shadows, med = 1.5 / shadows, high = 1.75 / shadows (§12.1 "cap 1.5–1.75 default; 1.0 under load"; §12.2 "Low — no dynamic shadows"). It is checked at load against contract `QUALITY_LEVELS`. If gameplay ships `game/quality.js` (§8.2 tree), `main.js` should delegate to it.
- The world renders and the title shows while Qiskit calibrates; the quantum line shows "Calibrating quantum module…" (§12.3, §8.6 step 1).
- The verify button lives in a platform system box until story-ui's DECLASSIFIED panel exists (§8.6 step 4).
- `backend.run` is called from JS, not Python, so platform and runner job accounting both see it (§8.5 "plan at most one backend.run"; the runtime note on the JS proxy).
- An identical file in two refs is DUPLICATE (printed, green); differing bytes are CONFLICT (red). The brief requires printing; it does not say that identical copies are a violation.
- Layout lives in `index.html` inline styles because `main.css` is story-ui's (lane-ownership).

## Cross-lane requests
- **quantum:**
  - (a) `echo/quantum/qollab_job.py:131`: `experiment="bell_verification"` → `"backend_verification"` (contracts v2 / owner ruling #4). Repro: press Verify; the status reads "breaks the shared contract".
  - (b) Delete `run_bell_verification_once` (`qollab_job.py:152-170`). Caps flags it (`backend-run-python`), and a Python-side `backend.run` is invisible to the JS job accounting.
  - (c) Write `echo/quantum/bridge.js` `verifySelectedBackendOnce(backend)`, shaped like `main.js` `verifyOnBackend`: the guard is claimed before the first await, then JS `backend.run`, then `interpret_counts`.
  - (d) `echo/tests/test_qollab_job.py:91,207` trip caps; and `tests/` in the upload loads pytest and 10 packages per Run. Decide with platform whether `tests/` ships in the upload.
- **gameplay:** drop `echo/contracts.js` and `echo/CONTRACTS.md` from `lane/gameplay/integration` (stale v1 copy → CONFLICT). Optionally key `game/objectives.js` by `QUEST_STATES.X`.
- **story-ui:** settings → v2 shape (`captionStyle`, not `subtitles`; `ui/accessibility.js:10-30`, `ui/menu.js` settings form). `data/*.js` keys retype contract names (70 hits, `evidence/platform/shell/retyped-names-all.log`).

## Questions for the owner
None. Nothing here is about spend, access, publishing or a conflict between docs.

## Next (for the supervisor)
1. Merge `lane/platform/integration-shell` into `lane/platform/integration`. The vault hubs are stale only because of my new report; the loop regenerates them.
2. Send requests (a)–(d) to quantum, plus the gameplay and story-ui items above.
3. Once they land, re-run:
   `node tools/assemble-echo/assemble.mjs --out /tmp/x/echo`, then
   `node tools/qollab-runner/server.mjs --port <p> --project /tmp/x/echo` and
   `check.cjs --port <p> --backend builtin|ionq-mock --expect-build shell-2026-10-10c`.
   Expect the assembler at 0, the check at 22/22 and caps at 0.
4. When `bridge.js` exists, replace `verifyOnBackend` in `main.js` with `verifySelectedBackendOnce` and delete the local copy.
5. Wire gameplay's scene and controller and story-ui's OPENING beats into the shell. That is the G2 graybox path.
