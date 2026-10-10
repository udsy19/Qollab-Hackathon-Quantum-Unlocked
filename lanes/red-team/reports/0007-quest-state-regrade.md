## TL;DR
DONE. Local Node module-level only. Audited: gameplay 7c4741b `echo/game/` + platform f08dd0b `echo/contracts.js`, fed real quantum f7efb92 results.
- **Q1 (second token measurement after commit): FIXED on the `commitTransfer()` route.** TOKEN-LATCH and COMMIT-TWICE are green, including two concurrent presses: 1 measurement. **Q2 (bits-00 unlock): FIXED** (DRY-00 green). Ack gate, epoch/seq tickets, ABA, and commit-in-flight across `resetGame()`: all green.
- Baseline on one harness: d5ec620+6378677 is 15 green / 19 red; **7c4741b+f08dd0b is 27 green / 7 red**.
- Remaining reds: R1–R7 at 7c4741b+f08dd0b, plus R8 (platform↔quantum) and R9 (stale contracts copy) from separate runs; table below. Worst is R1 (HIGH): real engine output as emitted stalls the quest at CLONE_INTRO.
- New MEDs:
  - R2: the ENDING `RESTART` edge in f08dd0b soft-locks the second playthrough (the latch stays `committed`).
  - R3: `experiment()` can measure the token outside the latch.
  - R4: `send('CORRECT_CALIBRATION')` unlocks COMMIT with no dry run.
- Sabotage on disposable copies: **27/27 as expected, 34/34 checks red at least once**, export byte-identical afterwards. Nulls are listed below.
- Evidence: `evidence/red-team/quest-state-regrade/` (`reproduce.sh --repo <clone> [--regen]`, exit 0 verified from a `git archive` export); `vault/Reports/quest-state-regrade.md`.
- Recommend: gameplay fixes R2, R3, R4 and R1 (field names) before the integrated tree lands; platform and quantum agree theta/phi vs names (R8).

## Vault check
- **Read:**
  - `vault/Reports/quest-state-audit.md`
  - `evidence/red-team/quest-state-audit/{README.md, expected.mjs, oracle.mjs, run.mjs, sabotage.mjs, reproduce.sh}`
  - `lanes/red-team/{context.md, rulings.md}`
  - `evidence/red-team/physics-code-audit/dump_results.py`
  - `vault/Index.md`: nothing on quest-state or the regrade
  - `7c4741b:vault/Reports/gameplay-real-engine-seam.md`: claims only; none of its fixtures were used (law 4)
- **Already known:**
  - Q1–Q11 at d5ec620.
  - The bonus-2d28ec9 reds were adapter artefacts.
  - Gameplay's own report says the real engine stalls its rules at CLONE_INTRO. I reproduce that independently as R1.
- **Reused, not forked:**
  - `expected.mjs`, unchanged since ebed844.
  - `oracle.mjs`, which now also re-derives every fed engine fidelity (ENGINE-ORACLE).
  - `run.mjs` and `sabotage.mjs`, extended in place.
  - `dump_results.py`, run unchanged inside `dump_regrade.py`.
- **Stale:** `quest-state-audit/reproduce.sh` could not pass `--results`, so it is deleted and superseded by `quest-state-regrade/reproduce.sh`. Its README is marked superseded-for-running. The 0003 numbers stay as the record of that round (harness at 21c6187).

## What I found

| check | d5ec620+6378677 | 7c4741b+f08dd0b | 7c4741b own contracts copy |
|---|---|---|---|
| GAME-STATES | green | green | green |
| GAME-EDGES | **red** | green | **red** |
| GAME-EXTRA | **red** | green | green |
| CONTRACT-STATES | green | green | green |
| CONTRACT-EDGES | **red** | green | **red** |
| CONTRACT-EXTRA | green | green | green |
| PARITY | **red** | green | green |
| GAME-NOSKIP | green | green | green |
| GAME-ENDING-ENTRY | green | green | green |
| GAME-COMMIT-ONCE | green | green | green |
| CONTRACT-NOSKIP / -ENDING-ENTRY / -COMMIT-ONCE | green | green | green |
| ENGINE-ORACLE | green | green | green |
| TOKEN-ELSEWHERE | green | green | green |
| TOKEN-LATCH (Q1) | **red** | green | green |
| TOKEN-RUN-GUARD (Q1b) | **red** | **red** | **red** |
| ERR-COMMIT | green | **red** | **red** |
| DRY-RULE | green | green | green |
| DRY-00 (Q2) | **red** | green | green |
| DRY-UNEARNED (Q10) | **red** | **red** | **red** |
| FRESH (Q3) | **red** | **red** | **red** |
| BITS-FIRST (Q11) | **red** | **red** | **red** |
| CONTRACT-BITS (Q11) | **red** | green | **red** |
| ACK (Q4) | **red** | green | green |
| ACK-STALE-PANEL | **red** | green | green |
| STALE-TICKET | **red** | green | green |
| TICKET-REPLAY | **red** | green | green |
| COMMIT-TWICE | **red** | green | green |
| COMMIT-STALE | **red** | green | green |
| COMMIT-AFTER-RESTART | green | green | green |
| RESTART-SESSION | green | **red** | green |
| PLAYTHROUGH (names-only alias) | **red** | green | green |
| PLAYTHROUGH-RAW | **red** | **red** | **red** |

