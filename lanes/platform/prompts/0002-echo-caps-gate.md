# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `platform`. Read `/Users/udsy/agent-org/lanes/platform/context.md`
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
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/platform/renders/<your agent name>/` (PNG, descriptive
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

- **Lane ownership.** You edit only this lane's files: platform: `echo/main.js`, `echo/index.html`, shared contracts, `echo/README.md`, `tools/` (local runner), release files. Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 2)

You are agent `echo-caps-gate` in worktree `/Users/udsy/agent-org/lanes/platform/wt/echo-caps-gate` on branch `lane/platform/echo-caps-gate`.

**GOAL:** Before anything is uploaded, the owner (and every lane after every merge) can run one command that says whether `echo/` would break on Qollab's static rules. It must be loud and specific about which file and line breaks which rule.

**VISION:** ECHO must run on Qollab as uploaded (`.claude/rules/qollab-runtime.md`, `QOLLAB_DEPLOYMENT.md`). The owner judges the Qollab run. A broken upload costs an owner session we cannot spare before the Sun 19:00 ET deadline.

**WHAT WE ARE BUILDING:** `tools/qollab-caps/check.mjs`, a Node script outside `echo/` that is never shipped. It reads `echo/` from disk (or from `--root <dir>`) and checks, with exit codes 0 green · 1 red · 2 refused:
1. At most 100 files under `echo/`, counted recursively, hidden files included.
2. Each file at most 2 MB, in bytes.
3. `echo/index.html` is a body fragment: no `<html>`, `<head>` or `<body>`, and no `<script>` (scripts there do not run on Qollab).
4. `echo/main.js` exists.
5. No storage: `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`.
6. No non-GET network: `method: 'POST'|'PUT'|'DELETE'|'PATCH'` in fetch, `XMLHttpRequest` open with those, `navigator.sendBeacon`. Also no `WebSocket`, `EventSource`, `new Worker`, `SharedWorker` or `serviceWorker`.
7. Every bare JS import specifier is one of `three`, `three/addons/...` or `postprocessing`, a relative path, a full https URL, or a Python module that exists as `echo/<dotted path>.py`.
8. At most one `backend.run` call site across `echo/**/*.js`. Python files may not call `backend.run` themselves unless the owner rules otherwise; list any you find.
9. No hardcoded backend names or keys (`IonQ`, `api_key`, `token=`) in code; doc files are excluded.

Each failure prints `file:line rule-id message`.

**WHAT HAS NOT WORKED / pitfalls:**
- A gate that cannot fail. Write the check first and run it against fixtures that break each rule (under `tools/qollab-caps/fixtures/`). Watch every rule go red, then run it on the real `echo/`.
- Regex false positives in comments and strings: report them honestly and do not silently skip. A rule you cannot implement soundly is reported as a named limitation, not a pass.
- Zero files scanned is exit 2, never green.
- Do not edit anything inside `echo/`. If the real `echo/` fails, report it and do not fix it.

**Vault notes to read first:**
- `vault/AGENTS.md`;
- `vault/Index.md`;
- `vault/Research/qollab-platform-and-submission.md` (measured runtime facts: importmap, the `<script>` rule, the one-job guard);
- `.claude/rules/gate-independence.md` and `vault/Design/gate-independence-cases.md`;
- `QOLLAB_DEPLOYMENT.md`.

Run `node scripts/where.mjs caps --branches` and `git grep -n "100 files"` before writing anything: a caps check may already exist in `scripts/gates/`.

**Deliver:**
- the script;
- fixtures (one per rule, plus one clean);
- a sabotage round on a disposable copy: disable each rule in turn and show the fixture stays green; report the nulls;
- its output on the current `echo/` (the merged contracts; G0 files once they land);
- `vault/Reports/qollab-caps-gate.md`, linked via `node scripts/vault-hubs.mjs`.

Commit to `lane/platform/echo-caps-gate`.

**How I will judge it:**
- the red-fixture logs with exit codes;
- the sabotage table with its nulls;
- the real-tree run.

Claims without logs are refused.

**Report:** `/Users/udsy/agent-org/lanes/platform/reports/0002-echo-caps-gate.md`. It opens with a Vault check, then TL;DR, commands + exit codes + log paths, nulls, and Questions for the owner. Write a checkpoint within 1 h.

**Write your report to `/Users/udsy/agent-org/lanes/platform/reports/0002-echo-caps-gate.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/platform/renders/echo-caps-gate/` (PNG; only images newer than its last consult are shown to it).
