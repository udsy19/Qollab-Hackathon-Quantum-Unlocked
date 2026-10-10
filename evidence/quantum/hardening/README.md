# quantum-hardening evidence (lane quantum, consult 5)

Measured on branch `lane/quantum/quantum-hardening` with python 3.13.0, qiskit 2.5.2 (local venv) and
Node. **Not run in Pyodide or on Qollab.** contracts.js = `lane/platform/integration` @ 43be7d9
(contracts-v2 merged), see `validator-commit.txt`.

| file | what | producer |
|---|---|---|
| `red-before/F3-F4-new-tests-on-pre-fix-code.txt` | F3/F4 tests red on the pre-fix engine (951ec9f) | pytest |
| `red-before/F1-F5-F6-F7-mutations-on-pre-fix-code.txt` | each finding's mutation on the pre-fix engine, with and without the new tests | `/tmp/qh-redbefore.py` (inline in the report) |
| `pytest-full.txt` | full suite, exit 0 | `pytest echo/tests` |
| `results.jsonl`, `validate.txt` | all 233 bridge calls through platform's real `validateExperimentResult` (v2): 0 rejected | `contract-conformance/dump_results.py` + `validate.mjs` |
| `validate-against-pre-v2-4e1b2ed.txt` | the same results against the pre-v2 contract: only the 3 `backend_verification` rejections | same |
| `derive.py`, `derive.out` | independent kron-matrix re-derivation of 2034 numbers (named + engine-drawn calibration states), worst 4.97e-11 | this folder |
| `sabotage.py`, `sabotage.md` | 42 mutations on disposable copies: 38 red, 4 null (3 true physics, 1 correct-physics control) | this folder; run with the venv python |
| `transcript.py`, `transcript.txt` | one player path: relay EXACT → dry run fail → fresh state → pass (non-00) → commit → refused → reset → commit | this folder |

Re-run: `PY=<venv>/bin/python; git show lane/platform/integration:echo/contracts.js > /tmp/qh-contracts.js;
ECHO_CONTRACTS_JS=/tmp/qh-contracts.js $PY evidence/quantum/hardening/sabotage.py echo`.
