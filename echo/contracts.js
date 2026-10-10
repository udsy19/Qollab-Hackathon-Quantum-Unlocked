// echo/contracts.js — the platform-owned definition of how ECHO talks to itself.
// Quest states and transitions (vision §9.1/§9.2), who fires each event, bus and world-change names
// (§8.7, §9.3), interactable ids (§9.4), the ExperimentResult shape that crosses the Python bridge
// (§8.4), the two-phase teleport dry run (§7.4, §10.5, §10.6) and the UI root + settings shape.
// Plain ES module, no dependencies. Changes go through the platform lane only: see CONTRACTS.md.

// A frozen name table whose misspelt lookup throws instead of quietly yielding undefined,
// so `QUEST_STATES.CLONE_UNDERSTOD` fails at the call site, not three files later.
function strictTable(name, entries) {
  const target = Object.freeze(Object.fromEntries(entries))
  return new Proxy(target, {
    get(t, prop) {
      // Symbols, 'then' (await/Promise.resolve probes) and 'toJSON' are asked of every object.
      if (typeof prop === 'symbol' || prop in t || prop === 'then' || prop === 'toJSON') return t[prop]
      throw new TypeError(`${name}.${prop} does not exist; known: ${Object.keys(t).join(', ')}`)
    },
  })
}
const nameTable = (name, list) => strictTable(name, list.map(k => [k, k]))

// ------------------------------------------------------------------ quest state machine

// §9.1, verbatim and in order.
export const QUEST_STATE_LIST = Object.freeze([
  'BOOT', 'TITLE', 'OPENING', 'FREE_ROAM_ALLEY',
  'CLONE_INTRO', 'CLONE_BASIS_PASSED', 'CLONE_SUPERPOSITION_FAILED', 'CLONE_UNDERSTOOD',
  'RELAY_UNLOCKED', 'RELAY_INTRO', 'RELAY_BELL_CREATED', 'RELAY_SEND_FAILED', 'RELAY_UNDERSTOOD',
  'ROOFTOP_UNLOCKED', 'LINK_REPAIRED', 'TELEPORT_DRY_RUN', 'TELEPORT_DRY_RUN_PASSED', 'TELEPORT_COMMITTED',
  'ENDING', 'DECLASSIFIED', 'CREDITS',
])
export const QUEST_STATES = nameTable('QUEST_STATES', QUEST_STATE_LIST)
export const INITIAL_STATE = 'BOOT'

// §9.2's table plus the edges CONTRACTS.md § Additions lists: BOOT → TITLE and DECLASSIFIED → CREDITS
// (§3.4 flow), DECLASSIFIED → ENDING and ENDING -RESTART→ TITLE (owner, 2026-10-10). CREDITS is
// terminal. RESTART, like the pause menu's restart, runs gameplay's resetGame() (§9.5) and lands
// on RESET_STATE.
export const TRANSITIONS = Object.freeze(Object.fromEntries(Object.entries({
  BOOT: { BOOT_COMPLETE: 'TITLE' },
  TITLE: { START: 'OPENING' },
  OPENING: { FINISHED: 'FREE_ROAM_ALLEY', SKIP: 'FREE_ROAM_ALLEY' },
  FREE_ROAM_ALLEY: { OPEN_CLONE_BOOTH: 'CLONE_INTRO' },
  CLONE_INTRO: { BASIS_DEMO_OK: 'CLONE_BASIS_PASSED' },
  CLONE_BASIS_PASSED: { SUPERPOSITION_DEMO_FAILED: 'CLONE_SUPERPOSITION_FAILED' },
  CLONE_SUPERPOSITION_FAILED: { EXPLANATION_READ: 'CLONE_UNDERSTOOD' },
  CLONE_UNDERSTOOD: { EXIT_BOOTH: 'RELAY_UNLOCKED' },
  RELAY_UNLOCKED: { REACH_RELAY: 'RELAY_INTRO' },
  RELAY_INTRO: { PREPARE_BELL_PAIR: 'RELAY_BELL_CREATED' },
  RELAY_BELL_CREATED: { ATTEMPT_NO_SIGNALLING: 'RELAY_SEND_FAILED' },
  RELAY_SEND_FAILED: { VIEW_RECEIVER_MARGINAL: 'RELAY_UNDERSTOOD' },
  RELAY_UNDERSTOOD: { OPEN_ROOFTOP: 'ROOFTOP_UNLOCKED' },
  ROOFTOP_UNLOCKED: { REPAIR_CLASSICAL_LINK: 'LINK_REPAIRED' },
  LINK_REPAIRED: { RUN_DRY_TEST: 'TELEPORT_DRY_RUN' },
  TELEPORT_DRY_RUN: { CORRECT_CALIBRATION: 'TELEPORT_DRY_RUN_PASSED' },
  // The story token is consumed once (§7.4): nothing leaves TELEPORT_COMMITTED by COMMIT_TRANSFER.
  TELEPORT_DRY_RUN_PASSED: { COMMIT_TRANSFER: 'TELEPORT_COMMITTED' },
  TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING' },
  ENDING: { OPEN_SCIENCE: 'DECLASSIFIED', OPEN_CREDITS: 'CREDITS', RESTART: 'TITLE' },
  DECLASSIFIED: { OPEN_CREDITS: 'CREDITS', CLOSE_SCIENCE: 'ENDING' },
  CREDITS: {},
}).map(([s, edges]) => [s, Object.freeze(edges)])))

