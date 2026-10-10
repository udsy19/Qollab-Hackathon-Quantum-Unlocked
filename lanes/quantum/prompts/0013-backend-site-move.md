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


# YOUR BRIEF (supervisor, consult 13)

You are agent `backend-site-move` in worktree `/Users/udsy/agent-org/lanes/quantum/wt/backend-site-move` on branch `lane/quantum/backend-site-move`.

**GOAL:** In the game there must be exactly ONE place that sends a job to the selected backend. That place is `verifySelectedBackendOnce` in `echo/quantum/bridge.js`, which calls the JS `backend.run`. Python only builds the Bell-verification circuit and interprets the counts. Its own `backend.run` at `echo/quantum/qollab_job.py:169` is deleted. After this change, `node tools/qollab-caps/check.mjs` should be RED only on `entry-index` and `entry-main`, the two platform files that are missing.

**VISION:** CLAUDE.md says IonQ on Qollab allows one backend job per run. Owner ruling 2026-10-10 says "exactly one guarded backend.run site (echo/quantum/bridge.js)". Red-team fix (e) says "delete the Python-side backend.run site". The judge must be able to trust that the one IonQ job is spent exactly once, and honestly.

**WHAT WE ARE BUILDING:** The quantum-owned `bridge.js` that platform's `main.js` will import, plus `qollab_job.py`. You own `echo/quantum/` and `echo/tests/` and nothing else. Do not edit `main.js`, `tools/` or `contracts.js`. List any request for platform in your report.

**WHAT HAS NOT WORKED / KNOWN FACTS:**
- **Python route:** Python reaches `backend` only through `.callPromising(backend)`. A plain call on IonQ fails with an XHR error.
- **Local runner counter:** it counts only JS-proxy calls, so it reads 0 for Python-side runs. Use the harness spy (`evidence/quantum/pyodide-bridge/project/pb_spy.py`) and extend it to count JS calls too.
- **Why the X-on-q0 control stays local:** a Bell (00/11) run cannot detect a bit-order bug. Only an asymmetric control (X on q0) can, so that control stays a local proof and the Bell run must not replace it.
- **Count keys:** clbit 0 is on the right.
- **Converting to JS:** `toJs()` needs `dict_converter: Object.fromEntries`.
- **One-shot check:** a parallel research worker (backend-site-research, branch `lane/quantum/backend-site-research`) found that a JS `backend.run` accepts a Python-built `QuantumCircuit` PyProxy. Qollab's real guard is the frame's `fetch` override (`rewriteIonqRequest`). Read its branch and report (`/Users/udsy/agent-org/lanes/quantum/reports/0011-backend-site-research.md`) first. **Your first step is to try to refute this in the runner.** Pass a Python-built circuit to the runner's JS `backend.run` on both backends, `basic_simulator` and ionq-mock. If that fails, STOP and write your report at once with the failing log. Do not build a workaround.

**VAULT:** Read `vault/AGENTS.md`, `vault/Index.md`, `vault/Research/qollab-backend-from-js-projects.md`, `vault/Reports/pyodide-bridge.md`, `vault/Reports/bridge-rewire.md`, `vault/Reports/quantum-vs-contracts-v2.md` (gap row 3), `vault/Reports/ionq-sim-rehearsal.md` and `vault/Reports/qollab-caps-gate.md`. Your report opens with a Vault check.

**WHERE TO START:**
- `echo/quantum/qollab_job.py`: the `run_backend_verification_once` path.
- `echo/quantum/bridge.js`: `verifySelectedBackendOnce`.
- `evidence/quantum/pyodide-bridge/{round.sh,run.sh,sabotage.mjs,project/}`.
- `evidence/quantum/ionq-sim-rehearsal/` (the replays call `qollab_job`; keep them working or update them).

**DELIVER:**
1. **The split.** Python exposes a builder for the circuit and an interpreter for the counts. `interpret_counts` keeps 256 shots pinned and records any drift in `facts`. bridge.js does the following:
   - memoises one promise;
   - calls `backend.run(circuit, {shots:256})` exactly once per interpreter run;
   - reads the counts;
   - has Python interpret them;
   - validates the result with the contract validator.

   RESTART must not reset that memo. Delete the Python `backend.run` and any helper it alone used, then grep that no references remain.
2. **Checks written first and watched red on the current tip.** Across verify ×2, RESTART and verify again, the spy must count JS `backend.run` = 1 and Python `backend.run` = 0. The result must be accepted as `backend_verification` with 256 shots. The caps line `backend-run-python` must be gone.
3. **The full `round.sh` on your tip:** 3 green runs, the fault control, the head controls (the old head is now bridge-rewire), and the sabotages. Add sabotages of your own:
   - a second JS `backend.run`;
   - Python calling `backend.run` again;
   - the memo dropped.

   Report every null.
4. **The other gates must not regress:** pytest `echo/tests` (`PYTHONDONTWRITEBYTECODE=1`), contract-check GREEN, and the ionq-sim-rehearsal replays green.
5. One screenshot of the runner page showing the JS/Python spy counts, saved to `renders/backend-site-move/`.
6. Use your own `PB_PORT`, chosen in the range 5220–5229. Never use a shared port.
7. Before your final report, merge current `lane/quantum/integration` and regenerate the hubs (`node scripts/vault-hubs.mjs`, `python3 scripts/gen-subject-index.py`). Both `--check` runs must exit 0.

**JUDGING:** I will re-run `round.sh`, caps, pytest and the replays on a disposable worktree. I accept the work only if caps is RED on entry-index and entry-main alone, the spy shows JS=1 and Python=0, and every sabotage is red apart from nulls you named in advance. Results are "local runner", never "Qollab".

**REPORT:** `reports/00NN-backend-site-move.md` (TL;DR, Vault check, commands with exit codes, evidence paths, nulls, decisions with doc citations, and requests for platform: what main.js must call). Write it to `vault/Reports/backend-site-move.md` as well. Checkpoint commit and report within 1 h. Hard cutoff 03:15 ET.

**Write your report to `/Users/udsy/agent-org/lanes/quantum/reports/0013-backend-site-move.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/quantum/renders/backend-site-move/` (PNG; only images newer than its last consult are shown to it).
