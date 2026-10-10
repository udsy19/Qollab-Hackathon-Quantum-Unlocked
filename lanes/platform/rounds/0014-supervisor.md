=== PLAN ===
**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`. It ships with a local runner in `tools/` and `QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Sat 00:45. G1 Sat 04:00 · G2 Sat 17:00 (else the one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- shared-contracts, echo-caps-gate, g0-runner-smoke, contracts-v2 (landed), contracts-pin-thresholds, contracts-fidelity-band, integration-shell, readme-and-video-draft, contracts-moments-and-land, contracts-land (landed), contracts-commit-result, contracts-land-2 (landed ae39421).
- G0 on real Qollab (overseer, built-in sim): steps 1–5 PASS.
- **Consult 14:** `g0-input-diagnostic` finished (rc 0, report 0005). The evidence is accepted as local-runner evidence: the Qollab iframe is `sandbox="allow-scripts"` only (cited from the shipped `/_nuxt/BWPMdZ7B.js`), and after `Done.` the parent stops listening and the IonQ proxy is off.
  - My check: `merge-base --is-ancestor integration g0-input-diagnostic` = NOT_REBASED (tip 6674bc6 on base 43be7d9).
  - **Not merged.** I dispatched `g0-diagnostic-port` to rebuild it on integration's shell `main.js`.

**In flight:**
- `release-upload-manifest`: the upload-mode assembler (start 04:25).
- `caps-backend-run-forms`: red-team item 10 plus fix (c), the false positives (start 04:40).
- `g0-diagnostic-port` (new): diag.js, the auto-send countdown, and the keep-alive on the integration shell.

**Next:**
1. **When `g0-diagnostic-port` finishes:**
   - Judge its screenshots: the counters, a single auto-sent job, a cancel with no job, the button during the countdown giving one job, `main.js` pending until the job settles, and the sabotages going RED.
   - Run my own `check.cjs` on a `git archive` extract and my own caps run.
   - Then MERGE. Ask the overseer to run G0 steps 5–8 on Qollab with the new build token.
2. **Relays through the overseer (still pending):**
   - **quantum:** `live_commit` parameters (`proposed_quantum_patch.diff`), plus `bridge.js` `verifySelectedBackendOnce`.
   - **gameplay:**
     - adopt the contract exports (`STORY_TOKEN_ID`, `expectedCorrections`, `FIDELITY_PASS`/`EPSILON`, `dryRunVerdict`, `validateCommitResult`, `applyX/applyZ`, `MOMENT_EVENTS`, `countdownRemaining`);
     - no pointer lock: click to focus, drag to look;
     - `main.js` never returns before the ending.
   - **story-ui:** keep `MOMENTS` = `MOMENT_EVENTS`. Q and Tab are listed but nothing handles them.
   - **red-team:** re-run `cross_lane_check` and the real-output walk after the migrations.
3. **When `release-upload-manifest` finishes:** run my own caps on the upload tree. Check the file count and that `tests/` and `QOLLAB_SMOKE_TEST.md` are excluded.
4. **When `caps-backend-run-forms` finishes:** run my own extract run, plus my own aliased-call mutation (`const r = backend.run; r(...)`, `getattr(backend,'run')`).
5. **Switch the single site:** once quantum ships `bridge.js`, a one-commit change makes `main.js`'s job function call `verifySelectedBackendOnce` instead of `backend.run`, so the whole tree has one site. Serialise it after the port.
6. **G2 wiring** (one `main.js` worker at a time, after the port merges): gameplay's scene and controller plus story-ui's OPENING go into `main.js`. Then run a full playthrough on the runner.
7. **Final README pass:** "drag to look", remove the placeholders, re-audit the claims.

**Risks:**
- Iframe keyboard focus is unproven on Qollab.
- The keep-alive is not on integration until the port merges.
- The engine is 0/4 valid on commits until quantum patches.
- The real-output walk has stalled 4 times.
- G2 is about 16 h away. Only one `main.js` worker may run at a time.
=== END PLAN ===

=== AGENT name=g0-diagnostic-port model=opus base=lane/platform/integration ===
**GOAL:** On Qollab, the overseer can run one build that answers two questions with a single screenshot plus console text:
- (a) Does keyboard and mouse input reach our page inside Qollab's preview iframe?
- (b) Does the one selected-backend job go out and come back while Qollab is still listening?

That build is the integration shell's `echo/main.js`, not the old G0 smoke file.

**VISION:** ECHO: ONE OF ONE is a playable game that judges run on Qollab (CLAUDE.md, vision §1.4). It needs working input in the iframe, and exactly one honest `backend.run` per run (QOLLAB_DEPLOYMENT.md). G0 steps 6–8 are still unproven on Qollab: the overseer's click on Verify got no response at all (`owner-answers.md` § "G0 on real Qollab").

**WHAT WE ARE BUILDING:** Port the work on `lane/platform/g0-input-diagnostic` onto the current `lane/platform/integration` shell. That work is commits adae31b and d5a2ffe, with report `lanes/platform/reports/0005-g0-input-diagnostic.md`, and it contains:
- `echo/diag.js` (`mount`/`unmount`/`markBridgeResult`): capture-phase counters, `hasFocus`, origin, an L-key pointer-lock probe, and the time since the bridge result;
- the guarded 5 s auto-send countdown, with Cancel;
- the rule that `main.js` stays pending until the one job settles;
- the runner changes: `frame.js` drops frame events after `Done.`, and `check.cjs`/`sabotage.sh` gain the scenarios;
- the vault research edits.

The branch was cut from the consult-5 base and is NOT rebased (I checked with `git merge-base --is-ancestor`). Integration's `main.js` was rewritten by integration-shell in the meantime. Its job function is at `echo/main.js` ~line 181–201, with the guard claimed before the first await.

**WHAT HAS NOT WORKED:**
- Two platform workers edited `main.js` from different bases, so a merge would conflict blind. Do NOT `git merge` or `git cherry-pick` adae31b wholesale onto `main.js`. Bring the behaviour into the shell's structure by hand. Take `diag.js` and the runner files from the branch, and reconcile them with any runner changes integration already has.
- Pointer lock is impossible on Qollab (`sandbox="allow-scripts"`). Do not add it.
- A click is not proof: the overseer's automation clicks may never arrive. The auto-send countdown exists so that step 6 is provable without input.

**Hard constraints:**
- There must stay exactly ONE `backend.run` call site in `echo/`. The countdown and the button both go through the same guarded function in `main.js`.
  - Leave a one-line comment that this function will become a call to quantum's `echo/quantum/bridge.js` `verifySelectedBackendOnce` once that file exists (decided consult 11). Do not create `bridge.js`: quantum owns it.
- `main.js` must survive Qollab's Babel→CommonJS transform: no top-level `import.meta`, static imports only.
- Do not edit `echo/main.css`, which story-ui owns. Style inline as `diag.js` already does.
- Your own port only. Use a new build token, e.g. `integration-shell-diag-1`, and read it back from the served page with `--expect-build`.

**Vault notes to read:**
- `vault/AGENTS.md`;
- `vault/Research/qollab-js-runtime-internals.md` (both the integration version and the branch version, then merge them);
- `vault/Reports/integration-shell.md` and `vault/Reports/g0-runner-smoke.md`;
- report 0005, in full;
- `tools/qollab-runner/README.md`;
- `echo/QOLLAB_SMOKE_TEST.md`;
- `.claude/rules/gate-independence.md` (laws 3, 15, 16).

**Where to start:**
1. Run `git diff lane/platform/integration lane/platform/g0-input-diagnostic -- echo tools` to see both sides.
2. Write the runner checks FIRST against integration's current `main.js` and watch them go red. The checks are: the diag panel is mounted, exactly one job is auto-sent, Cancel means no job, the button pressed during the countdown gives one job, `main.js` has not returned before the job settles, and no frame events arrive after `Done.`.
3. Port the behaviour, then go green.

**Deliver:**
- a branch `lane/platform/g0-diagnostic-port` with the port;
- an updated `echo/QOLLAB_SMOKE_TEST.md` (steps 5–8, the outcome table, the new token);
- the runner scenarios in `check.cjs`/`sabotage.sh`;
- a `vault/Reports/g0-diagnostic-port.md`, plus the merged research note.

**How I will judge it:**
- Screenshots from the real served page on your OWN port of: the counters, the single auto-sent job, Cancel with no job, the button during the countdown giving one job, and the verdict line.
- Console text showing `Done.` only after the job settles.
- Sabotage that goes RED for: guard removed, stopPropagation on `document`, keep-alive removed (`main.js` returns early), diag not mounted, and wrong build token (exit 2). Report every null.
- `node tools/qollab-runner/check.cjs` and `node tools/qollab-caps/check.mjs --root echo` both GREEN. I will re-run both on a `git archive` extract.
- `git diff --stat lane/platform/integration...HEAD` shows only `echo/main.js`, `echo/diag.js`, `echo/QOLLAB_SMOKE_TEST.md`, `tools/qollab-runner/*`, `evidence/platform/g0-diagnostic-port/`, and `vault/`.
- `git merge-tree` against integration is clean.

**Report:** `lanes/platform/reports/NNNN-g0-diagnostic-port.md`. It opens with the TL;DR, then a Vault check, and it states nulls, what was not verified, and the decisions inferred from the docs. Commit a checkpoint report within 1 h. Label everything "local runner". Never claim Qollab.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 14: `g0-input-diagnostic` finished (rc 0) still NOT_REBASED (tip 6674bc6 on base 43be7d9; my check was `merge-base --is-ancestor`). Following the consult-12 lesson, I merged nothing and dispatched `g0-diagnostic-port` to rebuild the behaviour by hand on integration's shell `main.js`, with no blind cherry-pick.

Its findings stand as runtime facts for every `main.js` design:
- the iframe is `sandbox="allow-scripts"` only, so there is no pointer lock and nothing focuses it;
- the parent stops listening after `Done.`, and the IonQ proxy is off by then;
- so `main.js` must stay pending until the job settles, and in the full game until the ending.

Integration's `main.js:199` still holds the one `backend.run`. It moves behind `bridge.js` `verifySelectedBackendOnce` only once quantum ships that file, as one serialised commit.
=== END LEARN ===
