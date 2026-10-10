---
type: report
status: current
date: 2026-10-09
updated: 2026-10-09
lane: gameplay
---

# Quest core: adversarial review (gameplay integration @ d5ec620)

Review of the quest machine and mission rules described in [[Reports/quest-state-machine-contract]]. Repro scripts and their outputs are in `evidence/gameplay-quest-review/` (README says how to re-run). Full report: `lanes/gameplay/reports/0002-gameplay-quest-review.md`.

## Durable findings
- **Two quest tables exist.** `echo/game/state.js` (gameplay) and `echo/contracts.js` (platform, `lane/platform/integration` @ 6378677) disagree:
  - `BOOTED` vs `BOOT_COMPLETE`;
  - platform has no `RESTART` and no `CREDITS→DECLASSIFIED`;
  - `QUEST_STATES` is an array in gameplay and an object in platform;
  - the bus events are `quest:transition`/`quest:enter:*` vs `QUEST_STATE_CHANGED`.

  One must import the other. Per lane ownership, the table belongs in contracts.
- **The synchronous bus plus re-entrant `send` reorders delivery.** A `send` or `reset` called from a listener emits the nested transition before later subscribers receive the outer one. Any world-controller that applies state visuals on `quest:enter:*` needs run-to-completion queuing in the machine.
- **Stale async results need an epoch, not a state-name compare.** Comparing names is ABA-blind across `reset()`: a previous-session clone result advanced the new session's CLONE_INTRO.
- **One-shot story token is enforced at the FSM edge only.** The engine call can teleport `story_token` any number of times. A refused or failed commit has no FSM edge, so the natural UI is a retry, which is a second measurement (§7.4 forbids this). A latch belongs in the adapter.
- **Pauli eigenstates make a wrong correction show fidelity 1.** This was measured with Qiskit: 20 of the 80 wrong choices on zero/one/plus/minus/phase, and 0 on the generic `bloch` state. The rule (corrections first, then fidelity) refuses all of them, but the displayed number contradicts vision l.263. Calibrate on generic states.
- **The fake QuantumEngine matches Qiskit exactly** (119 cases: cloning F/purity, Bell marginals, teleport 7×4×4). Its physics is not in question; its only honesty dependency is that the UI always shows `engine`.
- **The 1000-run quest fuzz found 0 violations on the real table; the planted skip edge in the control gave 6054.** The FSM alone cannot be driven into a skipped mission or a double commit.
