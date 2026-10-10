# ECHO shared contracts

`echo/contracts.js` is the one platform-owned definition of how the game talks to itself. Every lane
imports names from it. Do not retype the strings yourself.

```js
import { QUEST_STATES, QUEST_EVENTS, transition, RESET_STATE, EVENT_SOURCES, BUS_EVENTS, WORLD_CHANGES,
         INTERACTABLE_IDS, INTERACTABLE_BINDINGS, ENGINE_KINDS, EXPERIMENTS,
         validateExperimentResult, marginalProbabilities, BELL_RECEIVER_QUBIT,
         validateTeleportBitsRequest, validateTeleportBitsResult, makeCorrectionRequest,
         validateTeleportCorrectionResult, dryRunVerdict, randomGenericState, BIT_LABELS,
         UI_ROOT_ID, UI_HOOKS, DEFAULT_SETTINGS, validateSettings,
         MOMENT_EVENTS, COUNTDOWN_START_SECONDS, countdownRemaining } from './contracts.js'
// from echo/main.js; '../contracts.js' from echo/game/
```

The module has no dependencies, no top-level `import.meta` and no dynamic `import()`, so it survives
Qollab's Babel CommonJS transform.

Qollab's docs say `main.js` "can import your other JavaScript files with `./` paths"
(https://qollab.xyz/learn/docs/js-qiskit-projects). The file's location is provisional (an owner
question). If it moves, only the import paths change.

Owner rulings are cited by their heading in the platform lane's `owner-answers.md`, all dated 2026-10-10:
"13 questions" = "13 lane design questions"; "red-team #n" = "red-team physics ambiguities + captions";
"gameplay consult 3" = "overseer rulings from the docs — gameplay consult 3"; "relay" = "overseer relay from story-ui".

## The rule: a wrong name fails loudly

- Every name table (`QUEST_STATES`, `QUEST_EVENTS`, `BUS_EVENTS`, `INTERACTABLE_IDS`, `ENGINE_KINDS`,
  `EXPERIMENTS`, `INTERACTABLE_BINDINGS`, `EVENT_SOURCES`, `UI_HOOKS`) is frozen, and a **misspelt lookup throws**:
  `QUEST_STATES.CLONE_UNDERSTOD` throws a `TypeError` that lists the known names.
- `transition(state, event)` **throws** on an unknown state or event (a bug in your code). For a known
  event that is not valid right now (e.g. pressing E twice), it returns `{ ok: false, state, reason }`
  and leaves the state unchanged. On success it returns `{ ok: true, state: next, reason: null }`.
- `validateExperimentResult(obj)` returns a list of error strings, and `[]` means valid. It never throws.
  Call it on every bridge result before the UI touches it. If it returns errors, show the §12.3
  "scientific module error" state. Never show invented numbers.

## Quest machine (vision §9.1 / §9.2)

`INITIAL_STATE = 'BOOT'`. The happy path, as verified by `tools/contract-check/check.mjs`:

`BOOT -BOOT_COMPLETE→ TITLE -START→ OPENING -FINISHED|SKIP→ FREE_ROAM_ALLEY -OPEN_CLONE_BOOTH→ CLONE_INTRO
-BASIS_DEMO_OK→ CLONE_BASIS_PASSED -SUPERPOSITION_DEMO_FAILED→ CLONE_SUPERPOSITION_FAILED -EXPLANATION_READ→
CLONE_UNDERSTOOD -EXIT_BOOTH→ RELAY_UNLOCKED -REACH_RELAY→ RELAY_INTRO -PREPARE_BELL_PAIR→ RELAY_BELL_CREATED
-ATTEMPT_NO_SIGNALLING→ RELAY_SEND_FAILED -VIEW_RECEIVER_MARGINAL→ RELAY_UNDERSTOOD -OPEN_ROOFTOP→
ROOFTOP_UNLOCKED -REPAIR_CLASSICAL_LINK→ LINK_REPAIRED -RUN_DRY_TEST→ TELEPORT_DRY_RUN -CORRECT_CALIBRATION→
TELEPORT_DRY_RUN_PASSED -COMMIT_TRANSFER→ TELEPORT_COMMITTED -ANIMATION_END→ ENDING -OPEN_SCIENCE→
DECLASSIFIED -OPEN_CREDITS→ CREDITS` (ENDING can also go `-OPEN_CREDITS→ CREDITS` directly).

