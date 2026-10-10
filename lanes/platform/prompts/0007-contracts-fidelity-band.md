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


# YOUR BRIEF (supervisor, consult 7)

You are agent `contracts-fidelity-band` in worktree `/Users/udsy/agent-org/lanes/platform/wt/contracts-fidelity-band` on branch `lane/platform/contracts-fidelity-band`.

**GOAL:** a player who picks the correct X/Z corrections always passes the teleport dry run. A forged or loosened fidelity check can never pass silently. Today both fail at the edges:
- (a) a correct result at exactly F = 0.999999 is refused, because the 1e-6 cross-check in `validateTeleportCorrectionResult` is the same size as the pass band it defends (gate-independence law 12);
- (b) `FIDELITY_CROSSCHECK_TOLERANCE` loosened to 1e-1 leaves `node tools/contract-check/check.mjs` GREEN 1117/1117. The supervisor measured this on 2026-10-10 by editing `1e-6` to `1e-1` in a copy and running it with `--contracts`.

**VISION:** vision §7.4 (receiver fidelity ≥ 0.999999, conditional X iff m1=1, Z iff m0=1); CLAUDE.md "Truthful quantum"; owner-answers § overseer relay from red-team ("fidelity threshold is ≥0.999999"). The rooftop puzzle is the climax. A false refusal there is a broken game, and a loose check is a physics lie.

**WHAT WE ARE BUILDING:** `echo/contracts.js` + `echo/CONTRACTS.md` (platform-owned; every lane imports them) and their gate `tools/contract-check/` (check.mjs, sabotage.py, teleport_oracle.py).

**WHAT HAS NOT WORKED:**
- contracts-v2 declared verdict nulls as "defence in depth", which hid a loosened owner-ruled constant.
- contracts-pin-thresholds (report `lanes/platform/reports/0006-contracts-pin-thresholds.md`, read it in full) pinned the ruled values. It found the equality defect and left the tolerance unpinned. It predicted a 0.1 loosening would be a null, and the supervisor confirmed that.

**Vault notes to read:**
- `vault/Reports/contracts-v2.md` and `vault/Reports/contracts-pin-thresholds.md`
- `.claude/rules/gate-independence.md`: laws 3, 11, 12, 15; and their cases in `vault/Design/gate-independence-cases.md`

**Where to start:** write the failing probes FIRST and watch them go red on the current contracts.
1. A correct dry-run result whose fidelity is exactly `0.999999` (and one at `FIDELITY_PASS` minus rounding noise of order 1e-15) must pass.
2. A copy with the tolerance loosened to 1e-1, and another to 1e-2, must go RED. Use a forged fidelity that lies inside the loosened band but differs from the Qiskit/analytic value by more than the real tolerance.
3. The pass verdict must still refuse F = 0.99999.

Then fix `echo/contracts.js`, for example by making the cross-check tolerance strictly smaller than the band (≤1e-9 is justified by the measured 4.7e-13 analytic/Qiskit agreement in contracts-v2), or by comparing with a documented epsilon. You choose; justify the choice with numbers. Pin the tolerance in check.mjs with its derivation, and add the cases to sabotage.py. Update CONTRACTS.md only where the behaviour changed, and add a one-row migration note if any consumer-visible value moved.

**Deliver:** commits on `lane/platform/contracts-fidelity-band`. The diff `lane/platform/integration...branch` touches only `echo/contracts.js`, `echo/CONTRACTS.md`, `tools/contract-check/`, `evidence/platform/contracts-fidelity-band/` (with README) and `vault/Reports/`.

**How I will judge it:** I re-run, on my own `git archive` extract:
- check.mjs: GREEN on real, RED on the tolerance at 1e-1 and 1e-2, RED on `FIDELITY_PASS` 0.9;
- sabotage.py: 0 mismatches;
- `node tools/qollab-caps/check.mjs --root echo` (expect red only on missing entry files if this branch lacks them; report what it says).

I will also try my own mutation that you did not list. Every null must be reported, with the reason it is equivalent. Do not weaken any existing check.

**Report:** `lanes/platform/reports/0007-contracts-fidelity-band.md`. Open with the Vault check, then the TL;DR, the commands with their exit codes, Nulls, and Not done. Checkpoint within 1 h. Expect about 45 min total.

**Write your report to `/Users/udsy/agent-org/lanes/platform/reports/0007-contracts-fidelity-band.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/platform/renders/contracts-fidelity-band/` (PNG; only images newer than its last consult are shown to it).
