=== PLAN ===
**Lane story-ui plan, consult 3 (Fri 2026-10-09 ~23:50 ET / 03:49 UTC, T+5h)**

**Goal:** the story and interface from vision §4 and §6. That covers a skippable opening, dialogue with 2-line subtitles, the HUD, the three terminals wired to the §8.4 adapter with honest errors, progressive hints, Declassified mode with the teach-back, pause and settings menus, keyboard navigation, visible focus, reduced motion and text scaling. This is Plan rows 5 (G2) and 6 (G3).

**Approach (unchanged):**
- ES modules in `echo/ui/` use `mount(root, deps)`, and story data ships as JS in `echo/data/`.
- Each CSS area gets a delimited section of `echo/main.css`. Harnesses live in `evidence/story-ui/harness/`, one port per worker.
- Contracts are imported from platform's `echo/contracts.js`.
- Terminals use the `documented_preview` stub until the quantum adapter lands. The engine label is always visible.
- **Kets:** the data keeps ASCII `|0>` because the vision uses ASCII and the verbatim gate checks against it. Renderers convert `|x>` to `|x⟩` when they display text. This is already in shell-polish's brief, and every renderer brief repeats it.

**Done:**
- **ui-shell:** merged at consult 2.
- **story-data:** judged this consult and merged.
  - 74 beats, 14 hint ladders, the failure lines, Declassified and the teach-back are in `echo/data/`.
  - The gate is red-first with 16 of 20 sabotages red. The 4 nulls are phrase-matcher limits.
  - I covered those nulls with my own physics read of `script.md`:
    - The teleport gate sequence and the X-iff-m1 / Z-iff-m0 rule are correct.
    - The receiver's 50/50 under I, X and Z, and the "after X never match" correlations, are correct.
    - The no-cloning purity of 0.5 is correct.
    - Both of Mica's misconceptions are corrected.
  - Defects I found, sent to data-fixes:
    - Credits are still `TODO_OWNER`, although the owner has now answered.
    - The m1 label reads `m1  LOCAL BELL-HALF READOUT`, but the ruling is "LOCAL BELL-HALF READOUT m1".
    - `extra_X`/`extra_Z` say "a state that was already right", which is false when the other bit is 1.
    - The rooftop dry-run "partner at the vault" contradicts VEGA's "don't spend vault pairs on experiments".
    - There is no line for when the countdown reaches zero.

**Story questions settled from the vision, not asked:**
1. VEGA is a maintenance voice at the booth and fully wakes at the relay. Accepted (§4.2 and §4.3 reconciled).
2. The relay holds many pre-shared pairs plus a test rig. Accepted (§7.4: unlimited dry runs on fresh states).
3. The m1 label is already ruled by the owner.
4. Credits are already answered by the owner.
5. Countdown at zero: the vision says no game-over from a timer (line 89) and never negative values (line 787). The display therefore holds at 00:00 with a held status line, and the story continues.
6. Pronouns: none, which is fine.
7. Teach-back: one right and two wrong choices, each with a "why", and no score. This matches §4.5 "optional, no scoring pressure".

**In flight:**
- `terminals` is running. It must rebase onto integration to consume `TERMINALS` and `FAILURES` from `echo/data/objectives.js`.
- `shell-polish` is queued.
- `data-fixes` and `declassified` are queued now, in that order.

**Next:**
1. Judge terminals: an engine label in every shot, and data strings consumed rather than duplicated.
2. Judge shell-polish.
3. Judge data-fixes and declassified.
4. Then `opening`: a skippable Shot A–D caption player with `onShot(id)`.
5. An a11y pass.
6. Integration with platform `main.js` and the gameplay state machine, then a graybox run in the local runner by about Sat 12:00 ET.

**Risks:**
- **`max_parallel: 1` with five workers' worth of work before G2 (Sat 17:00).** This is the biggest schedule risk; raised with the owner.
- `main.css` merge order.
- Gameplay must fire 4 MOMENTS (`clone_increase_voltage`, `relay_bay_cable`, `teleport_commit_locked`, `teleport_dry_run_failed`); relayed via ASK.
- The quantum adapter has not landed, so terminals still run on the stub.
=== END PLAN ===

=== MERGE branch=lane/story-ui/story-data ===

=== AGENT name=data-fixes model=opus base=lane/story-ui/integration ===
**GOAL:** every line a player or judge reads in ECHO is physically true, matches the owner's rulings, and credits the real team. No placeholder reaches the screen.

**VISION:** ECHO_MASTER_VISION §2.4 and §7.5 (truthful physics), §4.4–4.5 (ending, credits), §6.3 (HUD countdown), line 89 ("no game-over resulting from a non-pausing timer") and line 787 (never decrement a fictional timer to negative values).

