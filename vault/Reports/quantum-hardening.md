---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---

# Quantum hardening: random generic dry runs, a hidden story token, a once-only commit

Lane quantum, consult 5, branch `lane/quantum/quantum-hardening`. It implements the owner's quantum rulings
and closes the physics-review findings in [[quantum-physics-review]] §4. Measured with Python 3.13.0,
qiskit 2.5.2 and Node, all locally. **Not run in Pyodide or on Qollab.** Evidence:
`evidence/quantum/hardening/` (its README names each file).

## Measurements

| what | value | producer |
|---|---|---|
| pytest `echo/tests` | 595 passed (was 453 at 951ec9f) | `pytest-full.txt` |
| bridge calls rejected by platform's validator, contracts-v2 (`lane/platform/integration` @ 43be7d9) | **0 / 233** | `validate.txt` |
| the same calls against the pre-v2 contract (4e1b2ed) | 3 / 233, all `backend_verification` | `validate-against-pre-v2-4e1b2ed.txt` |
| two-phase dry run through platform's `validateTeleportBitsResult`, `validateTeleportCorrectionResult` and `dryRunVerdict` | 24 requests × 4 choices, 0 errors, `passed` exactly on the 24 rule choices | `test_contract_conformance.py::test_two_phase_dry_run_passes_the_platform_dry_run_validators` |
| independent kron-matrix re-derivation | 2034 numbers, worst \|diff\| 4.97e-11 | `derive.out` |
| sabotage mutations | 42: 38 red, **4 null** (named below), 0 refused | `sabotage.md` |

## Findings

1. **Where the generic margin comes from.** A wrong X/Z leaves a residual Pauli P on |ψ>, so the fidelity is
   r_P². Platform's contract already fixed `GENERIC_MAX_WRONG_FIDELITY = 0.9`, which means |r_P| ≤ 0.949, a
   wrong choice scores ≤ 0.9, and the receiver's arrow moves by ≥ 36.9°. The engine uses the same bound. It
   therefore accepts every state that platform's `randomGenericState()` can send. A stricter engine bound
   (|r| ≤ 0.9 was tried first) would have refused about 6% of the game's own requests.
2. **Echoed angles must not be rounded.** `formats.plain` rounded every float to 10 decimals. JS angles carry
   about 16 significant digits, and the contract checks `parameters.theta` against the request to 1e-12, so
   every JS-drawn dry run would have been rejected. Parameters are now echoed exactly. The mutation
   `parameters-rounded` goes red on this.
3. **F1 and F7 were already closed by contract-conformance.** `bob-bloch-uncorrected`, `bloch-y-sign` and
   `job-hand-built-dict` went red on the pre-fix code without the new tests (`red-before/`). F5 and F6 went
   red only with the new tests. F3 and F4 were red on the pre-fix code.
4. **The physics-review harness is stale.** `evidence/physics-review/{sabotage,derive}.py` target field names
   (`details`, labelled keys) that contract-conformance retired. Its needles no longer match. The re-targeted
   versions are in `evidence/quantum/hardening/`.
5. **The four nulls.** Three are true physics nulls, proved in [[quantum-physics-review]] §2: Z-before-X
   (ZX = −XZ), XZ replaced by Y (Y = iXZ), and the sender's Z applied to the receiver ((Z⊗I)Φ+ = (I⊗Z)Φ+).
   The fourth, `clone-by-purity`, is correct physics reached by another route, so it is a control and not a
   defect.
6. **The token is hidden from results, not from source.** The token's angles are in
   `echo/quantum/__init__.py`, which ships to Qollab. No result field reveals them: a scan with a
   planted-leak control checks every number and every printed number in all 233 bridge results plus 8
   commits. Anyone reading the project files can see the angles.
