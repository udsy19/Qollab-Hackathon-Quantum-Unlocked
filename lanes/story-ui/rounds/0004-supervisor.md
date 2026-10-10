=== PLAN ===
**Lane story-ui plan, consult 4 (Fri 2026-10-09 ~23:55 ET / 03:55 UTC, T+5h)**

**Goal:** the story and interface from vision §4 and §6:
- a skippable opening
- dialogue with 2-line subtitles
- the HUD
- the three terminals, wired to the §8.4 adapter with honest errors
- progressive hints
- Declassified mode with the teach-back
- pause and settings menus
- keyboard navigation, visible focus, reduced motion and text scaling

This is Plan rows 5 (G2) and 6 (G3).

**What happened since consult 3:** the lane restarted at 03:51 UTC.
- The `terminals` worker died about 2 minutes after it started. Its worktree is clean, its log is empty and `lane/story-ui/terminals` has 0 commits beyond integration.
- The three queued briefs (shell-polish, data-fixes, declassified) were never started.
- I am re-dispatching. The cap is now 2 (overseer).

**New inputs found this consult:**
- **Quantum:** `lane/quantum/integration` now carries `echo/quantum/{cloning,entanglement,teleportation,formats}.py`.
  - `formats.experiment_result` gives the real ExperimentResult shape, including `keyQubits` and `observables`.
  - `teleportation.py` exposes `bell_measurement`, `teleport_branch`, `live_commit` and `expected_corrections`.
  - The JS `bridge.js` has not landed yet.
- **Terminals:** the terminal stub must now mirror that exact shape, so the swap to the real engine is a one-line change.
- **Platform contract ids:** `copy_booth`, `relay_core`, `teleport_terminal` (no longer `classical_socket`), plus `BUS_EVENTS` `OPEN_TERMINAL`/`CLOSE_TERMINAL`.

**Approach (unchanged):**
- `echo/ui/` modules use `mount(root, deps)`, and data ships as JS in `echo/data/`.
- Each CSS area gets a delimited section of `main.css`. Harnesses live in `evidence/story-ui/harness/`, one port per worker.
- Contracts are imported from `echo/contracts.js`.
- Kets are ASCII in the data and become ⟩ at display time.
- The engine label is always visible.

**Done:**
- ui-shell (merged, consult 2)
- story-data (merged, consult 3)

**Dispatched now (cap 2):**
1. `terminals`: the G2 critical path, re-briefed with the quantum shapes and the owner rulings on bits first, the commit unlock and the atomic commit.
2. `data-fixes`: touches only `echo/data/`, so it has no `main.css` conflict with terminals.

**Next, in order:**
3. `shell-polish`: pages break only at sentence boundaries, ⟩ at display time, the select font, the 1024/1366 @200% null. It goes after terminals because both touch `main.css`.
4. `declassified`: the journal, the teach-back and the credits screen.
5. `opening`: a skippable Shot A–D caption player.
6. An a11y pass.
7. Integration with platform `main.js` and the gameplay state machine, swapping the stub for `bridge.js`, then a graybox run in the local runner by about Sat 12:00 ET.

**Risks:**
- The lost run cost about 1 h. G2 is Sat 17:00.
- `main.css` merge order (terminals before shell-polish).
- `bridge.js` is not landed.
- Gameplay must fire the 4 MOMENTS; already relayed.
=== END PLAN ===

=== AGENT name=terminals model=opus base=lane/story-ui/integration ===
You are agent `terminals`. This is a **re-dispatch**: the previous run died at startup and left no commits, so start fresh from `lane/story-ui/integration`, which now carries ui-shell and story-data.

**GOAL:** A player can operate ECHO's three in-world terminals with the mouse or the keyboard alone. Every result names the engine that produced it, every failure says why, and ESC always backs out without a softlock.
- **Replication booth `copy_booth`** (§4.2, §6.4):
  - The player prepares |0>, |1> or |+> and presses DUPLICATE.
  - Basis states "match". |+> gives a Bell pair and `TWO INDEPENDENT COPIES: NO`, with purity 0.5 for each half.
  - Then come "Show me why" and the deduction choice (increase voltage or reroute). Both are allowed and neither is punished.
- **Relay `relay_core`** (§4.3):
  - The player prepares a Bell pair, chooses the sender's local operation I, X or Z, and presses SEND.
  - For every choice, the receiver-only panel shows EXACT `partial_trace` probabilities 0.5/0.5, labelled EXACT, with no sampled counts (owner ruling).
  - The player can compare that with the paired (joint) view.
- **Teleport console `teleport_terminal`** (§4.4, §6.5):
  1. Repair the link.
  2. Run the Bell measurement on a fresh random calibration state. The bits m0 and m1 appear FIRST.
  3. Then the player sets X and Z. All four choices are always offered.
  4. VERIFY DRY RUN reports the fidelity. A wrong correction gives the real fidelity, below 1, explained with `FAILURES.teleportation.*` from `echo/data/objectives.js`. The retry uses a fresh state.
  5. COMMIT STORY TRANSFER unlocks only after at least one correct dry run whose bits are not 00.
  6. COMMIT is one atomic call. The source shows MEASURED/CONSUMED only when that call succeeds. On an error the player sees an honest message and can retry. Once a result is recorded, the commit is latched forever.
