=== PLAN ===
**Lane:** red-team. We write reports only and make no product edits. Plan row 7.

**Goal:** Run three independent checks on ECHO: ONE OF ONE and report each, with evidence, to the lane that owns the fix.
1. **Physics audit.** Check Prompt 6 and vision §7 against the real code and tests: every claim, the four (m0,m1) pairs, endianness, the one-`backend.run` limit, and misleading labels.
2. **Blind playtests.** Newcomers play the newest integrated build in a local runner. We record where they get stuck and whether they can answer the teach-back questions.
3. **Rubric score.** Score each of the four traits with evidence. Weights are unknown, so there is no weighted total.

**Approach:** Ground truth comes from the independent oracle, never from the lane's own code (law 4). The spec is treated as a hypothesis (law 5). All sabotage happens on disposable `git archive` exports (law 10). Results are labelled "local runner"; nothing is claimed for Qollab unless `owner-answers.md` records it.

**Done:**
- `physics-oracle-audit` (0001): MERGED in consult 2. I re-verified it: 523 passed, sabotage exit 0. Its four owner questions were all answered: "Accept all four".
- `rubric-research` (0001): **MERGED this consult.** I read `vault/Research/judging-rubric.md` on the branch (6e219d1).
  - Every claim is a verbatim quote with a URL.
  - The published rubric is four names only: no weights, no scale, no sub-criteria, no tie-breaks.
  - The novelty bar can zero both Novelty and Technical Execution.
  - Judges only see the page, the code, one free-simulator Run and the video. IonQ results earn nothing; a failed run costs.

**Now:**
- `physics-code-audit` is still running: checklist C0–C9 on `lane/quantum/integration` a9edce2, plus the one-job guard.
- NEW `quest-state-audit`: checks the gameplay state machine on `lane/gameplay/integration` d5ec620 against vision §9, `echo/contracts.js` and the owner's 13 rulings.
  - The story token is consumed once, and `TELEPORT_COMMITTED` is idempotent (C4).
  - A wrong dry run gets a fresh state.
  - Acknowledgements advance only after the result panel was shown.
  - RESTART on the ending screen.
  - There is no path to the ending without all four corrections.
- NEW `player-text-audit`: every player-facing string in `echo/ui`, `echo/data`, `echo/quantum` result text and `echo/CONTRACTS.md`, checked against the truthful-physics rulings.
  - No FTL, cloning, "certified random" or matter-teleport language.
  - m1 is labelled "LOCAL BELL-HALF READOUT m1".
  - The receiver panel shows exact probabilities labelled EXACT.
  - Bits are shown before corrections.

**Next:**
- **Playtests:** no lane has an `echo/main.js` + `index.html` that runs the game yet (checked this consult: platform has only the contracts, gameplay has only logic, story-ui has the UI shell, art is empty). When a combined playable build appears on any integration branch or main, dispatch 1–2 `blind-playtest` workers, each on its own port. If only a partial slice exists by Sat ~12:00 ET, playtest it anyway, labelled PARTIAL.
- **After the first playtest:** `rubric-score`, using §7 of judging-rubric as the frame and scoring each trait separately.
- **Re-runs:** re-run the physics audit when `echo/quantum` changes materially. Re-run the playtests after G3 and before the Sun 14:00 freeze.
- **Route the cheapest rubric gaps to platform now:** the page copy (run steps, the verbatim attribution line, MIT, and the novelty claim worded as "an original … educational contribution") and the browser list (no Safari or iOS).

**Risks:**
- The graybox is late; G2 is Sat 17:00, otherwise the one-room cut.
- The Impact trait is weak for an education game unless we show a measurable learning outcome. The teach-back results from the playtests are that evidence, so record them carefully.
- A worker could calibrate on the lane's own code (forbidden in every brief).
=== END PLAN ===

=== MERGE branch=lane/red-team/rubric-research ===

=== AGENT name=quest-state-audit model=opus base=lane/red-team/integration ===
**GOAL:** Prove or disprove that ECHO's quest logic can only reach the ending honestly:
- the player cannot skip a mission;
- the story token is measured exactly once, at the final commit;
- a wrong dry run retries on a fresh calibration state;
- the ending is reachable only after the player has seen m0, m1 and chosen corrections.

