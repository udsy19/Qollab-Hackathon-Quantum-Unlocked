## TL;DR
- I reviewed `lane/gameplay/integration` @ d5ec620 in a disposable worktree (`/tmp/qr-integ`). I found **8 defects with repros**: 1 high, 4 medium, 3 low. There are also 3 owner questions. Every repro script and its output is in `evidence/gameplay-quest-review/` on branch `lane/gameplay/gameplay-quest-review`.
- **HIGH, F1:** platform's `echo/contracts.js` (on `lane/platform/integration` @ 6378677) holds a **second, diverging quest table**:
  - It uses `BOOT_COMPLETE` where gameplay uses `BOOTED`.
  - It has no `RESTART` and no `CREDITS→DECLASSIFIED`.
  - Its `QUEST_STATES` is an object where gameplay's is an array.
  - Its bus event is `QUEST_STATE_CHANGED` where gameplay emits `quest:transition`/`quest:enter:*`.
  - A world-controller coded against contracts would stick at BOOT.
- **MEDIUM:**
  - **F2:** a `send` or `reset` made inside a listener delivers events to later subscribers **out of order**, or after a reset.
  - **F3:** the stale-result guard compares state names, so it is **ABA-blind**. A result from the previous session advanced the quest.
  - **F4:** the story token can be teleported any number of times below the FSM. A refused or failed commit leaves COMMIT live, which is the §7.4 re-measure.
  - **F5:** 20 of the 80 wrong-correction cases on 5 of the 6 dev calibration states **show fidelity 1**. That contradicts vision l.263.
- **LOW:**
  - **F6:** `eventForResult` throws on malformed input.
  - **F7:** contradictory Bell probabilities are accepted.
  - **F8:** `spec.mjs` silently drops a §9.2 row it cannot parse (36/36 green with the edge missing).
- **Held (nulls):**
  - The state table equals the doc (independent Python parser).
  - All 119 fake numbers equal Qiskit.
  - A 1000-run fuzz found 0 violations; the planted skip edge in the control gave 6054.
  - `echo/game` has no imports and no forbidden APIs.
  - The `__proto__` probes and the throwing listener are handled.
- **Recommend:** settle F1 with platform before world-controller starts. Fix F2 and F3 in `state.js` now: they are small, and the 3D driver depends on them.

## Vault check
- **Read:**
  - `vault/AGENTS.md`
  - `vault/Index.md` (no quest/review notes)
  - `vault/Reports/quest-state-machine-contract.md`
  - `/Users/udsy/agent-org/lanes/gameplay/context.md`
  - the worker report `reports/0001-gameplay-quest-core.md`
  - `evidence/gameplay-quest-core/03-sabotage.md`
  - vision §6.4–6.5, §7.1–7.6, §8.4–8.6, §9.1–9.5, l.263
  - `CLAUDE.md` (Working definitions)
  - `ROADMAP_48_HOURS.md` l.71
  - the rules: gate-independence, qollab-runtime, lane-ownership
- **Already known:** the contract note records:
  - "fidelity alone can't judge corrections";
  - that stale results must be dropped (it gives no mechanism);
  - the §8.4 gaps (no bits-before-corrections, no commit call).

  The sabotage table (S1–S24) has no case for multi-subscriber ordering, ABA, or parser skips. F2, F3 and F8 are new.
- **Reused:** the worker's findings as hypotheses. I re-derived each one independently and copied none.
- **Stale (not edited):**
  - The contract note does not know platform has a competing table and bus vocabulary (F1).
  - `context.md` "Where things stand" still says `echo/` does not exist.

## Findings (ranked)

### F1 HIGH: two diverging quest tables and two bus vocabularies (gameplay `echo/game/state.js` vs platform `echo/contracts.js`)
- **Repro:** first save platform's file, then diff the two tables:
  ```
  git show lane/platform/integration:echo/contracts.js > /tmp/qr-attacks/plat_contracts.mjs
  ```
  Diff command (inline node, in the session log):
  ```
  platform edges 22 gameplay edges 25
  platform only: [ 'BOOT --BOOT_COMPLETE--> TITLE' ]
  gameplay only: [ 'BOOT --BOOTED--> TITLE', 'DECLASSIFIED --RESTART--> TITLE', 'CREDITS --OPEN_SCIENCE--> DECLASSIFIED', 'CREDITS --RESTART--> TITLE' ]
  QUEST_STATES type: platform object | gameplay array
  bus events: platform [ 'QUEST_STATE_CHANGED', 'OPEN_TERMINAL', 'CLOSE_TERMINAL' ] | gameplay emits quest:transition, quest:enter:<S>, quest:reset
  ```
