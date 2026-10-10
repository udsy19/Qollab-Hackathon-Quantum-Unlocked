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


# YOUR BRIEF (supervisor, consult 6)

You are agent `opening` in worktree `/Users/udsy/agent-org/lanes/story-ui/wt/opening` on branch `lane/story-ui/opening`.

**First steps:**
1. Run `git merge-base --is-ancestor main HEAD`. If it exits 1, `git merge main` before anything else.
2. Make a checkpoint commit within 25 minutes, even if it holds only the red gate. Lane restarts have lost uncommitted work before.

**GOAL.** A first-time player, or a judge in a hurry, presses Start and sees the opening of ECHO:
- the title card "NACRE CITY // 02:17 AM";
- the billboard line "NOTHING EVER HAS TO END";
- the MIRROR / MICA / RIN exchange as 2-line captions, timed to Shots A–D;
- the HUD fading in at the end, with the objective "FIND AN AUTHORIZED REPLICATION BOOTH".

The player can skip at any moment with the keyboard (and with a visible, focusable Skip control). Either path ends in exactly one quest event: `FINISHED` or `SKIP`.

**VISION.**
- Vision §4.1 (Shots A–D, 0:00–1:05) and §3.4 flow (TITLE → OPENING → FREE_ROAM_ALLEY).
- §6 line 369 (2 lines max, immediate skip to the full caption) and line 371 (cinematics always skippable).
- §12 browser smoke test "Play/Skip cinematic".
- The opening states the central misconception (MICA: "Then copy it…") that Mission 1 then disproves.

**Decision, inferred from the docs** (§3.4 "skip opening after first view" plus QOLLAB "no persistence"): Qollab cannot remember a first view, so every run is a first view. The Skip control is therefore ALWAYS available, from the first frame. Record this in your report.

**WHAT WE ARE BUILDING:** `echo/ui/opening.js`, plus a delimited section `/* ==== opening ==== */` appended to `echo/main.css`.
- It uses the established pattern: `mountOpening(root, { onShot, onFinished, onSkip, settings })`. Find it by reading `echo/ui/dialogue.js`, `hud.js`, `menu.js` and `accessibility.js`, and reuse `el`, `focusableIn`, `applySettings` and the dialogue's caption rendering. Do NOT write a second caption renderer. Extend `mountDialogue` if it lacks what you need, such as a timed or auto-advance mode.
- Text comes ONLY from `echo/data/story.js`: `SCREEN_TEXT.openingCard`, `SCREEN_TEXT.billboard`, `STORY.OPENING` and the objective in `echo/data/objectives.js`. Never inline copy.
- The shot timeline comes from §4.1 (A 0–10 s, B 10–24, C 24–44, D 44–65). It fires `onShot('A'|'B'|'C'|'D', t)`, so gameplay/scene can drive the camera. You do not own the camera or the 3D scene. The harness backdrop may be a CSS gradient placeholder, labelled as a placeholder.
- The events come from `echo/contracts.js`: `QUEST_EVENTS.FINISHED` / `SKIP`, which carry the story-ui/dialogue source. Emit exactly one, exactly once, even if Skip is mashed or pressed after the timeline ends. The module must be idempotent: mounting twice or skipping twice must not double-fire.
- Reduced motion: no slow pans or animated reveals, and captions appear whole. Text scale 100–200% must not clip captions or the Skip control.
- Captions are always on. Caption style follows `settings.subtitles` (standard / high-contrast, per the ruling).
- Esc while the opening plays: decide between pause and skip from `menu.js`'s Esc ownership note (ui-shell report, contract request 3), and state your choice.

**WHAT HAS NOT WORKED (lane memory):**
- A green puppeteer driver missed three visual defects that only a human look at the renders caught: mid-sentence page breaks, ASCII kets and the system font in the select. Your screenshots will be READ.
- Story copy rewritten in data to fix display. Never edit `echo/data/` text: it is gated byte-for-byte against the vision. Display transforms live in the renderer.
- Workers lost uncommitted work in a lane restart. Commit early.

**Vault notes to read:** `vault/AGENTS.md`, `vault/Index.md`, `vault/Reports/story-ui-ui-shell-harness.md`, `vault/Reports/story-data-script-gate.md`, `vault/Research/qollab-platform-and-submission.md`, `lanes/story-ui/rulings.md`, `echo/CONTRACTS.md` (UI root and settings), and `ECHO_MASTER_VISION.md` §3.4, §4.1 and §6.

**Where to start:**
1. Copy the ui-shell harness pattern (`evidence/story-ui/harness/shell.html`, `drive.mjs`) into `evidence/story-ui/harness/opening.html` and `drive-opening.mjs`. Serve it on **port 8781 only**.
2. Write the driver FIRST and watch it go red on no module. It must check:
   - (a) the title card is visible;
   - (b) each §4.1 line appears, at most 2 lines per caption;
   - (c) `onShot` fires A→D in order;
   - (d) Skip by keyboard at t≈3 s emits SKIP exactly once and the overlay is gone;
   - (e) a full run emits FINISHED exactly once;
   - (f) mashing Skip after the end emits nothing more;
   - (g) the Skip control has a visible focus ring;
   - (h) reduced motion means no transition longer than 0 ms on the captions.
   A real-time 65 s run is fine, or inject a clock. If you inject one, also do one real-time run.

**Deliver:**
- Commits on your branch.
- `evidence/story-ui/opening/`, with a README (the provenance badge = sha256 of the module + CSS, as in ui-shell) and screenshots:
  - the title card;
  - each shot with its caption;
  - the HUD fade-in with the objective;
  - Skip focused;
  - 200% text at 1280×720 and 1024×640;
  - reduced motion.
- The sabotage round on disposable copies: remove the skip guard, the reduced-motion rule and the focus ring, and break the shot order. Report the nulls.
- Copy the 6 key images to `renders/opening/`.
- A vault report `vault/Reports/story-ui-opening.md`.
- Run `node tools/qollab-caps/check.mjs` and report the `echo/` file count.

**How I will judge:**
- I will Read every screenshot: the font, the wrapping, the contrast, and whether ⟩ is needed (no kets are expected here).
- I will check the event-once property in the driver output and in the sabotage table.
- No inline copy, no second caption renderer, no edits outside `echo/ui/`, the `main.css` section, `evidence/` and `renders/`.

**Report:** `lanes/story-ui/reports/NNNN-opening.md`.
- It opens with TL;DR, then a **Vault check** (notes read, what was known, what you reused, what is stale), then results with exit codes and artifact paths, then Not done, Contract requests (the gameplay camera hooks), and Next.
- Write a checkpoint report within 1 h.

**Write your report to `/Users/udsy/agent-org/lanes/story-ui/reports/0006-opening.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/story-ui/renders/opening/` (PNG; only images newer than its last consult are shown to it).
