# story-ui shell polish — evidence

What this proves: at 100% and 200% text, at 1024×640, 1366×768 and 1280×720, a keyboard-only player
sees dialogue pages that break at sentence ends (or at a clause break inside a sentence too long for
2 lines), kets drawn as |x⟩, a Caption style select in the UI's display face with a visible focus
ring, no Subtitles on/off control, and a HUD whose top row never wraps and which stays on screen.

Reproduce (from the worktree root, any static server on your port):
    python3 -m http.server 8801 --bind 127.0.0.1 &
    node evidence/story-ui/harness/drive.mjs 8801 evidence/story-ui/shell-polish/1024x640 1024x640   # 46 checks
    node evidence/story-ui/harness/drive.mjs 8801 evidence/story-ui/shell-polish/1366x768 1366x768
    node evidence/story-ui/harness/drive.mjs 8801 evidence/story-ui/shell-polish/1280x720 1280x720
    node evidence/story-ui/story-data/check.mjs

Provenance: every screenshot's yellow badge is the SHA-256 (first 12 hex) of
`cat echo/main.css echo/ui/accessibility.js echo/ui/hud.js echo/ui/dialogue.js echo/ui/menu.js echo/data/story.js | shasum -a 256`,
fetched by the harness from the served bytes (`no-store`). Final runs: bd186c0796f7.

Files: `<viewport>.txt` driver stdout · `<viewport>/drive-result.json` keys pressed and every check ·
`<viewport>/script-pages-200.txt` every spoken beat in story.js as paged at 200% ·
`sabotage.txt` the sabotage round (disposable copy under /tmp, never this tree) ·
`contract-check.txt`, `qollab-caps.txt`, `story-data-check.txt` tool outputs.

Disclosure: one focus reset by script before the pause→settings sequence (inherited from ui-shell);
everything else is real key presses. The script walk presses Enter to skip a reveal only while one
is running (it reads the page's screen-reader copy to steer, never to grade).
