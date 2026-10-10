## TL;DR
- **Done and verified (local harness, not Qollab).** All 7 scope items are in, on `lane/story-ui/shell-polish` (7 commits, 11fa912..HEAD).
- **Gates:** shell driver 46/46 at 1024×640, 1366×768 and 1280×720 (exit 0 each, hash `bd186c0796f7`). Story-data gate GREEN (exit 0). contract-check GREEN, 1087/1087 (exit 0). Opening driver still 38/38 (exit 0).
- **qollab-caps:** exit 1, not mine. Its only reds are `entry-index` and `entry-main`: `echo/index.html` and `echo/main.js` don't exist on this branch or on main (platform lane).
- **Checks were written first and watched red:** driver 14/45 red at 1024×640 (11fa912), data gate 4 red (c7a63bf).
- **New defects found and fixed:** at 1024×640 and 200% text, the HUD bottom row was 64px off-screen, the settings panel 91px and the title credit 8px. 1280×720 had hidden all three.
- **Sabotage:** 12 shell cases + 7 data cases. One gate null (S12, a too-narrow probe) found and closed. The remaining nulls are S4 at 1366/1280 and D6, both explained below.
- **Kets:** I reused declassified's `displayKets` byte for byte in `accessibility.js`, so the two branches add identical lines. terminals-c4 has its own `ket()`, which should switch to this helper.
- **Renders:** `renders/shell-polish/` (4 PNGs) and `evidence/story-ui/shell-polish/<viewport>/`. Each carries a provenance badge, re-derived with `shasum` = `bd186c0796f7`.
- **Recommend:** merge into lane/story-ui, then have terminals-c4 import `displayKets` and declassified show `FIDELITY_GLOSS` next to its journal fidelity labels.

## Vault check
- **Read:** `vault/AGENTS.md` (hook-delivered), `vault/Reports/story-ui-ui-shell-harness.md`, `lanes/story-ui/context.md`, the red-team player-text-audit relay in `lanes/story-ui/owner-answers.md`, vision §2.4/§6, `echo/CONTRACTS.md` settings, `echo/contracts.js`, `evidence/story-ui/data-fixes/branch_truth.py`.
- **Not opened** (skipped for time; nothing I built depends on them): `vault/Reports/story-ui-opening.md`, `vault/Reports/story-data-script-gate.md`, `vault/Research/qollab-platform-and-submission.md`, `lanes/story-ui/rulings.md`. I relied on the brief's summary of opening's `captionStyle` and auto mode, and both are in my base (`merge-base --is-ancestor` exit 0 for opening and for main).
- **Already known and reused:**
  - The ui-shell lessons: measure the live box, visibility pattern, `:where` reset.
  - The ui-shell lesson "nowrap null at 1280×720", which I confirmed and extended.
  - `branch_truth.py`, the 16-row Qiskit table, reused for the fidelity gloss instead of a second calculation.
  - declassified's `displayKets`.
  - The contract's `CAPTION_STYLES`, `QUALITY_LEVELS` and `DEFAULT_SETTINGS`, imported instead of the local duplicates.
- **Wrong or stale:**
  - `accessibility.js` duplicated `CAPTION_STYLES`/`QUALITIES` and emitted a `subtitles` key, which the contract's `validateSettings` rejects. Both removed.
  - The ui-shell report's "200% fits" held only at 1280×720.

## What I found
1. **Pagination** split at word boundaries only. The old check, "≤2 lines and rejoins", could never see a mid-sentence break.
2. **Kets:** dialogue and HUD printed `|0>`. The real script has 5 kets in story.js (VEGA, booth).
3. **Select font:** `.echo-select {font: inherit}` computes `system-ui…`, while the labels and buttons use `--echo-display`. This is the font mismatch the supervisor saw.
4. **Subtitles off:** `setSettings({subtitles:false})` set `data-subtitles="off"`, which gave `display:none` on the whole dialogue. It also made `getSettings()` fail `contracts.validateSettings`.
5. **1024×640 at 200%:** three elements left the viewport (numbers in the TL;DR).
6. **HUD `nowrap`:** load-bearing at 1024×640 only. With wrap allowed, the countdown drops under the objective. At 1366×768 and 1280×720 the row fits either way.
7. **Fidelity values:** on the generic test state (ry(1.137), then rz(0.44)) the values are {1, 0.674, 0.177, 0.149}, and **never 0**. A wrong Z alone gives 0.176668, matching the brief's 0.177. So the gloss must not say "0 means opposite".
8. **Real script length:** every beat in story.js fits on one 2-line page at 200%, even at 1024×640 (`script-pages-200.txt`). Only long beats exercise pagination.

