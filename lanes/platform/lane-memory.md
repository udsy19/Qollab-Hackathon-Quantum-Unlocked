
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

- 2026-10-10 consult 7: 2026-10-10 consult 7: I merged `contracts-pin-thresholds` after re-running it on a `git archive` extract:
- real contracts GREEN 1117/1117;
- `FIDELITY_PASS` 0.9 RED, with a FAIL line naming the pin and the ruling;
- merge-tree clean.

My own extra mutation found the null the worker had predicted: `FIDELITY_CROSSCHECK_TOLERANCE` 1e-6 → 1e-1 stays GREEN 1117/1117. The equality defect is also real: F = 0.999999 exactly is refused, because the guard equals the band (law 12).

Lesson: pinning ruled values is not enough. Every tolerance that guards a ruled value needs its own pin, derived from a measured number (analytic/Qiskit agreement 4.7e-13). I dispatched `contracts-fidelity-band`.

- 2026-10-10 consult 7: 2026-10-10 consult 7: Qollab runtime facts, read by `g0-input-diagnostic` from Qollab's shipped JS (chunk `/_nuxt/BWPMdZ7B.js`, class `Ol`). Still to be verified in its final report:
- the preview iframe is `sandbox="allow-scripts"` only: no pointer lock, no modals, opaque origin, and nothing focuses it;
- once `main.js` resolves (`Done.`), the parent drops console output, and the IonQ fetch proxy in the worker is switched off.

Design consequences, decided from QOLLAB_DEPLOYMENT.md and vision §8:
- (1) Controls must not use pointer lock. Use click-to-focus plus drag-to-orbit, with a visible focus prompt.
- (2) `main.js` must stay pending until the one `backend.run` has settled. Otherwise an IonQ job after `Done.` cannot reach Qollab's proxy.

Both bind the integration shell and must be relayed to gameplay.

- 2026-10-10 consult 8: 2026-10-10 consult 8: I merged `contracts-fidelity-band` after my own extract run: GREEN 1132/1132, tol 1e-1 RED (11 FAIL lines), and my extra ε 1e-12→1e-3 mutation RED on both the PIN and a behavioural forged probe.

I refused to LAND it. `main...branch` would carry the G0 smoke product files (`echo/main.js`, `main.css`, `quantum/smoke.py`, `requirements.txt`), and the ruling holds integrated product code off main until `cross_lane_check` passes.

Lesson: since `contracts-v2`, every platform branch descends from integration, which carries the G0 product files. "Land the contract files early" therefore needs a contracts-only branch cut from main (or a cherry-pick). Check `git diff --stat main...<branch> -- echo/` before any LAND.

- 2026-10-10 consult 9: 2026-10-10 consult 9: I merged `integration-shell` after my own `git archive` run:
- assembler fixtures GREEN 8/8;
- contract-check GREEN on the branch's gate;
- merge-tree clean;
- branch-only caps RED only on unresolved quantum imports, which is expected. The shell is graded on the assembled tree.

I merged it knowing that `main.js` still resolves before the click-to-verify job, so on Qollab the IonQ proxy is off by then. The keep-alive lives on `g0-input-diagnostic` (adae31b, older base): require a rebase onto integration before merging it.

Lesson: two platform workers both editing `main.js` from different bases guarantees a conflict. Serialise `main.js` edits: one `main.js` worker at a time.

- 2026-10-10 consult 9: 2026-10-10 consult 9: Decided under autonomous mode: `echo/tests/` stays in the repo, but the release assembler excludes it from the Qollab upload, as it does `QOLLAB_SMOKE_TEST.md`. Grounds:
- QOLLAB_DEPLOYMENT.md 100-file cap;
- report 0004 (d): tests in the upload load pytest and ~10 packages on every Run.

The README documents running them locally. Relay to quantum.

- 2026-10-10 consult 9: 2026-10-10 consult 9: Red-team quest-state Q7/Q8 are already satisfied by contracts v2:
- `ENDING.RESTART→TITLE` (contracts.js:58);
- `DECLASSIFIED→ENDING`;
- the one boot name is `BOOT_COMPLETE`.

The overseer's MOMENT-events and countdown-hold relay was NOT yet in `contracts.js` (grep, consult 9). Dispatched `contracts-moments-and-land`, which also builds the contracts-only landing branch cut from main.

- 2026-10-10 consult 10: 2026-10-10 consult 10: I merged `readme-and-video-draft` on these grounds:
- merge-tree clean;
- the `echo/` diff is `README.md` only;
- my own caps run on the extract was GREEN with 9 files;
- the rendered PNG makes no unrecorded Qollab, IonQ or publish claim.

My own reading of the PNG found a defect the worker's claim audit missed: the Controls row says "Mouse (click to capture, or drag)". That implies pointer lock, which Qollab's `sandbox="allow-scripts"` iframe forbids (consult 7 finding).

Lesson: the player-facing text must be audited against the runtime facts as well as the code. The final README pass must say "drag to look" and remove the dangling text that the hidden placeholders leave behind.

- 2026-10-10 consult 11: 2026-10-10 consult 11: I merged `contracts-moments-and-land` and landed `contracts-land` (5a90cdf). My own checks:
- `main...` diff covers only the contract and gate files;
- extract GREEN 1206/1206;
- `FIDELITY_PASS` 0.9 is RED;
- merge-tree clean.

