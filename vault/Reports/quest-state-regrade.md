---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: red-team
---

# Quest-state regrade: can the consult-6 quest breaks still happen?

**Scope.** This re-grade covers gameplay `7c4741b` `echo/game/` composed with platform `f08dd0b`
`echo/contracts.js`, the shipped composition, because gameplay imports `../contracts.js`. It is fed real
quantum `f7efb92` engine results. The 0003 baseline (d5ec620 + 6378677) was re-run on the same harness.
Every claim here is **local Node module-level**: no browser, no local runner, no Qollab. Harness and
outputs: `evidence/red-team/quest-state-regrade/` (README there). Prior round:
[[Reports/quest-state-audit]].

**Method.** `expected.mjs` is unchanged since ebed844, so the expected table was not touched. Only the
adapter in `run.mjs` was rewritten, so that it drives the migrated API:
- `commitTransfer()` is the only route to COMMIT;
- `resultPanelShown()` is called where a UI would call it;
- tickets and `resetGame()` are exercised.

13 checks were added for the new surface. Every fed `ExperimentResult` is the engine's own (a
names-only seam alias; `PLAYTHROUGH-RAW` uses no alias), and every fed fidelity is re-derived by
`oracle.mjs` to 1e-9. Sabotage round on disposable copies: 27/27 scenarios as expected, every one of the
34 checks red at least once, and the export byte-identical afterwards.

## Baseline: d5ec620+6378677 vs 7c4741b+f08dd0b

15/19 → **27/7** (green/red). With gameplay's own stale `contracts.js` copy instead of f08dd0b's: 25/9.

| consult-6 finding | check | d5ec620 | 7c4741b+f08dd0b |
|---|---|---|---|
| Q1 second token measurement after commit | TOKEN-LATCH, COMMIT-TWICE (incl. concurrent) | red | **green** |
| Q2 bits-00 dry run unlocks COMMIT | DRY-00 | red | **green** |
| Q3 retry on the same state | FRESH | red | **red** |
| Q4 ack without the result panel | ACK, ACK-STALE-PANEL | red | **green** |
| Q5/Q6 two quest tables, BOOTED name | PARITY, GAME-EDGES | red | **green** |
| Q7 DECLASSIFIED → ENDING | *-EDGES | red | **green** (CLOSE_SCIENCE) |
| Q8 no RESTART on ENDING in the contract | CONTRACT-EDGES | red | **green** |
| Q11 bits-first contract | CONTRACT-BITS / BITS-FIRST | red / red | **green** / **red** |
| (new) stale results across resetGame / ABA | STALE-TICKET, TICKET-REPLAY, COMMIT-STALE | red | **green** |

## Findings (at 7c4741b + f08dd0b + quantum f7efb92)

| id | sev | lane | where | what |
|---|---|---|---|---|
| R1 | HIGH | gameplay (seam with quantum) | `missionRules.js:10,31,51,53,73` | `PLAYTHROUGH-RAW`: real engine results as emitted stall the quest at CLONE_INTRO. Gameplay reads `stateId`, `correctionX/Z` and top-level clone `fidelity`. The engine (and the contract, CONTRACTS.md §dry run) uses `applyX/applyZ`, puts the clone overlap in `observables.jointFidelityWithTwoCopies`, and gives `live_commit` no token marker. This reproduces gameplay's own seam report independently. |
| R2 | MED | gameplay | `state.js:105-110`; contract `contracts.js:58` | `RESTART-SESSION`: f08dd0b adds ENDING --RESTART--> TITLE. `send('RESTART')` takes it as a plain edge: the epoch does not bump and the latch stays `committed`, so the second playthrough cannot commit (soft-lock). `resetGame()` is fine. The contract comment says RESTART "runs gameplay's resetGame()", and the machine does not. |
| R3 | MED | gameplay | `state.js:129-131` | `TOKEN-RUN-GUARD`: `experiment(run)` calls `run()` in any state, including the armed TELEPORT_DRY_RUN_PASSED and after the latch. A token request there leaves the machine outside the latch, and then `commitTransfer()` measures again (2 token measurements per session). This contradicts the claim in `state.js:41-42`. It is caller discipline at 7c4741b: no terminal exists to check. |
| R4 | MED | gameplay | `state.js:99-103` | `DRY-UNEARNED`: `send('CORRECT_CALIBRATION')` (and `BASIS_DEMO_OK`, `SUPERPOSITION_DEMO_FAILED`) advances with no result at all. Only COMMIT is gated. The contract's `EVENT_SOURCES` marks these `experiment_result`. RG3.2 holds only by convention. |
| R5 | MED | gameplay (state source is quantum, R13.7) | `missionRules.js:64-71` | `FRESH`: a correct retry on the same prepared state after a wrong one passes (R13.11). Unchanged since Q3. |
| R6 | LOW | gameplay | `state.js:156-162` | `ERR-COMMIT`: a commit call that returns an invalid result (null, `{}`, partial) latches `measured_refused`, with no retry. RG3.1 says "token marked consumed only on success; on error, honest error + retry". This is a reading of the ruling (invalid = error); gameplay treats any return as measured. It was green at d5ec620, where nothing latched. |
| R7 | LOW | gameplay | `missionRules.js:64-71` | `BITS-FIRST`: gameplay grades a single corrections-included result and never consumes the contract's `makeCorrectionRequest` / `dryRunVerdict`. Bits-first may still hold in a UI; no terminal exists at 7c4741b. |
| R8 | MED | platform ↔ quantum | `contracts.js` dry-run validators; quantum `teleportation.py` | `probe_contract_seam.mjs`: the contract accepts **0/48** real phase-1 results and **0/32** real phase-2 results. Every refusal is the missing `parameters.theta/phi`, because the engine takes state NAMES. |
| R9 | INFO | gameplay | `echo/contracts.js` in 7c4741b | Gameplay's tree carries a stale `contracts.js` copy without the RESTART and CLOSE_SCIENCE edges (`GAME-EDGES` red in that variant). The integrated tree must take platform's. |

## Nulls

- **N-EPOCH-TICKET:** the epoch compare in `isCurrent()` is redundant, because `seq` never resets. Dropping it turns nothing red. It bites only in `commitTransfer()` (B-EPOCH).
- **N-FID-TELE:** the teleport fidelity gate is redundant with the correction-rule match, as in 0003 S13n.
- **First-pass harness nulls, fixed before grading:**
  - The GAME BFS was blind to table-only events once `state.js` stopped exporting its table.
  - CONTRACT-BITS passed on a destructuring throw.
- **Two of the red-team's own minimal fixes were wrong,** and the gate falsified them (law 5): RESTART reset from any state, and FRESH counted bits-only results as failures.

## What this cannot see

- How many times a real build measures the token. There are no terminals, adapter or `main.js` wiring in 7c4741b `echo/game/`.
- Anything in a browser, the local runner or Qollab.

## Related

- [[Reports/quest-state-audit]]: the consult-6 round (Q1–Q11)
- [[Reports/physics-code-audit]]: `dump_results.py` and the cross-lane seam
- `7c4741b:vault/Reports/gameplay-real-engine-seam.md`: gameplay's own seam measurement; R1 reproduces it
