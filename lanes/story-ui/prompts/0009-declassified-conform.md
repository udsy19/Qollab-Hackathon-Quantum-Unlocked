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


# YOUR BRIEF (supervisor, consult 9)

You are agent `declassified-conform` in worktree `/Users/udsy/agent-org/lanes/story-ui/wt/declassified-conform` on branch `lane/story-ui/declassified-conform`.

**GOAL:** Declassified mode (journal, 3 §4.5 tabs, teach-back, credits) is ready to merge into `lane/story-ui/integration`. It has to sit on top of everything the lane has merged since it branched, and the credits a judge reads must be exactly the owner's words, with no placeholder text visible.

**VISION:** ECHO_MASTER_VISION §4.5 (Declassified mode, teach-back with no scoring pressure), §6.6 (accessibility), and the ending and credits. The bar is that a blind tester can explain the three teach-back answers. A judge who sees "TODO_OWNER" in the credits stops trusting everything else.

**WHAT WE ARE BUILDING:** the Qollab-native `echo/` game. This lane owns `echo/ui/`, `echo/data/` and `echo/main.css`. Harnesses live in `evidence/story-ui/harness/`, outside `echo/`.

**WHAT HAS NOT WORKED / why this branch was refused at consult 9:**
1. **It does not have the lane integration branch.** `git merge-base --is-ancestor lane/story-ui/integration lane/story-ui/declassified` exits 1, and `git merge-tree` shows conflicts. The integration branch has gained data-fixes (branch-true teleport lines, `TELEPORT_FAILURE_CASES`, the ruled bit labels), the opening (`dialogue.js` auto mode, `captionStyle` in `accessibility.js`, an `/* ==== opening ==== */` CSS section) and contracts v2 from main.
2. **The credits team line uses ":".** The owner's ruling (`lanes/story-ui/owner-answers.md` § credit names; red-team T4) is byte-exact: `Team The Quantubians (NYU Tandon School of Engineering) — Udaya (captain), George, Harman, Epa`. That is space, em dash (U+2014), space. Your report said the credits "match the ruling exactly". They do not: see `renders/declassified/08-credits.png`.
3. **The player sees the assets line "TODO_OWNER: third-party assets…".** Supervisor ruling, inferred from CLAUDE.md ("every third-party asset… listed with its license") plus the fact that the build is procedural: replace it with `Art and sound: generated in code for this project. No third-party assets.` and add a check to the story-data gate (`evidence/story-ui/story-data/check.mjs`) that fails if `echo/assets/` holds any file. The art lane is told to have this line replaced if it ever bundles a third-party file. After your change, no `TODO_OWNER` may remain anywhere in `echo/` (`git grep -n TODO_OWNER -- echo/` prints nothing).
4. **Earlier lesson:** green drivers missed defects that only a human look found (sentence breaks, ASCII kets, the select font). Read every render yourself.

**Vault and notes to read first:** `vault/AGENTS.md`, `vault/Reports/story-ui-declassified.md` (your own), `vault/Reports/story-ui-opening.md`, `vault/Reports/story-data-script-gate.md`, `lanes/story-ui/rulings.md`, and your report `lanes/story-ui/reports/0005-declassified.md`.

**Where to start:**
1. `git merge lane/story-ui/integration` into your branch and resolve the conflicts.
   - `echo/main.css`: keep every section from both sides.
   - `echo/data/teachback.js`: keep your RUN_JOURNAL and DECLASSIFIED edits and the integration side's data-fixes changes.
   - `echo/ui/accessibility.js`: keep both your additions and `captionStyle`.
2. Write the failing checks FIRST and watch them go red: the credits line byte-exact (compare code points, not the eye), no TODO_OWNER, and an empty `echo/assets/`. Then fix the data.
3. Shell-polish is editing `teachback.js` (around line 46, the teach-back wording) and `main.css` in parallel. Touch only the credits lines and the conflict resolution there, so the next merge stays small.

**Deliver:**
- After the merge, run all of these on your tip and record the exit codes:
  - `node evidence/story-ui/declassified/drive.mjs` (use port **8791**);
  - `node evidence/story-ui/harness/drive.mjs` (ui-shell, 30 of 30);
  - `node evidence/story-ui/harness/drive-opening.mjs 8792 /tmp/op`;
  - `node evidence/story-ui/story-data/check.mjs`;
  - `node tools/contract-check/check.mjs`;
  - `node tools/qollab-caps/check.mjs`. A red caused only by platform's absent `index.html`/`main.js` is fine if you name it.
- Re-render the credits, the journal and the teach-back into `renders/declassified/` with a new provenance hash.
- A sabotage round on a disposable copy, covering at least: swap the em dash for ":", re-insert TODO_OWNER, and drop a file into `echo/assets/`. Report the nulls.
- Update your vault report.

**How I will judge it:**
- `git merge-base --is-ancestor lane/story-ui/integration <your tip>` exits 0;
- I re-run the drivers myself in a disposable worktree;
- I look at the credits render and read the em dash;
- `git grep TODO_OWNER -- echo/` is empty.

**Report:** `lanes/story-ui/reports/0008-declassified-conform.md`. Open it with a Vault check, then a TL;DR, then evidence paths with exit codes, then the nulls. Commit a checkpoint within 25 minutes and the final report within 1 hour.

**Write your report to `/Users/udsy/agent-org/lanes/story-ui/reports/0009-declassified-conform.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/story-ui/renders/declassified-conform/` (PNG; only images newer than its last consult are shown to it).
