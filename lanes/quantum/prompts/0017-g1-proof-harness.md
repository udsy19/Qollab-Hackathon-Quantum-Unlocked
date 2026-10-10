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


# YOUR BRIEF (supervisor, consult 17)

You are agent `g1-proof-harness` in worktree `/Users/udsy/agent-org/lanes/quantum/wt/g1-proof-harness` on branch `lane/quantum/g1-proof-harness`.

**GOAL:** When the two running fixes land, the supervisor proves G1 with one command in minutes, not an hour of hand-run gates. Any conflict between the two running branches is found NOW, not at 03:30 ET.

**VISION:** G1, "quantum verified", is due Sat 04:00 ET (`ROADMAP_48_HOURS.md`; `.claude/rules/deadline-gates.md`). The bar is that every puzzle result the real game consumes is real Qiskit output that passes the platform's per-phase contract validators, with exactly one `backend.run` in `bridge.js` (vision §7, §8.4, §10.3–10.7).

**WHAT WE ARE BUILDING:** the quantum engine `echo/quantum/` plus `bridge.js`, consumed by the Qollab game in `echo/`. You build **evidence tooling only**. Edit nothing under `echo/`; two other workers own those files right now.

**WHAT HAS NOT WORKED**
- Green lane tests on a fake adapter hid a total integration break: 12/13 cross-lane checks were red.
- 595 tests plus 1087/1087 contract-check passed while the commit was rejected by `validateCommitResult`. Generic-shape validation is not conformance.
- `cmd | tail` hid exit codes.
- pytest's `__pycache__` inflated the caps file count.
- Branches cut before the last hub regeneration conflict in `vault/Map.md`, `vault/Reports/README.md` and `vault/Index.md`.

**Vault notes to read first:** `vault/AGENTS.md`, `vault/Index.md`, `vault/Reports/engine-bridge-review.md` (`seam.mjs`), `vault/Reports/bridge-rewire.md` (`round.sh`), `vault/Reports/tests-caps-clean.md`, `vault/Research/backend-run-site.md`, `evidence/quantum/pyodide-bridge/README.md`, `evidence/quantum/engine-bridge-review/README.md`. Your report opens with a **Vault check**.

**Deliver**
1. **`evidence/quantum/g1-proof/prove.sh <git-ref> [port]`.**
   - It builds a disposable detached worktree of the ref under /tmp. It never touches the lane checkout.
   - It runs, each with its own exit code captured (no pipes that hide them) and `PYTHONDONTWRITEBYTECODE=1`:
     - `pytest echo/tests`
     - `node tools/contract-check/check.mjs`
     - `node tools/qollab-caps/check.mjs`
     - `seam.mjs`
     - `PB_PORT=<port> round.sh`
   - It writes `out/<ref-sha>/SUMMARY.md`, with one line per gate: command, exit code, verdict line, log path.
   - It exits 0 only if every gate is at its expected verdict.
     - caps is "expected RED only on entry-index and entry-main", checked by rule id, not by exit code.
     - A gate that did not run is a REFUSAL (exit 2), never a pass.
     - A hang has a timeout and is reported as NO VERDICT.
   - Reuse the existing scripts. Do not reimplement them.
2. **A falsification of `prove.sh` itself**, on a disposable copy: break one gate input (for example flip one fidelity threshold, or add a second `backend.run`) and show `prove.sh` goes red on that gate. Report any null.
3. **A trial merge now.**
   - Run `git merge-tree --write-tree` on integration + `lane/quantum/backend-site-move` + `lane/quantum/commit-seam-fix`, using their current tips. Name the tips by SHA.
   - Report every conflicting path. Note that commit-seam-fix carries main's new contracts (ae39421 `validateCommitResult`) and backend-site-move does not.
   - If the merge is clean, run `prove.sh` on the trial commit (`commit-tree`, detached) and report the per-gate table. Red gates are expected there, because the fixes are still in progress; this is a dry run of the tool.
   - If it conflicts, do not resolve anything. List the hunks.
4. Then a vault note `vault/Reports/g1-proof-harness.md`. Merge current integration and regenerate the hubs (`node scripts/vault-hubs.mjs`, `python3 scripts/gen-subject-index.py`, both `--check` exit 0) before your final report.

**How I will judge it**
- I re-run `prove.sh` on integration myself and get the same table.
- The sabotage turns its gate red.
- The trial-merge conflict list matches my own `merge-tree`.

**Report:** `lanes/quantum/reports/NNNN-g1-proof-harness.md`. It contains TL;DR, Vault check, commands with exit codes, nulls, and what you did NOT do. Write a checkpoint within 1 h; the trial-merge result goes first, as soon as you have it. Pick a free port (not 5193 or 5213).

**Write your report to `/Users/udsy/agent-org/lanes/quantum/reports/0017-g1-proof-harness.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/quantum/renders/g1-proof-harness/` (PNG; only images newer than its last consult are shown to it).
