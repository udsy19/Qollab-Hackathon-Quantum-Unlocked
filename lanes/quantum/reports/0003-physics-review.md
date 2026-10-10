# 0003 physics-review: final report

## TL;DR
- **No false number.** I re-derived the physics independently (`evidence/physics-review/derive.py`: its own kron-matrix numpy, no code shared with `echo/tests`). It agrees with the engine on all 81 compared quantities for 3 non-axis states, `bloch_a`, `bloch_b` and a new `rv_c`. Worst diff 4.99e-11, exit 0.
- **Transcript fidelity table confirmed by a closed form.** A wrong correction leaves a residual Pauli P, so the fidelity is r_P², the square of that Bloch component. For bloch_a that gives 0.673960, 0.176668 and 0.149373, exactly the table's cells. The named states score 1.000000 because each one has some |r_P| = 1.
- **The three claimed nulls are real physics.** Proofs are in the vault report §2: a SWAP-symmetric CNOT output; the reduced state of Φ+ is I/2 under any local U; and (A⊗I)Φ+ = (I⊗Aᵀ)Φ+ with Xᵀ = X and Zᵀ = Z.
- **My sabotage round: 25 mutations, 15 red, 10 green.** 6 of the 10 are true physics nulls and 1 is a correct-physics control. The other 4 are real test gaps.
- **Top findings:**
  - (M) Bob's Bloch vector, which the player sees, is never tested: a pre-correction vector or a ⟨Y⟩ sign flip stays green.
  - (M) `live_commit` can be called repeatedly on the same token. Nothing enforces "consumed once".
  - (L–M) The basis-state source fact claims false causation.
- **Endianness verified end to end, and Pyodide API census done.** No aer, no direct scipy, and the fidelity path never calls `sqrtm`. Nothing has run in Pyodide.
- Branch `lane/quantum/physics-review` @ 808ccbb; vault report `vault/Reports/quantum-physics-review.md`.

## Vault check
- **Read:**
  - `vault/AGENTS.md` (delivered by the hook);
  - `vault/Reports/quantum-engine-g1.md`;
  - `vault/Research/qollab-backend-from-js-projects.md` (§ The probe);
  - `evidence/quantum-core/{sabotage.md, transcript.txt}`;
  - `/Users/udsy/agent-org/lanes/quantum/context.md`;
  - `vault/Index.md`, grepped for a prior physics review: none.
- **Already known:** the G1 report's 3 nulls and the named-state fidelity-1 finding. I reused both as the claims under test.
- **Stale or wrong:** the G1 report says "363 tests". The integration branch now runs 395, because backend-job was merged in. That note is not stale on its own branch, but its count does not describe `lane/quantum/integration`.
- **Not read:** vision §7 and §10.3–10.7 in full. I worked from the vision rules quoted in CLAUDE.md, context.md and the module docstrings (m0/m1 rule, RY then RZ order). See "Not verified".

## Findings (ranked; the math and repro for each are in `vault/Reports/quantum-physics-review.md` §4)
1. **MEDIUM: `receiverBlochVector` from `teleport_branch` is untested.** The tests only check [0,0,0] for the relay and the withheld bits.
   - Repro: `python -I evidence/physics-review/sabotage.py /tmp/pr-review/echo bob-bloch-uncorrected bloch-y-sign` gives a green suite, while derive.py goes red.
   - Fix: a test against hand-derived Bloch vectors for the generic states, in all 4 branches, before and after correction.
2. **MEDIUM: one token can be committed many times.** `live_commit('bloch_b')` with seeds 1, 2 and 3 returns (0,0), (1,1) and (0,0), all at fidelity 1.0, and none is refused. Re-teleporting one token is cloning it.
   - Fix: a `_token_consumed` guard mirroring `qollab_job.run_bell_verification_once`, plus a test.
   - Alternatively, assign the guarantee to the gameplay quest state machine, with a gameplay test.
3. **LOW–MEDIUM: false causation in `_source_fact`.** For `zero` with m0 = 0 the player reads "equals this basis calibration state only because it was already a known Z value". In fact m0 is 50/50 for every input, and the same input with m0 = 1 says "no longer holds the state".
   - Fix: rewording (text in the vault report).
4. **LOW: "Receiver fidelity with the token" reads as measured.** It is a simulator-side value; one copy of an unknown state cannot have its fidelity measured.
   - Fix: say "simulated fidelity".
5. **LOW: the sampler's honesty cannot be seen in its outputs.** A hardcoded 1/4 stays green, because Bell outcomes are uniform for every input.
   - Fix: monkeypatch `_branch_probabilities` to a skewed distribution and check that the sampler follows it.
