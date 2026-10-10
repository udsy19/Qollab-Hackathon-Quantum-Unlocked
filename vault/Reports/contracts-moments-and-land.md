---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---
# Contracts: MOMENT events, a countdown that holds at 00:00, and a contracts-only landing branch

Follows [[Reports/contracts-fidelity-band]]. Measured on `lane/platform/contracts-moments-and-land` 88cd09b (base e22cc7e)
and `lane/platform/contracts-land` (cut from main 99dfc54). Evidence: `evidence/platform/contracts-moments/` (README table).

## What the contract now holds
- `MOMENT_EVENTS`: `clone_increase_voltage`, `relay_bay_cable`, `teleport_commit_locked`, `teleport_dry_run_failed` (overseer
  relay 2026-10-10), plus `teleport_dry_run_00` and `countdown_zero`, the ids story-ui's `echo/data/story.js` `MOMENTS`
  already keys its lines by (lane/story-ui/integration). Reusing them means gameplay fires what story-ui listens for.
- `EVENT_SOURCES[id] = { lane: 'gameplay', via: 'moment' | 'countdown', consumer: 'story-ui' }`. Quest events have no `consumer`.
  `transition()` throws on a moment id in every §9.1 state.
- `countdownRemaining(start, elapsed)`: whole seconds, clamped to [0, start], rounded up, computed from elapsed time
  (never decremented, so §9.3 "decrement a fictional timer to negative" cannot happen). It throws on NaN or a non-number.
  `COUNTDOWN_START_SECONDS = 720` is a platform design value, pinned and constrained to exceed §6.3's 08:42 at the relay.
  No quest event comes from the countdown (§1 anti-goal: no game-over from a timer).
- The gate now pins the module's **export surface**. A new export means a migration row plus a gate change.

## Measured
- Gate written first: RED with 36 FAIL lines (1169/1205), then GREEN 1206/1206.
- Sabotage: 89 cases, 0 mismatches. The 15 new moment/countdown cases are all RED, including the three the supervisor
  named: drop a moment id, a negative countdown, and a moment with the wrong source.
- **Nulls found:** (1) an undeclared export `COUNTDOWN_GAME_OVER` stayed GREEN; this is closed by the export-surface check and
  is now a RED sabotage case. (2) "countdown_zero fires once" is gameplay emitter behaviour the contract cannot see;
  it is declared NULL. (3) The gate's own first expectation was wrong (720 − 100.7 → 619 under a "rounds up" label). The
  implementation exposed it, and it was corrected to 620.
- Landing: `git diff --stat main...lane/platform/contracts-land` = 4 files, all under `echo/contracts.js`, `echo/CONTRACTS.md`,
  `tools/contract-check/`. contract-check is GREEN 1206/1206 on a `git archive` extract of each branch.
  `tools/qollab-caps` on the landing extract is RED only on entry-index/entry-main (main has no entry files).
- The landing carries every unlanded contract revision since main, not only this one: pin-thresholds, fidelity band and moments.

## Tooling finding
`node scripts/where.mjs MOMENT --branches` printed "NOTHING FOUND … this does not exist yet", while 10+ story-ui branches
hold `MOMENTS` and the four ids. It matches whole words, so a singular misses the plural. `git grep` (step 3 of no-bloat's
search order) found them. Search the distinctive ids, not a stem.
