## TL;DR
- DONE: `echo/ui/opening.js` + `/* ==== opening ==== */` in main.css. Title card, billboard line, all 11 MIRROR/MICA/RIN lines as ≤2-line timed captions, HUD fade-in with "FIND AN AUTHORIZED REPLICATION BOOTH". Exactly one `FINISHED` or `SKIP`, once.
- Driver `node evidence/story-ui/harness/drive-opening.mjs 8781 evidence/story-ui/opening` → **exit 0, 38 PASS** (real 65 s run + skip, reduced-motion, 200% at 1280×720 and 1024×640). First run with no module: exit 2 (refused, 404 on opening.js).
- Sabotage: 4 of 4 red (skip guard, reduced-motion CSS, focus ring, shot order). **One null found and fixed** (see Results).
- Evidence: `evidence/story-ui/opening/` (README, 16 PNGs, driver-output.txt); 6 key images in `renders/opening/`. Badge `opening r1 · sha256 917dc312fdab`. Vault report `vault/Reports/story-ui-opening.md`.
- `tools/qollab-caps/check.mjs`: exit 1, only because platform's `echo/index.html` and `echo/main.js` do not exist yet; `echo/` holds 11 files.
- Commits on `lane/story-ui/opening` (4). Branch is not yet merged.

## Vault check
Read: `vault/AGENTS.md`, `vault/Reports/story-ui-ui-shell-harness.md`, `echo/CONTRACTS.md` (settings), vision §3.4/§4.1/§6, `echo/ui/*`, `echo/data/*`, `echo/contracts.js`. Known and reused: the harness/driver pattern, `el`, `applySettings`, the dialogue's pagination, the "show/hide with visibility 0s" CSS pattern. Stale: `accessibility.js` still carried `subtitles` while `contracts.js` says `captionStyle` (captions always on); I added `captionStyle` and left `subtitles` for the menu. I did not run `where.mjs`, but a `git grep` for opening/auto/timed showed no prior art.

## Results
- Decisions: Skip always available from frame 1 (focused on mount), Esc skips (no pause exists before free roam; capture-phase + preventDefault so menu.js does not also act). Both recorded in the vault report.
- No second caption renderer: `mountDialogue.play(beats, { auto })` is new; in auto mode keys and Continue stand down. Text only from `echo/data` (`SCREEN_TEXT.openingCard`, `.billboard`, `STORY.OPENING`, `OBJECTIVES.FREE_ROAM_ALLEY`). No data edits.
- Shot timeline fires A 0, B 10, C 24, D 44 s (measured within 0.05 s). FINISHED lands at 65.03 s.
- Idempotence: Esc mashed, Enter, click, `skip()` after the end, `skip()` re-entered from `onSkip`, double mount → one event.
- Reduced motion: 32 nodes, no transition or animation above 0 ms; captions appear whole. High-contrast style: black panel, white text (screenshot 09).
- 200% text: geometry sampled every second for 62 s at both viewports: nothing out of the viewport, clipped or overlapping (leaf boxes; the HUD row containers span the width, so I compare the capsule/prompt/objective/timer, not the containers).
- **Null:** removing the `settled` guard stayed green at first (23/23). Teardown already removes the listener, timer and button, so input cannot reach a second `settle`. I added programmatic and re-entrant checks; the sabotage then went red (`Maximum call stack size exceeded`, and `["FINISHED","SKIP","SKIP"]`). The driver now reports a crash as a FAIL.
- Observed, not mine: the dialogue's reveal runs at ~28 chars/s in headless Chrome, not the nominal 60. Reveal is skipped under reduced motion.

## Not done / could not verify
- The Qollab runtime; this is the local harness (static server) only. The backdrop is the placeholder.
- No in-scene billboard: the line is a UI element during Shot A. Scene may draw its own and ignore it.
- A real Chrome pause/Esc interplay with the actual `menu.js` was not run in this harness (menu is not mounted); the reasoning is from `menu.js` source (`started && pauseAllowed && !defaultPrevented`).
- Hubs (`Reports/README.md`, `Map.md`) are stale until the loop regenerates them (I did not commit generated files).

## Contract requests
- **Platform/gameplay, camera:** drive the camera from `onShot('A'|'B'|'C'|'D', t)` (fires once each, t in seconds). Shot D should hand over to gameplay control at FINISHED/SKIP.
- **Platform:** `mountOpening(root, { onShot, onFinished, onSkip, settings, hud, dialogue })`. Wire `onFinished`/`onSkip` to `QUEST_EVENTS.FINISHED`/`SKIP` (source story-ui/dialogue). Pass the shared `hud` so the objective appears either way, and the shared `dialogue` if one exists. Keep `menu.setPauseAllowed(false)` until OPENING ends.
- **Platform:** the menu's `subtitles` toggle should become `captionStyle` per `contracts.js`; `accessibility.js` accepts both for now.
- Countdown: the HUD reads `--:--` until gameplay calls `hud.setCountdown` (the harness sets 11:59, MIRROR's "eleven minutes and fifty-nine seconds").

## Decisions inferred from the docs
- Skip always on, from frame 1: §3.4 + QOLLAB no persistence.
- Esc = skip: §6 line 371 plus menu.js's own pause gating.
- Beat times (10.5 … 60 s) inside the §4.1 shot windows, ≥4 s apart so 2-page captions at 200% finish; the card is 0.5–8.5 s and the billboard 2–10 s: §4.1 gives no times for these.
- `captionStyle` over `subtitles`: `contracts.js` / CONTRACTS.md ruling "captions always on".

## Next
1. Merge `lane/story-ui/opening` (supervisor); regenerate hubs.
2. Platform: wire `mountOpening` into `main.js` per the contract requests, and run the Qollab check.
3. Story-ui next: ending/credits overlay, or the dialogue's reveal speed if the owner wants it faster.
