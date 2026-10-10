# 0006 gameplay-world-v2-port — FINAL

## TL;DR
- **Done, local runner.** One branch now has the 3D world and the migrated quest core, on contracts v2 **including main@47a2466 (contracts land 2)**. Tip `abd0a1a`.
  - Every quest step goes through `echo/contracts.js`: TRANSITIONS, `EVENT_SOURCES` (enforced by `send(event, via)`), `QUEST_STATE_CHANGED`, the `WORLD_CHANGES` ids, `OPEN/CLOSE_TERMINAL`, `RESET_STATE`, `INTERACTABLE_BINDINGS`, and `dryRunVerdict` for the two-phase dry run.
  - `git grep -nE "quest:enter|quest:transition|BOOTED" -- echo dev` returns nothing (exit 1).
- **Playthrough:** `node dev/gameplay/world-playthrough.mjs --port 8647 --falsify --publish` → **92/92, exit 0**, with real keyboard and mouse.
  - Two full runs: title → 3 missions → a **visibly wrong dry run** (Qiskit F=0.69 on a random generic state) → correct dry run → commit → city lit → ending → RESTART → title.
  - Run 2 ends credits → restart.
  - Build token `v2p-0006-b` (changed for the final run) was read from disk and then from the served page; they matched.
- **Sabotage:** each one turned its check red, and each ran after an unbroken control run on its own disposable copy: collider off; a renamed WORLD_CHANGES id; the reset handler removed; the EVENT_SOURCES gate removed.
- **Gates:** unit tests 55/55 (exit 0) · contract-check 1264/1264 (exit 0) · qollab-caps **exit 1**, only because platform's `echo/index.html`/`main.js` are missing from this branch (details below).
- **Major change:** contracts v2 refuses `documented_preview` for Mission 2 and the dry run, so I deleted the JS fake. In its place, `dev/gameplay/dev_engine.py` runs real Qiskit 2.5.2 in local CPython; it is dev only.
- **Main moved mid-task**, so I merged it again (clean). The commit is now judged by contracts' `validateCommitResult`, and the local `STORY_TOKEN_ID` copy is deleted.
- **Evidence:** `evidence/gameplay/world-v2-port/` (README lists each command and its exit code) and `renders/gameplay-world-v2-port/` (12 PNGs). Recommendation: **merge into `lane/gameplay/integration` now.**

## Vault check
- **Read:**
  - `vault/AGENTS.md` (delivered by the hook), `vault/Index.md` (the 2026-10-10 lesson: "green on a fake adapter hid a total integration break" → I moved to real Qiskit output);
  - `echo/CONTRACTS.md` + `echo/contracts.js` (v2), `lanes/gameplay/{context,rulings,plan}.md`;
  - reports 0001 (world-controller) and 0003 (contracts migration);
  - `vault/Reports/world-controller-contract.md`, `vault/Reports/quest-state-machine-contract.md`;
  - `tools/contract-check/teleport_oracle.py`, and quantum's `bridge.js` on `lane/quantum/integration`.
- **Reused:**
  - platform's `teleport_oracle.py` for both dry-run phases (imported, not copied);
  - contracts' `dryRunVerdict`, `expectedCorrections`, `FIDELITY_PASS`, `randomGenericState`, `makeCorrectionRequest`, `validateTeleportBitsResult` and `BIT_LABELS`. I deleted the local copies: missionRules' `expectedCorrections`/`FIDELITY_OK`, and the fake's `randomGenericState`/`GENERIC_AXIS_BOUND`.
- **Stale, now marked `status: outdated` with a reason:**
  - `vault/Reports/quest-state-machine-contract.md` (the `quest:transition`/`BOOTED` API);
  - `vault/Reports/world-controller-contract.md` (its bus section; the controls and collision sections still hold).
- **Written:** `vault/Reports/world-v2-port.md`. I did not regenerate the hubs, per the worker rules: `vault-hubs.mjs --check` reports Reports/README.md and Map.md as STALE, which is expected.

