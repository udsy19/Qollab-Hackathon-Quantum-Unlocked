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


# YOUR BRIEF (supervisor, consult 4)

You are agent `gameplay-commit-fault-exit` in worktree `/Users/udsy/agent-org/lanes/gameplay/wt/gameplay-commit-fault-exit` on branch `lane/gameplay/gameplay-commit-fault-exit`.

**GOAL.** A player whose final COMMIT comes back from the engine but is refused must never be stranded. Today `commitTransfer()` latches `measured_refused_awaiting_ruling`. The quest then sits in TELEPORT_DRY_RUN_PASSED with COMMIT disabled and nothing to do. That is a soft-lock: see `evidence/gameplay-contracts-migration/playthrough/11-commit-measured-but-refused-latched.png`. Fix it as the supervisor ruled below.

**VISION.** ECHO is judged by first-time players. A soft-lock at the climax is the worst possible failure. The physics must still stay honest:
- The story token is measured once (§7.4 l.507).
- There is no fabricated success (§12.3).

**WHAT WE ARE BUILDING.** The gameplay quest core lives in `echo/game/state.js`, with the commit latch in `COMMIT_STATUS`. The dev harness is `dev/gameplay/{harness.html,devTerminal.js,playthrough.mjs,fakeQuantum.js}`. Primitive dev UI only; story-ui owns the real terminal.

**THE RULING (supervisor, from the docs; autonomous mode):**
- §7.4 l.507: at commit, the calibrated receiver applies X/Z conditioned on the live bits. The player picks nothing, so a refused recorded commit can only mean an engine fault after measurement.
- The token is consumed. It may NEVER be re-measured, so COMMIT stays latched.
- The session must offer an honest way out:
  1. Set the latch status to a plain name, e.g. `measured_refused`. Drop "awaiting_ruling" everywhere: code, harness, tests, playthrough.
  2. Expose enough for UI to show an honest scientific-module error stating that the story token was measured and consumed, and that verification failed, together with the refusal reason.
  3. RESTART (`resetGame()`, §9.5) is the way forward and is offered from that state. A new session gets a fresh story token, a fresh epoch and an IDLE latch.
- Keep everything else as it is:
  - An ERRORED call (nothing measured) stays retryable.
  - A result that arrives after a reset is dropped.
  - The one-shot proof stays.
- If contracts.js would need a new edge or event for this, do NOT edit it (platform owns it). Use `resetGame()`, which already exists, and put any contract request in your report.

**WHAT HAS NOT WORKED.** The previous worker latched correctly but left a dead end, and labelled it as waiting for an owner ruling. Autonomous mode means design choices are decided from the docs. Do not raise this as an owner question.

**Vault notes to read:**
- `vault/Reports/quest-state-machine-contract.md`
- `vault/Reports/quest-core-adversarial-review.md` (F4)
- `vault/Reports/shared-contracts.md`
- `lanes/gameplay/rulings.md` (the consult-3 commit ruling)
- `evidence/gameplay-contracts-migration/README.md`

**Where to start.** `echo/game/state.js` lines ~39–170 (`commitTransfer`), `dev/gameplay/playthrough.mjs` ~l.149–160, and `dev/gameplay/devTerminal.js`.

**Deliver:**
- A red-first check: an engine-faulted commit leaves the player with an offered RESTART, and after RESTART a full second session can commit. Show it red on the current tip before your change.
- The fix.
- A sabotage pair, each of which must go red:
  - remove the RESTART offer;
  - let COMMIT re-arm after a measured refusal.
- The harness playthrough on your OWN port, showing:
  - a PNG of the honest error with RESTART offered;
  - a PNG of the next session reaching ENDING.
- Evidence under `evidence/gameplay-commit-fault-exit/` with a README.
- A short addendum to `vault/Reports/quest-state-machine-contract.md`.
- Grep for "awaiting_ruling" returns zero.

**How I will judge it.** I re-run `node --test 'dev/gameplay/tests/*.test.mjs'` in a scratch worktree and look at your PNGs. I check that the token is still never re-measured: the engine commit-call count stays at 1 per session.

**Report:** `lanes/gameplay/reports/0004-gameplay-commit-fault-exit.md`. Open with a Vault check, then TL;DR, evidence paths, nulls, and requests for other lanes. Checkpoint within 1 h; this should take well under that.

**Write your report to `/Users/udsy/agent-org/lanes/gameplay/reports/0004-gameplay-commit-fault-exit.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/gameplay/renders/gameplay-commit-fault-exit/` (PNG; only images newer than its last consult are shown to it).