- **Expected:** one table and one event vocabulary. Lane-ownership puts shared contracts and event names in platform, and no-bloat forbids two copies.
- **Actual:** a driver that sends `QUEST_EVENTS.BOOT_COMPLETE` to `createQuestMachine` gets `ok:false` and stays at BOOT. A UI that listens for `QUEST_STATE_CHANGED` never fires. `QUEST_STATES.includes()` and `QUEST_STATES.CLONE_INTRO` each break, depending on which module was imported.
- **Migration (do not fix here):**
  - platform owns `TRANSITIONS`, `QUEST_STATE_LIST`, the event names and the bus event names.
  - gameplay's `state.js` keeps `createQuestMachine` and `commitIsOneShot`, and imports the table from `../contracts.js`. It deletes its own `TRANSITIONS` and `QUEST_STATES`, and runs `commitIsOneShot` on the imported table.
  - Before that, platform needs 3 decisions:
    1. `BOOTED` or `BOOT_COMPLETE`.
    2. Whether `RESTART` and `CREDITS→OPEN_SCIENCE` are edges. Platform's l.35 comment says reset is `resetGame()`, "not a transition".
    3. One bus vocabulary.
  - `dev/gameplay/tests/schema.mjs` duplicates platform's `validateExperimentResult`. Delete it and import platform's instead.
  - `STORY_TOKEN_ID`, `expectedCorrections`, and the result fields `missionRules` reads (`parameters.state`/`senderGate`/`stateId`/`correctionX`/`correctionZ`, `probabilities['receiver=0']`) are cross-lane contract. They should be confirmed in `contracts.js`.
  - **Owner:** platform, then gameplay migrates.

### F2 MEDIUM: re-entrant `send`/`reset` delivers events out of order (`echo/game/state.js:95-112`, `echo/game/eventBus.js:12-19`)
- **Repro:** `node evidence/gameplay-quest-review/a3_robust.mjs /tmp/qr-integ` (parts A, A2, B):
  ```
  A. re-entrant send, order seen by a later subscriber:
      world sees enter:CLONE_INTRO (machine.state=CLONE_INTRO)
      world sees enter:FREE_ROAM_ALLEY (machine.state=CLONE_INTRO)
  A2. transition log seen by 2nd subscriber: BOOT->TITLE , OPENING->FREE_ROAM_ALLEY , TITLE->OPENING
  B. reset inside handler: reset , enter:OPENING delivered while state=TITLE
  ```
- **Expected:** every subscriber sees transitions in the order they happened, and nothing for a state already left. The world-controller applies §9.3 changes on `quest:enter:*`.
- **Actual:**
  - Subscriber 1's nested `send` emits `B→C` before later subscribers receive `A→B`. A later subscriber therefore applies C's world change and then B's, so stale B wins.
  - After a `reset()` from a handler, later subscribers still get `enter:OPENING` after `quest:reset`, which leaves world residue after reset.
  - The worker's test "a listener that sends during quest:enter sees the new state" checks only the *sender*. A driver will call `send` from handlers at exactly the auto-advance points (`FINISHED` at cutscene end, `ANIMATION_END`).
- **Fix:** run-to-completion in `createQuestMachine`.
  - A `send` or `reset` called during an emit is queued and drained after the outer emits finish.
  - Queued sends are validated at dequeue time.
  - Add a two-subscriber ordering test, written red first.
  - **Owner:** gameplay.

### F3 MEDIUM: the stale-result guard is ABA-blind across reset (`dev/gameplay/devTerminal.js:45-48`; no session id in `state.js`)
- **Repro:** `a3_robust.mjs` part D. It starts a clone in CLONE_INTRO, then calls `reset()` and replays START, SKIP and OPEN_CLONE_BOOTH while the call is still in flight:
  ```
  D. stale result from the PREVIOUS session: guard says stale=false; applied -> state CLONE_BASIS_PASSED
  ```
- **Expected:** a result started before `reset()` is dropped.
- **Actual:** `machine.state !== askedIn` is false because the state name is the same, so the result is applied. A first Pyodide call can take seconds, so a quick player can reach this. Every real terminal that copies the devTerminal guard inherits the bug.
- **Fix:**
  - The machine exposes a monotonic `epoch`, bumped on every transition and on `reset()`.
  - Terminals capture it before the await and compare it after.
  - Delete the state-name compare.
  - **Owner:** gameplay; terminal owners adopt it.

### F4 MEDIUM: the story token is one-shot only at the FSM edge, not at the measurement (`missionRules.js:54-58`, `fakeQuantum.js:170`, `devTerminal.js:90-96`)
- **Repro:** `node evidence/gameplay-quest-review/a4_token.mjs /tmp/qr-integ` (part G):
  ```
  G. story_token teleport #1: fidelity=0.430028356853 -> rule in TELEPORT_DRY_RUN_PASSED: {"event":null,...}; fact: "The source qubit was measured, so the original is gone: one of one."
  G. story_token teleport #2: ... same
  G. story_token teleport #3: ... same
  ```
