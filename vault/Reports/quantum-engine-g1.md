---
type: report
status: current
date: 2026-10-09
updated: 2026-10-09
---

# Quantum engine G1: cloning, no-signalling and teleportation measured in local Qiskit

The engine in `echo/quantum/` passes 363 tests whose expected values are derived by hand. Three
findings bind the game design. Measured on branch `lane/quantum/quantum-core` (commits bf7e715,
3a0fe89 and later), Python 3.13.0, qiskit 2.5.2, local venv. **Not run in Pyodide or on Qollab.**

## Measurements

| what | command | result | evidence |
|---|---|---|---|
| test suite | `.venv/bin/python -m pytest echo/tests -q` | 363 passed, exit 0 | — |
| red before build | same, before `echo/quantum` existed | exit 2 (ModuleNotFoundError) | `evidence/quantum-core/00-red-before-implementation.txt` |
| sabotage round | `evidence/quantum-core/sabotage_round.py` | 19 mutations: 16 red, 3 nulls | `evidence/quantum-core/sabotage.md` |
| transcript | `evidence/quantum-core/transcript.py` | every terminal's dict + 112-cell fidelity table | `evidence/quantum-core/transcript.txt` |

## Findings

1. **On the five named calibration states, a wrong correction can score fidelity 1.000000.**
   `|0>`, `|1>`, `|+>`, `|->` and `(|0>+i|1>)/√2` are each an eigenstate of some Pauli. In every
   branch, at least one wrong X/Z choice leaves them unchanged. Example: `plus`, m0=0, m1=0, X
   applied gives 1.000000. Only the generic Bloch states (`bloch_a`, `bloch_b`) give every wrong
   choice a fidelity below 1: 0.058 to 0.674. **So a rooftop dry run on a named state can pass a
   player who chose the wrong rule.** The engine reports the true value and adds a fact saying the
   mistake does not show on this state. Which states the rooftop uses is a design question.
2. **Three sabotages cannot be detected by any output, because the physics makes them identical.**
   - Tracing out the source instead of the copy in the naive clone: both outputs are
     `diag(|a|², |b|²)`.
   - Reporting the sender's marginal instead of the receiver's: both are I/2.
   - Applying the "sender's" X to the receiver's half: (X⊗I)Φ+ = (I⊗X)Φ+.

   These nulls are recorded, not closed.
3. **Two test gaps were found by sabotage and closed.** A hardcoded deferred-check fidelity was
   invisible, because the true value is 1. `verify_deferred` can now drop either controlled
   correction, and the test checks the lower value against a hand computation. An
   `isTwoIndependentCopies` looked up by state name was invisible, because the catalogue happens to
   agree with the derived answer. The test now supplies its own disguised preparations.

## Open

- Pyodide/Qollab import, `.callPromising` and `.toJs({dict_converter: Object.fromEntries})`:
  `echo/tests/smoke_plan.md` §2, which only the owner can run.
- Contract proposal: [[Design/experiment-result-contract]].
