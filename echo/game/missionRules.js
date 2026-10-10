// Which experiment result moves the quest forward (vision §9.2 mission events). A terminal never
// advances on a click: it hands the ExperimentResult here, and only a result that shows the
// lesson yields an event. The verdict reads the result's numbers, not the button that was pressed.
// Malformed input is refused with a reason, never thrown (review F6): the shape is checked by
// platform's validateExperimentResult before any rule reads a field.
//
// Fields read (CONTRACTS.md § Where the §10.x reference outputs go):
//   cloning:          parameters.state, fidelity = |<psi psi|out>|^2
//   bell_signalling:  parameters.senderGate, probabilities over keyQubits [1] (receiver marginal)
//   teleportation:    parameters.stateId, parameters.correctionX/Z, measurementBits {m0, m1}, fidelity
import { validateExperimentResult, QUEST_STATES as S, QUEST_EVENTS as E } from '../contracts.js';

const FIDELITY_OK = 0.999999; // §7.4 ideal-validation threshold
const MARGINAL_TOL = 1e-6;
export const STORY_TOKEN_ID = 'story_token';

// §7.1: m0 = source readout, m1 = local Bell half; receiver X iff m1=1, Z iff m0=1.
export function expectedCorrections(m0, m1) {
  if (![0, 1].includes(m0) || ![0, 1].includes(m1)) throw new Error('invalid bits');
  return { applyX: m1 === 1, applyZ: m0 === 1 };
}

const none = (reason) => ({ event: null, reason });

// Correct corrections are judged by the rule AND the computed fidelity. Fidelity alone is not
// enough: on |0> a spurious Z is a global phase and still scores 1.
function correctTeleport(r) {
  const bits = r.measurementBits;
  if (!bits || typeof r.fidelity !== 'number') return 'no measurement bits or fidelity';
  const want = expectedCorrections(bits.m0, bits.m1);
  if (r.parameters.correctionX !== want.applyX || r.parameters.correctionZ !== want.applyZ) {
    return `corrections do not match m0=${bits.m0}, m1=${bits.m1}`;
  }
  if (r.fidelity < FIDELITY_OK) return `fidelity ${r.fidelity} below ${FIDELITY_OK}`;
  return null;
}

// The receiver's exact marginal must be 1/2, 1/2 — both outcomes, about the receiver qubit (q1)
// alone. One number is not enough: P(0)=0.5 beside P(1)=0.9 is a contradiction (review F7).
function receiverIsUniform(r) {
  if (r.keyQubits?.length !== 1 || r.keyQubits[0] !== 1) return 'probabilities are not the receiver (q1) marginal';
  const p = r.probabilities ?? {};
  const keys = Object.keys(p).sort().join(',');
  if (keys !== '0,1') return `receiver marginal needs outcomes 0 and 1, got ${keys || 'none'}`;
  if (Math.abs(p['0'] - 0.5) > MARGINAL_TOL || Math.abs(p['1'] - 0.5) > MARGINAL_TOL) return `receiver marginal ${p['0']}/${p['1']} is not 1/2, 1/2`;
  return null;
}

const RULES = {
  [S.CLONE_INTRO]: (r) => (r.experiment === 'cloning' && ['zero', 'one'].includes(r.parameters.state)
    && r.fidelity >= FIDELITY_OK ? E.BASIS_DEMO_OK : none('need a basis-state copy that succeeded')),
  [S.CLONE_BASIS_PASSED]: (r) => (r.experiment === 'cloning' && ['plus', 'phase'].includes(r.parameters.state)
    && typeof r.fidelity === 'number' && r.fidelity < FIDELITY_OK ? E.SUPERPOSITION_DEMO_FAILED : none('need a superposition copy attempt')),
  [S.RELAY_INTRO]: (r) => (r.experiment === 'bell_signalling' ? E.PREPARE_BELL_PAIR : none('need a Bell-pair result')),
  [S.RELAY_BELL_CREATED]: (r) => {
    if (r.experiment !== 'bell_signalling') return none('need a Bell-pair result');
    if (!['X', 'Z'].includes(r.parameters.senderGate)) return none('the sender must act locally (X or Z) to try to signal');
    const why = receiverIsUniform(r);
    return why ? none(why) : E.ATTEMPT_NO_SIGNALLING;
  },
  // Calibration runs on prepared test states only; the story token is never spent here (§7.4).
  // A pass must have needed a correction (owner ruling 2026-10-10, gameplay consult 3): with
  // m0=m1=0 "do nothing" is right, but it proves nothing about applying X or Z.
  [S.TELEPORT_DRY_RUN]: (r) => {
    if (r.experiment !== 'teleportation') return none('need a teleportation result');
    if (r.parameters.stateId === STORY_TOKEN_ID) return none('calibration may not use the story token');
    const why = correctTeleport(r);
    if (why) return none(why);
    if (r.measurementBits.m0 === 0 && r.measurementBits.m1 === 0) return none('correct, but bits 00 need no correction: calibrate again on a run that needs X or Z');
    return E.CORRECT_CALIBRATION;
  },
  [S.TELEPORT_DRY_RUN_PASSED]: (r) => {
    if (r.experiment !== 'teleportation' || r.parameters.stateId !== STORY_TOKEN_ID) return none('need the story-token transfer');
    const why = correctTeleport(r);
    return why ? none(why) : E.COMMIT_TRANSFER;
  },
};

export const hasExperiment = (state) => Object.hasOwn(RULES, state);

export function eventForResult(state, result) {
  if (!hasExperiment(state)) return none(`${state} has no experiment`);
  const errors = validateExperimentResult(result);
  if (errors.length) return none(`invalid result: ${errors.join('; ')}`);
  try {
    const out = RULES[state](result);
    return typeof out === 'string' ? { event: out, reason: 'result shows the lesson' } : out;
  } catch (err) {
    return none(`result could not be judged: ${err.message}`);
  }
}