// Where every restart lands: ENDING's RESTART edge and the pause menu's onRestart → resetGame().
export const RESET_STATE = 'TITLE'

// Every event the machine accepts, derived from the table so the two cannot drift.
export const QUEST_EVENTS = nameTable('QUEST_EVENTS',
  [...new Set(Object.values(TRANSITIONS).flatMap(edges => Object.keys(edges)))])

// Which lane fires each event, and from what (owner, 2026-10-10, 13 questions #6: movement events
// come from gameplay world triggers, acknowledgements from story-ui terminals). Interactable actions
// fire on E (INTERACTABLE_BINDINGS); experiment_result events come from gameplay reading a validated
// ExperimentResult, never from a button.
const SOURCE = (lane, via) => Object.freeze({ lane, via })
// A moment is fired by gameplay and consumed by story-ui, which plays the lines keyed by its id.
const MOMENT = (via = 'moment') => Object.freeze({ lane: 'gameplay', via, consumer: 'story-ui' })
export const EVENT_SOURCES = strictTable('EVENT_SOURCES', Object.entries({
  BOOT_COMPLETE: SOURCE('platform', 'boot'),
  START: SOURCE('story-ui', 'menu'),
  FINISHED: SOURCE('story-ui', 'dialogue'),
  SKIP: SOURCE('story-ui', 'dialogue'),
  OPEN_CLONE_BOOTH: SOURCE('gameplay', 'interactable'),
  BASIS_DEMO_OK: SOURCE('gameplay', 'experiment_result'),
  SUPERPOSITION_DEMO_FAILED: SOURCE('gameplay', 'experiment_result'),
  EXPLANATION_READ: SOURCE('story-ui', 'terminal_acknowledgement'),
  EXIT_BOOTH: SOURCE('gameplay', 'world_trigger'),
  REACH_RELAY: SOURCE('gameplay', 'interactable'),
  PREPARE_BELL_PAIR: SOURCE('gameplay', 'experiment_result'),
  ATTEMPT_NO_SIGNALLING: SOURCE('gameplay', 'experiment_result'),
  VIEW_RECEIVER_MARGINAL: SOURCE('story-ui', 'terminal_acknowledgement'),
  OPEN_ROOFTOP: SOURCE('gameplay', 'world_trigger'),
  REPAIR_CLASSICAL_LINK: SOURCE('gameplay', 'interactable'),
  RUN_DRY_TEST: SOURCE('gameplay', 'interactable'),
  CORRECT_CALIBRATION: SOURCE('gameplay', 'experiment_result'),
  COMMIT_TRANSFER: SOURCE('gameplay', 'experiment_result'),
  ANIMATION_END: SOURCE('gameplay', 'cinematic'),
  OPEN_SCIENCE: SOURCE('story-ui', 'menu'),
  CLOSE_SCIENCE: SOURCE('story-ui', 'menu'),
  OPEN_CREDITS: SOURCE('story-ui', 'menu'),
  RESTART: SOURCE('story-ui', 'menu'),
  // MOMENT_EVENTS (below): reactions, never transitions.
  clone_increase_voltage: MOMENT(),
  relay_bay_cable: MOMENT(),
  teleport_commit_locked: MOMENT(),
  teleport_dry_run_failed: MOMENT(),
  teleport_dry_run_00: MOMENT(),
  countdown_zero: MOMENT('countdown'),
}))

// Moments are story beats that do not change the quest state, so transition() rejects them as
// unknown events. Gameplay fires each on the bus; story-ui keys its lines by the same id
// (overseer relay 2026-10-10; the last two are the ids story-ui's data/story.js already uses).
//   clone_increase_voltage   the player picks "increase voltage" after CLONE_SUPERPOSITION_FAILED (§4.2)
//   relay_bay_cable          the amber cable in the relay bay is reconnected (§4.3)
//   teleport_commit_locked   COMMIT pressed before a dry run unlocked it (§7.4)
//   teleport_dry_run_failed  a dry run did not pass; the next one uses a fresh state
//   teleport_dry_run_00      a dry run passed on bits 00, so COMMIT stays locked (dryRunVerdict.unlocksCommit)
//   countdown_zero           countdownRemaining() first reaches 0; fired once, nothing ends
export const MOMENT_EVENTS = nameTable('MOMENT_EVENTS', ['clone_increase_voltage', 'relay_bay_cable',
  'teleport_commit_locked', 'teleport_dry_run_failed', 'teleport_dry_run_00', 'countdown_zero'])

