# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `gameplay`. Read `/Users/udsy/agent-org/lanes/gameplay/context.md`
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
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/gameplay/renders/<your agent name>/` (PNG, descriptive
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
  - `## Questions for the owner` — anything the vision docs do not settle (owner rule: ask, never assume);
  - what the supervisor should do next (LAST, so it is in the tail the supervisor reads).

- **Lane ownership.** You edit only this lane's files: gameplay: `echo/game/` (not `audio.js`), `echo/scene/` (not lighting/rain/props/buildings/effects). Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 2)

You are agent `gameplay-quest-review` in worktree `/Users/udsy/agent-org/lanes/gameplay/wt/gameplay-quest-review` on branch `lane/gameplay/gameplay-quest-review`.

You are an adversarial REVIEWER (read-only on product files; you write only your report and, if useful, `vault/Reports/` findings). One task: try to break the quest core that was just merged into `lane/gameplay/integration`.

**GOAL:** A first-time player can never reach a state that the physics or the story forbids. They cannot skip a mission, commit twice, get credit for a wrong correction, or see a fake result presented as Qiskit. The quest machine must also be safe for the 3D world-controller to drive with spammed key presses and resets.

**VISION:** ECHO: ONE OF ONE teaches no-cloning, no-signalling and teleportation through play. Judges reward truthful physics (vision §2.4, §7.5) and a complete, reliable quest loop (§9, §12.5).

**WHAT WE ARE BUILDING:** In `echo/game/`:
- `state.js` holds the §9.1/§9.2 FSM. `createQuestMachine(bus)` returns `{state, send, can, reset}`. It emits `quest:transition` and `quest:enter:<STATE>`, and `commitIsOneShot()` is checked at load.
- `eventBus.js`.
- `missionRules.js` maps an `eventForResult(result)` from an ExperimentResult to a quest event.
- `objectives.js`.

Under `dev/gameplay/` there are three dev-only pieces: `fakeQuantum.js` (labelled `documented_preview`), `devTerminal.js` and `harness.html`. Read `vault/Reports/quest-state-machine-contract.md` and the worker report `/Users/udsy/agent-org/lanes/gameplay/reports/0001-gameplay-quest-core.md` (including its sabotage table, `evidence/gameplay-quest-core/03-sabotage.md`).

**WHAT HAS NOT WORKED (org-wide):**
- Optimising against tests instead of the product.
- Judging the wrong artifact.
- Gates whose ground truth came from the code under test.

The worker claims its tests parse the ground truth from `ECHO_MASTER_VISION.md` bytes. Verify that claim independently.

**Vault notes to read first:**
- `vault/AGENTS.md`, `vault/Index.md`
- `vault/Reports/quest-state-machine-contract.md`
- `vault/Research/qollab-platform-and-submission.md`
- `.claude/rules/gate-independence.md` and `vault/Design/gate-independence-cases.md`
- Vision §7 (physics), §8.4 (ExperimentResult), §9 (quest states, reactions, reset) and §13.

**What to check (derive your own checks; these are starting points, not a test list):**
1. **The state table vs §9.1/§9.2, read by you from the doc.** Look for any edge the doc does not license, any state that cannot be reached, and any dead end. Check that RESTART/reset leaves no residue: listeners, pending results, or a committed flag.
2. **Physics truth in `fakeQuantum.js` + `missionRules.js` vs §7.** Check the following:
   - m0 = source readout and m1 = Bell half.
   - X iff m1 = 1 and Z iff m0 = 1.
   - Fidelity is 1 only for correct corrections, and the result is independent of which basis state.
   - Note the worker's open question: cycling basis states can give "fidelity 1 with wrong Z". Construct a case and say whether the rule handles it.
   - The no-signalling marginal is 0.5/0.5 regardless of the sender gate.
   - The cloning failure is real: reduced purity < 1 / fidelity < 1 for superposition, and 1 for basis states.
   - The story token cannot be measured or reused before commit.
3. **Honesty labelling.** Nothing in `echo/` imports anything from `dev/`. The fake can never be mistaken for Qiskit output: check its engine label and wording.
4. **Robustness for a 3D driver.** Check these cases:
   - a send during a `quest:enter` handler
   - an exception thrown in a listener
   - a stale async result after reset
   - 1000 random event sequences with no invalid state reached

   Write a throwaway fuzz script under `/tmp`, not in the repo.
5. **Qollab runtime fit (`.claude/rules/qollab-runtime.md`).** Check for:
   - only relative ES-module imports
   - no Node APIs, storage, POST, workers or bare specifiers inside `echo/game/`
6. **Lane ownership and no-bloat.** Note anything that duplicates what platform's `echo/contracts.js` will own (owner ruling 2026-10-10). Do not fix it; describe the migration.

**Falsify against a disposable copy** (law 10): run in a `/tmp` worktree of `lane/gameplay/integration`, never by editing the lane checkout. Serve any browser check on your OWN port (pick 86xx, not 8611).

**Deliver:** a report at `/Users/udsy/agent-org/lanes/gameplay/reports/` (next number, `-gameplay-quest-review.md`). It must contain:
- a TL;DR
- `## Vault check`
- the findings ranked by severity, each with: a reproduction (command plus output, or file:line), the expected vs actual result, and the fix you recommend and which lane owns it
- the nulls: what you tried that did NOT break
- `## Questions for the owner`

For a durable finding, also add a short `vault/Reports/` note linked from its hub (`node scripts/vault-hubs.mjs`), and commit it on your branch.

**How I will judge it:** reproductions I can re-run. A finding without a repro is discarded. "No defects found" is acceptable only with the list of attacks attempted and their outputs. Checkpoint within 1 h. Budget 1.5 h.

**Write your report to `/Users/udsy/agent-org/lanes/gameplay/reports/0002-gameplay-quest-review.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/gameplay/renders/gameplay-quest-review/` (PNG; only images newer than its last consult are shown to it).
