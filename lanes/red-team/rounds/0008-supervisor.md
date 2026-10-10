The cross-lane-recheck result holds up, so I'm merging it into the lane branch. No branch has a game you can actually play yet, so I'm starting the boot smoke test in the free worker slot.

=== PLAN ===
**Lane:** red-team. We write reports only and never edit product files (plan row 7).

**Goal:** three independent checks of ECHO, each reported with evidence to the lane that owns the fix.
1. A physics audit of Prompt 6 and vision §7 against the real code and tests.
2. Blind playtests in the local runner.
3. A rubric score for each of the four traits, reported separately and never added into a weighted total.

**Approach:**
- Ground truth comes from our independent oracle (law 4), and we treat the spec as a hypothesis (law 5).
- Sabotage runs only on disposable exports (law 10).
- Every audit is pinned to named commits (SHAs).
- Results are labelled "local runner". Nothing counts as a Qollab result unless `owner-answers.md` records it.

**Done:**
- physics-oracle-audit (0001): merged consult 2.
- rubric-research (0001): merged consult 3.
- physics-code-audit (0002): merged consult 4.
- quest-state-audit (0003): merged consult 6, findings Q1–Q11.
- player-text-audit (0006): merged consult 7, findings T1–T15 for story-ui.
- **cross-lane-recheck (0005): merged consult 8.** I re-checked it in its own worktree:
  - `compose.sh` exits 0 and writes `PROVENANCE.tsv`.
  - `quest_walk.mjs real` on the real d9b42d0 quantum output reproduces the stall at **CLONE_INTRO**.
  - `sabotage_probes.sh` correctly refuses (exit 2) when the dump files are missing.
  - The worktree had no drift afterwards.
- **What 0005 found (the gate is RED, 5 of 13 checks fail):**
  - **quantum:**
    - Rename the job to `backend_verification`. Today the one backend job runs and then its result is rejected, which would waste the single IonQ job on Qollab.
    - Report `theta/phi`.
    - Add an entry point for the fixed, hidden story token.
    - Add random generic dry-run states.
    - Copy over the locality and fact-band tests.
  - **platform:**
    - Add `validateCommitResult`. Today a commit with fidelity 0.9 or with m0/m1 swapped passes as "valid".
    - Name the cloning verdict field and fix the teleport naming in `fixtures.json`.
    - Fix the 2 false positives and the gaps in `qollab-caps`.
  - **gameplay:**
    - Switch to the contract's field names.
    - Make the FIDELITY_OK null go red: today the tests stay green at 0.9 and with the check removed.
    - Run the tests on real engine output instead of the fake.
  - **Overseer, not yet ruled:** there are still two `backend.run` sites (a JS one in `main.js` and a Python one in `qollab_job.py`). Exactly one must remain.

**Branch state (consult 8, about 04:30 UTC):**

| branch | tip | what it holds |
|---|---|---|
| main | 99dfc54 | |
| gameplay | 7c4741b | no controller; `gameplay-world-controller` and `gameplay-world-v2-port` are not merged |
| platform | f08dd0b | shell `main.js`, plus `tools/qollab-runner` and `tools/assemble-echo` |
| quantum | c6558fb | |
| story-ui | 320613e | |
| art | 9f5b7fc | |

**Running:**
- quest-state-regrade (consult 7): at its checkpoint it reproduced the real-output stall independently and is now writing the async adapter.
- shell-boot-smoke (consult 8, new): boots the assembled shell in platform's runner. It also builds variant B with the unmerged world-controller branch so we can preview whether anyone could play it.

**Next:**
- A blind playtest once the controller and terminals are wired into the shell. The shell-boot-smoke findings will tell us how far off that is.
- `story-ui-text-recheck` after story-ui pushes its T1–T9 fixes.
- A cross-lane re-run when quantum, platform or gameplay push the fixes listed above. The acceptance check is `cross_lane_check` exit 0 plus `quest_walk real` reaching CREDITS.
- A rubric score after the first playtest.
- A README and page-copy text audit.
- Repeat the playtests after G3 and before the Sun 14:00 freeze.

**Risks:**
- G2 (Sat 17:00) is at risk, because no branch has a controller yet.
- The Impact trait needs measured teach-back answers, and we have none yet.
- A lane could certify itself with its own checker.
- We can run only 2 workers at once.
=== END PLAN ===

=== MERGE branch=lane/red-team/cross-lane-recheck ===

=== AGENT name=shell-boot-smoke model=opus base=lane/red-team/integration ===
**GOAL.** Find out how far a newcomer gets today in the assembled ECHO build, using the local runner and a real browser. Show it with screenshots and say exactly where it breaks. This is a PARTIAL precursor to a playtest, not a blind playtest, and you must label it that way.

**VISION.** The bar for ECHO is that a blind tester finishes title → three missions → ending without help (vision §1.4, §17). The red-team must tell every lane, as early as possible, what stands between the current build and that bar. We tell them through the real product path, never through unit tests.

**WHAT WE ARE BUILDING.**
- ECHO is a Qollab-native Three.js game whose root is `echo/`: `index.html` is a body fragment, `main.js` is the entry and `main.css` loads automatically.
- Python and Qiskit run in Pyodide.
- Platform's shell `main.js` (lane/platform/integration f08dd0b) imports gameplay `game/state.js` and `game/eventBus.js`, story-ui `ui/*` and the quantum Python modules.
- Platform also ships `tools/qollab-runner/` (a local Qollab-like host) and `tools/assemble-echo/`.

