---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---
# Contracts: the one story commit gets a validator (`validateCommitResult`, `STORY_TOKEN_ID`)

Follows [[Reports/contracts-fidelity-band]] and [[Reports/contracts-moments-and-land]]. Closes red-team 0005 §5 (and §9's
fixture names) on the platform side. Evidence: `evidence/platform/contracts-commit/`. Branches: `lane/platform/contracts-commit-result`
(d6939d5), `lane/platform/contracts-land-2` (ae39421, contracts-only, clean on main).

## The defect
The dry run had two validators; the story commit had none. A commit with F = 0.9, or with m0/m1 swapped, was "valid". Gameplay
looked for `parameters.stateId == 'story_token'`, quantum emitted `parameters.state == 'token'`: the real-output quest walk stalled
at the last step and the token ended `measured_refused`.

## The contract
- `STORY_TOKEN_ID = 'story_token'`, carried as `parameters.stateId`. A dry-run result carrying it is refused (§7.4).
- `validateCommitResult(res)` → error list: ExperimentResult shape; `teleportation`; `exact_qiskit_local`; the marker; `applyX/applyZ`
  booleans equal to `expectedCorrections(m0, m1)`; `fidelity >= FIDELITY_PASS - FIDELITY_EPSILON`; no `theta/phi` (the token is hidden).
  Counts are already refused on an exact engine by `validateExperimentResult`.
- No separate `commitVerdict`: with the rule enforced there is no "valid but failed" commit (with the rule applied F = 1 for every
  state), so a verdict would be `errors.length === 0` under another name.
- No bloat: `checkDryRunResult` became `checkTeleportResult(req|null, …)` and the rule + band moved into one `judgeCorrections`
  that `dryRunVerdict` and the commit both call.

## Measured
- Gate written first: 55 of 1264 checks RED on the old module; GREEN 1264/1264 after. Archive extracts of both branches GREEN.
- Sabotage 101 cases, 0 mismatches. Commit guards each RED alone: correction check (13 FAIL lines), fidelity check (4), marker (3),
  pre-contract `state: 'token'` alias (1), angles (1), shared checks bypassed (6).
- Two former dry-run nulls ("ignores the rule", "literal 0.9") are now RED, because the shared judge is also the commit's only guard.
- Real engine (quantum c3adf0a `live_commit`, 4 branches): 0/4 valid — `parameters.stateId` and `applyX/applyZ` missing. With quantum's
  2-line change applied to a disposable copy: 4/4 valid. With the engine's rule swapped: bits 10/01 refused (F = 0.2065, rule broken).

## Nulls
- Dropping the applyX/applyZ boolean check, or the fidelity-present check: equivalent mutants (the rule and floor checks still refuse).
- Dry-run verdict ignoring the rule, or ignoring the fidelity: equivalent (the 1e-6 cross-check sits in front).
- Judge `>=` → `>`: equivalent (only F = 0.999999 − 1e-12 exactly).
- Swapping m0/m1 on bits 00 or 11 is the identity: no validator can or should see it.
