=== PLAN ===
**Lane story-ui plan, consult 9 (Sat 2026-10-10 ~00:50 ET / 04:49 UTC, T+5.8h)**

**Goal (unchanged):** vision §4 and §6. That covers:
- a skippable opening and 2-line captions;
- the HUD;
- the three terminals (copy_booth, relay_core, teleport_terminal), wired to the §8.4 adapter, with honest error states;
- progressive hints;
- Declassified mode, with the teach-back and the credits;
- pause and settings menus;
- keyboard navigation, visible focus, reduced motion and text scaling.

These are plan rows 5 (G2, Sat 17:00 ET) and 6 (G3, Sun 05:00 ET).

**State, checked from git this consult (04:49 UTC)**
- **The lane integration branch** is at `1908470`, with the opening merged.
- **`declassified`** has FINISHED at `fea5366` (report 0005, 61 of 61 checks, sabotage 14 red and 3 nulls, accesslint clean). I read 5 of the renders myself: the journal groups are engine-labelled, the teach-back shows a why on each choice with no score, and 200% text at 1024 fits. It is **NOT merged**, for three reasons:
  1. It does not have the lane integration branch (`is-ancestor` exits 1), and `git merge-tree` shows it CONFLICTS with the integration branch.
  2. The credits line uses ":" where the ruling (owner-answers § credit names, red-team T4) says " — ".
  3. The player-visible credits show "TODO_OWNER: third-party assets…" (see `renders/declassified/08-credits.png`).

  → I am dispatching `declassified-conform` on its branch.
- **`terminals-c4`** (still running) is at `5e36de9` 00:46 ET: sabotage 11 red and 1 null, accesslint, README and vault report are done, and the final report is still pending. It does not have the lane integration branch either. `merge-tree` against the integration branch shows conflicts in `echo/data/objectives.js` and `echo/main.css`. Its render `27-commit-second-refused` reads correctly: preview engine labelled, STATE RECOVERED, the second commit refused.
- **`shell-polish`** (still running) is at `f9419d3`, a checkpoint with 45 of 45 checks at 3 viewports. It has the lane integration branch.
- **Slots:** 2 running + 1 new = 3 of 3.

**Merge order, now "first ready merges":** whichever branch is ready first merges, and the later ones merge the lane integration branch again and re-run every driver. `main.css`, `objectives.js` and `teachback.js` are the hot spots.

**Merge conditions:**
- **`terminals-c4`:**
  - merge the lane integration branch;
  - show the bits-first dry run and the contract `ExperimentResult`;
  - pass `contract-check` and `qollab-caps`. A red caused only by the absent `index.html`/`main.js` is accepted if it is named;
  - show the EXACT receiver label;
  - read failure lines by the named `measurementBits.{m0, m1}`;
  - add a plain-words fidelity gloss;
  - re-run `drive.mjs` and `drive-opening.mjs` on its tip.
- **`declassified-conform`:**
  - the lane integration branch is an ancestor;
  - the credits line is byte-identical to the ruling;
  - no TODO_OWNER is visible anywhere;
  - all drivers are re-run, and the credits are re-rendered.
- **`shell-polish`:** as at consult 8 (T2 captions always on, teachback:46, the ui-shell defects, red→green), plus the drivers re-run after the latest integration.

**Done:** ui-shell (c2), story-data (c3), data-fixes (c6), opening (c7).

**Next, in order, as slots free:**
1. **`failure-keys`:** rekey `TELEPORT_FAILURE_CASES` by named bits, and update the consumer and the gate in the same branch. It starts after `terminals-c4` merges.
2. **`integration`:** mount everything into platform `main.js` and the gameplay code, swap the stub for `bridge.js`, and play a graybox in the local runner. Target about Sat 12:00 ET.
3. **A11y pass:** 3 viewports × 200%, with accesslint, on the integrated build.

