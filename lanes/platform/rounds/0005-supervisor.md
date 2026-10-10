=== PLAN ===
**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`) that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`. Alongside it: a local Qollab-like runner in `tools/` and `echo/QOLLAB_SMOKE_TEST.md`. After that, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** Sat about 00:05. G1 Sat 04:00 · G2 Sat 17:00 (else the one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- `shared-contracts` (consult 2), `echo-caps-gate` (consult 3), `g0-runner-smoke` (consult 4).
- **`contracts-v2`, judged in consult 5. MERGE + LAND (main may carry the contract files early, per the overseer's clarification).** What I checked:
  - I re-ran `check.mjs` on a temp `git archive` extract: GREEN, 1087/1087.
  - `git merge-tree` is clean.
  - `main...contracts-v2` touches only `echo/contracts.js` and `echo/CONTRACTS.md` inside `echo/`. The rest is tools and vault.
  - Screenshot 04: m0 and m1 are shown first; all four X/Z choices score F = 0.177 / 1.0 / 0.149 / 0.674 and only the correct one PASSes; a forged success is refused; a correction sent before the bits is impossible.
  - **My own sabotage:** `FIDELITY_PASS` 0.999999 → 0.9 on a copy stays **GREEN**. The worker declared this as null #2. The ruled value lives in the contract, and no gate pins it. This is the same class of null red-team found in gameplay. → `contracts-pin-thresholds`.
- **G0 on real Qollab (overseer run, built-in sim):** steps 1–5 PASS (scene, bridge JSON exact, backend `basic_simulator`). Steps 6–7 are **NOT CONFIRMED**: the Verify click produced nothing. Either automation input cannot reach the sandboxed cross-origin iframe, or handlers do not reach the page. This also decides whether the game gets keyboard and mouse at all. → `g0-input-diagnostic`.

**In flight:**
- `integration-shell`: the assembler is done (checkpoint 1, RED on the `main.css` conflict and the platform-owned `quantum/smoke.py`, as predicted). Now building the real `main.js`/`index.html`. It must import contracts v2 from integration after this merge.
- `g0-input-diagnostic` (new): build `g0-smoke-2026-10-10c`.
  - Always-visible input counters (pointerdown/keydown/click on `document`, time since `Done.`, focus state).
  - The one backend job auto-sends after a visible, cancellable countdown.
  - Answer from the runtime internals whether the preview iframe allows pointer lock and keyboard focus.
  - Lives in its own module, so it does not collide with the shell's `main.js`.
- `contracts-pin-thresholds` (new, small): pin the owner-ruled constant values in the gate (`FIDELITY_PASS`, shots 256, the test state, the m1 label, `BIT_LABELS`), so changing them goes red.

**Relay (overseer → lanes), the contracts-v2 migration table in `reports/0003-contracts-v2.md`:**
- Quantum: `bell_verification` → `backend_verification` (hard reject today); entry points `{theta, phi}` phase 1 and phase 2.
- Gameplay: `marginalProbabilities` / `dryRunVerdict`; delete its local `expectedCorrections`/`FIDELITY_OK`.
- Story-ui: `captionStyle`, `QUALITY_LEVELS`, `BIT_LABELS`, two-phase terminal.

**Next:**
1. The overseer re-runs G0 with build `10c` (counters + auto-send). That closes steps 6–7 or names the input cause.
2. Merge `integration-shell` on runner screenshots; after that, assemble + caps + contract check after every lane landing.
3. Cross-lane check: red-team's `cross_lane_check` must pass before any integrated product code lands on main.
4. First playthrough once gameplay has a controller and scene. Then the README/project page, the video script, and 3 consecutive full runs (row 8).

**Risks:**
- **Iframe input on Qollab.** If keyboard or pointer lock is blocked, the controls design must change (click-to-focus, no pointer lock, drag-to-orbit). This is the top risk to G2.
- Contract churn while lanes migrate. Contracts are now on main, so lanes build against one shape.
- The unexplained merge-of-main commit c6073be on a worker branch: content is main-only and harmless. Watch for repeats.
- `echo/tests/` counts toward the 100-file cap. The puppeteer dependency is borrowed from a global MCP install.
=== END PLAN ===

=== MERGE branch=lane/platform/contracts-v2 ===

=== LAND branch=lane/platform/contracts-v2 ===

=== AGENT name=g0-input-diagnostic model=opus base=lane/platform/integration ===
**GOAL:** The next Qollab G0 run gives a definite answer to two questions: does the one selected-backend job run on Qollab, and does mouse and keyboard input reach our page inside Qollab's preview iframe? The overseer must be able to read both answers off one screenshot, even if their Chrome automation cannot click into the iframe.

**VISION:** ECHO is a third-person game. If keys and pointer don't reach the page on Qollab, there is no game. The vision's acceptance bar (§1.4, §17) is a blind tester finishing on Qollab. G0 (`ROADMAP_48_HOURS.md` Gate 0) is the platform proof everything rests on.

**WHAT WE ARE BUILDING:** Build `g0-smoke-2026-10-10c` of the G0 smoke `echo/`, which already exists on `lane/platform/integration`: `main.js`, `index.html`, `quantum/smoke.py`, the guarded `backend.run` at `main.js:114`. Add:
1. **Input diagnostic.** A new module `echo/diag.js` (platform-owned). Keep it in its own module so `integration-shell`, which is rewriting `main.js` in parallel, can import it with one line. It shows an always-visible panel:
   - counters for `pointerdown`, `keydown` and `click` received on `document`, in the capture phase;
   - the last key name;
   - `document.hasFocus()`;
   - `document.pointerLockElement` support;
   - seconds since the bridge printed `Done.` (or since the bridge result).
   - It exports `mount(root)` and `unmount()`.
2. **Auto-send diagnostic.** About 5 s after the bridge result, a visible countdown sends the ONE backend job automatically, through the SAME guard as the button, so there is still exactly one `backend.run` call site and at most one job. A visible Cancel button stops it. If the button is pressed first, the countdown stops and the guard refuses any second send.
3. **The runtime facts.** From `vault/Research/qollab-js-runtime-internals.md` and Qollab's shipped runtime JS (fetch it the way g0-runner-smoke did; read-only, no sign-in), answer: what `sandbox`/`allow` attributes does the preview iframe carry? Is `allow-pointer-lock` present? Is the iframe cross-origin? Does focus start inside it? Make the local runner's iframe match exactly what you find, and cite the line.
4. Update `echo/QOLLAB_SMOKE_TEST.md` steps 6–7: what the counters should read after a click and a keypress, what the auto-send shows, and what each outcome means (input blocked vs handlers dead vs all good).

**WHAT HAS NOT WORKED:** The overseer's Qollab run on 2026-10-10 (owner-answers § "G0 on real Qollab"; evidence `evidence/qollab/g0-builtin-verify-no-response-2026-10-10.jpg` on main):
- Steps 1–5 passed.
- Pressing Verify produced nothing, not even the synchronous "Sending 1 job…" status, over three attempts.
- The cause is unknown: either automation input does not reach the cross-origin sandboxed iframe, or the handlers are dead after `Done.`.

Do not guess which. Build the instrument that tells them apart.

**Vault and docs to read:**
- `vault/AGENTS.md`
- `vault/Research/qollab-platform-and-submission.md`
- `vault/Research/qollab-js-runtime-internals.md`
- `vault/Reports/g0-runner-smoke.md`
- `tools/qollab-runner/README.md`
- `QOLLAB_DEPLOYMENT.md`
- `.claude/rules/qollab-runtime.md`
- lane `owner-answers.md`

**Constraints:**
- The CJS transform: no top-level `import.meta`.
- No storage, POST or WebSocket.
- `node tools/qollab-caps/check.mjs --root echo` must stay GREEN, with exactly one `backend.run` site.
- Serve the runner on your own port, 4900–4909.

**Deliver:** branch `lane/platform/g0-input-diagnostic` with:
- runner screenshots:
  - (a) the counters at 0 on load;
  - (b) the counters after a real puppeteer click and keypress inside the iframe;
  - (c) the auto-send completed: one job, 256 shots;
  - (d) Cancel pressed, then no job;
  - (e) the button pressed during the countdown, then exactly 1 job.
- `check.cjs` extended to cover these.
- A sabotage round on a disposable copy:
  - remove the guard on the auto-send path → red;
  - make the counters listen in the bubble phase with `stopPropagation` in the page → state whether it is caught;
  - make the countdown call `backend.run` directly → red.
- The served build token must read `10c` from the served bytes.

**How I will judge it:** screenshots from the runner with the build token visible; my own caps run on your tree; the iframe attributes cited from Qollab's runtime source, not inferred.

**Report:** `lanes/platform/reports/0005-g0-input-diagnostic.md`.
- Open with a Vault check, then TL;DR.
- Include a checkpoint within 1 h.
- Name the nulls.
- Write durable runtime findings back to `vault/Research/qollab-js-runtime-internals.md`.
- Put choices only the owner can make under `## Questions for the owner`.
=== END AGENT ===

=== AGENT name=contracts-pin-thresholds model=sonnet base=lane/platform/integration ===
**GOAL:** If anyone changes an owner-ruled constant in `echo/contracts.js`, the contract gate goes red. Today it does not.

**VISION:** Truthful physics (vision §7.4: ideal fidelity threshold; §2.4). The owner's rulings are fixed values. A gate that cannot see a loosened threshold lets a "PASS" on a wrong teleport reach the judge.

**WHAT WE ARE BUILDING:** Pin checks in `tools/contract-check/check.mjs` (platform-owned). Do not change `contracts.js` values. Each pin's expected value is derived from the owner ruling text, not read back from `contracts.js`, and cites its ruling:
- `FIDELITY_PASS === 0.999999`: owner-answers § red-team physics-code-audit, "≥0.999999";
- backend job shots `256`: § 13 lane design questions #9;
- `TELEPORT_TEST_STATE` = ry(1.137) then rz(0.44): § red-team physics ambiguities #3;
- the m1 label "LOCAL BELL-HALF READOUT m1" in `BIT_LABELS`: same section, #1;
- the backend experiment id `backend_verification`;
- the correction rule X iff m1=1, Z iff m0=1, on all four branches.

**WHAT HAS NOT WORKED:**
- I set `FIDELITY_PASS` to 0.9 on a copy; `check.mjs --contracts <copy>` stayed **GREEN 1087/1087**. The contracts-v2 report declares this as null #2: the verdict's two guards are redundant, so loosening one is invisible.
- Red-team found the same class in gameplay: changing FIDELITY_OK from 0.999999 to 0.9 left the tests green.

**Read:**
- `vault/AGENTS.md`
- `vault/Reports/contracts-v2.md`
- `lanes/platform/reports/0003-contracts-v2.md` § sabotage nulls
- `tools/contract-check/sabotage.py`
- lane `owner-answers.md`

**Deliver:** branch `lane/platform/contracts-pin-thresholds`.
- Write each pin first and show it red against a mutated copy, then green on the real file.
- Add each mutation to `sabotage.py`, so its null count drops.
- Report the remaining nulls by name.
- Use `--contracts <copy>` only. Never mutate `echo/contracts.js`.

**How I will judge:** I will re-run your mutations and one of my own.

**Report:** `lanes/platform/reports/0006-contracts-pin-thresholds.md`. Open with a Vault check, then TL;DR, then commands with exit codes. Update `vault/Reports/contracts-v2.md` with the closed nulls.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 5: I merged and landed `contracts-v2` on these grounds:
- my own `check.mjs` run on a `git archive` extract: GREEN 1087/1087;
- `merge-tree` clean;
- `main...branch` touches only `echo/contracts.js` and `CONTRACTS.md` inside `echo/`;
- screenshot 04 shows the two-phase dry run on Qiskit 2.5.2 data.

My own sabotage found an undeclared-by-me null: `FIDELITY_PASS` 0.999999 → 0.9 stays GREEN. The worker had declared it as "verdict threshold loosened".

Lesson: a declared null on an owner-ruled VALUE is not acceptable. Redundant guards hide a loosened constant. The gate must pin ruled constants to the ruling text. Dispatched `contracts-pin-thresholds`.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 5: The overseer's first real Qollab G0 run (built-in sim) passed scene + bridge. Verify-click got NO response at all, so input delivery into Qollab's sandboxed cross-origin preview iframe is unproven.

This is the top G2 risk: the game needs keyboard, mouse and possibly pointer lock. Every future G0 or integration build must carry an on-page input diagnostic and must not depend on a click to prove the backend job (auto-send countdown through the same guard).

Controls design waits on the iframe `sandbox`/`allow` facts cited from Qollab's runtime source. Do not assume pointer lock is available.
=== END LEARN ===