**WHAT HAS NOT WORKED / KNOWN.**
- Each lane's suite is green while the whole build is broken. Gameplay's tests ran on `fakeQuantum.js`.
- Real engine output stalls the quest at CLONE_INTRO because of field-name mismatches (`vault/Reports/cross-lane-recheck.md`).
- No integration branch has a player controller yet. The controller exists only on the unmerged `lane/gameplay/gameplay-world-controller` and `lane/gameplay/gameplay-world-v2-port`.
- G0 on Qollab: the scene and the bridge pass, but the backend-verify button did not respond.
- Do not judge the wrong artifact. Prove which build you served (law 16).

**VAULT NOTES TO READ FIRST:**
- `vault/AGENTS.md`
- `vault/Index.md`
- `vault/Reports/cross-lane-recheck.md`
- `vault/Reports/quest-state-audit.md`
- `vault/Reports/player-text-audit.md` (T3: there is no terminal or credits UI yet)
- `vault/Research/qollab-platform-and-submission.md` (runtime facts)
- `ECHO_MASTER_VISION.md` §9 (quest), §12.5 and §17
- `lanes/red-team/rulings.md`
- Platform's `tools/qollab-runner/README.md` and `tools/assemble-echo/` on lane/platform/integration. Read them in a `git archive` export.

**WHERE TO START.**
1. Never check out another lane's branch. Use `git archive <sha> echo tools | tar -x -C <tmp>` for each lane, into disposable directories.
   - **Variant A:** platform f08dd0b, plus gameplay 7c4741b, story-ui 320613e and quantum c6558fb. Use platform's `assemble-echo` if it composes lanes. Otherwise reuse `evidence/red-team/cross-lane-recheck/compose.sh` with pins overridden (`QUANTUM_SHA=… GAMEPLAY_SHA=… PLATFORM_SHA=…`). Do not write a new composer.
   - **Variant B:** variant A plus the newest tip of `lane/gameplay/gameplay-world-controller` (or `world-v2-port`, whichever is newer). Record which one you used. This previews whether a controller and terminals would be playable once merged.
2. Serve each variant with platform's `tools/qollab-runner/server.mjs` on your OWN port, chosen from 4870–4899 and not already in use.
   - Before you capture anything, prove which build you are serving. Put a unique token into a disposable copy of `echo/index.html`, reload unconditionally, and read the token back from the page.
3. Drive the build headlessly with Chrome or puppeteer, as a newcomer would: wait for boot, then the title, Start, movement keys (WASD and arrows), E near each interactable, and the Esc menu, settings and captions.
   - At each step, save a screenshot, the console errors and the quest state if the page exposes it.
   - Note the first point where a newcomer could not continue, and why. Is the cause a missing module, a Pyodide load failure, the field-name stall, or no controller?
4. Run `node tools/qollab-caps/check.mjs` on each assembled `echo/` and record the file count, the largest file and any forbidden API. This is evidence, not a verdict; we already know caps has 2 false positives.

**DELIVER.**
- Screenshots: `renders/shell-boot-smoke/{A,B}/NN-step.png`.
- Logs: `evidence/red-team/shell-boot-smoke/` holding a README, the compose provenance TSV for each variant, the build-token proof, the console logs and a `run.sh` that reproduces everything. `run.sh` must take an optional `--repo <path>` so it works from an export.
- A step table for each variant: step · expected (cite vision) · observed · screenshot · blocker and owning lane.
- `vault/Reports/shell-boot-smoke.md`. Do NOT regenerate hubs, Map or Index.
- Commits go on your branch only.

**HOW I WILL JUDGE IT.**
- Screenshots beat claims. Every step in the table needs a screenshot path and the build-token proof for its variant.
- A step that never rendered is reported as NOT REACHED, not as a failure of some later step.
- Report the nulls: anything you expected to break that did not.
- Every finding names its owning lane (platform, gameplay, story-ui, quantum or art) and the file and line where you know it.
- No claims about Qollab, IonQ or a publish. All results are "local runner".
- Make no product edits. Only disposable copies may be modified, and only for the build token.

**REPORT.** Write a checkpoint report within 1 h, and the final report within 2 h. The report opens with a Vault check, then: TL;DR, step tables, findings by lane, what you did not verify, decisions inferred from the docs (cite them), and next steps for the supervisor.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 8: I merged cross-lane-recheck (0005) after re-checking it in its own worktree. `compose.sh` exits 0 and writes PROVENANCE.tsv, and `quest_walk.mjs <echo> real out/quantum_results_d9b42d0.json` reproduces the CLONE_INTRO stall. `sabotage_probes.sh` takes `<echo> <outdir>` and refuses with exit 2 until the dumps have been generated, which is correct behaviour and not a defect. One verifier gotcha: piping the walk into `tail` hides its exit code, so read the STALL line or `PIPESTATUS`. The branch also brings main's contracts v2 (6cc19a6) into our integration branch, which the overseer asked for.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 8: Platform already ships a local Qollab-like runner (`tools/qollab-runner/server.mjs`) and a composer (`tools/assemble-echo/`) on lane/platform/integration. Red-team playtest and smoke briefs must reuse those, plus our own `compose.sh`, and must never write a third composer or server (no-bloat). The controller still lives only on the unmerged gameplay-world-controller and gameplay-world-v2-port branches. The smoke test therefore runs two variants: the shell as merged, and the shell plus the controller branch as a preview.
=== END LEARN ===
