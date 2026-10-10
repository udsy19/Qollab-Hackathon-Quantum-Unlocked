---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---

# Fidelity cross-check: tolerance = band, plus a rounding epsilon

Follows [[Reports/contracts-pin-thresholds]]. Measured on `lane/platform/contracts-fidelity-band` (base bc0e927).
Evidence: `evidence/platform/contracts-fidelity-band/`.

## The two defects (measured on the old gate)
- A correct dry-run result at exactly F = 0.999999 was refused: `1 - 0.999999 = 1.0000000000287557e-06` in
  doubles, which is more than `FIDELITY_CROSSCHECK_TOLERANCE = 1e-6`. This is law 12: the guard was the same size as its band, with no slack.
- `FIDELITY_CROSSCHECK_TOLERANCE` loosened to 1e-1 or 1e-2 left check.mjs GREEN 1117/1117. No probe forged a
  fidelity at a gap between 1e-6 and 0.15.

## The fix (`echo/contracts.js`)
- New export `FIDELITY_EPSILON = 1e-12`. The cross-check refuses `|F − analytic| > TOL + ε`, and the verdict passes
  at `F ≥ FIDELITY_PASS − ε`. `TOL` stays 1e-6, so no consumer-visible value moved.
- Why ε = 1e-12: the hand-analytic vs Qiskit gap over the 4 oracle states (64 rows) is **4.67e-13**. This is
  re-derived in the gate on every run, and the gate fails if it reaches 1e-12. The double-rounding error at the band
  edge is 2.9e-17. 1e-12 is 1e6 below the band, so "≥ 0.999999" still means six digits.
- Why the tolerance was NOT tightened to ≤1e-9: then the cross-check would refuse a correct F = 0.999999. That
  makes `FIDELITY_PASS` decorative and contradicts §7.4 "≥ 0.999999". The cross-check must accept what the band accepts.
  A wrong choice still fails on the rule, whatever its fidelity.

## The gate (`tools/contract-check/check.mjs`)
- `FIDELITY_CROSSCHECK_TOLERANCE` is pinned to 1e-6 (the band width, derived) and `FIDELITY_EPSILON` to 1e-12.
- Forged-fidelity probes at gaps 1e-5, 1e-3 and 0.05: 6 on a wrong choice (above and below Qiskit's 0.673960) and 3
  on the right choice. Each must be refused by the cross-check's own error, not only by the verdict.
- The verdict floor passes at 0.999999 and at 0.999999 − 1e-15, and refuses 0.999999 − 1e-9, 0.99999 and 0.9.
- Enabling step: with the PIN disarmed, tolerance 1e-1 and 1e-2 still go RED through the forged probes alone. With
  both disarmed, the gate is GREEN, so these two are the only detectors.

## Nulls
- Verdict `>=` → `>` is an equivalent mutant. It differs only at F = 0.999999 − 1e-12 to the last bit, which no
  engine or probe produces.
- ε 1e-12 → 1e-9, ε → 1e-13, tolerance → 2e-6 and tolerance → 1.5e-6 are caught by the PIN alone. No behavioural probe
  separates them: a forged gap in (1e-6, 1e-5) or a floor probe in (1e-12, 1e-9) would be needed.
