# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `platform`. Read `/Users/udsy/agent-org/lanes/platform/context.md`
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
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/platform/renders/<your agent name>/` (PNG, descriptive
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

- **Lane ownership.** You edit only this lane's files: platform: `echo/main.js`, `echo/index.html`, shared contracts, `echo/README.md`, `tools/` (local runner), release files. Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 13)

You are agent `caps-backend-run-forms` in worktree `/Users/udsy/agent-org/lanes/platform/wt/caps-backend-run-forms` on branch `lane/platform/caps-backend-run-forms`.

**GOAL.** The qollab-caps gate must catch every way the `echo/` upload could make a second `backend.run`, or one outside the ruled site. It must also stop reporting false reds on files that *assert the absence* of forbidden things. The overseer and the owner trust this gate's GREEN before uploading to Qollab. If it misses one form, the submission can make two IonQ jobs and fail on Qollab's one-job rule. If it cries wolf, people learn to ignore it.

**VISION.** QOLLAB_DEPLOYMENT.md: at most one `backend.run` per run, through the injected `backend`, with no hardcoded backend. The owner's ruling is "exactly one guarded backend.run site (`echo/quantum/bridge.js` `verifySelectedBackendOnce`)", and `main.js` calls that function rather than `backend.run`. Red-team fix (b)/(c) is in `lanes/platform/owner-answers.md` § "cross-lane-recheck".

**WHAT WE ARE BUILDING.** An extension of `tools/qollab-caps/check.mjs`. Do not write a new gate; search with `node scripts/where.mjs` and `git grep` first. You own `tools/qollab-caps/` and its fixtures only. Do not edit `echo/`.

**WHAT HAS NOT WORKED.**
- Red-team found these escape the gate:
  - destructured `const {run} = backend; run(qc)`;
  - an aliased `const b = backend; b.run(...)`;
  - `backend['run']`;
  - Python `getattr(backend, "run")`.
- It also found 2 false positives: files that contain the forbidden pattern only inside an assertion that it is absent, such as tests or docs strings.
- Contract-gate history (`vault/Reports/contracts-pin-thresholds.md`): redundant guards hid a loosened value, and a declared null on a ruled value was not acceptable.

**Read first (Vault check required in your report):**
- `vault/Index.md`;
- `vault/Reports/` notes for echo-caps-gate and integration-shell;
- `vault/Research/qollab-js-runtime-internals.md`;
- `lanes/red-team/reports/*cross-lane-recheck*.md` and `*physics-code-audit*.md`, for the exact null and false-positive cases and their paths;
- `.claude/rules/gate-independence.md`, laws 3, 4a, 8 and 15.

**Where to start.**
1. Write fixtures FIRST, one per escaping form, JS and Python, and watch them go GREEN on today's gate. That is the red-first evidence that the gate is blind.
2. Write fixtures for the two false-positive files and watch them go RED today.
3. Add a rule: the number of `backend.run` call sites in the whole tree, counted through aliases and destructuring, must be ≤ 1. The one site must be `echo/quantum/bridge.js`. Any `run` reached from `backend` elsewhere is RED.
4. Do not calibrate the detector on the red-team's exact strings (law 4a). Add at least two forms they did not name, such as `Reflect.get(backend,'run')` and `backend.run.call(...)`, or a spread.
5. For the false positives, prefer a scoped rule, such as excluding files the release assembler excludes (`echo/tests/`) or matching only executable code. Never a blanket comment-strip that would hide real code.

**Deliver:**
- commits on `lane/platform/caps-backend-run-forms`;
- an evidence dir `evidence/platform/caps-backend-run-forms/` with a README table (command, exit, log) covering: fixtures red-first then green, the integration `echo/` result, and an assembled-tree run if `tools/assemble-echo` can build one;
- a sabotage round that disables each new detector in turn, with the nulls reported;
- `vault/Reports/caps-backend-run-forms.md`.

**How I will judge it.**
- My own `git archive` extract run.
- My own hand-written aliased double-run `main.js` must go RED.
- The real integration `echo/` must not go RED on the new rules unless there is a genuine second site, and you name it.
- The `diff --stat` must stay inside `tools/qollab-caps/`, `evidence/` and `vault/Reports/`.

**Report** to `lanes/platform/reports/` with a checkpoint within 1 h. It opens with the Vault check, then TL;DR, evidence paths, nulls, decisions inferred from the docs (with citations), and requests.

**Write your report to `/Users/udsy/agent-org/lanes/platform/reports/0013-caps-backend-run-forms.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/platform/renders/caps-backend-run-forms/` (PNG; only images newer than its last consult are shown to it).
