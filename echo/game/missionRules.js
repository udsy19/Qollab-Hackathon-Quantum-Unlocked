// Which experiment result moves the quest forward (vision §9.2 mission events). A terminal never
// advances on a click: it hands the ExperimentResult here, and only a result that shows the
// lesson yields an event. The verdict reads the result's numbers, not the button that was pressed.
// Malformed input is refused with a reason, never thrown (review F6): the shape is checked by
// platform's validateExperimentResult before any rule reads a field.
//
// Fields read (CONTRACTS.md § Where the §10.x reference outputs go):
//   cloning:          parameters.state, fidelity = |<psi psi|out>|^2
//   bell_signalling:  parameters.senderGate, probabilities over keyQubits [1] (receiver marginal)
//   teleport dry run: the phase-2 request and result, judged by contracts' dryRunVerdict
//   commit:           contracts' validateCommitResult (stateId STORY_TOKEN_ID, applyX/Z, bits, fidelity)
import { validateExperimentResult, dryRunVerdict, validateCommitResult, FIDELITY_PASS, STORY_TOKEN_ID,
  QUEST_STATES as S, QUEST_EVENTS as E } from '../contracts.js';

const MARGINAL_TOL = 1e-6;

const none = (reason) => ({ event: null, reason });

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
    && r.fidelity >= FIDELITY_PASS ? E.BASIS_DEMO_OK : none('need a basis-state copy that succeeded')),
  [S.CLONE_BASIS_PASSED]: (r) => (r.experiment === 'cloning' && ['plus', 'phase'].includes(r.parameters.state)
    && typeof r.fidelity === 'number' && r.fidelity < FIDELITY_PASS ? E.SUPERPOSITION_DEMO_FAILED : none('need a superposition copy attempt')),
  [S.RELAY_INTRO]: (r) => (r.experiment === 'bell_signalling' ? E.PREPARE_BELL_PAIR : none('need a Bell-pair result')),
  [S.RELAY_BELL_CREATED]: (r) => {
    if (r.experiment !== 'bell_signalling') return none('need a Bell-pair result');
    if (!['X', 'Z'].includes(r.parameters.senderGate)) return none('the sender must act locally (X or Z) to try to signal');
    const why = receiverIsUniform(r);
    return why ? none(why) : E.ATTEMPT_NO_SIGNALLING;
  },
  // Phase 2 of the dry run (CONTRACTS.md § Teleport dry run), judged against the request it
  // answered: the story token never enters it (the request is { theta, phi, m0, m1, applyX,
  // applyZ } of a generic calibration state), and only unlocksCommit — a correct pass on bits other
  // than 00 (owner ruling, gameplay consult 3) — advances.
  [S.TELEPORT_DRY_RUN]: (r, request) => {
    if (r.experiment !== 'teleportation') return none('need a teleportation result');
    const v = dryRunVerdict(request, r);
    if (v.errors.length) return none(`dry run refused: ${v.errors.join('; ')}`);
    if (!v.passed) return none(`wrong correction for m0=${request.m0}, m1=${request.m1}: calibrate again on a fresh state`);
    if (!v.unlocksCommit) return none('correct, but bits 00 need no correction: calibrate again on a run that needs X or Z');
    return E.CORRECT_CALIBRATION;
  },
  // The story-token commit applies the §7.1 rule inside one engine call (owner ruling, gameplay
  // consult 3); contracts' validateCommitResult judges the rule AND the fidelity (on |0> a spurious Z
  // is a global phase and still scores 1, so fidelity alone is not enough).
  [S.TELEPORT_DRY_RUN_PASSED]: (r) => {
    if (r.experiment !== 'teleportation' || r.parameters.stateId !== STORY_TOKEN_ID) return none('need the story-token transfer');
    const errors = validateCommitResult(r);
    return errors.length ? none(`commit refused: ${errors.join('; ')}`) : E.COMMIT_TRANSFER;
  },
};

export const hasExperiment = (state) => Object.hasOwn(RULES, state);

// `request` is the call's input, for rules that judge a result against what was asked (the dry run).
export function eventForResult(state, result, request) {
  if (!hasExperiment(state)) return none(`${state} has no experiment`);
  const errors = validateExperimentResult(result);
  if (errors.length) return none(`invalid result: ${errors.join('; ')}`);
  try {
    const out = RULES[state](result, request);
    return typeof out === 'string' ? { event: out, reason: 'result shows the lesson' } : out;
  } catch (err) {
    return none(`result could not be judged: ${err.message}`);
  }
}
