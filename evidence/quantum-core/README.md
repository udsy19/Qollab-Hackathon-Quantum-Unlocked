# evidence/quantum-core: the quantum engine (lane quantum, agent quantum-core)

| file | produced by | what it shows |
|---|---|---|
| `00-red-before-implementation.txt` | `.venv/bin/python -m pytest echo/tests -q`, run before `echo/quantum` existed | the tests were red first (exit 2, no module) |
| `sabotage.md` | `evidence/quantum-core/sabotage_round.py` | each mutation, applied to a disposable copy of `echo/`, with its pytest exit code, nulls included |
| `transcript.txt` | `evidence/quantum-core/transcript.py` | the exact dicts each terminal receives, plus the full 7 states × 4 branches × 4 choices fidelity table |

Python 3.13.0, qiskit 2.5.2 (the local venv). Not run in Pyodide: see `echo/tests/smoke_plan.md` §2.
