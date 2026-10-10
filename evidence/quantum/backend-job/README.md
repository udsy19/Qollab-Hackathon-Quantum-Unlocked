# evidence/quantum/backend-job

Produced by agent `backend-job` (lane quantum), 2026-10-09, on branch `lane/quantum/backend-job`.
Interpreter: `/Users/udsy/PycharmProjects/Qollab-Hackathon-Quantum-Unlocked/.venv/bin/python` (3.13.0, qiskit 2.5.2, qiskit-ionq 1.1.1). Local runs only; nothing ran on Qollab or IonQ.

| file | command | exit |
|---|---|---|
| `pytest.log` | `python -m pytest echo/tests/test_qollab_job.py -v -p no:cacheprovider` | 0 (32 passed) |
| `sabotage-table.txt` | `zsh evidence/quantum/backend-job/sabotage.sh` | 0 (the script reports; each row is one sabotage) |
| `sabotage.sh` | copies `echo/` to a fresh temp dir for every row, applies one edit to `qollab_job.py`, runs the tests there. It never edits the worktree. S0 is a no-op control. A row prints `REFUSED` if its edit did not apply. | — |

Null: **S5** (drop the empty-dict check) stays green, because `{}` then reaches the zero-shot check, which also raises `ValueError`. S5 and S6 together → 2 failed (run by hand 2026-10-09).
