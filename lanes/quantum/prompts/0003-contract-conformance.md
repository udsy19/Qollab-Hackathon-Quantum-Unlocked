# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `quantum`. Read `/Users/udsy/agent-org/lanes/quantum/context.md`
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
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/quantum/renders/<your agent name>/` (PNG, descriptive
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
  - `## Questions for the owner` — anything the vision docs do not settle (owner rule: ask, never assume);
  - what the supervisor should do next (LAST, so it is in the tail the supervisor reads).

- **Lane ownership.** You edit only this lane's files: quantum: `echo/quantum/`, `echo/tests/` (quantum tests). Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 3)

You are agent `contract-conformance` in worktree `/Users/udsy/agent-org/lanes/quantum/wt/contract-conformance` on branch `lane/quantum/contract-conformance`.

**GOAL.** Every dict this lane's Python returns to the game must be accepted by the platform's real `validateExperimentResult`, unchanged and with no special cases. The terminal UI calls that validator on every bridge result. If a result is rejected, the player sees "scientific module error" instead of the puzzle (CONTRACTS.md). At the moment nobody has measured whether our outputs pass.

**VISION.** ECHO's quantum puzzles must be driven by real local Qiskit, with honest engine labels (exact probabilities never pretend to be shot counts) and exactly one selected-backend job (vision §7, §8.4, §10.2–10.7).

**WHAT WE ARE BUILDING.** `echo/quantum/` (this lane owns it; `echo/tests/` also): `formats.py` (the builder and refusal list), `cloning.py`, `entanglement.py`, `teleportation.py`, `qollab_job.py`.

**WHAT HAS NOT WORKED / KNOWN GAPS**
- quantum-core emits extra fields: `kind`, `details`, `circuitText`. The deferred check uses `kind="deferred_measurement_verification"`.
- `qollab_job` uses `experiment: 'bell_verification'` and a `summary` field. Neither is in platform's `experiment` union (`cloning | bell_signalling | teleportation`).
- The proposed contract `vault/Design/experiment-result-contract.md` was written before platform's file existed. It may now be stale; if it is, mark it `status: outdated` with a reason.
- Do not optimise for "validator returns []". The goal is a result the UI can show truthfully. If the contract cannot express something the physics needs (the Bell verification job, the deferred verification), do not distort our output to squeeze it in. Write the exact addition as a request to platform.

**Vault and docs to read first:**
- `vault/AGENTS.md`
- `vault/Index.md`
- `vault/Design/experiment-result-contract.md`
- `vault/Reports/quantum-engine-g1.md`
- `vault/Research/qollab-backend-from-js-projects.md`
- vision §8.4 and §10.2–10.7
- `/Users/udsy/agent-org/lanes/quantum/reports/0001-quantum-core.md` and `0001-backend-job.md`

**The platform contract** is platform-owned, so do NOT copy it into our branch. Read it with:
- `git show lane/platform/integration:echo/contracts.js`
- `git show lane/platform/integration:echo/CONTRACTS.md`

To run it, extract it to `/tmp/<yourdir>/contracts.js`.

**Where to start.**
1. Write the check first: a script under `evidence/quantum/contract-conformance/` that calls EVERY public bridge function across its full input space and dumps each dict with `json.dumps`. The functions and inputs are:
   - every state;
   - every sender gate;
   - all 4 branches × 4 choices;
   - `verify_deferred`, `corrections_withheld` and `live_commit`;
   - `qollab_job`, fed a fake counts dict.
2. Run each dict through platform's validator with node, and record the error list per call. Watch it go red.
3. Then fix our side wherever our side is wrong.
4. Add a pytest in `echo/tests/` that would catch a regression. It must not depend on Node at test time unless you justify that.

**Also:** the sabotage null `trace-wrong-qubit-cloning` stayed green. Determine whether the cloning dict can tell source from copy at all. Either add a check that bites, with a red/green demonstration, or show with numbers why the two are indistinguishable for every catalogue state.

**Deliver**
- commits on your branch;
- a per-function conformance table (before and after), and the sabotage of your new check;
- an exact, minimal contract-addition request for platform (field names, values, why), if one is needed;
- the report at `/Users/udsy/agent-org/lanes/quantum/reports/0002-contract-conformance.md`.

**How I will judge.**
- I rerun your conformance script against platform's contracts.js myself.
- No test is weakened.
- No field is renamed in a way that loses honesty (counts against exact).

**Report.** It opens with "Vault check", then TL;DR, evidence paths, nulls, "Not verified", "Questions for the owner". Write a checkpoint report within 1 h.

**Write your report to `/Users/udsy/agent-org/lanes/quantum/reports/0003-contract-conformance.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/quantum/renders/contract-conformance/` (PNG; only images newer than its last consult are shown to it).
