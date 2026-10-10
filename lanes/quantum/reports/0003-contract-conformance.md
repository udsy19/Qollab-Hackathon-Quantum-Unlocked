# contract-conformance — report (FINAL, 2026-10-09)

## TL;DR
- **Before:** platform's real `validateExperimentResult` rejected **181 of 181** bridge calls. Every terminal would have shown "scientific module error".
- **After** (commit `e1a9d5c`): **3 of 181** are rejected. All 3 are the selected-backend job, and each fails on one error: `experiment "bell_verification"`. The contract has no honest value for that experiment.
- I ran the validator on a disposable `contracts.js` with only `'bell_verification'` added: **0 of 181 rejected**. That one addition is the whole remaining gap. Request below.
- New regression test `echo/tests/test_contract_conformance.py` runs the platform's JS validator over every call. I watched it fail on the old code first: 6 failed, `red-on-old-code.txt`. Full suite: **453 passed**.
- **Sabotage round: 28 mutations, 0 nulls.** This includes the 3 physics-invisible nulls from G1, and `trace-wrong-qubit-cloning` is now red. The cloning dict *cannot* tell source from copy on the real circuit, because `a|00>+b|11>` is swap-symmetric. A symmetry-breaking positive control now bites.
- Nothing that carries honesty was renamed into something weaker. Exact numbers went to `observables`; sampled tallies stayed in `counts` + `facts`; verdicts went to `facts`.
- **Recommend:** platform adds `'bell_verification'` to `EXPERIMENTS`. Then merge this branch. story-ui should read the new field names (table below).

## Vault check
- **Read:**
  - `vault/AGENTS.md` (delivered by the hook) and `vault/Index.md` (no prior conformance measurement recorded).
  - `vault/Design/experiment-result-contract.md` and `vault/Reports/quantum-engine-g1.md` (the 3 nulls and their physics).
  - Reports `0001-quantum-core.md` and `0001-backend-job.md`.
  - Vision §8.4 and §10.3–10.7.
  - Platform's `echo/contracts.js` and `echo/CONTRACTS.md` via `git show lane/platform/integration:…` (6378677).
  - `evidence/quantum-core/{sabotage_round.py,sabotage.md,transcript.py}`.
- **Already known:** the 3 sabotage nulls, physics-identical by G1's account. The proposed contract's added fields were `kind`, `details` and `circuitText`. `qollab_job` used `experiment: 'bell_verification'` and `summary`.
- **Reused:**
  - quantum-core's sabotage harness (`core.run`, `core.MUTATIONS`), imported rather than copied.
  - `transcript.py`, re-run for the new fields.
  - Platform's validator, run as-is and never re-implemented.
  - `where.mjs probability_table --branches`: nothing found before I wrote it.
- **Stale:** `vault/Design/experiment-result-contract.md` was written before platform's file existed. Its `kind`, `details` and `circuitText` fields are rejected. I marked it `status: outdated` with that reason and a link to the new report; its call table is still accurate. `evidence/quantum-core/transcript.txt` showed the retired fields, so I regenerated it with its own script. The fidelity table is unchanged.
- **Written back:** `vault/Reports/contract-conformance.md` (measured findings). The hubs are left to the loop: `vault-hubs --check` reports Reports/README and Map as STALE, as expected.

## Per-function conformance (platform validator, lane/platform/integration 6378677)

| function | calls | before: rejected | before: errors | after: rejected | after: errors |
|---|---|---|---|---|---|
| `cloning.run_calibration` (7 states) | 7 | 7 | unknown `kind`, `circuitText`, `details`; no `keyQubits` | 0 | — |
| `entanglement.bell_signalling` (I/X/Z) | 3 | 3 | same | 0 | — |
| `teleportation.bell_measurement` (seeded + unseeded) | 14 | 14 | unknown `kind`, `details`; no `keyQubits` | 0 | — |
| `teleportation.teleport_branch` (7 × 4 branches × 4 choices) | 112 | 112 | same | 0 | — |
| `teleportation.verify_deferred` (7 × 4 on/off) | 28 | 28 | unknown `kind`, `circuitText`, `details` | 0 | — |
| `teleportation.corrections_withheld` | 7 | 7 | unknown `kind`, `details` | 0 | — |
| `teleportation.live_commit` | 7 | 7 | same + no `keyQubits` | 0 | — |
| `qollab_job.interpret_counts` (fake counts; shots 256 and 300) | 2 | 2 | unknown `summary`; `bell_verification`; no `keyQubits` | 2 | `bell_verification` only |
| `qollab_job.run_bell_verification_once` (fake backend) | 1 | 1 | same | 1 | `bell_verification` only |
| **total** | **181** | **181** | | **3** | |

Full per-call output is in `evidence/quantum/contract-conformance/before.txt` and `after.txt`. With the requested value added it is `after-with-request.txt` (0 rejected).

