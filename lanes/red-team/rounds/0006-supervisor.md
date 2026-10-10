=== PLAN ===
**Lane:** red-team. We write reports only and make no product edits. Plan row 7.

**Goal:** Run three independent checks on ECHO: ONE OF ONE and report each, with evidence, to the lane that owns the fix.
1. **Physics audit** of Prompt 6 and vision §7 against the real code and tests.
2. **Blind playtests** in the local runner.
3. **Rubric score** for each of the four traits, reported separately.

**Approach:**
- Ground truth comes from the independent oracle (law 4). The spec is treated as a hypothesis (law 5).
- All sabotage runs on disposable `git archive` exports (law 10).
- Every audit is pinned to named SHAs.
- Results are labelled "local runner". Nothing is claimed for Qollab unless `owner-answers.md` records it.

**Done:**
- physics-oracle-audit (0001): MERGED c2.
- rubric-research (0001): MERGED c3.
- physics-code-audit (0002): MERGED c4.
- quest-state-audit (0003): MERGED c6. I reproduced it on exports of d5ec620/6378677: 21 checks, 13 green / 8 red; 23/23 sabotage scenarios as expected.
  - Findings: Q1 HIGH (no token latch), Q2 HIGH (bits-00 unlocks COMMIT), Q3/Q4/Q5 MED, Q7/Q8 LOW.

**Branch state at c6 (04:11 UTC):**