Note: `diff --stat integration...moments` in the consult digest did not show `echo/contracts.js`, but commit 88cd09b does carry it (`git grep MOMENT_EVENTS`). Verify file content with `git grep` and not only the stat digest.

- 2026-10-10 consult 11: 2026-10-10 consult 11: I decided the ONE `backend.run` site under autonomous mode (red-team 0005 item 7: the lanes hold opposite designs). The site is the JS `backend.run` inside `echo/quantum/bridge.js` `verifySelectedBackendOnce(backend)`, with its guard claimed before the first await. Python builds the circuit and `interpret_counts` only. `qollab_job.py`'s Python `backend.run` (`run_bell_verification_once`) is deleted. `main.js` calls bridge.js.

Grounds:
- the owner ruling "exactly one guarded backend.run site (echo/quantum/bridge.js)";
- QOLLAB_DEPLOYMENT one-job rule plus the measured fact that a plain Python call on IonQ fails with an XHR error;
- JS-side job accounting is visible to the runner and to the caps rule `backend-run-python`.

The overseer must relay this to quantum. Caps still needs to catch the destructured, aliased and `getattr` forms (red-team item 10).

- 2026-10-10 consult 12: 2026-10-10 consult 12: I was consulted after a loop restart (04:36) with no new final report and all 3 slots full. The right output is a plan refresh and no dispatch.

I checked `g0-input-diagnostic` myself: `git merge-base --is-ancestor lane/platform/integration lane/platform/g0-input-diagnostic` says NOT_REBASED, and the tip is adae31b on the consult-5 base. The rebase requirement from consult 9 was never delivered to the running worker. A running agent cannot be re-briefed: an AGENT block reaches only new workers.

Lesson: a requirement decided after dispatch must be enforced at judge time. If the finished branch is not rebased, merge nothing and dispatch a separate port worker, rather than resolving a `main.js` conflict blind.

- 2026-10-10 consult 13: 2026-10-10 consult 13: I merged `contracts-commit-result` and landed `contracts-land-2` (ae39421). My checks:
- extract GREEN 1264/1264;
- sabotage 0 mismatches;
- `FIDELITY_PASS` 0.9 is RED;
- merge-tree is clean;
- `main...` covers 5 contract/gate files.

My own validator run on the hand-mutated engine output found that swapped m0/m1 is VALID on the 00 and 11 branches. This is correct: swapping equal bits is an equivalent mutant. Judge a bit-swap sabotage only on 01/10.

The real engine is 0/4 valid on commits until quantum adopts `parameters {stateId:'story_token', applyX, applyZ}`. That proposed patch lives at `evidence/platform/contracts-commit/proposed_quantum_patch.diff`.

Also: the evidence JSON nests results under `.commits`. Probe the artifact's real shape before concluding anything from "unknown field" errors.

- 2026-10-10 consult 13: 2026-10-10 consult 13: `g0-input-diagnostic` committed its report (6674bc6, 00:39 ET) on the stale consult-5 base. It is still NOT_REBASED, which confirms the consult-12 lesson. When it finishes, merge nothing from it. Port it with a dedicated worker onto integration's shell `main.js`.

- 2026-10-10 consult 14: 2026-10-10 consult 14: `g0-input-diagnostic` finished (rc 0) still NOT_REBASED (tip 6674bc6 on base 43be7d9; my check was `merge-base --is-ancestor`). Following the consult-12 lesson, I merged nothing and dispatched `g0-diagnostic-port` to rebuild the behaviour by hand on integration's shell `main.js`, with no blind cherry-pick.

Its findings stand as runtime facts for every `main.js` design:
- the iframe is `sandbox="allow-scripts"` only, so there is no pointer lock and nothing focuses it;
- the parent stops listening after `Done.`, and the IonQ proxy is off by then;
- so `main.js` must stay pending until the job settles, and in the full game until the ending.

Integration's `main.js:199` still holds the one `backend.run`. It moves behind `bridge.js` `verifySelectedBackendOnce` only once quantum ships that file, as one serialised commit.

- 2026-10-10 consult 15: 2026-10-10 consult 15: I merged `release-upload-manifest` after my own checks:
- extract fixtures 13/13 and sabotage 14/14 with 0 nulls;
- my own `--release` run on the pinned refs gave rc 1, 30 files, 0 `tests/` or smoke-doc leaks, and 9 BLOCKERs (8 drifted contract copies in quantum, gameplay, story-ui and art, plus `qollab_job.py:169` Python `backend.run`).

Tooling trap: `pinned-refs.txt` holds several `--ref` args on one line. `$(cat …)` inside a quoted context passes them as ONE argument, and the assembler REFUSES (rc 2, "unknown argument"). Use `eval` or unquoted expansion. Also, `--release` resolves refs with git, so run it from a worktree using the extract's tool. Inside a bare `git archive` extract it refuses, because the refs do not resolve.

Decided under autonomous mode:
- `echo/CONTRACTS.md` stays in the upload: documentation is a rubric item, it costs 1 file of 100, and it is not runtime.
- `LICENSE` reaches the upload by `--release` copying the root `LICENSE`, one source. Do not commit a second copy in `echo/` (no-bloat; QOLLAB_DEPLOYMENT.md:28 lists LICENSE). Dispatched `release-license`.
