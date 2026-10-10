=== PLAN ===
**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`) that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`. It comes with a local runner in `tools/` and `echo/QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Sat 00:20. G1 Sat 04:00 · G2 Sat 17:00 (else the one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- c2 `shared-contracts`, c3 `echo-caps-gate`, c4 `g0-runner-smoke`.
- c5 `contracts-v2`: landed on main as 80d685f.
- c7 `contracts-pin-thresholds`: merged.
- G0 on real Qollab (overseer, built-in sim): steps 1–5 PASS.
- **c8 `contracts-fidelity-band`: MERGE now.** I checked it on my own `git archive` extract:
  - the real contracts are GREEN 1132/1132;
  - tolerance set to 1e-1 goes RED with 11 FAIL lines;
  - my own extra mutation, ε 1e-12 → 1e-3, goes RED on both the PIN and a behavioural forged-fidelity probe (exit 1);
  - caps GREEN; merge-tree clean;
  - only `contracts.js` and `CONTRACTS.md` change inside `echo/`.
- **No LAND this consult.** `main...fidelity-band` would also bring the G0 smoke product files (`main.js`, `main.css`, `quantum/smoke.py`, …) onto main. The ruling holds integrated product code until red-team's `cross_lane_check` passes. Landing the contract files alone needs a contracts-only branch cut from main. I'll do that once integration-shell retires the smoke files, or the integration shell carries it.

**In flight:**
- `integration-shell`. The runner screenshots look right so far:
  - title over the canvas, with the attribution line;
  - quest BOOT→TITLE→OPENING driven through the contracts;
  - local Qiskit answer 0.5/0.5;
  - one job made (counts 126/130), and the second job refused with `backend.run calls: 1`.

  Still to judge: `main.js` stays pending until the job settles; `contracts.js` imports under the CJS transform; assembler conflicts resolved by lane ownership; smoke files retired; the debug panel must not cover the game HUD in the public build.
- `g0-input-diagnostic`: on-page input counters, auto-send countdown, the `main.js` lifecycle and runner fidelity.
- `readme-and-video-draft` (new, last slot): the `echo/README.md` project page draft, licences/credits, backend provenance and the 2:40 video script draft.

**Relay (overseer → lanes):**
- The contracts-v2 migration table (`reports/0003`).
- New export `FIDELITY_EPSILON` = 1e-12 (no value moved). Gameplay drops its own `FIDELITY_OK` and uses `FIDELITY_PASS`/`FIDELITY_EPSILON` or `dryRunVerdict`.
- Controls: no pointer lock; click-to-focus plus drag-to-orbit.
- `main.js` stays pending until the backend job settles.

**Next:**
1. The overseer re-runs G0 with the diagnostic build (steps 6–7).
2. Judge integration-shell and g0-input-diagnostic: my own caps, contract and assemble runs, plus the screenshots.
3. Integrated code waits on red-team's `cross_lane_check`.
4. First full playthrough once gameplay has a controller and a scene. Then 3 consecutive full runs (row 8).

**Risks:**
- Iframe keyboard focus on Qollab is unproven.
- The `Done.` lifecycle.
- Lane restarts drop dispatches: check `lane.log` start lines each consult (c8: fidelity-band started 04:13 and finished rc=0).
- `echo/tests/` counts toward the 100-file cap.
- Contract churn.
=== END PLAN ===

=== MERGE branch=lane/platform/contracts-fidelity-band ===

=== AGENT name=readme-and-video-draft model=opus base=lane/platform/integration ===
**GOAL:** A judge opening the ECHO Qollab project page understands in 60 seconds:
- what the game is;
- which three quantum ideas it teaches, and that they are taught truthfully;
- what ran locally (exact Qiskit Statevector in Pyodide) versus the ONE selected-backend job;
- how to play (Chrome/Edge/Firefox, not Safari; click to focus; the controls);
- who made it, and the licences.

Separately, the owner has a 2:40 demo-video script they can record from.

**VISION:** Judges score novelty, technical execution, impact and documentation. Documentation is a quarter of the score, and the page is also where honesty about backend provenance lives (CLAUDE.md "Truthful quantum"; vision §2.4, §7.5, §12.5, §17).

**WHAT WE ARE BUILDING:**
- `echo/README.md`. It becomes the Qollab write-up when the project is created from an upload. Limits: ≤65,000 chars; `breaks: true`, so one paragraph per line, with no hard-wrapped prose.
- `docs/VIDEO_SCRIPT.md`, outside `echo/`. It is a shot list with timecodes summing to 2:30–2:50, with voice-over lines and the on-screen action for each shot.

**WHAT HAS NOT WORKED:**
- Docs that claim things the product doesn't do yet.
- Unscoped claims ("runs on IonQ") with no record behind them.
- Restating the vision instead of describing the build.

There is no Qollab IonQ run recorded yet, so the page must say "untested on IonQ" or carry a clearly marked placeholder, `<!-- FILL AFTER OVERSEER RUN -->`. Never claim a publish or an IonQ result.

**Read first (vault check required, and your report opens with it):**
- `vault/Home.md`, `vault/Index.md`;
- `vault/Research/qollab-platform-and-submission.md` (README rules, YouTube-only embeds, browser support);
- `vault/Research/qollab-js-runtime-internals.md`;
- `vault/Reports/contracts-v2.md`;
- lane `rulings.md` (credits, theme, WCAG wording, IonQ labelling);
- vision §1, §4, §7, §12, §15–17; `QOLLAB_DEPLOYMENT.md`; `CLAUDE_CODE_PROMPTS.md` (README/video prompts if present).

**Binding facts:**
- Credits: Team The Quantubians (NYU Tandon School of Engineering): Udaya (captain), George, Harman, Epa. No emails.
- MIT licence, "udsy19 and contributors".
- The attribution line "This effort is supported by Qollab & IonQ".
- Theme: Quantum Unlocked.
- Accessibility: say "targets WCAG 2.2 AA" only with the list of checks actually run; leave that list as a placeholder if none have run yet.
- Physics wording must follow §7.5: no FTL, no cloning, no "certified random", no matter teleportation. m0 = source readout, m1 = local Bell-half readout; X iff m1=1, Z iff m0=1.
- Third-party list: three 0.186.1, Pyodide, Qiskit. Build it from what `echo/` actually imports today (grep it), not from the vision.

**Scope:** write only `echo/README.md`, `docs/VIDEO_SCRIPT.md` and your vault report. Do not touch `main.js`/`index.html` (integration-shell owns them right now). Gameplay features that are not built yet go in a section clearly titled as planned, or are left out. Prefer leaving them out.

**Deliver and how I will judge it:**
1. Run `node tools/qollab-caps/check.mjs --root echo`: it must stay green and the file count must not rise beyond +1.
2. A rendered screenshot of the README, through any markdown renderer with `breaks: true`: `renders/readme-and-video-draft/readme.png`.
3. A claim audit table in your report: every factual sentence in the README → its source (file:line, ruling, or evidence path). Any claim without a source is deleted.
4. The video script's timecodes sum to between 2:30 and 2:50. Every shot maps to a quest state in `echo/contracts.js`.
5. `vault/Reports/readme-and-video-draft.md`, linked from the hub (`node scripts/vault-hubs.mjs`).

Checkpoint report within 1 h at `reports/` (TL;DR first, PARTIAL if partial).
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 8: I merged `contracts-fidelity-band` after my own extract run: GREEN 1132/1132, tol 1e-1 RED (11 FAIL lines), and my extra ε 1e-12→1e-3 mutation RED on both the PIN and a behavioural forged probe.

I refused to LAND it. `main...branch` would carry the G0 smoke product files (`echo/main.js`, `main.css`, `quantum/smoke.py`, `requirements.txt`), and the ruling holds integrated product code off main until `cross_lane_check` passes.

Lesson: since `contracts-v2`, every platform branch descends from integration, which carries the G0 product files. "Land the contract files early" therefore needs a contracts-only branch cut from main (or a cherry-pick). Check `git diff --stat main...<branch> -- echo/` before any LAND.
=== END LEARN ===
