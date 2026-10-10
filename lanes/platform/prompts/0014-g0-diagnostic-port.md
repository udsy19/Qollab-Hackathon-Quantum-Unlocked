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


# YOUR BRIEF (supervisor, consult 14)

You are agent `g0-diagnostic-port` in worktree `/Users/udsy/agent-org/lanes/platform/wt/g0-diagnostic-port` on branch `lane/platform/g0-diagnostic-port`.

**GOAL:** On Qollab, the overseer can run one build that answers two questions with a single screenshot plus console text:
- (a) Does keyboard and mouse input reach our page inside Qollab's preview iframe?
- (b) Does the one selected-backend job go out and come back while Qollab is still listening?

That build is the integration shell's `echo/main.js`, not the old G0 smoke file.

**VISION:** ECHO: ONE OF ONE is a playable game that judges run on Qollab (CLAUDE.md, vision §1.4). It needs working input in the iframe, and exactly one honest `backend.run` per run (QOLLAB_DEPLOYMENT.md). G0 steps 6–8 are still unproven on Qollab: the overseer's click on Verify got no response at all (`owner-answers.md` § "G0 on real Qollab").

**WHAT WE ARE BUILDING:** Port the work on `lane/platform/g0-input-diagnostic` onto the current `lane/platform/integration` shell. That work is commits adae31b and d5a2ffe, with report `lanes/platform/reports/0005-g0-input-diagnostic.md`, and it contains:
- `echo/diag.js` (`mount`/`unmount`/`markBridgeResult`): capture-phase counters, `hasFocus`, origin, an L-key pointer-lock probe, and the time since the bridge result;
- the guarded 5 s auto-send countdown, with Cancel;
- the rule that `main.js` stays pending until the one job settles;
- the runner changes: `frame.js` drops frame events after `Done.`, and `check.cjs`/`sabotage.sh` gain the scenarios;
- the vault research edits.

The branch was cut from the consult-5 base and is NOT rebased (I checked with `git merge-base --is-ancestor`). Integration's `main.js` was rewritten by integration-shell in the meantime. Its job function is at `echo/main.js` ~line 181–201, with the guard claimed before the first await.

**WHAT HAS NOT WORKED:**
- Two platform workers edited `main.js` from different bases, so a merge would conflict blind. Do NOT `git merge` or `git cherry-pick` adae31b wholesale onto `main.js`. Bring the behaviour into the shell's structure by hand. Take `diag.js` and the runner files from the branch, and reconcile them with any runner changes integration already has.
- Pointer lock is impossible on Qollab (`sandbox="allow-scripts"`). Do not add it.
- A click is not proof: the overseer's automation clicks may never arrive. The auto-send countdown exists so that step 6 is provable without input.

**Hard constraints:**
- There must stay exactly ONE `backend.run` call site in `echo/`. The countdown and the button both go through the same guarded function in `main.js`.
  - Leave a one-line comment that this function will become a call to quantum's `echo/quantum/bridge.js` `verifySelectedBackendOnce` once that file exists (decided consult 11). Do not create `bridge.js`: quantum owns it.
- `main.js` must survive Qollab's Babel→CommonJS transform: no top-level `import.meta`, static imports only.
- Do not edit `echo/main.css`, which story-ui owns. Style inline as `diag.js` already does.
- Your own port only. Use a new build token, e.g. `integration-shell-diag-1`, and read it back from the served page with `--expect-build`.

**Vault notes to read:**
- `vault/AGENTS.md`;
- `vault/Research/qollab-js-runtime-internals.md` (both the integration version and the branch version, then merge them);
- `vault/Reports/integration-shell.md` and `vault/Reports/g0-runner-smoke.md`;
- report 0005, in full;
- `tools/qollab-runner/README.md`;
- `echo/QOLLAB_SMOKE_TEST.md`;
- `.claude/rules/gate-independence.md` (laws 3, 15, 16).

**Where to start:**
1. Run `git diff lane/platform/integration lane/platform/g0-input-diagnostic -- echo tools` to see both sides.
2. Write the runner checks FIRST against integration's current `main.js` and watch them go red. The checks are: the diag panel is mounted, exactly one job is auto-sent, Cancel means no job, the button pressed during the countdown gives one job, `main.js` has not returned before the job settles, and no frame events arrive after `Done.`.
3. Port the behaviour, then go green.

**Deliver:**
- a branch `lane/platform/g0-diagnostic-port` with the port;
- an updated `echo/QOLLAB_SMOKE_TEST.md` (steps 5–8, the outcome table, the new token);
- the runner scenarios in `check.cjs`/`sabotage.sh`;
- a `vault/Reports/g0-diagnostic-port.md`, plus the merged research note.

**How I will judge it:**
- Screenshots from the real served page on your OWN port of: the counters, the single auto-sent job, Cancel with no job, the button during the countdown giving one job, and the verdict line.
- Console text showing `Done.` only after the job settles.
- Sabotage that goes RED for: guard removed, stopPropagation on `document`, keep-alive removed (`main.js` returns early), diag not mounted, and wrong build token (exit 2). Report every null.
- `node tools/qollab-runner/check.cjs` and `node tools/qollab-caps/check.mjs --root echo` both GREEN. I will re-run both on a `git archive` extract.
- `git diff --stat lane/platform/integration...HEAD` shows only `echo/main.js`, `echo/diag.js`, `echo/QOLLAB_SMOKE_TEST.md`, `tools/qollab-runner/*`, `evidence/platform/g0-diagnostic-port/`, and `vault/`.
- `git merge-tree` against integration is clean.

**Report:** `lanes/platform/reports/NNNN-g0-diagnostic-port.md`. It opens with the TL;DR, then a Vault check, and it states nulls, what was not verified, and the decisions inferred from the docs. Commit a checkpoint report within 1 h. Label everything "local runner". Never claim Qollab.

**Write your report to `/Users/udsy/agent-org/lanes/platform/reports/0014-g0-diagnostic-port.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/platform/renders/g0-diagnostic-port/` (PNG; only images newer than its last consult are shown to it).
