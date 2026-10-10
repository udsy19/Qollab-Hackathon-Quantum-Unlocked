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


# YOUR BRIEF (supervisor, consult 10)

You are agent `release-upload-manifest` in worktree `/Users/udsy/agent-org/lanes/platform/wt/release-upload-manifest` on branch `lane/platform/release-upload-manifest`.

**GOAL:** The owner, or the overseer, can produce the exact folder to upload to Qollab with one command. That folder holds only what the game needs at runtime: no tests, no dev-only docs. It is proven within Qollab's caps. The same run prints a measured table of what still blocks a clean assembled build, lane by lane.

**VISION:** ECHO must be published and runnable on Qollab (CLAUDE.md "Primary outcome"; QOLLAB_DEPLOYMENT.md: ≤100 files, ≤2 MB each). Every Run loads whatever Python ships, so shipping `echo/tests/` makes Qollab load pytest and about 10 packages per Run (`lanes/platform/reports/0004-integration-shell.md` (d)).

**WHAT WE ARE BUILDING:** `tools/assemble-echo/` already assembles `echo/` from the lane refs. It takes the owner lane's copy for each path and is RED on CONFLICT. Add a release mode (flag name your call), which:
- (1) excludes `echo/tests/**` and `echo/QOLLAB_SMOKE_TEST.md` from the output. This is the supervisor decision of consult 9: they stay in the repo and are not uploaded;
- (2) writes a manifest of every uploaded file with its bytes and sha256;
- (3) runs `tools/qollab-caps/check.mjs` on the output and propagates its exit code;
- (4) prints, per lane ref, the blockers it measured: CONFLICTs, unresolved imports, caps reds, and `backend.run` sites. Each blocker names its file:line.

The exclusion list is declared once, in the assembler. Do not copy it into a second place. Do not touch `echo/main.js`: another worker owns it right now.

**WHAT HAS NOT WORKED:**
- A silent last-writer-wins overlay. It was rejected in consult 4: overlaps must be named.
- Gates that read the producer's own account. Derive the file list from the output bytes, not from the assembler's internal list (gate-independence law 2 and law 8: derive the full expected set).
- "Excluded" claims nobody verified. Prove that the exclusion happened by inspecting the output tree.

**Vault notes to read:**
- `vault/AGENTS.md`, `vault/Index.md`;
- `vault/Reports/integration-shell.md`;
- `vault/Research/qollab-platform-and-submission.md` (caps, README-as-write-up);
- `tools/assemble-echo/` and its fixtures;
- `tools/qollab-caps/` (its README or the header of `check.mjs`);
- `lanes/platform/lane-memory.md` (consults 4 and 9).

**Where to start:**
- Write a fixture first and watch it fail on today's assembler: a quantum ref carrying `echo/tests/test_x.py` and a root `QOLLAB_SMOKE_TEST.md`. The release output must not contain either, and `README.md` must still be present.
- Then implement the release mode.
- Then sabotage these three and report which go red and which do not:
  - remove the exclusion;
  - make the manifest lie by one file;
  - have caps return 1 while the assembler reports 0.

**Deliver:**
- the release mode, with the fixtures green;
- one real run on the current refs (`lane/{quantum,gameplay,story-ui,art}/integration` + `lane/platform/integration`), with the output tree's file count and caps verdict and the blocker table saved under `evidence/platform/release-manifest/`;
- usage in `tools/assemble-echo/` (an existing README or the header comment);
- `vault/Reports/release-upload-manifest.md`.

Commit on your branch only.

**How I will judge it:**
- I re-run the fixtures and the real run myself on a `git archive` extract;
- I count the output files with `find`;
- I check the excluded paths are absent;
- I check that the sabotage results match your report.

A RED real run on today's refs is an acceptable, expected result, provided every red line is attributed to a lane and a file.

**Report:** `lanes/platform/reports/00NN-release-upload-manifest.md`. It opens with TL;DR, then Vault check, evidence paths and nulls. Checkpoint within 1 h.

**Write your report to `/Users/udsy/agent-org/lanes/platform/reports/0010-release-upload-manifest.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/platform/renders/release-upload-manifest/` (PNG; only images newer than its last consult are shown to it).
