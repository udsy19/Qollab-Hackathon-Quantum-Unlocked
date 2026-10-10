# 0005 g0-input-diagnostic — FINAL (2026-10-10 00:40 ET)

## TL;DR
- DONE on the **local runner** (not Qollab). Branch `lane/platform/g0-input-diagnostic`, commits adae31b, d5a2ffe, 6674bc6. Build token `g0-smoke-2026-10-10c`, read back from the served page (`--expect-build`).
- `echo/diag.js` (`mount`/`unmount`/`markBridgeResult`): capture-phase counters on `document`, last key, `hasFocus()`, origin, a pointer-lock probe (press L), time since the bridge result. A 5 s auto-send countdown goes through the same guard as the button. Caps GREEN, exactly one `backend.run` site (`echo/main.js:119`).
- **Qollab iframe, cited from its shipped code** (`/_nuxt/BWPMdZ7B.js`, class `Ol`): `e.sandbox="allow-scripts"`, nothing else, no `allow`. So it is cross-origin (origin `null`), has **no allow-pointer-lock**, and nothing focuses it. The runner already matched; it now cites the line.
- **New, bigger finding:** when `main.js` returns, Qollab's parent stops listening to the frame (console, Probabilities, credits prompt), and the frame stops proxying IonQ requests. So 10c keeps `main.js` alive until the one job settles. **The game's `main.js` must never return before the ending.**
- Checks: 6 of 6 scenario runs green (28/23/25 checks). Sabotage: 6 controls green, 13 cases caught. Nulls are listed below.
- Recommend: hand 10c to the overseer for the Qollab G0 run with `echo/QOLLAB_SMOKE_TEST.md` steps 5–8. One screenshot after step 7 answers both questions. Tell gameplay and integration-shell: no pointer lock, click to focus, keep `main.js` alive.

## Vault check
- **Read:** `vault/AGENTS.md`, `vault/Index.md` (no input, iframe or diagnostic entries), `vault/Research/qollab-js-runtime-internals.md`, `vault/Reports/g0-runner-smoke.md`, `tools/qollab-runner/README.md`, lane `context.md`, `owner-answers.md` § "G0 on real Qollab".
- **Already known:** the runner used `sandbox=allow-scripts` "per the docs". It was an open question whether Qollab's frame lacked `allow-same-origin`. Also known: the Verify press did nothing on Qollab.
- **Reused:** the runner (server/host/frame), `check.cjs`, `sabotage.sh`, the caps check. `where.mjs markBridgeResult --branches` found nothing.
- **Stale:** the research note's "Open" item on the sandbox is now settled (marked in the note). `QOLLAB_SMOKE_TEST.md` steps 5–8 described 10b; they are rewritten.

## What I found (Qollab runtime, read 2026-10-10 ~00:15 ET, GET only, signed out)
I fetched the SPA entry `/_nuxt/C30t4T_n.js` and the 351 chunks plus CSS it references. sha256: `BWPMdZ7B.js` 522afd37…, `jsworker-C6a5_czr.js` 9c0cf281…

| question | answer | source |
|---|---|---|
| `sandbox` / `allow` | `allow-scripts` only; no `allow` attribute | `BWPMdZ7B.js` `Ol` constructor: `e.sandbox=\`allow-scripts\`` |
| `allow-pointer-lock`? | **No.** Our panel probe: REFUSED under `allow-scripts`, GRANTED with `allow-pointer-lock` added (control) | same, plus `evidence/platform/g0-input-diagnostic/pointer-lock-control/probe-output.txt` |
| cross-origin? | **Yes.** No `allow-same-origin`, so the origin is opaque `null` | sandbox semantics; the runner shows `origin null` |
| focus starts inside? | **No.** No `.focus()` on the iframe or its window anywhere in the 351 chunks. Keys arrive only after a click inside | grep for `focus(` and `contentWindow` |
| input listeners in the runtime? | none (only `message`); loading overlay removed before `main.js` | `jsworker-C6a5_czr.js` |
| what happens at `Done.` | parent `Te` → `De()` aborts the out/err/system/debug/probabilities/circuit/cost-consent/… listeners. The frame clears `W`, so `self.fetch` stops IonQ rewrites and `reportCounts` stops | `BWPMdZ7B.js` `Ee`/`De`/`Te`; `jsworker` `self.fetch`, `finally{W=!1}` |
| placement | `position:absolute`, no z-index, anchored over `.pp-preview-anchor`. Whether something transparent covers it is **not settled by reading**; the diagnostic settles it per run | `entry.Boyg86oZ.css`, `_project_.DmQDnk_I.css` |

The 2026-10-10 symptom (not even the synchronous "Sending…" text) is **not** explained by the `Done.` behaviour, because DOM handlers stay alive. The 10c panel decides it: input blocked, handlers dead, or all good (outcome table in `QOLLAB_SMOKE_TEST.md`).

