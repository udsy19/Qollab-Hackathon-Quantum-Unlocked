**Lane:** red-team. We write reports only and make no product edits. Plan row 7.

**Goal:** Run three independent checks on ECHO and report each, with evidence, to the lane that owns the fix.
1. Physics audit of Prompt 6 and vision §7 against the real code and tests.
2. Blind playtests in the local runner.
3. Rubric score for each of the four traits, reported separately, never as a weighted total.

**Approach:**
- Ground truth comes from the independent oracle (law 4). The spec is treated as a hypothesis (law 5).
- All sabotage runs on disposable `git archive` exports (law 10).
- Every audit is pinned to named SHAs.
- Results are labelled "local runner". Nothing is claimed for Qollab unless `owner-answers.md` records it.

**Done:**
- physics-oracle-audit (0001): MERGED c2.
- rubric-research (0001): MERGED c3.
- physics-code-audit (0002): MERGED c4.
- quest-state-audit (0003): MERGED c6. Findings Q1–Q11.
- player-text-audit (0006): MERGED c7. Reproduced at story-ui 320613e: 9 findings (3 HIGH / 4 MED / 2 LOW), 58/58 sabotage, branch truth 16/16.
  - Findings for story-ui: T1 no EXACT label; T2 a Subtitles-off toggle that breaks "captions always on"; T3 no terminal/Declassified/credits UI yet; T4 the credit-line dash; T5 a TODO_OWNER line; T6 voiced misconceptions; T7 no fidelity gloss; T8 failure keys are `m0m1`, the reverse of Qiskit's order (integration hazard); T9 import BIT_LABELS.
  - Story-ui must fix these and show screenshots of the EXACT panel, the bits-then-X/Z switches and the credits.

**Branch state at c7 (04:25 UTC):**

| branch | tip | what it holds |
|---|---|---|
| main | 99dfc54 | contracts only |
| gameplay | 7c4741b | migration + commit-fault RESTART + real-engine seam merged; FSM/logic only, no world/controller (world-controller and world-v2-port are unmerged) |
| platform | f08dd0b | integration-shell `main.js` imports the quest machine, ui/*, quantum and THREE; README/video draft |
| quantum | f7efb92 | `bridge.js` exists |
| story-ui | 320613e | |

No branch has a player controller and terminals wired to the scene, so the playtest trigger is still unmet. Platform's shell is the first composite that can be assembled.

**Running:**
- cross-lane-recheck (c5): checkpointed PARTIAL, 5/13 failing.
- quest-state-regrade (c7): the 0003 harness on gameplay 7c4741b + platform f08dd0b.

**Queued:**
1. `shell-boot-smoke` (PARTIAL playtest precursor): assemble platform f08dd0b + gameplay + story-ui + quantum into a disposable export, serve it in the local runner on its own port, take screenshots of the title and the first interactions, and report where it breaks. Dispatch when a slot frees if no controller branch has merged; otherwise go straight to a blind playtest.
2. `blind-playtest` ×1–2 once gameplay world-controller is merged and the platform shell imports it.
3. `story-ui-text-recheck` after story-ui pushes T1–T9 fixes: `reproduce.sh <ref>`.

**Next:**
- rubric-score after the first playtest.
- Re-run the physics audit when `echo/quantum` changes materially (`bridge.js` is new and cross-lane-recheck covers it).
- Re-run the playtests after G3 and before the Sun 14:00 freeze.
- Route the platform README/page copy to a text audit (README is outside 0006's scope: attribution, MIT, theme, novelty claim).

**Risks:**
- The graybox is late; G2 is Sat 17:00, else the one-room cut applies.
- Impact needs measured teach-back.
- A lane could self-certify with its own checker.
- Cap 2 is a bottleneck.