**To rerun it yourself:**
```
git show lane/platform/integration:echo/contracts.js > /tmp/x/contracts.js
python3 evidence/quantum/contract-conformance/dump_results.py > /tmp/x/r.jsonl
node evidence/quantum/contract-conformance/validate.mjs /tmp/x/contracts.js /tmp/x/r.jsonl   # exit 1, 3 rejected
```

## What changed (commits `e1a9d5c`, `42703f1`)

The retired fields, and where their content went:

| was | now | why it keeps its meaning |
|---|---|---|
| labelled keys `"source=0,copy=1"`, `"m0=1,m1=0"`, `"sender=…"` | Qiskit keys + `keyQubits` (`[1,0]`, or `[1]` for the relay) | the contract's endianness guard; every outcome is listed, zeros included |
| cloning `details.sourcePurity/copyPurity/…Fidelity/jointFidelityWithTwoCopies` | `observables.purityQ0/purityQ1/fidelityQ0WithInput/fidelityQ1WithInput/jointFidelityWithTwoCopies` | exact numbers; the names are platform's `purityQ0/Q1` |
| `isTwoIndependentCopies`, `isEntangled` | `facts` (they were already there) | CONTRACTS: the "verdict in facts" |
| `amplitudes` | dropped | the relative phase still reaches the result: `jointFidelityWithTwoCopies` is 0.5 for plus, 0 for minus and 0.25 for phase, and a new test pins all three |
| relay joint table as `probabilities` | `probabilities` = **receiver-only marginal** (`keyQubits [1]`); joint record kept as `observables.zBasisAgreement/xBasisAgreement` | the joint table changes with X, so showing it as "the result" would look like signalling |
| `receiverBlochVector` / `receiverAverageState` | `observables.receiverBlochX/Y/Z` (+ `receiverPurity`) | the Bloch vector fixes a 1-qubit state completely |
| `choiceFollowsRule`, `expectedCorrections`, `appliedCorrections` | facts ("the rule asks for X OFF, Z ON") + `measurementBits` | vision §10.6 puts `correctionsMatch` in the UI; the engine reports physics |
| `shots: 1`, `seed` (exact sample) | `parameters.seed`, only when given; the facts already say "One sample" | `shots` would read as a shot count under an exact engine |
| `qollab_job` `summary` (shots, correlated, fraction, qubitOnes) | dropped; `counts` + `keyQubits` + facts ("70 of 100 shots (70.0%)…") | these are SAMPLED tallies, and `observables` is defined as exact; the UI can recompute them from counts |
| `kind` | dropped | the caller knows which function it called; the deferred check's honesty sits in its facts and circuitDescription (coherent `CX(q1,q2); CZ(q0,q2)`) |
| `circuitText` | dropped | not displayed by anyone yet; can be appended to `circuitDescription` if story-ui wants it |

Other changes:
- `formats.experiment_result` now applies the validator's own rules before anything reaches JS: `keyQubits` shape and key length, flat parameters, numeric observables, fidelity range, selected-backend-needs-counts, and the 1e-9 sum tolerance.
- `qollab_job` now goes through the builder too, so the forbidden-claim guard covers it.
- `complex_pair` was deleted (dead).
- New helper `quantum.probability_table(state, qargs)`.

Tests:
- One enumeration, `conftest.bridge_calls()` (181 calls), is shared by the plainness sweep, the conformance test and the evidence dump. It replaces the sweep's private `every_result()`.
- Assertions on removed fields were rewritten against the new fields at equal or greater strength. Some are now stronger: branch tests also check Bob's Bloch vector against the hand state, and `qollab_job` tests read bits through the result's own `keyQubits`.

## Cloning: can the dict tell source from copy?
**On the real circuit, no, for every catalogue state.**
- CX on `a|0>+b|1>` ⊗ `|0>` gives `a|00>+b|11>`, which is unchanged by swapping the two qubits. So `partial_trace(joint,[1]) == partial_trace(joint,[0]) == diag(|a|²,|b|²)` exactly, and every purity and fidelity is identical. See the transcript: for bloch_a, `purityQ0 = purityQ1 = fidelityQ0 = fidelityQ1 = 0.5883338296`.
- The relay has the same property (both marginals are I/2, and `(X⊗I)Φ+ = (I⊗X)Φ+`).

**The check that bites:** `test_source_and_copy_are_labelled_by_qubit` disables the CNOT through a `QuantumCircuit` subclass, which breaks the symmetry. The state becomes ψ⊗|0>.
- Hand values: `fidelityQ0WithInput = 1` and `fidelityQ1WithInput = |a|² ≈ 0.710`.
- Under `trace-wrong-qubit-cloning`, Q1 reads 1 and the test goes **red** (1 failed).
- `test_receiver_is_q1_and_the_gate_acts_on_q0` does the same for the relay, and turns both `trace-wrong-qubit-receiver` and `sender-gate-on-receiver` red.

