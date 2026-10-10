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


# YOUR BRIEF (supervisor, consult 11)

You are agent `tests-caps-clean` in worktree `/Users/udsy/agent-org/lanes/quantum/wt/tests-caps-clean` on branch `lane/quantum/tests-caps-clean`.

**GOAL:** The Qollab static-caps gate (`node tools/qollab-caps/check.mjs`) must stop flagging the quantum lane's own test file, without weakening any test. Today it reports three findings in `echo/tests/test_qollab_job.py`:
- `:91 hardcoded-backend ionq_job`
- `:207 hardcoded-backend "ionq_simulator"`
- `:207 hardcoded-secret api_key`

These files ship inside `echo/`, the upload. A judge or the gate must never see what looks like a hardcoded backend id or a key in published code.

**VISION:** CLAUDE.md says "Do not hardcode a backend … or require auth keys". `.claude/rules/qollab-runtime.md` says `echo/` is uploaded as-is. Gap rows 4–5 in `vault/Reports/quantum-vs-contracts-v2.md` list these findings.

**WHAT WE ARE BUILDING:** The quantum engine's test suite in `echo/tests/` (595 tests on the hardened engine). It shows a judge that the physics is checked.

**WHAT HAS NOT WORKED / constraints:**
- Do not delete these tests or make them vacuous. Find out first what each flagged test protects. They probably assert that the engine never hardcodes a backend and never asks for a key.
- Keep that protection. For example, build the forbidden strings at runtime so no literal appears, or take them from a fixture outside `echo/`. Do not edit `tools/qollab-caps/` (platform owns it), and do not add an exemption to it.
- Do not edit `echo/quantum/*.py` or `bridge.js`; bridge-rewire is running on bridge.js.
- Caveat: caps does not scan f-string expressions or string-built access (its LIMITATIONS). If you rely on that blind spot to dodge the gate, you have to show the test still bites.

**Vault notes:**
- `vault/AGENTS.md`
- `vault/Index.md`
- `vault/Reports/qollab-caps-gate.md` (rule table)
- `vault/Reports/quantum-vs-contracts-v2.md` (gap rows 4–5)
- `vault/Reports/quantum-hardening.md`

**Start:**
1. If `git merge-base --is-ancestor lane/quantum/quantum-hardening HEAD` fails, run `git merge lane/quantum/quantum-hardening` first.
2. Run caps and pytest, then save the red-before log.

**Deliver:**
- An edit to `test_qollab_job.py`, and to `conftest.py` only if it is needed.
- `evidence/quantum/tests-caps-clean/`, containing:
  - caps before and after, with the after state showing only `entry-index`, `entry-main` and `backend-run-python`;
  - pytest after (595 or more passed);
  - a sabotage proving each edited test still goes red. Mutate a disposable copy of `qollab_job.py` so it hardcodes `"ionq_simulator"` or reads an `api_key`, show the test fails, and report any nulls.
- Before your final report: merge the current `lane/quantum/integration` and regenerate hubs and Index (`node scripts/vault-hubs.mjs`, `python3 scripts/gen-subject-index.py`, both `--check` exit 0).

**How I judge:** I re-run caps, pytest and your sabotage on a detached worktree. I need the 3 findings gone, no test count drop, and every sabotage red.

**Report:** `lanes/quantum/reports/` — opens with a Vault check; TL;DR, commands with exit codes, nulls. Checkpoint within 1 h; hard stop 01:30 ET.

**Write your report to `/Users/udsy/agent-org/lanes/quantum/reports/0011-tests-caps-clean.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/quantum/renders/tests-caps-clean/` (PNG; only images newer than its last consult are shown to it).