6. **LOW: the clone-by-name margin is thin.** A name list that includes the test's own disguise names passes.
   - Fix: random names and angles generated inside the test.
7. **LOW (contract):** `qollab_job.interpret_counts` bypasses `formats.experiment_result`. Its `"bell_verification"` is not in `EXPERIMENTS`, so the forbidden-phrase guard never runs on it.

**Confirmed correct, each independently:**
- the rule X iff m1, Z iff m0;
- m0 = q0 readout after CX·H;
- Bob = X^m1 Z^m0|ψ>;
- the four branch probabilities are 1/4;
- withheld bits give I/2 and F = 0.5;
- the deferred check with CX(q1,q2) and CZ(q0,q2): F = 1, and the dropped variants match;
- cloning purity 1−2|a|²|b|² and the joint overlap;
- the relay marginal is I/2; Z agreement is 1/0/1 and X agreement is 1/1/0 for I/X/Z;
- the qollab_job key order.

**Physics wording I checked and found true:**
- the relay facts;
- "corrections withheld → I/2";
- "deferred = mathematical verification, not a physical link";
- the qollab_job facts.

## Nulls (sabotages that stayed green)

| mutation | why it is green | verdict |
|---|---|---|
| `correction-order-ZX` | ZX = −XZ | physics null |
| `correction-as-Y` | Y = iXZ | physics null |
| `branch-prob-index-swap` | every branch is 1/4 | physics null |
| `clone-amp-key-swap` | a\|00>+b\|11> is symmetric | physics null |
| `relay-label-swap` | Φ+, Ψ+ and Φ− are swap-symmetric | physics null |
| `relay-sender-Z-on-receiver` | Zᵀ = Z | physics null; a structural test on `qc.data` would close it |
| `clone-by-purity` | correct for pure inputs | control, not a defect |
| `bob-bloch-uncorrected` | — | **GAP** (finding 1) |
| `bloch-y-sign` | — | **GAP** (finding 1) |
| `sampler-hardcoded-uniform` | — | **GAP** (finding 5) |
| `clone-by-name-variant` | — | **GAP** (finding 6) |

**Red but thin, 1 test each:**
- `live-commit-swapped`
- `relay-xagree-one-H`

**Null of my own instrument:** derive.py stays green on `z-iff-m1`, `live-commit-swapped`, `clone-loose-threshold` and `job-endianness`. It does not check `expected_corrections`, live_commit, the copy verdict or qollab_job. The suite catches all four.

## What I changed (commits)
- `808ccbb`: `evidence/physics-review/` (derive.py, sabotage.py, outputs, README) and `vault/Reports/quantum-physics-review.md`. No product code was touched. I did not commit the hubs: `vault-hubs --check` reports the Reports hub and Map as stale, and those are left for the loop to regenerate.

## Evidence paths
- `evidence/physics-review/derive.out`: 81 OK, worst 4.99e-11
- `evidence/physics-review/sabotage.out`: the 25-row table
- The disposable worktree `/tmp/pr-review` (detached at a9edce2) is left in place for reproduction.

## Not verified
- **Nothing ran in Pyodide or on Qollab.**
  - The census is a local trace: `sys.setprofile` saw Rust calls only in `CircuitData`/`DAGCircuit`, and a spy recorded 0 `sqrtm` calls.
  - `shutil.get_terminal_size` in `qc.draw` is assumed to fall back cleanly in Pyodide.
- **Vision §7 and §10.3–10.7 were not read in full.** I checked against the rules as quoted in CLAUDE.md and the docstrings.
- **No browser or game path.** I did not check how the UI renders these dicts, for example whether the Bloch arrow uses `receiverBlochVector`.
- **qollab_job against a real IonQ backend:** not run.

## Questions for the owner
- **Should the engine itself refuse a second `live_commit` on the same token** (finding 2), or is "consumed once" the quest state machine's job alone? The vision says "consumed ONCE" but not which layer enforces it.
- **Should the rooftop dry run use only generic states?** (G1 finding 1, now proven with the closed form r_P².) Named states let a wrong rule score 1.000000.

## What the supervisor should do next
1. **Brief a quantum builder** with findings 1–6, test-first. Each fix should be watched red using the matching mutation in `evidence/physics-review/sabotage.py`; the ids are in the nulls table.
   - Findings 3 and 4 are wording changes in `teleportation.py` facts.
   - Finding 2 needs the owner/supervisor ruling on its layer first.
2. **Route finding 7 to the platform lane** (ExperimentResult contract).
3. **Merge `lane/quantum/physics-review`.** It holds only evidence and a vault report.
