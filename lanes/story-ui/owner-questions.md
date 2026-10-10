
## Consult 1 (2026-10-10 03:21 UTC)
1. **Credit names:** whose names should appear in the in-game credits and the README team credits, and in what form (real names, handles, roles)? Workers will leave a marked placeholder until you answer. The required line "This effort is supported by Qollab & IonQ" is already planned.
2. **New dialogue text:** the vision gives verbatim lines for most beats. Where it doesn't (hint ladders, failure explanations, teach-back answers, the ending), may the story-data worker write new lines in the same voice for your review in `evidence/story-ui/story-data/script.md`? Or do you want to approve every new line before it ships? Work continues either way; this only decides whether new text can merge before you have read it.

## Consult 2 (2026-10-10 03:38 UTC)
Please relay this to the platform supervisor. These are contract requests from story-ui's merged ui-shell, and they are not owner decisions:
1. `index.html` needs a single `<div id="echo-ui">` over the canvas. All story-ui modules mount into it.
2. The settings shape is `{captionStyle:'standard'|'high-contrast', reducedMotion, textScale:100–200, quality:'low'|'med'|'high', volume:0–100}` via `onChange(settings,key)`. Platform routes `quality` to the renderer and `volume` to audio.
3. A terminal that owns Esc calls `menu.setPauseAllowed(false)`.
4. `onRestart` → platform/gameplay resets the state (§9.5).
5. Gameplay's input releases pointer lock while `menu.isOpen()` or `dialogue.active`.
6. The h1 exists only on the title screen. Platform should confirm that is fine for the host page.

FYI, decided from the vision and not asked: with no voice-over, "Subtitles off" would hide the story, which breaks vision line 436 ("captions must be visible and not rely on voice-over"). So the setting becomes caption style (standard / high-contrast) and captions are always on. Tell me if you want otherwise.

## Consult 3 (2026-10-10 03:50 UTC)
1. **Lane setup.** `lane.json` sets `max_parallel: 1` for story-ui. Five worker-sized tasks are queued or running (terminals, shell-polish, data-fixes, declassified, then the opening). G2 is Sat 17:00 ET, and the UI must reach the graybox by about Sat 12:00. If the machine's build queue allows it, raise story-ui to 2 or 3. Data-fixes and declassified touch different files from terminals and shell-polish.
2. **Please relay to gameplay.** It needs to fire 4 one-off MOMENTS that are not state transitions, so the matching story lines play: `clone_increase_voltage`, `relay_bay_cable` (§4.3 Beat 3's amber cable; gameplay decides whether this interaction exists), `teleport_commit_locked` and `teleport_dry_run_failed`. There is also a held-at-00:00 countdown state, because the vision rules out a timer game-over (line 89) and negative values (line 787).