// A wrong NAME throws (a bug at the call site); a right name at the wrong time is refused
// with { ok: false } and the state unchanged (gameplay, e.g. pressing E twice).
export function transition(state, event) {
  if (!Object.hasOwn(TRANSITIONS, state)) {
    throw new TypeError(`transition: unknown quest state ${JSON.stringify(state)}`)
  }
  if (typeof event !== 'string' || !Object.hasOwn(QUEST_EVENTS, event)) {
    throw new TypeError(`transition: unknown quest event ${JSON.stringify(event)}`)
  }
  const next = Object.hasOwn(TRANSITIONS[state], event) ? TRANSITIONS[state][event] : undefined
  if (!next) return { ok: false, state, reason: `${event} is not valid in ${state}` }
  return { ok: true, state: next, reason: null }
}

// ------------------------------------------------------------------ bus and world changes

// Payloads: QUEST_STATE_CHANGED { from, to, event } · OPEN_TERMINAL { id } · CLOSE_TERMINAL { id },
// where id is an INTERACTABLE_IDS value.
export const BUS_EVENTS = nameTable('BUS_EVENTS', ['QUEST_STATE_CHANGED', 'OPEN_TERMINAL', 'CLOSE_TERMINAL'])

// §9.3: what the world does on ENTERING each state. Gameplay fires them on QUEST_STATE_CHANGED;
// art renders them. Each must be idempotent (§9.3): applying one twice changes nothing.
export const WORLD_CHANGES = Object.freeze(Object.fromEntries(Object.entries({
  CLONE_UNDERSTOOD: ['booth_indicator_red_fades', 'corridor_door_opens', 'objective_target_glows'],
  RELAY_BELL_CREATED: ['cyan_conduit_illuminates', 'reactor_audio_begins'],
  RELAY_UNDERSTOOD: ['amber_schematic_visible', 'rooftop_access_unlocked'],
  LINK_REPAIRED: ['amber_light_travels_to_skyline_node'],
  TELEPORT_COMMITTED: ['capsule_source_indicator_off', 'vault_status_green', 'city_lighting_wave',
    'music_swell', 'ending_dialogue'],
}).map(([s, list]) => [s, Object.freeze(list)])))

// ------------------------------------------------------------------ narrative countdown

// The HUD's GRID SHUTDOWN clock (§6.3). It is narrative only: at 00:00 it holds and story-ui plays
// countdown_zero; no quest event comes from it, so it can never end the game (§1 anti-goals: no
// game-over from a non-pausing timer). It is computed from elapsed time, never decremented, so
// replaying an event cannot drive it below zero (§9.3 idempotence).
export const COUNTDOWN_START_SECONDS = 720  // 12:00; §6.3 shows 08:42 by the relay, mission 2

// Whole seconds left, in [0, startSeconds]; rounds up so 00:00 shows only once time is truly out.
export function countdownRemaining(startSeconds, elapsedSeconds) {
  if (!(isFiniteNumber(startSeconds) && startSeconds >= 0)) throw new TypeError(`countdownRemaining: startSeconds must be a finite number ≥ 0, got ${describe(startSeconds)}`)
  if (typeof elapsedSeconds !== 'number' || Number.isNaN(elapsedSeconds)) throw new TypeError(`countdownRemaining: elapsedSeconds must be a number, got ${describe(elapsedSeconds)}`)
  return Math.min(startSeconds, Math.max(0, Math.ceil(startSeconds - elapsedSeconds)))
}

// ------------------------------------------------------------------ interactables

// §9.4 ids, plus the rooftop transmission console (§4.4, §6.5) that §9.4 leaves out.
// The clone booth IS copy_booth (§9.4 labels it REPLICATION BOOTH). Positions and labels are
// data/ and scene/ concerns; this is only what opens in which state with which event.
const BINDINGS = {
  copy_booth: { requiredQuest: 'FREE_ROAM_ALLEY', action: 'OPEN_CLONE_BOOTH' },
  relay_core: { requiredQuest: 'RELAY_UNLOCKED', action: 'REACH_RELAY' },
  classical_socket: { requiredQuest: 'ROOFTOP_UNLOCKED', action: 'REPAIR_CLASSICAL_LINK' },
  teleport_terminal: { requiredQuest: 'LINK_REPAIRED', action: 'RUN_DRY_TEST' },
}
export const INTERACTABLE_IDS = nameTable('INTERACTABLE_IDS', Object.keys(BINDINGS))
export const INTERACTABLE_BINDINGS = strictTable('INTERACTABLE_BINDINGS',
  Object.entries(BINDINGS).map(([id, b]) => [id, Object.freeze(b)]))

