---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: red-team
---

# Cross-lane recheck: real quantum results through contracts v2 into the quest

**Headline (pins: main 6cc19a6 · quantum d9b42d0 · gameplay c49a922 · platform 43be7d9):** the integration gate is **RED**. The physics is right: the oracle driver passes 86/86, exit 0. Contracts v2 accepts 6 of 7 real results. But gameplay's mission rules read field names neither the contract nor the engine uses, so the quest stalls at CLONE_INTRO. Walked past each stall, it stalls at 4 points and ends with the story token spent (`measured_refused`). The same verdicts hold on the newer tips (quantum f7efb92, gameplay 7c4741b, platform e22cc7e). Full report: `lanes/red-team/reports/0005-cross-lane-recheck.md`. Evidence: `evidence/red-team/cross-lane-recheck/out/`.

Supersedes the cross-lane numbers (12/13) in [[Reports/physics-code-audit]]. Its physics verdicts still hold.

## Measured
| check | exit | result |
|---|---|---|
| oracle driver vs quantum (v2 shape) | 0 | 86 passed |
| `cross_lane_check` on real `dump_results.py` | 1 | 5/13 fail (was 12/13) |
| quest walk, real output | 1 | stalls: CLONE_INTRO, CLONE_BASIS_PASSED, TELEPORT_DRY_RUN, commit (token spent) |
| quest walk, gameplay's fake (control) | 0 | CREDITS in 19 transitions |
| contracts v2 two-phase validators on real output | 1 | 22/22 fail as shipped; 20/20 agree on physics once `state` is re-keyed to `theta/phi` |
| `backend_run_audit` merged | 1 | 2 sites: `main.js:114`, `quantum/qollab_job.py:168` |
| `bridge.js` runtime (Node + recorded output) | 1 | memo 3→1 PASS; commit latch PASS; backend result rejected (`bell_verification`), so the one job is spent and then reported "unavailable"; no story token |
| platform `contract-check` / `qollab-caps` | 0 / 1 | 1087/1087 / 4 findings (2 false positives on a negative test) |
| sabotage on platform tools | 0 | 9 nulls; worst: no validator for the story-commit result (F=0.9 or swapped m0/m1 are "valid") |
| gameplay sabotage | 0 | FIDELITY_OK→0.9 and fidelity-check-removed still green (55/55); tip adds token-guard-removed |

## Durable lessons
- **A contract that validates every step except the one irreversible step is a hole at the step that matters.** v2 validates both dry-run phases. It has no commit-result validator and no commit parameter names, and gameplay's untested fidelity check is the only guard left.
- **A producer's "good" fixture can contradict its own spec.** `tools/contract-check/fixtures.json` uses `stateId/correctionX`, which CONTRACTS.md's phase-2 table does not use (law 4).
- **A sabotage measured against a red control must count failures beyond the control.** Quantum's own suite is red on the merged tree (1 failure), so "RED" in its column is meaningless unless the failure count rises.
- **A once-latch is invisible on the happy path.** After a successful commit, the arming check refuses anyway. Only a refused-result path proves the latch.
