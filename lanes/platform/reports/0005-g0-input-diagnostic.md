# 0005 g0-input-diagnostic — CHECKPOINT 1 (00:25 ET, ~22 min in)

## TL;DR
- PARTIAL. Runtime facts read from Qollab's shipped JS (GET only, signed out, 2026-10-10 00:15 ET), chunk `/_nuxt/BWPMdZ7B.js` sha256 522afd37…, class `Ol`:
  `iframe.sandbox = "allow-scripts"` ONLY, no `allow` attribute → origin is opaque (cross-origin to qollab.xyz), **no allow-pointer-lock**, no allow-modals. Nothing calls `.focus()` on it: focus starts in the parent.
- **Bigger finding:** when `main.js` resolves, the frame posts `Done.`/`done`; the parent (`Te` → `De()`) aborts the listeners for `out`/`err`/`probabilities`, and the frame sets its running flag `W=false`, which turns OFF the IonQ fetch rewrite (`jsworker-C6a5_czr.js` `self.fetch`). So on Qollab, console lines after `Done.` are dropped and an IonQ `backend.run` after `Done.` cannot go through Qollab's proxy. DOM handlers still live.
- Next: echo/diag.js, auto-send, keep `main.js` alive until the one job settles, runner fidelity (iframe attrs + drop console after done), check.cjs, sabotage.

## CHECKPOINT 2 (00:26 ET)
- Commit adae31b: echo/diag.js, auto-send countdown through the one guard, `await oneJobDone` keep-alive; runner iframe cites Qollab's line; host drops frame events after done; IonQ mock refuses a job after main.js returned.
- Local runner (not Qollab): 6/6 scenario runs green (builtin+ionq-mock × auto/cancel/button), 26–27 checks each. Sabotage: 6 controls green, 13 cases caught; nulls: caps check cannot see a removed guard (static); bubble-phase alone is invisible (benign); stopPropagation on #scene-wrap does not stop keydown (target is body).
- Pointer-lock control: same panel, frame `allow-scripts` → REFUSED; `allow-scripts allow-pointer-lock` → GRANTED.
- Next: smoke-test doc steps 6–7, runner README, vault research write-back, final evidence rerun, final report.
