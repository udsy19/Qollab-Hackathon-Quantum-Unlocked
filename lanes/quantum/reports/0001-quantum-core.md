## TL;DR
- DONE (local only). The engine `echo/quantum/{__init__,formats,cloning,entanglement,teleportation}.py` and its tests are committed on `lane/quantum/quantum-core` (bf7e715, 3a0fe89, 85bbcef).
- `.venv/bin/python -m pytest echo/tests -q` gives **363 passed, exit 0**. Red first: exit 2, `evidence/quantum-core/00-red-before-implementation.txt`.
- Teleportation: 7 states × 4 branches × 4 X/Z choices. The rule's choice gives ≥0.999999 everywhere. Every value matches an independent numpy simulation written in the test file.
- Sabotage (`evidence/quantum-core/sabotage.md`): 19 mutations, **16 red**. All four from the brief are red. **3 nulls**, each physically indistinguishable (listed below).
- **Design finding:** on |0>, |1>, |+>, |-> and phase, some WRONG correction scores fidelity 1.000000 in every branch. Rooftop dry runs should use a generic state (`bloch_a`/`bloch_b`). This is an owner question.
- Transcript of every terminal's dict: `evidence/quantum-core/transcript.txt`. Proposed contract: `vault/Design/experiment-result-contract.md`.
- **Not verified in Pyodide or on Qollab.** `echo/tests/smoke_plan.md` §2 has the owner steps. The platform adapter must call `.toJs({dict_converter: Object.fromEntries})`; a bare `.toJs()` gives a JS Map.

## Vault check
- **Read:** `vault/AGENTS.md`, `vault/Index.md`, `vault/Missions/echo-hackathon-submission.md` (NOW block), `vault/Research/qollab-platform-and-submission.md` (Pyodide/Python 3.14/Qiskit 2.x, `.callPromising`, data-file rules), `.claude/rules/gate-independence.md`, `vault/CLAUDE.md`, plan row 4 (`node scripts/plan-row.mjs 4`), and lane context. Vision §2.4, §6.4–6.5, §7, §8.2, §8.4–8.5 and §10.2–10.6.
- **Already known:** nothing built. `node scripts/where.mjs cloning --branches` showed hits only in docs on main and HEAD, and no unlanded lane branch.
- **Reused:** the vision's register mapping, gate order and the §10.5 deferred circuit. I kept the §10.2 name `run_calibration`, because `QOLLAB_DEPLOYMENT.md` "First test" step 3 names it.
- **Wrong or stale:** the §10.3 reference sets `isIndependentCloning` by name. Here it is derived from the state, and a sabotage now catches a name lookup. Also, §10.2 shows a bare `.toJs()`. Per Pyodide's documented default, that returns a Map for dicts; this is not checked on Qollab.

## What was built
- `formats.experiment_result(...)`: the guarded §8.4 builder. It uses the vision field names verbatim and adds `kind`, `circuitText` and `details`.
  - It converts numpy scalars, rounds floats to 10 decimals and drops -0.0.
  - It **raises** on complex, NaN/inf, objects or non-str keys.
  - It raises on `probabilities` together with `counts`, on `counts` with `exact_qiskit_local`, and on `probabilities` with `qollab_selected_backend`.
  - It raises on probabilities that don't sum to 1, on bad `measurementBits`, and on forbidden-claim phrases.
- `cloning.run_calibration(state)`: CX(q0 → q1). Returns source/copy purities, the fidelity of each output with ψ, the overlap with ψ⊗ψ, `isTwoIndependentCopies` (derived), `isEntangled`, labelled amplitudes as [re, im] and exact labelled probabilities.
- `entanglement.bell_signalling(I|X|Z)`: receiver marginal from `partial_trace`, purity and Bloch vector, joint Z probabilities with labels `sender=s,receiver=r`, and Z-basis and X-basis agreement. I vs X differs only in the joint record (1 vs 0); Z shows only in the X-basis comparison.
- `teleportation`:
  - `bell_measurement(state, seed|rng)`: one sampled (m0, m1), clearly labelled as one sample.
  - `teleport_branch(state, m0, m1, X, Z)`: the **branch model**. It projects onto the branch, traces out q0 and q1, applies the player's X/Z, and returns the Qiskit `state_fidelity`. It also returns `branchProbability` (0.25), `sourceFidelityAfterMeasurement` (proof that no second copy remains) and `choiceFollowsRule`.
  - `live_commit(state, seed|rng)`: one fresh sample, then the rule applied to those live bits.
  - `corrections_withheld(state)`: I/2 for every input.
  - `verify_deferred(state, controlled_x, controlled_z)`: kind `deferred_measurement_verification`, with facts saying "Mathematical verification … not a physical teleportation link".
  - `expected_corrections(m0, m1)`: the rule, used only for UI text. Fidelities never come from it.
- Tests (`echo/tests/`): `test_cloning.py`, `test_entanglement.py`, `test_teleportation.py`, `test_formats.py` and `conftest.py` (sys.path to `echo/`).
  - The teleportation expectations come from an independent numpy simulation of the 3-qubit circuit (einsum on psi[q0,q1,q2]). That simulation is first cross-checked against the textbook X^m1 Z^m0 ψ.
  - `test_formats.py` sweeps all 150 public results: an exact type census, `json.dumps(allow_nan=False)` with a round-trip, its own forbidden-phrase list, and an AST import allowlist (qiskit, qiskit.quantum_info, numpy, math, random).

