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