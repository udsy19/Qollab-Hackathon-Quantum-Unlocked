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


# YOUR BRIEF (supervisor, consult 6)

You are agent `ionq-sim-rehearsal` in worktree `/Users/udsy/agent-org/lanes/quantum/wt/ionq-sim-rehearsal` on branch `lane/quantum/ionq-sim-rehearsal`.

**GOAL.** Before the overseer spends ECHO's one selected-backend job on Qollab, we need to know that our Bell verification circuit and count parsing behave correctly on IonQ's real simulator stack, both ideal and noisy. The finale's "VERIFIED ON SELECTED SIMULATOR" panel should then show honest, correctly parsed counts the first time it runs.

**VISION.** The vision asks for one selected-backend Bell verification (§7.5, §10.7). It must be honest, correctly labelled, and never presented as teleportation. Its backend provenance must be documented clearly (CLAUDE.md). That job is ECHO's one IonQ moment for the judges.

**WHAT WE ARE BUILDING.** `echo/quantum/qollab_job.py` builds the Bell circuit (H, CX, measure), reads counts through an explicit clbit←qubit map, and is guarded to run once per run. `echo/quantum/bridge.js` `verifySelectedBackendOnce()` calls it through `.callPromising(backend)`. You are rehearsing the Python side **off Qollab**.

**WHAT HAS NOT WORKED / KNOWN**
- So far it has run only on BasicSimulator and the runner's mock.
- Count keys put clbit 0 on the right. This was checked in qiskit-ionq 1.1.1's `_build_counts` source, but never against a live IonQ response.
- A plain (non-`callPromising`) call on Qollab fails with an XHR error. That is Qollab-only and out of your scope.
- **Do not edit `echo/`.** Another worker (quantum-hardening) is editing `echo/quantum/*.py` right now, and will rename `experiment` to `"backend_verification"`. Use the circuit and count-reading functions as they are.

**Owner ruling, binding, verbatim in effect.** The IonQ key is in `~/.config/echo/ionq.env`.
- Load it only inside the one command that needs it: `set -a; . ~/.config/echo/ionq.env; set +a; python …`.
- NEVER print, log, echo, copy or commit the key or that file. Never use the `qpu` backend: only `IonQProvider().get_backend("simulator")`, optionally with `noise_model` `aria-1` or `forte-1`.
- Never use the key from anything under `echo/`.
- If the file is missing, or qiskit-ionq is not installable in the venv, stop the IonQ step and say so. Do not ask for the key.
- Label every result **"local IonQ simulator (off Qollab)"**.
- Grep your evidence for the key's prefix and length before committing, and report that you checked.

**Vault notes to read first:**
- `vault/AGENTS.md`
- `vault/Research/qollab-backend-from-js-projects.md`
- `vault/Reports/pyodide-bridge.md`
- `vault/Reports/quantum-physics-review.md` §endianness
- `evidence/quantum/backend-job/README.md`

**Where to start**
- Read `echo/quantum/qollab_job.py`.
- Write `evidence/quantum/ionq-sim-rehearsal/rehearse.py`. It calls the module's own entry point (the same function the bridge uses) with an IonQ simulator backend, 256 shots (owner ruling).
- Run it three times: ideal, `aria-1` noise, and `forte-1` noise.
- Also run an **asymmetric control**: X on qubit 0 only, then measure. You must see a single dominant key whose position proves clbit 0 is on the right. If our parser put it on the wrong side, this control is what would show it. Watch it fail first by deliberately reversing the key order on a disposable copy, never in `echo/`.

**Deliver** (on your branch, evidence and vault only)
- `evidence/quantum/ionq-sim-rehearsal/` with the script, raw count JSON per run, the parsed result dict per run, and a README.
- Check each result against platform's validator (`evidence/quantum/contract-conformance/validate.mjs`, with contracts.js from `lane/platform/integration`). Expect a reject only on the not-yet-renamed `"bell_verification"`. Show that the result validates with that field patched to `backend_verification` on a copy.
- Record the latency per job.
- Write `vault/Reports/ionq-sim-rehearsal.md` and link it from the Reports hub.

**How I judge it**
- I re-run the asymmetric control and the parser check without the key: you will supply a saved IonQ response fixture.
- Noisy correlated fraction should be plausibly <1 and ideal ≈1.
- Nothing leaks: I grep for the key myself.
- Every label says "local IonQ simulator (off Qollab)".

**Report.** Write `reports/<n>-ionq-sim-rehearsal.md` with a checkpoint within 1 h. Open with a **Vault check**. Then: TL;DR, a table of the runs, sabotage and nulls, what is not verified, and requests (the key goes nowhere).

**Write your report to `/Users/udsy/agent-org/lanes/quantum/reports/0006-ionq-sim-rehearsal.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/quantum/renders/ionq-sim-rehearsal/` (PNG; only images newer than its last consult are shown to it).
