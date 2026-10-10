---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---

# Engine + bridge adversarial review: the physics is true, but two seams stop the game

Lane quantum, consult 13, branch `lane/quantum/engine-bridge-review`. The review covers the engine at 2bfc51e. It used host Python 3.13 / qiskit 2.5.2, and the **local** Qollab-like runner (Pyodide 314.0.7, Python 3.14.2, Qiskit 2.5.2 wasm). **Not Qollab, not IonQ.** Evidence: `evidence/quantum/engine-bridge-review/` (its README indexes every file). It extends [[quantum-physics-review]], [[quantum-hardening]] and [[bridge-rewire]].

## Measurements

| what | result | producer |
|---|---|---|
| own numpy/kron vs engine, host: 8 random generic states × 4 branches × 4 corrections, plus withheld, deferred, cloning, relay | 715 numbers, worst 4.98e-11, 0 mismatches | `derive-host.out` |
| the same, engine inside Pyodide | 715 numbers, worst 4.98e-11, 0 mismatches | `derive-pyodide.out` |
| rule choices / wrong choices | F=1 on 32/32; wrong max 0.885 (≤ 0.9) | `derive.py` |
| cloning purity, \|+> and phase | 0.5 exactly | `derive.py` |
| JS-side type census of everything that crossed the bridge | 0 non-plain leaves | `pyodide/out/pyodide-engine.json` |
| real engine output → main `validateCommitResult` + gameplay `world-v2-port` rules | **13 checks, 6 FAIL** | `seam.out` |
| sabotage: 6 mutations plus an unmutated control (595 pass) | 4 red, **2 null** | `sabotage.out` |

## Findings

1. **The commit is non-conformant (blocker).** `live_commit` emits `parameters {"state": "token"}`. main's CONTRACTS.md requires `{stateId: "story_token", applyX, applyZ}`. Both `validateCommitResult` and gameplay's COMMIT rule refuse the result, so the token is consumed and the quest never reaches the ending. The bridge validates the commit with `validateExperimentResult` only, so neither the tests nor the pyodide-bridge harness could see this.
2. **Cloning results have no top-level `fidelity` (blocker at the seam).** Gameplay's Mission 1 rules read `r.fidelity`. The value exists only as `observables.jointFidelityWithTwoCopies`.
3. **The JS commit latch is undone on a rejection that comes after Python consumed the token.** A retry then meets `TokenAlreadyConsumed`. This was reproduced in Pyodide.
4. **The FTL guard is a literal list.** "faster-than-light" passes both `formats.FORBIDDEN_PHRASES` and every test (sabotage null). This repeats the literal-regex lesson.
5. **No test pins the m0/m1 label text.** Swapping the two labels leaves 595/595 green (sabotage null).
6. **The bridge exposes neither `verify_deferred` nor `corrections_withheld`**, and no lane calls them.

## Related
- [[quantum-physics-review]], [[quantum-hardening]], [[bridge-rewire]], [[pyodide-bridge]], [[contracts-v2]]
