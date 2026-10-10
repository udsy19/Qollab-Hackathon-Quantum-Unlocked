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


# YOUR BRIEF (supervisor, consult 5)

You are agent `quantum-hardening` in worktree `/Users/udsy/agent-org/lanes/quantum/wt/quantum-hardening` on branch `lane/quantum/quantum-hardening`.

**GOAL.** The player must be able to trust everything the quantum terminals show:
- the receiver's Bloch arrow;
- the facts text;
- that the rooftop dry run catches every wrong X/Z choice;
- that the story token is consumed exactly once.

Every number the engine returns must be computed by local Qiskit and cover the cases a player actually reaches.

**VISION.** ECHO teaches no-cloning, no-signalling and teleportation through play (`ECHO_MASTER_VISION.md` §7 is normative; see also §10.3–10.7, §7.4 and §7.5). The repo-root `CLAUDE.md` sets two rules:
- "The story token is consumed ONCE at final commit."
- m0 is the source readout and m1 is Alice's Bell-half readout. The receiver applies X iff m1=1 and Z iff m0=1.

**WHAT WE ARE BUILDING.** You edit `echo/quantum/*.py` and `echo/tests/` on the lane integration branch, which now carries contract-conformance: 453 tests pass, and results conform to platform's `echo/contracts.js`. The JS bridge `echo/quantum/bridge.js` is being built in parallel by worker `pyodide-bridge`.
- Do NOT edit `bridge.js`.
- List every public API name or signature you change in your report, so the bridge can be re-wired.

**Owner rulings to implement.** They are binding; see `/Users/udsy/agent-org/lanes/quantum/rulings.md`.
1. **Random generic dry-run states.**
   - A dry run uses a fresh random generic Bloch point, so every wrong X/Z visibly lowers the fidelity.
   - A "generic" state must have every |r_P| bounded away from 1. Pick a margin and justify it with the closed form F = r_P² from `vault/Reports/quantum-physics-review.md`.
   - The calibration state must stay identical between the bits call and the corrections call. Pass it explicitly as angles or as a spec the engine validates; never hold it as hidden module state.
   - Keep the fact "this mistake does not show on this state" available as optional.
2. **The story token.** Add a fixed generic Bloch point `token` to the catalogue. It is never shown to the player: no angles or Bloch vector before the commit appear in any result field.
3. **The generic state** is `ry(1.137)` then `rz(0.44)`, in circuit order (§10.5).
4. **Bits first, corrections second.** One call returns m0 and m1. A separate call takes the player's X/Z choice for those bits and that state. `bell_measurement` + `teleport_branch` may already be most of this, so check before you add anything.
5. The m1 label is exactly **"LOCAL BELL-HALF READOUT m1"** wherever m1 is labelled in facts.
6. The selected-backend experiment value is **`backend_verification`**. Rename `bell_verification` everywhere, including the pending-gap filter in `test_contract_conformance.py`. That filter must keep tolerating only that one value, because platform hasn't added it yet.
7. **Mission 2 (relay):** the receiver panel shows EXACT `partial_trace` probabilities only, labelled EXACT. The relay result carries no sampled counts for the receiver.
8. **COMMIT** (overseer ruling, autonomous mode):
   - `live_commit` is one atomic local exact call: fresh Bell bits, the corrected receiver, and the fidelity.
   - The token is marked consumed only on success. A second call in the same interpreter run is refused with an honest error.
   - Expose `reset_story_token()` for gameplay's RESTART. The interpreter is fresh on every Qollab Run (owner-answers 2026-10-10).
   - If the computation raises, the token is NOT marked consumed.

**Physics-review findings to close.** They are in `vault/Reports/quantum-physics-review.md` §4, and finding 2 is covered by ruling 8 above. Each fix is test-first: write the test, and show it red against the matching mutation in `evidence/physics-review/sabotage.py` (ids are in its table) before the fix makes it green.
- **F1:** `receiverBlochVector` must be tested against an independent derivation. Use the mutations `bob-bloch-uncorrected` and `bloch-y-sign`.
- **F3:** the false causation in the basis-state source fact.
- **F4:** the live fidelity text must say it is computed exactly, not measured.
- **F5:** `sampler-hardcoded-uniform` must go red. Use a statistical test with a stated false-alarm rate and a fixed seed.
- **F6:** widen `clone-by-name-variant` so a name list can't pass.
- **F7** (`interpret_counts` builds its dict by hand): make it go through `formats.py`.

**WHAT HAS NOT WORKED / pitfalls**
- Named states (|0>, |1>, |+>, |->, phase) let a wrong correction score 1.000000. That is why ruling 1 exists.
- A cloning verdict derived from the state's name is forbidden. It must come from the computed joint state.
- Some sabotage nulls are true physics: (X⊗I)Φ+ = (I⊗X)Φ+, the I/2 marginals, and swap-symmetric a|00>+b|11>. Don't chase them; cite §2 of the review.
- Do not weaken or delete any test to get green. If a test is wrong, show why and replace it.
- Pyodide API set: Statevector, DensityMatrix, partial_trace and state_fidelity only. No aer, no scipy. Cast numpy scalars to `str`/`float` before returning.

**VAULT NOTES TO READ FIRST**
- `vault/AGENTS.md` and `vault/Index.md`
- `vault/Reports/quantum-physics-review.md`
- `vault/Reports/contract-conformance.md`
- `vault/Reports/quantum-engine-g1.md`
- `vault/Research/qollab-backend-from-js-projects.md`
- the lane's `context.md`, `rulings.md` and `owner-answers.md`
- Before adding any symbol, run `node scripts/where.mjs <name> --branches`.

**WHERE TO START.** Read `echo/quantum/teleportation.py`: `bell_measurement`, `teleport_branch`, `live_commit` and the catalogue. Then read `evidence/physics-review/sabotage.py`.

**DELIVER (commits on your branch)**
- The code and tests.
- `evidence/quantum/hardening/`, containing:
  - the red-before output for each fix;
  - pytest output, full suite, exit 0;
  - the platform validator re-run (`evidence/quantum/contract-conformance/validate.mjs` against `lane/platform/integration`'s `contracts.js`). Expect only `backend_verification` rejections;
  - a sabotage round re-running every physics-review mutation plus new ones for each ruling, e.g. token leaking its angles, a second commit allowed, consumed-on-error, and a non-generic calibration draw. Report every null;
  - a transcript of one complete player path: relay EXACT panel → dry run (bits → wrong X/Z → fail → fresh state → right X/Z → pass, non-00 bits) → commit → second commit refused → `reset_story_token` → commit again.
- A vault report, `vault/Reports/quantum-hardening.md`.

**HOW I WILL JUDGE**
- I will re-run your tests and the sabotage on a disposable detached worktree.
- I will read the transcript for ruling conformance.
- I will check that no `token` angles leak in any field.
- I will check the API change list against `bridge.js`.

**REPORT.** Write `/Users/udsy/agent-org/lanes/quantum/reports/<n>-quantum-hardening.md`.
- Open with **Vault check**, then a TL;DR.
- Then sections for: the evidence paths, the nulls, the API changes for the bridge, Not verified, Questions for the owner (spend, access or doc conflict only), and What the supervisor should do next.
- Checkpoint report within 1 h. Final within 2 h, and in any case before Sat 03:30 ET (G1 is at 04:00 ET).

**Write your report to `/Users/udsy/agent-org/lanes/quantum/reports/0005-quantum-hardening.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/quantum/renders/quantum-hardening/` (PNG; only images newer than its last consult are shown to it).
