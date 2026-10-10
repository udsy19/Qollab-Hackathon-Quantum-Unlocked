# physics-review evidence (lane quantum, consult 3)

Measured against `lane/quantum/integration` @ a9edce2 on a disposable detached worktree
(`git worktree add --detach /tmp/pr-review lane/quantum/integration`), python 3.13.0, qiskit 2.5.2, local venv.
Not run in Pyodide or on Qollab.

- `derive.py <path-to-echo>` — independent re-derivation: full 2^n matrices built with `np.kron`
  (q0 = rightmost factor), no code shared with `echo/tests`. Compares 81 quantities against the engine
  for bloch_a, bloch_b and a review-only state rv_c = RY(0.7) then RZ(2.1). Exit 0 = all within 1e-8.
  Output: `derive.out` (worst |diff| 4.99e-11).
- `sabotage.py <path-to-echo> [ids...]` — 25 mutations, each on a fresh temp copy of echo/; runs the suite
  and derive.py. Output: `sabotage.out`.
