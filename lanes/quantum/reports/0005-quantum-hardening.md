## TL;DR
CHECKPOINT (00:05 ET) — in progress, nothing committed yet.
- Baseline: lane/quantum/quantum-hardening @ 951ec9f, `pytest echo/tests` 453 passed.
- Design fixed: dry run = `bell_measurement("calibration")` (draws a fresh generic Bloch point, returns theta/phi in `parameters`) → `teleport_branch("calibration", m0, m1, X, Z, theta=, phi=)`; `live_commit()` uses the hidden `token`, latches on success; `reset_story_token()`.
- Found: physics-review `sabotage.py`/`derive.py` needles are stale after contract-conformance (`details`, labelled keys); a fresh harness goes in `evidence/quantum/hardening/`.
- F7 appears already closed (interpret_counts calls `experiment_result`); will prove with a spy test + mutation.
Next: tests first for F1/F3/F4/F5/F6/F7, red-before capture, then the refactor.
