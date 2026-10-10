---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
lane: gameplay
---

# The 3D world on contracts v2: one quest table, WORLD_CHANGES ids, EVENT_SOURCES, the two-phase dry run

Measured on branch `lane/gameplay/gameplay-world-v2-port` (build token `v2p-0006-a`), LOCAL RUNNER only:
`node dev/gameplay/world-playthrough.mjs --port 8647 --falsify --publish` → 92/92, exit 0; unit suite 55/55;
`tools/contract-check` 1087/1087. Evidence: `evidence/gameplay/world-v2-port/` (README lists every command).

## What the branch now is
- Base: world-controller (1a89bfb) + `lane/gameplay/integration` (c49a922, migrated core) + `main` (contracts v2).
  The merges were clean; only the generated hubs conflicted.
- **One table.** `echo/game/state.js` imports TRANSITIONS / EVENT_SOURCES / RESET_STATE / BUS_EVENTS / WORLD_CHANGES
  from `echo/contracts.js`. `git grep -nE "quest:enter|quest:transition|BOOTED" -- echo dev` → nothing (exit 1).
- **`send(event, via)`**: refused unless `via === EVENT_SOURCES[event].via`. Doors are walked through
  (`world_trigger`), E fires `interactable`, panels fire `terminal_acknowledgement`, menus `menu`, the harness
  stands in for platform with `BOOT_COMPLETE` via `boot`. `via` is self-declared by the caller: this catches drift
  (a terminal wired to EXIT_BOOTH), not a malicious caller.
- **RESTART** (ENDING edge) is a new session exactly like `resetGame()`: epoch++, commit latch re-armed.
  CREDITS is terminal in v2, so the credits screen's restart is `resetGame()`.
- **World changes by id.** `district.js` derives the ids in force from the state (`activeChanges`: the union of
  WORLD_CHANGES of every state up to the current one in §9.1 order), so reactions stay idempotent and a reset
  clears them all. Scene files name ids through `changeId()`, which **throws on an unknown id**: a renamed id stops
  the world from booting instead of leaving a door shut forever.
- **Dry run = contracts' `dryRunVerdict(request, result)`.** `missionRules` no longer has its own
  `expectedCorrections`/threshold; `experiment(run, request)` passes the phase-2 request through.

## Finding: v2 makes the JS fake engine impossible to use for Missions 2 and 3
`validateExperimentResult` refuses `documented_preview` for `bell_signalling`, and the dry-run validators require
`exact_qiskit_local`. A JS statevector stand-in cannot honestly carry that label. Replaced by
`dev/gameplay/dev_engine.py`: GET-only, Qiskit 2.5.2 in local CPython, both dry-run phases from platform's
`tools/contract-check/teleport_oracle.py`. Every result says "Dev engine: Qiskit in local CPython". It is dev
only; the game's engine is quantum's Pyodide `bridge.js`.

## Finding: a test passed for the wrong reason
`state.test.mjs` F4 ("a refused commit latches") built its bad result with `correctionX/Z` keys. After the rename
to `applyX/applyZ` it still passed, because a missing key also mismatches the rule. It now uses `applyX:false`
on bits that need X, which is the intended refusal.

## Sabotage (on disposable copies, each with an unbroken control run first)
| sabotage | check | result |
|---|---|---|
| pylon collider off (in page) | no prompt behind the pylon | flips: prompt appears |
| door A collider off (in page) | door blocks before `corridor_door_opens` | flips: walks through (z −28.5) |
| `corridor_door_opens` → `corridor_door_open` in alley.js | door A opens after CLONE_UNDERSTOOD | red: world refuses to boot (`unknown WORLD_CHANGES id`) |
| reset line removed from app.js | Pause → Restart puts the player at spawn | red: z = −0.88 |
| EVENT_SOURCES gate removed from state.js | EXIT_BOOTH from a terminal is refused | red: accepted, state RELAY_UNLOCKED |

**Null:** the renamed-id sabotage goes red at BOOT, through `changeId`. Without that guard (an id compared as a
bare string) a rename would only show as a door that never opens, and only the door check would catch it.

## Not verified
Real pointer lock with a human mouse. ≥30 FPS on a laptop: the headless readout of 20–26 FPS is pacing, not a
measurement. Anything on Qollab. Dev-terminal buttons are clicked with element.click(), not the mouse.