**Additions beyond the §9.2 sample**, all accepted by the owner (owner-answers 2026-10-10, "13 lane design questions" #1, #12):
- `BOOT -BOOT_COMPLETE→ TITLE`. §9.1 requires BOOT and §3.4 flows BOOT → TITLE, but §9.2 has no BOOT row.
- `DECLASSIFIED -OPEN_CREDITS→ CREDITS`. §3.4 flows DECLASSIFIED → CREDITS.
- `DECLASSIFIED -CLOSE_SCIENCE→ ENDING`: back out of the science panel.
- `ENDING -RESTART→ TITLE`: the ending screen offers RESTART directly.

**Restart.** `RESET_STATE = 'TITLE'`. Both restarts (ENDING's RESTART edge, and the pause menu's
`onRestart`) run gameplay's `resetGame()` (§9.5): quest state, player, terminals, flags, camera,
audio and UI. Both land on `RESET_STATE`. A restart starts a new session, so the new session's
story token is a fresh one (§9.5). It is not a second use of the consumed token.

Retries stay in the same state and are not transitions. This covers wrong corrections in
`TELEPORT_DRY_RUN`, the "increase voltage" choice, and hints. Use progress flags for those (§9.2: not
every incidental thing belongs in the machine). CREDITS is terminal. COMMIT_TRANSFER cannot fire
twice (§7.4: the story token is consumed once).

### Who fires each event: `EVENT_SOURCES`

`EVENT_SOURCES[event]` is `{ lane, via }`. The gate holds the four the owner ruled (13 questions #6).
It also holds every interactable action to gameplay `interactable`. The rest are inferred from the vision
(see the report's decisions).

| via | lane | events |
|---|---|---|
| `boot` | platform | BOOT_COMPLETE (main.js, once Pyodide and the scene are ready) |
| `menu` | story-ui | START, OPEN_SCIENCE, CLOSE_SCIENCE, OPEN_CREDITS, RESTART |
| `dialogue` | story-ui | FINISHED, SKIP (opening) |
| `terminal_acknowledgement` | story-ui | **EXPLANATION_READ, VIEW_RECEIVER_MARGINAL** (owner): only after the result panel was on screen (13 questions #13) |
| `world_trigger` | gameplay | **EXIT_BOOTH, OPEN_ROOFTOP** (owner): movement through a trigger volume |
| `interactable` | gameplay | OPEN_CLONE_BOOTH, REACH_RELAY, REPAIR_CLASSICAL_LINK, RUN_DRY_TEST (E at an `INTERACTABLE_BINDINGS` id) |
| `experiment_result` | gameplay | BASIS_DEMO_OK, SUPERPOSITION_DEMO_FAILED, PREPARE_BELL_PAIR, ATTEMPT_NO_SIGNALLING, CORRECT_CALIBRATION, COMMIT_TRANSFER: read from a validated result, never from a button |
| `cinematic` | gameplay | ANIMATION_END (the commit sequence finished) |
| `moment` | gameplay → story-ui | the five moments below except `countdown_zero` |
| `countdown` | gameplay → story-ui | `countdown_zero` |

### Moments: `MOMENT_EVENTS` (overseer relay, 2026-10-10)

A moment is a story beat that does **not** change the quest state. Gameplay fires it on the bus; story-ui
plays the lines its `echo/data/story.js` `MOMENTS` keys by the same id. `EVENT_SOURCES[id]` is
`{ lane: 'gameplay', via, consumer: 'story-ui' }`; quest events carry no `consumer`. `transition()` throws
on a moment id (it is not a quest event), so a moment can never move the machine.

| id | gameplay fires it when | source |
|---|---|---|
| `clone_increase_voltage` | the player picks "increase voltage" after CLONE_SUPERPOSITION_FAILED (§4.2 Beat 3) | relay |
| `relay_bay_cable` | the amber cable in the relay bay is reconnected (§4.3 Beat 3) | relay |
| `teleport_commit_locked` | COMMIT is pressed before a dry run unlocked it (§7.4) | relay |
| `teleport_dry_run_failed` | `dryRunVerdict(...).passed` is false; the next dry run uses a fresh `randomGenericState()` | relay |
| `teleport_dry_run_00` | `passed` but not `unlocksCommit` (bits 00: no correction was needed) | story-ui `MOMENTS` key |
| `countdown_zero` | `countdownRemaining()` first returns 0; fire it once | story-ui `MOMENTS` key |


## Bus events and world changes (§8.7, §9.3)

| `BUS_EVENTS` | payload | source |
|---|---|---|
| `QUEST_STATE_CHANGED` | `{ from, to, event }` | **added**: the machine emits it after every `ok` transition; §9.3 consequences hang off it |
| `OPEN_TERMINAL` | `{ id }` (an `INTERACTABLE_IDS` value) | §8.7 verbatim |
| `CLOSE_TERMINAL` | `{ id }` | **added**: §6.6 says "Escape backs out", and movement must resume (§8.7 pauses it) |

`WORLD_CHANGES[state]` lists the §9.3 consequences of **entering** that state. Gameplay fires them on
`QUEST_STATE_CHANGED`, and art implements each id. Every one must be idempotent.

| state | ids |
|---|---|
| CLONE_UNDERSTOOD | `booth_indicator_red_fades`, `corridor_door_opens`, `objective_target_glows` |
| RELAY_BELL_CREATED | `cyan_conduit_illuminates`, `reactor_audio_begins` |
| RELAY_UNDERSTOOD | `amber_schematic_visible`, `rooftop_access_unlocked` |
| LINK_REPAIRED | `amber_light_travels_to_skyline_node` |
| TELEPORT_COMMITTED | `capsule_source_indicator_off`, `vault_status_green`, `city_lighting_wave`, `music_swell`, `ending_dialogue` |

## Narrative countdown (overseer relay, 2026-10-10)

The HUD's `GRID SHUTDOWN` clock (§6.3) holds at 00:00, is never negative, and is never a game-over (§1
anti-goals: "no game-over resulting from a non-pausing timer").

- `countdownRemaining(startSeconds, elapsedSeconds)` returns whole seconds in `[0, startSeconds]`. It rounds up,
  so 00:00 appears only when time is truly out. It is computed from elapsed time and never decremented, so
  replaying an event cannot drive it negative (§9.3 idempotence). NaN, a non-number or a negative/non-finite
  start throws; `Infinity` elapsed gives 0.
- `COUNTDOWN_START_SECONDS = 720` (12:00). This is a platform design value, not owner-ruled, and the gate pins it. §6.3 shows
  08:42 at the relay (mission 2), so the start must exceed 522 s.
- At 0, gameplay fires the moment `countdown_zero` once. No quest event comes from the countdown, and §9.1 has no
  failure state. story-ui's `formatCountdown` turns the seconds into `MM:SS`.

```js
hud.setCountdown(countdownRemaining(COUNTDOWN_START_SECONDS, elapsed))  // elapsed: gameplay's own clock
```

## Interactables (§9.4)

| id | opens in | fires | note |
|---|---|---|---|
| `copy_booth` | FREE_ROAM_ALLEY | OPEN_CLONE_BOOTH | §9.4; this is the clone booth ("REPLICATION BOOTH") |
| `relay_core` | RELAY_UNLOCKED | REACH_RELAY | §9.4 |
| `classical_socket` | ROOFTOP_UNLOCKED | REPAIR_CLASSICAL_LINK | §9.4 |
| `teleport_terminal` | LINK_REPAIRED | RUN_DRY_TEST | **added**: the rooftop transmission console (§4.4, §6.5), which §9.4 omits |

Positions and labels belong to `data/` and `scene/`, not here.

## ExperimentResult: what the quantum lane's Python must return

Every bridge function (`cloning.run_calibration`, `entanglement.receiver_statistics`,
`teleportation.*`, `qollab_job.*`) returns **one plain dict** in this shape. Keys are camelCase and
identical in Python and JS.

```python
{
    "experiment": "cloning" | "bell_signalling" | "teleportation" | "backend_verification",  # required
    "engine": "exact_qiskit_local" | "qollab_selected_backend" | "documented_preview",  # required
    "circuitDescription": str,      # required, non-empty, e.g. "H(q0); CX(q0,q1)"
    "qubits": int,                  # required, >= 1: total qubits in the circuit
    "parameters": {str: str|int|float|bool},   # required (may be {}); inputs, flat, no nesting
    "facts": [str, ...],            # required, NON-EMPTY: player-facing true statements
    "probabilities": {bitstring: float},  # optional; exact; sums to 1 ± 1e-9; each in [0, 1]
    "counts": {bitstring: int},           # optional; sampled shots; non-negative ints
    "keyQubits": [int, ...],        # REQUIRED iff probabilities or counts present (see below)
    "fidelity": float,              # optional, in [0, 1] (1 + 1e-9 float rounding tolerated)
    "observables": {str: float},    # optional; exact derived numbers, e.g. {"purityQ0": 0.5}
    "measurementBits": {"m0": 0|1, "m1": 0|1},  # teleportation only; both keys, ints, nothing else
    "createdAt": str,               # optional, ISO 8601
}
```

**Engine rules.** These are enforced because counts and exact probabilities are different kinds of
evidence. The validator decides from the result's own `experiment` and `engine` fields. It never trusts a flag.
- `counts` appear **only** under `qollab_selected_backend`. Neither `exact_qiskit_local` nor `documented_preview`
  may carry them (owner, 13 questions #3).
- `exact_qiskit_local` is `Statevector`/`DensityMatrix`/`partial_trace`/`state_fidelity`.
- `qollab_selected_backend` **must** carry `counts` and never carries `probabilities`. It is used **only** with
  `experiment: "backend_verification"`, and that experiment uses only that engine. This is the one
  `backend.run` of a run, and `parameters.shots` must be `BACKEND_SHOTS` (256, the requested
  number; the counts may total slightly less on IonQ's noisy path).
- **Mission 2 (`bell_signalling`) is EXACT only** (owner, red-team #4). It requires `engine: "exact_qiskit_local"`,
  `probabilities` (no counts), and `keyQubits` that include the receiver `BELL_RECEIVER_QUBIT` (q1). Read the
  receiver panel with `marginalProbabilities(result, BELL_RECEIVER_QUBIT)` → `{0: 0.5, 1: 0.5}`. Label it EXACT.
- `documented_preview` is a non-authoritative fallback, and its `facts` must say so (§8.4). It may not stand
  in for Mission 2 or the dry run.
- `measurementBits` belong to `teleportation` only.

**`keyQubits`: the endianness guard (§7.1).** It lists which qubit each character of a probabilities
or counts key is, left to right. Qiskit's keys are little-endian (highest qubit leftmost), so the
natural values are:
- full 2-qubit register from `Statevector.probabilities_dict()` → `"keyQubits": [1, 0]`; key `"01"` means q1=0, q0=1;
- the receiver-only marginal `sv.probabilities_dict(qargs=[1])` → `"keyQubits": [1]`, keys `"0"`, `"1"`;
- 3-qubit teleportation with only Bob's qubit → `"keyQubits": [2]`.

Every key must be exactly `len(keyQubits)` characters of `0`/`1`. Indices are distinct and `< qubits`.
**Never index a key yourself.** `marginalProbabilities(result, qubit)` returns `{0: p0, 1: p1}` for one
qubit. It throws if that qubit is not in `keyQubits`.

**Measurement bits (§7.1).** `m0` is the source readout (q0) and `m1` is Alice's local Bell-half readout
(q1). Bob applies X iff `m1 == 1` and Z iff `m0 == 1`. Labels on screen are `BIT_LABELS`:
"SOURCE READOUT m0" and "LOCAL BELL-HALF READOUT m1" (owner, red-team #1). Never use "RELAY READOUT".

**Where the §10.x reference outputs go:**

| experiment | probabilities / keyQubits | other fields |
|---|---|---|
| cloning (§10.3) | joint output, `[1, 0]` (e.g. `{"00":0.5,"11":0.5}` for plus) | `observables: {"purityQ0", "purityQ1"}`, `parameters: {"state": "plus"}` |
| bell_signalling (§10.4) | receiver-only marginal, `[1]` | `parameters: {"senderGate": "X"}` |
| teleportation dry run (§10.5/§10.6) | phase 1 optional (branch table, `[1, 0]`) | two phases, see below |
| teleportation story commit (§7.4) | optional (branch table, `[1, 0]`) | `parameters: {"stateId": "story_token", "applyX", "applyZ"}`, `measurementBits`, `fidelity`; see § The one story commit |
| backend_verification (§10.7) | `counts` + `keyQubits`, engine `qollab_selected_backend` | `parameters: {"shots": 256, "backend": <name the backend reports>}` |

Rename §10.3's `circuit` (a text drawing) to `circuitDescription`. `isIndependentCloning` and
`outputPurity*` are not fields: unknown keys are rejected. Purity goes in `observables`, and the verdict goes
in `facts`. Put the text drawing in `circuitDescription` if you want it shown.

## Teleport dry run: two phases (bits first, corrections second)

The player must **see m0 and m1 before choosing X/Z**, or the lesson is fake (owner, red-team #2).
The dry run is therefore two bridge calls. Each one is checked by its own validator, on top of
`validateExperimentResult`:

| phase | JS sends | Python returns | validator |
|---|---|---|---|
| 1. Bell measurement | `{ theta, phi }`: a fresh generic calibration state `ry(theta)` then `rz(phi)` on q0 (`randomGenericState()`) | ExperimentResult: `experiment "teleportation"`, `engine "exact_qiskit_local"`, `parameters {theta, phi}`, **`measurementBits {m0, m1}`**, **no `fidelity`, no `applyX/applyZ`** | `validateTeleportBitsResult(request, result)` |
| UI | shows `BIT_LABELS.m0 = m0`, `BIT_LABELS.m1 = m1`; player picks X on/off, Z on/off (all four offered) | | |
| 2. correction | `makeCorrectionRequest(phase1Request, phase1Result, { applyX, applyZ })` → `{ theta, phi, m0, m1, applyX, applyZ }` | ExperimentResult: same `measurementBits`, `parameters {theta, phi, applyX, applyZ}`, **`fidelity`** from `state_fidelity` | `validateTeleportCorrectionResult(request, result)` |
| verdict | `dryRunVerdict(request, result)` → `{ passed, unlocksCommit, expected, errors }` | | |

- **The rule** is `expectedCorrections(m0, m1)` → `{ applyX: m1 === 1, applyZ: m0 === 1 }` (§7.1). Use it for UI
  messaging only. The fidelity on screen is always Qiskit's number (§10.6).
- **Generic states only.** A request is refused if any wrong choice would still score above
  `GENERIC_MAX_WRONG_FIDELITY` (0.9). On |0> a spurious Z is only a global phase, so a wrong choice would "pass"
  (owner, 13 questions #7). `TELEPORT_TEST_STATE` is the §10.5 state `{theta: 1.137, phi: 0.44}`.
- **Cross-check, not fabrication.** `validateTeleportCorrectionResult` refuses a fidelity that disagrees by more than
  `FIDELITY_CROSSCHECK_TOLERANCE` (1e-6, the §7.4 band width) + `FIDELITY_EPSILON` (1e-12, float rounding) with the physics of the branch. Bob holds `X^(m1 xor applyX) Z^(m0 xor applyZ)|psi>`, so F is 1, x², z² or y²
  of the Bloch vector. This catches an engine that reports success on a wrong choice. JS never displays the value.
- `passed` needs the rule **and** `fidelity >= FIDELITY_PASS - FIDELITY_EPSILON` (0.999999, §7.4). A correct F of exactly
  0.999999 passes; before contracts-fidelity-band the cross-check refused it by 2.9e-17 of rounding.
  **Migration:** new export `FIDELITY_EPSILON = 1e-12`; no existing value moved. A consumer comparing a fidelity to
  `FIDELITY_PASS` itself should subtract it too, or better, read `dryRunVerdict().passed`. `unlocksCommit` is a pass on bits
  other than 00, so the player really applied X and/or Z (overseer ruling, gameplay consult 3 #2). Fire
  `CORRECT_CALIBRATION` only when `unlocksCommit`. On a failed or 00 pass, retry on a fresh state (13 questions #11).
- `validateTeleportCorrectionResult` checks a result against the bits in its **request**. Build every phase-2
  request with `makeCorrectionRequest`, which takes the bits from a validated phase-1 result. Never type the bits in
  by hand. If an engine echoes `m0`/`m1` in `parameters`, they must equal `measurementBits`.
- The story token never enters a dry run: a phase-1 or phase-2 result with `parameters.stateId === STORY_TOKEN_ID` is
  refused. The single commit is a separate call (overseer ruling, gameplay consult 3 #1), below.
- Python names are the quantum lane's choice. Their inputs and outputs are exactly these shapes.

**Worked example: real Qiskit 2.5.2** (`python3 tools/contract-check/teleport_oracle.py`, state `TELEPORT_TEST_STATE`):

```js
// phase 1 request
{ "theta": 1.137, "phi": 0.44 }
// phase 1 result (abridged circuitDescription)
{ "experiment": "teleportation", "engine": "exact_qiskit_local",
  "circuitDescription": "ry(1.137000) then rz(0.440000) on q0; q0 = source, q1 = local Bell half, q2 = receiver; H(q1); CX(q1,q2); CX(q0,q1); H(q0); measure q0 -> m0, q1 -> m1",
  "qubits": 3, "parameters": { "theta": 1.137, "phi": 0.44 },
  "probabilities": { "00": 0.25, "01": 0.25, "10": 0.25, "11": 0.25 }, "keyQubits": [1, 0],
  "measurementBits": { "m0": 1, "m1": 0 },
  "facts": ["SOURCE READOUT m0 = 1. LOCAL BELL-HALF READOUT m1 = 0.", "One sample drawn from the exact Qiskit branch probabilities; one sample proves nothing on its own."] }
// the player sees m0 = 1, m1 = 0 and chooses; phase 2 requests and the Qiskit fidelity each returns
{ "theta": 1.137, "phi": 0.44, "m0": 1, "m1": 0, "applyX": false, "applyZ": false }  → fidelity 0.176668  (cos²θ: Z missing)
{ "theta": 1.137, "phi": 0.44, "m0": 1, "m1": 0, "applyX": false, "applyZ": true  }  → fidelity 1.0       passed, unlocksCommit
{ "theta": 1.137, "phi": 0.44, "m0": 1, "m1": 0, "applyX": true,  "applyZ": false }  → fidelity 0.149373  (y²)
{ "theta": 1.137, "phi": 0.44, "m0": 1, "m1": 0, "applyX": true,  "applyZ": true  }  → fidelity 0.673960  (x²: X spurious)
```

Branch probabilities are 1/4 each for any input. The bits alone carry nothing about the state.
`teleport_oracle.py` checks all 16 (m0, m1, X, Z) combinations on the test state and on three random generic states.
Fidelity is 1 on exactly the 4 that follow the rule, and at most 0.674 on every other combination.

## The one story commit (§7.4)

One atomic local exact call (owner ruling, gameplay consult 3): fresh live Bell bits on the hidden story token, the
rule applied to THOSE bits by the engine, Qiskit's fidelity. The token is consumed once; the engine latches it only
when the call returns, and gameplay marks it consumed only on success.

| JS sends | Python returns | validator |
|---|---|---|
| nothing about the state (the token is hidden) | ExperimentResult: `experiment "teleportation"`, `engine "exact_qiskit_local"`, **`parameters {stateId: STORY_TOKEN_ID, applyX, applyZ}`** (the corrections the receiver applied; `seed` allowed), **`measurementBits {m0, m1}`**, **`fidelity`**; no `theta`/`phi`; no `counts` | `validateCommitResult(result)` → error list; empty = committed, fire `COMMIT_TRANSFER` |

- **One marker.** `STORY_TOKEN_ID = 'story_token'`, in `parameters.stateId`. Not `parameters.state`, not `'token'`.
  Import the constant; do not retype it.
- **The rule is checked, not trusted.** `applyX`/`applyZ` must equal `expectedCorrections(m0, m1)` (X iff m1=1, Z iff
  m0=1; m0 = SOURCE READOUT, m1 = LOCAL BELL-HALF READOUT). Bits 1,0 with the corrections of 0,1 are refused.
- **The band, with no cross-check behind it.** `fidelity >= FIDELITY_PASS - FIDELITY_EPSILON` (0.999999, §7.4). With the
  rule applied the receiver holds the token whatever it was, so a lower number is a broken engine, not a failed
  attempt: it is refused, never shown as a success (§12.3). The dry run and the commit share one judge (rule + band).
- **The token is never shown.** `parameters.theta`/`phi` on a commit are refused.
- **Real engine, quantum `lane/quantum/integration` c3adf0a:** `live_commit` returns `parameters {state: 'token', seed}`
  with no `applyX`/`applyZ`, so 0/4 branches validate. With the two fields renamed/added (and nothing else) 4/4
  validate (`evidence/platform/contracts-commit/`).

## UI root and settings (overseer relay from story-ui, 2026-10-10)

- `UI_ROOT_ID = "echo-ui"`: `index.html` has one `<div id="echo-ui">` over the canvas, and every story-ui module mounts into it.
- `UI_HOOKS`: the menu API other lanes use.
  - `setPauseAllowed(false)`: called by a terminal that owns Esc.
  - `onRestart`: runs gameplay `resetGame()` and lands on `RESET_STATE`.
  - `onChange(settings, key)`: platform routes `quality` to the renderer and `volume` to audio.
  - `isOpen()`: gameplay releases pointer lock while it is true.
- Settings shape, checked by `validateSettings(s)`, which returns errors and `[]` when valid. Default `DEFAULT_SETTINGS`:

```js
{ captionStyle: 'standard' | 'high-contrast', reducedMotion: boolean, textScale: 100..200 (integer %),
  quality: 'low' | 'med' | 'high', volume: 0..100 (integer) }
```

Captions are **always on** (owner, red-team captions), so there is no `subtitles`/captions on-off field. The
validator rejects one by name. story-ui may start `reducedMotion` from `prefers-reduced-motion`.

**Plain values only.** Cast every number with `float(...)`/`int(...)` and every flag with `bool(...)`.
A numpy array or `np.int64` crosses the bridge as a proxy (only `np.float64` subclasses `float`), and the validator rejects a proxy with a type error.
No complex numbers, NaN or inf.

**On the JS side**, convert with `proxy.toJs({ dict_converter: Object.fromEntries })`. Pyodide's plain
`toJs()` turns a dict into a `Map`, and the validator rejects a Map by name. This is not yet confirmed on
Qollab's Pyodide build; G0 should confirm.

**Checking your output before it reaches JS:**

```bash
python3 -c 'import json,sys; sys.path.insert(0,"echo"); from quantum.cloning import run_calibration; print(json.dumps(run_calibration("plus")))' > /tmp/r.json
node --input-type=module -e "import {validateExperimentResult as v} from './echo/contracts.js'; import {readFileSync} from 'node:fs'; const e=v(JSON.parse(readFileSync('/tmp/r.json','utf8'))); console.log(e); process.exit(e.length?1:0)"
```

`json.dumps` failing is itself a contract failure (a non-plain value). Good and bad examples of every rule
are in `tools/contract-check/fixtures.json`.

## Migrations

What changed between contract revisions, so a lane knows what to edit in its own files.

| revision | change | what a consumer does |
|---|---|---|
| story commit (consult 11, 2026-10-10) | **added** `STORY_TOKEN_ID = 'story_token'` and `validateCommitResult(result)`; a dry-run result carrying `parameters.stateId === STORY_TOKEN_ID` is now refused. Nothing renamed, removed or moved. | **quantum** (`teleportation.live_commit`): emit `parameters {stateId: "story_token", applyX: rule.applyX, applyZ: rule.applyZ}` (plus `seed` if given) instead of `{state: "token"}`. **gameplay** (`missionRules.js`): import `STORY_TOKEN_ID` and `expectedCorrections` from `contracts.js` and delete the local copies; the `TELEPORT_DRY_RUN_PASSED` rule becomes `validateCommitResult(r).length === 0 → COMMIT_TRANSFER`; read `parameters.applyX/applyZ`, not `correctionX/Z`. |
| moments + countdown (consult 9, 2026-10-10) | **added** `MOMENT_EVENTS` (6 ids), `EVENT_SOURCES` entries for them with a new `consumer` field, `COUNTDOWN_START_SECONDS = 720` and `countdownRemaining()`. Nothing renamed, removed or moved. `EVENT_SOURCES` now has 29 keys (23 quest events plus 6 moments). | **gameplay:** emit moments with `MOMENT_EVENTS.<id>`, not string literals, and drive the HUD from `countdownRemaining`. **story-ui:** keep `MOMENTS` keys equal to `MOMENT_EVENTS`; no other change. Code that iterates `EVENT_SOURCES` as if it held only quest events filters with `!s.consumer` or uses `QUEST_EVENTS`. |
| fidelity band (504666f) | **added** `FIDELITY_EPSILON = 1e-12`; nothing moved (see § Teleport dry run) | compare a fidelity to `FIDELITY_PASS - FIDELITY_EPSILON`, or read `dryRunVerdict().passed` |
| v2 (7f36522, 340f45d) | **added** RESTART / CLOSE_SCIENCE edges, `EVENT_SOURCES`, `backend_verification`, the two-phase dry run, `UI_ROOT_ID` / `UI_HOOKS` / settings | adopt the two-phase dry-run calls; Mission 2 is `exact_qiskit_local` only |

## Changing a contract

Only the platform lane edits `echo/contracts.js` and this file (`.claude/rules/lane-ownership.md`).
To change a name, field or transition:
1. Put the request in your report under "requests to platform": what, why, and the vision § it serves.
2. Platform changes `contracts.js`, `tools/contract-check/check.mjs` and its fixtures in one commit, and
   runs `node tools/contract-check/check.mjs` (green) and `python3 tools/contract-check/sabotage.py`.
   A new or removed export also updates the gate's `EXPECTED_EXPORTS` and adds a row to § Migrations.
3. Every lane is told in its `owner-answers.md`.

Do not shadow a name locally (`const STATES = {...}` in your own file). That is exactly the drift this
file exists to prevent.