**WHAT WE ARE BUILDING:** small, exact corrections to `echo/data/{story,objectives,teachback}.js`, which story-ui owns and which merged at consult 3. You also extend the existing gate `evidence/story-ui/story-data/check.mjs` so each defect below is caught. Reuse that gate: do not write a second one.

**WHAT HAS NOT WORKED / the defects, found by the supervisor's physics read of `evidence/story-ui/story-data/script.md`:**
1. **Credits are still `TODO_OWNER`.** The owner answered on 2026-10-10. Use **Team The Quantubians (NYU Tandon School of Engineering): Udaya (captain), George, Harman, Epa**, with no emails. The license line stays "udsy19 and contributors", and the attribution line stays "This effort is supported by Qollab & IonQ". The third-party-assets `TODO_OWNER` becomes a neutral line the art lane fills in, e.g. "Third-party assets: see README". The gate must fail on any `TODO_OWNER` in shipped data.
2. **m1 label.** The owner ruling is that m1 is labelled "LOCAL BELL-HALF READOUT m1" everywhere. `objectives.js` has `m1  LOCAL BELL-HALF READOUT`. Make m0 parallel, i.e. "SOURCE READOUT m0". The gate asserts the exact ruled string.
3. **`FAILURES.teleportation.extra_X` / `extra_Z` are physically wrong in some branches.** "That flip damaged a state that was already right" is false when the other bit is 1, because the state was not yet right. Reword to something true in every branch, e.g. "X was on but m1 = 0. That flip was not needed and left the receiver bit-flipped." Check all six teleportation failure lines against the rule (X iff m1 = 1, Z iff m0 = 1) for all 4 bit pairs × 4 X/Z plans, and show that table in your report.
4. **Story inconsistency.** At the relay, VEGA says "Don't spend vault pairs on experiments", but at TELEPORT_DRY_RUN she says "Three slots: test source, your Bell half, and its partner at the vault." Dry runs must use a calibration pair, and only COMMIT uses a vault pair. Fix the dry-run beat, hints and slot labels if they conflict. Keep §6.5's verbatim strings.
5. **No countdown-at-zero copy.** Decided from the vision (no game-over from a timer, never negative): add HUD data for a held state shown at 00:00 (for example `countdownHeld`), with a MIRROR line once that keeps the stakes without ending the run. Gameplay or platform decides when to show it. Note the request in your report.
6. **Kets:** do NOT convert `|0>` to `⟩` in data. The vision uses ASCII and the verbatim check compares against it; renderers convert at display time.

**Vault notes to read first:**
- vault/AGENTS.md, vault/Index.md
- vault/Reports/story-data-script-gate.md
- evidence/story-ui/story-data/README.md
- /Users/udsy/agent-org/lanes/story-ui/reports/0001-story-data.md
- /Users/udsy/agent-org/lanes/story-ui/rulings.md

**Where to start:** add the failing checks to `check.mjs` first, and show them red on the current data. Then fix the data, re-render `script.md`, and re-run `sabotage.mjs`.

**What to deliver:**
- Commits on `lane/story-ui/data-fixes`.
- The red-then-green output in `evidence/story-ui/story-data/`.
- The regenerated `script.md`.
- The 16-row correction table.
- An updated vault report.

**How I will judge it:**
- I read the regenerated `script.md` diff myself.
- No `TODO_OWNER` remains.
- The m1 string matches the ruling exactly.
- The failure-line table is true in all 16 cases.
- No dry-run line consumes a vault pair.

**Report:** `reports/0003-data-fixes.md`. Open with "Vault check", then TL;DR, evidence (command, exit code, path), nulls, and requests for gameplay/platform. Write a checkpoint within 1 h.
=== END AGENT ===

=== AGENT name=declassified model=opus base=lane/story-ui/integration ===
**GOAL:** after the ending, a first-time player can open Declassified mode, read in plain words what they did and what the qubits did in each mission, and answer the three teach-back questions with an explanation for every choice. All of it works by keyboard alone, at 200% text, with reduced motion.

**VISION:** ECHO_MASTER_VISION §4.5 (Credits and Declassified mode: the tabs, exact gates, expected data, misconceptions, and the optional 3-question teach-back with no scoring pressure), §1.4 (the bar: a blind tester can answer the three teach-back questions), §6.1–6.2 (UI layers and tokens) and §12.5 (accessibility).

**WHAT WE ARE BUILDING:**
- `echo/ui/declassified.js`. It uses `mount(root, deps)` like the other ui modules, builds its own DOM and talks through callbacks: `onBack()` returns to ENDING, and `onCredits()` opens CREDITS. These are the contract edges DECLASSIFIED→ENDING and DECLASSIFIED→CREDITS.
- A credits view. Put it in the same module unless you write down a reason it needs its own file.
- A `/* ==== declassified ==== */` section appended to the END of `echo/main.css`.
- All text comes from `echo/data/teachback.js` (merged), in its existing shape. Never duplicate a string into the UI.
- Render ASCII kets `|x>` as `|x⟩` at display time. If shell-polish has landed a helper for this, reuse it. Otherwise write one in `echo/ui/` and say so, so it can be shared.
- The teach-back has no score. Selecting a choice reveals its "why" (in an aria-live region) and never locks the player out.
- Show the provenance note visibly.

