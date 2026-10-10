## TL;DR
- **Outcome.** Audited gameplay `d5ec620` and platform `6378677`. The harness runs 21 checks: 13 green, 8 red (`run.mjs` exit 1). The sabotage round ran 23 scenarios, all as expected (`sabotage.mjs` exit 0). Every check went red at least once, and the audited export was byte-identical afterwards.
- **Holds (FSM layer, these commits):** no mission can be skipped, ENDING is entered only from TELEPORT_COMMITTED (or DECLASSIFIED), COMMIT_TRANSFER fires at most once per session (BFS plus a 3000-walk fuzz), and all four X/Z choices are graded correctly against an independent physics oracle.
- **Fails:**
  - **Q1 HIGH:** a second story-token result after a recorded commit result still yields COMMIT_TRANSFER, because nothing latches the token (`missionRules.js:54-58`; V§7.4, RG3.1).
  - **Q2 HIGH:** a bits-00 dry run with no corrections unlocks COMMIT (RG3.2).
  - **Q3 MED:** a wrong dry run can be retried on the same state (R13.11).
  - **Q4 MED:** acknowledgements are accepted before any result panel is shown (R13.13).
  - **Q5 MED:** `BOOTED` vs `BOOT_COMPLETE`.
  - **Q7/Q8 LOW:** the contract is missing DECLASSIFIED→ENDING and RESTART on ENDING.
- **Evidence:** `evidence/red-team/quest-state-audit/` (`reproduce.sh`, `out/baseline.txt`, `out/sabotage.txt`, `out/coverage.txt`, `out/crosscheck.txt`). Report: `vault/Reports/quest-state-audit.md`. Branch `lane/red-team/quest-state-audit` @ 9928e4e.
- **Recommend:**
  - Gameplay fixes Q1–Q5. The unlanded `gameplay-contracts-migration` (2d28ec9) appears to add a token latch, a panel gate and contract import, but my harness cannot walk its new API yet, so this is unverified.
  - Platform adds Q7, Q8 and Q11 (the bits-first contract).

## Vault check
- **Read:** `vault/AGENTS.md`; `vault/Index.md` (grep); `vault/Reports/physics-oracle-audit.md` (C4, T1–T3); `ECHO_MASTER_VISION.md` §7.4, §7.5, §9.1–9.5; `lanes/red-team/context.md`; `lanes/red-team/rulings.md`; `lanes/gameplay/owner-answers.md` ("13 lane design questions", "red-team physics ambiguities", "overseer rulings — gameplay consult 3").
- **Read on the gameplay branch (not on main):** `lane/gameplay/integration:vault/Reports/quest-core-adversarial-review.md`.
- **Already known:**
  - The gameplay review of the same commit d5ec620 found F1 (two tables), F4 (token unlatched below the FSM) and H (bits 00 passes).
  - Q1, Q2 and Q6 reproduce those independently from the docs; I did not copy their scripts.
  - The physics-oracle audit's C4 asked exactly the token-once question.
- **Reused:** `evidence/red-team/physics-oracle/physics_oracle.py`, as the Qiskit reference that my JS oracle is cross-checked against (128 fidelities, max diff 4.4e-16).
- **Why a JS oracle instead of reusing the Python one:** the harness has to draw fresh random states inside the Node process that drives the ESM modules.
- **Stale:** the brief's "d5ec620/6378677" are not the integration tips (31a60f2, 939a57d). I checked that `echo/game` and `echo/contracts.js` are unchanged between each pair, so the findings apply to the tips too. `context.md` "Where things stand" still says `echo/` does not exist.

## What I found
Per-goal verdicts (all at d5ec620 + 6378677):

