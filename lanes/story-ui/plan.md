**Lane story-ui plan, consult 11 (Sat 2026-10-10 ~01:05 ET / 05:05 UTC, T+6h)**

**Goal (unchanged):** vision §4 and §6. That covers:
- a skippable opening and captions of at most 2 lines;
- the HUD;
- the three terminals, wired to the §8.4 adapter, with honest error states;
- progressive hints;
- Declassified mode, with the teach-back and the credits;
- pause and settings menus;
- keyboard navigation, visible focus, reduced motion and text scaling.

These are plan rows 5 (G2, Sat 17:00 ET) and 6 (G3, Sun 05:00 ET).

**State, checked from git this consult**

`shell-polish` at `40383ff` is judged and MERGED this consult.
- `is-ancestor` exits 0 and `merge-tree` is clean.
- I read all 4 renders myself:
  - kets render as ⟩;
  - the select uses the display face, with a visible focus ring;
  - the long line breaks at a clause;
  - at 200% and 1024×640 the HUD stays in the viewport.
- My physics read of the data diff:
  - `FIDELITY_GLOSS` claims only "0 to 1, 1 = identical", which is true for every value a dry run can show;
  - teachback:46 is now a question answered "No." and no longer voices §2.4;
  - the Subtitles option is gone, and the menu offers caption style only.

`declassified-conform` at `01350cd` is still running. `is-ancestor` exits 0 against the old integration branch and `merge-tree` is clean. After this merge it must merge the integration branch again. Its misconception renderer must also handle a `wrong` field that is now a question, so a "Myth:" prefix would read wrongly.

`terminals-conform` at `aafc8cc` is still running and merged the integration branch. After this merge it must merge again.

**NEW FACT (git, 05:05 UTC):** the integration targets now exist on lane branches, not on main.
- `lane/platform/integration:echo/main.js` already imports `mountMenu`, `mountHud` and `mountDialogue` and mounts them into `#echo-ui`.
- `lane/quantum/integration:echo/quantum/bridge.js` exports:
  - `cloneTest`, `bellSignalling`, `calibrationMeasurement`;
  - `teleportDryRun(calibration, x, z)`, `commitTransfer`, `resetStoryToken`;
  - `verifySelectedBackendOnce`.
- **Name mismatch:** terminals-c4 expected `bellMeasurement` / `teleportDryRun(…, bits)` / `commitStoryTransfer`. So terminal.js must call the real bridge names, and the integration worker checks this.

Slots: 2 running + 1 new = 3 of 3.

**Dispatch: `ui-wiring`.**
- It composes a local-runner build from platform `main.js` + quantum `bridge.js` + gameplay + this lane's UI, in an evidence harness and not in platform files.
- It finds every seam: opening, terminals, declassified, menu `captionStyle`, and the bridge names.
- It ships story-ui's side, a single `echo/ui/` mount facade that platform calls.
- It hands platform an exact patch request.

**Merge conditions:**
- **`terminals-conform`:**
  - the integration branch is an ancestor;
  - failure lines come only from `TELEPORT_FAILURE_CASES`, looked up by the named `measurementBits.{m0, m1}`, for all 16 cases, with no `no_corrections` and no bitstring slicing;
  - the RECEIVER label and the m0/m1 labels come from the data;
  - `fidelityGloss` is visible;
  - the EXACT receiver label shows;
  - it uses `displayKets` and not its own `ket()`;
  - all drivers are green;
  - contract-check and qollab-caps are run;
  - I read the 4 both-wrong renders myself.
- **`declassified-conform`:**
  - the integration branch is an ancestor;
  - the credits are byte-identical, with no TODO_OWNER;
  - `FIDELITY_GLOSS` sits next to the journal fidelity;
  - the question-form misconception renders sensibly;
  - all drivers are re-run;
  - the credits are re-rendered.

**Done:** ui-shell (c2), story-data (c3), data-fixes (c6), opening (c7), shell-polish (c11).

**Next:**
1. Merge `terminals-conform` and `declassified-conform`.
2. `ui-wiring` turns into a real graybox in the local runner. Target about Sat 12:00 ET.
3. An a11y pass: 3 viewports × 200% with accesslint, on the integrated build.
4. Terminal hardening: a try/catch around `render()`.

**For platform** (via report and owner-answers): `mountOpening`, terminal and declassified wiring, `captionStyle`, `CLOSE_TERMINAL`, the CREDITS exit edge, the run-record type, and Esc capture order.

**Risks:**
- Bridge API names have drifted.
- The three converging branches meet in the `main.css` hot spot.
- G2 is Sat 17:00. KILL `terminals-conform` if it has not reported by about 02:45 ET.

**Ports:** declassified 8771, opening 8781, terminals-conform 8791, shell-polish 8801, ui-wiring 8811.