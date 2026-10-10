---
type: report
status: current
date: 2026-10-09
updated: 2026-10-09
---

# Quantum physics review: the engine's numbers check out, four gaps in what the tests can see

This is an outside review of `echo/quantum/` on `lane/quantum/integration` @ a9edce2. I re-derived the
physics independently and ran 25 sabotages of my own. Measured with Python 3.13.0, qiskit 2.5.2 and the
local venv, on a disposable detached worktree. **Not run in Pyodide or on Qollab.** Evidence:
`evidence/physics-review/` (derive.py, sabotage.py and their outputs). It extends [[quantum-engine-g1]].

## 1. Independent re-derivation: no number is false

`evidence/physics-review/derive.py` uses its own numpy and full 2^n matrices built with `np.kron`, with
q0 as the rightmost factor. This is a different technique from the tests' einsum tensor, and it shares no
code with `echo/tests`. It covers three non-axis states: `bloch_a`, `bloch_b`, and `rv_c` =
RY(0.7) then RZ(2.1), a state the engine had never seen. **All 81 compared quantities agree. The worst
difference is 4.99e-11, exit 0.** The comparison covers:
- the four branch probabilities (all exactly 1/4);
- Bob's conditional state per branch, which equals X^m1 Z^m0|ψ> (asserted to 1e-12);
- Bob's Bloch vector, before and after the rule correction;
- the 16-cell fidelity grid per state;
- the withheld-bits ρ (I/2);
- the four deferred-check variants;
- the cloning purities and fidelities;
- the relay marginals, the Z/X agreements and the joint probabilities.

**Closed form behind the transcript's table.** It confirms the table independently. A wrong choice leaves
a residual Pauli P = X^(ax⊕m1) Z^(az⊕m0) on |ψ>, so the fidelity is |<ψ|P|ψ>|² = r_P², the square of
that Bloch component. Y comes from XZ.
- For `bloch_a`, r = (0.820951, 0.386488, 0.420319), so r_x² = 0.673960, r_z² = 0.176668 and
  r_y² = 0.149373. These are exactly the transcript's cells.
- Each named state has some |r_P| = 1, which is why it scores 1.000000 on a wrong choice. This is
  physics, not a bug.
- Cloning purity is 1 − 2|a|²|b|²: 0.588334 (bloch_a), 0.721962 (bloch_b) and 0.792492 (rv_c). This
  matches the engine.

**Endianness, end to end** (all verified):
1. A Statevector index is Σ q_k·2^k. derive.py's kron build matches every labelled value. Bob's
   conditional states are not symmetric in m0 and m1, so a swap would show.
2. `Statevector.probabilities([0,1])` puts qargs[0] in the low bit. Check: q1 = 1 and q0 = RY(0.6) give
   [0, 0, 0.9127, 0.0873].
3. `BasicSimulator` counts for q0 = 1, q1 = 0 come back as `{'01': 8}`, so the rightmost character is
   clbit 0, which is q0. `qollab_job` reads keys this way.
4. m0 = q0 readout after CX(q0,q1)·H(q0), and m1 = q1 readout. The rule is X iff m1, Z iff m0, as in
   vision §7.

## 2. The three claimed physics nulls: all three confirmed, with proofs

| null | proof | holds for |
|---|---|---|
| cloning traces the wrong qubit | CX\|ψ>\|0> = a\|00>+b\|11> is SWAP-symmetric, so both reductions are diag(\|a\|²,\|b\|²) | every input |
| relay reports the sender's marginal | for (U⊗I)Φ+, ρ_A = U(I/2)U† = I/2 = ρ_B | every local unitary U |
| sender's gate applied to the receiver | (A⊗I)Φ+ = (I⊗Aᵀ)Φ+, and Xᵀ = X, Zᵀ = Z, so the **states** are identical | I, X, Z (any A with Aᵀ ∝ A). It would stop being a null for e.g. RY(θ) |

Output tests cannot close these. A **structural** test can close the third one. The circuit is
player-visible as `circuitText`, so a test can assert that the sender gate's qubit in `qc.data` is q0.

## 3. Sabotage round: 25 mutations, 15 red, 10 green

Each mutation runs on a fresh temp copy of `echo/`. The needle must match exactly once, or the mutation
is refused (none were refused). The unmutated suite gives 395 passed. Full table:
`evidence/physics-review/sabotage.out`.

**Green, and physics-indistinguishable (true nulls):**
- `correction-order-ZX`: ZX = −XZ, a global phase.
- `correction-as-Y`: Y = iXZ.
- `branch-prob-index-swap`: every branch has probability 1/4 for every input.
- `clone-amp-key-swap`: a|00>+b|11> is symmetric.
- `relay-label-swap`: the joint distributions of Φ+, Ψ+ and Φ− are swap-symmetric.
- `relay-sender-Z-on-receiver`: proof in §2.
- `clone-by-purity`: correct physics for pure inputs, by a different route. It is a control, not a defect.

**Green, and real gaps (ranked in §4):**
- `bob-bloch-uncorrected`
- `bloch-y-sign`
- `sampler-hardcoded-uniform`
- `clone-by-name-variant`

