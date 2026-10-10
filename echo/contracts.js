// echo/contracts.js — the platform-owned definition of how ECHO talks to itself.
// Quest states and transitions (vision §9.1/§9.2), bus and world-change names (§8.7, §9.3),
// interactable ids (§9.4) and the ExperimentResult shape that crosses the Python bridge (§8.4).
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

// §9.2's table plus two edges its text requires but its sample omits (CONTRACTS.md § Additions):
// BOOT → TITLE and DECLASSIFIED → CREDITS (§3.4 flow). CREDITS is terminal; restart is
// resetGame() (§9.5), not a transition.
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
  ENDING: { OPEN_SCIENCE: 'DECLASSIFIED', OPEN_CREDITS: 'CREDITS' },
  DECLASSIFIED: { OPEN_CREDITS: 'CREDITS' },
  CREDITS: {},
}).map(([s, edges]) => [s, Object.freeze(edges)])))

// Every event the machine accepts, derived from the table so the two cannot drift.
export const QUEST_EVENTS = nameTable('QUEST_EVENTS',
  [...new Set(Object.values(TRANSITIONS).flatMap(edges => Object.keys(edges)))])

// A wrong NAME throws (a bug at the call site); a right name at the wrong time is refused
// with { ok: false } and the state unchanged (gameplay, e.g. pressing E twice).
export function transition(state, event) {
  if (!Object.hasOwn(TRANSITIONS, state)) {
    throw new TypeError(`transition: unknown quest state ${JSON.stringify(state)}`)
  }
  if (typeof event !== 'string' || !(event in QUEST_EVENTS)) {
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
export const EXPERIMENTS = nameTable('EXPERIMENTS', ['cloning', 'bell_signalling', 'teleportation'])
export const PROBABILITY_TOLERANCE = 1e-9

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

  if (!(typeof obj.experiment === 'string' && obj.experiment in EXPERIMENTS)) {
    err(`experiment must be one of ${Object.keys(EXPERIMENTS).join('|')}, got ${describe(obj.experiment)}`)
  }
  if (!(typeof obj.engine === 'string' && obj.engine in ENGINE_KINDS)) {
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

  // Exact probabilities and sampled counts are different kinds of evidence (CLAUDE.md): an
  // exact local engine never reports counts, a selected backend never reports exact probabilities.
  const hasP = obj.probabilities !== undefined
  const hasC = obj.counts !== undefined
  if (obj.engine === 'exact_qiskit_local' && hasC) err('counts are not allowed under engine exact_qiskit_local (it computes exact probabilities)')
  if (obj.engine === 'qollab_selected_backend' && hasP) err('probabilities are not allowed under engine qollab_selected_backend (it samples counts)')
  if (obj.engine === 'qollab_selected_backend' && !hasC) err('counts are required under engine qollab_selected_backend')

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
