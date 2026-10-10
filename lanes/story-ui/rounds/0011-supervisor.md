=== PLAN ===
**Lane story-ui plan, consult 11 (Sat 2026-10-10 ~01:05 ET / 05:05 UTC, T+6h)**

**Goal (unchanged):** vision §4 and §6. That covers:
- a skippable opening and captions of at most 2 lines;
- the HUD;
- the three terminals, wired to the §8.4 adapter, with honest error states;
- progressive hints;
- Declassified mode, with the teach-back and the credits;
- pause and settings menus;
- keyboard navigation, visible focus, reduced motion and text scaling.

These are plan rows 5 (G2, Sat 17:00 ET) and 6 (G3, Sun 05:00 ET).

**State, checked from git this consult**

`shell-polish` at `40383ff` is judged and MERGED this consult.
- `is-ancestor` exits 0 and `merge-tree` is clean.
- I read all 4 renders myself:
  - kets render as ⟩;
  - the select uses the display face, with a visible focus ring;
  - the long line breaks at a clause;
  - at 200% and 1024×640 the HUD stays in the viewport.
- My physics read of the data diff:
  - `FIDELITY_GLOSS` claims only "0 to 1, 1 = identical", which is true for every value a dry run can show;
  - teachback:46 is now a question answered "No." and no longer voices §2.4;
  - the Subtitles option is gone, and the menu offers caption style only.

`declassified-conform` at `01350cd` is still running. `is-ancestor` exits 0 against the old integration branch and `merge-tree` is clean. After this merge it must merge the integration branch again. Its misconception renderer must also handle a `wrong` field that is now a question, so a "Myth:" prefix would read wrongly.

`terminals-conform` at `aafc8cc` is still running and merged the integration branch. After this merge it must merge again.

**NEW FACT (git, 05:05 UTC):** the integration targets now exist on lane branches, not on main.
- `lane/platform/integration:echo/main.js` already imports `mountMenu`, `mountHud` and `mountDialogue` and mounts them into `#echo-ui`.
- `lane/quantum/integration:echo/quantum/bridge.js` exports:
  - `cloneTest`, `bellSignalling`, `calibrationMeasurement`;
  - `teleportDryRun(calibration, x, z)`, `commitTransfer`, `resetStoryToken`;
  - `verifySelectedBackendOnce`.
- **Name mismatch:** terminals-c4 expected `bellMeasurement` / `teleportDryRun(…, bits)` / `commitStoryTransfer`. So terminal.js must call the real bridge names, and the integration worker checks this.

Slots: 2 running + 1 new = 3 of 3.

**Dispatch: `ui-wiring`.**
- It composes a local-runner build from platform `main.js` + quantum `bridge.js` + gameplay + this lane's UI, in an evidence harness and not in platform files.
- It finds every seam: opening, terminals, declassified, menu `captionStyle`, and the bridge names.
- It ships story-ui's side, a single `echo/ui/` mount facade that platform calls.
- It hands platform an exact patch request.

**Merge conditions:**
- **`terminals-conform`:**
  - the integration branch is an ancestor;
  - failure lines come only from `TELEPORT_FAILURE_CASES`, looked up by the named `measurementBits.{m0, m1}`, for all 16 cases, with no `no_corrections` and no bitstring slicing;
  - the RECEIVER label and the m0/m1 labels come from the data;
  - `fidelityGloss` is visible;
  - the EXACT receiver label shows;
  - it uses `displayKets` and not its own `ket()`;
  - all drivers are green;
  - contract-check and qollab-caps are run;
  - I read the 4 both-wrong renders myself.
- **`declassified-conform`:**
  - the integration branch is an ancestor;
  - the credits are byte-identical, with no TODO_OWNER;
  - `FIDELITY_GLOSS` sits next to the journal fidelity;
  - the question-form misconception renders sensibly;
  - all drivers are re-run;
  - the credits are re-rendered.

**Done:** ui-shell (c2), story-data (c3), data-fixes (c6), opening (c7), shell-polish (c11).

