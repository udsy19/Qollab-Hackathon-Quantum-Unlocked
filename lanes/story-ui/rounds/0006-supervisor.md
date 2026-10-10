=== PLAN ===
**Lane story-ui plan, consult 6 (Sat 2026-10-10 ~00:10 ET / 04:10 UTC, T+5h)**

**Goal:** the story and interface from vision §4 and §6:
- a skippable opening
- 2-line subtitles
- the HUD
- three terminals (copy_booth, relay_core, teleport_terminal) wired to the §8.4 adapter, with honest error states
- progressive hints
- Declassified mode with the teach-back, plus credits
- pause and settings menus
- keyboard navigation, visible focus, reduced motion and text scaling

This is Plan rows 5 (G2, Sat 17:00 ET) and 6 (G3, Sun 05:00 ET).

**State, checked from git this consult:**
- main is merged into the lane at `8f3f9a8`, so contracts v2 is in the lane. `git diff lane...main` is empty.
- **data-fixes was judged and is being MERGED this consult.**
  - I ran its gate myself in a disposable worktree at `e61a537` (`node evidence/story-ui/story-data/check.mjs`): GREEN, with 11655 checks and the one disclosed `TODO_OWNER` (the assets credit, which waits on the art lane).
  - I read the 16-row branch-truth table against X^(x⊕m1)Z^(z⊕m0). Every line is true on every case that shows it, and each line speaks only about its own switch. The fidelities agree with cos²(1.137) ≈ 0.177.
  - `git merge-tree` is clean against integration.
  - The credits line matches the ruling.
- `terminals-c4` is running. It is based on the pre-v2 integration branch, so it must show v2 conformance before I merge it: the bits-first dry run, the `ExperimentResult` shape from `echo/contracts.js`, `tools/contract-check/check.mjs` and `tools/qollab-caps/check.mjs`. It must also consume `TELEPORT_FAILURE_CASES`, so after this merge it must merge the lane integration branch.
- `declassified` is running (port 8771).
- The free slot (cap 3) goes to `opening` (port 8781).

**Approach (unchanged):**
- `echo/ui/` modules use `mount(root, deps)`, and data ships as JS in `echo/data/`.
- Each CSS area gets a delimited section of `main.css`. Harnesses live in `evidence/story-ui/harness/`, with one port per worker.
- Contracts come from `echo/contracts.js`.
- Kets are ASCII in the data and become ⟩ at display time.
- The engine label is always visible.

**Done:**
- ui-shell (c2)
- story-data (c3)
- data-fixes (c6)

**In flight:**
- `terminals-c4` (G2 critical path)
- `declassified`
- `opening` (new)

**Next, in order, as slots free:**
1. `shell-polish`: sentence-boundary pages, ⟩ at display time, the select font, the 1024/1366 @200% null. It goes after the terminals merge.
2. `integration`: mount everything into platform `main.js` / gameplay, swap the stub for `echo/quantum/bridge.js` once it lands, and play a graybox in the local runner. Target about Sat 12:00 ET.
3. An a11y pass at 3 viewports × 200%, with accesslint.

**Gameplay asks to relay** (via the plan and owner-answers):
- `MOMENTS.teleport_dry_run_00`, `MOMENTS.countdown_zero` / `HUD.countdownHeld` and `TELEPORT_FAILURE_CASES` now exist.
- The opening needs shot hooks for the camera.

**Risks:**
- `terminals-c4` needs a conform round.
- `bridge.js` has not landed.
- `main.css` is a hot spot. Merge order: terminals → declassified → opening, and each later one rebases.
- G2 is Sat 17:00.

**Per-consult check:** compare the in-flight list with the running list and each branch's commits, and re-dispatch anything missing.
=== END PLAN ===

=== MERGE branch=lane/story-ui/data-fixes ===

=== AGENT name=opening model=sonnet base=lane/story-ui/integration ===
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
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 6: I merged data-fixes after rerunning its gate myself in a disposable worktree: `git worktree add --detach /tmp/sv-df <branch>`, then check.mjs → GREEN with 11655 checks. I also checked its 16-row table against the closed form. Before correction the receiver holds X^m1 Z^m0·ψ. After a plan (x, z) it holds X^(x⊕m1) Z^(z⊕m0)·ψ. On ry(1.137) the leftover-Z fidelity is cos²(1.137) ≈ 0.177.

Lesson: judge teleport copy per switch. A line about one switch must never imply anything about the other, which is how `missing_X` was false in the 4 both-wrong cases that my consult-3 read missed. Use the closed form as the supervisor's quick check.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 6, a decision inferred from the docs. Opening skip is ALWAYS available, from the first frame. Basis: §3.4 says "skip opening after first view", but QOLLAB_DEPLOYMENT and the runtime rules say there is no persistence and the interpreter is fresh every Run. So every run is a first view, and a first-view gate would make the opening unskippable for judges, against §6 line 371 and the §12 "Skip cinematic" smoke test.

The opening fires `onShot` A–D for the gameplay camera. Story-ui owns only the captions, the card and Skip, never the camera.
=== END LEARN ===
