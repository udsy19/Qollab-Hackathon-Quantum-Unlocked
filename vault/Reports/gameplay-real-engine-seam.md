---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
lane: gameplay
---

# Real-engine seam: gameplay quest rules fed real Qiskit results

Measured 2026-10-10. Quantum `lane/quantum/integration` @ d9b42d0 (226 real results). Gameplay
`lane/gameplay/integration` @ c49a922. Contracts v2 on `main` @ 99dfc54. Scripts and outputs:
`evidence/gameplay/real-engine-seam/` (its README re-runs everything in about 10 s). Worker report:
`lanes/gameplay/reports/0006-gameplay-real-engine-seam.md`. Earlier red-team measurement on older
heads: [[Reports/quest-core-adversarial-review]] (the fake matches Qiskit) and red-team
`physics-code-audit` (12/13 cross-lane checks failed against quantum @ a9edce2).

## Durable findings
- **The engine's physics is right.** For 184 teleport rows (16 (m0,m1,X,Z) combinations on 8 generic
  and 3 named states, plus 8 commits), the engine's fidelity matches an independent numpy simulation to
  within 1e-9. That simulation uses the opposite qubit order and shares no code with the engine.
- **Gameplay as built stalls at CLONE_INTRO.** Only 5 of the 44 rows the docs say must advance do
  advance, and all 5 are Mission 2. Running gameplay on main's v2 contracts changes no row. The defect
  is in field names, not in the contracts version.
- **Every real commit leaves the latch `measured_refused_awaiting_ruling`** (8 of 8). The token is
  spent and the quest can never reach the ending. The cause is that gameplay requires
  `parameters.stateId === 'story_token'` and `parameters.correctionX/Z`, while the engine's
  `live_commit` emits `{state, seed}`. **v2 has no commit contract at all.**
- **If only the field names are made to agree, the quest reaches CREDITS on real results** (names-only
  shim). After that, 41 of 44 must-advance rows match the docs. The 3 that still fail are Mission 1
  states outside gameplay's `['plus','phase']` name list. In addition, 9 correct choices on
  non-generic named states advance against the generic-state ruling, because gameplay does not call
  v2's `dryRunVerdict`.
- **The v2 side is short of exactly one input.** With `theta`/`phi` echoed in the parameters, all
  160 phase-1 and phase-2 engine results pass v2's validators, and the 24 correct non-00 choices out
  of 24 unlock the commit. The engine takes state NAMES, not `{theta, phi}`.
- **The fidelity guard holds on real results** (452 checks). Two sabotages each turn it red:
  FIDELITY_OK 0.999999→0.9, and removing the fidelity check. **Nulls:**
  - v2 `FIDELITY_PASS`→0.9 on its own stays green, because the 1e-6 cross-check refuses 0.9999 first;
  - the cross-check removed on its own stays green, because the threshold still refuses it;
  - with gameplay's rule check removed, the guard stays green on generic states (worst wrong F =
    0.838) and goes red only on named states, where 12 wrong choices score F = 1.
- **v2's own good fixture `good[2]` still uses the v1 names** (`stateId`, `correctionX/Z`, no
  theta/phi). Gameplay advances CORRECT_CALIBRATION on it, which is a non-generic `plus` state. v2's
  worked correct example (`teleport-fixtures.json` correction[1]) is refused by gameplay.
- **Backend verification:** the engine emits `experiment: "bell_verification"`, and v2 refuses all 3
  results (v2 requires `backend_verification`).
