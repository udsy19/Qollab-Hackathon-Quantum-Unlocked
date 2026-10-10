## TL;DR
DONE and verified in the local harness (not Qollab). The HUD, 2-line dialogue, title/pause/settings/controls menus and in-memory settings are committed on `lane/story-ui/ui-shell` (`fe299de`, `4739c38`).
- The real-key puppeteer driver passes 30 of 30 checks: `node evidence/story-ui/harness/drive.mjs 8742 evidence/story-ui/ui-shell` → exit 0.
- The screenshots carry the badge `ui-shell r3 · sha256 43726d2831e7`. `cat echo/main.css echo/ui/{accessibility,hud,dialogue,menu}.js | shasum -a 256` on `4739c38` gives the same value.
- Evidence is in `evidence/story-ui/ui-shell/` (README + 9 PNGs + `drive-result.json`). The 8 key images are in `renders/ui-shell/`.
- Sabotage round: 5 of 6 went red. **One null:** the HUD top-row `nowrap` is not load-bearing at 1280×720.
- accesslint: the serious finding (unnamed dialog) is fixed. 2 moderate findings remain, both harness or page level.
- Recommend: merge ui-shell first (main.css hot spot, per owner-answers), then hand platform the contract below.

## Vault check
- **Read:** vault/AGENTS.md, vault/Index.md, vault/Home.md (NOW block), vault/Research/qollab-platform-and-submission.md, vault/Design/lanes-and-supervisors.md, lanes/story-ui/context.md, owner-answers.md, and ECHO_MASTER_VISION §3.1, §3.4, §4.1, §6.1–6.6, §8.2, §12.5.
- **Already known:** main.css is the only stylesheet. `<script>` in index.html does not run. There is no storage. Harnesses live outside `echo/`. Story data ships as JS modules.
- **Reused:** nothing. `where.mjs mountHud --branches` exited 1, and no `lane/*` branch carries UI code.
- **Stale:** Index lists no Reports beyond the registry. That is expected; the loop regenerates the hubs. I did not commit hub output.

## What I built
- `echo/ui/accessibility.js`
  - `defaultSettings()`, `normalizeSettings()`, `applySettings(root, s)`. The last one sets `data-subtitles`, `data-reduced-motion`, `data-quality`, `data-text-scale` and `--echo-text-scale` on the UI root.
  - `trapTab`, `focusableIn`, `el`.
  - The reduced-motion default comes from `prefers-reduced-motion`.
- `echo/ui/hud.js` — `mountHud(root)` returns `{setObjective(n, text), setCountdown(seconds|string), setCapsuleState(label, status), showPrompt(label, key), hidePrompt, showTooltip(text, {duration}), hideTooltip, setVisible, destroy}`.
  - The status is one of inactive, available, complete or error. Each has its own glyph (○ ◆ ✓ ✕) as well as a colour.
- `echo/ui/dialogue.js` — `mountDialogue(root)` returns `{play(beats) → Promise, advance, skip, relayout, clear, active, destroy}`.
  - Pagination is measured in the live box: ≤2 lines per page at any text scale, with a "1/2" indicator.
  - The text reveal is optional (`reveal:false` or reduced motion turns it off). The first Enter shows the full caption; the second advances.
  - Screen readers get the whole page through a polite live region.
  - Enter/Space advance only when focus is free and no menu is open.
- `echo/ui/menu.js` — `mountMenu(root, {settings, onChange, onStart, onResume, onRestart})` returns `{showTitle, showPause, openSettings, openControls, close, isOpen, screen, getSettings, setSettings, setPauseAllowed, destroy}`.
  - Esc opens pause, goes back a screen, or resumes. Tab is trapped inside the open panel. Focus returns to the item that opened a sub-screen.
  - Title shows Start / Settings / Controls and the Qollab & IonQ credit. Pause shows Resume / Settings / Controls / Restart.
  - Settings: subtitles, reduced motion, text size 100–200 (step 25), quality low/med/high, volume.