**VISION:** A judge who presses Run must never see the game break the physics it teaches. Vision §2.4 and §7.5: the token is consumed once and cannot be reused after measurement.

**WHAT WE ARE BUILDING:** ECHO: ONE OF ONE is a Qollab-native Three.js game under `echo/`. The gameplay lane owns `echo/game/` (state machine, mission rules, objectives, event bus). The platform lane owns `echo/contracts.js` and `echo/CONTRACTS.md`. You write **reports only**: no edits to `echo/`, and no commits to any other lane's branch.

**WHAT HAS NOT WORKED:** Auditing a lane's code with checks calibrated on that same code (gate-independence law 4); a test suite that only confirms the code passes its own tests. Derive the expected transitions from the owner's documents, not from `state.js`.

**Vault and docs to read first:**
- `vault/AGENTS.md` and `vault/Index.md`
- `vault/Reports/physics-oracle-audit.md`: checklist item C4 and traps T1–T3
- `vault/Research/judging-rubric.md`
- `ECHO_MASTER_VISION.md` §9 (quest states) and §7.5
- `/Users/udsy/agent-org/lanes/red-team/rulings.md`: in particular the "13 lane design questions" (BOOT→TITLE, DECLASSIFIED edges, wrong dry run → fresh state, RESTART on ENDING, acknowledgements only after the result panel was shown) and "bits first, corrections second".

**Where to start:**
1. Export `lane/gameplay/integration` (d5ec620) and `lane/platform/integration` (6378677) with `git archive <ref> echo | tar -x -C <tmpdir>`. Never check them out and never use `git worktree add`.
2. Write your expected transition table from §9 plus the rulings FIRST, before reading `state.js`.
3. Then drive the real modules with Node (ESM import from the export), firing every event in every state, and diff the result against your table.
4. Specifically try:
   - double-firing `TELEPORT_COMMITTED`;
   - committing before all four correction pairs;
   - reaching ENDING from any state other than the legal one;
   - re-measuring the token after commit;
   - acknowledgement events fired before the result panel is shown;
   - a wrong dry run reusing the same state.
5. Sabotage round, on your export only: break one transition at a time and show your harness goes red. Report the nulls.

**Deliver:**
- A harness under `evidence/red-team/quest-state-audit/` with a README.
- `vault/Reports/quest-state-audit.md`.
- A findings table: id, severity, the file:line on the audited commit, a reproduction and the owning lane.
- Any mismatch between the contracts and §9 goes to the platform lane.

**How I will judge:** I will re-run your harness on a fresh export. The expected table must be traceable to §9 and the rulings line by line. The sabotage table must have at least one red per check. Every negative claim must be scoped to the commit audited.

**Report:** `reports/` with a TL;DR, opening with a Vault check, and ending with `## Questions for the owner` (anything §9 does not settle). Checkpoint within 1 h.
=== END AGENT ===

=== AGENT name=player-text-audit model=opus base=lane/red-team/integration ===
**GOAL:** Every word a player or judge reads in ECHO must be physically true and match the owner's label rulings. Find every string that is not, and file it to the owning lane.

**VISION:** ECHO teaches the no-cloning theorem, no-signalling and teleportation through play. One misleading caption, for example "the relay sends the message", teaches the opposite. Truthful physics is non-negotiable (vision §2.4, §7.5).

**WHAT WE ARE BUILDING:** A Qollab Three.js game under `echo/`. Story-ui owns `echo/ui/`, `echo/data/` and `echo/main.css`. Quantum owns the result text in `echo/quantum/`. Platform owns `echo/CONTRACTS.md` and the page README. You write **reports only**: no product edits.

**WHAT HAS NOT WORKED:** Reading strings by eye; a homoglyph or a near-match slips through (law 13a). Use a search list derived from the rulings, not from the code's own wording (law 4a).

