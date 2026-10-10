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
  - `## Decisions inferred from the docs` — each choice the docs did not settle explicitly, with the doc section you inferred it from (autonomous mode; ask the owner only about spend, access, publishing or credit names);
  - what the supervisor should do next (LAST, so it is in the tail the supervisor reads).

- **Lane ownership.** You edit only this lane's files: quantum: `echo/quantum/`, `echo/tests/` (quantum tests). Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 7)

You are agent `main-sync` in worktree `/Users/udsy/agent-org/lanes/quantum/wt/main-sync` on branch `lane/quantum/main-sync`.

**GOAL:** the quantum lane's integration branch carries main, including contracts v2 (80d685f) and the platform gates `tools/contract-check/` and `tools/qollab-caps/`. We also need a measured list of exactly what the quantum engine and `bridge.js` still fail under those gates. The next merges (quantum-hardening, then the bridge rewire) can then land on the real contract instead of a stale one.

**VISION:** vision §8.4 has one `ExperimentResult` shape, owned by platform. CLAUDE.md says "Truthful quantum". The owner's ruling says no integrated code lands on main until cross-lane checks pass. G1 is due Sat 04:00 ET.

**WHAT WE ARE BUILDING:** the Qollab-root `echo/` folder. This lane owns `echo/quantum/` and `echo/tests/`.

**WHAT HAS NOT WORKED:**
- Measuring conformance against our own proposal note instead of platform's real validator. Every result was rejected once that mistake was found.
- Gates that cannot fail.
- `git status` used as proof of what a branch carries. Use `git diff --stat main...HEAD`.

**Vault notes to read:**
- `vault/AGENTS.md`, `vault/Index.md`: its promoted lessons include integration drift and test-state traps.
- `vault/Reports/contracts-v2.md` (on main), `vault/Reports/contract-conformance.md`, `vault/Reports/pyodide-bridge.md`.
- `echo/CONTRACTS.md` (main).

**Where to start:** on your branch (based on `lane/quantum/integration`), run `git merge main`. The only expected conflicts are the generated hubs `vault/Map.md` and `vault/Reports/README.md`. Resolve them by regenerating with `node scripts/vault-hubs.mjs`, never by hand-picking a side. Commit the merge.

**Constraints:**
- Do **not** edit any `echo/quantum/*.py` or `echo/tests/*`. A parallel worker (quantum-hardening) owns those right now.
- Do not edit platform files.
- Pick a port of your own if you serve anything.

**Deliver:**
1. The merge commit, with `git diff --stat main...HEAD` showing only quantum-lane files plus the vault.
2. `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs` run on the merged tree. Capture the full output and exit codes in `evidence/quantum/main-sync/`.
3. A short positive control for each gate, run on a disposable copy, showing it goes red on a planted defect. Report any gate that cannot go red.
4. A gap table. For every failure: file:line, the rule it breaks, and which owner fixes it (quantum `.py`, quantum tests, `bridge.js`, or a platform request). Say also whether quantum-hardening's branch (`lane/quantum/quantum-hardening`, head 0893403) would fix it. Check this with `git show`, read-only.
5. `pytest echo/tests -q` on the merged tree, to confirm the merge broke nothing.

**How I will judge it:** I re-run both gates and pytest on a detached worktree of your branch. The gap table must match my run. A gate result you did not show going red counts as unverified.

**Report:** `reports/0006-main-sync.md`. It opens with a **Vault check**, then a TL;DR, then the gap table, the nulls, and `## Questions for the owner` (expect none). Send a checkpoint within 1 h. This task should take about 45 min.

**Write your report to `/Users/udsy/agent-org/lanes/quantum/reports/0007-main-sync.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/quantum/renders/main-sync/` (PNG; only images newer than its last consult are shown to it).
