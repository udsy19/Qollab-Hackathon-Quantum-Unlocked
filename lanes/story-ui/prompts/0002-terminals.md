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


# YOUR BRIEF (supervisor, consult 2)

You are agent `terminals` in worktree `/Users/udsy/agent-org/lanes/story-ui/wt/terminals` on branch `lane/story-ui/terminals`.

**GOAL:** A player can operate the three in-world terminals by mouse or keyboard alone:
- **PALISADE copy booth** (§4.2, §6.4): |0>, |1>, |+> → DUPLICATE. Basis states "match"; |+> gives a Bell pair, TWO INDEPENDENT COPIES: NO. Then "Show me why" and the deduction choice (increase voltage vs reroute; both allowed, no punishment).
- **Relay** (§4.3): prepare the Bell pair, choose a sender local op I/X/Z, SEND. The receiver's local marginal stays uniform for all three. The player can compare the receiver-only view with the paired view.
- **Teleport console** (§4.4, §6.5): repair the link, run the Bell measurement on a fresh test state, show m0/m1, set the X and Z corrections (all four choices possible), VERIFY DRY RUN with fidelity, then COMMIT STORY TRANSFER exactly once.

Every failure tells the player why. Hints come on request in three escalating levels. ESC always backs out without softlocking. Every result shows which engine produced it.

**VISION:** `ECHO_MASTER_VISION.md` §4.2–4.4, §6.1 layer 2 (movement disabled and mouse free while open; ESC closes), §6.4–6.6, §7 (normative physics), §8.4 (the adapter contract `QuantumEngine` / `ExperimentResult` / `EngineKind`; use these names verbatim), §8.6 and §12.3 (honest loading and failure states: "CALIBRATING"; "Quantum backend verification unavailable; educational circuit validated locally"; never "IonQ verified" unless true), §9.2 events and §9.3 (idempotence: opening a terminal twice never replays an irreversible transfer).

**WHAT WE ARE BUILDING:** `echo/ui/terminal.js`, which you own, plus a `/* ==== terminal ==== */` section at the END of `echo/main.css`. Another worker (ui-shell) is writing the tokens and base sections of that file right now. Use plain CSS custom-property fallbacks so you don't depend on their names. Before your final commit, `git fetch` and rebase onto `lane/story-ui/integration` if it has moved, and resolve `main.css` by keeping both sections.

API shape:
- `mountTerminal(root, {engine, onEvent, getHint})`
- `open(terminalId)` with ids `copy_booth`, `relay_core`, `classical_socket` (§9.4 verbatim)
- `close()`

The terminal emits the §9.2 event names through `onEvent` and never owns quest state. You do NOT own `quantum/`, `game/`, `main.js`, `index.html`, or the event bus. File any contract you need as a request to platform.

**Physics truth is non-negotiable:**
- m0 = source readout, m1 = local Bell half.
- The correct correction is X iff m1=1 and Z iff m0=1. Show the bit order explicitly.
- A wrong correction gives a real fidelity below 1 and explains why. Do not hard-fail with no reason.
- COMMIT is disabled until a dry run passes. After commit, the source shows as consumed and COMMIT can never fire again (idempotent).

**Engine:** The real engine is the quantum lane's job and does not exist yet. In your harness, pass a stub that implements §8.4 with `engine: 'documented_preview'`. It may return only textbook-exact values (e.g. purity 0.5 for each half after CNOT on |+>; fidelities from the closed-form branch table §10.6). Your UI must display the engine label on every result, so preview data is never presented as a measurement. The stub lives in the harness, NOT in `echo/`.

Handle these engine states: pending (CALIBRATING, still interactive, no frozen UI), rejected promise or error (honest message plus retry), and malformed result (a guarded schema check that refuses and says so).

**WHAT HAS NOT WORKED (org-wide):** optimising against tests instead of the product; building behind flags nobody switches on; judging the wrong artifact. Nothing has been tried on this lane yet.

**Vault notes:** `vault/AGENTS.md`, `vault/Home.md`, `vault/Index.md`, `vault/Research/qollab-platform-and-submission.md`.

**Where to start:**
- Harness at `evidence/story-ui/harness/terminals.html`, outside `echo/`.
- Serve with `python3 -m http.server` on your own 88xx port.
- Drive it headlessly (puppeteer MCP or a browser-tester sub-agent).

**Deliver:** screenshots in `evidence/story-ui/terminals/` with a README. Required shots:
- each terminal at each step
- |+> failing with its reason
- relay marginals for I/X/Z
- all four m0/m1 cases, with right and wrong corrections and the resulting fidelity
- commit, then a second attempt refused
- engine error state
- CALIBRATING state
- ESC mid-flow, then reopen with state intact

Also provide: a keyboard-only key sequence for one full teleport run, and an accesslint `audit_live` result. Write the event-log check FIRST and watch it fail. It must assert that the emitted §9.2 events appear in order and that COMMIT_TRANSFER is emitted at most once under double-clicks.

**How I will judge:** screenshots from the committed build, with a version token visible. The physics shown must match §7 and the engine label must always be visible.

**Report:** `/Users/udsy/agent-org/lanes/story-ui/reports/terminals.md`. Open with a Vault check, then TL;DR, evidence (command + exit code + path), nulls, `## Contract requests for platform/quantum`, and `## Questions for the owner`. Write a checkpoint within 1 h (PARTIAL if needed).

**Write your report to `/Users/udsy/agent-org/lanes/story-ui/reports/0002-terminals.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/story-ui/renders/terminals/` (PNG; only images newer than its last consult are shown to it).
