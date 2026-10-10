# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `quantum`. Read `/Users/udsy/agent-org/lanes/quantum/context.md`
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
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/quantum/renders/<your agent name>/` (PNG, descriptive
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

- **Lane ownership.** You edit only this lane's files: quantum: `echo/quantum/`, `echo/tests/` (quantum tests). Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 15)

You are agent `commit-seam-fix` in worktree `/Users/udsy/agent-org/lanes/quantum/wt/commit-seam-fix` on branch `lane/quantum/commit-seam-fix`.

**GOAL.** A player who finishes the rooftop puzzle on the real engine sees the story commit accepted and the city restored, and a player at the replication booth can pass Mission 1. Today both fail on real engine output, even though every physics number is right.

**VISION.** ECHO teaches no-cloning, no-signalling and teleportation through real Qiskit (vision §7, §10.3–10.7). The story token is consumed ONCE, at the final commit (CLAUDE.md). A wrong correction must never be described as a successful delivery (§2.4, §7.5).

**WHAT WE ARE BUILDING.** `echo/quantum/*.py` (the engine) and `echo/quantum/bridge.js` (the one JS↔Python seam), consumed by platform's `main.js` and gameplay's quest rules. They are validated by the platform-owned `echo/contracts.js` v2 on `main`.

**WHAT HAS NOT WORKED.**
- Lane tests went green on our own field names while the contract wanted different ones. The conformance tests used `validateExperimentResult` and never `validateCommitResult`, so B1 shipped.
- Earlier, gameplay tests passed on a fake adapter while 12 of 13 real-output checks failed (vault/Index promoted lessons).
- Do not "fix" this by editing contracts.js or gameplay; they are not ours.

**The defects** (engine-bridge-review, `lanes/quantum/reports/0013-engine-bridge-review.md`; read it in full):
- **B1:** `live_commit` emits `parameters {"state":"token"}`. contracts.js `validateCommitResult` (main, lines 520–535) requires `parameters.stateId === STORY_TOKEN_ID ("story_token")` plus boolean `applyX` and `applyZ`, the corrections the receiver actually applied by the rule. It also requires a finite `fidelity` ≥ FIDELITY_PASS. The commit result must pass `validateCommitResult` as well as `validateExperimentResult`.
- **B2:** cloning results carry the joint fidelity only as `observables.jointFidelityWithTwoCopies`. Add a top-level `fidelity` equal to that value; contracts.js:197 and 320 allow it. Derive it from the computed state, never from the state name.
- **S1:** `bridge.js` `commitTransfer` un-latches after Python has already consumed the token. Validate with `validateCommitResult`. A rejection after Python ran must be reported honestly as "token consumed" and must not offer a retry; only a failure before Python consumed the token may be retried (owner ruling: "token marked consumed only on success; on error, honest error + retry; latched once recorded").
- **S5:** "the only copy is at the receiver" is printed even after a wrong correction. The wording must depend on the computed fidelity.
- **S3/S4** (second priority): the FTL guard misses "faster-than-light" (normalise hyphens and spaces before matching), and add a test that pins the m0/m1 label text to contracts' `BIT_LABELS` and the ruled "LOCAL BELL-HALF READOUT m1".

**Scope fence.** Another worker (backend-site-move) is editing `qollab_job.py`, `test_qollab_job.py` and `bridge.js` `verifySelectedBackendOnce`. Do NOT touch those. You own `cloning.py`, `teleportation.py`, `formats.py` if needed, `bridge.js` `commitTransfer` and the token code, and the matching tests.

**Vault notes to read first:** `vault/AGENTS.md`, `vault/Index.md`, `vault/Reports/quantum-hardening.md`, `vault/Reports/bridge-rewire.md`, `vault/Reports/contracts-v2.md`, `echo/CONTRACTS.md` § "The one story commit" (on main), and `lanes/quantum/rulings.md`. Your report opens with a **Vault check**.

**Where to start.**
1. Re-run the reviewer's seam check from `lane/quantum/engine-bridge-review` (`evidence/quantum/engine-bridge-review/seam.*`, see its README). It must be RED (7/13) on your base. Save that output as red-before.
2. Write your own checks first, and watch them fail:
   - commit result passes `validateCommitResult` using the real contracts.js from `main`;
   - cloning |0>/|1> give `fidelity` ≥ FIDELITY_PASS, and |+> and the phase state give `fidelity` < FIDELITY_PASS;
   - after Python consumes the token and validation then fails, the JS bridge stays latched as consumed;
   - a wrong-correction fact never claims delivery.
3. Fix the defects. Delete `{"state":"token"}` and every reader of it (no-bloat).

**Deliver.**
- Commits on `lane/quantum/commit-seam-fix`.
- seam check 13/13.
- pytest `echo/tests` green with `PYTHONDONTWRITEBYTECODE=1`, and no test weakened or deleted.
- `node tools/contract-check/check.mjs` green.
- `node tools/qollab-caps/check.mjs` no worse than base: entry-index, entry-main, plus backend-run-python unless row 3 has landed.
- The full Pyodide runner round (`PB_PORT=<your own free port> bash evidence/quantum/pyodide-bridge/round.sh`), green, with the fault control green.
- A runner screenshot of the commit *accepted* by `validateCommitResult`, with "LOCAL RUNNER" visible.
- A sabotage round on a disposable copy: revert each fix one at a time and show each check going red. Report the nulls.
- Evidence goes in `evidence/quantum/commit-seam-fix/` with a README. The vault report goes in `vault/Reports/commit-seam-fix.md`.
- Before the final report: `git merge lane/quantum/integration` (it may then contain backend-site-move), regenerate the hubs and the Index (`node scripts/vault-hubs.mjs`, `python3 scripts/gen-subject-index.py`, both with `--check` exit 0), and re-run every gate on the merged tree.

**How I will judge it.** I re-run all of the above on a disposable merged copy. Claims without artifacts are rejected. A seam that is green only on your fixtures, and not on the reviewer's script and the real contracts.js, is rejected.

**Report.** `lanes/quantum/reports/<n>-commit-seam-fix.md`: TL;DR, Vault check, commands with exit codes, evidence paths, nulls, what was not done, and decisions inferred from the docs. Write a **checkpoint within 1 h**; the final is due by 03:15 ET at the latest. Label everything "local runner", never Qollab.

**Write your report to `/Users/udsy/agent-org/lanes/quantum/reports/0015-commit-seam-fix.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/quantum/renders/commit-seam-fix/` (PNG; only images newer than its last consult are shown to it).
