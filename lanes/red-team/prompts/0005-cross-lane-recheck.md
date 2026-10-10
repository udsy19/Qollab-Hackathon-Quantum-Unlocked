# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `red-team`. Read `/Users/udsy/agent-org/lanes/red-team/context.md`
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
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/red-team/renders/<your agent name>/` (PNG, descriptive
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

- **Lane ownership.** You edit only this lane's files: red-team: no product files; reports in `vault/Reports/`. Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 5)

You are agent `cross-lane-recheck` in worktree `/Users/udsy/agent-org/lanes/red-team/wt/cross-lane-recheck` on branch `lane/red-team/cross-lane-recheck`.

## GOAL
Tell every lane, with exit codes, whether a real quantum result now flows through platform's contract into gameplay's quest without stalling. Say which of the 0002 physics-code-audit findings are CLOSED and which are still OPEN, at pinned SHAs. Nothing integrated lands on main until red-team's cross_lane_check passes (owner ruling 2026-10-10), so this report is the gate the whole org is waiting on.

## VISION
A judge presses Run on Qollab and plays ECHO end to end. Every puzzle is fed by real local Qiskit (vision §7, §8.4). One result shape, one guarded `backend.run`, and a story token consumed once.

## WHAT WE ARE BUILDING
`echo/`, the Qollab-native game. The quantum engine (`echo/quantum/`) emits ExperimentResults. Platform's `echo/contracts.js` v2 (landed on main 80d685f) validates them. Gameplay's `echo/game/missionRules.js` and `state.js` consume them.

## WHAT HAS NOT WORKED
- Each lane's suite was green while the whole was broken. Gameplay's tests ran on `fakeQuantum.js`, and every real result was INVALID under contracts.js. Gameplay's fidelity threshold could drop to 0.9 and its tests stayed green.
- A lane's own conformance report is not evidence. Platform has now shipped its own `tools/contract-check/` (fixtures plus a teleport oracle). Those fixtures were written by the contract's author, so treat them as producer metadata (law 4). Your harness must use REAL engine output from `dump_results.py`.
- Never check out another lane's branch or commit to it. Export it with `git archive <sha> echo | tar -x -C $(mktemp -d)`.

## PINNED SHAs (record them in every output file)
- main 6cc19a6 (contracts v2 at 80d685f)
- lane/quantum/integration d9b42d0
- lane/gameplay/integration c49a922
- lane/platform/integration 43be7d9

If a tip moves while you work, finish on these SHAs and note the newer tip.

## VAULT / READ FIRST
- `vault/Reports/physics-code-audit.md`, `vault/Reports/physics-oracle-audit.md` (checklist C0–C9)
- `lanes/red-team/reports/0002-physics-code-audit.md`
- `evidence/red-team/physics-code-audit/` (your harness: `test_product_vs_oracle.py`, `dump_results.py`, `cross_lane_check.mjs`, `sabotage_product.py`, `sabotage_gameplay.sh`, `c4_token_probe.py`)
- `evidence/red-team/physics-oracle/backend_run_audit.py`
- On main: `echo/CONTRACTS.md` v2 and `tools/contract-check/`
- Owner rulings in `lanes/red-team/rulings.md`, especially: two-phase dry run (bits first, corrections second); token fixed, hidden and consumed once; random generic dry-run states; `bridge.js`/`verifySelectedBackendOnce` as the ONE `backend.run` site; `experiment:"backend_verification"`; 256 shots; previews carry no counts.

## WHERE TO START
1. Merge `main` into your branch first, so contracts v2 and the tools are present. Don't touch product files.
2. Run the C0 baseline: `python -m pytest -q evidence/red-team/physics-oracle && python evidence/red-team/physics-oracle/sabotage.py`. It must still be 523 passed and exit 0.
3. Compose a merged `echo/` tree in a temp dir: main's contracts, plus quantum `echo/quantum`, plus gameplay `echo/game`, plus platform `main.js` and `index.html`. Write down which lane each file came from.

## DELIVER
1. **Oracle driver vs quantum d9b42d0.** Report the physics agreement (12 states × 4 branches × 4 corrections, ≤1e-6), with its exit code. Update the driver if the API moved to two-phase bits-then-corrections, and say exactly what changed.
2. **cross_lane_check against contracts v2.** Run it on the REAL `dump_results.py` output from d9b42d0. Give a per-check table and an exit code. Then drive gameplay's real `missionRules`/`state` with those real results through the whole quest (BOOT→…→TELEPORT_COMMITTED→ENDING/CREDITS). Say whether it stalls, and where.
3. **`backend_run_audit` on the merged tree.** It must find exactly 1 site, inside `echo/quantum/bridge.js`. Report every site with file:line.
4. **C4 token probe.** Is the token fixed and hidden, measured only on commit, and latched after one successful commit? Are dry-run states random and generic?
5. **Run platform's own `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs`** on the merged tree. Then run a **sabotage round on them**, on a disposable copy. Try at least these: wrong m0/m1 order in a result, a `documented_preview` carrying counts, a missing keyQubits, a fidelity of 0.9 labelled pass, and a second `backend.run`. Report which ones their checker MISSES (nulls).
6. **Re-run gameplay sabotage** (FIDELITY_OK→0.9, fidelity check removed). Did the null close?
7. **Closure table:** each 0002 finding (BLOCKER contract, C3, C4, gameplay null, the 3 physics-identical nulls) → CLOSED / OPEN / CHANGED, with the evidence path and the exit code.

## HOW I WILL JUDGE
- I re-run your scripts on a `git archive` export.
- Every claim needs a command, an exit code and a file under `evidence/red-team/cross-lane-recheck/out/`.
- Nulls must be reported.
- A check that did not run is reported as REFUSED (exit 2), never as a pass.
- No Qollab, IonQ or Pyodide claims. If you test the Pyodide bridge, label it "local runner".

## REPORT
- Write `lanes/red-team/reports/0003-cross-lane-recheck.md`. Open it with **Vault check**, then a TL;DR, then a **Findings for owning lanes** section split by lane: quantum, platform, gameplay.
- Write a checkpoint within 1 h, labelled PARTIAL.
- Durable copy: `vault/Reports/cross-lane-recheck.md`. Do NOT regenerate hubs, Map or Index.
- Commit to `lane/red-team/cross-lane-recheck`.

**Write your report to `/Users/udsy/agent-org/lanes/red-team/reports/0005-cross-lane-recheck.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/red-team/renders/cross-lane-recheck/` (PNG; only images newer than its last consult are shown to it).
