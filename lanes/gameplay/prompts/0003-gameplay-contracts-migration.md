# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `gameplay`. Read `/Users/udsy/agent-org/lanes/gameplay/context.md`
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
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/gameplay/renders/<your agent name>/` (PNG, descriptive
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

- **Lane ownership.** You edit only this lane's files: gameplay: `echo/game/` (not `audio.js`), `echo/scene/` (not lighting/rain/props/buildings/effects). Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 3)

You are agent `gameplay-contracts-migration` in worktree `/Users/udsy/agent-org/lanes/gameplay/wt/gameplay-contracts-migration` on branch `lane/gameplay/gameplay-contracts-migration`.

**GOAL.** The player's quest can never jam, skip, double-fire or rewind. There must be exactly ONE quest table in ECHO, and it is platform's `echo/contracts.js`. Gameplay's quest core imports it and keeps no copy. The robustness defects an adversarial review found are fixed and shown fixed through the real harness.

**VISION.** ECHO: ONE OF ONE (vision §9 quest states, §7.4 the token is consumed once, §8.7 bus). A judge plays title→credits on Qollab. The quest machine is the spine that every terminal, world reaction and ending hangs from. Two diverging tables mean a world that sticks at BOOT (review F1).

**WHAT WE ARE BUILDING.** The gameplay lane's `echo/game/` quest core: `state.js`, `eventBus.js`, `missionRules.js` and `objectives.js`. It also includes the dev-only fake, terminal and harness under `dev/gameplay/`, which ship nothing into `echo/`. The 3D world is being built in parallel by `gameplay-world-controller`. Do NOT touch `echo/scene/` or `app.js`.

**WHAT HAS NOT WORKED.**
- Gameplay wrote its own QUEST_STATES/TRANSITIONS and the `quest:enter:*` vocabulary before platform's contracts existed. The two diverged:
  - BOOTED vs BOOT_COMPLETE.
  - RESTART vs `resetGame()`.
  - An array vs a strict proxy table.
  - `quest:transition` vs `QUEST_STATE_CHANGED`.
- A guard that compares state names is ABA-blind (F3).
- A test parser that silently skips a row it cannot parse went green with an edge missing (F8).
- Pauli-eigenstate calibration states let a wrong correction show fidelity 1 (F5). The owner has ruled that dry runs use fresh random generic Bloch states.

**Read first (vault + rules):**
- `vault/AGENTS.md` and `vault/Index.md`.
- `vault/Reports/quest-state-machine-contract.md`.
- `vault/Reports/quest-core-adversarial-review.md`, together with `evidence/gameplay-quest-review/README.md` and its `a1`–`a5` scripts. These are merged into your base.
- `/Users/udsy/agent-org/lanes/gameplay/rulings.md` and `owner-answers.md`, especially the entry "13 lane design questions".
- `.claude/rules/gate-independence.md`, `no-bloat.md` and `lane-ownership.md`.
- On `lane/platform/integration`: `echo/contracts.js` and `echo/CONTRACTS.md`.

**Do:**
1. **Bring in contracts.** Run `git merge lane/platform/integration` into your branch. Do not edit any platform-owned file (`echo/contracts.js`, `echo/CONTRACTS.md`, `echo/main.js`, `echo/index.html`). If contracts.js is missing something gameplay needs, the gap goes in your report as a platform request. Known gaps:
   - The owner-accepted edge `DECLASSIFIED → ENDING`.
   - How RESTART on ENDING is expressed. The owner ruled that ENDING offers RESTART. contracts.js says restart = `resetGame()`. Implement it as `resetGame()` unless contracts says otherwise.
2. **Migrate.** `state.js`:
   - imports `QUEST_STATES`, `TRANSITIONS`, `transition`, `INITIAL_STATE` and `BUS_EVENTS` from `../contracts.js`;
   - deletes its own table, `BOOTED` and `RESTART`;
   - emits `QUEST_STATE_CHANGED {from,to,event}`.

   Keep `commitIsOneShot()` as an import-time assertion against the imported table. Map world reactions to `WORLD_CHANGES`. Delete `quest:enter:*`/`quest:transition` everywhere, including in the tests and the harness. Grep afterwards and report zero references. Replace `dev/gameplay/tests/schema.mjs` with `validateExperimentResult`, and delete schema.mjs.
3. **Fix with red-first checks**, each written and run red before the code changes:
   - **F2:** a run-to-completion queue, so a send or reset inside a listener delivers in order.
   - **F3:** an `epoch` or session token in `createQuestMachine` that every in-flight result carries. A result from before `resetGame()` is dropped.
   - **F4, gameplay half:** a commit latch. Once COMMIT_TRANSFER has been requested, no second commit request can leave gameplay, even if the first one fails or is refused. A failed commit lands in a defined "awaiting owner ruling" state that is visible in the harness. It must NOT re-enable COMMIT. The owner question is pending.
   - **F6:** `eventForResult` returns a refusal, never a throw, on malformed input.
   - **F7:** contradictory Bell probabilities are refused.
   - **F8:** `spec.mjs` fails loudly on any §9.2 row it cannot parse.
4. **Owner rulings 11 and 13:**
   - The fake dry run draws a fresh random generic Bloch state on each attempt, and a wrong X/Z must visibly fail. Re-run `a2_physics.py` against the new fake through Qiskit.
   - `EXPLANATION_READ`/`VIEW_RECEIVER_MARGINAL` advance only after the result panel was shown. Gameplay exposes the gate; story-ui owns the panel, so stub it in the harness.

**Prove it through the product:**
- Re-run `evidence/gameplay-quest-review/*` on your tip. Parts A, B, D and E of a3, and a5, must flip, and a2 must show 0 wrong-correction fidelity-1 cases.
- A headless harness playthrough on YOUR OWN port (not 8611). It goes title→credits→RESTART from ENDING and also covers:
  - reset mid-call with a stale result dropped;
  - a failed commit that stays latched;
  - a wrong dry run that retries on a new state.
- Take PNGs of each moment.
- A sabotage round: revert each fix and remove the epoch, latch and queue one at a time. Report the nulls.

**Deliver** on branch `lane/gameplay/gameplay-contracts-migration`:
- commits;
- `evidence/gameplay-contracts-migration/` with a README;
- an update to `vault/Reports/quest-state-machine-contract.md`. Mark what is superseded instead of silently rewriting it.

**How I will judge:**
- I re-run your tests and the review scripts in a scratch worktree.
- I look at every PNG.
- `git grep` must show no quest table outside contracts.js.
- The diff must touch no platform file.
- If the report and a screenshot disagree, the screenshot wins.

**Report:** `/Users/udsy/agent-org/lanes/gameplay/reports/0003-gameplay-contracts-migration.md`.
- It opens with a **Vault check**, then a TL;DR.
- It includes commands with their exit codes, the evidence paths, the nulls, the platform/quantum requests, what you did NOT verify, and `## Questions for the owner`.
- Write a checkpoint report within 1 h, even if it is partial.

**Write your report to `/Users/udsy/agent-org/lanes/gameplay/reports/0003-gameplay-contracts-migration.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/gameplay/renders/gameplay-contracts-migration/` (PNG; only images newer than its last consult are shown to it).