Q5/Q6 (PARITY), Q7 and Q8 (EDGES) are green on the shipped composition. The d5ec620 PLAYTHROUGH red is a seam-version effect: the f7efb92 engine is newer than d5ec620's `receiver=0` field. It is not a finding about d5ec620.

## Findings for owning lanes
| id | sev | lane | file:line (at 7c4741b / f08dd0b) | reproduction (check) |
|---|---|---|---|---|
| R1 | HIGH | gameplay (seam with quantum) | `echo/game/missionRules.js:10,31,51,53,73` | PLAYTHROUGH-RAW. The engine emits `parameters.applyX/applyZ` (as the contract does), the clone overlap only in `observables.jointFidelityWithTwoCopies`, and `live_commit` with no token marker. Gameplay reads `correctionX/Z`, top-level `fidelity` and `stateId === 'story_token'`, so the quest never leaves CLONE_INTRO on real results. |
| R2 | MED | gameplay | `echo/game/state.js:105-110` vs `echo/contracts.js:58,36` | RESTART-SESSION. ENDING → `send('RESTART')` is accepted as a plain edge to TITLE: no epoch bump, latch stays `committed`, and the second session cannot commit. The contract comment says RESTART runs `resetGame()`. |
| R3 | MED | gameplay | `echo/game/state.js:129-131` (claim at :41-42) | TOKEN-RUN-GUARD. `experiment(run)` in TELEPORT_DRY_RUN_PASSED runs the request, refuses the verdict and leaves the latch IDLE; `commitTransfer()` then measures again, for 2 token measurements. After the commit it also still runs requests. |
| R4 | MED | gameplay | `echo/game/state.js:99-103` | DRY-UNEARNED. `send('CORRECT_CALIBRATION')`, `send('BASIS_DEMO_OK')` and `send('SUPERPOSITION_DEMO_FAILED')` advance with no result. Only COMMIT is gated, although `EVENT_SOURCES` marks these `experiment_result`. |
| R5 | MED | gameplay (state source: quantum R13.7) | `echo/game/missionRules.js:64-71` | FRESH (R13.11). A correct retry on the same `bloch_a` after a wrong try passes. |
| R6 | LOW | gameplay | `echo/game/state.js:156-162` | ERR-COMMIT. An invalid return (null, `{}`, partial) latches `measured_refused` with no retry. This reads RG3.1 "consumed only on success; on error … retry" as invalid = error. |
| R7 | LOW | gameplay | `echo/game/missionRules.js:64-71` | BITS-FIRST. A single corrections-included result passes; `makeCorrectionRequest`/`dryRunVerdict` are not consumed. It may hold in a UI, but there are no terminals at 7c4741b. |
| R8 | MED | platform ↔ quantum | `echo/contracts.js` dry-run validators; quantum `teleportation.py` | `out/probe-contract-seam.txt`: 0/48 real phase-1 results and 0/32 phase-2 results are accepted, all because `parameters.theta/phi` are missing (the engine takes state names). |
| R9 | INFO | gameplay | `7c4741b:echo/contracts.js` | A stale copy, without RESTART/CLOSE_SCIENCE. The integrated tree must use platform's. |

## What I changed (commits on `lane/red-team/quest-state-regrade`)
- `4cf627b`: `run.mjs` adapter for the migrated API, real-results feed, 13 new checks; `expected.mjs` unchanged.
- `0fa736d`: generalized `sabotage.mjs`, `scenarios-7c4741b.mjs`, baselines, sabotage outputs, export hashes.
- `b797a8e`, `730125c`: `reproduce.sh` (`--repo`, `--regen`, works from a non-repo export; refuses with exit 2 when no repo is given outside one).
- `4238d50`: README, `probe_contract_seam.mjs`, `vault/Reports/quest-state-regrade.md`, 0003 `reproduce.sh` removed. Hubs were not regenerated.

