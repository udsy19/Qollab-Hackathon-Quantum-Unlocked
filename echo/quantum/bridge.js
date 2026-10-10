// The JS side of the quantum engine: the only place the game reaches Python (owner ruling
// 2026-10-10, item 10: quantum-owned, imported by platform's main.js). It implements vision §8.4's
// QuantumEngine with the same names gameplay's dev stand-in uses (dev/gameplay/fakeQuantum.js).
//
// Every call resolves to a plain ExperimentResult that has passed platform's
// validateExperimentResult, or rejects with a ScientificModuleError. Nothing unvalidated is ever
// handed on: the UI shows the §12.3 "scientific module error" state instead of invented numbers.
//
// Platform facts this file depends on (https://qollab.xyz/learn/docs/js-qiskit-projects,
// /runtime-environment; measured in the local runner: vault/Reports/pyodide-bridge.md):
// - Python modules import by dotted name; `backend` is a global in every JS file main.js imports.
// - Python is reached with `.callPromising`. A plain call that reaches an IonQ backend stops the
//   run with an XHR ConnectionError: the HTTP request can only be awaited on a stack entered
//   through callPromising.
// - Older Pyodide's bare `toJs()` turns every dict into a Map, which the validator rejects by name
//   (314.0.7 already gives plain Objects; the dict_converter below is kept as a version guard).
import * as cloning from 'quantum.cloning';
import * as entanglement from 'quantum.entanglement';
import * as teleportation from 'quantum.teleportation';
import * as qollabJob from 'quantum.qollab_job';
import {
  validateExperimentResult, validateTeleportBitsResult, validateTeleportCorrectionResult, makeCorrectionRequest,
  BACKEND_SHOTS,
} from '../contracts.js';

export class ScientificModuleError extends Error {
  constructor(label, errors, cause) {
    super(`${label}: ${errors.join('; ')}`, cause ? { cause } : undefined);
    this.name = 'ScientificModuleError';
    this.label = label;
    this.errors = errors;
  }
}

// A Python result proxy -> plain JS, and the proxy freed (a leaked PyProxy pins Python memory).
function toPlain(value) {
  if (!value || typeof value.toJs !== 'function') return value;
  try {
    return value.toJs({ dict_converter: Object.fromEntries });
  } finally {
    value.destroy();
  }
}

// A PythonError's message is the whole traceback; its last line is the exception itself.
const lastLine = (err) => String(err?.message ?? err).trim().split('\n').pop();

// `validate` defaults to the ExperimentResult contract; the dry-run phases pass the stricter
// two-phase validators, which also re-check the angles, the bits and the fidelity's physics.
async function callEngine(label, fn, args, validate = validateExperimentResult) {
  let result;
  try {
    result = toPlain(await fn.callPromising(...args));
  } catch (err) {
    throw new ScientificModuleError(label, [lastLine(err)], err);
  }
  const errors = validate(result);
  if (errors.length) {
    console.error(`quantum bridge: ${label} returned a result the contract rejects: ${errors.join('; ')}`);
    throw new ScientificModuleError(label, errors);
  }
  return result;
}

// Mission 1 (§7.2): the naive CNOT duplicator on a prepared calibration state.
export const cloneTest = (state) => callEngine('cloning test', cloning.run_calibration, [state]);

// Mission 2 (§7.3): the receiver's exact marginal after the sender applies I, X or Z.
export const bellSignalling = (senderGate) => callEngine('relay signalling', entanglement.bell_signalling, [senderGate]);

// Mission 3, the rooftop dry run, in two calls: bits first, corrections second (owner ruling
// 2026-10-10, red-team item 2; echo/CONTRACTS.md "Teleport dry run: two phases").
// Step 1: Python draws a FRESH random generic calibration state and returns its angles in
// `parameters` with one sampled (m0, m1). Unlimited: each call prepares a new state, so no measured
// unknown state is ever reused. The angles are the request the contract checks the result against.
const anglesOf = (result) => ({ theta: result?.parameters?.theta, phi: result?.parameters?.phi });
export const calibrationMeasurement = () => callEngine('calibration measurement', teleportation.bell_measurement,
  ['calibration'], (result) => validateTeleportBitsResult(anglesOf(result), result));

// Step 2: the receiver's state for THOSE bits on THAT state after the player's X/Z choice. It takes
// the step-1 result itself, so the angles and bits travel from the measurement and are never retyped:
// the correction is graded on the state that was actually measured.
export function teleportDryRun(calibration, correctionX, correctionZ) {
  let req;
  try {
    req = makeCorrectionRequest(anglesOf(calibration), calibration, { applyX: correctionX, applyZ: correctionZ });
  } catch (err) {
    return Promise.reject(new ScientificModuleError('teleport dry run', [err.message], err));
  }
  return callEngine('teleport dry run', teleportation.teleport_branch,
    ['calibration', req.m0, req.m1, req.applyX, req.applyZ, req.theta, req.phi],
    (result) => validateTeleportCorrectionResult(req, result));
}

// The story transfer (§7.4): the hidden token is measured once. A call that returned a valid result
// is latched, so every later call gets that same recorded result; Python refuses a second
// live_commit on its own as well. A call that failed measured nothing, so it unlatches and the
// player may retry (overseer ruling 2026-10-10, gameplay item 1).
let commit = null;
export function commitTransfer() {
  if (commit) return commit;
  const attempt = callEngine('live commit', teleportation.live_commit, []);
  commit = attempt;
  attempt.catch(() => {
    if (commit === attempt) commit = null;
  });
  return attempt;
}

// RESTART on the ending screen (owner ruling 2026-10-10): a new story, a new token. Python's latch
// is re-armed first, then the JS one, so a commit can never reach a still-consumed token. The
// backend-job memo below is NOT reset: IonQ allows one job per run, not per story.
export async function resetStoryToken() {
  if (commit) await commit.catch(() => {});
  try {
    await teleportation.reset_story_token.callPromising();
  } catch (err) {
    throw new ScientificModuleError('restart', [lastLine(err)], err);
  }
  commit = null;
}

// The one selected-backend job (§8.4, §8.6, §10.7), and the ONLY `backend.run` in the game (owner
// ruling 2026-10-10). Python builds the Bell circuit and reads the counts; it never submits. A JS
// `backend.run` takes the Python-built QuantumCircuit as it is and enters Python through
// callPromisingKwargs, the stack an IonQ HTTP request needs. IonQ accepts one job per run, so the
// promise is memoised for the life of the page, failure included (IonQ may already have counted a
// failed submission). RESTART does not reset it: one job per run, not per story.
// On failure it rejects with §8.6's wording.
const VERIFY_UNAVAILABLE = 'Quantum backend verification unavailable; educational circuit validated locally';
let verification = null;
export function verifySelectedBackendOnce() {
  if (!verification) verification = submitVerificationJob();
  return verification;
}

async function submitVerificationJob() {
  let circuit, result, counts;
  try {
    circuit = await qollabJob.build_backend_verification_circuit.callPromising();
    const job = await backend.run(circuit, { shots: BACKEND_SHOTS });
    result = await job.result();
    counts = result.get_counts();
    // `backend` goes to Python as well, so the result names the backend as it reports itself.
    return await callEngine(VERIFY_UNAVAILABLE, qollabJob.interpret_counts, [counts, backend, BACKEND_SHOTS]);
  } catch (err) {
    if (err instanceof ScientificModuleError) throw err;
    throw new ScientificModuleError(VERIFY_UNAVAILABLE, [lastLine(err)], err);
  } finally {
    for (const proxy of [counts, result, circuit]) proxy?.destroy?.();
  }
}
