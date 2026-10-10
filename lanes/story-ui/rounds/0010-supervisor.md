=== PLAN ===
**Lane story-ui plan, consult 10 (Sat 2026-10-10 ~01:00 ET / 04:56 UTC, T+6h)**

**Goal (unchanged):** vision §4 and §6. That covers:
- a skippable opening and captions of at most 2 lines;
- the HUD;
- the three terminals (copy_booth, relay_core, teleport_terminal), wired to the §8.4 adapter, with honest error states;
- progressive hints;
- Declassified mode, with the teach-back and the credits;
- pause and settings menus;
- keyboard navigation, visible focus, reduced motion and text scaling.

These are plan rows 5 (G2, Sat 17:00 ET) and 6 (G3, Sun 05:00 ET).

**State, checked from git this consult (04:56 UTC)**
- **Lane integration branch:** `1908470` (opening merged).
- **`terminals-c4`: FINISHED, at `710f4a0`, and NOT merged.**
  - `is-ancestor` exits 1. `merge-tree` CONFLICTS in `echo/data/objectives.js` and `echo/main.css`.
  - I looked at renders 11 and 22. The physics is right on what they show: the relay shows 50/50 EXACT with the engine labelled, and the 11 case with X missing gives F=0.177526 with a true single-switch line.
  - Code read: `dryExplanation()` builds its failure lines from its own per-switch logic. It never reads `TELEPORT_FAILURE_CASES` and still pushes `F.no_corrections`, which data-fixes deleted. On the integrated data this is either a crash or the both-wrong falsehood again.
  - The panel still shows "REMOTE BELL HALF" (the data now says RECEIVER BELL HALF) and has no fidelity gloss.
  - → I am dispatching **`terminals-conform`** on its branch. It takes over the `failure-keys` item, so the producer and the consumer change in one branch.
- **`shell-polish`** is running at `f9419d3`. It has the lane integration branch and merges clean. It adds `TERMINALS.teleport_terminal.fidelityGloss`. Final report pending.
- **`declassified-conform`** is running at `01350cd`. It has the lane integration branch and merges clean. Its commit message says the credits are byte-exact (U+2014) and the assets line is replaced. Final report pending; I check the credits render myself.
- **Slots:** 2 running + 1 new = 3 of 3.

**Merge order:** first ready merges. Every later branch merges the lane integration branch again and re-runs ALL the drivers (ui-shell `drive.mjs`, `drive-opening.mjs`, declassified `drive.mjs`, `drive-terminals.mjs`, story-data `check.mjs`). The hot spots are `main.css`, `objectives.js` and `teachback.js`.

**Merge conditions:**
- **`terminals-conform`:**
  - the lane integration branch is an ancestor;
  - failure lines come only from `TELEPORT_FAILURE_CASES`, rekeyed or looked up by the named `measurementBits.{m0, m1}` and the plan, for all 16 cases, with no `no_corrections` and no bitstring slicing;
  - RECEIVER BELL HALF and the m0/m1 labels come from the data;
  - the fidelity gloss is visible;
  - the EXACT receiver label shows;
  - `contract-check` and `qollab-caps` are run, and a red caused only by the absent `index.html`/`main.js` is named as such;
  - all drivers are green;
  - I re-read the 4 both-wrong renders myself.
- **`declassified-conform`:** the lane integration branch is an ancestor; the credits are byte-identical to the ruling; no TODO_OWNER is visible; all drivers are re-run; the credits are re-rendered.
- **`shell-polish`:** T2 captions are always on; teachback:46 is fixed; the ui-shell defects are fixed; red→green; all drivers are re-run.

**Done:** ui-shell (c2), story-data (c3), data-fixes (c6), opening (c7). `terminals-c4` is finished, but its work lands only through `terminals-conform`.

**Next, in order, as slots free:**
1. **`integration`:** mount everything into platform `main.js` and the gameplay code, swap the stub for `bridge.js`, and play a graybox in the local runner. Target about Sat 12:00 ET. Dispatch it as soon as the three branches above merge, and check on platform's `main.js` and quantum's `bridge.js` first.
2. **A11y pass:** 3 viewports × 200% with accesslint, on the integrated build, including the booth and relay at 200% (terminals-c4 did not cover them).
3. **Terminal hardening:** a try/catch around `render()`.

**For platform and gameplay** (relay through owner-answers):
- `mountOpening` with `onShot` A–D, and `onFinished`/`onSkip` mapped to `QUEST_EVENTS`.
- `captionStyle` replaces `subtitles`.
- Triggers for `MOMENTS.teleport_dry_run_00`, `countdown_zero` and `HUD.countdownHeld`.
- A run-record type plus a validator.
- An exit edge from CREDITS.
- `mountDeclassified` on OPEN_SCIENCE.
- **From terminals-c4:**
  - platform's validator refuses a `documented_preview` relay result;
  - the acknowledgement order per terminal;
  - `CLOSE_TERMINAL {id}`;
  - Esc yields to the capture-phase listener;
  - `bridge.js` must expose `bellMeasurement` / `teleportDryRun(…, bits)` / `commitStoryTransfer`.

**Risks:**
- `bridge.js` and the platform `main.js` have not landed on main, which blocks the integration step.
- Three branches are converging on `main.css` and `objectives.js`.
- G2 is Sat 17:00. KILL `terminals-conform` if it has not reported by about 02:45 ET.
- Harness ports: declassified 8771, opening 8781, terminals-conform 8791 (new). Shell-polish uses whatever it has; no new port.

**Per-consult check:** compare the in-flight list with the running list and each branch's commits; run `is-ancestor` for each branch; run `merge-tree` before any MERGE; Read the renders myself.
=== END PLAN ===

=== AGENT name=terminals-conform model=opus base=lane/story-ui/terminals-c4 ===
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
=== END AGENT ===

=== LEARN ===
2026-10-10, consult 10. terminals-c4 reported "100/100 green, physics on every bit pair". My code read found that `dryExplanation()` ignores the reviewed `TELEPORT_FAILURE_CASES` map. It rebuilds the failure lines from per-switch logic and still pushes `no_corrections`, which data-fixes deleted. Its drive was green because it ran against a stale data base.

Lesson: a consumer built in parallel with a data fix must be grepped for the symbols the fix deleted or added before I merge it.

Rule: one branch owns both the producer and the consumer of the failure map. That is why `failure-keys` is folded into `terminals-conform`.
=== END LEARN ===
