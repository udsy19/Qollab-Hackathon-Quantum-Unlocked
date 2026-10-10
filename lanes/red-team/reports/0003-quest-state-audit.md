## TL;DR (CHECKPOINT 1, PARTIAL — harness not yet run)
- Expected transition table written from V§9.2 + owner rulings BEFORE reading state.js: commit ebed844, `evidence/red-team/quest-state-audit/expected.mjs`.
- Exported gameplay d5ec620 (echo/game: state.js, missionRules.js, objectives.js, eventBus.js) and platform 6378677 (contracts.js) to /tmp/qsa.
- Code read; early suspected gaps (to be proven by harness): no bits!=00 guard on dry run (RG3.2); no story-token latch after a failed live commit (RG3.1); no "result panel shown" guard on acknowledgements (R13.13); no fresh-state enforcement (R13.11); gameplay table diverges from contracts.js (BOOTED vs BOOT_COMPLETE etc.); neither table has DECLASSIFIED->ENDING (R13.1).
- Prior art: lane/gameplay/integration vault/Reports/quest-core-adversarial-review.md already reported F1 (two tables), F4 (token unlatched), H (bits 00). I am re-deriving from the docs, not copying.
- Next: Node harness driving the real modules, positive controls + sabotage round, vault report.
