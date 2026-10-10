# main-sync: lane/quantum carries main; quantum vs platform gates (2026-10-10)

Merged tree: `ab2ea6f` (`HEAD.txt`), the merge of `main` @ 99dfc54, which carries contracts v2 80d685f.
Graded with main's `echo/contracts.js`. Everything here ran locally (Python 3.13, qiskit 2.5.2, Node).
It was **not** run in Pyodide or on Qollab. Findings: `vault/Reports/quantum-vs-contracts-v2.md`.

| file | what |
|---|---|
| `contract-check.log` | `node tools/contract-check/check.mjs` on the merged tree: GREEN 1087/1087, exit 0. It grades **contracts.js only**, not the engine. |
| `qollab-caps.log` | `node tools/qollab-caps/check.mjs` on the merged tree: RED, 6 findings, exit 1 |
| `pc-contract-check.log` | positive control: X/Z rule swapped in a disposable copy of contracts.js → RED 18 FAIL, exit 1 |
| `contract-check-sabotage.log` | platform's own `sabotage.py`: 49 cases, 0 mismatches, and 6 declared nulls |
| `pc-qollab-caps-plant.log` | positive control: localStorage planted in a copy of bridge.js → a new `storage` finding at bridge.js:118, exit 1 |
| `pc-qollab-caps-green.log` | completeness control: a copy with ONLY the 6 findings removed → GREEN, exit 0. With 1 JS backend.run added → still GREEN, 1 site. |
| `results-*.jsonl`, `validate-v2-*.log` | every bridge call (each tree's conftest `bridge_calls()`) graded with `validateExperimentResult` (harness reused from `evidence/quantum/contract-conformance/`) |
| `pc-rename-control.log` | merged results with only `bell_verification`→`backend_verification` renamed: 1 rejection left (shots=300) |
| `dump_teleport_v2.py`, `validate_teleport_v2.mjs` | the dry run graded with v2's `validateTeleportBitsResult` and `validateTeleportCorrectionResult`. Requests are typed from contracts' `TELEPORT_TEST_STATE`, never read from the engine. |
| `teleport-*.jsonl`, `validate-teleport-v2-*.log` | the dry-run grading, per tree (merged, hardening 0893403, hardening 2ac6c6c) |
| `teleport-injected.jsonl`, `validate-teleport-v2-injected.log` | merged results with theta/phi injected: only the missing entry point stays red. The fidelities agree with v2's cross-check. |
| `pc-teleport-validator.log` | positive control: a forged fidelity and a swapped theta planted → both rejected, exit 1 |
| `probe_shots.py`, `shots-*.jsonl`, `validate-shots-*.log` | `interpret_counts` with shots ≠ 256 (drift 255 / requested 300) → rejected on both trees |
| `pytest-merged.log`, `pytest-premerge.log` | 452 passed, 1 failed on both. The same test (`test_contract_conformance`) fails for the same `bell_verification` reason before and after the merge. |

Re-run (from the worktree root):
```
node tools/contract-check/check.mjs; node tools/qollab-caps/check.mjs   # run qollab-caps BEFORE pytest, or __pycache__ inflates the file count
python3 -I evidence/quantum/contract-conformance/dump_results.py "$PWD/echo" > /tmp/r.jsonl && node evidence/quantum/contract-conformance/validate.mjs echo/contracts.js /tmp/r.jsonl
python3 -I evidence/quantum/main-sync/dump_teleport_v2.py "$PWD/echo" > /tmp/t.jsonl && node evidence/quantum/main-sync/validate_teleport_v2.mjs echo/contracts.js /tmp/t.jsonl
pytest echo/tests -q
```