## Sabotage (evidence/quantum/contract-conformance/sabotage.md): 28 mutations, 0 nulls
- quantum-core's 19 were re-run on the new code; all are red.
- `formats-allow-complex` went NULL after my change, because the builder's new per-field type checks became a second guard. I fixed it with a direct `formats.plain` refusal test, and it is red again (4 failed).
- My 8 contract mutations are all red:
  - re-add `kind`;
  - `keyQubits` reversed in cloning (valid shape, wrong order; 7 failed);
  - `keyQubits` reversed in teleportation (112 failed);
  - relay shows the joint table;
  - `summary` re-grown;
  - bool allowed in observables;
  - verdict as observable;
  - withheld drops the Bloch vector.
- **Gate sabotage:** with `contracts.js` replaced by a stub that accepts everything, the positive control `test_the_validator_bites` goes red.
- **Nulls:** none in this round.

## Evidence paths
All in `evidence/quantum/contract-conformance/`; `README.md` maps each artifact to its producer.
- `before.txt` / `after.txt` / `after-with-request.txt`
- `red-on-old-code.txt`
- `sabotage.md`
- `pytest-after.txt`

Also `vault/Reports/contract-conformance.md`.

## Not verified
- **Pyodide/Qollab:** not run. In particular, `.toJs({dict_converter: Object.fromEntries})` on lists (`keyQubits`, `facts`) is unconfirmed. Smoke plan §2.3 is updated to check `observables.purityQ0 === 0.5` and `keyQubits`.
- **Node at test time:** `test_contract_conformance.py` needs Node and a `contracts.js`, from `$ECHO_CONTRACTS_JS`, `echo/contracts.js` or `git show lane/platform/integration:…`. If any of these is missing the test **fails** with a reason, by design: a missing input is a failure, not a skip. Justification: a Python copy of the validator would drift. Once platform's file lands in `echo/`, the git fallback is never used.
- **The pending-gap filter:** the test tolerates exactly one error string, `experiment … got string "bell_verification"`, and only on `bell_verification` results. If platform adds the value, the error disappears and the filter does nothing. If platform picks a different name, the string changes and the test goes red, which is intended.
- **No UI was checked.** No consumer of these fields exists yet in `echo/ui/` on this branch, so there are no screenshots of a terminal rendering a result.

## Requests to platform (exact, minimal)
1. **`EXPERIMENTS`: add `'bell_verification'`.** That is one line in `echo/contracts.js` (`nameTable('EXPERIMENTS', ['cloning', 'bell_signalling', 'teleportation', 'bell_verification'])`), plus a row in CONTRACTS.md's §10.x table: `bell_verification | counts + keyQubits [1, 0] | parameters: {shots, backend}`.
   - **Why:** vision §8.4 requires `verifySelectedBackendOnce(): Promise<ExperimentResult>`, but §8.4's union has no value for it. §10.7 forbids presenting it as teleportation. It is not the relay's no-signalling experiment either: no sender gate, sampled counts, a different terminal.
   - Labelling it `bell_signalling` would merge the backend showcase with the relay puzzle in any UI that dispatches on `experiment`.
   - **Measured:** with this one change, 0 of 181 are rejected.
2. **(Information, no change needed.)** CONTRACTS.md's teleportation row suggests `parameters: {"stateId", "correctionX", "correctionZ"}`. The engine uses `state`, `applyX` and `applyZ` (plus `m0`/`m1`), consistent with the cloning row's `state`. If platform wants the other names, say so and I will rename. They are inputs, so no honesty is at stake.
3. Not requested: `kind`, `details` and `circuitText`. The contract can express everything the physics needs without them.

## Questions for the owner
- None that block. The `bell_verification` value is a platform/owner contract decision; the vision's §8.4 union and its `verifySelectedBackendOnce` signature contradict each other. Does the owner accept `'bell_verification'` as the fourth experiment value?

## What the supervisor should do next
1. Forward request 1 (`'bell_verification'`) to platform. When it lands, rerun `validate.mjs` against the new `contracts.js`: expect `181 graded, 0 rejected`, exit 0.
2. Merge `lane/quantum/contract-conformance`: `e1a9d5c` is the code and evidence, `42703f1` the vault notes. It supersedes the field names in reports 0001 and quantum-core's transcript.
3. Tell story-ui to render from the new field names:
   - `observables.*`;
   - `keyQubits` for table keys;
   - the relay table is the receiver-only marginal;
   - verdicts are in `facts`;
   - the rooftop "correct?" check uses §10.6 `correctionsMatch(measurementBits, choice)`.
4. The owner's G0 smoke should confirm that `toJs({dict_converter})` turns `keyQubits`/`facts` into Arrays on Qollab's Pyodide.
