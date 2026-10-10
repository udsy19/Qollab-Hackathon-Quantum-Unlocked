---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: story-ui / ui-shell
---

# story-ui shell: HUD, dialogue and menus measured in a keyboard-driven harness

The story-ui shell (`echo/ui/{hud,dialogue,menu,accessibility}.js` + `echo/main.css`) passes 30 real-key checks at 1280×720: `node evidence/story-ui/harness/drive.mjs 8742 evidence/story-ui/ui-shell` → exit 0, branch `lane/story-ui/ui-shell`, module hash `43726d2831e7`. Evidence and the full sabotage table: `evidence/story-ui/ui-shell/README.md`.

What was measured, and what it teaches the next worker:
- **A `visibility` transition starts hidden, so `focus()` fails on the frame a menu opens.** That was the first red: Esc opened pause, but focus stayed on `body`. Fix: show with `visibility 0s`, and hide with `visibility 0s linear <fade>` delayed. Any panel that takes focus as it appears needs this pattern.
- **A component's margin can lose to an `.echo-ui h1 {margin:0}` reset** (0,1,1 beats 0,1,0). Reset with `:where()`.
- **Two-line dialogue is enforced by measuring the live box**, not by counting characters. At 200% the box widens to 100% of the row, so a long beat gets the same number of pages as at 100%. "More pages at 200%" was a wrong check; "every page ≤2 lines, and the pages rejoin to the exact text" is the right one.
- **The 200% HUD fits 1280×720 only with the countdown stacked** (label over value). Side by side, the top row wrapped and pushed the capsule/prompt row off-screen.
- **Null:** `flex-wrap: nowrap` on the top HUD row is not load-bearing at 1280×720. Narrower viewports were not measured.
- **accesslint audit_live caches ES modules per origin.** Re-audit from a fresh port after editing a module, or the audit grades stale code.