- **Labels:** m0 is labelled "SOURCE READOUT m0" and m1 is labelled "LOCAL BELL-HALF READOUT m1". The receiver applies X iff m1=1 and Z iff m0=1.

**VISION:** `ECHO_MASTER_VISION.md` §4.2–4.4, §6.1 layer 2 (movement off and mouse free while open; ESC closes), §6.4–6.6, §7, §8.4 (`QuantumEngine` / `ExperimentResult` / `EngineKind`, names verbatim), §8.6, §12.3 ("CALIBRATING"; "Quantum backend verification unavailable; educational circuit validated locally"; never "IonQ verified"), §9.2–9.4 (events, idempotence). Owner rulings are in `/Users/udsy/agent-org/lanes/story-ui/rulings.md`, especially the 2026-10-10 entries on red-team physics, gameplay consult 3 and the 13 lane questions.

**WHAT WE ARE BUILDING:** `echo/ui/terminal.js` and a `/* ==== terminal ==== */` section appended to `echo/main.css`, using the tokens ui-shell already defined there. API:
- `mountTerminal(root, {engine, onEvent, getHint})`
- `open(id)`, where `id` is an `INTERACTABLE_IDS` value from platform's `echo/contracts.js`. Read it from `git show lane/platform/integration:echo/contracts.js` and `echo/CONTRACTS.md`. If it is not on your base, import it by the same path and note that in the report. Never fork it.
- `close()`

Rules for the terminal:
- It emits contract event names through `onEvent`. It emits acknowledgement events (`EXPLANATION_READ`, `VIEW_RECEIVER_MARGINAL`) only after the result panel has been on screen.
- It never owns quest state.
- **All copy comes from `echo/data/objectives.js` (`TERMINALS`, `FAILURES`, hints). Duplicating a string is a defect.**
- Kets are `|x>` in the data. Render them as `|x⟩` at display time and never rewrite the data.

**Engine:** the quantum lane's Python is on `lane/quantum/integration`: `echo/quantum/formats.py` (the `experiment_result` shape: `keyQubits`, `observables`, `facts`, `measurementBits`, `fidelity`) and `teleportation.py` (`bell_measurement`, `teleport_branch`, `live_commit`). Their JS bridge (`echo/quantum/bridge.js`) has not landed.
- Write a harness stub in `evidence/story-ui/harness/` (NOT in `echo/`) that returns objects in EXACTLY that shape, with `engine: 'documented_preview'`, textbook-exact values only and no `counts`.
- Validate every result with a guarded schema check. A malformed result is refused, and the UI says so.
- Handle three engine states: pending (CALIBRATING, UI never frozen), a rejected promise (honest message plus retry) and malformed. The engine label is visible on every result.

**WHAT HAS NOT WORKED:**
- Your previous run died with no checkpoint, so commit early and write the report checkpoint within 25 minutes.
- Org-wide: optimising against tests instead of the product, flags nobody switches on, and judging the wrong artifact.
- In this lane, a 30/30 driver still missed defects a human saw in the renders. Look at your own screenshots.

**Vault notes:**
- `vault/AGENTS.md`, `vault/Home.md`, `vault/Index.md`
- `vault/Research/qollab-platform-and-submission.md`
- `vault/Reports/story-ui-ui-shell-harness.md`, `vault/Reports/story-data-script-gate.md`
- `evidence/story-ui/story-data/script.md`

**Where to start:**
1. Write the event-log check FIRST and watch it fail. It asserts that the emitted events come in order, that COMMIT fires at most once under double-click and double-Enter, and that COMMIT stays disabled before a qualifying dry run.
2. Build the harness at `evidence/story-ui/harness/terminals.html`, served with `python3 -m http.server` on port 8761. Reuse ui-shell's `drive.mjs` pattern.

**Deliver** screenshots in `evidence/story-ui/terminals/` with a README and a visible version token:
- each terminal at each step
- |+> failing with its reason
- the relay receiver for I, X and Z
- all four m0/m1 cases, each with the right correction and one wrong correction, with fidelities
- the commit, then a second attempt refused
- a commit error followed by a retry
- the engine error state, CALIBRATING, and the malformed result refused
- ESC mid-flow, then reopen with the state intact

Also deliver the keyboard-only key sequence for one full teleport run, an accesslint `audit_live` result and a sabotage round with the nulls reported. Put the 10 best PNGs in `renders/terminals/`.

**How I will judge:** I will read the renders myself. The physics must match §7 for every bit pair, the engine label must be in every shot and no copy may be duplicated.

**Report:** `/Users/udsy/agent-org/lanes/story-ui/reports/0002-terminals.md`. It opens with `## TL;DR` and the Vault check and includes `## Contract requests for platform/quantum` and `## Decisions inferred from the docs`. Checkpoint within 25 minutes, PARTIAL if needed.
=== END AGENT ===