- **Expected (§7.4 l.507):** "Do not let the player re-run teleportation of the same already-measured unknown token after a failure."
- **Actual:**
  - Nothing latches the token.
  - In `TELEPORT_DRY_RUN_PASSED`, a commit whose result is refused or throws leaves COMMIT live. The devTerminal says "Nothing changed; try again." Pressing again is a second measurement.
  - The FSM has no edge for a failed commit.
  - The fake's injected failure rejects *before* computing, which hides this. A real adapter that fails after measuring (e.g. in the `.toJs()` conversion) would not.
- **Fix:**
  - Add a `storyTokenConsumed` latch in the adapter, set before the commit circuit runs (quantum).
  - Disable COMMIT on the first press regardless of outcome (gameplay terminal).
  - Add a failed-commit path; this needs a ruling (Q1).

### F5 MEDIUM: a wrong correction shows "fidelity 1" on 5 of the 6 dev calibration states (`devTerminal.js:7`)
- **Repro:** `a2_physics.py` (Qiskit `state_fidelity`) and `a4_token.mjs` part I:
  ```
  WRONG corrections that still score fidelity 1: 20   (zero, one, plus, minus, phase: 4 each; bloch: 0)
  I. calibration plus, m0=0 m1=0, chose X (wrong): fidelity shown=1; verdict={"event":null,"reason":"corrections do not match m0=0, m1=0"}; facts[1]="Receiver state fidelity with the original: 1."
  ```
  This is physics, not a fake bug: a wrong Pauli on its own eigenstate is only a global phase.
- **Answer to the worker's open question:** the *rule* handles it. It checks the corrections before the fidelity, and I verified that on all 20 cases.
- **But the screen contradicts vision l.263:** "Incorrect corrections show reduced state fidelity". The player sees "fidelity 1" next to "no progress".
- **Fix:** calibrate only on states that are not an eigenstate of X, Z or XZ, or report fidelity on a generic probe. **Owner:** quantum and gameplay (terminal). Q2.

### F6 LOW: `eventForResult` throws instead of returning `{event:null, reason}` (`missionRules.js:16,28,64`)
- **Repro:** `a3_robust.mjs` part E:
  ```
  E. bits as strings: THROWS invalid bits
  E. parameters null: THROWS Cannot read properties of null (reading 'state')
  ```
  `typeof null === 'object'` passes the l.64 guard.
- **Fix:** guard against null parameters and bad bits and return a reason; or run platform's `validateExperimentResult` first. **Owner:** gameplay.

### F7 LOW: the no-signalling rule reads only `receiver=0` (`missionRules.js:44-45`)
- **Repro:** part E: `{'receiver=0':0.5,'receiver=1':0.9}` returns `ATTEMPT_NO_SIGNALLING`.
- **Fix:** validate with platform's guard (sum within `PROBABILITY_TOLERANCE`), or check both marginals. **Owner:** gameplay.

### F8 LOW: the doc parser skips an unparseable row instead of failing (`dev/gameplay/tests/spec.mjs:29-31`)
- **Repro:** `evidence/gameplay-quest-review/a5_spec_indent.sh /tmp/qr-integ`. It edits a `mktemp` copy of the doc only (law 10):
  ```
  indent=4 spaces: ℹ pass 36 ℹ fail 0     <- new edge TELEPORT_DRY_RUN --ABORT--> LINK_REPAIRED silently ignored
  indent=2 spaces: ℹ pass 34 ℹ fail 2     <- same edge, doc's own indent: caught
  ```
- **Expected:** "A missing input is a FAILURE, never a skip" (gate-independence, In practice).
- **Fix:** inside the block, only the `const transitions = {` and `};` lines may be skipped. Any other non-blank line that does not match throws. **Owner:** gameplay (tests).

### Claim verified: "tests parse ground truth from the vision bytes"
**TRUE, except F8.** `spec.mjs` never imports `state.js`. My separate Python parser (`a1_table.py`, a different regex) agrees:

```
doc states 21 code states 21 equal-ordered True
doc edges 20 code edges 25
in doc not code: []
in code not doc: [BOOT-BOOTED, CREDITS-OPEN_SCIENCE, CREDITS-RESTART, DECLASSIFIED-OPEN_CREDITS, DECLASSIFIED-RESTART]
```

The 5 extras are the hard-coded `BRIEF_EDGES`. Their only source is the consult-1 brief, and platform's table disagrees with 4 of them (F1).

