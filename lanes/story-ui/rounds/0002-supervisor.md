=== PLAN ===
**Lane story-ui plan, consult 2 (Sat 2026-10-10 ~23:40 ET Fri / 03:36 UTC, T+5h)**

**Goal:** the story and interface from vision §4 and §6. That covers:
- a skippable opening
- dialogue with subtitles, 2 lines max
- the HUD
- three terminals (copy booth, relay, teleport console), wired to the §8.4 adapter with honest error states
- progressive hints
- Declassified mode with the teach-back
- pause and settings menus
- keyboard navigation, visible focus, reduced motion and text scaling

This is Plan rows 5 (G2, shared with gameplay) and 6 (G3, shared with art).

**Approach (unchanged):**
- Decoupled ES modules in `echo/ui/`. Each one uses `mount(root, deps)`, builds its own DOM and talks through callbacks.
- Story data ships as JS modules in `echo/data/`.
- All CSS lives in delimited sections of `echo/main.css`.
- Harnesses live in `evidence/story-ui/harness/`, one port per worker.
- Names conform to platform's `echo/contracts.js` and `CONTRACTS.md` (on `lane/platform/integration`): import, never fork.
- Until quantum ships its adapter, terminals use a `documented_preview` stub. The engine label is always visible, and previews carry no counts.

**Done:**
- **ui-shell, judged this consult and merged.** It covers the HUD, 2-line paginated dialogue, title/pause/settings/controls, in-memory settings, a Tab trap, focus rings, reduced motion and 100–200% text scale.
- The driver passes 30 of 30. Five of six sabotages went red. The null was the HUD `nowrap` at 1280×720.
- I looked at the screenshots myself:
  - The title has the attribution line, and focus is clearly visible.
  - At 200%, the HUD and dialogue fit at 1280×720 and the dialogue stays at 2 lines.
  - The settings modal fits.
- Defects I saw:
  - Dialogue pages break mid-sentence ("…it produced one").
  - The text uses ASCII kets ("|0>") instead of ⟩.
  - The `<select>` uses the system font.
  - The harness "[canvas placeholder]" overlaps the logo. That one is harness only.

**In flight:**
- `story-data`: running.
- `terminals`: queued. Its base must include the ui-shell merge so its `main.css` section appends cleanly.
- `shell-polish`: dispatched now.

**Rulings I applied (settled by the vision, so no owner question):**
- **Subtitles:** vision line 436 says "Dialogue captions must be visible and not rely on voice-over", and there is no VO in scope. The Subtitles setting may therefore never hide dialogue. It becomes a caption-style setting (Standard / High-contrast background), and captions are always on.
- **Capsule labels:** the canonical strings come from the vision: `Q-SOURCE: PRESERVED` (§6 mock), `STATE PRESENT`, `STATE MEASURED / CONSUMED` and `STATE RECOVERED` (§4.4 beat 4). They ship as data. If story-data has not already added them, the next data or terminal brief adds them.

**Next (consult 3+), as reports arrive:**
1. Judge story-data. Check the physics wording against §2.4 and §7.5, the hint ladders and the teach-back questions.
2. `declassified`: `ui/declassified.js` plus teach-back. It depends on story-data's question shape.
3. `opening`: a skippable Shot A–D caption player, using `onShot(id)` callbacks for gameplay's camera.
4. Judge terminals and require the engine label in every screenshot.
5. a11y pass: a keyboard-only run through every panel, 200% text at 1024×640 and 1366×768, and contrast.
6. Integration with platform `main.js` and the gameplay state machine, then a full graybox run in the local runner.
7. Credits once the owner gives names.

**Risks:**
- Contract drift: the six ui-shell contract requests still have to reach platform (relayed via ASK).
- `main.css` merge order.
- Physics wording.
- G2 is Sat 17:00. The UI must be integrated by about Sat 12:00, or we take the one-room cut.
- Credit names are still open.
=== END PLAN ===

=== MERGE branch=lane/story-ui/ui-shell ===

=== AGENT name=shell-polish model=opus base=lane/story-ui/integration ===
**GOAL:** a first-time player who uses the settings, plays at 200% text on a small laptop, or reads long VEGA lines never loses story text and never reads a page that cuts off mid-thought.

**VISION:** ECHO §6 (UI) and §12.5 (accessibility). Vision line 436 reads: "Dialogue captions must be visible and not rely on voice-over." Line 1111 reads: "No audio → story understandable through captions."

**WHAT WE ARE BUILDING:** a polish pass on the merged ui-shell modules (`echo/ui/{accessibility,hud,dialogue,menu}.js`, the ui-shell section of `echo/main.css`), using the harness `evidence/story-ui/harness/` (`drive.mjs`, `shell.html`, `shell.js`). Your lane owns only `echo/ui/`, `echo/data/` and `echo/main.css`.