=== AGENT name=data-fixes model=opus base=lane/story-ui/integration ===
You are agent `data-fixes`. You edit only `echo/data/` (plus evidence and a vault report).

**GOAL:** Every line of ECHO's story text is true for every outcome the player can reach and agrees with the owner's rulings. A judge reading any line cannot catch a physics error or a contradiction.

**VISION:** `ECHO_MASTER_VISION.md` §2.4, §4, §7 (normative physics) and §9.1. Owner rulings are in `/Users/udsy/agent-org/lanes/story-ui/rulings.md`.

**WHAT WE ARE BUILDING:** fixes to `echo/data/{story,objectives,teachback}.js`, which were merged at consult 3. My physics read found these defects:
1. **Credits** are still `TODO_OWNER`. Use exactly: "Team The Quantubians (NYU Tandon School of Engineering): Udaya (captain), George, Harman, Epa". No emails. The license line is "udsy19 and contributors", and the attribution reads "This effort is supported by Qollab & IonQ".
2. **The m1 label** reads `m1  LOCAL BELL-HALF READOUT`. The ruling is exactly "LOCAL BELL-HALF READOUT m1", and m0 should read "SOURCE READOUT m0" for parallelism.
3. **`FAILURES.teleportation.extra_X` / `extra_Z`** say "a state that was already right". That is false when the other bit is 1. Rewrite every teleportation failure line so it is true for all 4 bit pairs × all 4 X/Z plans for which it can be shown, and say in a table which (bits, plan) pairs select which line.
4. **The rooftop dry run** mentions a "partner at the vault". That contradicts VEGA's "don't spend vault pairs on experiments". Dry runs use the in-room test rig on fresh calibration states. Only COMMIT spends the vault pair.
5. **Countdown at zero:** add a line. Per vision line 89 and line 787, the display holds at 00:00 with a held status line, there is no game-over and the story continues.
6. **Settled rulings to make consistent:** VEGA is a maintenance voice at the booth and fully awakens at the relay. The relay holds many pre-shared pairs plus a test rig. Rin has no pronouns. The teach-back is 1 right and 2 wrong choices, each with a "why", and no score. COMMIT unlocks after one correct non-00 dry run. Captions are always on.

**WHAT HAS NOT WORKED:** the phrase-gate `evidence/story-ui/story-data/check.mjs` had 4 sabotage nulls and cannot judge physics. A branch-dependent falsehood (item 3) got past it. Checking a line against one example is not enough.

**Vault notes:**
- `vault/AGENTS.md`, `vault/Index.md`
- `vault/Reports/story-data-script-gate.md`
- `evidence/story-ui/story-data/{README.md,03-sabotage.md,script.md}`

**Where to start:**
1. **Extend `check.mjs` first, then watch it go red on the current data.** Add checks for the credits string, both bit labels, the absence of "partner at the vault" and the presence of a zero-countdown beat.
2. **Add the branch-truth check.** Build an independent table, in a small Python script using the repo venv's Qiskit, of the receiver fidelity for each (m0, m1, X, Z) on a generic state (`ry(1.137)` then `rz(0.44)`). For each failure line, record the claim class it makes (for example "missing Z", "state was already right"). Assert that the class is consistent with the computed fidelity for every pair that selects it.
3. Then fix the data, run the gate to green, run `sabotage.mjs` again and report the nulls.
4. Regenerate `script.md` with `render-script.mjs`.

**Deliver:**
- commits on your branch
- the gate red, then green: the command, its exit code and the output files
- the branch-truth table at `evidence/story-ui/data-fixes/branch-truth.md`
- a diff of every changed line, old and new
- an update to `vault/Reports/story-data-script-gate.md`

**How I will judge:** I will read the new failure lines myself against the 16 cases in your table. The credits must match the ruling byte for byte, and the gate must go red on a sabotage of each new check.

**Report:** `/Users/udsy/agent-org/lanes/story-ui/reports/0002-data-fixes.md`. It opens with `## TL;DR` and the Vault check and ends with what the supervisor should do next. Checkpoint within 25 minutes.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 4: The lane restarted at 03:51 UTC and silently lost both the running worker and the queued worker briefs. Evidence:
- `lane.log`: `terminals` started 03:49 and the restart came at 03:51.
- `logs/0002-terminals.log` is empty.
- The terminals branch has 0 commits and a clean worktree.

The consult showed "running: none, queued: none", even though the plan said four were pending.

Lesson: at every consult, compare the plan's "in flight" list with the running/queued lists and each branch's commits. Re-dispatch whatever is missing, and require a checkpoint commit within 25 minutes so a crash loses less.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 4: The platform contract renamed the rooftop console id. Use `teleport_terminal` (`lane/platform/integration:echo/contracts.js` BINDINGS), not `classical_socket` from §9.4. The quantum ExperimentResult shape is defined by `lane/quantum/integration:echo/quantum/formats.py` `experiment_result`. Harness stubs must mirror that file exactly, so the swap to `bridge.js` is one line.
=== END LEARN ===
