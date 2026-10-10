---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: platform (g0-input-diagnostic)
tags:
  - g0
  - qollab
  - input
---

# G0 10c: input diagnostic and guarded auto-send (measured, local runner only)

Build `g0-smoke-2026-10-10c` adds `echo/diag.js` (counters for `pointerdown`/`click`/`keydown` on
`document` in the capture phase, last key, `hasFocus()`, origin, a pointer-lock probe on **L**, seconds
since the bridge result) and a 5 s countdown that sends the one backend job through the same guard as the
Verify button. `main.js` now awaits the job before returning, because of what Qollab does at `Done.`
([[qollab-js-runtime-internals]] § The preview iframe and the end of a run). **Nothing here has run on
Qollab.** Owner steps: `echo/QOLLAB_SMOKE_TEST.md` steps 5–8.

## Measured (commit d5a2ffe, headless Chrome, local runner)

| run (`tools/qollab-runner/check.cjs`) | exit | checks |
|---|---|---|
| builtin auto / cancel / button | 0 / 0 / 0 | 28 / 23 / 25 |
| ionq-mock auto / cancel / button | 0 / 0 / 0 | 28 / 23 / 25 |
| the same check on the old 10b tree (law 3, written first) | 2 | 9 FAIL before a no-verdict timeout |

Counters on load 0/0/0, `hasFocus()` false; after one CDP click on the canvas and one key: 1/1/1,
`hasFocus()` true, origin `null`, pointer lock REFUSED. Control: the same panel in a frame with
`allow-scripts allow-pointer-lock` reads GRANTED.

## Sabotage round (`tools/qollab-runner/sabotage.sh`, disposable copies)

6 controls green; caught (exit 1/2): guard removed (ionq-mock, builtin), guard removed + button no
longer stops the countdown, countdown calls `backend.run` directly (also caps red: 2 sites), bubble-phase
counters + `stopPropagation` on `#scene-wrap`, no keep-alive (ionq-mock), wrong bridge, wrong backend
circuit, no render, diag not mounted, wrong build token.

**Nulls:** the static caps check cannot see a removed guard (exit 0 in all three guard cases; only the
runtime check catches them). Bubble-phase counters alone stay green (no page handler stops anything).
`stopPropagation` on `#scene-wrap` does not hide keys (their target is `body`), so only the pointer
counters caught it; the verdict was then fixed to say `KEYS REACH PAGE · NO POINTER counted`.

Evidence: `evidence/platform/g0-input-diagnostic/` (README lists commands and exits).
