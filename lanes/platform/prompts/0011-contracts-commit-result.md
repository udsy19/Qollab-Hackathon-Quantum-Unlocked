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


# YOUR BRIEF (supervisor, consult 11)

You are agent `contracts-commit-result` in worktree `/Users/udsy/agent-org/lanes/platform/wt/contracts-commit-result` on branch `lane/platform/contracts-commit-result`.

**GOAL.** The final COMMIT result must have a contract. Today a story commit with fidelity 0.9, or with m0/m1 swapped, counts as "valid". That is because `echo/contracts.js` validates the two dry-run phases but has nothing for the one story commit. Gameplay and quantum also disagree on how the commit names its state: gameplay expects `parameters.stateId == 'story_token'`, quantum emits `parameters.state`. The real-output quest walk therefore stalls at the last step, and the token ends `measured_refused`. A player who does everything right must reach the ending. A forged or wrong commit must never be accepted.

**VISION.** Vision §7.4 sets the rules for the commit:
- the story token is consumed exactly once;
- the bits are m0 (source readout) and m1 (local Bell-half readout);
- the receiver applies X iff m1=1 and Z iff m0=1;
- fidelity ≥ 0.999999.

There are also two owner rulings:
- 2026-10-10 gameplay consult 3: the commit is one atomic local exact call; the token is marked consumed only on success; it is latched once the result is recorded.
- The red-team physics-code-audit relay: ONE ExperimentResult shape, owned by platform.

**WHAT WE ARE BUILDING.** In `echo/contracts.js` and `echo/CONTRACTS.md` only, plus `tools/contract-check/`:
- a `validateCommitResult(res)` (name it after the existing `validateTeleport*` style). It checks:
  - the ExperimentResult shape;
  - `experiment: 'teleportation'`;
  - an explicit story-token marker. Pick one name, `parameters.stateId === 'story_token'`, and export the id as a constant;
  - `measurementBits` m0/m1 in {0,1};
  - the applied corrections equal `expectedCorrections(m0, m1)`;
  - fidelity is a number with `≥ FIDELITY_PASS − FIDELITY_EPSILON` for a success;
  - no counts on an exact result.
- a `commitVerdict` if that helps gameplay, reusing `dryRunVerdict`'s logic rather than copying it. Note that no-bloat applies: search `dryRunVerdict`, `validateTeleportCorrectionResult` and `expectedCorrections`, and extend them. Do not fork.
- a Migration row in CONTRACTS.md naming exactly what gameplay and quantum must change.

Then cut a fresh contracts-only branch `lane/platform/contracts-land-2` from `main`. Main now carries contracts-land, or cut it from `lane/platform/contracts-land` if that has not landed yet. Put the same contract and gate commits on it, so it can LAND.

**WHAT HAS NOT WORKED.**
- `contract-check` was GREEN 1087/1087 while never seeing engine output (red-team 0005 §11).
- A pinned constant with a redundant guard hid a loosened value (my consult 5).
- A guard equal to its band refused the band's edge (law 12, fidelity-band).
- Gameplay tests passed only on a fake adapter.

Grade with real engine output. Red-team's fixtures are under `evidence/red-team/` on `lane/red-team/integration`; the commit JSON is `out/teleport_v2_*.json`. Quantum's `dump_results.py` output may also be on `lane/quantum/integration`. Read them with `git show`. Do not edit other lanes' files.

**Vault notes to read:**
- `vault/Reports/contracts-v2.md`, `contracts-fidelity-band.md`, `contracts-moments-and-land.md`;
- `lanes/red-team/reports/0005-cross-lane-recheck.md` (items 5 and 10, and the sabotage rows `fidelity_0_9_commit` and `m0m1_swapped_commit`);
- `.claude/rules/gate-independence.md`, laws 3, 5, 12 and 15;
- `lanes/platform/rulings.md`.

**Where to start.** Write the gate cases first and watch them go RED on today's contracts:
- a valid commit passes;
- fidelity 0.9 fails;
- m0/m1 swapped with rule-inconsistent corrections fails;
- a missing story-token marker fails;
- an exact result carrying counts fails.

Then implement. Add sabotage.py cases for each guard: drop the fidelity check, drop the correction check, drop the marker check. Report the nulls.

**Deliver:**
- commits on `lane/platform/contracts-commit-result`;
- `lane/platform/contracts-land-2`, where `git diff --stat main...` shows contract/gate files only;
- evidence in `evidence/platform/contracts-commit/` (commands, exit codes, logs);
- `vault/Reports/contracts-commit-result.md`.

**How I will judge.**
- My own `git archive` extract of both branches: GREEN.
- My hand-mutated copies go RED: commit fidelity 0.9, swapped bits, the marker removed.
- `merge-tree` clean.
- Real engine commit output validates, or the exact field mismatch is named as a cross-lane request.

**Report** to `lanes/platform/reports/`. It opens with a Vault check, then a checkpoint within 1 h. Include the nulls, decisions inferred from the docs (with citations), and cross-lane requests for gameplay and quantum. Do not touch `main.js`: another worker owns it. No port needed.

**Write your report to `/Users/udsy/agent-org/lanes/platform/reports/0011-contracts-commit-result.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/platform/renders/contracts-commit-result/` (PNG; only images newer than its last consult are shown to it).
