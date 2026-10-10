# Opening (vision §4.1) — evidence

Module: `echo/ui/opening.js` · CSS: `/* ==== opening ==== */` in `echo/main.css` · timed captions: `play(beats, { auto })` in `echo/ui/dialogue.js`.
**Provenance badge** (top right of every screenshot): `opening r1 · sha256 917dc312fdab` = first 12 hex of SHA-256 over
`cat echo/main.css echo/ui/accessibility.js echo/ui/hud.js echo/ui/dialogue.js echo/ui/opening.js`, measured at commit after `e9f7049`.

Run: `python3 -m http.server 8781` from the repo root, then `node evidence/story-ui/harness/drive-opening.mjs 8781 evidence/story-ui/opening`
→ **exit 0, 38 PASS, 0 FAIL** (`driver-output.txt`, `result-*.json`). Five modes run in parallel in separate browsers, real time (65 s run).
Expected text is imported from `echo/data/` by the driver; the module's own account of what it showed is never read.

| image | shows |
|---|---|
| 01-title-card, 02-shot-a-billboard | card "NACRE CITY // 02:17 AM" + billboard line, Skip focused |
| 03-shot-b-caption, 04/05-shot-c-* | MIRROR / MICA captions (05 = the misconception line) |
| 06a-hud-fade-start, 06-shot-d-hud-objective | HUD with "FIND AN AUTHORIZED REPLICATION BOOTH" |
| 07-skip-at-3s | Skip focus ring at 3 s, just before Esc |
| 10-200pct-{1280x720,1024x640}-{card,misconception,hud} | 200% text, nothing clipped |
| 08/09-reduced-motion-* | reduced motion + high-contrast captions |

The canvas behind is the harness placeholder (labelled in each image); the scene lane's camera drives from `onShot`.

## Sabotage round (disposable copies in /tmp, server on 8781; the real tree was never mutated)

| sabotage | mode | result |
|---|---|---|
| remove the `if (settled) return` guard in `settle` (and the Esc `settled` check) | skip | RED — re-entrant skip overflows the stack (`Maximum call stack size exceeded`), reported as a driver FAIL |
| same | full | RED — `f:` events `["FINISHED","SKIP","SKIP"]` |
| remove the reduced-motion CSS block | rm | RED — 10 nodes with transitions listed |
| `outline: 3px solid` → `outline: none` | full | RED — `g:` `none 3px` |
| swap shots B and C | full | RED — `c:` order `ACBD`, and the §4.1 timing check |

**Nulls (reported, then fixed):** the first guard sabotage went **green** on all 23 checks. Teardown already removes the key listener, timer and Skip button, so no *input* can reach a second `settle`; the guard only matters to programmatic and re-entrant calls. I added those checks (`skip()` called after the end, `skip()` re-entered from `onSkip`) and the sabotage then went red. Before that, the driver also crashed with no verdict on the unguarded recursion; a crash is now a FAIL.
