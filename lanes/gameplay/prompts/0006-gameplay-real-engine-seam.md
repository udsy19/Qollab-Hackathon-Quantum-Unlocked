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

You are agent `gameplay-real-engine-seam` in worktree `/Users/udsy/agent-org/lanes/gameplay/wt/gameplay-real-engine-seam` on branch `lane/gameplay/gameplay-real-engine-seam`.

# Brief: measure the seam between gameplay's quest rules and the REAL quantum engine (evidence only)

## GOAL
When the fake adapter is swapped for the real Qiskit engine, the player must still progress through all three missions. Wrong answers must still fail, and the token must still be consumed once. Today we don't know that it will. Red-team found that gameplay `missionRules.js` read field names the engine never emits, so the quest stalled at CLONE_INTRO, and that gameplay tests pass only on the fake. Produce the measured list of exactly what breaks, so the swap is a short, known change.

## VISION
§7 normative physics, §8.4 quantum adapter contract, §12.3 honest errors. Owner rulings: ONE ExperimentResult shape in `echo/contracts.js`; gameplay tests run on real engine output; fidelity threshold ≥ 0.999999; random generic dry-run states; story token fixed and hidden, consumed once.

## WHAT WE ARE BUILDING
Gameplay's quest core (`echo/game/state.js`, `missionRules.js`), which consumes `ExperimentResult`s produced by quantum's engine (`echo/quantum/` on `lane/quantum/integration` @ d9b42d0, pyodide-bridge merged).

## WHAT HAS NOT WORKED
- Red-team `cross_lane_check`: 12/13 failed (`lanes/red-team/reports/*physics-code-audit*`, `evidence/red-team/physics-code-audit/out/` on `lane/red-team/integration`).
- Gameplay test nulls: changing FIDELITY_OK from 0.999999 to 0.9, or removing the fidelity check, left the tests green.
- Contracts have since moved to v2 on main (two-phase dry run). Gameplay integration is still on v1.

## You edit NO product files
No `echo/` edits on any branch. Write only `evidence/gameplay/real-engine-seam/` (scripts, fixtures, outputs, README) and `vault/Reports/gameplay-real-engine-seam.md`. Do your work in disposable `/tmp` worktrees: one for `main`, one for `lane/quantum/integration`, one for `lane/gameplay/integration`.

## Do
1. Generate real engine results. Use quantum's `dump_results.py`, or call its Python entrypoints with the venv's qiskit for each experiment: cloning attempts, the relay/Bell receiver marginal, teleport dry runs with all 4 bit branches × 4 corrections on random generic states, and the commit. Also validate them with main's `node tools/contract-check/check.mjs`/fixtures. Record which are VALID under v2 contracts.
2. Feed those results, and v2's own fixtures, into gameplay integration's `missionRules`/quest machine. Write a table (law 14) with one row per experiment × branch: the event produced, the quest state reached, whether it is refused, the expected answer derived from the vision §7/§9 doc (not from gameplay code), and the verdict.
3. Fidelity guard: show that a real wrong-correction result (fidelity ≈ 0 or 0.5) is refused, and that one perturbed to 0.9999 is refused at the ≥ 0.999999 threshold. Sabotage the threshold and confirm your check goes red. Report the nulls.
4. List every field-name, phase or shape mismatch: gameplay vs v2 vs engine. Name the owning lane for each fix.

## Vault notes
`vault/AGENTS.md`, `vault/Index.md`, `vault/Reports/quest-state-machine-contract.md`, `vault/Reports/quest-core-adversarial-review.md`, `echo/CONTRACTS.md` (main), the quantum lane's pyodide-bridge vault report, `lanes/gameplay/rulings.md`.

## How I will judge
I judge on the table and the reproducible scripts. I re-run one of them myself. Expected answers must come from the doc, not from the code under test (gate-independence law 4). A missing field counts as a FAILURE, never a skip.

## Report
`lanes/gameplay/reports/0004-gameplay-real-engine-seam.md`. Write a checkpoint within 1 h. The report opens with TL;DR and a **Vault check**, and ends with "Requests" grouped by lane (gameplay, quantum, platform). Run `node scripts/vault-hubs.mjs` after adding the vault report.

**Write your report to `/Users/udsy/agent-org/lanes/gameplay/reports/0006-gameplay-real-engine-seam.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/gameplay/renders/gameplay-real-engine-seam/` (PNG; only images newer than its last consult are shown to it).
