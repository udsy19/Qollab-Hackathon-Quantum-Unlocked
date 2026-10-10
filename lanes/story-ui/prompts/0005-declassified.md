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


# YOUR BRIEF (supervisor, consult 5)

You are agent `declassified` in worktree `/Users/udsy/agent-org/lanes/story-ui/wt/declassified` on branch `lane/story-ui/declassified`.

**First step:** run `git merge-base --is-ancestor main HEAD`. If it exits 1, run `git merge main` before anything else, because contracts v2 is on main (`echo/contracts.js`, `echo/CONTRACTS.md`). Commit the merge.

## GOAL
After the city lights return, the player opens **Declassified mode** (vision §4.5, §6). It has these parts:
- a journal of what they actually did (their own clone attempt, relay readings, dry-run bits and corrections, commit result, read from a run record);
- the Declassified tabs that explain the three ideas plainly;
- the **teach-back**: 3 multiple-choice questions, each choice with a "why", and no score;
- the **credits screen**.

All of it must be fully keyboard-operable, with visible focus, and it must respect reduced motion and text scaling. A first-time player with no physics background should leave able to answer the three questions.

## VISION
This serves the bar from vision §1.4/§17: "a blind tester … can answer the three teach-back questions". It is the payoff that makes the judges' "impact/education" rubric land. It is the `DECLASSIFIED → CREDITS/ENDING` edge in contracts v2.

## WHAT WE ARE BUILDING
- `echo/ui/declassified.js`: `mount(root, deps)` → `{ open(runRecord), close(), isOpen() }`.
- A delimited `/* ==== declassified ==== */` section appended to `echo/main.css`.
- All copy comes from `echo/data/teachback.js`, which already exists (journal, tabs, 3 questions, credits). Do not duplicate text in the UI module. If copy is missing, add it to the data file and to the story-data gate (`evidence/story-ui/story-data/check.mjs`). Note that `data-fixes` is concurrently editing `echo/data/`, so keep data edits minimal and say so in your report.
- Credits are owner-ruled: **Team The Quantubians (NYU Tandon School of Engineering): Udaya (captain), George, Harman, Epa**. Add the license line "udsy19 and contributors", MIT, and "This effort is supported by Qollab & IonQ". No emails anywhere.
- Kets are ASCII `|x>` in the data. Render them as `|x⟩` at display time. Never rewrite the data.
- Every number in the journal comes from the run record and is labelled with its engine (`local_exact` / `documented_preview` / backend). Never invent values. If a field is absent, show "not recorded", not a default.
- Define the run-record shape from `echo/contracts.js` v2 events and `ExperimentResult`. If v2 has no run-record type, keep it as a guarded JS shape in your module and list it as a **contract request for platform**. Do not edit `echo/contracts.js`.
- Esc: when Declassified is open, call `menu.setPauseAllowed(false)` (this is the ui-shell contract).
- Harness: `evidence/story-ui/harness/declassified.html`, served on **port 8771 only**. Reuse the ui-shell harness pattern (`shell.html` / `drive.mjs`) and do not fork it without a one-line reason.

## WHAT HAS NOT WORKED
- In ui-shell, the green driver (30/30) missed three defects a human saw in the renders: mid-sentence page breaks, ASCII kets, and the system font in a select. **Look at your own screenshots** before claiming done.
- In story-data, a phrase gate could not judge physics. A human read found a branch-dependent falsehood. Check every explanation line against all 4 bit pairs, and against the rules m0 = source readout, m1 = local Bell-half readout, X iff m1=1, Z iff m0=1.
- Building behind flags nobody turns on, and optimising for a test count instead of the product.

## VAULT / READ FIRST
- `vault/AGENTS.md`, `vault/Index.md`, `vault/Home.md`
- `vault/Reports/story-ui-ui-shell-harness.md`, `vault/Reports/story-data-script-gate.md`
- `vault/Research/qollab-platform-and-submission.md`
- `lanes/story-ui/rulings.md`
- ECHO_MASTER_VISION §4.5, §6 (Declassified + accessibility), §7 (physics), §9 (quest states)
- `echo/CONTRACTS.md`
- `evidence/story-ui/story-data/script.md` (Declassified/teach-back sections)

## DELIVER
1. **A gate written first and watched red:** a puppeteer driver with real keys. It covers:
   - open with a sample run record;
   - Tab through every tab and choice, answer all 3 questions, and see each "why";
   - reach credits, then close;
   - focus is always visible and trapped;
   - Esc does not open pause;
   - reduced motion means no animation;
   - text at 200% means no clipping at 1280×720 and 1024×640;
   - a run record with missing fields renders "not recorded".
2. **Screenshots** in `evidence/story-ui/declassified/` with a provenance badge: the sha256 of the files under test, which you recompute in the report. Include journal, each tab, a teach-back "why", credits, 200% and reduced motion. Copy the key images to `renders/declassified/`.
3. **A sabotage round on disposable copies**, reporting the nulls.
4. accesslint on the open view.
5. A vault report at `vault/Reports/story-ui-declassified.md`.

## HOW I WILL JUDGE
I will Read your PNGs myself. I check that:
- the kets show ⟩;
- there are no mid-sentence breaks;
- credits are exact;
- the engine label is on every number;
- every physics line is true for all branches.

A report without a Vault check is refused.

## REPORT
Write `lanes/story-ui/reports/NNNN-declassified.md`. It opens with a TL;DR and a Vault check, and ends with "Not done / not verified", "Contract requests for platform" and "Questions for the owner" (only spend, access, publishing or doc conflicts; decide design choices from the vision and cite it). Add a **checkpoint commit and report within 25 minutes**, then commit at least every 30 minutes.

**Write your report to `/Users/udsy/agent-org/lanes/story-ui/reports/0005-declassified.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/story-ui/renders/declassified/` (PNG; only images newer than its last consult are shown to it).