| goal | verdict |
|---|---|
| Cannot skip a mission | HOLDS at the FSM (gameplay and contracts). Q10: `send()` accepts outcome events from any caller; result-binding is convention only. |
| Token measured exactly once, at commit | HOLDS at the FSM edge. FAILS at the rules layer (Q1). End-to-end it is unverifiable: no code in `echo/` at these commits calls quantum. |
| Wrong dry run → fresh state | NOT ENFORCED (Q3) |
| Ending only after m0, m1 and chosen corrections | Correction grading is correct. Bits 00 bypasses it (Q2). There is no bits-first contract (Q11). |
| Acknowledgement only after the result panel | NOT ENFORCED (Q4) |

Findings table (id, severity, file:line on the audited commit, reproduction, owning lane):

| id | sev | file:line | reproduction (harness check) | lane |
|---|---|---|---|---|
| Q1 | HIGH | `echo/game/missionRules.js:54-58` | `TOKEN-LATCH`: story-token result with bits 11 and no corrections (F=0.076), then a second story-token result → COMMIT_TRANSFER | gameplay |
| Q2 | HIGH | `missionRules.js:48-53`, `:24-33` | `DRY-00`: m0=m1=0, no correction, F=1 → CORRECT_CALIBRATION (RG3.2 post-dates the commit) | gameplay |
| Q3 | MED | `missionRules.js:48-53`; claim at `state.js:34-35` | `FRESH`: wrong on `calibration_A`, then correct on the same state → accepted | gameplay (+quest R13.7) |
| Q4 | MED | `state.js:43,48,95-104` | `ACK`: EXPLANATION_READ / VIEW_RECEIVER_MARGINAL accepted 0 ms after entry | gameplay (+story-ui) |
| Q5 | MED | `state.js:37` vs `contracts.js:37` | `PARITY`: BOOTED vs BOOT_COMPLETE; a contract-named caller is stuck at BOOT | gameplay |
| Q6 | MED | `state.js:36-58` vs `contracts.js:36-59` | `PARITY`: duplicate table (known as F1) | gameplay |
| Q7 | LOW | `state.js:56`, `contracts.js:57` | `*-EDGES`: no DECLASSIFIED→ENDING (R13.1) | platform → gameplay |
| Q8 | LOW | `contracts.js:34-35,56` | `CONTRACT-EDGES`: no RESTART on ENDING, and `resetGame()` is not in the contract (R13.12) | platform |
| Q9 | LOW | `state.js:56-57` | `GAME-EXTRA`: undocumented CREDITS→DECLASSIFIED and RESTART from DECLASSIFIED/CREDITS | gameplay ↔ platform |
| Q10 | INFO | `state.js:95` | outcome events are not bound to results inside the machine | gameplay |
| Q11 | INFO | `contracts.js` | no bits-first dry-run contract | platform |

**Contract vs §9 mismatches, for the platform lane:** Q7, Q8 and Q11. On Q5 the contract is right and gameplay is wrong.

## What I changed (commits on `lane/red-team/quest-state-audit`)
- **ebed844:** `expected.mjs`, the expected table with a citation per row. It was committed before I read `state.js`.
- **ff65854:** the harness (`run.mjs`, `oracle.mjs`, `crosscheck.py`) and the baseline.
- **9928e4e:** `sabotage.mjs`, `reproduce.sh`, README, `out/*`, `vault/Reports/quest-state-audit.md`.
- **Not touched:** no product files, and no other lane's branch.

## Sabotage round (law 3/15)
- **break (15 scenarios):** each green check goes newly red.
  - S1/S2 make CREDITS unreachable. S3–S7 add skip and warp edges. S9 re-arms the commit. S10 lets the dry run accept the token. S11 commits on an errored result. S12 swaps X/Z. S13 lowers the clone threshold. S14 makes the ending unreachable.
  - **S8a:** a re-arm edge in `state.js` makes the module's own load-time `commitIsOneShot` guard refuse to load (exit 2, refused). **S8b** disables that guard as the enabling step, and then `GAME-COMMIT-ONCE` goes red.
