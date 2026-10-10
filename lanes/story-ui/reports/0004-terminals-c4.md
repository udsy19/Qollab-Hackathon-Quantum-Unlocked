# 0004 terminals-c4: the three in-world terminals (FINAL)

## TL;DR
- **Done, verified in a local harness (not Qollab, not the game).** I built `echo/ui/terminal.js` and appended `/* ==== terminal ==== */` to `echo/main.css`.
  - It drives copy_booth, relay_core, teleport_terminal and the classical_socket junctions, by keyboard alone or by mouse.
  - It never owns quest state.
  - All copy comes from `echo/data/objectives.js`, with new entries added there.
- **Gate.** `evidence/story-ui/harness/drive-terminals.mjs` was written first and was red on a skeleton (`evidence/story-ui/terminals/00-red-on-skeleton.txt`). It is now **100/100 green** (`01-green.txt`), with the real pause menu mounted.
- **Copy gate:** green (`02-copy-check.txt`). **Sabotage:** 13/13 red (`03-sabotage.md`). **accesslint `audit_live`:** clean inside `.echo-terminal`, and it goes red (critical) when sabotaged.
- **Physics, every bit pair:** fidelity 1.000000 for the right correction; for a wrong one it is <1 and matches the closed form computed independently by the drive. A correct **00** run does NOT unlock COMMIT. COMMIT is called once and latched. The source shows CONSUMED only on success. A commit error leaves STATE PRESENT and offers RETRY.
- **Finding:** platform's validator refuses a `documented_preview` relay result. So the relay harness replays the quantum lane's **real** Qiskit `bell_signalling` output (`lane/quantum/integration@d9b42d0`).
- **Renders:** `renders/terminals-c4/` (10 PNGs). Full set: `evidence/story-ui/terminals/` (36 PNGs + README, badge `terminals r1 · sha256 61ad717702a8`).
- **Recommend:** merge `lane/story-ui/terminals-c4` into `lane/story-ui/integration`, and pass the contract requests below to platform and quantum.

## Vault check
- **Read:**
  - `vault/AGENTS.md` (delivered by the hook), `vault/Home.md` NOW block (session start), `vault/Index.md` (grep: nothing on terminals).
  - `vault/Reports/story-ui-ui-shell-harness.md` and `story-data-script-gate.md` (head).
  - `/Users/udsy/agent-org/lanes/story-ui/context.md` and `rulings.md`.
  - `echo/CONTRACTS.md` + `echo/contracts.js` from `lane/platform/integration`.
  - The quantum lane's `cloning.py`, `entanglement.py`, `teleportation.py` and `__init__.py`.
  - Vision §4.2–4.4, §6.1–6.6, §7, §8.4–8.6, §12.3.
- **Already known and reused:**
  - The ui-shell `drive.mjs` pattern: CDP keys, provenance hash badge, the "visibility 0s" lesson.
  - `accessibility.js` (`trapTab`, `focusableIn`, `el`), the main.css tokens, `.echo-button`, `.echo-key`.
  - ui-shell's note that accesslint caches modules per origin, so I audited from fresh ports (8762/8763/8765).
- **Prior art:** `where.mjs mountTerminal --branches` found only my own skeleton. No terminal existed anywhere.
- **Stale or wrong:**
  - `context.md` § "Where things stand" still says `echo/` does not exist.
  - `ui/menu.js`'s comment says the integrator calls `preventDefault` first. In practice that only works from a capture listener on `window`, measured as S13.
- **Written back:** `vault/Reports/story-ui-terminals.md`. Hubs were left for the loop to regenerate.

## What I found
1. **The platform validator rejects `bell_signalling` unless the engine is `exact_qiskit_local`.**
   - This is the owner ruling as code. My first relay run showed RESULT REFUSED, which is the correct behaviour.
   - The brief's "stub with documented_preview" therefore cannot drive the relay. `record-relay.sh` runs the quantum lane's real function with the project venv (`git archive` of the ref into a temp dir, run with `python -I`) and records it.
   - The harness replays it honestly labelled `exact_qiskit_local`, with the ref and commit stored in the fixture.
2. **§8.4's `teleportDryRun(stateId, correctionX, correctionZ)` cannot give "bits first, then corrections"** (owner ruling). The terminal needs a measurement call first. See the contract requests.
3. **A correct 00 dry run tests nothing**, because the rule asks for no correction. If it unlocked COMMIT, the ruling "≥1 correct non-00 dry run" would be violated. The S3 sabotage shows the gate catches it.
4. **Escape ownership.** The pause menu listens on `document` in the bubble phase. The terminal listens on `window` in the capture phase, so pause never opens over a terminal. Measured with the real menu mounted, with a control showing Esc does open pause when no terminal is open.
5. **The relay's paired view uses the exact agreement observables** (zBasisAgreement/xBasisAgreement), never counts:
   - I: 1/1
   - X: 0/1
   - Z: 1/0
