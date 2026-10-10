=== PLAN ===
**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`) that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`. It comes with a local runner in `tools/` and `QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts (event names, `ExperimentResult`, interactable ids). It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Sat 00:45. G1 Sat 04:00 · G2 Sat 17:00 (else the one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- shared-contracts, echo-caps-gate, g0-runner-smoke, contracts-v2 (landed), contracts-pin-thresholds, contracts-fidelity-band, integration-shell, readme-and-video-draft, contracts-moments-and-land, contracts-land (landed 512b54a).
- **Consult 13:** `contracts-commit-result` is MERGED and `contracts-land-2` is LANDED. My own checks:
  - `diff --stat main...land-2` covers only 5 contract/gate files;
  - extract GREEN 1264/1264;
  - sabotage: 101 cases, 0 mismatches;
  - `FIDELITY_PASS` 0.9 copy goes RED (exit 1);
  - merge-tree is clean both ways;
  - my own run of `validateCommitResult` on the hand-mutated engine output: F = 0.9 is refused on all 4 branches. Swapped bits are refused on 01/10, and valid on 00/11, which is correct because the swap changes nothing there. A removed marker is refused on all 4.
- G0 on real Qollab (overseer, built-in sim): steps 1–5 PASS.

**In flight:**
- `g0-input-diagnostic`: the report commit 6674bc6 landed at 00:39 ET, but the branch is **NOT rebased** onto integration (my `merge-base` check, consult 13).
- `release-upload-manifest`: the upload-mode assembler.
- `caps-backend-run-forms` (new): red-team item 10 plus fix (c), the false positives.

**Next:**
1. **When `g0-input-diagnostic` finishes:**
   - Judge the evidence: screenshots 1–6 show the counters, a single auto-sent job, a cancel with no job, the button pressed during the countdown giving one job, and the stopPropagation sabotage going RED.
   - It is not rebased, so do NOT merge it. Dispatch `g0-diagnostic-rebase` to port adae31b + d5a2ffe onto integration's shell `main.js` and re-run check.cjs plus the sabotage.
   - Only then does the overseer re-run G0 steps 6–8 on Qollab.
2. **Relay through the overseer:**
   - **quantum:** `live_commit` should send `parameters {stateId:'story_token', applyX, applyZ, seed}` (`evidence/platform/contracts-commit/proposed_quantum_patch.diff`, 4/4 valid). Quantum also needs `bridge.js` `verifySelectedBackendOnce`.
   - **gameplay:** import `STORY_TOKEN_ID`, `expectedCorrections`, `FIDELITY_PASS`/`FIDELITY_EPSILON`, `dryRunVerdict` and `validateCommitResult`. Read `applyX/applyZ`, not `correctionX/Z`. Delete the local `FIDELITY_OK`. Fire the `MOMENT_EVENTS` and drive the HUD with `countdownRemaining`.
   - **story-ui:** keep the `MOMENTS` keys equal to `MOMENT_EVENTS`. Q and Tab are listed but nothing handles them.
   - **red-team:** re-run `cross_lane_check` and the real-output quest walk once both have migrated.
3. **When `release-upload-manifest` finishes:** judge the upload tree with my own caps run. Check the file count and that `tests/` and `QOLLAB_SMOKE_TEST.md` are excluded.
4. **When `caps-backend-run-forms` finishes:** run my own extract run, plus my own aliased-call mutation.
5. **G2 wiring** (one `main.js` worker only, after the diagnostic port merges): gameplay's scene and controller plus story-ui's OPENING go into `main.js`. Then run a full playthrough on the runner.
6. **Final README pass:** "drag to look", remove the placeholders, re-audit the claims.

**Risks:**
- Iframe keyboard focus is unproven on Qollab.
- The `Done.` keep-alive is not on integration until the port.
- Cross-lane convergence: the real-output walk has stalled 4 times, and the engine is 0/4 valid on commits until quantum patches.
- G2 is about 16 h away.
=== END PLAN ===

=== MERGE branch=lane/platform/contracts-commit-result ===

=== LAND branch=lane/platform/contracts-land-2 ===

=== AGENT name=caps-backend-run-forms model=opus base=lane/platform/integration ===
**GOAL.** The qollab-caps gate must catch every way the `echo/` upload could make a second `backend.run`, or one outside the ruled site. It must also stop reporting false reds on files that *assert the absence* of forbidden things. The overseer and the owner trust this gate's GREEN before uploading to Qollab. If it misses one form, the submission can make two IonQ jobs and fail on Qollab's one-job rule. If it cries wolf, people learn to ignore it.

**VISION.** QOLLAB_DEPLOYMENT.md: at most one `backend.run` per run, through the injected `backend`, with no hardcoded backend. The owner's ruling is "exactly one guarded backend.run site (`echo/quantum/bridge.js` `verifySelectedBackendOnce`)", and `main.js` calls that function rather than `backend.run`. Red-team fix (b)/(c) is in `lanes/platform/owner-answers.md` § "cross-lane-recheck".

**WHAT WE ARE BUILDING.** An extension of `tools/qollab-caps/check.mjs`. Do not write a new gate; search with `node scripts/where.mjs` and `git grep` first. You own `tools/qollab-caps/` and its fixtures only. Do not edit `echo/`.

**WHAT HAS NOT WORKED.**
- Red-team found these escape the gate:
  - destructured `const {run} = backend; run(qc)`;
  - an aliased `const b = backend; b.run(...)`;
  - `backend['run']`;
  - Python `getattr(backend, "run")`.
- It also found 2 false positives: files that contain the forbidden pattern only inside an assertion that it is absent, such as tests or docs strings.
- Contract-gate history (`vault/Reports/contracts-pin-thresholds.md`): redundant guards hid a loosened value, and a declared null on a ruled value was not acceptable.

**Read first (Vault check required in your report):**
- `vault/Index.md`;
- `vault/Reports/` notes for echo-caps-gate and integration-shell;
- `vault/Research/qollab-js-runtime-internals.md`;
- `lanes/red-team/reports/*cross-lane-recheck*.md` and `*physics-code-audit*.md`, for the exact null and false-positive cases and their paths;
- `.claude/rules/gate-independence.md`, laws 3, 4a, 8 and 15.

**Where to start.**
1. Write fixtures FIRST, one per escaping form, JS and Python, and watch them go GREEN on today's gate. That is the red-first evidence that the gate is blind.
2. Write fixtures for the two false-positive files and watch them go RED today.
3. Add a rule: the number of `backend.run` call sites in the whole tree, counted through aliases and destructuring, must be ≤ 1. The one site must be `echo/quantum/bridge.js`. Any `run` reached from `backend` elsewhere is RED.
4. Do not calibrate the detector on the red-team's exact strings (law 4a). Add at least two forms they did not name, such as `Reflect.get(backend,'run')` and `backend.run.call(...)`, or a spread.
5. For the false positives, prefer a scoped rule, such as excluding files the release assembler excludes (`echo/tests/`) or matching only executable code. Never a blanket comment-strip that would hide real code.

**Deliver:**
- commits on `lane/platform/caps-backend-run-forms`;
- an evidence dir `evidence/platform/caps-backend-run-forms/` with a README table (command, exit, log) covering: fixtures red-first then green, the integration `echo/` result, and an assembled-tree run if `tools/assemble-echo` can build one;
- a sabotage round that disables each new detector in turn, with the nulls reported;
- `vault/Reports/caps-backend-run-forms.md`.

**How I will judge it.**
- My own `git archive` extract run.
- My own hand-written aliased double-run `main.js` must go RED.
- The real integration `echo/` must not go RED on the new rules unless there is a genuine second site, and you name it.
- The `diff --stat` must stay inside `tools/qollab-caps/`, `evidence/` and `vault/Reports/`.

**Report** to `lanes/platform/reports/` with a checkpoint within 1 h. It opens with the Vault check, then TL;DR, evidence paths, nulls, decisions inferred from the docs (with citations), and requests.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 13: I merged `contracts-commit-result` and landed `contracts-land-2` (ae39421). My checks:
- extract GREEN 1264/1264;
- sabotage 0 mismatches;
- `FIDELITY_PASS` 0.9 is RED;
- merge-tree is clean;
- `main...` covers 5 contract/gate files.

My own validator run on the hand-mutated engine output found that swapped m0/m1 is VALID on the 00 and 11 branches. This is correct: swapping equal bits is an equivalent mutant. Judge a bit-swap sabotage only on 01/10.

The real engine is 0/4 valid on commits until quantum adopts `parameters {stateId:'story_token', applyX, applyZ}`. That proposed patch lives at `evidence/platform/contracts-commit/proposed_quantum_patch.diff`.

Also: the evidence JSON nests results under `.commits`. Probe the artifact's real shape before concluding anything from "unknown field" errors.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 13: `g0-input-diagnostic` committed its report (6674bc6, 00:39 ET) on the stale consult-5 base. It is still NOT_REBASED, which confirms the consult-12 lesson. When it finishes, merge nothing from it. Port it with a dedicated worker onto integration's shell `main.js`.
=== END LEARN ===
