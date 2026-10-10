The player-text audit (0006) reproduced exactly when I ran it in its own worktree on story-ui 320613e:
- good fixture exit 0; bad fixture exit 1 with 37 findings;
- baseline 9 findings (3 HIGH, 4 MED, 2 LOW);
- sabotage 58/58 as expected;
- branch truth 16/16, and its sabotage goes red.

Only `summary.json` changed on rerun, a one-line difference. Merging it, then using the free slot for the regrade.

=== PLAN ===
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
=== END PLAN ===

=== MERGE branch=lane/red-team/player-text-audit ===

=== AGENT name=quest-state-regrade model=opus base=lane/red-team/integration ===
**GOAL.** Find out whether a player's quest in ECHO can still be broken in the ways we found at consult 6. The two worst were:
- a second story-token measurement after commit (Q1);
- a bits-00 dry run unlocking COMMIT (Q2).

Run the check on the gameplay code that will actually ship, gameplay `lane/gameplay/integration` @ **7c4741b**, together with platform `lane/platform/integration` @ **f08dd0b**. Gameplay claims its contracts migration added a commit latch, a result-panel ack gate, epoch tickets and refusal-only mission rules. That claim is a hypothesis until our independent harness walks it (gate-independence law 5).

**VISION.** Vision §7.4 and §9: the story token is consumed exactly once. COMMIT unlocks only after ≥1 correct non-00 dry run. A wrong dry run retries on a fresh state. Acknowledgements count only after the result panel was shown. RESTART is offered on ENDING. These rulings are in `lanes/red-team/rulings.md` (gameplay consult 3 and "13 lane design questions").

**WHAT WE ARE BUILDING.** A Qollab-native game whose quest FSM (`echo/game/state.js`, `missionRules.js`) gates every mission. If the FSM can be walked into a double measurement or an unearned commit, the physics claim on the page is false, and that zeroes Technical Execution.

**WHAT HAS NOT WORKED.**
- At c6 the 0003 harness could not walk the migrated API (`resultPanelShown`, `commitTransfer()`, epoch tickets), so its 9 reds on 2d28ec9 (`out/bonus-2d28ec9.txt`) were adapter artefacts, not findings.
- Lanes' own suites have been green while the whole was broken: tests ran on `fakeQuantum.js`, and the fidelity threshold was a null.
- `reproduce.sh` broke inside non-repo exports (`git -C $HERE`).

**Vault and notes to read first:**
- `vault/Reports/quest-state-audit.md`, `evidence/red-team/quest-state-audit/README.md`, `expected.mjs` and `run.mjs`.
- `vault/Reports/physics-code-audit.md`.
- `vault/Design/gate-independence-cases.md`, laws 3, 4, 5, 8, 10 and 15.
- Gameplay's own report on the real-engine seam (on gameplay integration, `vault/Reports/`). Read it for its claims only; never reuse its fixtures as ground truth (law 4).

**Where to start:**
1. Export both pinned trees with `git archive <sha> echo` into `mktemp -d`.
2. **Keep `expected.mjs` unchanged.** It was written from V§9 and the rulings before any code was read. If the migrated API forces a semantic change, justify it line by line against the vision and rulings, and commit that change BEFORE running.
3. Rewrite only the adapter in `run.mjs` so it drives the real API:
   - `commitTransfer()` is the only route to COMMIT;
   - call `resultPanelShown()` where a real UI would;
   - present tickets;
   - test stale-epoch results after `resetGame`.
4. Add adversarial cases for the new surface:
   - a result delivered with an old ticket;
   - `commitTransfer()` called twice, concurrently, and after RESTART;
   - an ack sent before the panel;
   - a ticket replayed across epochs.
5. Feed real engine output: run `evidence/red-team/physics-code-audit/dump_results.py` against quantum @ f7efb92 and use those JSON results, not a fake, wherever the harness needs `ExperimentResult`s.
6. Re-grade Q1–Q8 and Q11 with the same table.

**What to deliver:**
- Commits on your branch under `evidence/red-team/quest-state-regrade/`. Reuse the 0003 files where possible; do not fork the oracle.
- A baseline table showing each check's state at d5ec620 versus 7c4741b.
- A sabotage round on a disposable copy of 7c4741b: remove the latch, remove the ack gate, drop the epoch compare, allow a 00 unlock. Each must turn a check red. Report every null.
- `reproduce.sh` that takes an optional `--repo <path>` and works from a `git archive` export.
- `vault/Reports/quest-state-regrade.md`. Do not regenerate hubs.

**How I will judge:**
- I re-run your harness from a branch export against product trees I export myself. The numbers must match.
- Every check must go red at least once under sabotage.
- Any change to the expected table must be justified against the vision and rulings, never against the code.
- Each finding is tagged to its owning lane (gameplay or platform) with file:line.
- Labels are "local Node module-level". Make no browser or Qollab claims.

**Report** `lanes/red-team/reports/0007-quest-state-regrade.md`. It must:
- open with `## TL;DR` and `## Vault check`;
- include "Findings for owning lanes", "Nulls", "What I did NOT verify" and "Questions for the owner" (decide from the docs under autonomous mode; ask only for spend, access or doc conflicts).

**Checkpoint within 1 h** with a PARTIAL report.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 7: To verify a worker's `reproduce.sh`, run it inside the finished worker's own worktree (`lanes/red-team/wt/<slug>`). That is a real repo, so `git -C` works. Afterwards, check `git status` for drift and restore with `git checkout -- evidence`. On player-text-audit, the only drift was 1 line in `summary.json`, and every count matched the report. This avoids the empty-tree artefact we get in `git archive` exports.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 7: Platform's integration-shell `main.js` (f08dd0b) imports gameplay `state.js`, story-ui `ui/*` and quantum modules. It is the first composite build, but it has no player controller: gameplay world-controller and world-v2-port are unmerged at 7c4741b. A boot smoke of the assembled shell counts as a PARTIAL playtest precursor, not a blind playtest. The real playtest trigger is the controller plus terminals wired into the shell.
=== END LEARN ===