// ------------------------------------------------------------------ ExperimentResult (§8.4)

export const ENGINE_KINDS = nameTable('ENGINE_KINDS', ['exact_qiskit_local', 'qollab_selected_backend', 'documented_preview'])
// backend_verification is the one selected-backend job of a run (owner, 2026-10-10, 13 questions #4).
export const EXPERIMENTS = nameTable('EXPERIMENTS', ['cloning', 'bell_signalling', 'teleportation', 'backend_verification'])
export const PROBABILITY_TOLERANCE = 1e-9
export const BACKEND_SHOTS = 256          // owner, 2026-10-10, 13 questions #9
export const BELL_RECEIVER_QUBIT = 1      // Mission 2: q0 = sender, q1 = receiver (§10.4)

// §8.4's fields, plus keyQubits (which qubit each character of a probabilities/counts key is —
// §7.1 forbids parsing bitstrings without an explicit mapping, and Qiskit keys are
// little-endian) and observables (exact derived numbers such as reduced-state purity, which
// §7.2 needs shown and §8.4 has no field for).
const RESULT_FIELDS = new Set(['experiment', 'engine', 'circuitDescription', 'qubits', 'parameters',
  'probabilities', 'counts', 'keyQubits', 'fidelity', 'observables', 'facts', 'measurementBits', 'createdAt'])

function describe(v) {
  if (v instanceof Map) return 'a Map (Pyodide toJs() without { dict_converter: Object.fromEntries })'
  if (v === undefined) return 'nothing'
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'an array'
  return typeof v === 'object' ? `a ${v.constructor?.name ?? 'non-plain'} object` : `${typeof v} ${JSON.stringify(v)}`
}
function isPlainObject(v) {
  if (v === null || typeof v !== 'object') return false
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}
const isFiniteNumber = v => typeof v === 'number' && Number.isFinite(v)

