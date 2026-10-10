# evidence/platform/contracts-commit — validateCommitResult (consult 11)

Measured on `lane/platform/contracts-commit-result` d6939d5 and `lane/platform/contracts-land-2` ae39421 (main 19072fb + one cherry-pick).

| file | command | exit |
|---|---|---|
| check_red_before_impl.txt | `node tools/contract-check/check.mjs` with the new commit checks, BEFORE the implementation | 1 (55 FAIL / 1264) |
| check_green.txt | same, after | 0 (1264/1264) |
| sabotage.txt | `python3 tools/contract-check/sabotage.py` | 0 (101 cases, 10 declared nulls, 0 mismatches) |
| archive_check.txt | `git archive <branch> \| tar -x`, then check.mjs + sabotage.py from the extract, both branches | 0 / 0 |
| land2_mergetree.txt | `git merge-tree --write-tree main lane/platform/contracts-land-2` and `git diff --stat main...land-2` | 0 (clean; 5 contract/gate files) |
| engine_commit_c3adf0a.json | `python3 -I dump_engine_commit.py <git archive lane/quantum/integration c3adf0a>`: REAL `live_commit`, 4 branches | 0 |
| validate_engine_c3adf0a.txt | `node validate_engine_commit.mjs echo/contracts.js engine_commit_c3adf0a.json` | 1 (0/4: no `stateId`, no `applyX/applyZ`) |
| proposed_quantum_patch.diff | the 2-line change asked of quantum, applied to a disposable copy | — |
| engine_commit_c3adf0a_patched.json + validate_engine_c3adf0a_patched.txt | real engine + that patch | 0 (4/4 valid) |
| engine_commit_sabotaged_swap.json + validate_engine_sabotaged_swap.txt | real engine, patch + rule swapped m0<->m1 | 1 (bits 10 and 01 refused, F=0.2065; 00/11 are a physical identity) |
| handmut_*.json + handmut.txt | the valid patched output hand-mutated: fidelity 0.9, bits swapped, marker removed | 1 / 1 / 1 |
