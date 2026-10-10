---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: story-ui / opening
---

# story-ui opening: Shots A–D as timed captions, one exit event, always skippable

`echo/ui/opening.js` plays vision §4.1 (title card, billboard line, MIRROR/MICA/RIN captions, HUD + objective) and emits exactly one of `FINISHED` / `SKIP`. `node evidence/story-ui/harness/drive-opening.mjs 8781 evidence/story-ui/opening` → exit 0, 38 checks, module hash `917dc312fdab`, branch `lane/story-ui/opening`. Images, sabotage table and nulls: `evidence/story-ui/opening/README.md`.

## Decisions
- **Skip is always available from the first frame** (§3.4 "skip after first view" + QOLLAB no persistence: every run is a first view). The Skip button takes focus on mount.
- **Esc skips** (not pause): `menu.js` opens pause only once started and `pauseAllowed`; before free roam there is nothing to pause to. A capture-phase listener with `preventDefault` stops the menu also reacting.
- **Captions reuse `mountDialogue`**, extended with `play(beats, { auto })`: pages advance after `auto(pageText)` ms and Enter/Continue stand down. No second renderer.
- **`captionStyle`** ('standard' | 'high-contrast') is now in `accessibility.js` settings and on the root as `data-caption-style`, matching `contracts.js`. The legacy `subtitles` flag is untouched (menu still uses it); captions force-show during the opening.

## Measured / learned
- A guard that teardown already makes unreachable by input is a null under input-only checks; only programmatic/re-entrant calls exercise it (see README nulls).
- The dialogue reveal runs at about 28 chars/s in headless Chrome, not the nominal 60 (a 58-char line took ~2.3 s). Screenshot times must follow the reveal, not the beat start.
- Beat gaps ≥ 4 s let a two-page caption at 200% text finish before the next replaces it.