## What I found
1. **The merges were clean.** I merged `lane/gameplay/integration` (c49a922) with no conflicts, then `main` (99dfc54), where only the generated hubs conflicted (I took main's). After the merge, 3 tests were red, all caused by v2:
   - the spec ground truth lacked the v2 owner edges `DECLASSIFIED -CLOSE_SCIENCE→ ENDING` and `ENDING -RESTART→ TITLE` (owner 13 questions #1, #12). I added them to `ACCEPTED_ADDITIONS` with the citation; contracts was not read.
   - v2 refuses `documented_preview` for `bell_signalling`, and the dry-run validators require `exact_qiskit_local`. A JS statevector fake cannot honestly carry that label, so the dev engine became real Qiskit.
2. **RESTART semantics.** The old world reset on "any transition into TITLE". In v2, RESTART is only ENDING→TITLE, and CREDITS is terminal. `send('RESTART')` now runs as a new session (epoch++, commit latch re-armed), exactly like `resetGame()`. I wrote that test first and watched it fail.
3. **A test passed for the wrong reason.** F4 in `state.test.mjs` used `correctionX/Z` keys, and it still passed after the rename to `applyX/applyZ`, because a missing key also mismatches the rule. It is now a real wrong-X result.
4. **Dev-terminal mouse clicks were flaky.** In one run a mouse click at a terminal button's box did nothing once the panel re-centred. Terminal buttons are now clicked with `element.click()` (untrusted), and a click that changes nothing fails loudly. Movement, E, Esc and the menus are still real keyboard and mouse input.

## What I changed (commits on `lane/gameplay/gameplay-world-v2-port`)
- `2c463fd`, `6c0f721`: the merges of integration and main.
- `afcaf17`:
  - `missionRules`: the dry run uses `dryRunVerdict(request, result)`; the commit rule reads `applyX/applyZ` with contracts' `expectedCorrections`.
  - `state.js`: `send/can(event, via)` refuses any via other than `EVENT_SOURCES[event].via`; RESTART is a new session; `experiment(run, request)`.
  - The JS fake and its test are deleted. Added `dev_engine.py`, `devEngine.js`, `tests/devEngineServer.mjs` and `tests/devEngine.test.mjs`. `missionRules.test` now runs on the dev engine.
- `8a4f7d4`:
  - `app.js`/`interactions.js` use `BUS_EVENTS` (`QUEST_STATE_CHANGED`, `OPEN_TERMINAL {id}`, `CLOSE_TERMINAL`). World triggers send via `world_trigger`, and E sends via `interactable`. `quest.send('BOOTED')` is gone: platform sends `BOOT_COMPLETE`.
  - `district.js` derives `activeChanges(state)` from `WORLD_CHANGES`. Doors use `openOn: '<id>'`, and every scene id goes through `changeId()`, which throws on an unknown id.
  - Anchors take `action` from `INTERACTABLE_BINDINGS`.
  - The dev terminal does the two-phase dry run: bits are shown first with `BIT_LABELS`, then all four choices are offered, with a fresh state on each attempt.
  - `world.html` and `world-playthrough.mjs` were rewritten.
- `5e…` / `b571113`:
  - the flat harness (`harness.html`, `playthrough.mjs`) is ported to the dev engine; its run exits 0;
  - the harness panel now fits the viewport;
  - evidence, the vault note, and the outdated marks.

## Evidence (all on the local runner: headless Chrome on an M4 Pro, nothing on Qollab)
| what | command | exit | path |
|---|---|---|---|
| 3D playthrough + sabotage | `node dev/gameplay/world-playthrough.mjs /tmp/v2p-final3 --port 8647 --falsify --publish` (tip with main merged, build v2p-0006-b) | 0 (92/92) | `evidence/gameplay/world-v2-port/playthrough.log`, `results.json`, `01–16*.png`, `walk.mp4` |
| unit tests | `node --test 'dev/gameplay/tests/*.test.mjs'` | 0 (55/55) | `…/unit-tests.txt` |
| contract check | `node tools/contract-check/check.mjs` | 0 (1264/1264) | `…/contract-check.txt` |
| Qollab caps | `node tools/qollab-caps/check.mjs` | **1**: only `entry-index`/`entry-main` (platform's files are absent from this branch) | `…/qollab-caps.txt` |
| caps with platform's entry files | `--root` a copy of this `echo/` + `lane/platform/integration`'s `index.html`/`main.js` | 1: all 6 reds are `main.js` imports of `ui/*.js` and `quantum.*`; **0 in gameplay files** | `…/qollab-caps-with-platform-entry.txt` |
| flat quest harness | `node dev/gameplay/playthrough.mjs 8649 /tmp/v2p-flat` | 0 | `…/flat-harness/playthrough.log` |

**Key PNGs** (`renders/gameplay-world-v2-port/`):
- 01 title;
- 03 booth prompt;
- 04 booth result panel;
- 05 door A open (`corridor_door_opens`);
- 06 conduit lit;
- 07 receiver panel 1/2, 1/2;
- 08 fiber to the skyline;
- **09 bits on screen before the choice, all four choices offered**;
- **10 wrong dry run visibly failing**;
- 13 city lit;
- 14 ending;
- 15 RESTART → title.

## Sabotage, including the nulls
Each check ran first on an unbroken disposable copy (the control, which must pass), then on the sabotaged copy (which must fail).

| sabotage | check | result |
|---|---|---|
| pylon collider off (in page) | no prompt behind the pylon | flipped (prompt appears) |
| door A collider off (in page) | door blocks | flipped (z −28.47) |
| `corridor_door_opens`→`corridor_door_open` in `alley.js` | door A opens after CLONE_UNDERSTOOD | red: the world refuses to boot (`unknown WORLD_CHANGES id`) |
| `if (to === RESET_STATE) { resetWorld(); return; }` removed | Pause → Restart puts the player at spawn | red (z −0.88) |
| `if (via !== src.via) return` disabled | EXIT_BOOTH from a terminal is refused | red (accepted → RELAY_UNLOCKED) |

- **Null 1.** The rename goes red at BOOT through `changeId`, not at the door. A rename that bypassed `changeId` (comparing a bare string) would only show up as a door that never opens. I did not sabotage that variant.
- **Null 2.** `via` is self-declared by the caller. The gate catches wiring drift, not a caller that lies; this is within the rule's scope (regression, not malice).

## What I did NOT do or could not verify
- **Nothing ran on Qollab or IonQ.** All of this is local runner.
- **≥30 FPS is not claimed.** The headless readout of 20–26 FPS is pacing, not a measurement.
- Real pointer lock with a human mouse is unverified.
- The 3D harness used `three` from jsdelivr, not Qollab's injected copy.
- The dev engine is CPython Qiskit, not Pyodide. Quantum's `bridge.js` still uses pre-v2 dry-run names (`calibrationMeasurement(stateId)`, `teleportDryRun(stateId, X, Z, bits)`). It is not wired in here; that swap is for the seam work.
- I did not touch `echo/contracts.js`, `main.js`, `ui/` or `data/`.

## Decisions inferred from the docs
- **Dev engine = real Qiskit in CPython rather than a relabelled JS fake.** CONTRACTS.md § Engine rules; CLAUDE.md "do not silently conflate"; the vault Index lesson about fake adapters.
- **Spec ground truth gains CLOSE_SCIENCE and ENDING RESTART.** Owner 13 questions #1 and #12, as cited in CONTRACTS.md § Additions.
- **RESTART bumps the session.** CONTRACTS.md § Restart ("both restarts run resetGame()"), §9.5.
- **The credits restart is `resetGame()`.** In v2, CREDITS is terminal.
- **The commit result is `parameters {stateId: STORY_TOKEN_ID, applyX, applyZ}`, judged by contracts' `validateCommitResult`.** That function is from contracts land 2, now merged.
- **World changes are derived as a union up to the current state.** §9.3 idempotence and §9.5 reset.
- **The terminal guide arrow (`objective_target_glows`) hides once RELAY_INTRO is reached.** This is guidance, not a §9.3 consequence.

## Requests
- **Platform:**
  - `main.js` must call `game.quest.send('BOOT_COMPLETE', 'boot')` once Pyodide and the scene are ready (startGame no longer does it).
  - The restart hook: `UI_HOOKS.onRestart` → `game.reset()`. ENDING's button → `quest.send('RESTART', 'menu')`.
  - `ui:prompt`, `ui:pause` and `perf:fps` are gameplay-only bus names; consider adding them to `BUS_EVENTS` if story-ui consumes them.
- **Story-ui:**
  - Call `quest.send(event, via)` with the via from `EVENT_SOURCES`: `'menu'` for START/OPEN_*/RESTART, `'dialogue'` for FINISHED/SKIP, `'terminal_acknowledgement'` for EXPLANATION_READ/VIEW_RECEIVER_MARGINAL, after `quest.resultPanelShown()`.
  - The dry-run UI must take the bits from `quantum.teleportBits({theta, phi})` (fresh `randomGenericState()`), then build phase 2 with `makeCorrectionRequest`, then call `quest.experiment(() => engine.teleportCorrection(req), req)`.
- **Quantum:** expose the v2 dry-run shapes in `bridge.js`: phase 1 takes `{theta, phi}` and returns the bits; phase 2 takes `{theta, phi, m0, m1, applyX, applyZ}`. The dev engine uses the names `teleportBits` / `teleportCorrection` / `commitStoryToken`.

## Late changes (after the first final)
- `git merge main` (47a2466, contracts land 2) was clean.
  - `missionRules`' commit rule now calls `validateCommitResult` and imports `STORY_TOKEN_ID`; the local copy is deleted.
  - Re-ran everything on the tip: unit tests 55/55, contract-check 1264/1264, playthrough 92/92 with every sabotage red, flat harness exit 0.
- **Defect found in the inherited driver:** `--publish` ran `rmSync` on the whole evidence dir, which wiped the gate logs and README written beside the screenshots. It now replaces only its own png/mp4/json files (`abd0a1a`). The world-controller evidence dir was published the same way.

## What the supervisor should do next
1. **Merge `lane/gameplay/gameplay-world-v2-port` @ `abd0a1a` into `lane/gameplay/integration`.**
   - Re-run in a `/tmp` worktree: `node dev/gameplay/world-playthrough.mjs /tmp/x --port <free 86xx> --falsify` (it starts its own `dev_engine.py`, and the sabotage copies use port+1..+6), then `node --test 'dev/gameplay/tests/*.test.mjs'` and `node tools/contract-check/check.mjs`.
   - Non-gameplay paths in `git diff lane/gameplay/integration...tip` come only from main's own commits. `echo/contracts.js` is identical to main.
2. **Commit-fault-exit** must merge the new integration tip. It touches `playthrough.mjs`, `harness.html` and `state.js`, all of which changed here: `send(event, via)`, the dev engine instead of the fake, and the RESTART semantics.
3. **Real adapter swap:** quantum's `bridge.js` must expose the v2 dry-run shapes. The gameplay seam is `quantum.teleportBits({theta, phi})`, `quantum.teleportCorrection(makeCorrectionRequest(...))` and `quantum.commitStoryToken()`.
4. **Platform `main.js`:** send `BOOT_COMPLETE` via `'boot'`, and wire `UI_HOOKS.onRestart` → `game.reset()`.
