
- 2026-10-10 consult 1: Lane opened 2026-10-09 ~23:20 ET with G0 overdue.

G0 cannot be marked done on local evidence. Only an owner-confirmed Qollab run recorded in `owner-answers.md` closes row 3; local-runner screenshots are necessary but not sufficient.

The biggest local-runner risk is Qiskit-in-Pyodide. A CPython bridge is allowed only if it is labelled on screen and its report states that it does not prove Pyodide compatibility.

- 2026-10-10 consult 2: 2026-10-10 consult 2: I merged `shared-contracts` on screenshot evidence. That evidence was a headless Chrome load with the served sha256 matching the file, red→green 604/604, and 18 of 21 sabotage cases red with 3 named nulls.

The §9.2 table in the vision is incomplete:
- BOOT has no outgoing edge;
- DECLASSIFIED is a dead end;
- the §10.3 sample output does not fit §8.4.

Treat the vision's code samples as illustrative. Contracts are derived from the vision's text and flows, and every deviation becomes an owner question.

- 2026-10-10 consult 2: 2026-10-10 consult 2: G0 checkpoint finding (to verify in its final report):
- Qollab runs Pyodide v314.0.7 with its own Qiskit 2.5.2 wasm wheel from `qollab.xyz/py/`.
- `main.js` is compiled by Babel to CommonJS and run as `AsyncFunction(console, parent, setTimeout, require, backend, exports, module)`.
- Bare imports resolve to Python first.

Every lane's JS must survive the CommonJS transform: no top-level `import.meta` and no dynamic tricks. The integration shell and the caps gate must respect this.

- 2026-10-10 consult 3: 2026-10-10 consult 3: I merged `echo-caps-gate` after re-running it myself on a temp `git archive` extract:
- fixtures exit 0;
- branch `echo/` red on the missing entry files only;
- a hand-written localStorage + double `backend.run` main.js went red on exactly `storage` and `backend-run-count`.

I decided its 4 questions under autonomous mode, taking the strict reading of QOLLAB_DEPLOYMENT.md's limits each time, because a false red costs minutes and a false green costs the submission:
- 2 MB = 2,000,000 bytes;
- every file counts toward 100;
- keep `html-stylesheet` + `import-unresolved`;
- any XHR is red.

- 2026-10-10 consult 3: 2026-10-10 consult 3: v1 contracts were merged BEFORE the owner answered Q1–Q6 and before the red-team rulings. The teleport dry run must be two-phase: bits first, then the player's corrections, then fidelity (owner-answers § red-team physics ambiguities). Every contract revision must ship a migration table, so the overseer can relay the changes to gameplay, quantum and story-ui.

- 2026-10-10 consult 3: 2026-10-10 consult 3: quantum's `echo/tests/` ships inside `echo/` and counts toward Qollab's 100-file cap (caps-gate finding). Track the file count at every integration. If it gets tight, propose moving the tests out of the upload rather than cutting product files.

- 2026-10-10 consult 4: 2026-10-10 consult 4: I merged `g0-runner-smoke` on four pieces of evidence:
- screenshots 1–4: exact 0.5/0.5 from Pyodide py3.14.2 / Qiskit 2.5.2 / emscripten; one job of 256 shots; the second press refused; with the guard removed, the runner is red on Qollab's one-job error;
- my own caps-gate run on the merged tree: GREEN, exit 0, 8 files;
- `git merge-tree` clean.

G0 is still open until the overseer's Qollab run is recorded.

Gap carried forward: G0's `main.js` never imported `contracts.js`, so the import under the CJS transform is unproven. The integration-shell brief requires it to be proven first.

- 2026-10-10 consult 4: 2026-10-10 consult 4: lane integration branches were measured with `git ls-tree`:
- quantum: 6 py modules + 8 files in `echo/tests`, no `bridge.js`;
- gameplay: `game/{eventBus,missionRules,objectives,state}.js`, no controller or scene;
- story-ui: `main.css` + 4 ui modules;
- art: nothing.

Lanes overlap on paths: G0 platform wrote `echo/main.css`, which is story-ui-owned. So integration needs an assembler that names every path claimed by two refs and takes the owner lane's copy. It must never use a silent last-writer-wins overlay.

- 2026-10-10 consult 4: 2026-10-10 consult 4: I decided `g0-runner-smoke`'s Q3 under autonomous mode. `QOLLAB_SMOKE_TEST.md` may sit in the Qollab draft, but it is excluded from the release upload. Reason: README.md is the project write-up (QOLLAB_DEPLOYMENT.md, research note §README), and the smoke doc is dev-only.

Its Q2 was already answered: the IonQ simulators are Free when signed in (owner-answers 2026-10-10).

- 2026-10-10 consult 5: 2026-10-10 consult 5: I merged and landed `contracts-v2` on these grounds:
- my own `check.mjs` run on a `git archive` extract: GREEN 1087/1087;
- `merge-tree` clean;
- `main...branch` touches only `echo/contracts.js` and `CONTRACTS.md` inside `echo/`;
- screenshot 04 shows the two-phase dry run on Qiskit 2.5.2 data.

My own sabotage found an undeclared-by-me null: `FIDELITY_PASS` 0.999999 → 0.9 stays GREEN. The worker had declared it as "verdict threshold loosened".

Lesson: a declared null on an owner-ruled VALUE is not acceptable. Redundant guards hide a loosened constant. The gate must pin ruled constants to the ruling text. Dispatched `contracts-pin-thresholds`.

- 2026-10-10 consult 5: 2026-10-10 consult 5: The overseer's first real Qollab G0 run (built-in sim) passed scene + bridge. Verify-click got NO response at all, so input delivery into Qollab's sandboxed cross-origin preview iframe is unproven.

This is the top G2 risk: the game needs keyboard, mouse and possibly pointer lock. Every future G0 or integration build must carry an on-page input diagnostic and must not depend on a click to prove the backend job (auto-send countdown through the same guard).

Controls design waits on the iframe `sandbox`/`allow` facts cited from Qollab's runtime source. Do not assume pointer lock is available.

- 2026-10-10 consult 6: 2026-10-10 consult 6: The `contracts-pin-thresholds` worker I decided in consult 5 never started. `lane.log` has no start line and there is no branch. The 04:05 loop restart adopted only the two running workers.

Lesson: an AGENT block is not a dispatch. At every consult, check `lane.log` for "agent <name> start" for each worker I dispatched last time, and re-emit any that is missing. I re-dispatched it in consult 6.
