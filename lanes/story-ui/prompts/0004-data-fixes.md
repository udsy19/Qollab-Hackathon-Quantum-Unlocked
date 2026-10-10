# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `story-ui`. Read `/Users/udsy/agent-org/lanes/story-ui/context.md`
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
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/story-ui/renders/<your agent name>/` (PNG, descriptive
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

- **Lane ownership.** You edit only this lane's files: story-ui: `echo/ui/`, `echo/data/`, `echo/main.css`. Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 4)

You are agent `data-fixes` in worktree `/Users/udsy/agent-org/lanes/story-ui/wt/data-fixes` on branch `lane/story-ui/data-fixes`.

You are agent `data-fixes`. You edit only `echo/data/` (plus evidence and a vault report).

**GOAL:** Every line of ECHO's story text is true for every outcome the player can reach and agrees with the owner's rulings. A judge reading any line cannot catch a physics error or a contradiction.

**VISION:** `ECHO_MASTER_VISION.md` §2.4, §4, §7 (normative physics) and §9.1. Owner rulings are in `/Users/udsy/agent-org/lanes/story-ui/rulings.md`.

**WHAT WE ARE BUILDING:** fixes to `echo/data/{story,objectives,teachback}.js`, which were merged at consult 3. My physics read found these defects:
1. **Credits** are still `TODO_OWNER`. Use exactly: "Team The Quantubians (NYU Tandon School of Engineering): Udaya (captain), George, Harman, Epa". No emails. The license line is "udsy19 and contributors", and the attribution reads "This effort is supported by Qollab & IonQ".
2. **The m1 label** reads `m1  LOCAL BELL-HALF READOUT`. The ruling is exactly "LOCAL BELL-HALF READOUT m1", and m0 should read "SOURCE READOUT m0" for parallelism.
3. **`FAILURES.teleportation.extra_X` / `extra_Z`** say "a state that was already right". That is false when the other bit is 1. Rewrite every teleportation failure line so it is true for all 4 bit pairs × all 4 X/Z plans for which it can be shown, and say in a table which (bits, plan) pairs select which line.
4. **The rooftop dry run** mentions a "partner at the vault". That contradicts VEGA's "don't spend vault pairs on experiments". Dry runs use the in-room test rig on fresh calibration states. Only COMMIT spends the vault pair.
5. **Countdown at zero:** add a line. Per vision line 89 and line 787, the display holds at 00:00 with a held status line, there is no game-over and the story continues.
6. **Settled rulings to make consistent:** VEGA is a maintenance voice at the booth and fully awakens at the relay. The relay holds many pre-shared pairs plus a test rig. Rin has no pronouns. The teach-back is 1 right and 2 wrong choices, each with a "why", and no score. COMMIT unlocks after one correct non-00 dry run. Captions are always on.

**WHAT HAS NOT WORKED:** the phrase-gate `evidence/story-ui/story-data/check.mjs` had 4 sabotage nulls and cannot judge physics. A branch-dependent falsehood (item 3) got past it. Checking a line against one example is not enough.

**Vault notes:**
- `vault/AGENTS.md`, `vault/Index.md`
- `vault/Reports/story-data-script-gate.md`
- `evidence/story-ui/story-data/{README.md,03-sabotage.md,script.md}`

**Where to start:**
1. **Extend `check.mjs` first, then watch it go red on the current data.** Add checks for the credits string, both bit labels, the absence of "partner at the vault" and the presence of a zero-countdown beat.
2. **Add the branch-truth check.** Build an independent table, in a small Python script using the repo venv's Qiskit, of the receiver fidelity for each (m0, m1, X, Z) on a generic state (`ry(1.137)` then `rz(0.44)`). For each failure line, record the claim class it makes (for example "missing Z", "state was already right"). Assert that the class is consistent with the computed fidelity for every pair that selects it.
3. Then fix the data, run the gate to green, run `sabotage.mjs` again and report the nulls.
4. Regenerate `script.md` with `render-script.mjs`.

**Deliver:**
- commits on your branch
- the gate red, then green: the command, its exit code and the output files
- the branch-truth table at `evidence/story-ui/data-fixes/branch-truth.md`
- a diff of every changed line, old and new
- an update to `vault/Reports/story-data-script-gate.md`

**How I will judge:** I will read the new failure lines myself against the 16 cases in your table. The credits must match the ruling byte for byte, and the gate must go red on a sabotage of each new check.

**Report:** `/Users/udsy/agent-org/lanes/story-ui/reports/0002-data-fixes.md`. It opens with `## TL;DR` and the Vault check and ends with what the supervisor should do next. Checkpoint within 25 minutes.

**Write your report to `/Users/udsy/agent-org/lanes/story-ui/reports/0004-data-fixes.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/story-ui/renders/data-fixes/` (PNG; only images newer than its last consult are shown to it).