**Next:**
1. Merge `terminals-conform` and `declassified-conform`.
2. `ui-wiring` turns into a real graybox in the local runner. Target about Sat 12:00 ET.
3. An a11y pass: 3 viewports × 200% with accesslint, on the integrated build.
4. Terminal hardening: a try/catch around `render()`.

**For platform** (via report and owner-answers): `mountOpening`, terminal and declassified wiring, `captionStyle`, `CLOSE_TERMINAL`, the CREDITS exit edge, the run-record type, and Esc capture order.

**Risks:**
- Bridge API names have drifted.
- The three converging branches meet in the `main.css` hot spot.
- G2 is Sat 17:00. KILL `terminals-conform` if it has not reported by about 02:45 ET.

**Ports:** declassified 8771, opening 8781, terminals-conform 8791, shell-polish 8801, ui-wiring 8811.
=== END PLAN ===

=== MERGE branch=lane/story-ui/shell-polish ===

=== AGENT name=ui-wiring model=opus base=lane/story-ui/integration ===
**GOAL:** A judge clicks Run and gets the real story-ui on top of the real game. That means:
- the opening plays, or is skipped;
- the HUD and captions follow the quest;
- pressing E at the copy booth, the relay and the teleport console opens this lane's terminal, fed by the quantum lane's real `echo/quantum/bridge.js`;
- Declassified and the credits open at the end.

Today every story-ui piece works only in its own harness. Your job is to make them work together in one local-runner build and to find every seam before G2 (Sat 17:00 ET).

**VISION:** Vision §4 (story beats), §6 (UI), §8.4 (the quantum adapter contract) and §9 (quest states). CLAUDE.md "Playable" is the bar: start, move, press E at three locations, fail and retry, make all four correction choices, commit once, reach the credits.

**WHAT WE ARE BUILDING:**
- A Qollab-native `echo/` folder. `main.js` is the entry and is owned by the platform lane. `echo/ui/`, `echo/data/` and `echo/main.css` belong to story-ui (you).
- Shared contracts live in `echo/contracts.js` (platform).
- The bridge is `echo/quantum/bridge.js` (quantum).
- You edit ONLY `echo/ui/`, `echo/data/` and `echo/main.css`, plus evidence under `evidence/story-ui/ui-wiring/`.
- Changes to `main.js`, contracts or the bridge are written as an exact patch request in your report. Do not commit them to `echo/`.

**WHAT HAS NOT WORKED:**
- Lane tests that were green on fakes hid a total integration break: red-team's cross_lane_check failed 12 of 13.
- terminals-c4 was written against bridge names that do not exist. It expected `bellMeasurement`, `teleportDryRun(…, bits)` and `commitStoryTransfer`. The real exports at `lane/quantum/integration` 24e0ba7 are:
  - `cloneTest`, `bellSignalling`, `calibrationMeasurement`;
  - `teleportDryRun(calibration, correctionX, correctionZ)`, `commitTransfer`, `resetStoryToken`;
  - `verifySelectedBackendOnce`.
- Consumers that sliced bitstrings showed false failure lines. Always read `measurementBits.{m0, m1}` by name.
- A worker's "all green" has repeatedly been contradicted by its own renders.

**Vault and notes to read first:**
- `vault/AGENTS.md`, `vault/Index.md` (promoted lessons);
- `vault/Research/qollab-platform-and-submission.md`;
- `vault/Reports/story-ui-ui-shell-harness.md`, `story-ui-opening.md`, `story-ui-shell-polish.md`;
- the terminals and declassified reports in `/Users/udsy/agent-org/lanes/story-ui/reports/` (0004-terminals-c4, 0005-declassified);
- `lanes/story-ui/rulings.md`, especially the QOLLAB RUNTIME FACTS: no pointer lock, a click-to-focus overlay, and `main.js` never returns before the end.

Your report must open with a "Vault check".

**Where to start:**
1. `git merge-base --is-ancestor lane/story-ui/integration HEAD`, then `git merge main`.
2. Read these sources:
   - `git show lane/platform/integration:echo/main.js`; it already mounts `mountMenu`, `mountHud` and `mountDialogue`;
   - `lane/quantum/integration:echo/quantum/bridge.js`;
   - `lane/gameplay/integration:echo/game/*`.
