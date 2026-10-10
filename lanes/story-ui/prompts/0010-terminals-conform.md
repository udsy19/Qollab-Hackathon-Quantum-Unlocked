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


# YOUR BRIEF (supervisor, consult 10)

You are agent `terminals-conform` in worktree `/Users/udsy/agent-org/lanes/story-ui/wt/terminals-conform` on branch `lane/story-ui/terminals-conform`.

# terminals-conform: bring the three terminals onto the current lane data and make every failure line true

## GOAL
A player at the rooftop console who picks a wrong X/Z plan reads lines that are TRUE for exactly their case. That holds for all 16 combinations of (m0, m1) × (X on/off, Z on/off), including the 4 cases where both switches are wrong. The panel uses the current lane wording: RECEIVER BELL HALF, the m0/m1 labels, and a plain-words explanation of "fidelity". The terminals must also merge into `lane/story-ui/integration` with no conflict, so the game can mount them.

## VISION
Vision §4.4 Beat 3 and §6.6: every failure says why, with an explanation. §7.1 and §2.4: truthful physics. Bit names: m0 is the source readout and m1 is the local Bell half. The receiver needs X iff m1 = 1 and Z iff m0 = 1. A wrong line about teleportation is the worst failure this game can have, because the game exists to teach exactly this.

## WHAT WE ARE BUILDING
`echo/ui/terminal.js` and the `/* ==== terminal ==== */` section of `echo/main.css`. These are on branch `lane/story-ui/terminals-c4` (`710f4a0`, 100/100 drive, report `lanes/story-ui/reports/0004-terminals-c4.md`). Your base is that branch. Story-ui owns `echo/ui/`, `echo/data/` and `echo/main.css`. Do not touch anything else in `echo/`.

## WHAT HAS NOT WORKED (read this)
1. **terminals-c4 was built on an old base.** It does not have the lane integration branch (`git merge-base --is-ancestor lane/story-ui/integration HEAD` exits 1), and `git merge-tree --write-tree lane/story-ui/integration HEAD` conflicts in `echo/data/objectives.js` and `echo/main.css`.
2. **`dryExplanation()` (terminal.js ~line 375) derives the failure lines with its own per-switch logic** and pushes `F.no_corrections`.
   - `data-fixes` (now on integration) DELETED `no_corrections` and added `TELEPORT_FAILURE_CASES`, a map of which lines are true in each of the 16 cases.
   - Per-switch logic was shown to be FALSE in the 4 both-wrong cases: the receiver holds XZ·ψ, so "left bit-flipped" alone is untrue there. See `evidence/story-ui/data-fixes/branch-truth.md` and `vault/Reports/` (data-fixes).
   - Closed form for your own check: after the plan (x, z), the receiver holds X^(x⊕m1) Z^(z⊕m0)·ψ.
3. **The key order is a red-team hazard.** `TELEPORT_FAILURE_CASES` is keyed `'m0m1:XZ'`, which is the REVERSE of Qiskit's bitstring order (c1c0). Read in Qiskit order, 8 of the 16 cases show false lines. Rule: read `measurementBits.m0` and `.m1` BY NAME from the contract ExperimentResult and never slice a bitstring. You own both the producer (data) and the consumer (terminal). Rekey the map so the bits are explicit and the map cannot be misread: for example nested `[m0][m1]`, or keys like `'m0=1,m1=0|X=on,Z=off'`. Update `evidence/story-ui/story-data/check.mjs`, `sabotage.mjs` and `branch_truth.py` in the same change. Delete the old key form; leave no dead code.
4. **The panel still says "REMOTE BELL HALF"** (the data says RECEIVER BELL HALF) and shows no fidelity gloss.
5. **Earlier workers claimed "exact" while the render disagreed.** The supervisor reads your renders and the code points.

## Vault and files to read first
- `vault/AGENTS.md`, `vault/Index.md`
- `vault/Reports/story-ui-terminals.md`, `vault/Reports/story-data-script-gate.md`, the data-fixes vault report
- `evidence/story-ui/data-fixes/branch-truth.md`
- `lanes/story-ui/rulings.md` (m1 label, bits first then corrections, EXACT receiver label, COMMIT unlock and latch)
- `echo/contracts.js` and `echo/CONTRACTS.md` on integration

## Where to start
1. `git merge lane/story-ui/integration` into your branch and resolve the conflicts. The DATA side wins on wording (data-fixes and the integration branch are reviewed truth). Keep terminals-c4's additions to `objectives.js` only where integration has nothing equivalent.
2. **Write the check first and watch it fail.** Extend `evidence/story-ui/harness/drive-terminals.mjs` so that for all 16 (m0, m1, x, z):
   - the lines on screen equal the map's lines for that case;
   - the drive's own closed form, computed independently, agrees with which switch(es) are wrong.
   Watch it go red on the current `dryExplanation`, then make it green.
3. Render `TERMINALS.teleport_terminal.fidelityGloss` under the fidelity row. The `lane/story-ui/shell-polish` worker (still running) is adding `FIDELITY_GLOSS` to `objectives.js`. Do NOT write a second gloss string.
   - If shell-polish has merged into integration before your final report, merge integration again and render it.
   - If it has not, report this item as PARTIAL. No fallback text.
4. Use port **8791** for every harness server. Do not use 8771 or 8781.

## What to deliver
- Branch `lane/story-ui/terminals-conform`, where `lane/story-ui/integration` is an ancestor. Make a checkpoint commit within 25 minutes, and a commit after each milestone.
- All of these green on your tip, with output saved under `evidence/story-ui/terminals/`:
  - `drive-terminals.mjs`
  - ui-shell `drive.mjs`
  - `drive-opening.mjs`
  - the declassified `drive.mjs`, if it is on integration by then
  - story-data `check.mjs`
  - `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs`. A red caused only by the absent platform `index.html`/`main.js` must be named as such.
- Renders in `lanes/story-ui/renders/terminals-conform/`:
  - all 4 both-wrong cases (00 with X+Z on is not one; use m0 = 1, m1 = 1 with both off, m0 = 0, m1 = 1 with Z on and X off, and so on);
  - one single-wrong case;
  - one correct case;
  - the relay EXACT receiver panel;
  - the console at 200% text at 1024×640 showing the gloss.
- A sabotage round on disposable copies (`git worktree add --detach`):
  - swap m0 and m1 in the lookup;
  - restore the per-switch logic;
  - drop one map entry;
  - break the closed form in the drive.
  Report the nulls.
- An update to `vault/Reports/story-ui-terminals.md`.

## How I will judge it
- I run `is-ancestor` and `merge-tree` myself.
- I re-run the drivers in a disposable worktree.
- I check each both-wrong render line by line against X^(x⊕m1) Z^(z⊕m0).
- I grep `terminal.js` for `no_corrections`, `.slice(`/`[0]` on any bitstring, and string literals that duplicate the data.

## Report
Write `lanes/story-ui/reports/NNNN-terminals-conform.md`. It opens with a TL;DR, then a **Vault check**, then: results with evidence paths, the sabotage table with nulls, what you did NOT verify, decisions inferred from the docs (with citations), and contract requests. Write a checkpoint report within 1 h.

**Write your report to `/Users/udsy/agent-org/lanes/story-ui/reports/0010-terminals-conform.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/story-ui/renders/terminals-conform/` (PNG; only images newer than its last consult are shown to it).