## What I changed (commits on lane/story-ui/shell-polish)
- **11fa912, checks first (red 14/45).** `drive.mjs` takes a viewport argument and gained these checks:
  - sentence-boundary pages;
  - kets in dialogue, the script and the HUD tooltip;
  - Caption style focused first, no Subtitles control, options equal to `contracts.CAPTION_STYLES`;
  - select and option font equal to the label font;
  - HUD top-row integrity;
  - stale `subtitles:false` leaves the dialogue displayed;
  - `validateSettings(getSettings())` is `[]`;
  - an all-script walk at 200% (79 beats).

  `shell.js` exposes `STORY`/`MOMENTS`, `CAPTION_STYLES` and `validateSettings`, and hashes `story.js` into the badge.
- **3511967, shell fixes:**
  - `dialogue.js`: pages pull back to the last sentence end, and the beat text goes through `displayKets`.
  - `hud.js`: `displayKets` on the objective, capsule, prompt and tooltip.
  - `accessibility.js`: settings shape from the contract, unknown keys dropped, `subtitles` path deleted, `displayKets` added.
  - `menu.js`: Subtitles toggle replaced by a Caption style select (Standard / High contrast); a shared `select()` builder for caption style and quality.
  - `main.css`: both `data-subtitles` rules deleted; select and options in `--echo-display`; dialogue header row (speaker + Continue); root gap capped at `min(0.5em, 1.2vh)`; short-screen menu spacing under `@media (max-height: 760px)`.
- **c7a63bf, data gate first (red 4).** Two new sections in `check.mjs`:
  - §9 parses the §2.4 quoted sentence from the vision into one word class per content word and fails any non-question, non-negated sentence that hits every class. There is no misconception exemption.
  - §10 requires `FIDELITY_GLOSS` in every block that shows "fidelity". The gloss may claim only a 0-to-1 scale and "1 means identical". Against branch_truth's 16 rows, every fidelity must be in [0,1], and F=1 must hold exactly when the residual is I.
- **f9419d3, data fixes:**
  - teachback.js:46 is now `wrong: 'Can an entangled pair carry the secret across by itself?'` and `why: 'No. An entangled pair is a shared resource, not a channel. …'`, so the refutation is on the next line. The credits block is untouched.
  - New `objectives.FIDELITY_GLOSS` = "Fidelity: how closely the received state matches the test state, on a scale from 0 to 1, where 1 means identical."
  - The gloss is used in `TERMINALS.teleport_terminal.fidelityGloss` and in the Transfer tab's `expected` list, which imports it, so there is one copy.
