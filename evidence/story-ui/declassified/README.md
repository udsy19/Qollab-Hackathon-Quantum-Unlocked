# Declassified mode: evidence

Module under test: `echo/ui/declassified.js` (`mountDeclassified(root, { menu, onEvent })` →
`{ open(runRecord), close(), isOpen() }`), the `/* ==== declassified ==== */` section of
`echo/main.css`, `displayKets` in `echo/ui/accessibility.js`, and the copy in `echo/data/teachback.js`
(`DECLASSIFIED`, `TEACHBACK`, `CREDITS`, `RUN_JOURNAL`, `DECLASSIFIED_UI`).

Harness: `evidence/story-ui/harness/declassified.html` (fork of `shell.html`: different module under
test and provenance file list). The driver serves the repo itself on **port 8771** and waits up to 3
minutes if another process holds the port.

| file | what |
|---|---|
| `drive.mjs` | the gate: 61 real-key checks. `node evidence/story-ui/declassified/drive.mjs` → exit 0 green · 1 red · 2 refused |
| `01-red-on-skeleton.txt` | the gate written first, run against a skeleton module: 51 of 59 red (control passed) |
| `02-green.txt` | final run, 61/61, provenance `e6fa20da62c9` |
| `sabotage.mjs` → `03-sabotage.md` | 17 mutations on disposable copies: 14 red, 3 predicted nulls |
| `accesslint.mjs` → `04-accesslint.txt`, `accesslint.json` | @accesslint/core 0.21.0 on every tab at 100% and 200%: 0 violations inside the dialog; positive control (planted unnamed button) flagged |
| `*.png` | renders, each with the provenance badge (sha256 of the 5 files under test, first 12 hex) |

Recompute the badge: `cat echo/main.css echo/ui/accessibility.js echo/ui/menu.js echo/ui/declassified.js echo/data/teachback.js | shasum -a 256 | cut -c1-12`.

The run records are samples defined in the harness (`SAMPLE`: §10.3/§10.4 reference values and the
CONTRACTS.md worked dry run; `SPARSE`: holes and one invalid result; `BRANCHES`: one correct dry run
per bit pair). Every sample result passes `validateExperimentResult`. No backend job is in any sample,
so the backend line reads "not recorded".
