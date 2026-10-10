=== PLAN ===
**Lane story-ui plan, consult 5 (Sat 2026-10-10 ~00:05 ET / 04:05 UTC, T+5h)**

**Goal:** the story and interface from vision §4 and §6:
- a skippable opening
- 2-line subtitles
- the HUD
- three terminals (copy_booth, relay_core, teleport_terminal) wired to the §8.4 adapter, with honest error states
- progressive hints
- Declassified mode with the teach-back, plus credits
- pause and settings menus
- keyboard navigation, visible focus, reduced motion and text scaling

This is Plan rows 5 (G2, Sat 17:00 ET) and 6 (G3, Sun 05:00 ET).

**State, checked from git this consult:**
- **main has contracts v2** (`2133d8a`/`80d685f`), but `lane/story-ui/integration` does NOT yet contain main (`merge-base --is-ancestor` → 1; 74 files behind). → I am merging main into the lane integration branch now, and every new worker is based on it.
- `terminals-c4` is running. It has 1 commit (`ac82f4a`: data copy, harness, stub engine, drive gate red on the skeleton). It is based on the pre-v2 integration branch, so it must conform to v2 before I merge it: the two-phase teleport dry run (bits first, then corrections), the `ExperimentResult` shape from `echo/contracts.js`, and the UI root/settings. Its report will be judged on that.
- `data-fixes` is running. It has 3 commits (`b52954b` → `8cf12cb` → `9127f62`): a branch-truth gate run in Qiskit over all 16 (bits, plan) cases, the ruled credits, the bit labels, the test-rig dry run, the 00:00 hold and the 00 dry-run beat. Sabotage: 48 cases, 43 red, 4 old nulls, 1 refused. The final report is pending; I judge it when it arrives.
- The cap is now 3, with 1 free slot. I am using it for `declassified`.

**Approach (unchanged):**
- `echo/ui/` modules use `mount(root, deps)`, and data ships as JS in `echo/data/`.
- Each CSS area gets a delimited section of `main.css`. Harnesses live in `evidence/story-ui/harness/`, with one port per worker.
- Contracts are imported from `echo/contracts.js` (v2 on main).
- Kets are ASCII in the data and become ⟩ at display time.
- The engine label is always visible.

**Done:**
- ui-shell (merged, consult 2)
- story-data (merged, consult 3)

**In flight:**
- `terminals-c4` (G2 critical path)
- `data-fixes`
- `declassified` (new: journal, Declassified tabs, teach-back, credits screen; port 8771)

**Next, in order, as slots free:**
1. `shell-polish`: sentence-boundary pages, ⟩ at display time, the select font, the 1024/1366 @200% null. It goes after the terminals merge, because of the `main.css` hot spot.
2. `opening`: a skippable Shot A–D caption player.
3. `integration`: mount into platform `main.js` / gameplay, swap the stub for `echo/quantum/bridge.js` once quantum lands it, and play a graybox in the local runner. Target about Sat 12:00 ET.
4. An a11y pass at 3 viewports × 200%, with accesslint.

**Risks:**
- `terminals-c4` was built on pre-v2 contracts and may need a rebase/conform round.
- `bridge.js` is not landed (quantum).
- Every worker appends to `main.css`. Each section is delimited, and I merge in order: data-fixes → terminals → declassified.
- G2 is Sat 17:00.

**Per-consult check (from LEARN c4):** compare the in-flight list with the running list and each branch's commits, and re-dispatch anything that is missing.
=== END PLAN ===

=== MERGE branch=main ===

=== AGENT name=declassified model=opus base=lane/story-ui/integration ===
**First step:** run `git merge-base --is-ancestor main HEAD`. If it exits 1, run `git merge main` before anything else, because contracts v2 is on main (`echo/contracts.js`, `echo/CONTRACTS.md`). Commit the merge.

## GOAL
After the city lights return, the player opens **Declassified mode** (vision §4.5, §6). It has these parts:
- a journal of what they actually did (their own clone attempt, relay readings, dry-run bits and corrections, commit result, read from a run record);
- the Declassified tabs that explain the three ideas plainly;
- the **teach-back**: 3 multiple-choice questions, each choice with a "why", and no score;
- the **credits screen**.

All of it must be fully keyboard-operable, with visible focus, and it must respect reduced motion and text scaling. A first-time player with no physics background should leave able to answer the three questions.

## VISION
This serves the bar from vision §1.4/§17: "a blind tester … can answer the three teach-back questions". It is the payoff that makes the judges' "impact/education" rubric land. It is the `DECLASSIFIED → CREDITS/ENDING` edge in contracts v2.