**Vault and docs to read first:**
- `vault/AGENTS.md` and `vault/Index.md`
- `vault/Reports/physics-oracle-audit.md`: rows P1–P6 and the spec-audit table
- `vault/Research/judging-rubric.md` §7: documentation descriptors
- `ECHO_MASTER_VISION.md` §2.4, §7, §10 dialogue/UI text
- `/Users/udsy/agent-org/lanes/red-team/rulings.md`:
  - m1 is labelled "LOCAL BELL-HALF READOUT m1";
  - X/Z are chosen after the bits are seen;
  - the generic state is ry(1.137) then rz(0.44);
  - the Mission 2 receiver shows EXACT `partial_trace` probabilities only;
  - captions are always on.

**Where to start:**
1. `git archive` exports of `lane/story-ui/integration` (cabef98), `lane/quantum/integration` (a9edce2), `lane/platform/integration` (6378677) and `lane/gameplay/integration` (d5ec620) into temp dirs.
2. Build a forbidden/required phrase list from the rulings and vision §2.4 BEFORE you look at the code. Examples:
   - forbidden: "faster than light", "instant message", "copy/clone the state" (as a success), "certified random", "teleport matter", "RELAY READOUT";
   - required: m0/m1 labels, EXACT on receiver probabilities, "simulator"/"local" provenance labels on results.
3. Extract every user-visible string: the JS string literals in UI/data and the Python result messages. Census the bytes, not just the rendered text.
4. Also check that `CLAUDE_CODE_PROMPTS.md` Prompt 6's own wording is consistent with the rulings. Propose fixes only; that doc is owner-only.
5. Sabotage: plant a forbidden phrase and a homoglyph variant into your export, and show your scanner catches both.

**Deliver:**
- A scanner plus its output under `evidence/red-team/player-text-audit/`.
- `vault/Reports/player-text-audit.md`.
- A findings table: string, file:line@commit, the rule it breaks, the suggested wording, and the owning lane.
- Note which required labels do not exist yet because the UI is unbuilt. Name those as MISSING-NOT-YET-BUILT, not as passes.

**How I will judge:** I will re-run the scanner on fresh exports. The phrase list must be cited to the rulings. Sabotage must turn red. The report must be scoped to the commits audited.

**Report:** `reports/`, opening with a Vault check, with `## Questions for the owner`. Checkpoint within 1 h.
=== END AGENT ===

=== ASK_OWNER ===
These come from the rubric research (`vault/Research/judging-rubric.md`, merged). The page copy depends on them.

1. **Theme:** which theme does ECHO declare at submission? Options: **Quantum Unlocked** (teaching game; the vision's framing), Quantum Playground, or both if the form allows two. The theme only decides which "Best of theme" award ECHO is eligible for. My recommendation is Quantum Unlocked.
2. **Accessibility claim:** Qollab names no standard. May the project page state "targets WCAG 2.2 AA"? My recommendation is yes, but only for what we actually test.
3. **Submission form:** when you are signed in, what fields does `/programs/hackathon/register` show (video URL, repo, theme, disclosure)? We cannot see it signed out.
4. **Our weighting note:** our earlier note `qollab-platform-and-submission.md` §4 says the traits are "equally weighted", but no Qollab page says so. May the research lane mark that line as unsourced? (The note is not a protected file.)
=== END ASK ===

=== LEARN ===
2026-10-10 consult 3: The rubric-research note is MERGED. Qollab publishes only the four trait names, with no weights. The novelty bar can zero both Novelty and Technical Execution. Judges see only four things: the page, the code, one free-simulator Run and the video. IonQ results score nothing; a failed run costs. Rubric scores must therefore be reported per trait, never as a weighted total. The Impact trait needs measured teach-back outcomes from the playtests as its evidence. Evidence: `vault/Research/judging-rubric.md`.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 3: Workers must not regenerate or commit hubs, Map or Index; the loop does that after a merge. A worker's `vault-hubs --check` showing STALE for its own new note is expected, not a defect, so don't refuse a merge for it.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 3: At 03:40 UTC no integration branch has a runnable game. Platform has contracts only, gameplay has logic only, story-ui has the UI shell only, and art is empty. Don't dispatch playtests until an `echo/main.js` + `index.html` that runs the game exists on some branch. Before that, audit each lane's code statically through `git archive` exports: quest state, player text and quantum.
=== END LEARN ===