## Nulls: attacks that did NOT break
| attack | result |
|---|---|
| Table vs doc, independent parser | equal; 0 unreachable states, 0 dead ends, 0 unknown targets |
| 1000 runs × 300 steps (60% legal-biased; junk `__proto__`/`constructor`/`toString`/`''`/`null`/`42`; random `reset()`) | **0 violations**: no invalid state, no emit on a refused event, ≤1 COMMIT per session, and every one of 8586 COMMITs preceded by all 14 mission states in order |
| Fuzz positive control: planted skip edge `FREE_ROAM_ALLEY --OPEN_ROOFTOP--> ROOFTOP_UNLOCKED` (disposable copy) | **6054 violations** (`out-a3_fuzz_control.txt`), so the fuzz bites. My first fuzz run reported 6733 violations on the clean code. That was my harness not treating `RESTART→TITLE` as a new session; I fixed the harness, not the code. |
| Throwing listener | caught; transition completes; the later listener runs; reported via `onError` |
| Cloning F/purity: \|0>,\|1> → 1/1; \|+> → 0.5/0.5; phase → 0.25/0.5 | equal to Qiskit `state_fidelity` / `partial_trace().purity()` |
| Bell marginal, sender I/X/Z | Qiskit: Bob's ρ = I/2 for all three; fake P0 = 0.5 |
| Teleport: 7 states × 4 branches × 4 choices (112) | fake = Qiskit within 1e-9; every correct choice gives F=1; branch probability 0.25; m0 = q0 source, m1 = q1 Bell half; X iff m1, Z iff m0 |
| Story token in calibration | refused by `TELEPORT_DRY_RUN` |
| Re-commit through the FSM | impossible (`commitIsOneShot`, fuzz) |
| `echo/` imports `dev/`; forbidden APIs | `echo/game/*.js` have **no import statements at all**; grep for storage/fetch/XHR/WebSocket/Worker/`backend`/`node:`/`process.` is empty |
| Fake honesty | every result has `engine:'documented_preview'`; the backend stub says "no backend job was run" and refuses a 2nd call. Caveat: `facts` and `circuitDescription` carry no "preview" wording, so a UI that renders facts without the engine badge would look like Qiskit. Story-ui must always show the engine. |
| Double-click COMMIT (devTerminal) | refused synchronously by `busy` |

## What I changed (branch `lane/gameplay/gameplay-quest-review`)
- `evidence/gameplay-quest-review/`: `a1`–`a5` attack scripts plus `README.md` (how to re-run) plus `out-*.txt` (measured at d5ec620). All of them only read the code under test.
- `vault/Reports/quest-core-adversarial-review.md`: the durable findings. Hubs are not regenerated.
- **No product files touched.** All runs used `/tmp/qr-integ` (detached worktree @ d5ec620) or `mktemp` copies.

## What I did NOT do / could not verify
- No browser run: all findings are module logic, exercised through node on the same modules the harness loads.
- Nothing ran on Qollab.
- In F4, the case where a real adapter fails after measuring is reasoned from the contract. No real adapter exists yet. What I observed is that the token is unlatched and the FSM has no failed-commit edge.
- I did not check the `lane/quantum/*` branches for a calibration-state list.

## Questions for the owner
1. **A commit fails** after the story token was measured (bridge error or rejected result). What should the player see? Options:
   - a "transfer lost, restart" ending;
   - a scripted recovery with no second measurement;
   - something else.

   §7.4 forbids a retry, and the FSM has no edge for this (F4).
2. **Calibration states:** l.263 promises that wrong corrections show reduced fidelity. Should the dry run use only generic (non-Pauli-eigenstate) states? Or keep |0>/|+>/… and explain why they show 1? (F5)
3. **How many correct calibrations unlock COMMIT?** Today one correct result is enough. With bits 00 the passing answer is "change nothing" (`a4_token.mjs` part H: `CORRECT_CALIBRATION`). `CLAUDE.md` says "make all four conditional correction choices", and §7.4 says the dry run proves "a conditional correction rule". Should it require all 4 branches, or at least one non-trivial branch?

## What the supervisor should do next
1. Raise **F1** with platform via owner-answers before world-controller codes against either table. Decide on one table, one bus vocabulary, and `BOOTED` vs `BOOT_COMPLETE`. Then gameplay imports from `contracts.js` and deletes its own copy.
2. Commission a gameplay fix for **F2 + F3**: a run-to-completion queue and an `epoch` in `createQuestMachine`. Its gate is `a3_robust.mjs` parts A, B and D, recast as tests and written red first.
3. Send **F4**'s latch (`storyTokenConsumed`, set before the commit circuit) to quantum. Put Q1–Q3 to the owner.
4. Fold **F6–F8** into the same gameplay fix. On the fix tip, re-run `evidence/gameplay-quest-review/*`: parts A, B, D and E, and `a5`, should flip.
