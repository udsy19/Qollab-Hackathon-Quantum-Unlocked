---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---

# Contract gate pins the owner-ruled constants

Follows [[Reports/contracts-v2]]. Measured on `lane/platform/contracts-pin-thresholds` (commit 49b26d6, base 43be7d9).
Evidence: `evidence/platform/contracts-pin/`.

## The defect

On a copy of `echo/contracts.js` with `FIDELITY_PASS = 0.9`, the v2 gate `node tools/contract-check/check.mjs`
reported **GREEN 1087/1087** (exit 0). v2's sabotage listed `FIDELITY_PASS → 0.5` as a declared null.

The cause: on generic dry-run states, the verdict's two terms imply each other. These are the rule term
(X iff m1=1, Z iff m0=1) and the floor `fidelity ≥ FIDELITY_PASS`. Behavioural checks therefore cannot see
either one drift alone.

## The fix

`check.mjs` now has a section "owner-ruled values". Each expected value is typed from the ruling text, with
its citation, and is never read from the module:

- `FIDELITY_PASS` = 0.999999 (vision §7.4)
- `BACKEND_SHOTS` = 256 (13 questions #9)
- `TELEPORT_TEST_STATE` = {1.137, 0.44}
- `BIT_LABELS` (m1 is ruled; m0 comes from the vision §7.4 Beat 2 text, because there is no owner ruling for it)
- the correction rule
- `EXPERIMENTS.backend_verification`
- `GENERIC_MAX_WRONG_FIDELITY` = 0.9. This is a design value, not an owner ruling. The Qiskit oracle's worst wrong choice measured **0.674089**.

It also adds two behaviour probes:

- **Circuit order:** Qiskit's ry→rz X-error fidelity is accepted and the rz→ry value 0.828… is refused.
- **Effective verdict floor:** a correct choice passes at F = 1 and at 0.9999995, and does not pass at 0.99999 or 0.9.

After the fix:

| gate run | verdict |
|---|---|
| copy with `FIDELITY_PASS = 0.9` | **RED** (exit 1), one FAIL line naming `FIDELITY_PASS` and §7.4 |
| copy with shots 1024 | RED (exit 1) |
| copy with m1 label `RELAY READOUT m1` | RED (exit 1) |
| real file | **GREEN 1117/1117** (exit 0) |
| `sabotage.py` | **61 cases: 55 red, 6 declared nulls, 0 mismatches** |

## Findings

- **Equality at the threshold is refused.** `dryRunVerdict` with a correct choice at F = 0.999999 returns
  `passed: false`. The physics cross-check refuses that F because `1 - 0.999999 = 1.0000000000287557e-06`,
  which is greater than `FIDELITY_CROSSCHECK_TOLERANCE = 1e-6`. The guard is the same size as the band it
  defends ([[Design/gate-independence-cases]], law 12). Real Qiskit output for a correct choice is 1 ± 1e-15,
  so no player can reach this case. It still contradicts "≥ 0.999999". Not fixed here: the fix belongs in
  `echo/contracts.js`, and this task was gate-only.
- **The remaining nulls are equivalent mutants.** Two sabotages leave every valid input with the same verdict:
  - dropping the verdict's rule term;
  - replacing `FIDELITY_PASS` with a literal 0.9 inside the verdict.

  A result reaches the verdict only after two guards: the 1e-6 cross-check and the generic-state guard. So a wrong
  choice always scores ≤ 0.9 and a right one always scores ≥ 1 − 1e-6. The exported values are pinned.
  Combining the 0.9 literal with a loosened cross-check (0.2) is RED.
- **The pin is the enabling step.** On the 0.9 copy, a `pin()` sabotaged to always pass leaves the gate GREEN.
  No other check would catch a lone `FIDELITY_PASS` drift.
