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


# YOUR BRIEF (supervisor, consult 11)

You are agent `ui-wiring` in worktree `/Users/udsy/agent-org/lanes/story-ui/wt/ui-wiring` on branch `lane/story-ui/ui-wiring`.

**GOAL:** A judge clicks Run and gets the real story-ui on top of the real game. That means:
- the opening plays, or is skipped;
- the HUD and captions follow the quest;
- pressing E at the copy booth, the relay and the teleport console opens this lane's terminal, fed by the quantum lane's real `echo/quantum/bridge.js`;
- Declassified and the credits open at the end.

Today every story-ui piece works only in its own harness. Your job is to make them work together in one local-runner build and to find every seam before G2 (Sat 17:00 ET).

**VISION:** Vision §4 (story beats), §6 (UI), §8.4 (the quantum adapter contract) and §9 (quest states). CLAUDE.md "Playable" is the bar: start, move, press E at three locations, fail and retry, make all four correction choices, commit once, reach the credits.

**WHAT WE ARE BUILDING:**
- A Qollab-native `echo/` folder. `main.js` is the entry and is owned by the platform lane. `echo/ui/`, `echo/data/` and `echo/main.css` belong to story-ui (you).
- Shared contracts live in `echo/contracts.js` (platform).
- The bridge is `echo/quantum/bridge.js` (quantum).
- You edit ONLY `echo/ui/`, `echo/data/` and `echo/main.css`, plus evidence under `evidence/story-ui/ui-wiring/`.
- Changes to `main.js`, contracts or the bridge are written as an exact patch request in your report. Do not commit them to `echo/`.

**WHAT HAS NOT WORKED:**
- Lane tests that were green on fakes hid a total integration break: red-team's cross_lane_check failed 12 of 13.
- terminals-c4 was written against bridge names that do not exist. It expected `bellMeasurement`, `teleportDryRun(…, bits)` and `commitStoryTransfer`. The real exports at `lane/quantum/integration` 24e0ba7 are:
  - `cloneTest`, `bellSignalling`, `calibrationMeasurement`;
  - `teleportDryRun(calibration, correctionX, correctionZ)`, `commitTransfer`, `resetStoryToken`;
  - `verifySelectedBackendOnce`.
- Consumers that sliced bitstrings showed false failure lines. Always read `measurementBits.{m0, m1}` by name.
- A worker's "all green" has repeatedly been contradicted by its own renders.

**Vault and notes to read first:**
- `vault/AGENTS.md`, `vault/Index.md` (promoted lessons);
- `vault/Research/qollab-platform-and-submission.md`;
- `vault/Reports/story-ui-ui-shell-harness.md`, `story-ui-opening.md`, `story-ui-shell-polish.md`;
- the terminals and declassified reports in `/Users/udsy/agent-org/lanes/story-ui/reports/` (0004-terminals-c4, 0005-declassified);
- `lanes/story-ui/rulings.md`, especially the QOLLAB RUNTIME FACTS: no pointer lock, a click-to-focus overlay, and `main.js` never returns before the end.

Your report must open with a "Vault check".

**Where to start:**
1. `git merge-base --is-ancestor lane/story-ui/integration HEAD`, then `git merge main`.
2. Read these sources:
   - `git show lane/platform/integration:echo/main.js`; it already mounts `mountMenu`, `mountHud` and `mountDialogue`;
   - `lane/quantum/integration:echo/quantum/bridge.js`;
   - `lane/gameplay/integration:echo/game/*`.
3. Assemble a disposable composite tree under `/tmp/ui-wiring-build`: platform `main.js` and `index.html`, quantum `echo/quantum/`, gameplay `echo/game/` and `echo/scene/`, this branch's `echo/ui`, `echo/data` and `main.css`. Use `git archive` or `git show`, never by merging those lanes into your branch.
4. Serve it with platform's local runner under `tools/` on port **8811**. If that runner needs Pyodide and it can't load, say so and fall back to a JS-only check of the wiring.

**Deliver:**
1. **A seam table, as a checkpoint commit within 45 min.** One row per story-ui module × consumer: opening, hud, dialogue, menu, terminal, declassified. Each row gives:
   - what the consumer calls, against what we export;
   - the event names, against `QUEST_EVENTS`/`BUS_EVENTS`;
   - the bridge function names and result shapes, against what terminal.js expects;
   - `captionStyle` versus `subtitles`.

   Put each mismatch on its own line, with file:line on both sides.
2. **Story-ui's side of the fix, in story-ui files only.**
   - Write one facade, e.g. `echo/ui/storyUI.js`, but first search with `node scripts/where.mjs mountStoryUI --branches` and `git grep`. It mounts opening, terminal and declassified onto the bus and the quest machine, so platform's `main.js` needs only a few lines.
   - Do not rewrite `terminal.js` or `declassified.js`. Both are being conformed on other branches right now. Name the changes they need in your report, and I route them.
3. **The exact `main.js` patch for platform**, as a diff in `evidence/story-ui/ui-wiring/platform-patch.diff`. Apply it only in the /tmp composite.
4. **Real-product proof, from the composite in Chrome:**
   - screenshots of the opening captions;
   - the HUD after skip;
   - E at the booth opening the terminal, if gameplay's interaction reaches it, or else exactly where the path breaks;
   - one bridge call result with its engine label visible.

   Badge every image with the build hash, and copy 4–6 of them to `/Users/udsy/agent-org/lanes/story-ui/renders/ui-wiring/`.
5. A vault report, `vault/Reports/story-ui-ui-wiring.md`.

**How I will judge it:**
- the seam table is checked against the real files at the commits you name;
- I read the screenshots; any image not taken on the composite build is rejected;
- the facade must not duplicate logic in `menu.js`, `hud.js` or the platform `main.js`;
- before your final report you must merge `lane/story-ui/integration` into your branch again. I merge only if `is-ancestor` exits 0 and the ui-shell `drive.mjs` and `drive-opening.mjs` still pass on your tip.

Never claim a Qollab run: label everything "local runner".

**Report:** `/Users/udsy/agent-org/lanes/story-ui/reports/NNNN-ui-wiring.md`, with TL;DR, Vault check, the seam table, what you did NOT verify, and the patch requests per lane. Checkpoint commit within 45 min; final within 2 h.

**Write your report to `/Users/udsy/agent-org/lanes/story-ui/reports/0011-ui-wiring.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/story-ui/renders/ui-wiring/` (PNG; only images newer than its last consult are shown to it).
