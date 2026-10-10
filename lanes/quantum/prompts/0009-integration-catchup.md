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


# YOUR BRIEF (supervisor, consult 9)

You are agent `integration-catchup` in worktree `/Users/udsy/agent-org/lanes/quantum/wt/integration-catchup` on branch `lane/quantum/integration-catchup`.

**GOAL:** The quantum lane integration branch carries `main`, which includes contracts v2 (80d685f), `tools/contract-check/` and `tools/qollab-caps/`. Every later quantum merge (hardening, then bridge-rewire) can then be graded against the platform's real v2 contract on one tree.

**VISION:** ECHO: ONE OF ONE ships with one result shape across lanes. Quantum can only prove it conforms on a tree that holds both the engine and platform's v2 validators.

**WHAT WE ARE BUILDING:** A merge commit only. You change no product code: nothing under `echo/` beyond what the merge itself brings in.

**WHAT HAS NOT WORKED:** `lane/quantum/main-sync` (7c72712) already merged main, but it was cut from d9b42d0. Since then integration gained ionq-sim-rehearsal and a hub regeneration (bfcfbc3). The result: `git merge-tree --write-tree lane/quantum/integration lane/quantum/main-sync` conflicts in `vault/Map.md` and `vault/Reports/README.md`, which are generated hubs. Hand-picking a side in a generated hub is wrong; regenerate them.

**Do:**
1. On your branch (based on current `lane/quantum/integration`), run `git merge lane/quantum/main-sync`.
2. Resolve the two hub conflicts by running `node scripts/vault-hubs.mjs`, then `node scripts/vault-hubs.mjs --check`, which must exit 0. If any other file conflicts, stop and report it; do not resolve it.
3. Run `python3 scripts/gen-subject-index.py --check`. If it reports drift, regenerate it.
4. On the merged tree, run `node tools/contract-check/check.mjs`, `node tools/qollab-caps/check.mjs` and `python -m pytest -q echo/tests`. Save the logs to `evidence/quantum/integration-catchup/`, with a short README.
   - Expected: contract-check GREEN; caps RED with exactly the 6 findings in `vault/Reports/quantum-vs-contracts-v2.md`; pytest 452 passed and 1 failed (`test_contract_conformance`, `bell_verification`).
   - Any difference from that is the finding. Report it with its output.
5. Prove the branch carries both sides with `git diff --stat lane/quantum/integration...HEAD` (three dots). It must show the tools and contracts files and the main-sync evidence.

**Vault notes to read:**
- `vault/AGENTS.md`
- `vault/Reports/quantum-vs-contracts-v2.md`
- `lanes/quantum/reports/0007-main-sync.md` (in `/Users/udsy/agent-org/lanes/quantum/reports/`)

**How I will judge it:**
- `git merge-tree` of your tip into integration is clean.
- The hubs `--check` exits 0.
- The three gate logs match the expected numbers, or the deviations are explained.
- `echo/` differs from main-sync's `echo/` by nothing: `git diff lane/quantum/main-sync HEAD -- echo/` shows only what integration already had and main-sync lacked.

**Report:** `reports/NNNN-integration-catchup.md`, opening with a Vault check. Include the TL;DR, commands with their exit codes, and evidence paths. Timebox: 30 min.

**Write your report to `/Users/udsy/agent-org/lanes/quantum/reports/0009-integration-catchup.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/quantum/renders/integration-catchup/` (PNG; only images newer than its last consult are shown to it).
