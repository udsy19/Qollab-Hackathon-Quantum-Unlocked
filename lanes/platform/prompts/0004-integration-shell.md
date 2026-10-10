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


# YOUR BRIEF (supervisor, consult 4)

You are agent `integration-shell` in worktree `/Users/udsy/agent-org/lanes/platform/wt/integration-shell` on branch `lane/platform/integration-shell`.

# Brief: integration-shell (platform lane, row 7)

## GOAL
One `echo/` folder, assembled from every lane's real work, that loads on the local Qollab runner. The player sees the story-ui title screen over a Three.js canvas, presses Start, and the quest state machine moves BOOT→TITLE→… through `echo/contracts.js`. The settings menu changes render quality, and the local Qiskit bridge answers from the quantum lane's real modules. This shell is what every later playthrough, the G2 graybox and the release are built on.

## VISION
ECHO: ONE OF ONE (`ECHO_MASTER_VISION.md` §8.2 tree, §8.3 boot, §9 quest states, §12.3 honest errors). A Qollab-native game that a judge plays end to end. Platform owns `echo/main.js`, `echo/index.html`, the shared contracts and the integration (`.claude/rules/lane-ownership.md`).

## WHAT WE ARE BUILDING
1. **`tools/assemble-echo/`** (outside `echo/`): takes a list of git refs, by default
   - `lane/platform/integration`,
   - `lane/quantum/integration`,
   - `lane/gameplay/integration`,
   - `lane/story-ui/integration`,
   - `lane/art/integration`,

   and writes their `echo/` subtrees into one temp directory, following lane ownership (each path comes from the ref of the lane that owns it).
   - **Every path present in more than one ref must be printed.** It is never silently overwritten.
   - A path taken from a non-owner lane must be named.
   - Exit codes: 0 green, 1 conflict or ownership violation, 2 could not run.
   - Known conflict today: `echo/main.css` is on both platform (G0 smoke) and story-ui. Story-ui owns it.
2. **The real `echo/index.html`**: a body fragment holding the canvas host and one `<div id="echo-ui">` over it (story-ui relay, owner-answers 2026-10-10).
3. **The real `echo/main.js`**: boot sequence per §8.3.
   - Three.js renderer and scene. Use an empty room / placeholder until gameplay ships its scene and controller.
   - Mount story-ui modules into `#echo-ui`.
   - Run gameplay's state and event bus on `contracts.js`: import its names and never redefine them.
   - Route settings `quality` → renderer (pixel ratio and shadows) and `volume` → an audio stub.
   - Restart → the reset path (§9.5).
   - Release pointer lock while a menu or dialogue is open.
   - Quantum bridge: `import * as m from 'quantum.<mod>'` + `.callPromising()` + `.toJs({dict_converter: Object.fromEntries})`.
4. **Retire the G0 smoke path in the same change** (no-bloat), as soon as the real path covers it:
   - G0's own `backend.run` button and `echo/quantum/smoke.py`, and platform's smoke CSS.
   - The one-job verification must then come from quantum's `verifySelectedBackendOnce` in `echo/quantum/bridge.js` (owner ruling). That file is quantum-owned and does **not exist yet**.
   - Until it exists, keep exactly one guarded `backend.run` path, and list "bridge.js missing" as a request to the quantum lane in your report. Do not write `bridge.js` yourself.

