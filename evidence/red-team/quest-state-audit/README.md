# quest-state-audit: can ECHO's quest only reach the ending honestly?

Red-team harness for the quest machine. It audits **gameplay `d5ec620`** (`echo/game/`) and **platform
`6378677`** (`echo/contracts.js`). The report is `vault/Reports/quest-state-audit.md`.

## Run it

```bash
bash evidence/red-team/quest-state-audit/reproduce.sh            # fresh git-archive export, then run + sabotage
bash evidence/red-team/quest-state-audit/reproduce.sh <gp> <pf>  # any other pair of refs
/path/to/.venv/bin/python -I evidence/red-team/quest-state-audit/crosscheck.py   # oracle vs Qiskit
```

`run.mjs` exits 0 when every check is green, 1 when any check is red, and 2 when it refused (an import
failed, the harness crashed, or zero checks ran). `sabotage.mjs` exits 0 only when every scenario behaves
as expected.

## Files

| file | what it is |
|---|---|
| `expected.mjs` | The expected table and properties. It comes from V§9.1/§9.2 and the owner's rulings, each row cited. It was committed (ebed844) **before** `state.js` was read. |
| `oracle.mjs` | A 3-qubit statevector simulation in plain JS. It supplies every fidelity the harness feeds in and derives the X/Z rule by search. |
| `crosscheck.py` | Compares `oracle.mjs` with `evidence/red-team/physics-oracle/physics_oracle.py` (Qiskit): 128 fidelities, max diff 4.4e-16 (`out/crosscheck.txt`). |
| `run.mjs` | Imports the real modules from an export. It runs a BFS over the real machine with every event in every reachable state, then 21 checks. |
| `sabotage.mjs` | Runs on disposable copies only, in three modes: **break** a green check (it must go newly red); **fix** every red check (all must go green, which is the positive control); **leave-one-out** (each red check is attributable to its own fix). |
| `out/baseline.txt`, `out/baseline.json` | 13 green, 8 red on d5ec620 + 6378677. |
| `out/sabotage.txt`, `out/sabotage.json`, `out/coverage.txt` | 23 of 23 scenarios as expected. All 21 checks went red at least once. |
| `out/audited-export.sha256` | Hashes of the audited files. The export was re-exported after the sabotage round and is byte-identical. |
| `out/bonus-2d28ec9.txt` | **Not a graded result.** This was a run on the unlanded `lane/gameplay/gameplay-contracts-migration`, whose API changed. The harness cannot walk it, so its reds there are adapter artefacts. |

## Independence (gate-independence laws 2, 4, 8)

- **Expected transitions:** these come only from the docs. The producer's `TRANSITIONS` is read only to widen the set of probed event names, never as truth.
- **Fidelities:** these come from `oracle.mjs`, which is cross-checked against Qiskit. No fidelity is typed by hand.
- **The one seam the harness trusts:** the `ExperimentResult` field names that `missionRules.js` documents in its header. No document fixes these yet (V§8.4 leaves them open).
- **The ACK walking aid (law 4a):** to walk past acknowledgements, the harness calls `noteResultShown()` (the name used by its own positive-control fix) or `resultPanelShown()` (the name on the migration branch) if either exists. Check `ACK` itself uses neither: it fires the acknowledgement raw and expects a refusal.

## Nulls (sabotage that did not go red)

- **S13n:** removing the teleport fidelity gate (`fidelity < 0.999999`) turns nothing red. The rule also requires the corrections to match the bits, so on the teleport side the threshold is redundant. Trap T2 is therefore not exercised by teleport. It is exercised on the clone side (S13).
- **Masked checks:** checks already red at baseline cannot go "newly" red. Their bite is shown by leave-one-out instead.
