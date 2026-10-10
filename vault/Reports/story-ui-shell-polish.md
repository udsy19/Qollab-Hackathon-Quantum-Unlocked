---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: story-ui / shell-polish
---

# story-ui shell polish: sentence pages, kets, caption style, 200% at three viewports

Branch `lane/story-ui/shell-polish`. The shell driver `evidence/story-ui/harness/drive.mjs` now takes a
viewport (`node drive.mjs <port> <out> 1024x640`) and passes 46/46 at 1024×640, 1366×768 and 1280×720
(module hash `bd186c0796f7`). `evidence/story-ui/story-data/check.mjs` is GREEN with two new sections.
Evidence, reproduction and the sabotage table: `evidence/story-ui/shell-polish/README.md`, `sabotage.txt`.

What was measured, and what the next worker should know:
- **"Every page ≤2 lines" never caught a mid-sentence break.** The new check renders the sentence that
  holds each mid-sentence break alone, in a clone of the live text box, and goes red unless that
  sentence alone is longer than 2 lines. **That probe was vacuous when narrower than the live box**
  (sabotage S12: a 60px probe let the no-back-off sabotage pass). Fix: assert the probe's width and
  font size equal the live box's first.
- **The real script never needs a second page at 200%**, even at 1024×640 (`script-pages-200.txt`):
  every beat in story.js fits on one 2-line page. Only the harness's long VEGA beat exercises the
  pagination path. Long terminal/Declassified text is not paginated by dialogue.js.
- **1024×640 at 200% did not fit** before this change: the HUD bottom row ended at y=704 (64px off-screen),
  the settings panel at y=731 (91px), and the title credit at y=648 (8px). 1280×720 had hidden it. Fixed by (a)
  putting the speaker and Continue on one dialogue header row, (b) capping the root grid gap at
  1.2vh, and (c) tighter menu spacing under `@media (max-height: 760px)`.
- **The HUD `nowrap` is load-bearing only at 1024×640.** At 1366×768 and 1280×720 the objective and
  countdown fit side by side either way (S4 is a null there). The new row check is red at 1024×640.
- **`<select>` does not inherit its font.** `font: inherit` gave it `system-ui`, while the labels and
  buttons use the display face. It now sets `--echo-display` on the select and on its options.
- **Settings now follow the contract shape exactly.** `normalizeSettings` keeps only
  `DEFAULT_SETTINGS` keys, imported from `echo/contracts.js`, so a stale `subtitles:false` is dropped
  and `validateSettings(menu.getSettings())` is `[]`. Captions cannot be turned off by any path.
- **Fidelity on the generic test state never reaches 0.** The values are 1, 0.674, 0.177 and 0.149
  (branch_truth.py: ry(1.137), then rz(0.44)). A gloss saying "0 means opposite" would describe a
  value the player never sees, so `FIDELITY_GLOSS` claims only "a scale from 0 to 1, where 1 means
  identical". The gate checks that against all 16 rows.
- **The §2.4 sentence is detected from the vision's own quote**, one word class per content word,
  with no misconception exemption. Null: a question ("Does entanglement send the secret
  instantly?") passes by design, so the gate cannot judge a leading question.