// Returns a list of error strings; empty means valid. Never throws, whatever it is handed.
export function validateExperimentResult(obj) {
  if (!isPlainObject(obj)) return [`result must be a plain object, got ${describe(obj)}`]
  const errors = []
  const err = msg => errors.push(msg)

  for (const k of Object.keys(obj)) if (!RESULT_FIELDS.has(k)) err(`unknown field "${k}"`)

  if (!(typeof obj.experiment === 'string' && Object.hasOwn(EXPERIMENTS, obj.experiment))) {
    err(`experiment must be one of ${Object.keys(EXPERIMENTS).join('|')}, got ${describe(obj.experiment)}`)
  }
  if (!(typeof obj.engine === 'string' && Object.hasOwn(ENGINE_KINDS, obj.engine))) {
    err(`engine must be one of ${Object.keys(ENGINE_KINDS).join('|')}, got ${describe(obj.engine)}`)
  }
  if (typeof obj.circuitDescription !== 'string' || obj.circuitDescription.trim() === '') {
    err(`circuitDescription must be a non-empty string, got ${describe(obj.circuitDescription)}`)
  }
  const qubitsOk = Number.isInteger(obj.qubits) && obj.qubits >= 1
  if (!qubitsOk) err(`qubits must be an integer ≥ 1, got ${describe(obj.qubits)}`)

  if (!isPlainObject(obj.parameters)) {
    err(`parameters must be a plain object, got ${describe(obj.parameters)}`)
  } else {
    for (const [k, v] of Object.entries(obj.parameters)) {
      if (!(typeof v === 'string' || typeof v === 'boolean' || isFiniteNumber(v))) {
        err(`parameters.${k} must be a string, finite number or boolean, got ${describe(v)}`)
      }
    }
  }

  if (!Array.isArray(obj.facts) || obj.facts.length === 0) {
    err(`facts must be a non-empty array of strings, got ${describe(obj.facts)}`)
  } else {
    obj.facts.forEach((f, i) => {
      if (typeof f !== 'string' || f.trim() === '') err(`facts[${i}] must be a non-empty string, got ${describe(f)}`)
    })
  }

  // Exact probabilities and sampled counts are different kinds of evidence (CLAUDE.md). Counts come
  // only from the one selected-backend job; a preview may not dress itself up as sampled data.
  const hasP = obj.probabilities !== undefined
  const hasC = obj.counts !== undefined
  if (hasC && obj.engine !== 'qollab_selected_backend') err(`counts are sampled shots and only allowed under engine qollab_selected_backend, not ${describe(obj.engine)}`)
  if (obj.engine === 'qollab_selected_backend' && hasP) err('probabilities are not allowed under engine qollab_selected_backend (it samples counts)')
  if (obj.engine === 'qollab_selected_backend' && !hasC) err('counts are required under engine qollab_selected_backend')

  // Experiment ↔ engine, decided by the result's own fields, not by a flag it could carry.
  if (obj.engine === 'qollab_selected_backend' && obj.experiment !== 'backend_verification') {
    err(`engine qollab_selected_backend is only for experiment backend_verification (the one selected-backend job), not ${describe(obj.experiment)}`)
  }
  if (obj.experiment === 'backend_verification') {
    if (obj.engine !== 'qollab_selected_backend') err(`experiment backend_verification requires engine qollab_selected_backend, got ${describe(obj.engine)}`)
    if (obj.parameters?.shots !== BACKEND_SHOTS) err(`backend_verification parameters.shots must be the ${BACKEND_SHOTS} requested, got ${describe(obj.parameters?.shots)}`)
  }
  // Mission 2's receiver panel shows EXACT partial_trace probabilities only (owner, 2026-10-10, red-team #4).
  if (obj.experiment === 'bell_signalling') {
    if (obj.engine !== 'exact_qiskit_local') err(`experiment bell_signalling is shown as EXACT and requires engine exact_qiskit_local, got ${describe(obj.engine)}`)
    if (!hasP) err('experiment bell_signalling requires exact probabilities (the receiver marginal)')
    else if (Array.isArray(obj.keyQubits) && !obj.keyQubits.includes(BELL_RECEIVER_QUBIT)) {
      err(`bell_signalling keyQubits must include the receiver q${BELL_RECEIVER_QUBIT} so its marginal is derivable, got ${JSON.stringify(obj.keyQubits)}`)
    }
  }

  const keyCheckers = []
  if (hasP) {
    if (!isPlainObject(obj.probabilities) || Object.keys(obj.probabilities).length === 0) {
      err(`probabilities must be a non-empty plain object, got ${describe(obj.probabilities)}`)
    } else {
      let sum = 0
      for (const [k, p] of Object.entries(obj.probabilities)) {
        if (!isFiniteNumber(p) || p < -PROBABILITY_TOLERANCE || p > 1 + PROBABILITY_TOLERANCE) {
          err(`probabilities["${k}"] must be a number in [0, 1], got ${describe(p)}`)
        } else sum += p
      }
      if (Math.abs(sum - 1) > PROBABILITY_TOLERANCE) err(`probabilities sum to ${sum}, not 1 ± ${PROBABILITY_TOLERANCE}`)
      keyCheckers.push(['probabilities', obj.probabilities])
    }
  }
  if (hasC) {
    if (!isPlainObject(obj.counts) || Object.keys(obj.counts).length === 0) {
      err(`counts must be a non-empty plain object, got ${describe(obj.counts)}`)
    } else {
      for (const [k, c] of Object.entries(obj.counts)) {
        if (!Number.isInteger(c) || c < 0) err(`counts["${k}"] must be a non-negative integer, got ${describe(c)}`)
      }
      keyCheckers.push(['counts', obj.counts])
    }
  }

  if (obj.keyQubits !== undefined && !hasP && !hasC) err('keyQubits given without probabilities or counts')
  if (hasP || hasC) {
    const kq = obj.keyQubits
    const kqOk = Array.isArray(kq) && kq.length > 0 && new Set(kq).size === kq.length &&
      kq.every(q => Number.isInteger(q) && q >= 0 && (!qubitsOk || q < obj.qubits))
    if (!kqOk) {
      err(`keyQubits must list distinct qubit indices in [0, qubits) naming each key character left to right, got ${JSON.stringify(kq) ?? 'nothing'}`)
    } else {
      for (const [field, table] of keyCheckers) {
        for (const key of Object.keys(table)) {
          if (!/^[01]+$/.test(key) || key.length !== kq.length) {
            err(`${field} key "${key}" must be ${kq.length} character(s) of 0/1, one per keyQubits entry`)
          }
        }
      }
    }
  }

  if (obj.fidelity !== undefined && !(isFiniteNumber(obj.fidelity) && obj.fidelity >= 0 && obj.fidelity <= 1 + PROBABILITY_TOLERANCE)) {
    err(`fidelity must be a number in [0, 1], got ${describe(obj.fidelity)}`)
  }

  if (obj.observables !== undefined) {
    if (!isPlainObject(obj.observables)) err(`observables must be a plain object, got ${describe(obj.observables)}`)
    else for (const [k, v] of Object.entries(obj.observables)) {
      if (!isFiniteNumber(v)) err(`observables.${k} must be a finite number, got ${describe(v)}`)
    }
  }

  // m0 = source readout (q0), m1 = Alice's Bell-half readout (q1); receiver X iff m1=1, Z iff m0=1 (§7.1).
  if (obj.measurementBits !== undefined && obj.experiment !== 'teleportation') {
    err(`measurementBits belong to experiment teleportation only, not ${describe(obj.experiment)}`)
  }
  if (obj.measurementBits !== undefined) {
    const mb = obj.measurementBits
    if (!isPlainObject(mb)) {
      err(`measurementBits must be a plain object { m0, m1 }, got ${describe(mb)}`)
    } else {
      for (const bit of ['m0', 'm1']) if (mb[bit] !== 0 && mb[bit] !== 1) err(`measurementBits.${bit} must be the number 0 or 1, got ${describe(mb[bit])}`)
      for (const k of Object.keys(mb)) if (k !== 'm0' && k !== 'm1') err(`measurementBits has unknown field "${k}"`)
    }
  }

  if (obj.createdAt !== undefined && typeof obj.createdAt !== 'string') err(`createdAt must be a string, got ${describe(obj.createdAt)}`)
  return errors
}

