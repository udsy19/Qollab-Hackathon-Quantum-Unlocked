## TL;DR
- **DONE.** `echo/contracts.js` now has `MOMENT_EVENTS`: the 4 relay ids, plus `teleport_dry_run_00` and `countdown_zero`, which story-ui already consumes. They sit in `EVENT_SOURCES` as `{lane:'gameplay', via, consumer:'story-ui'}`, and `transition()` rejects them. It also has `countdownRemaining(start, elapsed)` (holds at 0, never negative, never a quest event) and a pinned `COUNTDOWN_START_SECONDS = 720`.
- Gate first: RED 36 FAIL → GREEN **1206/1206**. Sabotage: **89 cases, 0 mismatches**. All 15 new cases are RED, including your three (drop an id, negative countdown, wrong source).
- **Nulls:** an undeclared export `COUNTDOWN_GAME_OVER` stayed green. I closed it with an export-surface pin, and it is now a RED case. "countdown_zero fires once" is emitter behaviour; it is declared NULL.
- **Landing branch** `lane/platform/contracts-land` @ 5a90cdf, cut from main 99dfc54. `git diff --stat main...` lists only `echo/contracts.js`, `echo/CONTRACTS.md`, `tools/contract-check/{check.mjs,sabotage.py}`. contract-check is GREEN 1206/1206 on its `git archive` extract. qollab-caps is RED only on entry-index/entry-main (expected).
- It also carries the unlanded pin-thresholds and fidelity-band revisions (contract-only). Recommend: LAND `lane/platform/contracts-land`; MERGE the Part 1 branch into platform integration.
- Evidence: `evidence/platform/contracts-moments/README.md` (commands, exits, logs). Vault: `vault/Reports/contracts-moments-and-land.md`.

## Vault check
- **Read:** `vault/AGENTS.md`, `vault/Index.md` (no entry on moments, countdown or a contracts-only land), `vault/Reports/contracts-v2.md`, `contracts-pin-thresholds.md`, `contracts-fidelity-band.md`, `.claude/rules/gate-independence.md` (laws 3, 5, 12, 15), `lanes/platform/owner-answers.md` (relay "new contract names", physics-code-audit + clarification that contracts may land early), `lanes/platform/context.md`.
- **Already known:** the pin pattern (typed ruled values in the gate, never read back), the disposable-copy sabotage harness, and the `EVENT_SOURCES` `{lane, via}` shape.
- **Reused:** the `strictTable`/`nameTable`, `SOURCE`, `describe`/`isFiniteNumber` helpers; the gate's `pin()`/`call()` (hoisted so the new sections can use them); `sabotage.py` CASES (extended). Moment ids and the countdown semantics come from story-ui's `echo/data/story.js` `MOMENTS` and `ui/hud.js` `formatCountdown` (lane/story-ui/integration). I did not rename them.
- **Stale or wrong:** `node scripts/where.mjs MOMENT --branches` printed "NOTHING FOUND … does not exist yet". It matches whole words, so the singular missed story-ui's `MOMENTS` and the four ids on 10+ branches (`where.mjs MOMENTS` finds them). `git grep` found them. This is recorded in the vault report.

## What I found
- story-ui already keys six moments: the four relay ids plus `teleport_dry_run_00` and `countdown_zero`. It also has `HUD.countdownHeld` and `formatCountdown`, which floors and clamps at 0. No gameplay branch uses any moment or countdown name yet.
- The vision gives no countdown start value. §6.3 shows `GRID SHUTDOWN 08:42` "At Relay Chamber". §1 forbids a game-over from a timer, and §9.3 forbids decrementing a fictional timer below zero.
- No product code on any `lane/*/integration` branch iterates `EVENT_SOURCES` (git grep), so adding 6 keys breaks no consumer.
- `main` already had an older contracts.js. The landing diff is therefore 4 modified files (+403/−12) and carries pin-thresholds + fidelity-band too.

## What I changed (commits)
- `88cd09b` contracts: `MOMENT_EVENTS`, `MOMENT()` sources with `consumer`, `COUNTDOWN_START_SECONDS`, `countdownRemaining`. Gate: moment section, countdown section, export-surface pin. Sabotage: +17 cases. CONTRACTS.md: moments table, countdown section, **Migrations table**, and an export rule in "Changing a contract".
- `d240249` evidence README + `vault/Reports/contracts-moments-and-land.md`. `2ca0bf9` landing/archive logs.
- `5a90cdf` on `lane/platform/contracts-land`: `git checkout 88cd09b -- echo/contracts.js echo/CONTRACTS.md tools/contract-check`. The temp worktree is removed; the branch remains.

