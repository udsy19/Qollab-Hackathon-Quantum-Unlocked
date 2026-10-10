=== PLAN ===
**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`) that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`, with a local runner in `tools/` and `QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Sat 00:25. G1 Sat 04:00 · G2 Sat 17:00 (else the one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- shared-contracts, echo-caps-gate, g0-runner-smoke, contracts-v2 (landed), contracts-pin-thresholds, contracts-fidelity-band, integration-shell.
- G0 on real Qollab (overseer, built-in sim): steps 1–5 PASS.
- **c10 `readme-and-video-draft`: MERGE.** My checks:
  - merge-tree clean;
  - `echo/` diff is `README.md` only;
  - my own caps run on a `git archive` extract: GREEN, exit 0, 9 files;
  - the rendered PNG has no Qollab-run, IonQ-run or publish claim; the IonQ simulator row says "Untested" and hardware "Not used";
  - credits, theme, licence and the attribution line match the rulings.

  Defects carried forward to the final README pass (not blocking a draft):
  - (a) the Controls row "Mouse (click to capture, or drag)" implies pointer lock. The Qollab iframe is `allow-scripts` only, so it must read "drag to look";
  - (b) placeholder comments leave a dangling "The full game:" and an empty "Checks actually run so far:" list;
  - (c) the gameplay claims must be re-audited on the integrated build.

**In flight:**
- `g0-input-diagnostic`: `diag.js`, auto-send, keep-alive. It must be rebased onto integration before merge, because it is the only `main.js` editor.
- `contracts-moments-and-land`: MOMENT events, countdown hold, and a contracts-only landing branch from main.
- `release-upload-manifest` (new): the assembler gets a release mode that excludes `echo/tests/` and `QOLLAB_SMOKE_TEST.md` (consult 9 decision). It reports caps on the upload tree and a cross-lane blocker table measured on the current lane refs. It does not touch `main.js`.

**Next:**
1. Judge `g0-input-diagnostic` (rebased). Then the overseer re-runs G0 steps 6–7 on Qollab.
2. After `bridge.js` and the gameplay contract drop land: assemble, run the runner check (22/22), run caps on the upload tree.
3. G2 wiring of gameplay's scene and controller and story-ui's OPENING into `main.js`, by one `main.js` worker after the diagnostic merges.
4. LAND contracts-only.
5. The final README pass fixes (a)–(c) and fills the placeholders from recorded evidence.

**Risks:**
- Iframe keyboard focus on Qollab is unproven.
- The `Done.` lifecycle is not yet on integration.
- `main.js` serialisation.
- Contract churn.
- G2 at 17:00 depends on three other lanes converging.
=== END PLAN ===

=== MERGE branch=lane/platform/readme-and-video-draft ===

=== AGENT name=release-upload-manifest model=opus base=lane/platform/integration ===
**GOAL:** The owner, or the overseer, can produce the exact folder to upload to Qollab with one command. That folder holds only what the game needs at runtime: no tests, no dev-only docs. It is proven within Qollab's caps. The same run prints a measured table of what still blocks a clean assembled build, lane by lane.

**VISION:** ECHO must be published and runnable on Qollab (CLAUDE.md "Primary outcome"; QOLLAB_DEPLOYMENT.md: ≤100 files, ≤2 MB each). Every Run loads whatever Python ships, so shipping `echo/tests/` makes Qollab load pytest and about 10 packages per Run (`lanes/platform/reports/0004-integration-shell.md` (d)).

**WHAT WE ARE BUILDING:** `tools/assemble-echo/` already assembles `echo/` from the lane refs. It takes the owner lane's copy for each path and is RED on CONFLICT. Add a release mode (flag name your call), which:
- (1) excludes `echo/tests/**` and `echo/QOLLAB_SMOKE_TEST.md` from the output. This is the supervisor decision of consult 9: they stay in the repo and are not uploaded;
- (2) writes a manifest of every uploaded file with its bytes and sha256;
- (3) runs `tools/qollab-caps/check.mjs` on the output and propagates its exit code;
- (4) prints, per lane ref, the blockers it measured: CONFLICTs, unresolved imports, caps reds, and `backend.run` sites. Each blocker names its file:line.

The exclusion list is declared once, in the assembler. Do not copy it into a second place. Do not touch `echo/main.js`: another worker owns it right now.

**WHAT HAS NOT WORKED:**
- A silent last-writer-wins overlay. It was rejected in consult 4: overlaps must be named.
- Gates that read the producer's own account. Derive the file list from the output bytes, not from the assembler's internal list (gate-independence law 2 and law 8: derive the full expected set).
- "Excluded" claims nobody verified. Prove that the exclusion happened by inspecting the output tree.

**Vault notes to read:**
- `vault/AGENTS.md`, `vault/Index.md`;
- `vault/Reports/integration-shell.md`;
- `vault/Research/qollab-platform-and-submission.md` (caps, README-as-write-up);
- `tools/assemble-echo/` and its fixtures;
- `tools/qollab-caps/` (its README or the header of `check.mjs`);
- `lanes/platform/lane-memory.md` (consults 4 and 9).

**Where to start:**
- Write a fixture first and watch it fail on today's assembler: a quantum ref carrying `echo/tests/test_x.py` and a root `QOLLAB_SMOKE_TEST.md`. The release output must not contain either, and `README.md` must still be present.
- Then implement the release mode.
- Then sabotage these three and report which go red and which do not:
  - remove the exclusion;
  - make the manifest lie by one file;
  - have caps return 1 while the assembler reports 0.

**Deliver:**
- the release mode, with the fixtures green;
- one real run on the current refs (`lane/{quantum,gameplay,story-ui,art}/integration` + `lane/platform/integration`), with the output tree's file count and caps verdict and the blocker table saved under `evidence/platform/release-manifest/`;
- usage in `tools/assemble-echo/` (an existing README or the header comment);
- `vault/Reports/release-upload-manifest.md`.

Commit on your branch only.

**How I will judge it:**
- I re-run the fixtures and the real run myself on a `git archive` extract;
- I count the output files with `find`;
- I check the excluded paths are absent;
- I check that the sabotage results match your report.

A RED real run on today's refs is an acceptable, expected result, provided every red line is attributed to a lane and a file.

**Report:** `lanes/platform/reports/00NN-release-upload-manifest.md`. It opens with TL;DR, then Vault check, evidence paths and nulls. Checkpoint within 1 h.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 10: I merged `readme-and-video-draft` on these grounds:
- merge-tree clean;
- the `echo/` diff is `README.md` only;
- my own caps run on the extract was GREEN with 9 files;
- the rendered PNG makes no unrecorded Qollab, IonQ or publish claim.

My own reading of the PNG found a defect the worker's claim audit missed: the Controls row says "Mouse (click to capture, or drag)". That implies pointer lock, which Qollab's `sandbox="allow-scripts"` iframe forbids (consult 7 finding).

Lesson: the player-facing text must be audited against the runtime facts as well as the code. The final README pass must say "drag to look" and remove the dangling text that the hidden placeholders leave behind.
=== END LEARN ===