- **fix:** with minimal fixes for all 8 reds applied, 0 checks are red. This is the positive control: the reds are not stuck.
- **leave-one-out (6 scenarios):** each fix removed alone brings back exactly its own check(s).
- **Nulls (sabotage that did not go red):**
  - **S13n:** deleting the teleport-side `fidelity < 0.999999` gate turns nothing red. It is redundant because the rule also matches corrections to bits.
  - Checks red at baseline cannot go newly red; leave-one-out covers them instead.
- **Harness bugs I found and fixed along the way:**
  - A RESTART→TITLE new session was being counted as a re-commit.
  - Exploration probed raw sends, which hid states behind a fixed ACK guard.
  - A typed clone fidelity of 0.75 was replaced by an oracle-computed 0.5.
  - An uncaught throw exited 1 (red) instead of 2 (refused).

## Evidence paths
- `evidence/red-team/quest-state-audit/`:
  - `out/baseline.txt`, `out/baseline.json`
  - `out/sabotage.txt`, `out/sabotage.json`, `out/coverage.txt`
  - `out/crosscheck.txt`, `out/audited-export.sha256`
- Re-run: `bash evidence/red-team/quest-state-audit/reproduce.sh`. It does a fresh `git archive` export and prints `21 checks: 13 green, 8 red` and `23 scenarios: 23 as expected`.

## What I did NOT do or could not verify
- **No browser, local runner or Qollab run.** Everything is Node module-level.
- **Physical token measurement is not counted.** No terminal, adapter or `main.js` in `echo/` at these commits calls quantum, so "measured once" is graded only at the rules/FSM layer.
- **The migration branch is not graded.** `out/bonus-2d28ec9.txt` is a run on the unlanded `gameplay-contracts-migration`. Its new API (`resultPanelShown`, `commitTransfer`, epochs) is not walkable by my adapter, so its 9 reds there are adapter artefacts, not findings.
- **Field names are trusted.** The `ExperimentResult` field names come from `missionRules.js`'s own header, because V§8.4 leaves them open.
- **No images.** Nothing in this audit is visual, so I saved no PNGs.

## Decisions inferred from the docs
- **RESTART target:** R13.12 doesn't name one, so I accepted any of TITLE, BOOT or OPENING. Gameplay's `reset()` → TITLE satisfies it (V§9.5 resetGame).
- **DECLASSIFIED→ENDING:** R13.1 gives no event name, so I matched on the target only.
- **Session boundary:** a path through TITLE counts as a new session (V§9.5), so a re-commit after a restart is not a double measurement. Ruling (8) says the token is a fixed point, but the qubit is freshly prepared each session.
- **Commit with wrong corrections:** RG3.1 says the live commit applies the calibrated rule. I still treated the rules layer accepting a second token result as a defect, because the rules are the only guard present (V§7.4).
- **Who owns "fresh calibration state":** I attributed it to gameplay (R13.11 is listed under Gameplay), with state generation belonging to quantum (R13.7).

## Questions for the owner
- None blocking. Everything §9 leaves open was inferred above under autonomous mode. If you want them pinned: the RESTART target (TITLE vs BOOT), and whether CREDITS may go back to DECLASSIFIED.

## What the supervisor should do next
1. **Gameplay:** Q1 (token latch below the FSM), Q2 (bits≠00 guard), Q3 (fresh-state enforcement), Q4 (panel gate) and Q5/Q6 (import `contracts.js`). Check first whether `gameplay-contracts-migration` (2d28ec9) already lands these.
2. **Platform:** add DECLASSIFIED→ENDING (Q7) and RESTART/`resetGame` (Q8) to `contracts.js`. Also add the bits-first dry-run contract (Q11), owner § red-team physics (2).
3. **Red-team, next consult:** retarget `run.mjs`'s gameplay adapter to the migrated API once it lands, then re-run `reproduce.sh <new-gp> <new-pf>`. The expected table and checks do not change.
4. **Re-grade once a terminal or `main.js` wires quantum.** That is the first point at which "token measured exactly once" can be counted end-to-end.
