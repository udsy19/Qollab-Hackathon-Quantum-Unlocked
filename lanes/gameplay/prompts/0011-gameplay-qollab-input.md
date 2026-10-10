# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `gameplay`. Read `/Users/udsy/agent-org/lanes/gameplay/context.md`
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
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/gameplay/renders/<your agent name>/` (PNG, descriptive
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

- **Lane ownership.** You edit only this lane's files: gameplay: `echo/game/` (not `audio.js`), `echo/scene/` (not lighting/rain/props/buildings/effects). Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 11)

You are agent `gameplay-qollab-input` in worktree `/Users/udsy/agent-org/lanes/gameplay/wt/gameplay-qollab-input` on branch `lane/gameplay/gameplay-qollab-input`.

**GOAL.** A judge opening ECHO on Qollab can look around and move with mouse and keyboard, and the game keeps running until the credits. Today the controls assume pointer lock in a top-level page. Qollab runs the project in an iframe with `sandbox="allow-scripts"`: origin null, **no pointer lock**, never auto-focused. If `main.js` returns, Qollab stops listening to the frame.

**VISION.**
- §3.1: pointer lock only while exploring; unlock when browser focus changes.
- §6.6: keyboard alternatives.
- §17: playable without help.

Owner ruling "QOLLAB RUNTIME FACTS" (`lanes/gameplay/owner-answers.md`, newest entries) is binding:
1. Camera orbits by mouse DRAG (hold a button) and by keyboard (arrow keys; pick a set that does not collide with E = interact, and cite why). This is the primary path. `requestPointerLock()` is only an optional enhancement that fails silently.
2. A "Click to focus" overlay shows until the frame has focus and comes back whenever focus or visibility is lost. Movement keys must not stick across a blur.
3. `startGame()` returns a promise (or an object with one; coordinate the shape in your report) that resolves only at CREDITS or an explicit stop, so `main.js` can `await` it and never return early.

**WHAT WE ARE BUILDING.** `echo/game/input.js`, `camera.js`, `controller.js` and `app.js` (gameplay-owned) on the v2 world (tip 6660774, build `v2p-0006-b`), plus a new dev-only harness under `dev/gameplay/` that loads the world inside `<iframe sandbox="allow-scripts">` from a different-origin parent, the way Qollab does.

**WHAT HAS NOT WORKED.**
- The world-controller was proven with pointer lock in a top-level headless page. That proof says nothing about Qollab: a top-level page passes by construction.
- On real Qollab the overseer's automated clicks and keys registered 0 because the frame never had focus. So your harness must actually start unfocused, prove the overlay blocks until a click, and prove that a blur then a re-click restores control.
- **Do NOT edit** `echo/game/state.js`, `missionRules.js`, `dev/gameplay/devTerminal.js` or `playthrough.mjs`. A parallel worker is merging those. Keep your diff to the four files above, your new harness, evidence and the vault.

**Read first:**
- `vault/AGENTS.md`, `vault/Index.md`;
- `lanes/gameplay/reports/0001-gameplay-world-controller.md` and `0006-gameplay-world-v2-port.md`;
- platform's `*g0-input-diagnostic*` report under `lanes/platform/reports/`;
- `vault/Research/qollab-platform-and-submission.md`;
- `evidence/qollab/g0c-*` README on main.

Run `node scripts/where.mjs focusOverlay --branches` (and similar names) before writing anything. Story-ui may own overlay copy; put the text in one exported constant and list it as a request.

**Deliver:**
- The sandboxed-iframe harness and a playthrough driven by real CDP mouse and keyboard input:
  - starts unfocused, overlay visible, keys ignored;
  - click → focus → WASD moves the player;
  - drag orbits the camera;
  - keyboard orbit works;
  - E interacts at the booth;
  - window blur → overlay returns and no key sticks;
  - re-click resumes;
  - Esc pauses.
- `document.pointerLockElement` stays null throughout, and the console has no uncaught errors.
- Asserted, not eyeballed: the `startGame` promise is still pending mid-game and resolves only after reaching CREDITS.
- A short video (webm/mp4) plus PNGs under `renders/gameplay-qollab-input/`. Evidence under `evidence/gameplay/qollab-input/` with a README listing commands and exit codes.
- Sabotage on disposable copies, each after an unbroken control:
  - overlay never shown;
  - pointer lock made mandatory;
  - promise resolves immediately;
  - drag orbit removed.

  Each must go red. Report the nulls.
- Unit suite and contract-check still green.
- Build token bumped and read back from the served page.
- Serve on your OWN port.

**How I will judge it:** the video first, then my own `/tmp` re-run of your iframe playthrough, then the diff-scope check (only the four files plus harness, evidence and vault).

**Report** `lanes/gameplay/reports/NNNN-gameplay-qollab-input.md`. Open it with a Vault check; checkpoint within 1 h. Include requests to platform (the `main.js` await shape) and story-ui (overlay copy).

**Write your report to `/Users/udsy/agent-org/lanes/gameplay/reports/0011-gameplay-qollab-input.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/gameplay/renders/gameplay-qollab-input/` (PNG; only images newer than its last consult are shown to it).