## Evidence
- `evidence/red-team/quest-state-regrade/out/baseline-7c4741b+f08dd0b.{txt,json}`, `baseline-d5ec620+6378677.{txt,json}`, `variant-7c4741b-own-contracts.{txt,json}`
- `out/sabotage.{txt,json}` (27/27, coverage 34/34), `out/audited-export.sha256` (matches the git blobs: state.js 8912bc44…, missionRules.js 898813cb…, contracts.js ecc0ed1d…)
- `out/real-results-f7efb92.json`: a re-dump is identical except the unseeded 256-shot BasicSimulator counts, which no check reads.
- `out/probe-contract-seam.txt`
- Command: `bash evidence/red-team/quest-state-regrade/reproduce.sh --repo <clone> --regen` (PY=venv python) → exit 0, run from a `git archive HEAD evidence` export.

## Nulls
- **N-EPOCH-TICKET:** dropping only the epoch compare from `isCurrent()` turns nothing red. `seq` is monotonic across sessions, so it masks the compare. The epoch compare bites only in `commitTransfer()` (B-EPOCH → COMMIT-STALE). To turn the ticket checks red I had to drop epoch AND seq (B-EPOCH-SEQ; law 15 enabling step).
- **N-FID-TELE:** removing the teleport fidelity gate turns nothing red, because the correction-rule match makes it redundant (as in 0003 S13n).
- **B-ACK-SEQ:** expected only ACK-STALE-PANEL; ACK also went red. That is a superset, so it still counts as expected.
- **First pass, 10 unexpected results, all fixed before the graded round:**
  - (a) Harness blind spot: the GAME BFS universe came from `stateMod.TRANSITIONS`, which state.js no longer exports, so table-only events like CHEAT were never probed. It now unions in the contract table.
  - (b) CONTRACT-BITS passed because `{}` threw on destructuring, not on validation. It now has a positive control (a real phase-1 result must build) and a phase-2-as-phase-1 negative.
  - (c) My minimal fix for R2 reset from any state (GAME-EXTRA red), and my FRESH fix counted bits-only results as failures. The gate falsified both of my own fixes (law 5).
  - (d) The adapter showed a result panel in the new state after a fallback result, which masked ACK under the fixes.

## What I did NOT verify
- No browser, local runner or Qollab run. All labels are "local Node module-level".
- How many times a real build measures the token. 7c4741b `echo/game/` has no terminals and no `main.js` wiring, so R3 and R7 are about what the machine allows, not what a terminal does.
- Platform f08dd0b `main.js`/`index.html` were not exercised; only `contracts.js` was.
- Named-state dry runs were not graded (DRY-RULE uses the generic `bloch_a`/`bloch_b` only, per the generic-state ruling).
- The `happy.BACKEND_VERIFICATION` result was not graded. The engine names it `bell_verification`, while the contract says `backend_verification`; that is already in gameplay's seam report.

## Decisions inferred from the docs
- **Shipped composition** = gameplay `echo/game/` + platform `echo/contracts.js`. Basis: the rulings "Shared contracts live in echo/contracts.js, platform-owned" and lane-ownership.md. Gameplay's own copy was graded as a variant.
- **An invalid commit result is an "error"**, so retry should be allowed (R6). Basis: RG3.1 "token marked consumed only on success; on error, honest error + retry". A valid-but-wrong result latching is accepted as "latched once recorded".
- **The RESTART edge must behave like `resetGame()`** (R2). Basis: R13.12 and V§9.5, and the contract's own comment.
- **Outcome-named events need a result** (R4). Basis: RG3.2 "COMMIT unlocks only after ≥1 correct non-00 dry run", and V§9.2 mission events.
- **`seam()` alias:** naming engine fields with gameplay's documented names (no numbers created) counts as "real engine output". Basis: the brief, step 5. PLAYTHROUGH-RAW grades the unaliased output.

## Questions for the owner
None. Nothing needs spend, access, publishing, or a doc-conflict ruling.

## What the supervisor should do next
1. Relay R2, R3, R4 (MED) and R1 (HIGH) to gameplay with the check names above. Each one's minimal fix is in `scenarios-7c4741b.mjs` FIX.{RESTART,RUNGUARD,EARNED,RAW}, and each turns its check green with nothing else red (F-ALL = 0 red). These fixes are red-team positive controls, not product patches; gameplay should write its own.
2. Relay R8 to platform and quantum: either the engine echoes `theta/phi`, or the contract accepts state names.
3. Re-grade when the integrated tree has terminals: `GP=<sha> PF=<sha> QU=<sha> bash evidence/red-team/quest-state-regrade/reproduce.sh --regen`. A changed product will show MISMATCH against the committed baselines, which is expected; re-baseline after reading the diff.