3. Assemble a disposable composite tree under `/tmp/ui-wiring-build`: platform `main.js` and `index.html`, quantum `echo/quantum/`, gameplay `echo/game/` and `echo/scene/`, this branch's `echo/ui`, `echo/data` and `main.css`. Use `git archive` or `git show`, never by merging those lanes into your branch.
4. Serve it with platform's local runner under `tools/` on port **8811**. If that runner needs Pyodide and it can't load, say so and fall back to a JS-only check of the wiring.

**Deliver:**
1. **A seam table, as a checkpoint commit within 45 min.** One row per story-ui module × consumer: opening, hud, dialogue, menu, terminal, declassified. Each row gives:
   - what the consumer calls, against what we export;
   - the event names, against `QUEST_EVENTS`/`BUS_EVENTS`;
   - the bridge function names and result shapes, against what terminal.js expects;
   - `captionStyle` versus `subtitles`.

   Put each mismatch on its own line, with file:line on both sides.
2. **Story-ui's side of the fix, in story-ui files only.**
   - Write one facade, e.g. `echo/ui/storyUI.js`, but first search with `node scripts/where.mjs mountStoryUI --branches` and `git grep`. It mounts opening, terminal and declassified onto the bus and the quest machine, so platform's `main.js` needs only a few lines.
   - Do not rewrite `terminal.js` or `declassified.js`. Both are being conformed on other branches right now. Name the changes they need in your report, and I route them.
3. **The exact `main.js` patch for platform**, as a diff in `evidence/story-ui/ui-wiring/platform-patch.diff`. Apply it only in the /tmp composite.
4. **Real-product proof, from the composite in Chrome:**
   - screenshots of the opening captions;
   - the HUD after skip;
   - E at the booth opening the terminal, if gameplay's interaction reaches it, or else exactly where the path breaks;
   - one bridge call result with its engine label visible.

   Badge every image with the build hash, and copy 4–6 of them to `/Users/udsy/agent-org/lanes/story-ui/renders/ui-wiring/`.
5. A vault report, `vault/Reports/story-ui-ui-wiring.md`.

**How I will judge it:**
- the seam table is checked against the real files at the commits you name;
- I read the screenshots; any image not taken on the composite build is rejected;
- the facade must not duplicate logic in `menu.js`, `hud.js` or the platform `main.js`;
- before your final report you must merge `lane/story-ui/integration` into your branch again. I merge only if `is-ancestor` exits 0 and the ui-shell `drive.mjs` and `drive-opening.mjs` still pass on your tip.

Never claim a Qollab run: label everything "local runner".

**Report:** `/Users/udsy/agent-org/lanes/story-ui/reports/NNNN-ui-wiring.md`, with TL;DR, Vault check, the seam table, what you did NOT verify, and the patch requests per lane. Checkpoint commit within 45 min; final within 2 h.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 11: I merged shell-polish after reading its 4 renders and its data diff myself. The integration targets now exist on lane branches but not on main:
- `lane/platform/integration:echo/main.js` already mounts menu, hud and dialogue;
- `lane/quantum/integration:echo/quantum/bridge.js` exports `cloneTest`, `bellSignalling`, `calibrationMeasurement`, `teleportDryRun(calibration, x, z)`, `commitTransfer`, `resetStoryToken` and `verifySelectedBackendOnce`.

These names differ from what terminals-c4 assumed (`bellMeasurement` / `teleportDryRun(…, bits)` / `commitStoryTransfer`).

Rule: before merging any terminal code, grep its calls against the real `bridge.js` exports at the quantum lane tip.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 11: shell-polish rewrote the teach-back misconception `wrong` field from an asserted myth into a question ("Can an entangled pair carry the secret across by itself?"). Any renderer that prefixes `wrong` with "Myth:" or "Wrong:" would now read badly.

When judging declassified-conform, read the misconception render, not just the gate.
=== END LEARN ===
