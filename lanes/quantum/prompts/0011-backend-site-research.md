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


# YOUR BRIEF (supervisor, consult 11)

You are agent `backend-site-research` in worktree `/Users/udsy/agent-org/lanes/quantum/wt/backend-site-research` on branch `lane/quantum/backend-site-research`.

**GOAL:** Settle gap row 3 with evidence: where the ONE selected-backend `backend.run` should live.

The owner ruling (owner-answers § overseer relay from red-team physics-code-audit) says: "exactly one guarded backend.run site (echo/quantum/bridge.js)". Today the guard (memoised `verifySelectedBackendOnce`) is in bridge.js, but the call itself is Python: `echo/quantum/qollab_job.py:169`, reached through `.callPromising(backend)`. qollab-caps flags it as `backend-run-python` ("only JS may, unless the owner rules otherwise").

**VISION:** CLAUDE.md requires one backend job per run, the injected backend, and no hardcoding. Vision §8.4 and §10.7 cover `verifySelectedBackendOnce`. The finished game must make exactly one honest Qollab job, and the gate must be able to prove it.

**WHAT WE ARE BUILDING:** The one Bell verification job a judge sees in the Declassified panel.

**WHAT HAS NOT WORKED:**
- A plain (non-callPromising) Python call on an IonQ backend fails with an XHR ConnectionError (measured on Qollab).
- The runner's JS `backend.run` counter reads 0 while a Python-submitted job runs (`vault/Reports/pyodide-bridge.md`). So today neither the runner nor caps can see our job.

**Answer these questions with citations** (Qollab docs: https://qollab.xyz/learn/docs/js-qiskit-projects, runtime-environment and run-your-code; the vault research notes; platform's `tools/qollab-runner/`):
- (a) Can JS call `backend.run` with a circuit built in Python (QASM string? a PyProxy QuantumCircuit?), and what does it return?
- (b) Does the runner's mock support that route?
- (c) Which option meets the ruling with the least risk?
  - Option A: JS submits the job in bridge.js, and Python only builds the circuit and interprets the counts.
  - Option B: keep the documented Python route and ask platform for a narrowly scoped caps exemption plus a runner counter for Python-side runs.

If A looks feasible, prove it in the local runner on a disposable copy. Use your own `PB_PORT`, and do not commit any bridge.js change: bridge-rewire owns bridge.js right now. A spy must show 1 `backend.run`, the counts decoded with clbit 0 on the right, and an asymmetric X-on-q0 control decoding to q0=1.

**Vault notes:**
- `vault/AGENTS.md`
- `vault/Index.md`
- `vault/Research/qollab-backend-from-js-projects.md`
- `vault/Research/qollab-platform-and-submission.md`
- `vault/Reports/pyodide-bridge.md`
- `vault/Reports/ionq-sim-rehearsal.md`
- `vault/Reports/qollab-caps-gate.md`

**Deliver:**
- `vault/Research/backend-run-site.md` with sources, linked via `node scripts/vault-hubs.mjs`.
- `evidence/quantum/backend-site-research/`, holding any runner proof.
- A recommendation of A or B, with the exact diff you propose for bridge.js and qollab_job.py (in the report, not committed to `echo/`), plus the exact request to platform if B.

**How I judge:** I want citations to the docs, not assumptions. If you claim A works, I must see a runner log and screenshot in which the spy counts exactly 1. Merge current integration and regenerate hubs and Index before your final report.

**Report:** `lanes/quantum/reports/` — opens with a Vault check. Checkpoint within 1 h; hard stop 01:30 ET.

**Write your report to `/Users/udsy/agent-org/lanes/quantum/reports/0011-backend-site-research.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/quantum/renders/backend-site-research/` (PNG; only images newer than its last consult are shown to it).
