# Each lane owns its files

From `ROADMAP_48_HOURS.md` § Team parallelization (owner-approved 2026-10-09). A worker edits only its lane's files; anything else is a request in its report.

| lane | owns |
|---|---|
| platform | `echo/main.js`, `echo/index.html`, shared contracts (event names, `ExperimentResult` schema, interactable ids), `echo/README.md`, the local runner under `tools/`, release files |
| quantum | `echo/quantum/` (incl. `bridge.js`), `echo/tests/` (quantum tests) |
| gameplay | `echo/game/` (except `audio.js`), `echo/scene/` (except the art files below) |
| story-ui | `echo/ui/`, `echo/data/`, `echo/main.css` |
| art | `echo/assets/`, `echo/scene/{lighting,rain,props,buildings,effects}.js`, `echo/game/audio.js` |
| red-team | no product files; reports only |

A shared contract changes only through the platform lane, and every lane is told in its `owner-answers.md`.
