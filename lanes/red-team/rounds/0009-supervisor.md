=== PLAN ===
**Lane:** red-team. We write reports only and never edit product files (plan row 7).

**Goal:** three independent checks of ECHO, each reported with evidence to the lane that owns the fix.
1. A physics audit of Prompt 6 and vision §7 against the real code.
2. Blind playtests in the local runner.
3. A rubric score for each of the four traits, reported separately and never added into a weighted total.

**Approach:**
- Ground truth comes from our independent oracle (law 4), and we treat the spec as a hypothesis (law 5).
- Sabotage runs only on disposable exports (law 10).
- Every audit is pinned to named commits.
- Results are labelled "local runner".

**Done (merged):**
- physics-oracle-audit (0001)
- rubric-research (0001)
- physics-code-audit (0002)
- quest-state-audit (0003, Q1–Q11)
- player-text-audit (0006, T1–T15)
- cross-lane-recheck (0005, gate RED with 5/13 checks failing, plus the CLONE_INTRO stall on real output, plus the fix lists per lane)

**Branch tips at consult 9 (04:36 UTC):**

| branch | tip |
|---|---|
| platform | 32838bc (MOMENT_EVENTS; still a placeholder room, no controller) |
| quantum | c3adf0a |
| story-ui | 1908470 (adds the opening) |
| gameplay integration | 7c4741b |
| gameplay-world-v2-port | origin afcaf17, local 8a4f7d4, still active: world on QUEST_STATE_CHANGED, two-phase dev terminal, real-Qiskit dev engine, gameplay's own "two full runs" playthrough |
| art | 9f5b7fc |

**Running:**
- quest-state-regrade (consult 7). Its checkpoint at 4cf627b covers the async adapter and 13 new checks.

**Dispatching now:**
- shell-boot-smoke. My consult-8 dispatch never launched: there is no branch and no worktree. It runs in two variants:
  - (A) the shell as merged;
  - (B) a preview with gameplay-world-v2-port at a pinned SHA.

  It is not a blind playtest. It measures how far the build is from one, and it independently checks gameplay's "two full runs" claim.

**Next:**
- A blind playtest once the controller and terminals are in the merged shell.
- story-ui-text-recheck on 1908470 or later, once T1–T9 are pushed. The opening has landed, so check for new strings.
- A cross-lane re-run when the fixes are pushed. Acceptance is `cross_lane_check` exit 0 plus `quest_walk real` reaching CREDITS.
- A rubric score after the first playtest.
- A README and page-copy audit.
- Playtests again before the Sun 14:00 freeze.

**Risks:**
- G2 (Sat 17:00): the controller is still unmerged.
- No teach-back data yet for the Impact trait.
- Lanes could self-certify with their own checkers.
- Only 2 workers can run at once.
=== END PLAN ===

=== AGENT name=shell-boot-smoke model=opus base=lane/red-team/integration ===
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
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 9: The shell-boot-smoke AGENT block from consult 8 never launched: there was no branch, no worktree and no report at consult 9. At consult start, check that every agent dispatched last consult shows up as running, or has a branch or worktree under `wt/`. If one is missing, re-dispatch it; never assume it is in flight.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 9: Gameplay's `gameplay-world-v2-port` (afcaf17/8a4f7d4) claims a real-Qiskit dev engine that replaces the JS fake, plus "two full runs" of the playthrough. This is the first lane claim of end-to-end play. Treat it as a hypothesis until shell-boot-smoke variant B reproduces it in the runner (law 6). If B reaches CREDITS, the blind-playtest trigger is the merge of v2-port into gameplay integration and then into platform's shell.
=== END LEARN ===