- `echo/main.css` — sections `tokens and base`, `hud`, `dialogue`, `menu`. There is room after `menu` for `/* ==== terminal ==== */`.
  - Everything is sized in em of the UI root, so text scale multiplies the whole UI.
  - Panels are `rgba(6,13,24,0.92)` with a 1px cool outline. Fonts are a system stack only (Bahnschrift/DIN Alternate for display), so there is no font license to record.
  - Transitions are 200ms, and reduced motion sets them to 0.

**Bugs the driver caught in my own code:**
1. Focus failed on menu open, because the `visibility` transition starts hidden.
2. The 200% countdown wrapped and pushed the bottom HUD off-screen.
3. The `h1` reset beat the title margins.
4. The closed dialog had no name (accesslint).

All four are fixed.

## Evidence
- `evidence/story-ui/ui-shell/README.md` maps each brief item to its screenshot, and gives the provenance recipe, the key sequence, the sabotage table and the accesslint results.
- Driver: exit 0, 30/30 (the final run on `4739c38`'s files).
- Sabotage round (disposable copies in /tmp, port 8743):
  - no pagination: exit 1
  - no reduced-motion rule: exit 1
  - no focus outline: exit 1
  - no tab trap: exit 1
  - no reveal-skip: exit 1
  - **NULL:** HUD top-row wrap allowed: exit 0

## Not done / not verified
- Nothing has run on Qollab. There is no canvas: the harness backdrop is a placeholder.
- Only 1280×720 was measured. Narrower viewports at 200% are untested (see the null above).
- The pause/settings key sequence includes **one scripted focus reset** to Resume, made after the Tab-trap probe. It is disclosed in the README.
- No screen-reader run with real assistive tech; ARIA was checked by accesslint only.
- I did not run `node scripts/vault-hubs.mjs` to write hubs: the worker rules forbid committing hub output. The new note `vault/Reports/story-ui-ui-shell-harness.md` shows as STALE-pending in `--check`.

## Contract requests for platform
1. **The UI root.** `index.html` needs one `<div id="echo-ui">` positioned over the canvas, inside a positioned parent. The modules take it as `root`. All three mount into the same root so the settings attributes apply to all of them.
2. **Settings shape:** `{subtitles: bool, reducedMotion: bool, textScale: 100–200, quality: 'low'|'med'|'high', volume: 0–100}`, delivered through `onChange(settings, key)`. Platform routes `quality` to renderer/quality.js and `volume` to audio.js.
3. **Esc ownership.** A terminal that owns Esc must call `menu.setPauseAllowed(false)` while it is open, or `preventDefault()` on the keydown before the menu sees it.
4. **Restart** calls `onRestart`. Platform/gameplay owns the actual state reset (§9.5).
5. **Pointer lock** must be released when `menu.isOpen()` or `dialogue.active`. Gameplay input.js has to read these.
6. **Title h1.** The page has an h1 only while the title is up. If the host page needs one at all times, platform decides.

## Questions for the owner
1. **Subtitles toggle without voice-over.** There is no VO in scope, so "Subtitles off" currently hides all dialogue text, and the player would then miss the story. Should the toggle (a) exist as specified, (b) be removed, or (c) become caption size/background instead?
2. **Capsule states.** I used the four §6.2 highlight states (inactive/available/complete/error), each with a glyph and a free-text label, e.g. "Q-SOURCE: PRESERVED". Is there a canonical list of capsule labels (PRESERVED / MEASURED / CONSUMED / TRANSFERRED?) that I should ship as data?

## Next (for the supervisor)
1. Merge `lane/story-ui/ui-shell` first, because main.css is the hot spot. Then the terminal worker rebases and appends `/* ==== terminal ==== */`.
2. Forward the 6 contract requests to platform.
3. Raise the 2 owner questions.
4. Follow-up row: run the driver at 1024×640 and 1366×768 at 200%, to close the `nowrap` null.