**WHAT HAS NOT WORKED / known defects (from the supervisor's own look at `renders/ui-shell/*.png`):**
1. **"Subtitles off" hides all dialogue.** There is no VO, so this breaks line 436. Replace it with a caption-style setting: `captionStyle: 'standard'|'high-contrast'` (high-contrast = a solid opaque background behind the text plus a heavier weight). Captions are always on. Remove the `subtitles` boolean and every reference to it, in the same change. Grep afterwards and report zero references.
2. **Dialogue pagination breaks mid-sentence.** 03-dialogue-long-page1 ends "…it produced one correlated two-qubit". 06 at 200% ends "…it produced one". Paginate at sentence or clause boundaries where a page can hold them. Fall back to a word break only when a single sentence exceeds 2 lines. The hard maximum of 2 lines stays.
3. **The HUD `nowrap` null.** It is not load-bearing at 1280×720, and narrower viewports were never measured. Run the driver at 1024×640, 1280×720 and 1366×768, at both 100% and 200%. Prove that nothing clips, overlaps or overflows the viewport. Make the `nowrap` sabotage go red at some size, or show with a table that it truly is not load-bearing.
4. **Kets render as ASCII "|0>".** Render a proper ket ⟩ (U+27E9) and confirm the font has the glyph, using a screenshot crop. The data is story-data's: the renderer must display whatever string arrives. Do not rewrite their strings; report the request.
5. **The quality `<select>` renders in the system font.** Style it to match the menu.

**Vault notes to read first:**
- vault/AGENTS.md
- vault/Index.md
- vault/Reports/story-ui-ui-shell-harness.md
- evidence/story-ui/ui-shell/README.md
- the full report at /Users/udsy/agent-org/lanes/story-ui/reports/0001-ui-shell.md
- vault/Research/qollab-platform-and-submission.md
- ECHO_MASTER_VISION.md §6 and §12.5

**Where to start:** `git log lane/story-ui/integration`, which should contain ui-shell. If it does not, base on `lane/story-ui/ui-shell` and say so. Serve the harness on your own port: 8751.

**What to deliver:** commits on your branch, `evidence/story-ui/shell-polish/` (README, screenshots at all 6 viewport×scale combinations, `drive-result.json`), and an updated vault report.
- Every screenshot carries the build badge with the sha256 of the shipped files, recomputed by you (law 16).
- Write each new check first and show it red on the current code: a caption-hiding check, a mid-sentence page-break check, and a viewport-overflow check. Then fix the code.
- Close with a sabotage round on disposable copies. Report the nulls.

**How I will judge it:**
- Your screenshots, not your counts.
- A long VEGA line paginates at a sentence boundary.
- High-contrast captions are visibly different from standard.
- No clipping at 1024×640 and 200%.
- The badge hash matches the files.

**Report:** `reports/0002-shell-polish.md`. It opens with "Vault check", then TL;DR, evidence paths, nulls, contract requests and questions for the owner. Write a checkpoint within 1 h, even if partial (marked PARTIAL).
=== END AGENT ===

=== ASK_OWNER ===
Please relay this to the platform supervisor. These are contract requests from story-ui's merged ui-shell, and they are not owner decisions:
1. `index.html` needs a single `<div id="echo-ui">` over the canvas. All story-ui modules mount into it.
2. The settings shape is `{captionStyle:'standard'|'high-contrast', reducedMotion, textScale:100–200, quality:'low'|'med'|'high', volume:0–100}` via `onChange(settings,key)`. Platform routes `quality` to the renderer and `volume` to audio.
3. A terminal that owns Esc calls `menu.setPauseAllowed(false)`.
4. `onRestart` → platform/gameplay resets the state (§9.5).
5. Gameplay's input releases pointer lock while `menu.isOpen()` or `dialogue.active`.
6. The h1 exists only on the title screen. Platform should confirm that is fine for the host page.

FYI, decided from the vision and not asked: with no voice-over, "Subtitles off" would hide the story, which breaks vision line 436 ("captions must be visible and not rely on voice-over"). So the setting becomes caption style (standard / high-contrast) and captions are always on. Tell me if you want otherwise.
=== END ASK ===

=== LEARN ===
2026-10-10 consult 2: I merged ui-shell after looking at the 8 renders myself.

The worker's driver passed 30 of 30, but my own look still found three defects the driver could not see:
- dialogue pages break mid-sentence
- kets render in ASCII
- the select uses the system font

Lesson: always Read the renders before merging. A green driver checks what its author thought of, not what a reader sees.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 2: The vision already settles two questions the ui-shell worker raised, so they did not go to the owner.

1. **Subtitles toggle.** Line 436 says "captions must be visible and not rely on voice-over", and there is no VO in scope. The Subtitles setting therefore becomes caption style, and captions are never off.
2. **Capsule labels.** The canonical strings are `Q-SOURCE: PRESERVED` (§6 mock), and `STATE PRESENT`, `STATE MEASURED / CONSUMED` and `STATE RECOVERED` (§4.4 beat 4).

Grep the vision before raising an owner question.
=== END LEARN ===