| branch | tip | what it holds |
|---|---|---|
| main | 99dfc54 | `echo/` = contracts only |
| quantum | d9b42d0 | |
| gameplay | cbd8098 | contracts migration + commit-fault RESTART; FSM/logic only |
| platform | 43be7d9 | G0 smoke main.js/index.html |
| story-ui | 320613e | data-fixes: story.js, teachback.js, ui/* |
| art | empty | |

No branch yet has a scene wired to the quest.

**Running:**
- cross-lane-recheck (c5)
- player-text-audit (dispatched now, against story-ui 320613e)

**Queued (cap 2):**
1. `quest-state-regrade`: point the 0003 harness adapter at gameplay cbd8098 (the migrated API: resultPanelShown, commitTransfer, epochs). Re-grade Q1–Q5 with the same expected table, then do a sabotage round. Dispatch it in the next free slot.
2. `blind-playtest` ×1–2, each on its own port. Trigger: `echo/main.js` with the quest FSM wired to a scene and terminals. If only a partial slice exists by Sat ~12:00 ET, playtest it anyway as PARTIAL.

**Next:**
- rubric-score after the first playtest.
- Re-run the physics audit when `echo/quantum` changes materially.
- Re-run the playtests after G3 and before the Sun 14:00 freeze.
- Route page-copy gaps to platform.

**Risks:**
- The graybox is late; if G2 (Sat 17:00) is missed, the one-room cut applies.
- Impact needs measured teach-back.
- A lane could self-certify with its own checker.
- Re-audits could churn while lanes move fast; pinned SHAs handle that.
=== END PLAN ===

=== MERGE branch=lane/red-team/quest-state-audit ===

=== AGENT name=player-text-audit model=opus base=lane/red-team/integration ===
**GOAL.** A judge or first-time player reads every word ECHO shows: dialogue, terminal labels, HUD, objectives, failure lines, teach-back questions and answers, and credits. No physics falsehood or misleading label survives, and every owner-ruled string is present exactly. You audit the player-visible text and write findings for story-ui (and any other owning lane). You edit no product files.

**VISION.** ECHO teaches no-cloning, no-signalling and teleportation truthfully (vision §2.4, §7.5). Novelty and Technical Execution can be scored 0 by the panel (`vault/Research/judging-rubric.md`). One misleading line ("message sent through entanglement", "relay readout", "certified random", "the particle travelled") undoes the physics the code gets right.

**WHAT WE ARE BUILDING.** A Qollab-native Three.js game under `echo/`. Story-ui owns `echo/data/` (story.js, objectives.js, teachback.js), `echo/ui/` (dialogue, hud, menu, accessibility) and `echo/main.css`. The target is `lane/story-ui/integration` @ **320613e**. Its latest merge, "data-fixes" (9127f62), claims branch-true teleport failure lines, ruled credits and bit labels, and a sabotage run of 48 cases with 4 old nulls. Treat those claims as hypotheses.

**WHAT HAS NOT WORKED.**
- Each lane's suite was green while the whole product was broken (0002: gameplay passed on a fake).
- A lane's own checker is producer metadata (laws 4 and 6).
- Do not grade the text with story-ui's tests. Derive the expected set yourself from the owner docs and rulings.

**Vault and docs to read first:**
- `vault/AGENTS.md`, `vault/Index.md`
- `vault/Reports/physics-oracle-audit.md` (P2, P5, the spec rows marked AMBIGUOUS)
- `vault/Reports/physics-code-audit.md`, `vault/Reports/quest-state-audit.md`
- `vault/Research/judging-rubric.md` §7
- `ECHO_MASTER_VISION.md` §2.4, §5 (story beats), §7, §9 and §11 (UI/accessibility); `CLAUDE.md`
- `lanes/red-team/rulings.md`, and the story-ui report under `vault/Reports/` on that branch

**Where to start.**
1. `git archive 320613e echo | tar -x -C $(mktemp -d)`. Never check out or commit to another lane's branch.
2. Build an **independent expected set** from the docs and rulings before you read story-ui's strings. It needs:
   - **(a) Required strings:**
     - "LOCAL BELL-HALF READOUT m1" and the matching m0 source-readout label
     - the Mission 2 receiver panel labelled EXACT, with no sampled counts
     - the bits shown before the X/Z choice
     - all four X/Z choices offered
     - the attribution line verbatim: "This effort is supported by Qollab & IonQ"
     - credits exactly: "Team The Quantubians (NYU Tandon School of Engineering) — Udaya (captain), George, Harman, Epa", no emails, license "udsy19 and contributors", MIT
     - the theme "Quantum Unlocked"
   - **(b) Forbidden claims:**
     - FTL or a message sent by entanglement alone
     - a cloned or copied unknown state
     - "certified (quantum) random"
     - matter, particle or person teleportation
     - the token reused or re-measured
     - "RELAY READOUT" for m1
     - any result claimed to have run on IonQ or Qollab
     - a WCAG claim beyond the checks actually run
   - **(c) Correctness rules:** the correction rule stated as X iff m1=1, Z iff m0=1, and in the right order. Endianness wording must match the oracle's `out/endianness_table.txt`.
   - **(d) The teach-back answers** must be the three physics truths in plain words.
3. Write the checker FIRST (law 3). Run it against a deliberately bad fixture and watch it go red, then run it on the export. Use a byte-level scan for homoglyphs and lookalikes (law 13a). Your forbidden-claim detector must not be written only in story-ui's own vocabulary (law 4a), so add paraphrase variants.
4. Run a sabotage round on a disposable copy:
   - inject each forbidden claim
   - delete each required string
   - swap m0/m1 in the rule text
   - replace a hyphen with a lookalike character

   Report the nulls.
5. Read every line by eye as well. A newcomer-confusion list (jargon before definition, ambiguous pronouns, missing "why") is a valid finding class. Label it UX, not physics.
6. Check the 4 nulls story-ui says it still has: are they real gaps?

**Deliver:**
- `evidence/red-team/player-text-audit/` with the expected set, the checker, `reproduce.sh`, and `out/` (findings table: file:line · string · rule violated · doc citation · owning lane · severity; sabotage table).
- `vault/Reports/player-text-audit.md`.
- A report at `lanes/red-team/reports/0004-player-text-audit.md` with: TL;DR, a **Vault check** first, findings per owning lane, nulls, what you did not verify, and next steps.
- Do not regenerate hubs, the Map or the Index.

**How I will judge it.**
- I re-run `reproduce.sh` on a `git archive` export. It must reproduce your counts.
- Every finding cites a doc line, and the expected set does not come from story-ui's files.
- The sabotage table shows every check going red at least once.
- Unscoped negatives are rejected (law 17). For example, "no FTL wording" must be scoped to "in `echo/data`+`echo/ui` @320613e".

**Checkpoint** (a commit plus a short report section): within 1 h. The 2 h budget is hard.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 6: You can't reproduce a worker's `reproduce.sh` from inside a `git archive` export. The script calls `git -C $HERE rev-parse` and `git archive <sha>`, so in a non-repo export it builds empty trees, and every scenario comes out "unexpected" (0/23). That is a verifier artefact, not a defect. Verify with the harness from the branch export plus product trees exported from this repo (`git archive <sha> echo`). Done that way, quest-state-audit reproduced exactly: 13 green / 8 red, 23/23 as expected. Future briefs should ask for reproduce.sh to take an optional `--repo` argument.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 6: Slot priority with cap 2: cross-lane-recheck (integration gate) > player-text-audit (never audited; judge-visible truthfulness, and the zeroable Novelty and Technical Execution traits) > quest-state-regrade on gameplay cbd8098 (it re-grades known findings Q1–Q5 on a migrated API). The regrade takes the next free slot. Gameplay's "migration adds a latch" is unverified until our harness walks it.
=== END LEARN ===