// The one way to read a single qubit out of probability keys (§7.1: never parse bitstrings
// without the explicit mapping). Mission 2's receiver panel: marginalProbabilities(r, BELL_RECEIVER_QUBIT).
// Call it on a result validateExperimentResult accepted; throws if the qubit is not in keyQubits.
export function marginalProbabilities(result, qubit) {
  const pos = Array.isArray(result?.keyQubits) ? result.keyQubits.indexOf(qubit) : -1
  if (pos < 0 || !isPlainObject(result.probabilities)) {
    throw new TypeError(`marginalProbabilities: q${qubit} is not in keyQubits ${JSON.stringify(result?.keyQubits)}`)
  }
  const out = { 0: 0, 1: 0 }
  for (const [key, p] of Object.entries(result.probabilities)) out[key[pos]] += p
  return out
}

// ------------------------------------------------------------------ teleport dry run (two phases)

// The player sees m0 and m1 BEFORE choosing corrections (owner, 2026-10-10, red-team #2):
//   phase 1  request { theta, phi }                               → ExperimentResult with measurementBits, no fidelity
//   phase 2  request { theta, phi, m0, m1, applyX, applyZ }       → ExperimentResult with fidelity
// The calibration state is ry(theta) then rz(phi) on q0, fresh and generic on every dry run (owner,
// 13 questions #7). m0 = SOURCE READOUT (q0), m1 = LOCAL BELL-HALF READOUT m1 (q1); the receiver
// applies X iff m1 = 1 and Z iff m0 = 1 (§7.1). The story token never enters a dry run (§7.4).
export const TELEPORT_TEST_STATE = Object.freeze({ theta: 1.137, phi: 0.44 })  // §10.5, circuit order
export const FIDELITY_PASS = 0.999999                 // §7.4 ideal-validation threshold
export const GENERIC_MAX_WRONG_FIDELITY = 0.9          // every wrong choice must visibly fail
// The cross-check accepts exactly what the §7.4 band accepts: tolerance = the band width 1 - 0.999999.
// Every fidelity comparison adds FIDELITY_EPSILON, because in doubles 1 - 0.999999 = 1e-6 + 2.9e-17:
// without it a correct F = 0.999999 was refused (gate-independence law 12). 1e-12 exceeds the measured
// analytic/Qiskit disagreement (4.7e-13 over the oracle fixtures) and is 1e6 below the band.
export const FIDELITY_CROSSCHECK_TOLERANCE = 1e-6
export const FIDELITY_EPSILON = 1e-12
export const BIT_LABELS = Object.freeze({ m0: 'SOURCE READOUT m0', m1: 'LOCAL BELL-HALF READOUT m1' })

export function expectedCorrections(m0, m1) {
  if ((m0 !== 0 && m0 !== 1) || (m1 !== 0 && m1 !== 1)) throw new TypeError(`expectedCorrections: bits must be 0 or 1, got ${m0}, ${m1}`)
  return { applyX: m1 === 1, applyZ: m0 === 1 }
}

function bloch(theta, phi) {
  return { x: Math.sin(theta) * Math.cos(phi), y: Math.sin(theta) * Math.sin(phi), z: Math.cos(theta) }
}
// A CROSS-CHECK of the engine's number, never a displayed value (§10.6: fidelity comes from Qiskit).
// After the player's choice the receiver holds E|psi> with E = X^(m1 xor applyX) Z^(m0 xor applyZ),
// up to a global phase, so the fidelity is <psi|E|psi>^2: 1, x^2, z^2 or y^2 of the Bloch vector.
function expectedFidelity({ theta, phi, m0, m1, applyX, applyZ }) {
  const b = bloch(theta, phi)
  const ex = (m1 === 1) !== applyX
  const ez = (m0 === 1) !== applyZ
  return ex && ez ? b.y ** 2 : ex ? b.x ** 2 : ez ? b.z ** 2 : 1
}