## WHAT WE ARE BUILDING
- `echo/ui/declassified.js`: `mount(root, deps)` → `{ open(runRecord), close(), isOpen() }`.
- A delimited `/* ==== declassified ==== */` section appended to `echo/main.css`.
- All copy comes from `echo/data/teachback.js`, which already exists (journal, tabs, 3 questions, credits). Do not duplicate text in the UI module. If copy is missing, add it to the data file and to the story-data gate (`evidence/story-ui/story-data/check.mjs`). Note that `data-fixes` is concurrently editing `echo/data/`, so keep data edits minimal and say so in your report.
- Credits are owner-ruled: **Team The Quantubians (NYU Tandon School of Engineering): Udaya (captain), George, Harman, Epa**. Add the license line "udsy19 and contributors", MIT, and "This effort is supported by Qollab & IonQ". No emails anywhere.
- Kets are ASCII `|x>` in the data. Render them as `|x⟩` at display time. Never rewrite the data.
- Every number in the journal comes from the run record and is labelled with its engine (`local_exact` / `documented_preview` / backend). Never invent values. If a field is absent, show "not recorded", not a default.
- Define the run-record shape from `echo/contracts.js` v2 events and `ExperimentResult`. If v2 has no run-record type, keep it as a guarded JS shape in your module and list it as a **contract request for platform**. Do not edit `echo/contracts.js`.
- Esc: when Declassified is open, call `menu.setPauseAllowed(false)` (this is the ui-shell contract).
- Harness: `evidence/story-ui/harness/declassified.html`, served on **port 8771 only**. Reuse the ui-shell harness pattern (`shell.html` / `drive.mjs`) and do not fork it without a one-line reason.

## WHAT HAS NOT WORKED
- In ui-shell, the green driver (30/30) missed three defects a human saw in the renders: mid-sentence page breaks, ASCII kets, and the system font in a select. **Look at your own screenshots** before claiming done.
- In story-data, a phrase gate could not judge physics. A human read found a branch-dependent falsehood. Check every explanation line against all 4 bit pairs, and against the rules m0 = source readout, m1 = local Bell-half readout, X iff m1=1, Z iff m0=1.
- Building behind flags nobody turns on, and optimising for a test count instead of the product.

## VAULT / READ FIRST
- `vault/AGENTS.md`, `vault/Index.md`, `vault/Home.md`
- `vault/Reports/story-ui-ui-shell-harness.md`, `vault/Reports/story-data-script-gate.md`
- `vault/Research/qollab-platform-and-submission.md`
- `lanes/story-ui/rulings.md`
- ECHO_MASTER_VISION §4.5, §6 (Declassified + accessibility), §7 (physics), §9 (quest states)
- `echo/CONTRACTS.md`
- `evidence/story-ui/story-data/script.md` (Declassified/teach-back sections)

## DELIVER
1. **A gate written first and watched red:** a puppeteer driver with real keys. It covers:
   - open with a sample run record;
   - Tab through every tab and choice, answer all 3 questions, and see each "why";
   - reach credits, then close;
   - focus is always visible and trapped;
   - Esc does not open pause;
   - reduced motion means no animation;
   - text at 200% means no clipping at 1280×720 and 1024×640;
   - a run record with missing fields renders "not recorded".
2. **Screenshots** in `evidence/story-ui/declassified/` with a provenance badge: the sha256 of the files under test, which you recompute in the report. Include journal, each tab, a teach-back "why", credits, 200% and reduced motion. Copy the key images to `renders/declassified/`.
3. **A sabotage round on disposable copies**, reporting the nulls.
4. accesslint on the open view.
5. A vault report at `vault/Reports/story-ui-declassified.md`.

## HOW I WILL JUDGE
I will Read your PNGs myself. I check that:
- the kets show ⟩;
- there are no mid-sentence breaks;
- credits are exact;
- the engine label is on every number;
- every physics line is true for all branches.

A report without a Vault check is refused.

## REPORT
Write `lanes/story-ui/reports/NNNN-declassified.md`. It opens with a TL;DR and a Vault check, and ends with "Not done / not verified", "Contract requests for platform" and "Questions for the owner" (only spend, access, publishing or doc conflicts; decide design choices from the vision and cite it). Add a **checkpoint commit and report within 25 minutes**, then commit at least every 30 minutes.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 5: On the overseer's notice that "contracts v2 is on main", check with `git merge-base --is-ancestor main lane/story-ui/integration`. Do not assume the lane already has it. At consult 5 it exited 1, with the lane 74 files behind main.

Rule: emit MERGE branch=main before dispatching, and every new brief starts with an ancestor check plus `git merge main`. Workers started before the merge (here terminals-c4) must show v2 conformance before I merge them: the bits-first dry run, the `ExperimentResult` shape from `echo/contracts.js`, and passing `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs`.
=== END LEARN ===
