# ECHO shared contracts

`echo/contracts.js` is the one platform-owned definition of how the game talks to itself. Every lane
imports names from it. Do not retype the strings yourself.

```js
import { QUEST_STATES, QUEST_EVENTS, transition, BUS_EVENTS, WORLD_CHANGES,
         INTERACTABLE_IDS, INTERACTABLE_BINDINGS, ENGINE_KINDS, EXPERIMENTS,
         validateExperimentResult } from './contracts.js'   // from echo/main.js; '../contracts.js' from echo/game/
```

Qollab's docs say `main.js` "can import your other JavaScript files with `./` paths"
(https://qollab.xyz/learn/docs/js-qiskit-projects). The file's location is provisional (an owner
question). If it moves, only the import paths change.

## The rule: a wrong name fails loudly

- Every name table (`QUEST_STATES`, `QUEST_EVENTS`, `BUS_EVENTS`, `INTERACTABLE_IDS`, `ENGINE_KINDS`,
  `EXPERIMENTS`, `INTERACTABLE_BINDINGS`) is frozen, and a **misspelt lookup throws**:
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

**Additions beyond the §9.2 sample**, each one also an owner question:
- `BOOT -BOOT_COMPLETE→ TITLE`. §9.1 requires BOOT and §3.4 flows BOOT → TITLE, but §9.2 has no BOOT row.
- `DECLASSIFIED -OPEN_CREDITS→ CREDITS`. §3.4 flows DECLASSIFIED → CREDITS.

Retries stay in the same state and are not transitions. This covers wrong corrections in
`TELEPORT_DRY_RUN`, the "increase voltage" choice, and hints. Use progress flags for those (§9.2: not
every incidental thing belongs in the machine). CREDITS is terminal. Restarting is `resetGame()`
(§9.5), which belongs to gameplay. COMMIT_TRANSFER cannot fire twice (§7.4: the story token is
consumed once).

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
    "experiment": "cloning" | "bell_signalling" | "teleportation",        # required
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
    "measurementBits": {"m0": 0|1, "m1": 0|1},  # optional; both keys, ints, nothing else
    "createdAt": str,               # optional, ISO 8601
}
```

**Engine rules.** These are enforced because counts and exact probabilities are different kinds of evidence.
- `exact_qiskit_local` never carries `counts`. It is `Statevector`/`DensityMatrix`/`partial_trace`/`state_fidelity`.
- `qollab_selected_backend` **must** carry `counts` and never carries `probabilities`. This is the one `backend.run`.
- `documented_preview` is a non-authoritative fallback, and its `facts` must say so (§8.4).

**`keyQubits`: the endianness guard (§7.1).** It lists which qubit each character of a probabilities
or counts key is, left to right. Qiskit's keys are little-endian (highest qubit leftmost), so the
natural values are:
- full 2-qubit register from `Statevector.probabilities_dict()` → `"keyQubits": [1, 0]`; key `"01"` means q1=0, q0=1;
- the receiver-only marginal `sv.probabilities_dict(qargs=[1])` → `"keyQubits": [1]`, keys `"0"`, `"1"`;
- 3-qubit teleportation with only Bob's qubit → `"keyQubits": [2]`.

Every key must be exactly `len(keyQubits)` characters of `0`/`1`. Indices are distinct and `< qubits`.

**Measurement bits (§7.1).** `m0` is the source readout (q0) and `m1` is Alice's local Bell-half readout
(q1). Bob applies X iff `m1 == 1` and Z iff `m0 == 1`.

**Where the §10.x reference outputs go:**

| experiment | probabilities / keyQubits | other fields |
|---|---|---|
| cloning (§10.3) | joint output, `[1, 0]` (e.g. `{"00":0.5,"11":0.5}` for plus) | `observables: {"purityQ0", "purityQ1"}`, `parameters: {"state": "plus"}` |
| bell_signalling (§10.4) | receiver-only marginal, `[1]` | `parameters: {"senderGate": "X"}` |
| teleportation dry run (§10.5/§10.6) | optional | `fidelity`, `measurementBits`, `parameters: {"stateId", "correctionX", "correctionZ"}` |
| selected-backend job (§10.7) | `counts` + `keyQubits` | `parameters: {"shots": 256}` |

Rename §10.3's `circuit` (a text drawing) to `circuitDescription`. `isIndependentCloning` and
`outputPurity*` are not fields: unknown keys are rejected. Purity goes in `observables`, and the verdict goes
in `facts`. Put the text drawing in `circuitDescription` if you want it shown.

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

## Changing a contract

Only the platform lane edits `echo/contracts.js` and this file (`.claude/rules/lane-ownership.md`).
To change a name, field or transition:
1. Put the request in your report under "requests to platform": what, why, and the vision § it serves.
2. Platform changes `contracts.js`, `tools/contract-check/check.mjs` and its fixtures in one commit, and
   runs `node tools/contract-check/check.mjs` (green) and `python3 tools/contract-check/sabotage.py`.
3. Every lane is told in its `owner-answers.md`.

Do not shadow a name locally (`const STATES = {...}` in your own file). That is exactly the drift this
file exists to prevent.