## Commands and exit codes
| command | exit | output |
|---|---|---|
| `.venv/bin/python -m pytest echo/tests -q` (before implementation) | 2 | ModuleNotFoundError |
| `.venv/bin/python -m pytest echo/tests -q` | 0 | 363 passed |
| `.venv/bin/python evidence/quantum-core/sabotage_round.py` | 0 | 16 red / 3 null; it refuses (exit 2) if the unmutated suite is not green |
| `.venv/bin/python evidence/quantum-core/transcript.py` | 0 | transcript.txt, 715 lines |
| `node scripts/vault-hubs.mjs --check` | 1 | Design, Reports and Map hubs are STALE: they need the loop's regeneration, and I did not commit hub output, per worker rules |

## Sabotage table (each mutation applied to a disposable copy of echo/)
| mutation | exit | verdict |
|---|---|---|
| X/Z↔m0/m1 swapped in the rule | 1 | red (30 failed) |
| m0/m1 swapped in the Bell projection | 1 | red (52) |
| H(q0) removed from the Bell measurement | 1 | red (284) |
| trace out the wrong qubit: branch / withheld / deferred | 1/1/1 | red (101 / 4 / 22) |
| hardcoded fidelity 1.0: branch / deferred | 1/1 | red (64 / 17); the deferred case was a null until `controlled_x/z` was added |
| deferred without CZ | 1 | red (14) |
| sampler branch order swapped | 1 | red (2) |
| clone verdict by name | 1 | red (1); a null until the test supplied its own disguised states |
| CX removed from the cloner | 1 | red (13) |
| formats: complex allowed / counts on exact / phrase guard removed / numpy int leak | 1 | red (3 / 1 / 1 / 1) |
| **cloning: trace the wrong qubit** | **0** | **NULL.** Source and copy reduced states are identical, diag(abs(a)², abs(b)²) |
| **relay: report the sender's marginal** | **0** | **NULL.** Both halves are I/2 |
| **sender's X applied to the receiver** | **0** | **NULL.** (X⊗I)Φ+ = (I⊗X)Φ+; Z likewise |

## Evidence paths
- `evidence/quantum-core/README.md`
- `00-red-before-implementation.txt`
- `sabotage.md` and `sabotage_round.py`
- `transcript.txt` and `transcript.py`
- `vault/Reports/quantum-engine-g1.md`
- `vault/Design/experiment-result-contract.md` (status: proposed)

## What I did NOT do or could not verify
- **Pyodide / Python 3.14 / Qollab:** not run, because no local Pyodide was available. The venv is CPython 3.13.0 with qiskit 2.5.2. Unknown: package-relative imports through Qollab's dotted loader, `.toJs` shape, and first-call latency.
- **Story-token single use:** `live_commit` has no Python-side once-only lock; module state in Pyodide is the wrong place for story state. The game state machine (gameplay lane) must call it once.
- **Files outside my brief:** I added `echo/tests/conftest.py` and `echo/tests/test_formats.py` (both in the quantum lane's `echo/tests/`). If the `qollab_job` worker also adds a `conftest.py`, expect a trivial merge conflict.
- **Not done:** no session note in `vault/Sessions/`, and the hubs were not regenerated in a commit (worker rule).
- **No independent reviewer:** no reviewer sub-agent was run on the physics. The hand derivations in the tests are the independent path.

## Questions for the owner
1. **Rooftop calibration states.** On |0>, |1>, |+>, |-> and phase, a wrong X/Z can show "fidelity 1.000000" (transcript table). Should the dry run use only generic states (`bloch_a`/`bloch_b`, or a fresh random Bloch point each run) so that every wrong choice visibly fails? Or keep named states and show the engine's "the mistake does not show on this state" fact?
2. **The story token.** Which state is it? Vision §7.4 says "unknown". I can add a `token` entry, for example a fixed generic Bloch point that is never shown to the player. Until you say, `live_commit` accepts any catalogue id.

## What the supervisor should do next
1. Run the `reviewer` agent on commits bf7e715..85bbcef. Focus: hand derivations in `test_teleportation.py` (`hand_protocol`, `cnot`, `cz`) and the `formats` refusal list.
2. Hand `vault/Design/experiment-result-contract.md` to the **platform** lane. It needs the field additions (`kind`, `details`, `circuitText`), the call mapping for `teleportDryRun` (= `bell_measurement` + `teleport_branch`) and `.toJs({dict_converter: Object.fromEntries})`.
3. Tell **gameplay** and **story-ui** about finding 1 (wrong corrections can be invisible on named states), and that `live_commit` must be called exactly once.
4. Put owner questions 1 and 2 to the owner (`=== ASK_OWNER ===`).
5. When the owner next runs Qollab, ask them to do `echo/tests/smoke_plan.md` §2 (steps 1–5) together with the G0 platform smoke test. That is the only path to "verified in Pyodide".
6. After review, propose row 4 done: `node scripts/propose.mjs --row 4 --kind done`.
