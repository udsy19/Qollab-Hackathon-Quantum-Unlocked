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


# YOUR BRIEF (supervisor, consult 3)

You are agent `contracts-v2` in worktree `/Users/udsy/agent-org/lanes/platform/wt/contracts-v2` on branch `lane/platform/contracts-v2`.

**GOAL:** Every lane builds against one contract that already holds the owner's rulings from 2026-10-10. Then nobody codes against a shape the owner has changed. The visible result: a judge's teleport terminal shows the two classical bits m0 and m1 first. The player then picks X/Z corrections, and the dry run reports fidelity, all on contract-valid data.

**VISION:** ECHO's teaching claim (vision §7, §10.5). Teleportation needs a Bell measurement, two classical bits and *conditional* X/Z corrections. The player has to see the bits before choosing, or the lesson is fake. Truthful labels: m1 = "LOCAL BELL-HALF READOUT m1"; Mission 2 shows EXACT partial_trace probabilities only, with no counts.

**WHAT WE ARE BUILDING:** a v2 of the platform-owned `echo/contracts.js` + `echo/CONTRACTS.md` (merged on this branch; read them and `vault/Reports/shared-contracts.md` first). You extend them. You do not fork them. The gate `tools/contract-check/check.mjs` (+ `fixtures.json`, `sabotage.py`) is the one gate; extend it too.

**Fold in, citing the owner-answers heading for each** (`/Users/udsy/agent-org/lanes/platform/owner-answers.md`: "13 lane design questions", "red-team physics ambiguities + captions", "overseer relay from story-ui"):
1. Transitions: `BOOT —BOOT_COMPLETE→ TITLE`, `DECLASSIFIED —OPEN_CREDITS→ CREDITS`, DECLASSIFIED → ENDING (back), and RESTART from ENDING (§9.5 reset). Check what is already there; do not duplicate.
2. ExperimentResult:
   - add `keyQubits` and `observables`;
   - `documented_preview` + `counts` → rejected;
   - add `experiment: "backend_verification"` for the single selected-backend job (256 shots);
   - Mission 2 receiver results carry exact probabilities and no counts. Decide how the validator enforces this from the data. Do not trust a flag.
3. Bus/world/interactables: `QUEST_STATE_CHANGED`, `CLOSE_TERMINAL`, snake_case world ids, `teleport_terminal`. For each of `OPEN_ROOFTOP` and `EXIT_BOOTH` (gameplay world triggers), and `EXPLANATION_READ` and `VIEW_RECEIVER_MARGINAL` (story-ui terminals), record which lane fires it as data in the contract.
4. **Teleport dry-run, two phases:**
   - phase 1 returns m0, m1 (named exactly so: m0 = source readout, m1 = local Bell-half);
   - phase 2 takes the player's {applyX, applyZ} and returns fidelity.
   - Correct rule: X iff m1=1, Z iff m0=1.
   - The generic test state is `ry(1.137)` then `rz(0.44)`; dry runs use fresh random generic states.
   - Define the request/response shapes and validators for both phases in the contract, and a worked example in CONTRACTS.md built from **real Qiskit 2.5** (venv on PATH).
   - Show with a Qiskit script that all 16 (m0, m1, X, Z) combinations give fidelity 1 only on the correct rule, on a generic state.
5. The story-ui relay:
   - `UI_ROOT_ID = "echo-ui"`;
   - the settings shape `{captionStyle:'standard'|'high-contrast', reducedMotion, textScale:100–200, quality:'low'|'med'|'high', volume:0–100}` with a validator;
   - name the pause-allowed/restart hooks as contract names.
   - Captions are always on, so there is no captions on/off field.

**WHAT HAS NOT WORKED:** The vision's §9.2/§10.3 code samples are incomplete and illustrative. Derive the contract from the text and flows, as v1 did. Do not optimise against the fixture count. Contracts must survive Qollab's Babel CommonJS transform: no top-level `import.meta`, no dynamic import tricks.

**Vault/notes:**
- `vault/AGENTS.md`, `vault/Index.md`, `vault/Reports/shared-contracts.md`, `vault/Research/qollab-platform-and-submission.md`;
- vision §7, §8.4, §9, §10.3–10.7.

**Deliver:**
- commits on your branch;
- check.mjs red first (the v1 module against the new fixtures must fail on each new rule; log it), then green;
- a sabotage round on a disposable copy with the nulls named;
- a headless-Chrome load of `tools/contract-check/browser.html` showing the two-phase dry run, with the served sha256 matching the file;
- run `node tools/qollab-caps/check.mjs --root echo` (it goes red only for the missing G0 entry files; say so);
- `vault/Reports/contracts-v2.md`, linked via `node scripts/vault-hubs.mjs`.

**How I judge:**
- the screenshot;
- my own re-run of check.mjs;
- one sabotage I pick (e.g. allowing X when m1=0) must go red;
- a **migration table** in your report: every symbol added, renamed or removed, and which lane must change what. I relay it to the other lanes.

**Report:** `reports/NNNN-contracts-v2.md`, opening with a Vault check. Write a checkpoint within 1 h. Do not touch `echo/main.js`/`index.html` (`g0-runner-smoke` is writing them).

**Write your report to `/Users/udsy/agent-org/lanes/platform/reports/0003-contracts-v2.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/platform/renders/contracts-v2/` (PNG; only images newer than its last consult are shown to it).
