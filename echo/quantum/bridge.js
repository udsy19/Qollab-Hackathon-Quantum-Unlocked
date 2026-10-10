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
// - Pyodide's bare `toJs()` turns every dict into a Map, which the validator rejects by name.
import * as cloning from 'quantum.cloning';
import * as entanglement from 'quantum.entanglement';
import * as teleportation from 'quantum.teleportation';
import * as qollabJob from 'quantum.qollab_job';
import { validateExperimentResult } from '../contracts.js';

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

async function callEngine(label, fn, ...args) {
  let result;
  try {
    result = toPlain(await fn.callPromising(...args));
  } catch (err) {
    throw new ScientificModuleError(label, [lastLine(err)], err);
  }
  const errors = validateExperimentResult(result);
  if (errors.length) {
    console.error(`quantum bridge: ${label} returned a result the contract rejects: ${errors.join('; ')}`);
    throw new ScientificModuleError(label, errors);
  }
  return result;
}

// Mission 1 (§7.2): the naive CNOT duplicator on a prepared calibration state.
export const cloneTest = (state) => callEngine('cloning test', cloning.run_calibration, state);

// Mission 2 (§7.3): the receiver's exact marginal after the sender applies I, X or Z.
export const bellSignalling = (senderGate) => callEngine('relay signalling', entanglement.bell_signalling, senderGate);

// Mission 3, step 1: a Bell measurement on a fresh calibration state gives the bits (m0, m1)
// BEFORE the player picks corrections (owner ruling 2026-10-10, red-team item 2). Unlimited:
// each call prepares a new state, so no measured unknown state is ever reused.
export const calibrationMeasurement = (stateId) => callEngine('calibration measurement', teleportation.bell_measurement, stateId);

// Mission 3, step 2: the receiver's state for THOSE bits after the player's X/Z choice.
export function teleportDryRun(stateId, correctionX, correctionZ, bits) {
  if (!bits || ![0, 1].includes(bits.m0) || ![0, 1].includes(bits.m1))
    return Promise.reject(new ScientificModuleError('teleport dry run', [`bits must be { m0: 0|1, m1: 0|1 }, got ${JSON.stringify(bits)}`]));
  return callEngine('teleport dry run', teleportation.teleport_branch, stateId, bits.m0, bits.m1, Boolean(correctionX), Boolean(correctionZ));
}

// The story transfer (§7.4): the token is measured once. A call that returned a valid result is
// latched, so every later call gets that same recorded result. A call that failed measured
// nothing, so it unlatches and the player may retry (overseer ruling 2026-10-10, gameplay item 1).
let commit = null;
export function commitTransfer(stateId) {
  if (commit) return commit;
  const attempt = callEngine('live commit', teleportation.live_commit, stateId);
  commit = attempt;
  attempt.catch(() => {
    if (commit === attempt) commit = null;
  });
  return attempt;
}

// The one selected-backend job (§8.4, §8.6, §10.7). IonQ accepts one job per run, so the promise
// is memoised for the life of the page, failure included: Python's guard in qollab_job.py counts a
// failed submission as spent, and so does this. On failure it rejects with §8.6's wording.
let verification = null;
export function verifySelectedBackendOnce() {
  if (!verification) verification = verifyOnce();
  return verification;
}

const UNAVAILABLE = 'Quantum backend verification unavailable; educational circuit validated locally';

async function verifyOnce() {
  let result;
  try {
    result = toPlain(await qollabJob.run_bell_verification_once.callPromising(backend));
  } catch (err) {
    console.error(`quantum bridge: backend verification failed: ${err?.message ?? err}`);
    throw new ScientificModuleError(UNAVAILABLE, [lastLine(err)], err);
  }
  const errors = validateExperimentResult(result);
  if (errors.length) {
    console.error(`quantum bridge: backend verification result rejected by the contract: ${errors.join('; ')}`);
    throw new ScientificModuleError(UNAVAILABLE, errors);
  }
  return result;
}
