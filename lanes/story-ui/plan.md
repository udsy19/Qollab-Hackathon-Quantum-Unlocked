**Lane story-ui plan, consult 5 (Sat 2026-10-10 ~00:05 ET / 04:05 UTC, T+5h)**

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
- **main has contracts v2** (`2133d8a`/`80d685f`), but `lane/story-ui/integration` does NOT yet contain main (`merge-base --is-ancestor` → 1; 74 files behind). → I am merging main into the lane integration branch now, and every new worker is based on it.
- `terminals-c4` is running. It has 1 commit (`ac82f4a`: data copy, harness, stub engine, drive gate red on the skeleton). It is based on the pre-v2 integration branch, so it must conform to v2 before I merge it: the two-phase teleport dry run (bits first, then corrections), the `ExperimentResult` shape from `echo/contracts.js`, and the UI root/settings. Its report will be judged on that.
- `data-fixes` is running. It has 3 commits (`b52954b` → `8cf12cb` → `9127f62`): a branch-truth gate run in Qiskit over all 16 (bits, plan) cases, the ruled credits, the bit labels, the test-rig dry run, the 00:00 hold and the 00 dry-run beat. Sabotage: 48 cases, 43 red, 4 old nulls, 1 refused. The final report is pending; I judge it when it arrives.
- The cap is now 3, with 1 free slot. I am using it for `declassified`.

**Approach (unchanged):**
- `echo/ui/` modules use `mount(root, deps)`, and data ships as JS in `echo/data/`.
- Each CSS area gets a delimited section of `main.css`. Harnesses live in `evidence/story-ui/harness/`, with one port per worker.
- Contracts are imported from `echo/contracts.js` (v2 on main).
- Kets are ASCII in the data and become ⟩ at display time.
- The engine label is always visible.

**Done:**
- ui-shell (merged, consult 2)
- story-data (merged, consult 3)

**In flight:**
- `terminals-c4` (G2 critical path)
- `data-fixes`
- `declassified` (new: journal, Declassified tabs, teach-back, credits screen; port 8771)

**Next, in order, as slots free:**
1. `shell-polish`: sentence-boundary pages, ⟩ at display time, the select font, the 1024/1366 @200% null. It goes after the terminals merge, because of the `main.css` hot spot.
2. `opening`: a skippable Shot A–D caption player.
3. `integration`: mount into platform `main.js` / gameplay, swap the stub for `echo/quantum/bridge.js` once quantum lands it, and play a graybox in the local runner. Target about Sat 12:00 ET.
4. An a11y pass at 3 viewports × 200%, with accesslint.

**Risks:**
- `terminals-c4` was built on pre-v2 contracts and may need a rebase/conform round.
- `bridge.js` is not landed (quantum).
- Every worker appends to `main.css`. Each section is delimited, and I merge in order: data-fixes → terminals → declassified.
- G2 is Sat 17:00.

**Per-consult check (from LEARN c4):** compare the in-flight list with the running list and each branch's commits, and re-dispatch anything that is missing.