6. **Looking at my own renders found three defects the checks did not**, all fixed:
   - The panel overflowed 720px, hiding COMMIT. Now a two-column layout.
   - The live commit reused the "Receiver *test* fidelity" label. Now a "LIVE TRANSFER: FRESH BITS, SAME RULE" heading and a "Receiver fidelity with the token" label.
   - CALIBRATING blinked down to 35% opacity, nearly invisible. Now ≥70%, bold.
   - Also: the module-error copy claimed "Nothing was measured", which the UI cannot know. Reworded to "No result came back".

## What I changed (commits on `lane/story-ui/terminals-c4`)
- `ac82f4a`: terminal copy added to `echo/data/objectives.js`; harness, stub engine, `serve.py`; drive gate written first and red.
- `d9c8ef0`: `echo/ui/terminal.js` + terminal CSS; relay replays recorded Qiskit output; 80 green.
- `2430a9f`: layout fits 1280×720, live-commit labels, module-error copy.
- `f6cd980`: copy gate (static + rendered), junction panel, hint and 200% checks.
- `5e36de9`: sabotage round, ack-timing and double-activation checks, accesslint, README, vault report.
- `710f4a0`: real pause menu mounted, Esc ownership checks; 100 green; sabotage 13/13 red.

**Data changes (`echo/data/objectives.js`):**
- **Added:**
  - `TERMINALS.common`: engine labels per `EngineKind`, CALIBRATING (§12.3), module error, refused, retry, close/ESC.
  - Booth: WHY panel labels, `inputModeLabel`, `joint`.
  - Relay: agreement labels.
  - `classical_socket` copy.
  - Console: toggles, ON/OFF, dry pass/fail, `testState`, `committing`, `liveHeading`, `liveFidelity`.
  - `FAILURES.teleportation.trivial_pass`.
- **Changed:** `m0Label`/`m1Label` → "SOURCE READOUT m0" / "LOCAL BELL-HALF READOUT m1" (brief + ruling).
- The story-data gate is still GREEN.

## Evidence paths
- `evidence/story-ui/terminals/README.md`: index of all of the below.
- **Gate output:**
  - `00-red-on-skeleton.txt`, `01-green.txt` (100/100), `02-copy-check.txt`, `03-sabotage.md`, `drive-result.json` (every key, check and rendered leaf).
  - `04-teleport-keyboard-sequence.txt`: keyboard-only teleport run; 1 mouse line, which is the locked-COMMIT probe.
- **Screenshots, by brief item:**
  - Each terminal at each step: 01–08, 10–12, 20–23, 40–42.
  - \|+⟩ failing with its reason: 05, 06.
  - Relay receiver for I, X and Z: 11-I, 11-X, 11-Z, plus paired view 12.
  - All four m0/m1 pairs, right and wrong: 22-*.
  - ESC mid-flow, then reopen with state intact: 23.
  - Commit error, then retry: 24, 25.
  - Commit success, then second attempt refused: 26, 27.
  - Engine error, malformed result refused, CALIBRATING: 30, 31, 32 (also 02).
  - 200% text: 50, 51.
- **accesslint `audit_live`:**
  - Scoped to `.echo-terminal`: 0 violations, on open and on the result screens (`?auto=1`, which I checked reaches `[data-role=result]`).
  - Unscoped: 3 moderate, all harness chrome.
  - Sabotaged copy (CLOSE label emptied): 1 critical `button-name`.

## What I did NOT do or could not verify
- **Not Qollab, not the game, not the real bridge.**
  - The cloning and teleport results are `documented_preview` stub values (textbook closed form). The relay values are recorded Qiskit output.
  - `echo/quantum/bridge.js` has not landed, so the method names below are my request, not a contract.
- **`echo/contracts.js` is not on my base.** `terminal.js` imports `../contracts.js` by the same path, as briefed, and the harness serves it via `git show lane/platform/integration:echo/contracts.js` (`serve.py`). There is no copy in the tree. **Integration needs platform's contracts.js landed first, or terminal.js 404s.**
- **Not verified:**
  - Movement-off and mouse-free are the integrator's job (on OPEN_TERMINAL / CLOSE_TERMINAL), and are not tested here.
  - Viewports other than 1280×720.
  - 200% text on the booth and relay; I checked the console only.
  - Reduced motion: it relies on ui-shell's global rule, not re-measured.