function exactKeys(obj, keys, label, err) {
  for (const k of Object.keys(obj)) if (!keys.includes(k)) err(`${label} has unknown field "${k}"`)
}
function checkState(req, label, err) {
  for (const k of ['theta', 'phi']) if (!isFiniteNumber(req[k])) err(`${label}.${k} must be a finite number, got ${describe(req[k])}`)
  if (!isFiniteNumber(req.theta) || !isFiniteNumber(req.phi)) return
  const b = bloch(req.theta, req.phi)
  const worst = Math.max(b.x ** 2, b.y ** 2, b.z ** 2)
  if (worst > GENERIC_MAX_WRONG_FIDELITY) {
    err(`${label} state ry(${req.theta}) rz(${req.phi}) is not generic: a wrong correction would still score fidelity ${worst.toFixed(6)} (> ${GENERIC_MAX_WRONG_FIDELITY})`)
  }
}
const sameNumber = (a, b) => isFiniteNumber(a) && isFiniteNumber(b) && Math.abs(a - b) <= 1e-12

export function validateTeleportBitsRequest(req) {
  if (!isPlainObject(req)) return [`phase-1 request must be a plain object { theta, phi }, got ${describe(req)}`]
  const errors = []
  const err = m => errors.push(m)
  exactKeys(req, ['theta', 'phi'], 'phase-1 request', err)
  checkState(req, 'phase-1 request', err)
  return errors
}

function checkDryRunResult(req, res, phase, err) {
  for (const e of validateExperimentResult(res)) err(`${phase} result: ${e}`)
  if (!isPlainObject(res)) return false
  if (res.experiment !== 'teleportation') err(`${phase} result experiment must be teleportation, got ${describe(res.experiment)}`)
  if (res.engine !== 'exact_qiskit_local') err(`${phase} result engine must be exact_qiskit_local (puzzle feedback is local Qiskit), got ${describe(res.engine)}`)
  const p = isPlainObject(res.parameters) ? res.parameters : {}
  for (const k of ['theta', 'phi']) if (!sameNumber(p[k], req[k])) err(`${phase} result parameters.${k} ${describe(p[k])} is not the requested ${req[k]}`)
  if (!isPlainObject(res.measurementBits)) { err(`${phase} result must carry measurementBits { m0, m1 }`); return false }
  // An engine may echo the bits in parameters; if it does, they must be the same bits.
  for (const k of ['m0', 'm1']) {
    if (k in p && p[k] !== res.measurementBits[k]) err(`${phase} result parameters.${k} ${describe(p[k])} contradicts measurementBits.${k} ${describe(res.measurementBits[k])}`)
  }
  return true
}

export function validateTeleportBitsResult(req, res) {
  const errors = validateTeleportBitsRequest(req).map(e => `request: ${e}`)
  const err = m => errors.push(m)
  checkDryRunResult(req ?? {}, res, 'phase-1', err)
  if (isPlainObject(res)) {
    if (res.fidelity !== undefined) err('phase-1 result must not report fidelity: the player has not chosen corrections yet')
    for (const k of ['applyX', 'applyZ']) if (isPlainObject(res.parameters) && k in res.parameters) err(`phase-1 result parameters.${k} must be absent: corrections come after the bits`)
  }
  return errors
}

// The only way to build phase 2: from a valid phase-1 result and the player's choice.
export function makeCorrectionRequest(bitsRequest, bitsResult, { applyX, applyZ } = {}) {
  const errors = validateTeleportBitsResult(bitsRequest, bitsResult)
  if (typeof applyX !== 'boolean' || typeof applyZ !== 'boolean') errors.push(`choice must be { applyX: boolean, applyZ: boolean }, got ${describe(applyX)}, ${describe(applyZ)}`)
  if (errors.length) throw new TypeError(`makeCorrectionRequest: ${errors.join('; ')}`)
  const { m0, m1 } = bitsResult.measurementBits
  return { theta: bitsRequest.theta, phi: bitsRequest.phi, m0, m1, applyX, applyZ }
}

export function validateTeleportCorrectionRequest(req) {
  if (!isPlainObject(req)) return [`phase-2 request must be a plain object { theta, phi, m0, m1, applyX, applyZ }, got ${describe(req)}`]
  const errors = []
  const err = m => errors.push(m)
  exactKeys(req, ['theta', 'phi', 'm0', 'm1', 'applyX', 'applyZ'], 'phase-2 request', err)
  checkState(req, 'phase-2 request', err)
  for (const k of ['m0', 'm1']) if (req[k] !== 0 && req[k] !== 1) err(`phase-2 request.${k} must be the number 0 or 1, got ${describe(req[k])}`)
  for (const k of ['applyX', 'applyZ']) if (typeof req[k] !== 'boolean') err(`phase-2 request.${k} must be a boolean, got ${describe(req[k])}`)
  return errors
}

