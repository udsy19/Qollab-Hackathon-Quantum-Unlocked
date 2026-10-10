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