## What I changed
- `echo/diag.js` (new, platform). Inline-styled panel with `pointer-events:none`, so it cannot swallow the clicks it counts.
- `echo/main.js`: imports diag; build 10c; `verifyOnBackend(trigger)` is the only path to `backend.run`, for both the button and the countdown; countdown with Cancel; `await oneJobDone` keep-alive; status `Done: 1 job (auto|button), …`.
- `echo/index.html`: countdown line and Cancel button (inline styles; I did not touch `main.css`, which story-ui owns).
- `echo/QOLLAB_SMOKE_TEST.md`: steps 5–8 rewritten. Wait for the auto-send (no input needed), then click the scene, press K and L, and press Verify (refused). Includes an outcome table and "Why Done. comes late".
- Runner: `host.js` cites Qollab's iframe line and greys frame events after `done` as `[dropped by Qollab after Done]`. `frame.js`: the IonQ mock refuses a job sent after `main.js` returned (that it fails on Qollab is inferred). `check.cjs` gains `--scenario auto|cancel|button` with checks (a)–(e) and a pointer-lock check; real CDP mouse/key input; missing counts are now a red, not a no-verdict. `sabotage.sh` gains multi-file cases, the caps check per case, and one reused port. README updated.
- Vault: `vault/Research/qollab-js-runtime-internals.md` (new section, open item settled), `vault/Reports/g0-input-diagnostic.md`.

## Evidence
- `evidence/platform/g0-input-diagnostic/` (README with commands and exits): 6 runs × screenshots (a)–(e), logs, results JSON, `caps.log`, `sabotage/`, `pointer-lock-control/`.
- Renders for the supervisor in `renders/g0-input-diagnostic/`, numbered 1–6. The last one is the auto-send job plus a refused press with the counters visible.
- Law 3: the new check run against the old 10b tree gave 9 FAILs, then a no-verdict (exit 2).

## Sabotage round (re-run on the final tree)
CAUGHT:
- guard removed (ionq-mock, builtin);
- guard removed + button does not stop the countdown (2 jobs);
- countdown calls `backend.run` directly (check red, and caps red with 2 sites);
- bubble phase + `stopPropagation` on `#scene-wrap` (pointer counters 0, verdict `KEYS REACH PAGE · NO POINTER counted`);
- no keep-alive (ionq-mock);
- wrong bridge;
- wrong backend circuit;
- no render;
- diag not mounted;
- wrong build token (exit 2).

**Nulls:**
1. The caps check stays green when the guard is removed (static; only the runtime check catches it).
2. Bubble phase alone stays green (declared case; nothing stops propagation).
3. `stopPropagation` on `#scene-wrap` does not hide keys (their target is `body`). Only the pointer counters went red, so I changed the verdict to stop saying "INPUT REACHES PAGE" in that state.

## What I did NOT do or could not verify
- **Nothing ran on Qollab** (workers never drive Qollab). I did not press Run on any Qollab page this session; I only read static JS and CSS.
- Not verified: that an IonQ job after `Done.` actually fails on Qollab (inferred from `self.fetch`), and whether a transparent Qollab element covers the iframe.
- `echo/main.css` is untouched (story-ui owns it), so the countdown and Cancel button are styled inline.
- Did not regenerate vault hubs (loop's job; `vault-hubs --check` shows them stale as expected).

## Decisions inferred from the docs
- **Keep `main.js` alive until the one job settles.** CLAUDE.md requires one honest selected-backend job, and QOLLAB_DEPLOYMENT requires the injected `backend`. A job sent after `Done.` loses Qollab's proxy and console, so the run must still be "running" when the job goes out.
- **Panel styled inline in `diag.js`.** Lane ownership puts `main.css` with story-ui, and the brief asks for one-line import by integration-shell.
- **The input check happens after the auto-send, not inside its 5 s window.** The counters work at any time. A 5 s window is too short for a human or slow automation, and the goal is one screenshot showing both answers.
- **Pointer lock probed on L, released at once.** The game's mouse-look needs this answer (vision §1.4: a tester finishes on Qollab). Probing on a key keeps the panel from grabbing the mouse.

## Questions for the owner
- None. Nothing here needs spend, access or publishing beyond the overseer's existing G0 run on the free built-in simulator.

## What the supervisor should do next
1. Ask the overseer to upload 10c `echo/` to the ECHO draft and run steps 5–8 on the Built-in simulator. One screenshot after step 7 plus the console text answers both G0 questions. If automation clicks count 0, ask for one real mouse click.
2. Tell **integration-shell**: add `import * as diag from './diag.js'; diag.mount(document.body);`, call `diag.markBridgeResult()` after the bridge, and `main.js` must `await` the game's end and never return early.
3. Tell **gameplay** (contract-level, via owner-answers): **no pointer lock on Qollab** (use drag-to-look), and a "click to start" moment so keys reach the frame.
4. Merge `lane/platform/g0-input-diagnostic` into `lane/platform/integration`. Run `bash tools/qollab-runner/sabotage.sh <port> <dir>` yourself if you want an independent re-run (~10 min, one port).