**WHAT HAS NOT WORKED:**
- A green driver missed three visible defects in ui-shell: mid-sentence page breaks, ASCII kets and a system-font select. The supervisor judges from your screenshots.
- Long tabs must scroll inside the panel and must not clip at 1024×640 at 200%.
- Do not build behind a flag.

**Vault notes to read first:**
- vault/AGENTS.md, vault/Index.md
- vault/Reports/story-ui-ui-shell-harness.md and vault/Reports/story-data-script-gate.md
- evidence/story-ui/story-data/script.md (the DECLASSIFIED and CREDITS sections)
- vault/Research/qollab-platform-and-submission.md
- `echo/CONTRACTS.md` on `lane/platform/integration` (read-only)

**Where to start:**
- `git fetch`. If `lane/story-ui/data-fixes` has merged into integration, rebase onto it, because it changes the credits. If it has not, consume the credits array generically so the fix flows through.
- Extend the existing harness (`evidence/story-ui/harness/`) and serve it on your own port, 8761.
- Write your keyboard-path check first and watch it fail.

**What to deliver:**
- Commits on `lane/story-ui/declassified`.
- `evidence/story-ui/declassified/` with:
  - a README;
  - screenshots of each of the 3 tabs, the teach-back with a right and a wrong choice revealed, and the credits;
  - a keyboard-only Tab/Enter/Esc run;
  - 200% at 1024×640;
  - reduced motion.
- Every shot carries the build badge with the sha256 of the shipped files, recomputed by you (law 16).
- A sabotage round on disposable copies, with the nulls reported.
- A vault report.

**How I will judge it:**
- Screenshots: every tab is readable, kets render as ⟩, and the focus ring is visible.
- No text clips at 200%.
- The why-text appears for both a right and a wrong choice.
- No score is shown.
- Credits show the real team.
- Esc returns to ENDING.

**Report:** `reports/0004-declassified.md`. Open with "Vault check", then TL;DR, evidence, nulls, contract requests and questions. Write a checkpoint within 1 h, marked PARTIAL if needed.
=== END AGENT ===

=== ASK_OWNER ===
1. **Lane setup.** `lane.json` sets `max_parallel: 1` for story-ui. Five worker-sized tasks are queued or running (terminals, shell-polish, data-fixes, declassified, then the opening). G2 is Sat 17:00 ET, and the UI must reach the graybox by about Sat 12:00. If the machine's build queue allows it, raise story-ui to 2 or 3. Data-fixes and declassified touch different files from terminals and shell-polish.
2. **Please relay to gameplay.** It needs to fire 4 one-off MOMENTS that are not state transitions, so the matching story lines play: `clone_increase_voltage`, `relay_bay_cable` (§4.3 Beat 3's amber cable; gameplay decides whether this interaction exists), `teleport_commit_locked` and `teleport_dry_run_failed`. There is also a held-at-00:00 countdown state, because the vision rules out a timer game-over (line 89) and negative values (line 787).
=== END ASK ===

=== LEARN ===
2026-10-10 consult 3: I merged story-data after my own physics read of `script.md`. The phrase-gate's 4 nulls show that it cannot judge physics. A human read found a branch-dependent falsehood the gate could not see: `extra_X` said "a state that was already right", which is false when m0 = 1.

Lesson: for any failure or explanation copy, check every line against all 4 bit pairs × 4 X/Z plans, not against one example.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 3: Kets stay ASCII `|x>` in `echo/data/`. The vision itself uses ASCII (0 occurrences of ⟩), and the story-data gate checks verbatim lines byte for byte against it.

The ⟩ glyph is a display-time transform in the renderers (dialogue, terminal, declassified). Never rewrite the data to get it.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 3: I settled the story-data worker's 7 owner questions from the vision and rulings, without asking:
1. **VEGA:** a maintenance voice at the booth, fully woken at the relay. This reconciles §4.2 and §4.3.
2. **Relay pairs:** many pre-shared pairs plus a test rig (§7.4: unlimited dry runs). Only COMMIT spends a vault pair.
3. **Countdown at zero:** it holds at 00:00 with no game-over (line 89) and never goes negative (line 787).
4. **Pronouns:** none.
5. **Teach-back:** multiple choice, a "why" on every choice, no score (§4.5).
6. **m1 label and credits:** already in the rulings.
=== END LEARN ===