- **How double-activation was tested:** the probes use `element.click()` from page script (synthetic, not CDP mouse). The Enter presses are real CDP keys.
- **Robustness gap:** a render exception (e.g. an engine result that passes the guards but has a surprising shape) leaves `aria-busy` stuck. S6 shows the gate reports it, but the product has no try/catch around render.
- **Not a WCAG 2.2 AA claim:** only the accesslint rules ran.

## Contract requests for platform/quantum
1. **Quantum, `bridge.js`.** The terminal calls these on its `engine`:
   - `cloneTest(state)` → `cloning.run_calibration`
   - `bellSignalling(senderGate)` → `entanglement.bell_signalling`
   - **`bellMeasurement()`** → `teleportation.bell_measurement` on a *fresh random generic state*, returning it in `parameters.state`
   - **`teleportDryRun(stateId, correctionX, correctionZ, {m0, m1})`** → `teleport_branch(state, m0, m1, x, z)`; the fourth argument is an extension of §8.4's signature, needed for bits-first
   - **`commitStoryTransfer()`** → `live_commit(<hidden story token>)`, one atomic call

   `teleport_branch` currently takes a state *name* from `STATES`. Random generic states (ruling) need a parameterised id, e.g. `generic:θ,φ`. Owner question? No: the ruling already says "random generic dry-run states". This is implementation for quantum.
2. **Platform:**
   - `classical_socket`'s binding fires `REPAIR_CLASSICAL_LINK` when E is pressed, but §4.4 has three junctions. My junction panel emits `REPAIR_CLASSICAL_LINK` only after all three are patched (an emitted twice is refused harmlessly by `transition`). Platform should decide whether the E press or the panel completion is the event.
   - Document in `CONTRACTS.md` that terminals emit `CLOSE_TERMINAL {id}` on Esc/Close, and the acknowledgement order: copy_booth `BASIS_DEMO_OK → SUPERPOSITION_DEMO_FAILED → EXPLANATION_READ`; relay `PREPARE_BELL_PAIR → ATTEMPT_NO_SIGNALLING → VIEW_RECEIVER_MARGINAL`; console `CORRECT_CALIBRATION → COMMIT_TRANSFER`.
3. **Platform: Esc ownership.** Any lane listening for Esc must yield to a capture-phase listener on `window` (S13).

## Decisions inferred from the docs
- **`BASIS_DEMO_OK` needs both \|0⟩ and \|1⟩** to have been shown (objective "TEST THE BOOTH ON \|0> AND \|1>", §4.2 Beat 1). Events are emitted in §9.2 order whatever order the player tests in.
- **`EXPLANATION_READ` fires on REROUTE** (the deduction, hint `clone_deduction`), not on opening WHY. INCREASE VOLTAGE is explained and not punished (§4.2 Beat 3).
- **`VIEW_RECEIVER_MARGINAL` fires once the receiver-only panel has painted after a SEND.** The receiver view is the default after SEND (§4.3, hint `relay_marginal`; gameplay ruling "acknowledgements only after the result panel was shown").
- **The PREPARE BELL PAIR step makes no engine call.** §8.4 has no such method; the result comes from `bellSignalling`.
- **One dry run per Bell measurement.** After VERIFY, the toggles lock, and the next attempt measures a fresh state (ruling "wrong dry run → fresh calibration state"; §4.4 Beat 3).
- **COMMIT uses `aria-disabled`, not `disabled`,** so pressing it explains why (commit_locked / already_committed): §6.6 "every failure says why".
- **SKIP DEMONSTRATION** runs \|0⟩, \|1⟩, \|+⟩ in sequence (§4.2 "skip-after-demonstration option for judges").
- **The live-commit panel says the bits are fresh** (§7.4 story-integrity constraint).
- **Engine label strings:** I wrote the wording for the three `EngineKind` labels. "DOCUMENTED PREVIEW, NOT A LIVE CALCULATION" follows §8.4: "never label preview data as a fresh … measurement".

## What the supervisor should do next
1. Read `renders/terminals-c4/` (10 PNGs). Every one shows an engine label, and fidelity/bit physics matching §7.1.
2. Merge `lane/story-ui/terminals-c4` into `lane/story-ui/integration`. It touches `echo/ui/terminal.js`, `echo/main.css` (append only) and `echo/data/objectives.js` (additions; m0/m1 labels changed), plus `evidence/story-ui/` and `vault/Reports/story-ui-terminals.md`.
3. Pass contract requests 1–3 to quantum and platform. Integration is blocked on `echo/contracts.js` landing (the import path) and on `bridge.js` exposing `bellMeasurement` / `teleportDryRun(…, bits)` / `commitStoryTransfer`.
4. Next story-ui work, if wanted:
   - try/catch around `render()`, so an unexpected-but-valid result cannot freeze the panel;
   - 200% text checks on the booth and relay;
   - a re-run against the real bridge once it lands (swap the stub, keep the drive).
