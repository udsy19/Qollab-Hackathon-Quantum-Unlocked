=== PLAN ===
**Lane:** red-team. We write reports only and never edit product files (plan row 7).

**Goal:** three independent checks of ECHO, each reported with evidence to the lane that owns the fix.
1. A physics audit of Prompt 6 and vision §7 against the real code.
2. Blind playtests in the local runner.
3. A rubric score for each of the four traits, reported separately and never added into a weighted total.

**Approach:**
- Ground truth comes from our own independent oracle (law 4). The spec is treated as a hypothesis (law 5).
- Sabotage runs only on disposable exports (law 10).
- Every audit is pinned to named commits.
- Results are labelled "local runner" or "local Node".
- To verify a worker's `reproduce.sh`, run it in that worker's own worktree.

**Done (merged):**
- physics-oracle-audit (0001)
- rubric-research (0001)
- physics-code-audit (0002)
- quest-state-audit (0003, Q1–Q11)
- cross-lane-recheck (0005: gate RED, 5/13 checks failing, plus the CLONE_INTRO stall)
- player-text-audit (0006, T1–T15)
- **quest-state-regrade (0007), merged this consult.** I re-ran it in its worktree: exit 0, all three baselines match check by check, 27/27 scenarios as expected, 34/34 checks went red at least once, no drift.
  - Q1 and Q2 are fixed.
  - Open: R1 HIGH (real output stalls at CLONE_INTRO), R2 (RESTART soft-locks the second run), R3 (`experiment()` measures the token outside the latch), R4 (`CORRECT_CALIBRATION` unlocks with no dry run). All four go to gameplay.
  - Also open: R8 (theta/phi vs state names) for platform and quantum, and R9 (gameplay's stale contracts copy).

**Branch tips at consult 10 (04:54 UTC):**

| branch | tip | what changed |
|---|---|---|
| platform | 0fc2721 | contracts-commit-result (validateCommitResult, our 0005 item) and the release upload manifest |
| quantum | 24e0ba7 | engine-bridge-review |
| gameplay integration | 7c4741b | — |
| gameplay-world-v2-port | 7792382 | merged main contracts land 2; commit judged by validateCommitResult + STORY_TOKEN_ID; claims 92/92 |
| story-ui | 1908470 | — |

**Running:** shell-boot-smoke, dispatched at consult 9. It has two variants: the merged shell, and a preview with v2-port.

**Dispatching now:** cross-lane-recheck-2. It re-runs the 0005 gate on the new tips: platform 0fc2721, quantum 24e0ba7, gameplay v2-port 7792382 and integration 7c4741b. It also checks the new validateCommitResult with a sabotage round, and checks R1, R8 and the backend site and verification-name items.

**Next:**
- A blind playtest once the controller and terminals are in the merged shell. The trigger is v2-port merged into gameplay integration and then into the platform shell, plus shell-boot-smoke variant B reaching CREDITS.
- story-ui-text-recheck once T1–T9 are pushed. As of 1908470 nothing is pushed, only the opening.
- A rubric score after the first playtest.
- A README and page-copy audit, including platform's release manifest.
- Playtests again before the Sun 14:00 freeze.

**Risks:**
- G2 at Sat 17:00, with the controller still unmerged.
- No teach-back data yet for the Impact trait.
- Lanes could self-certify with their own checkers.
- Only 2 slots.
=== END PLAN ===

=== MERGE branch=lane/red-team/quest-state-regrade ===

=== AGENT name=cross-lane-recheck-2 model=opus base=lane/red-team/integration ===
**GOAL:** Answer one question with evidence at pinned SHAs: does a REAL quantum engine result now flow through the ONE contract into the quest and reach CREDITS? If not, find exactly where it breaks and which lane owns the fix. The player experiences this as the difference between a game that finishes and one that freezes at the first terminal.

**VISION:** ECHO's puzzles must be driven by real local Qiskit (vision §7, §8.4; CLAUDE.md "Truthful quantum"). The owner's ruling says no integrated product code lands on main until red-team's `cross_lane_check` passes. You are that gate.

**WHAT WE ARE BUILDING:** a reusable re-run of our 0005 gate on the new lane tips. You do not write new tools; you re-run and extend the existing ones.
- Pins (override via env, as in 0005's `compose.sh`):
  - QUANTUM_SHA=24e0ba7 (lane/quantum/integration)
  - PLATFORM_SHA=0fc2721 (lane/platform/integration, adds `validateCommitResult` + release manifest)
  - GAMEPLAY_SHA: both 7c4741b (gameplay integration) and 7792382 (gameplay-world-v2-port, which claims its commit is judged by `validateCommitResult` + `STORY_TOKEN_ID` and 92/92 green)
- Contracts: grade against the `echo/contracts.js` that each composition would ship (platform's), and note any diff from main's.

**WHAT HAS NOT WORKED (read before you start):**
- Lane suites were green while the whole was broken. Gameplay tested on `fakeQuantum.js`, and every real result was INVALID (0002).
- Platform's `tools/contract-check` is written by the contract's author and never sees engine output. Its 1087/1087 was green alongside 9 sabotage nulls (0005). Its verdict is producer metadata (laws 4 and 6) until you sabotage it.
- The 0005 open items to re-grade:
  - (a) 2 `backend.run` sites;
  - (b) `bell_verification` vs `backend_verification`, which spends the one job and then rejects it;
  - (c) theta/phi vs state names (R8);
  - (d) no story-token entry point in quantum;
  - (e) no random generic dry-run states in quantum;
  - (f) the gameplay FIDELITY_OK = 0.9 null;
  - (g) no commit validator, which platform claims to have fixed now;
  - (h) the CLONE_INTRO stall on raw real output (R1 from 0007).
- Verifier gotchas:
  - Piping the walk into `tail` hides its exit code. Use `PIPESTATUS` or read the STALL line.
  - `reproduce.sh` must accept `--repo <path>` so that it works from a `git archive` export.

**VAULT NOTES TO READ:**
- `vault/Reports/cross-lane-recheck.md`
- `vault/Reports/quest-state-regrade.md`
- `vault/Reports/physics-code-audit.md`
- `vault/Reports/physics-oracle-audit.md`
- `evidence/red-team/cross-lane-recheck/README.md`
- `vault/Index.md` (promoted lessons)
- `lanes/red-team/rulings.md`
- `.claude/rules/gate-independence.md` laws 3, 4, 5, 6, 10 and 15

Read the other lanes' own reports (quantum `engine-bridge-review`, platform `contracts-commit-result`, gameplay `world-v2-port`) only as claims to falsify. Never calibrate on them.

**WHERE TO START:**
1. `bash evidence/red-team/cross-lane-recheck/compose.sh <dir>` with the new pins. Then regenerate the real results with `dump_results.py` at QUANTUM_SHA.
2. Run, recording each exit code:
   - `cross_lane_check.mjs`
   - `quest_walk.mjs <echo> real <dump>`
   - `quest_walk.mjs <echo> fake` (the control)
   - the teleport v2 check
   - `backend_run_audit.py`
   - `bridge_probe`
   - the oracle driver against the quantum engine
3. Sabotage `validateCommitResult` on a disposable copy. Feed it these, against a passing real-commit control:
   - fidelity 0.9
   - m0 and m1 swapped
   - corrections not following the rule
   - a missing token marker
   - a non-token `stateId`

   Report the nulls.
4. Re-run the quest-state-regrade harness on 7792382 if its API is walkable. If it isn't, say so and grade the walk only.
5. Re-run gameplay's suite with FIDELITY_OK = 0.9 and with the fidelity check removed, on a disposable copy.

**DELIVER:**
- Evidence under `evidence/red-team/cross-lane-recheck-2/`: a README, `reproduce.sh --repo`, `out/` with a PROVENANCE.tsv of the SHAs, and a per-check table with exit codes.
- `vault/Reports/cross-lane-recheck-2.md`, with a "status vs 0005" table (items a–h: FIXED / OPEN / NEW) and a fix list per lane with check names.
- Do not regenerate hubs, Map or Index; the loop does that.

**HOW I WILL JUDGE IT:**
- I re-run your `reproduce.sh` in your worktree. Exit codes must match the report, with no drift.
- Every green has a red control or a sabotage that turned it red.
- Every negative claim is scoped to its SHAs.
- Any claim of CREDITS on real output comes with the walk's transcript.
- Results are labelled "local Node / local CPython". No Qollab or IonQ claims.

**REPORT:** `lanes/red-team/reports/NNNN-cross-lane-recheck-2.md`. It opens with a Vault check, then a TL;DR, and covers: what I changed, evidence paths, nulls, what I did not verify, decisions inferred from the docs, and next steps for the supervisor. Commit a checkpoint report within 1 h, even if partial (mark it PARTIAL).
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 10: I MERGED quest-state-regrade (0007) after re-running `reproduce.sh --repo <int>` in its own worktree. It exited 0, all three baselines matched check by check, 27/27 scenarios were as expected, 34/34 checks went red at least once, and there was no git drift. The `--repo` flag requested in consult 6 works, so every future reproduce.sh brief should require it. Open items from it: R1 HIGH, R2, R3 and R4 for gameplay; R8 for platform and quantum. Platform has since landed `validateCommitResult` (0fc2721, contracts-commit-result) and gameplay v2-port 7792382 claims to use it. Both are hypotheses until cross-lane-recheck-2 sabotages the validator against a real commit control.
=== END LEARN ===
