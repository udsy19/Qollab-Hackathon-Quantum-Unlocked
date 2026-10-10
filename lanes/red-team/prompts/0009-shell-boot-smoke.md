# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `red-team`. Read `/Users/udsy/agent-org/lanes/red-team/context.md`
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
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/red-team/renders/<your agent name>/` (PNG, descriptive
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

- **Lane ownership.** You edit only this lane's files: red-team: no product files; reports in `vault/Reports/`. Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 9)

You are agent `shell-boot-smoke` in worktree `/Users/udsy/agent-org/lanes/red-team/wt/shell-boot-smoke` on branch `lane/red-team/shell-boot-smoke`.

**GOAL.** Find out, through the real product in a browser, how close ECHO is to a build a newcomer could play from title to credits. Show it with screenshots and console logs. Give each owning lane a precise list of what stops a player.

**VISION.** ECHO must be playable end to end by a blind tester on Qollab: title → three missions → ending (vision §1.4, §12.5, §17). Red-team's job is to measure this independently. The lanes' own playthrough claims are hypotheses, not evidence (gate-independence laws 4 and 6).

**WHAT WE ARE BUILDING.** A Qollab-native `echo/` (body-fragment `index.html`, `main.js` entry, `main.css`, Python via Pyodide), assembled from five lanes. This is a **measurement and report task**. You edit NO product file, and you never commit to another lane's branch.

**WHAT HAS NOT WORKED.**
- Each lane's suite was green while the whole was broken. Gameplay ran on `fakeQuantum.js`, and real engine output stalls the quest at CLONE_INTRO (red-team reports 0002 and 0005).
- "main.js exists" was mistaken for "playable". Platform's shell (`lane/platform/integration` 32838bc) is still a **placeholder room**: no player controller, no wired terminals.
- An earlier dispatch of this exact task never launched, so nothing has been measured yet.
- Do not write a third composer or a third server. Reuse platform's `tools/qollab-runner/server.mjs` and `tools/assemble-echo/` (both on `lane/platform/integration`), plus red-team's `evidence/red-team/cross-lane-recheck/compose.sh`.

**VAULT NOTES TO READ FIRST:**
- `vault/AGENTS.md`
- `vault/Reports/cross-lane-recheck.md`
- `vault/Reports/quest-state-audit.md`
- `vault/Reports/player-text-audit.md`
- `vault/Research/qollab-platform-and-submission.md` (the runtime facts: `<script>` in index.html does not run, JS cannot read project files, one `backend.run`)
- `echo/CONTRACTS.md` on main
- the gameplay branch's own `vault/Reports/*world*` / seam notes (read as claims only)

**WHERE TO START.**
1. Pin these SHAs and record them in `PROVENANCE.tsv`: platform `lane/platform/integration` (32838bc or newer), quantum `lane/quantum/integration` (c3adf0a+), story-ui `lane/story-ui/integration` (1908470+), gameplay `lane/gameplay/integration` (7c4741b+), art `lane/art/integration`, and for variant B, gameplay `origin/lane/gameplay/gameplay-world-v2-port`. That branch moves fast, so pin the SHA you fetched.
2. Export each lane through `git archive <sha> echo` into a temp dir. Never use `git worktree add` or checkout on their branches.
3. Build two trees with the existing composer or `compose.sh`:
   - **Variant A:** the shell as merged on the integration tips.
   - **Variant B:** the same, with gameplay replaced by world-v2-port. Make only the minimal composition needed, and record every manual step in PROVENANCE. Any glue you had to write is itself a finding: "not integrated".
4. Serve each tree with platform's runner on **your own port** (pick an unused one in 41000–41999, never a shared port). Drive headless Chrome (puppeteer is available) on the real user path: load, title, start, and then as far as a player could get using keyboard only (WASD/E/Esc/Tab). Do not call internal APIs to skip a step. A shortcut is allowed only as a separate, labelled "bridged" probe that measures where the next stall is.
5. Prove each screenshot came from the build it claims (law 16): put a unique token in a disposable copy of the served `index.html`, read it back from the served page, and abort on a mismatch.

**WHAT TO DELIVER** (branch `lane/red-team/shell-boot-smoke`, files under `evidence/red-team/shell-boot-smoke/`):
- `PROVENANCE.tsv`, a `reproduce.sh` that takes an optional `--repo <path>`, and the drive script.
- Screenshots (`renders/` or `evidence/.../shots/`) at each step reached in A and in B, plus the console log of each run (errors verbatim).
- A **reach table** for each variant. Rows: boot, title, opening, move, reach booth, E at booth, clone result panel, relay, receiver EXACT panel, rooftop, bits shown, X/Z choice, dry run, commit, ending, credits. For each row: reached / blocked (with cause, file:line and owning lane) / not present.
- A runtime count of `backend.run` calls per page load. Wrap `backend` in the runner page and do not modify product files. The limit is ≤1.
- An FPS sample (a simple rAF counter over 10 s) on the scene, labelled with this machine.
- An independent verdict on gameplay's "two full runs" playthrough claim: reproduced, not reproduced, or partial, with the step where it diverges.
- `vault/Reports/shell-boot-smoke.md` with the findings, routed per lane: platform, gameplay, story-ui, quantum, art. Do not regenerate the hubs, Map or Index; the loop does that.

**HOW I WILL JUDGE IT.**
- The screenshots must match the reach table, with provenance tokens shown.
- `reproduce.sh` must run from your worktree.
- Every "blocked" row names a file:line.
- Nothing is labelled Qollab or IonQ: everything is "local runner".
- If a step could not run, it is reported as REFUSED or SKIPPED with the reason, never as a pass.
- Negative claims are scoped to the pinned SHAs (law 17).
- Falsification: show that the reach detector marks a step "blocked" when you deliberately break it in a disposable copy (for example, delete the title button handler), and report the nulls.

**REPORT.** Write `lanes/red-team/reports/0008-shell-boot-smoke.md`. Open it with a **Vault check** (notes read, what was already known, what you reused, what is stale). Then: TL;DR, reach tables, findings per lane, evidence paths, what you did NOT do, decisions inferred from the docs (with citations), and next steps for the supervisor. **Write a checkpoint report within 1 hour** (PARTIAL is fine) with variant A's reach table, even if B is not done.

**Write your report to `/Users/udsy/agent-org/lanes/red-team/reports/0009-shell-boot-smoke.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/red-team/renders/shell-boot-smoke/` (PNG; only images newer than its last consult are shown to it).