**For platform and gameplay** (relay through owner-answers):
- `mountOpening` with `onShot` A–D, and `onFinished`/`onSkip` mapped to `QUEST_EVENTS`.
- `captionStyle` replaces `subtitles`.
- Triggers for `MOMENTS.teleport_dry_run_00`, `countdown_zero` and `HUD.countdownHeld`.
- **New, from declassified:**
  - (a) a run-record type plus a validator in `contracts.js`;
  - (b) CREDITS is a dead end today, so add `CREDITS: { RESTART: 'TITLE' }` or `CLOSE_CREDITS → ENDING`;
  - (c) `main.js` mounts `mountDeclassified` on OPEN_SCIENCE with the run record.
- **For the art lane:** the credits now state "no third-party assets". If art bundles any third-party file, it must tell story-ui so the line is replaced with the asset list and licenses.

**Risks:**
- Three branches each conflict with the integration branch in the same hot-spot files.
- `bridge.js` has not landed.
- G2 is Sat 17:00. KILL `terminals-c4` if it has not reported by about 01:30 ET.
- Harness ports: declassified 8771, terminals-c4 8771 (they clashed), opening 8781. The new briefs get distinct ports.

**Per-consult check:** compare the in-flight list with the running list and each branch's commits, run `is-ancestor` for each branch, and run `merge-tree` before any MERGE.
=== END PLAN ===

=== AGENT name=declassified-conform model=sonnet base=lane/story-ui/declassified ===
**GOAL:** Declassified mode (journal, 3 §4.5 tabs, teach-back, credits) is ready to merge into `lane/story-ui/integration`. It has to sit on top of everything the lane has merged since it branched, and the credits a judge reads must be exactly the owner's words, with no placeholder text visible.

**VISION:** ECHO_MASTER_VISION §4.5 (Declassified mode, teach-back with no scoring pressure), §6.6 (accessibility), and the ending and credits. The bar is that a blind tester can explain the three teach-back answers. A judge who sees "TODO_OWNER" in the credits stops trusting everything else.

**WHAT WE ARE BUILDING:** the Qollab-native `echo/` game. This lane owns `echo/ui/`, `echo/data/` and `echo/main.css`. Harnesses live in `evidence/story-ui/harness/`, outside `echo/`.

**WHAT HAS NOT WORKED / why this branch was refused at consult 9:**
1. **It does not have the lane integration branch.** `git merge-base --is-ancestor lane/story-ui/integration lane/story-ui/declassified` exits 1, and `git merge-tree` shows conflicts. The integration branch has gained data-fixes (branch-true teleport lines, `TELEPORT_FAILURE_CASES`, the ruled bit labels), the opening (`dialogue.js` auto mode, `captionStyle` in `accessibility.js`, an `/* ==== opening ==== */` CSS section) and contracts v2 from main.
2. **The credits team line uses ":".** The owner's ruling (`lanes/story-ui/owner-answers.md` § credit names; red-team T4) is byte-exact: `Team The Quantubians (NYU Tandon School of Engineering) — Udaya (captain), George, Harman, Epa`. That is space, em dash (U+2014), space. Your report said the credits "match the ruling exactly". They do not: see `renders/declassified/08-credits.png`.
3. **The player sees the assets line "TODO_OWNER: third-party assets…".** Supervisor ruling, inferred from CLAUDE.md ("every third-party asset… listed with its license") plus the fact that the build is procedural: replace it with `Art and sound: generated in code for this project. No third-party assets.` and add a check to the story-data gate (`evidence/story-ui/story-data/check.mjs`) that fails if `echo/assets/` holds any file. The art lane is told to have this line replaced if it ever bundles a third-party file. After your change, no `TODO_OWNER` may remain anywhere in `echo/` (`git grep -n TODO_OWNER -- echo/` prints nothing).
4. **Earlier lesson:** green drivers missed defects that only a human look found (sentence breaks, ASCII kets, the select font). Read every render yourself.

