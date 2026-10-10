# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `story-ui`. Read `/Users/udsy/agent-org/lanes/story-ui/context.md`
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
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/story-ui/renders/<your agent name>/` (PNG, descriptive
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

- **Lane ownership.** You edit only this lane's files: story-ui: `echo/ui/`, `echo/data/`, `echo/main.css`. Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 4)

You are agent `terminals-c4` in worktree `/Users/udsy/agent-org/lanes/story-ui/wt/terminals-c4` on branch `lane/story-ui/terminals-c4`.

You are agent `terminals`. This is a **re-dispatch**: the previous run died at startup and left no commits, so start fresh from `lane/story-ui/integration`, which now carries ui-shell and story-data.

**GOAL:** A player can operate ECHO's three in-world terminals with the mouse or the keyboard alone. Every result names the engine that produced it, every failure says why, and ESC always backs out without a softlock.
- **Replication booth `copy_booth`** (§4.2, §6.4):
  - The player prepares |0>, |1> or |+> and presses DUPLICATE.
  - Basis states "match". |+> gives a Bell pair and `TWO INDEPENDENT COPIES: NO`, with purity 0.5 for each half.
  - Then come "Show me why" and the deduction choice (increase voltage or reroute). Both are allowed and neither is punished.
- **Relay `relay_core`** (§4.3):
  - The player prepares a Bell pair, chooses the sender's local operation I, X or Z, and presses SEND.
  - For every choice, the receiver-only panel shows EXACT `partial_trace` probabilities 0.5/0.5, labelled EXACT, with no sampled counts (owner ruling).
  - The player can compare that with the paired (joint) view.
- **Teleport console `teleport_terminal`** (§4.4, §6.5):
  1. Repair the link.
  2. Run the Bell measurement on a fresh random calibration state. The bits m0 and m1 appear FIRST.
  3. Then the player sets X and Z. All four choices are always offered.
  4. VERIFY DRY RUN reports the fidelity. A wrong correction gives the real fidelity, below 1, explained with `FAILURES.teleportation.*` from `echo/data/objectives.js`. The retry uses a fresh state.
  5. COMMIT STORY TRANSFER unlocks only after at least one correct dry run whose bits are not 00.
  6. COMMIT is one atomic call. The source shows MEASURED/CONSUMED only when that call succeeds. On an error the player sees an honest message and can retry. Once a result is recorded, the commit is latched forever.
- **Labels:** m0 is labelled "SOURCE READOUT m0" and m1 is labelled "LOCAL BELL-HALF READOUT m1". The receiver applies X iff m1=1 and Z iff m0=1.

**VISION:** `ECHO_MASTER_VISION.md` §4.2–4.4, §6.1 layer 2 (movement off and mouse free while open; ESC closes), §6.4–6.6, §7, §8.4 (`QuantumEngine` / `ExperimentResult` / `EngineKind`, names verbatim), §8.6, §12.3 ("CALIBRATING"; "Quantum backend verification unavailable; educational circuit validated locally"; never "IonQ verified"), §9.2–9.4 (events, idempotence). Owner rulings are in `/Users/udsy/agent-org/lanes/story-ui/rulings.md`, especially the 2026-10-10 entries on red-team physics, gameplay consult 3 and the 13 lane questions.

**WHAT WE ARE BUILDING:** `echo/ui/terminal.js` and a `/* ==== terminal ==== */` section appended to `echo/main.css`, using the tokens ui-shell already defined there. API:
- `mountTerminal(root, {engine, onEvent, getHint})`
- `open(id)`, where `id` is an `INTERACTABLE_IDS` value from platform's `echo/contracts.js`. Read it from `git show lane/platform/integration:echo/contracts.js` and `echo/CONTRACTS.md`. If it is not on your base, import it by the same path and note that in the report. Never fork it.
- `close()`

Rules for the terminal:
- It emits contract event names through `onEvent`. It emits acknowledgement events (`EXPLANATION_READ`, `VIEW_RECEIVER_MARGINAL`) only after the result panel has been on screen.
- It never owns quest state.
- **All copy comes from `echo/data/objectives.js` (`TERMINALS`, `FAILURES`, hints). Duplicating a string is a defect.**
- Kets are `|x>` in the data. Render them as `|x⟩` at display time and never rewrite the data.

**Engine:** the quantum lane's Python is on `lane/quantum/integration`: `echo/quantum/formats.py` (the `experiment_result` shape: `keyQubits`, `observables`, `facts`, `measurementBits`, `fidelity`) and `teleportation.py` (`bell_measurement`, `teleport_branch`, `live_commit`). Their JS bridge (`echo/quantum/bridge.js`) has not landed.
- Write a harness stub in `evidence/story-ui/harness/` (NOT in `echo/`) that returns objects in EXACTLY that shape, with `engine: 'documented_preview'`, textbook-exact values only and no `counts`.
- Validate every result with a guarded schema check. A malformed result is refused, and the UI says so.
- Handle three engine states: pending (CALIBRATING, UI never frozen), a rejected promise (honest message plus retry) and malformed. The engine label is visible on every result.

**WHAT HAS NOT WORKED:**
- Your previous run died with no checkpoint, so commit early and write the report checkpoint within 25 minutes.
- Org-wide: optimising against tests instead of the product, flags nobody switches on, and judging the wrong artifact.
- In this lane, a 30/30 driver still missed defects a human saw in the renders. Look at your own screenshots.

**Vault notes:**
- `vault/AGENTS.md`, `vault/Home.md`, `vault/Index.md`
- `vault/Research/qollab-platform-and-submission.md`
- `vault/Reports/story-ui-ui-shell-harness.md`, `vault/Reports/story-data-script-gate.md`
- `evidence/story-ui/story-data/script.md`

**Where to start:**
1. Write the event-log check FIRST and watch it fail. It asserts that the emitted events come in order, that COMMIT fires at most once under double-click and double-Enter, and that COMMIT stays disabled before a qualifying dry run.
2. Build the harness at `evidence/story-ui/harness/terminals.html`, served with `python3 -m http.server` on port 8761. Reuse ui-shell's `drive.mjs` pattern.

**Deliver** screenshots in `evidence/story-ui/terminals/` with a README and a visible version token:
- each terminal at each step
- |+> failing with its reason
- the relay receiver for I, X and Z
- all four m0/m1 cases, each with the right correction and one wrong correction, with fidelities
- the commit, then a second attempt refused
- a commit error followed by a retry
- the engine error state, CALIBRATING, and the malformed result refused
- ESC mid-flow, then reopen with the state intact

Also deliver the keyboard-only key sequence for one full teleport run, an accesslint `audit_live` result and a sabotage round with the nulls reported. Put the 10 best PNGs in `renders/terminals/`.

**How I will judge:** I will read the renders myself. The physics must match §7 for every bit pair, the engine label must be in every shot and no copy may be duplicated.

**Report:** `/Users/udsy/agent-org/lanes/story-ui/reports/0002-terminals.md`. It opens with `## TL;DR` and the Vault check and includes `## Contract requests for platform/quantum` and `## Decisions inferred from the docs`. Checkpoint within 25 minutes, PARTIAL if needed.

**Write your report to `/Users/udsy/agent-org/lanes/story-ui/reports/0004-terminals-c4.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/story-ui/renders/terminals-c4/` (PNG; only images newer than its last consult are shown to it).
