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


# YOUR BRIEF (supervisor, consult 6)

You are agent `gameplay-world-v2-port` in worktree `/Users/udsy/agent-org/lanes/gameplay/wt/gameplay-world-v2-port` on branch `lane/gameplay/gameplay-world-v2-port`.

# Brief: port the 3D graybox world onto contracts v2 and the migrated quest core

## GOAL
A judge clicks PLAY and walks Rin in third person: rain alley → booth → connector → relay chamber → rooftop → commit → city lights → ending → RESTART. Every quest step is driven by the ONE quest table and bus vocabulary in platform's `echo/contracts.js` **v2**, not by gameplay's own copy. After your change, one branch holds both the 3D world AND the migrated, hardened quest core, and it is mergeable into `lane/gameplay/integration`.

## VISION
ECHO: ONE OF ONE (`ECHO_MASTER_VISION.md`): §3.1 controls, §5.1 spaces, §9.1–9.5 quest states, transitions, world reactions and reset, §8.4 adapter contract. G2, the playable graybox, is due Sat 17:00 ET.

## WHAT WE ARE BUILDING
The Qollab project root `echo/`. This lane owns `echo/game/` (except `audio.js`) and `echo/scene/` (except lighting/rain/props/buildings/effects). The dev harness lives under `dev/gameplay/`, outside echo/. Primitive geometry only.

## WHAT HAS NOT WORKED / the state you inherit
- Your base, `lane/gameplay/gameplay-world-controller` @ 1a89bfb, is the 3D world (see report `lanes/gameplay/reports/0001-gameplay-world-controller.md`). It is built on the OLD quest core: `quest:enter:*`, `quest:transition`, and gameplay's own `TRANSITIONS`. `git grep quest:enter` hits `echo/game/eventBus.js` and `echo/game/state.js`.
- `lane/gameplay/integration` @ c49a922 has since migrated the core: `state.js` imports `TRANSITIONS`/`QUEST_STATES`/`BUS_EVENTS`/`WORLD_CHANGES` from `echo/contracts.js`, plus a run-to-completion queue, epoch tickets, the commit latch, the ack gate and refusal-only mission rules. The fake now uses random generic calibration states and `schema.mjs` is deleted. Read `lanes/gameplay/reports/0003-gameplay-contracts-migration.md` and `vault/Reports/quest-state-machine-contract.md`.
- `main` @ 6cc19a6 carries **contracts v2**: RESTART, EVENT_SOURCES, engine/experiment rules, and the two-phase teleport dry run (bits first, corrections second). It also carries `tools/contract-check/` and `tools/qollab-caps/`. Neither gameplay branch has v2.
- Lesson: two quest tables diverged once already (`vault/Reports/quest-core-adversarial-review.md` F1). Never keep a second copy of anything contracts.js defines.
- Headless FPS read 12–46. That is not a laptop measurement. Do not claim the ≥30 FPS bar.

## Vault notes to read first
`vault/AGENTS.md`, `vault/Index.md`, `vault/Map-code.md`, `vault/Reports/quest-state-machine-contract.md`, `vault/Reports/quest-core-adversarial-review.md`, `vault/Research/qollab-platform-and-submission.md`, `echo/CONTRACTS.md` (v2, from main), `lanes/gameplay/rulings.md`.

## Where to start
1. `git merge lane/gameplay/integration`, then `git merge main`. In every conflict, contracts.js/v2 semantics win over the old world-controller core. The integration branch's `state.js`/`eventBus.js`/`missionRules.js`/fake win over world-controller's copies. Keep world-controller's scene, controller, collision, interaction and world-reaction code.
2. Re-point the world reactions to `QUEST_STATE_CHANGED` and the snake_case `WORLD_CHANGES` ids from contracts.js (e.g. `corridor_door_opens`, `rooftop_access_unlocked`). Movement events (`OPEN_ROOFTOP`, `EXIT_BOOTH`) come from gameplay world triggers, as `EVENT_SOURCES` says. Rooftop console id `teleport_terminal`.
3. Conform the dev terminal and fake to the v2 two-phase dry run: the player sees m0, m1 first, then picks X/Z from all four choices. COMMIT unlocks only after a correct dry run with bits ≠ 00, on fresh random generic states. A wrong dry run retries on a fresh state.
4. Delete every superseded copy in the same change. Afterwards: `git grep -nE "quest:enter|quest:transition|BOOTED"` over `echo/` and `dev/` returns zero, and you name any remaining hit with its reason.

## Deliver
- The branch, merged and green: `node --test 'dev/gameplay/tests/*.test.mjs'`, `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs`, each with its exit code saved under `evidence/gameplay/world-v2-port/`.
- `world-playthrough.mjs --falsify --publish` on YOUR OWN port (not 8611/8612; pick 86xx unused), with real keyboard and mouse input. Re-derive the served-build token (change it, read it back from the served page, abort on mismatch). It must cover: title → three missions → commit → city lit → ending → RESTART → title, then a second full run after reset. Include one wrong dry run that visibly fails on a generic state.
- Sabotage (write the checks first and watch them fail): a collider off; a WORLD_CHANGES id renamed in your subscriber (must go red); the RESTART handler removed; `EVENT_SOURCES` violated (a movement event sent from a terminal must be refused). Report the nulls.
- PNGs to `renders/gameplay-world-v2-port/` (≤12, the key moments) and `walk.mp4` in evidence.

## How I will judge
I re-run the tests and the playthrough in a `/tmp` worktree at your tip. I look at the PNGs and the video; a report claim without a picture counts for nothing. I grep for the old vocabulary. `git diff --stat lane/gameplay/integration...<tip>` must show only gameplay-owned files, `dev/`, `evidence/`, `renders/` and `vault/Reports/`. Edits to `echo/contracts.js`, `main.js`, `ui/` or `data/` are refused; put those in Requests.

## Report
`lanes/gameplay/reports/0004-gameplay-world-v2-port.md`. Write a CHECKPOINT within 1 h, with what has merged and the conflicts resolved. The final report opens with TL;DR, then a **Vault check**, then evidence (command + exit code + path), sabotage including the nulls, Requests for platform and story-ui, and what was NOT verified (nothing ran on Qollab, so say "local runner"). Write durable findings to `vault/Reports/` and run `node scripts/vault-hubs.mjs`.

**Write your report to `/Users/udsy/agent-org/lanes/gameplay/reports/0006-gameplay-world-v2-port.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/gameplay/renders/gameplay-world-v2-port/` (PNG; only images newer than its last consult are shown to it).