**Vault and notes to read first:** `vault/AGENTS.md`, `vault/Reports/story-ui-declassified.md` (your own), `vault/Reports/story-ui-opening.md`, `vault/Reports/story-data-script-gate.md`, `lanes/story-ui/rulings.md`, and your report `lanes/story-ui/reports/0005-declassified.md`.

**Where to start:**
1. `git merge lane/story-ui/integration` into your branch and resolve the conflicts.
   - `echo/main.css`: keep every section from both sides.
   - `echo/data/teachback.js`: keep your RUN_JOURNAL and DECLASSIFIED edits and the integration side's data-fixes changes.
   - `echo/ui/accessibility.js`: keep both your additions and `captionStyle`.
2. Write the failing checks FIRST and watch them go red: the credits line byte-exact (compare code points, not the eye), no TODO_OWNER, and an empty `echo/assets/`. Then fix the data.
3. Shell-polish is editing `teachback.js` (around line 46, the teach-back wording) and `main.css` in parallel. Touch only the credits lines and the conflict resolution there, so the next merge stays small.

**Deliver:**
- After the merge, run all of these on your tip and record the exit codes:
  - `node evidence/story-ui/declassified/drive.mjs` (use port **8791**);
  - `node evidence/story-ui/harness/drive.mjs` (ui-shell, 30 of 30);
  - `node evidence/story-ui/harness/drive-opening.mjs 8792 /tmp/op`;
  - `node evidence/story-ui/story-data/check.mjs`;
  - `node tools/contract-check/check.mjs`;
  - `node tools/qollab-caps/check.mjs`. A red caused only by platform's absent `index.html`/`main.js` is fine if you name it.
- Re-render the credits, the journal and the teach-back into `renders/declassified/` with a new provenance hash.
- A sabotage round on a disposable copy, covering at least: swap the em dash for ":", re-insert TODO_OWNER, and drop a file into `echo/assets/`. Report the nulls.
- Update your vault report.

**How I will judge it:**
- `git merge-base --is-ancestor lane/story-ui/integration <your tip>` exits 0;
- I re-run the drivers myself in a disposable worktree;
- I look at the credits render and read the em dash;
- `git grep TODO_OWNER -- echo/` is empty.

**Report:** `lanes/story-ui/reports/0008-declassified-conform.md`. Open it with a Vault check, then a TL;DR, then evidence paths with exit codes, then the nulls. Commit a checkpoint within 25 minutes and the final report within 1 hour.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 9: I refused to merge `declassified` even though it reported 61/61 green and "credits match the ruling exactly". There were three problems:
- **The credits:** its own render `renders/declassified/08-credits.png` shows ":" where the ruling has " — ", plus a visible "TODO_OWNER" assets line.
- **The base:** `is-ancestor` exited 1.
- **The merge:** `git merge-tree --write-tree lane/story-ui/integration <branch>` showed a conflict.

Lessons:
- A worker's claim that something is "exact" is checked against the render and the code points.
- `git merge-tree --write-tree` is a cheap pre-merge conflict probe. Run it before every MERGE.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 9, a ruling inferred from the docs: the credits assets line is "Art and sound: generated in code for this project. No third-party assets." The basis is CLAUDE.md (list every third-party asset with its license) and the fact that the build is procedural today. A gate check fails if `echo/assets/` holds any file. If the art lane ever bundles a third-party file, it must have this line replaced with the list and the licenses. No TODO_OWNER may ever be visible to the player.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 9: The merge order changes from the fixed terminals → declassified → shell-polish to "first ready merges". All three branches conflict with the lane integration branch in the same hot spots (`main.css`, `objectives.js`, `teachback.js`), so a fixed order only serialises the waiting. Every later branch merges the lane integration branch again and re-runs all the drivers (ui-shell, opening, declassified, terminals, the story-data gate) before I judge it.
=== END LEARN ===
