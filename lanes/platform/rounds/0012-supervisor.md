=== PLAN ===
**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`) that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`. It comes with a local runner in `tools/` and `QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Sat 00:37. G1 Sat 04:00 · G2 Sat 17:00 (else the one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- shared-contracts, echo-caps-gate, g0-runner-smoke, contracts-v2 (landed), contracts-pin-thresholds, contracts-fidelity-band, integration-shell, readme-and-video-draft, contracts-moments-and-land (merged), and contracts-land (LANDED as 512b54a).
- G0 on real Qollab (overseer, built-in sim): steps 1–5 PASS.

**Consult 12 status:** nothing new to judge.
- All 3 slots are full (cap 3). All 3 were re-adopted after the 04:36 restart and none is overdue.
- `g0-input-diagnostic` started 04:03 UTC, so it is 34 min in. Its tip is still adae31b on the consult-5 base, and `merge-base --is-ancestor integration` says NOT_REBASED.
- `release-upload-manifest` started 04:25 and has no commits yet.
- `contracts-commit-result` started 04:31 and has reached checkpoint 1.

**In flight:**
- `g0-input-diagnostic`: `diag.js`, guarded auto-send, and the keep-alive until the one job settles. It is the only worker editing `main.js`.
- `release-upload-manifest`: an upload-mode assembler that excludes `tests/` and `QOLLAB_SMOKE_TEST.md`, caps checked on the upload tree, and a cross-lane blocker table.
- `contracts-commit-result`: `validateCommitResult`, `commitVerdict` and `STORY_TOKEN_ID`, plus the commit parameter names. This is red-team fix (a). Its checkpoint found that the engine emits `parameters:{state:'token',seed}` with no applyX/applyZ, and that gameplay reads the stale names `correctionX/Z`.

**Next:**
1. **When `g0-input-diagnostic` finishes:**
   - Judge it on the runner evidence, the pointer-lock control and the Qollab-internals research note.
   - If it is still not rebased onto integration, do NOT merge. Dispatch a fresh `g0-diagnostic-rebase` worker to port adae31b onto `lane/platform/integration` and the integration-shell `main.js`, and re-run runner `check.cjs` plus the sabotage.
   - Once merged, the overseer re-runs G0 steps 6–7 on Qollab.
2. **When `contracts-commit-result` finishes:** judge it with my own `git archive` run plus my own sabotage (fidelity 0.9 commit and swapped m0/m1 must be RED). Refresh the contracts-only landing branch from main and LAND it. Relay the commit parameter names to quantum and gameplay.
3. **When `release-upload-manifest` finishes:** judge the upload tree with my own caps run. Check that the file count and exclusions are right.
4. Caps fixes (red-team item 10), when a slot is free:
   - destructured, aliased and `getattr` `backend.run` nulls;
   - false positives on files that assert absence.
5. After quantum's `bridge.js` and gameplay's field rename land: assemble, run the runner check, and run caps on the upload tree.
6. G2 wiring: gameplay's scene and controller plus story-ui's OPENING go into `main.js`. One `main.js` worker only, after the diagnostic merges.
7. Final README pass: change the controls text to "drag to look", remove the dangling placeholders, and re-audit the claims against the integrated build and the runtime facts.

**Risks:**
- Iframe keyboard focus is unproven.
- The `Done.` keep-alive is not yet on integration.
- `main.js` serialisation and the stale base of `g0-input-diagnostic`.
- Cross-lane convergence for G2: the real-output quest walk has stalled 4 times.
- The quantum story-token state and `bridge.js` are missing (quantum's lane).
- The G2 deadline is Sat 17:00 ET, about 16 h away.
=== END PLAN ===

=== LEARN ===
2026-10-10 consult 12: I was consulted after a loop restart (04:36) with no new final report and all 3 slots full. The right output is a plan refresh and no dispatch.

I checked `g0-input-diagnostic` myself: `git merge-base --is-ancestor lane/platform/integration lane/platform/g0-input-diagnostic` says NOT_REBASED, and the tip is adae31b on the consult-5 base. The rebase requirement from consult 9 was never delivered to the running worker. A running agent cannot be re-briefed: an AGENT block reaches only new workers.

Lesson: a requirement decided after dispatch must be enforced at judge time. If the finished branch is not rebased, merge nothing and dispatch a separate port worker, rather than resolving a `main.js` conflict blind.
=== END LEARN ===