## Commands and exits
| command | exit | result |
|---|---|---|
| check.mjs before the implementation (gate first) | 1 | RED 1169/1205, 36 FAIL |
| check.mjs after | 0 | GREEN 1206/1206 |
| sabotage.py | 0 | 89 cases, 81 red, 8 declared nulls, 0 mismatches |
| `git diff --stat main...lane/platform/contracts-land` + grep for any other path | 0 / 1 | 4 allowed files; no other path |
| check.mjs on a `git archive` extract of contracts-land / of Part 1 | 0 / 0 | GREEN 1206/1206 both |
| sabotage.py inside each extract | 0 / 0 | 0 mismatches |
| qollab-caps on the contracts-land extract | 1 | RED: entry-index, entry-main (expected on main) |
| qollab-caps on the Part 1 extract | 1 | RED: 8 import-unresolved/specifier in echo/main.js. Identical on base e22cc7e, so it predates this change |

## Nulls (sabotage that did NOT go red)
- An undeclared export `COUNTDOWN_GAME_OVER = true` was **GREEN** before the export-surface check. It is now RED and in sabotage.py.
- The moment comment changed to "countdown_zero fired every frame" is **GREEN, declared**. Once-only firing is gameplay's emitter behaviour; the contract only names the id.
- The 6 pre-existing declared nulls are unchanged.
- The gate's own error: my first expectation `720 − 100.7 → 619` contradicted its "rounds up" label. The implementation exposed it, and I corrected it to 620.

## Migration table (as added to `echo/CONTRACTS.md` § Migrations)
| revision | change | what a consumer does |
|---|---|---|
| moments + countdown (consult 9) | **added** `MOMENT_EVENTS` (6), `EVENT_SOURCES` moment entries with a `consumer` field, `COUNTDOWN_START_SECONDS = 720`, `countdownRemaining()`. Nothing renamed or removed. `EVENT_SOURCES` now has 29 keys | gameplay emits `MOMENT_EVENTS.<id>` and drives the HUD with `countdownRemaining`. story-ui keeps `MOMENTS` keys equal to `MOMENT_EVENTS`. Code that iterates `EVENT_SOURCES` filters `!s.consumer` or uses `QUEST_EVENTS` |
| fidelity band (504666f) | **added** `FIDELITY_EPSILON` | compare with `FIDELITY_PASS - FIDELITY_EPSILON`, or read `dryRunVerdict().passed` |
| v2 (7f36522, 340f45d) | RESTART/CLOSE_SCIENCE, `EVENT_SOURCES`, backend_verification, two-phase dry run, UI root/settings | adopt the two-phase calls |

## What I did NOT do or could not verify
- No browser and no Qollab run (none needed). No cross-lane check: whether story-ui's `MOMENTS` keys stay equal to `MOMENT_EVENTS` belongs to red-team's cross_lane_check, not this gate.
- `tools/contract-check/browser.html` was not re-run in a browser.
- I did not regenerate vault hubs (`vault-hubs --check` reports Map.md STALE, as expected).

## Decisions inferred from the docs
- **Six moments, not four.** The relay names four. story-ui already consumes `teleport_dry_run_00` (owner ruling: a 00 pass does not unlock COMMIT) and `countdown_zero` (relay: holds at 00:00). Contracting them stops gameplay inventing other names (vision §8.4 one contract).
- **Gameplay fires `countdown_zero`, via `countdown`.** Gameplay owns the game clock and state (lane-ownership table); story-ui only displays.
- **`COUNTDOWN_START_SECONDS = 720`.** Not owner-ruled. §6.3 shows 08:42 at the relay (mission 2), so the start must exceed 522 s, and 12:00 leaves room for the opening and mission 1 in a ~10-minute game (§1.4). It is pinned as a design value.
- **Round up, compute from elapsed.** Rounding up means 00:00 shows only when time is out. Computing from elapsed rather than decrementing makes it idempotent (§9.3).
- **Moments live in `EVENT_SOURCES`** (your brief), marked by a `consumer` field that quest events lack. They are not in `QUEST_EVENTS`: §9.2 says not every incidental thing belongs in the machine.

## Next (for the supervisor)
1. **LAND `lane/platform/contracts-land` (5a90cdf)**. Re-check with `git diff --stat main...lane/platform/contracts-land` and `git archive lane/platform/contracts-land | tar -x -C $X && node $X/tools/contract-check/check.mjs`.
2. MERGE `lane/platform/contracts-moments-and-land` (2ca0bf9) into `lane/platform/integration`.
3. Relay to **gameplay**: fire `MOMENT_EVENTS.*` at the triggers in CONTRACTS.md § Moments, fire `countdown_zero` once, and feed `hud.setCountdown(countdownRemaining(COUNTDOWN_START_SECONDS, elapsed))`. Relay to **story-ui**: keep `MOMENTS` keys equal to `MOMENT_EVENTS` and import the ids. Ask **red-team** to add "story-ui MOMENTS keys == MOMENT_EVENTS" to cross_lane_check.
4. Tooling (not platform-owned): `scripts/where.mjs` whole-word matching gives a false "does not exist" on a stem. Consider a substring mode, or a warning when the query is a prefix of a hit.
