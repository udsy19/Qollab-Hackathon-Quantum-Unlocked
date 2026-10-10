# evidence/gameplay/world-v2-port — written by agent gameplay-world-v2-port (lane gameplay, consult 6)

Branch `lane/gameplay/gameplay-world-v2-port`. Everything here ran on the LOCAL RUNNER (headless Chrome on
an M4 Pro, port 8647, server `dev/gameplay/dev_engine.py`); nothing ran on Qollab or IonQ.

| file | command | exit |
|---|---|---|
| `playthrough.log`, `results.json`, `01–16*.png`, `walk.mp4` | `node dev/gameplay/world-playthrough.mjs /tmp/v2p-final3 --port 8647 --falsify --publish` | 0 (92/92) |
| `unit-tests.txt` | `node --test 'dev/gameplay/tests/*.test.mjs'` | 0 (55/55) |
| `contract-check.txt` | `node tools/contract-check/check.mjs` | 0 (1264/1264) |
| `qollab-caps.txt` | `node tools/qollab-caps/check.mjs` | 1 — only `entry-index`/`entry-main`: platform's `echo/index.html`/`main.js` are not on this branch |
| `qollab-caps-with-platform-entry.txt` | same, `--root` a disposable copy of this `echo/` + platform-integration's `index.html`/`main.js` | 1 — all 6 reds are imports in platform's `main.js` of story-ui/quantum files; zero in gameplay files |
| `flat-harness/playthrough.log` | `node dev/gameplay/playthrough.mjs 8649 /tmp/v2p-flat` (server `dev_engine.py 8649`) | 0 |

Quantum numbers come from the dev engine: Qiskit 2.5.2 in local CPython (`exact_qiskit_local` is true:
exact, Qiskit, local), NOT the game's Pyodide bridge. The FPS in the readout is headless pacing, not a
laptop measurement.
