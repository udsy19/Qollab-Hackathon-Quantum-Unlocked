# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `red-team`. Read `/Users/udsy/agent-org/lanes/red-team/context.md`
first: the product, the owner's rulings and what has NOT worked.

- **HEADLESS.** Your process exits the moment you end your turn. Run every command in the FOREGROUND and
  wait for it. Never use run_in_background or Monitor, and never end your turn "to wait". Write your report
  before you stop.
- **VAULT FIRST (mandatory).** Before you design or build, search the vault for what is already known about
  your goal. Start at `vault/AGENTS.md` (routing), `vault/Index.md` (decided, measured, tried, rejected) and
  `vault/Map-code.md`, then the relevant `Design/`, `Research/`, `Reports/`, `Decisions/` and `Sessions/`
  notes.
  - Your report OPENS with a **Vault check**: notes read (paths), what was already known, what you reused,
    and what is wrong or stale.
  - Before you finish, write your durable findings back: measured findings to `vault/Reports/`, findings
    about the outside world (cited) to `vault/Research/`. Where each kind of finding goes:
    `vault/Design/lanes-and-supervisors.md` § Where research findings go.
  - **Never edit or commit the generated files**: the folder hubs (`vault/**/README.md`), `vault/Map.md`
    and `vault/Index.md` (its PROMOTED block is the overseer's). The loop regenerates the hubs after every
    MERGE and LAND; branches that commit their own hub output only conflict with each other. Run
    `node scripts/vault-hubs.mjs --check` if you want to see that your note will be linked.
  - Before writing any new symbol: `vault/Index.md`, then `node scripts/where.mjs <name> --branches`,
    then `git grep` (`.claude/rules/no-bloat.md`). Delete what your change supersedes.
  - Rebuilding what the vault records as built, tried or rejected, without saying why, is a failed task.
- **GOAL, not tests.** Derive the checks you need from your goal. Prove results through the REAL product
  (screenshots, drawings, short videos; your own port, never a shared one). Never weaken or delete a test.
  If a test is wrong, prove it and replace it.
- **Your worktree and branch are your own.** Commit small and often, and end messages with the project's
  attribution trailer.
  - Never push or merge to main yourself.
  - Never force-push.
  - Never run `git config` against the shared repo (all worktrees share one `.git/config`).
  - Tests that commit must use a throw-away repo.
  - Do not edit protected paths (`vault/Plan.md`, `vault/Roadmap.md`, `vault/Decisions/`,
    `.claude/rules/`, and the owner's vision docs `ECHO_MASTER_VISION.md`, `ROADMAP_48_HOURS.md`, `QOLLAB_DEPLOYMENT.md`, `CLAUDE_CODE_PROMPTS.md`); a hook refuses it and a landing gate re-checks it. To change one, file
    `node scripts/propose.mjs --row <id> --kind … --why "…"` and say so in your report.
  - No auto-memory: no `memory:` frontmatter, no `.claude/agent-memory/` (per-branch copies conflict).
- **Builds.** Use your own build dir (already set in your env). Heavy builds go through the machine-wide
  queue (it is on your PATH). Build only what you need.
- **Sub-agents.** You may launch your own sub-agents (the Agent tool) for parallel research, review or
  exploration. Give each a goal-framed brief, and merge their findings into YOUR report. You are
  accountable for them. Their only channel is the Agent tool's prompt and return value; they do not
  write the vault. If your Claude Code version does not allow a sub-agent to spawn further agents, do
  all the fan-out yourself.
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/red-team/renders/<your agent name>/` (PNG, descriptive
  names). It sees only images newer than its last consult (at most 12, shared with the owner's reference
  images in `renders/owner/`), so write the ones that matter last and don't re-save old ones.
- **Never print or commit secrets.**
- **CHECKPOINT REPORT.** You have a fixed time budget. Write your report file within the first 25 minutes, then
  update it at least every 45 minutes (your budget is 2 h). Each update covers state, commits, evidence and next. The final version
  replaces it. Never let more than 45 minutes of findings exist only in your head.
- **REPORT** (to the path at the end of your brief). The supervisor sees its `## TL;DR`, its first ~2k
  characters and its last ~3k, so the shape matters:
  - `## TL;DR` FIRST, at most 10 lines: outcome, evidence paths, what you recommend;
  - Vault check;
  - what you found;
  - what you changed (commits);
  - evidence paths;
  - what you did NOT do or could not verify;
  - `## Decisions inferred from the docs` — each choice the docs did not settle explicitly, with the doc section you inferred it from (autonomous mode; ask the owner only about spend, access, publishing or credit names);
  - what the supervisor should do next (LAST, so it is in the tail the supervisor reads).

- **Lane ownership.** You edit only this lane's files: red-team: no product files; reports in `vault/Reports/`. Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 7)

You are agent `quest-state-regrade` in worktree `/Users/udsy/agent-org/lanes/red-team/wt/quest-state-regrade` on branch `lane/red-team/quest-state-regrade`.

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

**Write your report to `/Users/udsy/agent-org/lanes/red-team/reports/0007-quest-state-regrade.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/red-team/renders/quest-state-regrade/` (PNG; only images newer than its last consult are shown to it).
