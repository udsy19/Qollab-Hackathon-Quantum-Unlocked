# story-ui / ui-shell evidence

All screenshots come from `evidence/story-ui/harness/shell.html`, served by `python3 -m http.server 8742` from the repo root, and are driven by `evidence/story-ui/harness/drive.mjs`. The driver uses puppeteer 23.11.1 with system Chrome at 1280×720 and sends real CDP key events, so Tab really moves focus. It is not running on Qollab: this is a local harness, and there is no canvas yet.

**Provenance.** The yellow badge, bottom right, shows `ui-shell r3 · sha256 43726d2831e7`. That is a SHA-256 of the exact bytes the browser fetched, for `echo/main.css`, `echo/ui/accessibility.js`, `echo/ui/hud.js`, `echo/ui/dialogue.js` and `echo/ui/menu.js`, concatenated in that order. To re-derive it: `cat echo/main.css echo/ui/accessibility.js echo/ui/hud.js echo/ui/dialogue.js echo/ui/menu.js | shasum -a 256 | cut -c1-12` gives `43726d2831e7` on the commit that adds this README.

**Command.** `node evidence/story-ui/harness/drive.mjs 8742 evidence/story-ui/ui-shell` → exit 0, `30 checks, 0 failed`. The full check list, the key log and the provenance are in `drive-result.json`.

| # | file | shows |
|---|---|---|
| 1 | `01-title-focus.png` | Title screen. Start has focus on load, with a 3px #ffe14d ring and a ▸ glyph. |
| 2 | `02-hud.png` | HUD in the §6.3 layout: `ECHO // DISTRICT 09 / OBJECTIVE 02 / RESTORE THE ENTANGLEMENT RELAY`, `GRID SHUTDOWN 08:42`, `◆ Q-SOURCE: PRESERVED`, `[E] INTERACT`, plus a first-context tooltip. |
| 3 | `03-dialogue-long-page1.png`, `03b-dialogue-long-page2.png` | A 2-line beat. A 50-word line is split into pages 1/2 and 2/2, each ≤2 lines. |
| 4 | `04-pause.png`, `05-settings-200.png` | Pause (Esc) and settings, reached by keyboard only. |
| 5 | `06-hud-dialogue-200.png`, `05-settings-200.png`, `08-title-200.png` | HUD and dialogue, settings, and title at 200% text. Nothing leaves the viewport, overflows its box or overlaps. |
| 6 | `07-reduced-motion.png` | Reduced motion on. The readout overlay shows `getComputedStyle().transitionDuration` before (0.2s) and after (0s) for dialogue, prompt, menu, button and HUD, and the prompt pulse animation going from `echo-key-pulse` to `none`. |

**Key sequence for pause and settings (keyboard only).** `Esc` opens pause with Resume focused. `Tab` moves to Settings and `Enter` opens it, with Subtitles focused. `Tab` `Tab` reaches Text size, and `→`×4 sets 200%. `Esc` goes back to pause with Settings focused, and `Esc` again resumes. For reduced motion: `Esc` `Tab` `Enter` (Settings), `Tab` (Reduced motion), `Space`, `Esc` `Esc`. Disclosure: before this sequence, the driver resets focus to Resume once by script, after the Tab-trap probe, so the sequence starts from a known item. Everything else is real key presses.

**Sabotage round** (disposable copies under `/tmp/ui-sab`, port 8743). Each mutation and the driver's exit code:
- dialogue `MAX_LINES = 99`: exit 1. Page ≤2 lines, split into pages, and 200% geometry all fail.
- reduced-motion `transition: none` removed: exit 1. "every UI transition computes to 0s" fails.
- focus outline set to `none`: exit 1. The focus ring check fails.
- `trapTab` disabled: exit 1. Tab wrap and the pause/settings focus checks fail.
- reveal-skip removed from `advance()`: exit 1. The skip check, the pages check and "rejoin to exact text" fail.
- **NULL:** letting the HUD top row wrap again (`flex-wrap: nowrap` removed) left the driver **green** (exit 0). Once the countdown stacks its label over its value, the row no longer wraps at 1280×720. `nowrap` is only load-bearing on narrower viewports, which were not tested.

**accesslint `audit_live`.** Fixed: `aria-dialog-name` (serious). The menu overlay had no name while closed, and now has `aria-label="Menu"` until a screen's heading names it. Remaining (moderate, both harness or page level): `landmarks/region` on the harness's `#provenance` badge, which is harness-only, and `page-has-heading-one` during gameplay. The h1 exists only on the title screen. The host page, meaning platform's `index.html`/Qollab, decides on that.