**Red, with a thin margin:**
- `live-commit-swapped`: 1 test.
- `relay-xagree-one-H`: 1 test.

## 4. Findings, by severity

1. **MEDIUM: the player-visible Bloch arrow is untested.** `teleport_branch`'s `receiverBlochVector`
   is only ever asserted to equal [0,0,0], for the relay and the withheld bits. Two mutations stay
   green:
   - reporting Bob's Bloch vector *before* the correction;
   - flipping the sign of ⟨Y⟩ (a conjugation bug).

   derive.py catches both. **Repro:** `python -I evidence/physics-review/sabotage.py <echo> bob-bloch-uncorrected bloch-y-sign`.
   **Fix:** a test that compares `receiverBlochVector` against a hand-derived vector for the generic
   states, before and after correction, in all four branches.
2. **MEDIUM: the "consumed once" rule is not enforced by the engine.** Three `live_commit('bloch_b')`
   calls with seeds 1, 2 and 3 all return fidelity 1.0, with bits (0,0), (1,1) and (0,0). Nothing
   refuses the second call. Physically, re-teleporting the same token is cloning it. `qollab_job`
   guards its single job with a module flag, but `live_commit` relies on a docstring.
   **Fix:** a `_token_consumed` guard in `live_commit`, mirroring `run_bell_verification_once`, plus a
   test. The alternative is an explicit decision that the quest state machine owns this, with a
   gameplay test. Which layer owns it is the supervisor's call.
3. **LOW–MEDIUM: false causation in the source fact for basis states.** For `zero` with m0 = 0, the
   player reads: "left in |0>, which equals this basis calibration state only because it was already a
   known Z value". The real reason is different. After H(q0), m0 is uniformly random for every input:
   with the same input and m0 = 1, the engine says "it no longer holds the state". The match is a 50%
   coincidence of the readout.
   **Fix (wording):** "left in |m0>; the readout was random (50/50) and happened to match this basis
   state. The source does not keep the state."
4. **LOW: the live fidelity reads as if it were measured.** "Receiver fidelity with the token:
   1.000000" (`live_commit`, `teleport_branch`). A single copy of an unknown state cannot have its
   fidelity measured. The value exists because the simulator knows ψ.
   **Fix (wording):** "simulated fidelity (known here because the simulator prepared the token)".
5. **LOW: the honesty of the sampler is unprovable from its outputs.** If the sampler hardcodes 1/4 and
   ignores Qiskit, it stays green, because the Bell outcomes are uniform for every input (a theorem).
   The fact text "drawn … from the exact Qiskit branch probabilities" would then be false undetectably.
   **Fix:** a test that monkeypatches `_branch_probabilities` to a skewed distribution and checks that
   the sampler follows it.
6. **LOW: the `clone-by-name` margin is thin.** A name list that also holds the test's own disguised
   names passes. **Fix:** generate preparations with random angles and random names inside the test,
   and assert the verdict equals |overlap|² > 1−1e-9 computed by hand.
7. **LOW (contract, not physics):** `qollab_job.interpret_counts` builds its dict by hand.
   `experiment: "bell_verification"` is not in `formats.EXPERIMENTS`, so this result bypasses the
   guarded builder and its forbidden-phrase check. Contract proposal: [[Design/experiment-result-contract]].

## 5. The Pyodide API census for echo/quantum

| API | on the probe ([[Research/qollab-backend-from-js-projects]])? | notes |
|---|---|---|
| `QuantumCircuit`, `.h/.cx/.x/.z/.measure`, `.draw('text')` | on | Rust `CircuitData`; `draw` goes through `DAGCircuit` (Rust) and `shutil.get_terminal_size` (falls back to 80 cols when there is no tty) |
| `Statevector.from_instruction`, `partial_trace`, `state_fidelity` | on | `state_fidelity` is always called with one Statevector. That is the pure path: no `_funm_svd`, and 0 `scipy.linalg.sqrtm` calls (measured with a spy) |
| `.ry/.rz/.s/.cz`, `qc.find_bit` | off | standard gates in the same Rust `CircuitData` the probe exercises |
| `Statevector.probabilities(qargs)`, `.tensor`, `.evolve(QuantumCircuit)`, `Statevector(ndarray)` | off | pure numpy within `quantum_info` |
| `DensityMatrix.evolve(QuantumCircuit)`, `.purity()`, `.expectation_value(Pauli)`, `Pauli` | off | pure numpy. A `sys.setprofile` trace of a full engine run recorded no `_accelerate` calls outside `CircuitData`/`DAGCircuit` |
| `numpy`, `random.Random`, `math`, `numbers.Integral` | stdlib/numpy | Pyodide ships them |
| `qiskit_aer`, direct `scipy` | **not used** | scipy is loaded only by `import qiskit` itself |

**Residual risk:** none of this has run in Pyodide. The probe imports `qiskit.quantum_info`, which loads
all of the modules above. One run of `pytest`-free engine calls in Pyodide would settle it:
`echo/tests/smoke_plan.md` §2.
