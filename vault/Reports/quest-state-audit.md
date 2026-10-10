---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: red-team
---

# Quest-state audit: can the quest reach the ending only honestly?

**Scope.** This audit covers gameplay `d5ec620` (`echo/game/state.js`, `missionRules.js`, `objectives.js`, `eventBus.js`) and platform `6378677` (`echo/contracts.js`). Every claim below is about those two commits only. Between `d5ec620` and the gameplay tip `31a60f2`, `echo/` is unchanged; between `6378677` and the platform tip `939a57d`, `contracts.js` is unchanged.

**Harness.** The harness is `evidence/red-team/quest-state-audit/` (README there). It drives the real modules in Node and fires every event in every reachable state. It compares the results against a table derived from V§9.2 plus the owner's rulings, which was committed (ebed844) before `state.js` was read. Every fidelity it feeds in comes from a JS statevector oracle that agrees with Qiskit to 4.4e-16 over 128 cases.

**Result.** 21 checks: 13 green, 8 red. The sabotage round ran 23 scenarios, all as expected, and every check went red at least once. The audited export was byte-identical afterwards.

## Verdict per goal (at d5ec620 + 6378677)

| goal | verdict | evidence |
|---|---|---|
| The player cannot skip a mission | **HOLDS at the FSM**, in both tables. Reachability with each mission state removed: ENDING is unreachable. A 3000-walk fuzz found no double commit. | `GAME-NOSKIP`, `CONTRACT-NOSKIP`, `*-ENDING-ENTRY` green; sabotages S3–S7 red |
| The token is measured once, at commit | **HOLDS at the FSM edge; FAILS below it.** A second story-token result after a recorded wrong-correction commit still yields `COMMIT_TRANSFER`. | `TOKEN-LATCH` red; `*-COMMIT-ONCE`, `TOKEN-ELSEWHERE` green |
| A wrong dry run retries on a fresh state | **NOT ENFORCED.** A retry on the same `stateId`/θ/φ passes. | `FRESH` red |
| The ending comes only after m0, m1 were seen and corrections chosen | **PARTLY.** All four X/Z choices are graded correctly against physics. But bits 00 with no correction unlocks COMMIT (RG3.2), and no bits-first contract exists. | `DRY-RULE` green, `DRY-00` red |
| Acknowledgements only after the result panel was shown | **NOT ENFORCED** | `ACK` red |

## Findings

| id | sev | where (audited commit) | reproduction | lane |
|---|---|---|---|---|
| Q1 | HIGH | `missionRules.js:54-58` | `TOKEN-LATCH`: in TELEPORT_DRY_RUN_PASSED, feed a story-token result with bits 11 and no corrections (F=0.076, refused). Then feed a second story-token result: it yields `COMMIT_TRANSFER`. Nothing records that the token was measured. This is V§7.4 "do not let the player re-run teleportation of the already-measured token" and RG3.1 "latched once recorded". Already reported as F4 in the gameplay review; reproduced here independently. | gameplay |
| Q2 | HIGH | `missionRules.js:48-53`, `:24-33` | `DRY-00`: a calibration with m0=0, m1=0 and no corrections (F=1) yields `CORRECT_CALIBRATION`. COMMIT unlocks without the player ever applying X or Z (RG3.2). Note: RG3.2 is dated 2026-10-10 and the commit 2026-10-09 23:32. | gameplay |
| Q3 | MED | `missionRules.js:48-53`; the claim at `state.js:34-35` | `FRESH`: after a wrong dry run on `calibration_A`, a correct retry on the same state is accepted. The comment says "retries on a fresh calibration qubit", but nothing enforces it (R13.11). | gameplay (state generation is quantum's, R13.7) |
| Q4 | MED | `state.js:43,48,95-104` | `ACK`: `EXPLANATION_READ` and `VIEW_RECEIVER_MARGINAL` are accepted 0 ms after entering the state, with no panel signal (R13.13). | gameplay (+ story-ui must call the signal) |
| Q5 | MED | `state.js:37` vs `contracts.js:37` | `PARITY`/`GAME-EDGES`: gameplay names the boot event `BOOTED`; contracts and R13.1 name it `BOOT_COMPLETE`. A caller using the contract name is refused at BOOT, and the game stays on BOOT. | gameplay |
| Q6 | MED | `state.js:36-58` vs `contracts.js:36-59` | `PARITY`: there are two quest tables, which is no-bloat drift. Already reported as F1 in the gameplay review; the unlanded `gameplay-contracts-migration` (2d28ec9) imports contracts. | gameplay |
| Q7 | LOW | `state.js:56`, `contracts.js:57` | `*-EDGES`: neither table has DECLASSIFIED → ENDING (R13.1 "DECLASSIFIED → back to ENDING"). | platform (contract), then gameplay |
| Q8 | LOW | `contracts.js:34-35,56` | `CONTRACT-EDGES`: the contract has no RESTART on ENDING (R13.12). Its comment delegates to `resetGame()`, which no contract names. Gameplay has `reset()` → TITLE (`state.js:108`), which satisfies R13.12 on that side. | platform |
| Q9 | LOW | `state.js:56-57` | `GAME-EXTRA`: these edges are undocumented: DECLASSIFIED/CREDITS --RESTART--> TITLE and CREDITS --OPEN_SCIENCE--> DECLASSIFIED. They are benign, but they are not in V§9.2 or the contract. | gameplay ↔ platform |
| Q10 | INFO | `state.js:95` | `send()` accepts mission-outcome events (`BASIS_DEMO_OK`, `CORRECT_CALIBRATION`, `COMMIT_TRANSFER`) from any caller. Binding them to a result lives only in the convention that terminals route through `eventForResult`. At d5ec620 no terminal exists to check. | gameplay |
| Q11 | INFO | `contracts.js` (whole file) | "Bits first, corrections second" (owner § red-team physics (2)) has no contract: there is no two-step dry-run shape. It cannot be verified at 6378677. | platform |

## Nulls and what this cannot see

- **S13n, the teleport fidelity gate, is redundant.** Removing `fidelity < 0.999999` turns nothing red, because the rule also matches corrections to bits. Trap T2 bites only on the clone mission (S13).
- **Physical measurement is not visible from the rules.** "Measured exactly once" is graded at the rules/FSM layer only. At d5ec620, `echo/` contains no terminal, adapter or `main.js` that calls quantum, so no number here says how many times a real build measures the token.
- **Field names.** Result field names come from `missionRules.js`'s own header, the only seam (V§8.4 leaves them open).
- **No browser.** Nothing here was run in a browser, the local runner or Qollab.

## Related

- [[Reports/physics-oracle-audit]]: checklist C4 and trap T1/T2 (the source of this audit's token and threshold checks)
- `lane/gameplay/integration:vault/Reports/quest-core-adversarial-review.md`: prior review of the same commit (F1, F4, H); Q1 and Q6 reproduce it independently
- [[Research/judging-rubric]]
