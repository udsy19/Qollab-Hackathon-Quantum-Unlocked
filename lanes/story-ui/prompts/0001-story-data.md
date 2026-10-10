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
  - `## Questions for the owner` — anything the vision docs do not settle (owner rule: ask, never assume);
  - what the supervisor should do next (LAST, so it is in the tail the supervisor reads).

- **Lane ownership.** You edit only this lane's files: story-ui: `echo/ui/`, `echo/data/`, `echo/main.css`. Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 1)

You are agent `story-data` in worktree `/Users/udsy/agent-org/lanes/story-ui/wt/story-data` on branch `lane/story-ui/story-data`.

**GOAL:** Every word the player reads in ECHO exists as clean, subtitle-ready data that is true to the physics:
- opening, three missions, ending
- Mica's radio, VEGA, MIRROR, Rin
- objectives and HUD strings
- the progressive hint ladder for every puzzle
- the "every failure says why" lines
- the Declassified teach-back questions and answers

**VISION:** `ECHO_MASTER_VISION.md` §4.1–4.5 (story beats, verbatim where given), §2.2 (characters), §2.4 (what NOT to claim), §6.6 (hints: Hint 1 prompts inspection, Hint 2 names the resource, Hint 3 states the operation; no penalty), §7 (normative physics), and §9.1/§9.2 (quest states and events; key your data to these names verbatim). The bar: a blind tester finishes without help and can answer the three teach-back questions.

**WHAT WE ARE BUILDING:** The Qollab project in `echo/`. You own:
- `echo/data/story.js`: dialogue beats grouped by sequence id. Each beat is `{speaker, text}`, with text fitting 2 subtitle lines at about 42 chars per line. Split longer beats into consecutive beats rather than truncating them. Where the vision gives a line, use it verbatim.
- `echo/data/objectives.js`: an objective string per quest state, plus hint ladders per puzzle.
- Teach-back content, either in `story.js` or in a `data/teachback.js` file. Keep the file count low: `echo/` has a hard cap of 100 files.

Plain ES modules with named exports and data only, because JS cannot read JSON project files on Qollab. You do NOT own `ui/`, `game/`, `quantum/`. If gameplay or platform need a different key shape, file it as a contract request.

Physics rules:
- Never claim FTL messaging, cloning an unknown state, "certified quantum randomness" or teleporting matter.
- Entanglement was pre-shared before the crisis.
- m0 = source readout, m1 = local Bell half; X iff m1=1, Z iff m0=1.
- The story token is consumed once at commit. Calibration uses fresh prepared states.
- Credits: do NOT write team names. The owner has not given them, so leave a clearly marked placeholder. Include "This effort is supported by Qollab & IonQ".

**WHAT HAS NOT WORKED (org-wide):** optimising against tests instead of the product; meta-work instead of product work. Nothing has been tried on this lane yet.

**Vault notes:** `vault/AGENTS.md`, `vault/Home.md`, `vault/Index.md`, `vault/Research/qollab-platform-and-submission.md`.

**Where to start:** read §4, §2.4 and §7 fully, then write the data.

Then write a small Node check at `evidence/story-ui/story-data/check.mjs`. It is local tooling only and lives outside `echo/`. Write it FIRST and watch it fail on a deliberately bad fixture. It must verify:
- every beat fits 2×42 characters
- every speaker is in the cast
- every §9.1 state that the player sees has an objective
- every puzzle has exactly 3 hints
- forbidden-claim phrases are absent

Derive the forbidden phrases from §2.4's meaning, not just its words. Then run a sabotage round (inject an overlong line, a missing hint, a "faster than light" line) and report what did NOT go red.

**Deliver:** the data files; the check with its exit codes; `evidence/story-ui/story-data/script.md`, a human-readable rendering of the full script in play order (this is what the owner will read); and a list of every place where you wrote new text beyond the vision's verbatim lines, so the owner can review it.

**How I will judge:** I will read `script.md` start to finish. It must read as a coherent ~10-minute story, with every physics statement matching §7 and every hint ladder escalating properly.

**Report:** `/Users/udsy/agent-org/lanes/story-ui/reports/story-data.md`. Open with a Vault check, then TL;DR, evidence (command + exit code + path), nulls, `## Contract requests for platform/gameplay`, and `## Questions for the owner`. Write a checkpoint within 1 h (PARTIAL if needed).

**Write your report to `/Users/udsy/agent-org/lanes/story-ui/reports/0001-story-data.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/story-ui/renders/story-data/` (PNG; only images newer than its last consult are shown to it).