- **8d4cfe6:**
  - Clause-break fallback inside a sentence longer than 2 lines (`,` `;` `:` `—`, in the page's back half only).
  - Gate guard: the probe must match the live box's width and font size (closes S12).
  - Page-2 ket render, sabotage round, tool outputs, evidence README.
  - `story.js` comment "subtitle" changed to "caption".
- **97b833e and the next commit:** vault report `vault/Reports/story-ui-shell-polish.md`, and the opening regression output.

## Evidence
- **Driver output:** `evidence/story-ui/shell-polish/{1024x640,1366x768,1280x720}.txt` and `<vp>/drive-result.json` (keys pressed plus every check), and `<vp>/script-pages-200.txt`.
- **Renders for the supervisor** (`renders/shell-polish/`):
  - `long-line-sentence-break-200pct-1024x640.png`: page 1/3 holds exactly one sentence.
  - `ket-line-200pct-1024x640.png`: page 2/3, "|0⟩ and |1⟩, but for |+⟩ …", broken at a comma.
  - `settings-caption-style-select-focused-1024x640.png`: Caption style select in the display face, with a 3px yellow focus ring and no Subtitles row.
  - `hud-200pct-1366x768.png`: the HUD at 200% with a ket tooltip "|ψ⟩ · |+⟩".
- **Sabotage table:** `evidence/story-ui/shell-polish/sabotage.txt`.
- **Tool outputs:** `contract-check.txt` (exit 0), `qollab-caps.txt` (exit 1, entry files only), `story-data-check.txt` (exit 0), `opening-regression.txt` (exit 0, 38/38).

### Sabotage round
Run on a disposable copy under `/tmp`, served on 8801, never on this tree.

**Shell driver, red as expected:**
- S1 no sentence back-off
- S2 dialogue without kets
- S3 tooltip without kets
- S4 top row allowed to wrap, at 1024×640
- S5 select back to the system font
- S6 Subtitles toggle re-added
- S7 stale keys kept in settings
- S8 `subtitles:false` hides the dialogue
- S9 no short-screen query
- S10 uncapped gap
- S11 footer on its own row

**Data gate, red as expected:**
- D1 banned sentence restored
- D3 gloss removed from the console
- D4 gloss claims "0 means opposite"
- D5 gloss says "percentage"
- D7 branch truth swapped so a wrong Z scores 1

**Nulls (what did not go red):**
- **S4 at 1366×768 and 1280×720.** Wrap is harmless there because the row fits. The row check is load-bearing only at 1024×640.
- **S12, a gate-probe sabotage.** A 60px probe plus S1 made both mid-sentence checks pass vacuously. **Closed:** a probe-vs-live width/font guard now goes red.
- **D6, the banned claim phrased as a question.** Green by design: the gate cannot judge a leading question, so a human read is still needed.
- **D2 harness no-op.** My sabotage script's mutation silently didn't apply, so it reported exit 0. A manual rerun on a sed copy goes red, and both the old §5 pattern and the new §9 fire. That was a tooling null (law 13), not a gate null.

## Not done / not verified
- **Qollab:** I did nothing there. All results are from the local harness on port 8801.
- **accesslint:** I didn't run an audit_live pass.
- **Physics read:** the phrase gate still can't judge physics, and no human has read the new lines yet. Please read the gloss and the teachback:46 question.
- **Other players of the same text:**
  - Terminals and Declassified don't import `displayKets` yet (terminals-c4 has its own `ket()`).
  - Declassified's `RUN_JOURNAL.labels.fidelity` / `commitFidelity` on its branch don't carry the gloss yet. My gate will flag them once merged, which is intended.
- **Merge conflicts:** `merge-tree` against declassified (main.css) and terminals-c4 (main.css, objectives.js) conflicts. The **same conflicts exist from the lane base 1908470**, so they predate this change. My lines sit near those hunks.
- **TEACHBACK distractor:** "Entanglement delivers the message, but too slowly." is still voiced (no "instant", so it isn't the §2.4 sentence). I left it, since it was out of scope.
- **Opening note:** I didn't read its vault note. Its driver re-ran green.

## Decisions inferred from the docs
- **Caption style labels "Standard" / "High contrast"** (values exactly as `contracts.CAPTION_STYLES`): owner ruling in CONTRACTS.md:250 and vision §6.1 layer 4.
- **Select uses the display face**, matching the labels and buttons beside it: vision §6.2 type tokens, where display type is used for UI chrome.
- **Clause-break fallback inside an over-long sentence:** vision §6.2 asks for captions of 2 lines at most that read well. The brief allows a word boundary, and a clause break is one.
- **Speaker and Continue share the header row** of the dialogue, to fit 200% at 1024×640: vision §6.2 (2-line dialogue) and CLAUDE.md (200% accessibility).
- **Gloss wording claims only "0-to-1, 1 = identical"**, because no shown value is 0: vision §7 and §2.4 (truthful physics). Verified on the 16 branch_truth rows.
- **teachback:46 phrased as a question with "No." first:** vision §2.4 (never say it) and the owner relay "keep quoted misconceptions only where refuted on the next line".

## Next (for the supervisor)
1. Merge `lane/story-ui/shell-polish` into lane/story-ui. Re-run `node evidence/story-ui/harness/drive.mjs <port> <out> 1024x640` (and 1366x768) and `node evidence/story-ui/story-data/check.mjs` in a disposable worktree.
2. Brief terminals-c4 to replace `ket()` with `import { displayKets } from './accessibility.js'`.
3. Brief declassified to show `FIDELITY_GLOSS` beside its fidelity labels. Resolve the pre-existing main.css section conflicts when those land.
4. Get a human physics read of the gloss and teachback:46 (gate null D6).
5. The platform lane owes `echo/index.html` and `echo/main.js` for qollab-caps to go green.
