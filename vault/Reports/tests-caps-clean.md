---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---

# Quantum tests no longer trip the Qollab caps gate

Lane quantum, consult 11, branch `lane/quantum/tests-caps-clean`, commit `ce65a30`. Closes gap rows 4–5 of
[[quantum-vs-contracts-v2]] against the rule table in [[qollab-caps-gate]]. Measured locally with Python 3.13,
qiskit 2.5.2 and Node. **Not run on Qollab.** Evidence: `evidence/quantum/tests-caps-clean/`.

## What changed in `echo/tests/test_qollab_job.py`

| finding (before) | protects | change |
|---|---|---|
| `:91 hardcoded-backend ionq_job` | our key-order reading of qiskit-ionq's histogram→counts mapping | `importlib.import_module("qiskit_ionq.ionq_job")` — caps scans that string and classes it as a non-id (info line), so this does not use a blind spot |
| `:207 hardcoded-backend "ionq_simulator"` | `qollab_job.py` never names a backend | pattern is now `ionq[_.\-]?simulator`: no literal id ships, and it is BROADER |
| `:207 hardcoded-secret api_key` | `qollab_job.py` never reads a key | pattern is now `api[_-]?key\|token`: no literal key name ships, and it is BROADER |

## Measured

- caps: 6 findings → 3 (`entry-index`, `entry-main`, `backend-run-python`, owned by platform and bridge-rewire).
- pytest `echo/tests`: 595 passed before and after.
- Sabotage (`sabotage.sh`, 9 cases on a disposable copy of `echo/`): **the old test had 2 nulls**, so it missed
  `"ionq-simulator"` and `apikey` in `qollab_job.py`. After the edit there are 0 nulls, 9/9 OK, and the script exits 0.

## Side finding

pytest writes gitignored `__pycache__/` inside `echo/`. Caps then scans 34 files instead of 19, and those
files would count toward Qollab's 100-file cap if the folder were uploaded straight from a working tree.
The upload must strip `__pycache__`.
