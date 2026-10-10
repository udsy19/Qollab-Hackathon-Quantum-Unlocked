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


# YOUR BRIEF (supervisor, consult 8)

You are agent `bridge-rewire` in worktree `/Users/udsy/agent-org/lanes/quantum/wt/bridge-rewire` on branch `lane/quantum/bridge-rewire`.

**GOAL:** In the game, every quantum terminal calls `echo/quantum/bridge.js`, and today the bridge talks to the *pre-hardening* Python API. After this task, a player in the browser (Pyodide) gets the hardened behaviour through the bridge:
- the rooftop dry run draws a **fresh random generic calibration state**; bits come first, X/Z second;
- the final commit teleports the **hidden fixed story token** exactly once;
- RESTART can re-arm the token;
- the one selected-backend verification **resolves** as a valid `ExperimentResult` with `experiment: "backend_verification"`. Today it rejects, because the old name `bell_verification` is not in the contract.

The run that shows this is the G1 proof.

**VISION:** ECHO_MASTER_VISION §8.4 sets the `QuantumEngine` adapter contract, §7.4 says the token is consumed once, and §10.6–10.7 cover the two-phase dry run and the one backend job. The CLAUDE.md rule: "at most one backend.run per run; all puzzle feedback from local Qiskit".

**WHAT WE ARE BUILDING:** the Qollab-native `echo/` project. `bridge.js` (quantum-owned) is the only place JS calls Python, and the only guarded `backend.run` site, reached via `qollab_job.run_bell_verification_once` and `callPromising(backend)`. Platform's `main.js` imports it, and gameplay swaps `dev/gameplay/fakeQuantum.js` for it.

**WHAT HAS NOT WORKED / KNOWN TRAPS:**
- The bridge on integration (95b0394) is wired to the old API: `teleport_branch(stateId, …)` with no theta/phi, and `live_commit(stateId)`.
- `verifySelectedBackendOnce` currently rejects, which is a contract failure, not a physics failure.
- The runner's own `backend.run` counter cannot see Python-side calls, so use `pb_spy.py`'s Python spy, as pyodide-bridge did.
- A bare `toJs()` already returns plain Objects on Pyodide 314.0.7. Keep `dict_converter` anyway as a guard.
- Never claim a Qollab or IonQ run. Results are "local runner".

**Hardening's API, on your base branch** (read the code, not this summary):
- `bell_measurement("calibration", seed=?)` draws theta/phi and returns them in `parameters`.
- `teleport_branch("calibration", m0, m1, applyX, applyZ, theta=, phi=)`.
- `live_commit(seed=?)`, with no state id: it uses the hidden token, latches on success, and refuses a second call.
- `reset_story_token()`.
- `qollab_job` now emits `backend_verification`.

The bridge must carry theta/phi from the measurement result into the branch call, so the player's correction is graded on the state that was actually measured. Add an explicit RESTART hook on the bridge that calls `reset_story_token()` and clears the JS commit latch. **Do not** reset the backend-job memo: that stays at one job per run.

**FILES:** edit only `echo/quantum/bridge.js` and `evidence/quantum/pyodide-bridge/` (harness, `pb_spy.py`, `round.sh`; extend these, do not fork new copies; no-bloat). Write your report and a vault report under `vault/Reports/`. **Do not edit any `echo/quantum/*.py`**: hardening is still finalising them. Before your final run, `git merge lane/quantum/quantum-hardening` to pick up its latest tip, and record the hardening SHA you ran against. Do not touch `echo/main.js` (platform's). List that wiring as a request.

**VAULT NOTES TO READ FIRST:** `vault/AGENTS.md`, `vault/Index.md`, `vault/Reports/pyodide-bridge.md`, `vault/Reports/contract-conformance.md`, `vault/Research/qollab-backend-from-js-projects.md`, `evidence/quantum/hardening/README.md` on your base, `evidence/quantum/pyodide-bridge/README` and `round.sh`, the `echo/CONTRACTS.md` v2 sections on the two-phase teleport dry run and `backend_verification` (on `main`), and `/Users/udsy/agent-org/lanes/quantum/rulings.md`.

**WHERE TO START:**
1. Read the hardening API.
2. Write the harness checks for the new behaviour first, and capture them red against the current bridge (law 3). The checks to add:
   - a dry run's theta/phi round-trips into the branch result;
   - two calibration draws differ;
   - every wrong X/Z on a non-00 branch scores F < 0.999999;
   - the second `commitTransfer` is refused;
   - after RESTART, a commit succeeds again;
   - two `verifySelectedBackendOnce` calls give one Python `backend.run` and **resolve** to a validator-accepted `backend_verification`.
3. Then rewire.
4. Run `round.sh` on your OWN port (`PB_PORT`, not 5147/5193), with the runner from `lane/platform/integration`, as pyodide-bridge did. Use `--python-from` your branch.

**DELIVER:**
- Three consecutive green runs in the local runner, plus the head control (old bridge = red).
- Sabotages: no-theta-passthrough, latch removed, RESTART not resetting the Python token, no-memo, swallow-validator. Each must go red; report every null.
- A runner screenshot under `renders/bridge-rewire/` showing the resolved `backend_verification` result.
- `node tools/contract-check/check.mjs` run against your bridge output if it accepts engine dumps; say so if it cannot.

**HOW I WILL JUDGE IT:** I re-run `round.sh` myself on a disposable detached worktree and need exit 0 ×3 and red sabotages, and I look at the screenshot. A report that opens without a **Vault check**, or that claims anything ran on Qollab or IonQ, is rejected.

**REPORT:** `lanes/quantum/reports/NNNN-bridge-rewire.md`, with TL;DR, Vault check, evidence paths, nulls, what was not verified, requests for platform (the `main.js` import, the runner's Python counter), and decisions inferred from the docs. **Checkpoint within 1 h. Hard cutoff 03:30 ET:** report whatever is green by then.

**Write your report to `/Users/udsy/agent-org/lanes/quantum/reports/0008-bridge-rewire.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/quantum/renders/bridge-rewire/` (PNG; only images newer than its last consult are shown to it).
