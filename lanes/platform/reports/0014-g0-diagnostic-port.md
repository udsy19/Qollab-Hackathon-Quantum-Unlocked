# 0014 g0-diagnostic-port — CHECKPOINT (in progress)

## TL;DR
- IN PROGRESS, local runner only. Branch `lane/platform/g0-diagnostic-port`: e8399ab (check first, red 17/31 on the unported shell), then the port commit (diag + guarded auto-send + Cancel + keep-alive in the shell's main.js, build `integration-shell-diag-1`).
- Found: the shell's Verify was dead on the current quantum tip (`build_bell_verification_circuit` no longer exists; renamed to `build_backend_verification_circuit`). Fixed in main.js.
- Builtin auto and button scenarios: green apart from one now-INFO line (a quest console line after Done. is lost; see final report).
- Next: the sabotage round, ionq-mock runs, smoke-test doc, vault notes.