## WHAT HAS NOT WORKED / KNOWN TRAPS
- Qollab compiles `main.js` with Babel to CommonJS and runs it inside an AsyncFunction. No top-level `import.meta`. Bare imports resolve to Python first. `three` is imported by name (0.186.1). `<script>` in `index.html` does not run. JS cannot read project files. Source: `vault/Research/qollab-js-runtime-internals.md`.
- `import './contracts.js'` under the CJS transform has **never been proven**: G0's `main.js` did not import it. Prove it on the runner first, and screenshot it.
- `toJs()` without `dict_converter` gives a `Map`. Cast numpy scalars in Python (owner probe).
- At most one `backend.run` per run, guarded before the first `await`.
- `contracts-v2` is being rewritten right now by another platform worker. Do **not** edit `echo/contracts.js` or `CONTRACTS.md`. Import names only. When `lane/platform/contracts-v2` is merged into `lane/platform/integration`, merge it in and fix the imports. Any contract you need goes in your report as a request.
- Edit only platform files (`echo/main.js`, `echo/index.html`, `tools/`). Other lanes' modules are read and assembled, never edited. A bug you find in another lane's module is reported with file:line and a repro.
- Earlier failures in this org: optimising against a test instead of the product, building behind flags nobody turns on, and judging the wrong artifact. The graded artifact is the **assembled** tree, served by the runner.

## VAULT NOTES TO READ FIRST
`vault/AGENTS.md`, `vault/Index.md`, `vault/Research/qollab-js-runtime-internals.md`, `vault/Research/qollab-platform-and-submission.md`, `vault/Reports/g0-runner-smoke.md`, `vault/Reports/shared-contracts.md`, `vault/Reports/qollab-caps-gate.md`, `echo/CONTRACTS.md`, `tools/qollab-runner/README.md`, plus `lanes/platform/owner-answers.md` (the story-ui relay, the 13 answers, red-team rulings, gameplay rulings).

## WHERE TO START
1. If `tools/qollab-runner/` is missing on your base, `git merge lane/platform/g0-runner-smoke` first. It is being merged into integration this consult.
2. Read the other lanes' modules on their refs: `git show lane/story-ui/integration:echo/ui/menu.js` and the like.
3. Write the assembler and its check first. Watch it go red on the current `main.css` double claim.
4. Serve the assembled tree on **your own port** (e.g. 4890–4899; never a shared port) with `tools/qollab-runner/server.mjs`.

## WHAT TO DELIVER
- Commits on your branch: `tools/assemble-echo/` (with fixtures for conflict and ownership), `echo/index.html`, `echo/main.js`, and the deletions of the G0 smoke path that the real path supersedes.
- Screenshots from the runner, on the assembled tree, with the build token read back from the served page (law 16):
  1. the title screen over the canvas;
  2. after Start: the state shown as TITLE→the next state per `contracts.js`;
  3. the settings menu with quality changed low→high, with a visible renderer difference or the logged pixel ratio;
  4. a quantum module answer (e.g. the cloning or entanglement result) through the bridge, shown on screen;
  5. the one-job guard still refusing a second job.
- On the assembled tree:
  - `node tools/qollab-caps/check.mjs --root <assembled>`: exit 0, file count printed;
  - the contracts check: exit 0.
- Sabotage on a disposable copy:
  - drop `#echo-ui` from `index.html`;
  - redefine one quest state locally in `main.js`;
  - remove the `dict_converter`;
  - make two lanes claim the same path.

  Each must go red. Report the nulls.

## HOW I WILL JUDGE IT
- From your screenshots of the **assembled** tree served by the runner. Screenshots of a platform-only tree do not count.
- Caps green on that tree. The CJS import of `contracts.js` proven.
- No contract table redefined in `main.js`.
- G0 smoke code deleted wherever superseded.
- Every cross-lane conflict named.

## REPORT
`lanes/platform/reports/0004-integration-shell.md`. It opens with **Vault check**, then TL;DR, commands + exit codes + artifact paths, nulls, cross-lane requests (quantum `bridge.js`, any bug in another lane with file:line), Questions for the owner (only spend, access, publishing or doc conflicts, per autonomous mode), and Next.
- **Checkpoint report within 1 h**, even if partial.
- Findings go to `vault/Reports/integration-shell.md`.

**Write your report to `/Users/udsy/agent-org/lanes/platform/reports/0004-integration-shell.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/platform/renders/integration-shell/` (PNG; only images newer than its last consult are shown to it).
