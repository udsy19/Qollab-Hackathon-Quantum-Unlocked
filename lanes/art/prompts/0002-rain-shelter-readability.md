# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `art`. Read `/Users/udsy/agent-org/lanes/art/context.md`
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
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/art/renders/<your agent name>/` (PNG, descriptive
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

- **Lane ownership.** You edit only this lane's files: art: `echo/assets/`, `echo/scene/{lighting,rain,props,buildings,effects}.js`, `echo/game/audio.js`. Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 2)

You are agent `rain-shelter-readability` in worktree `/Users/udsy/agent-org/lanes/art/wt/rain-shelter-readability` on branch `lane/art/rain-shelter-readability`.

**GOAL:** Rain never falls indoors, and at every preset the rain reads as atmosphere, not as a curtain. A first-time player can always pick out the cyan/amber objective lights, door strips and the player silhouette through the rain.

**VISION:** ECHO_MASTER_VISION.md §5 (readable palette, cyan = quantum, amber = classical, contrast hierarchy), §11 (rain/fog), §12.2 (quality presets: same logic, different cost) and §12 (reduced motion).

**WHAT WE ARE BUILDING:** `echo/scene/rain.js` (art-owned) in a Qollab-native Three.js 0.186.1 game. It is one LineSegments draw with all motion in the vertex shader, plus splashes on high only. The API is `createRain({scene, camera, quality})`, `update`, `setQuality` and `setIntensity`. Gameplay will import it after G2. Do not edit gameplay's or platform's files.

**WHAT HAS NOT WORKED:**
- The current rain falls inside the relay chamber: see `/Users/udsy/agent-org/lanes/art/renders/atmosphere-kit/effects-relay.png`.
- At medium it is a dense bright sheet that competes with the accents: see `/Users/udsy/agent-org/lanes/art/renders/atmosphere-kit/alley-med.png`.
- The previous report proposed asking gameplay to call `setIntensity(0)` by zone. That couples them to our internals, and a missed zone trigger lets rain leak indoors. Solve it inside rain.js instead.

**Vault/notes to read first:**
- `lanes/art/context.md` and `lanes/art/reports/0001-atmosphere-kit.md` (the full report).
- `vault/Reports/atmosphere-kit.md` and `vault/Index.md`.
- `echo/contracts.js` (QUALITY_LEVELS `'low'|'med'|'high'`).
- Gameplay's geometry for indoor volumes: `git show lane/gameplay/gameplay-world-controller:echo/scene/district.js` and `relay.js`. Read only.

Run `node scripts/where.mjs shelter --branches` before adding any symbol.

**Where to start:**
1. Add `rain.addShelter(box3 | {min,max})` / `clearShelters()`, a small fixed-size uniform array (≤8 boxes). The vertex shader collapses any drop inside a shelter, at zero extra draws.
2. Tune drop alpha, length and thickness and add distance fade per preset so that the accents dominate. Brightness should stay below the accent strips.
3. Let reduced motion slow the drops or cut their density (accept `setReducedMotion(bool)` if needed).
4. Add the gameplay indoor volumes as preset shelters in the preview only (`tools/art-preview/`), not hardcoded into rain.js.

**Deliver:**
- Commits on your branch `lane/art/rain-shelter-readability`.
- Before/after screenshots from the preview at low, med and high in the alley and the relay chamber, with the same camera poses as `renders/atmosphere-kit/`. Save them to `/Users/udsy/agent-org/lanes/art/renders/rain-shelter-readability/`.
- A one-frame crop showing that the objective lights and door strip read through the rain.
- FPS/draw calls at medium versus the previous numbers (alley 105 / relay 91 / final shot 88 FPS mean; machine load stated).
- Update `vault/Reports/atmosphere-kit.md`.
- Run `node tools/qollab-caps/check.mjs` and report its result.

**How I will judge it:**
- Primarily by the screenshots: no streaks inside the relay or the passage, and accents clearly dominant over the rain.
- Then by your falsification. Disable the shelter test in the shader and show that rain returns indoors in a screenshot. Report what did NOT go red.
- Draw calls must not rise.

**Report:** `lanes/art/reports/` as usual. Open with **Vault check** and a TL;DR; checkpoint within 1 h. Any shelter coordinates gameplay must supply go under "Requests to gameplay".

**Write your report to `/Users/udsy/agent-org/lanes/art/reports/0002-rain-shelter-readability.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/art/renders/rain-shelter-readability/` (PNG; only images newer than its last consult are shown to it).
