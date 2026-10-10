// Which experiment result moves the quest forward (vision §9.2 mission events). A terminal never
// advances on a click: it hands the ExperimentResult here, and only a result that shows the
// lesson yields an event. The verdict reads the result's numbers, not the button that was pressed.
//
// Result fields read (seam with the quantum lane's adapter — vision §8.4 leaves them open):
//   cloning:          parameters.state, fidelity = |<psi psi|out>|^2
//   bell_signalling:  parameters.senderGate, probabilities['receiver=0'|'receiver=1']
//   teleportation:    parameters.stateId, parameters.correctionX/Z, measurementBits {m0, m1}, fidelity

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

const RULES = {
  CLONE_INTRO: (r) => (r.experiment === 'cloning' && ['zero', 'one'].includes(r.parameters.state)
    && r.fidelity >= FIDELITY_OK ? 'BASIS_DEMO_OK' : none('need a basis-state copy that succeeded')),
  CLONE_BASIS_PASSED: (r) => (r.experiment === 'cloning' && ['plus', 'phase'].includes(r.parameters.state)
    && r.fidelity < FIDELITY_OK ? 'SUPERPOSITION_DEMO_FAILED' : none('need a superposition copy attempt')),
  RELAY_INTRO: (r) => (r.experiment === 'bell_signalling' ? 'PREPARE_BELL_PAIR' : none('need a Bell-pair result')),
  RELAY_BELL_CREATED: (r) => {
    if (r.experiment !== 'bell_signalling') return none('need a Bell-pair result');
    if (!['X', 'Z'].includes(r.parameters.senderGate)) return none('the sender must act locally (X or Z) to try to signal');
    const p0 = r.probabilities?.['receiver=0'];
    return typeof p0 === 'number' && Math.abs(p0 - 0.5) < MARGINAL_TOL ? 'ATTEMPT_NO_SIGNALLING' : none('receiver marginal missing');
  },
  // Calibration runs on prepared test states only; the story token is never spent here (§7.4).
  TELEPORT_DRY_RUN: (r) => {
    if (r.experiment !== 'teleportation') return none('need a teleportation result');
    if (r.parameters.stateId === STORY_TOKEN_ID) return none('calibration may not use the story token');
    const why = correctTeleport(r);
    return why ? none(why) : 'CORRECT_CALIBRATION';
  },
  TELEPORT_DRY_RUN_PASSED: (r) => {
    if (r.experiment !== 'teleportation' || r.parameters.stateId !== STORY_TOKEN_ID) return none('need the story-token transfer');
    const why = correctTeleport(r);
    return why ? none(why) : 'COMMIT_TRANSFER';
  },
};

export function eventForResult(state, result) {
  const rule = RULES[state];
  if (!rule) return none(`${state} has no experiment`);
  if (!result || typeof result.experiment !== 'string' || typeof result.parameters !== 'object') return none('no result');
  const out = rule(result);
  return typeof out === 'string' ? { event: out, reason: 'result shows the lesson' } : out;
}
