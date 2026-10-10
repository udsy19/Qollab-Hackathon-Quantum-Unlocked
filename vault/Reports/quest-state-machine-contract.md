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