export function validateTeleportCorrectionResult(req, res) {
  const errors = validateTeleportCorrectionRequest(req).map(e => `request: ${e}`)
  const err = m => errors.push(m)
  if (!checkDryRunResult(req ?? {}, res, 'phase-2', err) || errors.length) return errors
  const mb = res.measurementBits
  if (mb.m0 !== req.m0 || mb.m1 !== req.m1) err(`phase-2 result measurementBits ${JSON.stringify(mb)} are not the requested m0=${req.m0}, m1=${req.m1}`)
  for (const k of ['applyX', 'applyZ']) if (res.parameters[k] !== req[k]) err(`phase-2 result parameters.${k} ${describe(res.parameters[k])} is not the requested ${req[k]}`)
  if (!isFiniteNumber(res.fidelity)) { err('phase-2 result must report fidelity'); return errors }
  const want = expectedFidelity(req)
  if (Math.abs(res.fidelity - want) > FIDELITY_CROSSCHECK_TOLERANCE + FIDELITY_EPSILON) {
    err(`phase-2 result fidelity ${res.fidelity} disagrees with the physics of this branch and choice (expected ${want.toFixed(9)})`)
  }
  return errors
}

// passed: the choice follows the rule AND Qiskit's fidelity clears §7.4. unlocksCommit: a pass on
// bits other than 00, so the player really applied X and/or Z (overseer ruling, gameplay consult 3 #2).
export function dryRunVerdict(req, res) {
  const errors = validateTeleportCorrectionResult(req, res)
  if (errors.length) return { passed: false, unlocksCommit: false, expected: null, errors }
  const expected = expectedCorrections(req.m0, req.m1)
  const passed = expected.applyX === req.applyX && expected.applyZ === req.applyZ && res.fidelity >= FIDELITY_PASS - FIDELITY_EPSILON
  return { passed, unlocksCommit: passed && (req.m0 === 1 || req.m1 === 1), expected, errors }
}

// A fresh calibration state, uniform on the Bloch sphere, redrawn until generic. `random` is
// injectable for tests; the game passes nothing (Math.random). This is a choice of TEST state,
// not a quantum random number.
export function randomGenericState(random = Math.random) {
  for (let i = 0; i < 1000; i++) {
    const req = { theta: Math.acos(1 - 2 * random()), phi: 2 * Math.PI * random() - Math.PI }
    if (validateTeleportBitsRequest(req).length === 0) return req
  }
  throw new Error('randomGenericState: no generic state in 1000 draws (is `random` constant?)')
}

// ------------------------------------------------------------------ UI root and settings

// story-ui mounts every module into one <div id="echo-ui"> over the canvas (overseer relay, 2026-10-10).
export const UI_ROOT_ID = 'echo-ui'
// The menu's hooks other lanes call or supply: a terminal that owns Esc calls setPauseAllowed(false);
// onRestart → gameplay resetGame() (§9.5) → RESET_STATE; onChange(settings, key) → platform routes
// quality to the renderer and volume to audio; gameplay releases pointer lock while isOpen().
export const UI_HOOKS = nameTable('UI_HOOKS', ['setPauseAllowed', 'onRestart', 'onChange', 'isOpen'])

export const CAPTION_STYLES = Object.freeze(['standard', 'high-contrast'])
export const QUALITY_LEVELS = Object.freeze(['low', 'med', 'high'])
// Captions are always on (owner, 2026-10-10): there is a caption STYLE, never a captions on/off field.
// story-ui may start reducedMotion from prefers-reduced-motion.
export const DEFAULT_SETTINGS = Object.freeze({ captionStyle: 'standard', reducedMotion: false, textScale: 100, quality: 'med', volume: 80 })
const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS)

export function validateSettings(s) {
  if (!isPlainObject(s)) return [`settings must be a plain object, got ${describe(s)}`]
  const errors = []
  const err = m => errors.push(m)
  for (const k of Object.keys(s)) {
    if (!SETTING_KEYS.includes(k)) err(`unknown setting "${k}"${/subtitle|caption/i.test(k) ? ' (captions are always on; use captionStyle)' : ''}`)
  }
  if (!CAPTION_STYLES.includes(s.captionStyle)) err(`captionStyle must be one of ${CAPTION_STYLES.join('|')}, got ${describe(s.captionStyle)}`)
  if (typeof s.reducedMotion !== 'boolean') err(`reducedMotion must be a boolean, got ${describe(s.reducedMotion)}`)
  if (!(Number.isInteger(s.textScale) && s.textScale >= 100 && s.textScale <= 200)) err(`textScale must be an integer percent in [100, 200], got ${describe(s.textScale)}`)
  if (!QUALITY_LEVELS.includes(s.quality)) err(`quality must be one of ${QUALITY_LEVELS.join('|')}, got ${describe(s.quality)}`)
  if (!(Number.isInteger(s.volume) && s.volume >= 0 && s.volume <= 100)) err(`volume must be an integer in [0, 100], got ${describe(s.volume)}`)
  return errors
}
