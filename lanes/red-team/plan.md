**Lane:** red-team. We write reports only and make no product edits. Plan row 7.

**Goal:** Run three independent checks on ECHO: ONE OF ONE and report each, with evidence, to the lane that owns the fix.
1. **Physics audit.** Check Prompt 6 and vision §7 against the real code and tests: every claim, the four (m0,m1) pairs, endianness, the one-`backend.run` limit, and misleading labels.
2. **Blind playtests.** Newcomers play the newest integrated build in the local runner. We record where they get stuck and whether they can answer the teach-back questions.
3. **Rubric score.** Score each of the four traits with evidence. The weights are unknown, so there is no weighted total.

**Approach:** Ground truth comes from the independent oracle, never from a lane's own code (law 4). The spec is a hypothesis (law 5). All sabotage runs on disposable `git archive` exports (law 10). Every audit is pinned to named SHAs. Results are labelled "local runner"; nothing is claimed for Qollab unless `owner-answers.md` records it.

**Done:**
- `physics-oracle-audit` (0001): MERGED in consult 2. 523 passed, sabotage exit 0.
- `rubric-research` (0001): MERGED in consult 3. The rubric is four trait names with no weights, and the novelty bar can zero two traits.
- `physics-code-audit` (0002): MERGED in consult 4.
  - The physics is correct.
  - BLOCKER: the contract shape is broken across lanes (12/13 checks fail).
  - C3: there are 2 `backend.run` sites.
  - C4: the token is re-measured on every call.
  - Gameplay's fidelity check is a null.

**Branch state at consult 5 (git, 04:05 UTC):**
- main 6cc19a6 carries contracts v2 (80d685f) plus `tools/contract-check` and `tools/qollab-caps`.
- quantum d9b42d0 (pyodide-bridge merged).
- gameplay c49a922 (gameplay-contracts-migration merged).
- platform 43be7d9.
- story-ui 842da9f (story-data).
- art: empty.
- `echo/` on main is still only `contracts.js` and `CONTRACTS.md`. There is no playable game on any branch yet.

**Running:**
- `quest-state-audit` (checkpoint 1 is in). It is a PARTIAL: it has the expected table and the suspected gaps, and the harness is next. I'll judge it on the final report.
- `cross-lane-recheck` (dispatched now). It re-runs the 0002 harness and contract v2's own `tools/contract-check` at the pinned tips above. It says which of the 0002 findings are closed or open, and it runs a sabotage round on the v2 checker itself (law 6: the board is a system under test).

**Queued (red-team cap is 2):**
- `player-text-audit` against story-ui 842da9f: the m1 label, EXACT receiver panel, no FTL/cloning/"certified random"/matter-teleport wording, the attribution line, and credits. Dispatch when a slot frees up.

**Playtest gate:** I dispatch 1–2 `blind-playtest` workers, each on its own port, when a branch has `echo/main.js` with the quest state machine wired to a scene and terminals. If only a partial slice exists by Sat ~12:00 ET, I playtest it anyway and label it PARTIAL.

**Next:**
- `rubric-score` after the first playtest, scored per trait.
- Re-run the physics audit when `echo/quantum` changes materially.
- Re-run the playtests after G3 and before the Sun 14:00 freeze.
- Route the page-copy gaps to platform: run steps, the verbatim attribution line, MIT, the novelty claim and the browser list.
- Merge main into lane/red-team/integration so contracts v2 and the tools are on our base. Until then, workers merge main into their own branch first.

**Risks:**
- The graybox is late; G2 is Sat 17:00, otherwise the one-room cut.
- Impact needs measured teach-back outcomes.
- A lane could self-certify conformance with a v2 checker that has its own nulls.
- Re-audits could churn while lanes move fast; pinned SHAs handle that.