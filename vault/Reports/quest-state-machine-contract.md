---
type: report
status: outdated
outdated_reason: "quest:transition/quest:enter/BOOTED API superseded (contracts migration, then the v2 port) — see [[Reports/world-v2-port]]"
date: 2026-10-09
updated: 2026-10-09
lane: gameplay
---

# Quest state machine contract (echo/game) — what the world and the UI code against

The quest is one frozen transition table in `echo/game/state.js` (vision §9.1 states, §9.2 edges, plus `BOOT -BOOTED-> TITLE`, `DECLASSIFIED <-> CREDITS` and `RESTART -> TITLE` from both). Measured on branch `lane/gameplay/gameplay-quest-core` @ 6b65694: `node --test 'dev/gameplay/tests/*.test.mjs'` → 36 pass, exit 0.

## API (frozen; names do not change)

- `createEventBus({onError?})` → `{ on(type, fn) → off, emit(type, payload) }`. Synchronous; a throwing listener is reported and skipped; a listener added mid-emit waits for the next emit.
- `createQuestMachine(bus)` → `{ state, send(event) → {ok, state, reason?}, can(event), reset() }`. Starts in `BOOT`.
  - Success emits, in order, `quest:transition {from,to,event}` then `quest:enter:<TO>` (same payload). State is updated *before* emitting, so a listener that calls `send` acts on the new state.
  - Invalid, repeated or unknown events (including `'__proto__'`, `'constructor'`) return `ok:false` and emit **nothing**.
  - `reset()` from any state → `TITLE`, emits only `quest:reset {from, to:'TITLE'}` (not `quest:enter:TITLE`). Listeners on `quest:reset` own resetting player, terminals, flags, camera, audio, UI (§9.5).
- `TRANSITIONS`, `QUEST_STATES` are frozen; mutation throws.
- `commitIsOneShot(table)` — structural proof: one `COMMIT_TRANSFER` edge, and its source is unreachable from its target without passing `TITLE`. Run at module load; a table that violates it refuses to import.
- `echo/game/missionRules.js`: `eventForResult(state, result) → {event|null, reason}` maps an `ExperimentResult` to the mission event, `expectedCorrections(m0, m1)` (§10.6), `STORY_TOKEN_ID = 'story_token'`. Terminals send only what this returns.
- `echo/game/objectives.js`: `objectiveFor(state)` → objective id (`obj.*`). Text is story-ui's.

## Findings worth keeping

- **Fidelity alone cannot judge corrections.** For |0>, a spurious Z is a global phase: fidelity 1 with the wrong choice. `eventForResult` requires corrections == rule(bits) AND fidelity ≥ 0.999999. A calibration that cycles basis states would otherwise accept a wrong answer.
- **Sender gate on either Bell half is indistinguishable** in the receiver marginal and the Z-basis agreement (sabotage S19 stayed green; correct physics, not a test gap).
- A dev "press 5×" button that sent the next *legal* event skipped an experiment in the browser run — a harness that sends bare quest events is itself a skip path. The harness now only repeats the last accepted event.
- §8.4's `QuantumEngine` has no call that returns Bell bits before the player picks corrections, and no commit call. The dev fake adds `sampleBellBits()` and reuses `teleportDryRun('story_token', …, liveBits)` for the commit; the real adapter needs an agreed shape.

Evidence: `evidence/gameplay-quest-core/` (red-before, green, sabotage table, headless playthrough + PNGs).

## Addendum 2026-10-10: a commit refused after measurement is not a dead end (branch `lane/gameplay/gameplay-commit-fault-exit`)

- **Before:** a commit result that came back and was refused latched the commit. The quest then sat in `TELEPORT_DRY_RUN_PASSED` with COMMIT disabled and nothing else to do, a soft-lock at the climax (`evidence/gameplay-contracts-migration/playthrough/11-commit-measured-but-refused-latched.png`).
- **Ruling** (supervisor, consult 4, from §7.4 l.507, §9.5 and §12.3): the receiver applies X/Z inside the one atomic call, so a refusal there can only be an engine fault after measurement. The token is spent and COMMIT never re-arms. The honest way on is `resetGame()`.
- **API added:** `COMMIT_STATUS.MEASURED_REFUSED === 'measured_refused'` (renamed from the old "…awaiting ruling" name). `machine.commitFault` is `null`, or a frozen `{ tokenConsumed: true, verified: false, reason, result, restartOffered: true }` while the latch is `measured_refused`. `resetGame()` clears it, along with the epoch bump and the IDLE latch. An errored call (nothing measured) leaves it `null` and stays retryable.
- **For story-ui:** when `commitFault` is set, show a scientific-module error saying the story token was measured and consumed, that verification failed, and `fault.reason`. Offer RESTART, which calls `machine.resetGame()`. The dev stub is `dev/gameplay/devTerminal.js` `faultPanel()`.
- **Measured** on this branch: `node --test 'dev/gameplay/tests/*.test.mjs'` gives 56 pass, exit 0. The harness playthrough exits 0, and engine commit calls per session are `{"0":2,"2":1,"3":1}`: session 0 is one errored call plus its retry; the fault session and the session after RESTART make one call each. Sabotage: removing the RESTART offer (machine or terminal) or re-arming COMMIT (machine or terminal) turns the playthrough red each time. The unit tests catch only the machine-side two. Evidence: `evidence/gameplay-commit-fault-exit/`.
