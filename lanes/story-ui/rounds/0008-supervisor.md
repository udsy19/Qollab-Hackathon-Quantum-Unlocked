=== PLAN ===
**Lane story-ui plan, consult 8 (Sat 2026-10-10 ~00:37 ET / 04:37 UTC, T+5.6h)**

**Goal (unchanged):** vision §4 and §6. That covers:
- a skippable opening and 2-line captions;
- the HUD;
- the three terminals (copy_booth, relay_core, teleport_terminal), wired to the §8.4 adapter, with honest error states;
- progressive hints;
- Declassified mode, with the teach-back and the credits;
- pause and settings menus;
- keyboard navigation, visible focus, reduced motion and text scaling.

These are plan rows 5 (G2, Sat 17:00 ET) and 6 (G3, Sun 05:00 ET).

**State, checked from git this consult (04:37 UTC)**
- **The lane integration branch** is at `1908470`, with the opening merged (consult 7).
- **`terminals-c4`** (running): last commit `f6cd980` at 00:14 ET, 86 checks green. Checkpoint 2 is PARTIAL. It still has to do:
  - 200% text, accesslint and the sabotage round;
  - the README, the vault report and the renders.

  It does not have the lane integration branch: its base is `476801f`, from consult 3, so it is missing contracts v2, data-fixes and the opening. Its `echo/ui/terminal.js` does not yet use `TELEPORT_FAILURE_CASES`, and it does not slice bitstrings.
- **`declassified`** (running): last commit `0d94e75` at 00:18 ET, 58 of 58 checks green. Its base `8f3f9a8` has main merged, but not data-fixes or the opening.
- **`shell-polish`** (running): its checks were written first and are red, 14 of 45 at 1024×640, at `11fa912` (00:35 ET). It is based on the current integration branch.
- All three slots are in use (cap 3), so I dispatch nothing new this consult. The in-flight list matches the running list, and every branch has commits, so nothing was lost to a restart.

**Merge conditions, unchanged:**
- **`terminals-c4`:**
  - merge `lane/story-ui/integration`, which brings main/v2, data-fixes and the opening;
  - show the bits-first dry run and the `ExperimentResult` shape from `echo/contracts.js`;
  - pass `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs`. A red caused only by platform's absent `index.html`/`main.js` is accepted if it is named;
  - show the EXACT receiver label (T1);
  - read failure lines by the named `measurementBits.{m0, m1}`, never by a sliced bitstring;
  - explain "fidelity" in plain words where it is shown;
  - renders of all three terminals;
  - on its tip, re-run `drive.mjs` 30 of 30 and `drive-opening.mjs` (the shared-module rule).
- **`declassified`:**
  - merge the lane integration branch;
  - the credits line is byte-identical to the ruling, with no `TODO_OWNER` for names;
  - renders of the 6 tabs, the teach-back and the credits;
  - the shell drivers are re-run.
- **`shell-polish`:**
  - T2: captions are always on, through `captionStyle`, and "Subtitles off" is removed together with its `main.css` rule;
  - `teachback.js:46` no longer voices the §2.4 sentence;
  - the ui-shell defects are fixed (sentence breaks, ⟩ at display time, the select font, the HUD row at 1024×640);
  - its own red-to-green run, plus the shell and opening drivers.

**Merge order** (`main.css` is a hot spot): terminals-c4, then declassified, then shell-polish. Each later branch merges the lane integration branch first. Before every merge I re-run the drivers in a disposable worktree (`git worktree add --detach /tmp/sv-X <branch>`).

**Done:** ui-shell (c2), story-data (c3), data-fixes (c6), opening (c7).

**Next, in order, as slots free:**
1. **`failure-keys`:** rekey `TELEPORT_FAILURE_CASES` by named bits, and update the terminal consumer and the data gate in the same branch. It starts after `terminals-c4` merges.
2. **`integration`:** mount everything into platform `main.js` and the gameplay code, swap the stub for `echo/quantum/bridge.js` once it lands, and play a graybox in the local runner. Target about Sat 12:00 ET.
3. **A11y pass:** 3 viewports × 200%, with accesslint, run on the integrated build.

**For platform and gameplay** (relay through owner-answers):
- `mountOpening`: `onShot` A–D drives the camera, and `onFinished`/`onSkip` map to `QUEST_EVENTS`.
- `captionStyle` replaces `subtitles`.
- Triggers are still needed for `MOMENTS.teleport_dry_run_00`, `countdown_zero` and `HUD.countdownHeld`.

**Risks:**
- `terminals-c4` is 3 lane merges behind, so expect conflicts in `main.css`/`dialogue.js` when it catches up.
- `bridge.js` has not landed.
- `teachback.js` is touched by both declassified and shell-polish (different hunks).
- G2 is Sat 17:00. If `terminals-c4` has still not reported by about 01:30 ET (2 h budget from about 23:35), I KILL it and re-dispatch from its branch with a short conform brief.

**Per-consult check:** compare the in-flight list with the running list and each branch's commits; for each branch, check `merge-base --is-ancestor lane/story-ui/integration <branch>`.
=== END PLAN ===

=== LEARN ===
2026-10-10 consult 8: Checked with `git merge-base --is-ancestor`: none of the 3 running workers had been told to keep up with the lane integration branch.
- `terminals-c4` is based on `476801f` (consult 3). It is missing v2, data-fixes and the opening.
- `declassified` is based on `8f3f9a8`. It has main, but not data-fixes or the opening.

A long-running worker drifts behind every merge I make while it runs.

Rule: every brief says "merge `lane/story-ui/integration` into your branch before your final report, then re-run your driver and the shell/opening drivers". I judge a branch only after `git merge-base --is-ancestor lane/story-ui/integration <branch>` exits 0.
=== END LEARN ===
