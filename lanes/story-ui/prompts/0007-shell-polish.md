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


# YOUR BRIEF (supervisor, consult 7)

You are agent `shell-polish` in worktree `/Users/udsy/agent-org/lanes/story-ui/wt/shell-polish` on branch `lane/story-ui/shell-polish`.

**GOAL:** a first-time player using only the keyboard, at 100% or 200% text, never sees a sentence cut mid-page, never sees ASCII kets, never meets a control in the wrong font, and can never turn the story text off. Every caption and teach-back line they read is physically true and plain-spoken.

**VISION:** ECHO_MASTER_VISION §6 (UI, captions of 2 lines at most, accessibility), §2.4 (what never to claim), §12.5. CLAUDE.md lists subtitles, contrast, reduced motion and visible focus as non-negotiable. Owner ruling: captions are always on, and the setting is a style only.

**WHAT WE ARE BUILDING:** the story-ui shell in `echo/ui/{accessibility,dialogue,menu,hud}.js`, the shell sections of `echo/main.css`, and the copy in `echo/data/`. It all mounts into the platform's `#echo-ui` root. Qollab loads only `main.css`. There is no storage, and harnesses stay outside `echo/`.

**WHAT HAS NOT WORKED:**
- ui-shell's driver passed 30 of 30, yet the supervisor's own look found three defects: pages break mid-sentence, kets render as ASCII `|x>`, and the settings select uses the system font. A green driver checks what its author thought of, not what a reader sees.
- "Subtitles off" (`main.css` ~line 298, `[data-subtitles="off"] .echo-dialogue {display:none}`) hides the whole story, because there is no voice-over. Red-team flagged this as HIGH (T2).
- `echo/data/teachback.js` ~line 46 quotes the §2.4 banned sentence "Entanglement sends the secret instantly." as a misconception (MED).
- The 200% check ran only at 1280×720, and the HUD `nowrap` sabotage was a null there.
- The phrase gate cannot judge physics. A human read is still required.

**DO FIRST:**
1. Check whether the opening is in your base: `git merge-base --is-ancestor lane/story-ui/opening HEAD`. If it exits 1, run `git merge lane/story-ui/opening`. The opening added `captionStyle` to `accessibility.js` and an auto mode to `dialogue.js`. Build on both, and do not fork them.
2. Do the same check for `main`.

**SCOPE (one task: shell polish):**
1. **Pagination:** dialogue pages break at sentence boundaries, and a page is 2 lines at most at every text scale. Fall back to a word boundary only when one sentence is longer than 2 lines.
2. **Kets:** `|x>` becomes `|x⟩` at display time in the dialogue, the HUD and any shell text. The data stays ASCII, because the story-data gate compares it byte for byte with the vision. Put the transform in ONE exported helper that the terminals and Declassified can import. First run `node scripts/where.mjs ket --branches` and `git grep -n "⟩"` across `lane/story-ui/*`; if terminals-c4 or declassified already wrote one, reuse it and say so.
3. **Select font:** form controls inherit the UI font.
4. **Captions are always on:**
   - remove the Subtitles on/off control and the `data-subtitles="off"` rule;
   - the menu exposes `captionStyle` exactly as `echo/contracts.js` defines it;
   - delete the now-dead `subtitles` path from `accessibility.js` and `menu.js`, then grep that zero references remain (no-bloat).
5. **Teach-back line 46:** rephrase the misconception so the banned sentence is never voiced, even as a quote, and keep the refutation on the very next line. Do not touch the credits block, because declassified owns that edit.
6. **"Fidelity" in plain words:** where the data shows fidelity to the player, add a one-line plain gloss, e.g. "how closely the received state matches the original, where 1 means identical". It must stay true for every value shown. Check it against the closed form X^(x⊕m1) Z^(z⊕m0)·ψ: on ry(1.137), a wrong Z correction gives 0.177.
7. **200% at more viewports:** run the existing `drive.mjs` at 1024×640 and 1366×768 at 200% text. Close the HUD `nowrap` null with a check that goes red when wrapping is allowed.

**Vault notes to read:**
- `vault/Reports/story-ui-ui-shell-harness.md`
- `vault/Reports/story-ui-opening.md`
- `vault/Reports/story-data-script-gate.md`
- `vault/Research/qollab-platform-and-submission.md`
- `vault/Index.md` (promoted lessons)
- `lanes/story-ui/rulings.md`
- the red-team relay "player-text-audit" in `lanes/story-ui/owner-answers.md` (newest entry)

**Where to start:**
- `evidence/story-ui/harness/drive.mjs` (extend it, do not write a new driver);
- `echo/ui/dialogue.js`;
- `echo/ui/menu.js`;
- `echo/main.css`;
- `evidence/story-ui/story-data/check.mjs`, which must stay green.

Serve on port **8801**, and only on that port.

**Deliver:**
- **Checks written first and watched red:** a mid-sentence break, a `|x>` on screen, a system-font select, a "Subtitles off" control, and the banned sentence present in the data.
- **The fixes**, with both gates green: `node evidence/story-ui/harness/drive.mjs 8801 …` and `node evidence/story-ui/story-data/check.mjs`.
- **A sabotage round on disposable copies**, reporting its nulls.
- **Renders** in `evidence/story-ui/shell-polish/` and `renders/shell-polish/`, at minimum:
  - a long line at 200% at 1024×640, split at a sentence boundary;
  - a ket line showing ⟩;
  - the settings menu with the caption-style select, in the UI font, with visible focus;
  - the HUD at 1366×768 at 200%.

  Each render carries a provenance badge from your file hash.
- **Contract-check results:** `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs`. Report their exit codes; red caused by another lane's missing files counts as "not mine" only with the output to show it.
- **A vault report** at `vault/Reports/story-ui-shell-polish.md`.

**How I will judge it:**
- I will open your renders myself, and the screenshot wins over the driver.
- I will re-run both gates in a disposable worktree.
- I will grep for `subtitles` and the banned sentence.
- I will check every fidelity gloss against all 16 (bits × plan) cases.

**Report:** `lanes/story-ui/reports/NNNN-shell-polish.md`.
- Open with the TL;DR and the **Vault check** (notes read, already known, reused, stale).
- Then: results with commands, exit codes and paths; nulls; not done; decisions inferred from the docs, with citations.
- Commit a **checkpoint within 25 minutes** and a checkpoint report within 1 hour. Commit as you go: a lane restart loses uncommitted work.

**Write your report to `/Users/udsy/agent-org/lanes/story-ui/reports/0007-shell-polish.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/story-ui/renders/shell-polish/` (PNG; only images newer than its last consult are shown to it).
