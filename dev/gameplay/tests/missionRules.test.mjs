// The quest only advances on a result that shows the lesson; a bare click, a wrong result or a
// malformed one does nothing, and nothing here ever throws (review F6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { eventForResult, expectedCorrections, hasExperiment } from '../../../echo/game/missionRules.js';
import { createFakeQuantum } from '../fakeQuantum.js';

const q = createFakeQuantum({ delayMs: 0 });
const ALL_STATES = ['BOOT', 'TITLE', 'CLONE_INTRO', 'CLONE_BASIS_PASSED', 'RELAY_INTRO', 'RELAY_BELL_CREATED', 'TELEPORT_DRY_RUN', 'TELEPORT_DRY_RUN_PASSED', 'ENDING'];
const AXIS = { theta: 1.137, phi: 0.44 }; // §10.5 generic test state, ry then rz

test('expectedCorrections is the §7.1 rule: X iff m1=1, Z iff m0=1', () => {
  assert.deepEqual(expectedCorrections(0, 0), { applyX: false, applyZ: false });
  assert.deepEqual(expectedCorrections(0, 1), { applyX: true, applyZ: false });
  assert.deepEqual(expectedCorrections(1, 0), { applyX: false, applyZ: true });
  assert.deepEqual(expectedCorrections(1, 1), { applyX: true, applyZ: true });
  assert.throws(() => expectedCorrections(2, 0));
});

test('hasExperiment names exactly the states a result can advance', () => {
  assert.deepEqual(ALL_STATES.filter(hasExperiment), ['CLONE_INTRO', 'CLONE_BASIS_PASSED', 'RELAY_INTRO', 'RELAY_BELL_CREATED', 'TELEPORT_DRY_RUN', 'TELEPORT_DRY_RUN_PASSED']);
});

test('F6: malformed input is refused with a reason, never thrown, in every state', () => {
  const junk = [undefined, null, 0, 'x', [], {}, new Map(), { experiment: 'cloning', parameters: null, fidelity: 1 },
    { experiment: 'teleportation', engine: 'exact_qiskit_local', qubits: 3, circuitDescription: 'c', facts: ['f'], parameters: { stateId: 'calibration', correctionX: false, correctionZ: false }, measurementBits: { m0: '0', m1: 0 }, fidelity: 1 },
    { experiment: 'cloning', parameters: { state: 'zero' }, fidelity: 1 }];
  for (const s of ALL_STATES) for (const r of junk) {
    let v;
    assert.doesNotThrow(() => { v = eventForResult(s, r); }, `${s} ${JSON.stringify(r)}`);
    assert.equal(v.event, null);
    assert.equal(typeof v.reason, 'string');
  }
});

test('cloning: basis copy advances CLONE_INTRO; superposition failure advances CLONE_BASIS_PASSED; not the reverse', async () => {
  const zero = await q.cloneTest('zero');
  const plus = await q.cloneTest('plus');
  assert.equal(eventForResult('CLONE_INTRO', zero).event, 'BASIS_DEMO_OK');
  assert.equal(eventForResult('CLONE_INTRO', plus).event, null);
  assert.equal(eventForResult('CLONE_BASIS_PASSED', plus).event, 'SUPERPOSITION_DEMO_FAILED');
  assert.equal(eventForResult('CLONE_BASIS_PASSED', await q.cloneTest('phase')).event, 'SUPERPOSITION_DEMO_FAILED');
  assert.equal(eventForResult('CLONE_BASIS_PASSED', zero).event, null);
});

test('relay: any Bell result prepares the pair; only a local X/Z attempt with an exact 50/50 receiver is the failed send', async () => {
  const I = await q.bellSignalling('I');
  const X = await q.bellSignalling('X');
  assert.equal(eventForResult('RELAY_INTRO', I).event, 'PREPARE_BELL_PAIR');
  assert.equal(eventForResult('RELAY_BELL_CREATED', I).event, null, 'doing nothing is not an attempt to signal');
  assert.equal(eventForResult('RELAY_BELL_CREATED', X).event, 'ATTEMPT_NO_SIGNALLING');
  assert.equal(eventForResult('RELAY_BELL_CREATED', await q.cloneTest('plus')).event, null);
});

test('F7: contradictory or mislabelled receiver probabilities are refused', async () => {
  const X = await q.bellSignalling('X');
  const variants = {
    'receiver=1 contradicts receiver=0': { ...X, probabilities: { 0: 0.5, 1: 0.9 } },
    'only one outcome given': { ...X, probabilities: { 0: 0.5 } },
    'skewed but summing to 1': { ...X, probabilities: { 0: 0.6, 1: 0.4 } },
    'marginal of the sender, not the receiver': { ...X, keyQubits: [0] },
    'joint table instead of the marginal': { ...X, keyQubits: [1, 0], probabilities: { '00': 0.5, 11: 0.5 } },
  };
  for (const [name, r] of Object.entries(variants)) assert.equal(eventForResult('RELAY_BELL_CREATED', r).event, null, name);
});

test('dry run: advances only with corrections matching the bits AND fidelity ~1, on a non-00 run (ruling consult 3)', async () => {
  for (const m0 of [0, 1]) for (const m1 of [0, 1]) for (const X of [false, true]) for (const Z of [false, true]) {
    const r = await q.teleportDryRun(X, Z, { m0, m1 }, AXIS);
    const right = X === (m1 === 1) && Z === (m0 === 1);
    const want = right && (m0 || m1) ? 'CORRECT_CALIBRATION' : null;
    assert.equal(eventForResult('TELEPORT_DRY_RUN', r).event, want, `X=${X} Z=${Z} m0=${m0} m1=${m1}`);
  }
  const zeroZero = eventForResult('TELEPORT_DRY_RUN', await q.teleportDryRun(false, false, { m0: 0, m1: 0 }, AXIS));
  assert.match(zeroZero.reason, /00|no correction/i);
});

test('the story token is never a calibration, and calibration is never a commit', async () => {
  const token = await q.commitStoryToken();
  assert.equal(eventForResult('TELEPORT_DRY_RUN', token).event, null);
  assert.equal(eventForResult('TELEPORT_DRY_RUN_PASSED', token).event, 'COMMIT_TRANSFER');
  const calib = await q.teleportDryRun(true, false, { m0: 0, m1: 1 }, AXIS);
  assert.equal(eventForResult('TELEPORT_DRY_RUN_PASSED', calib).event, null);
  const wrongToken = { ...token, parameters: { ...token.parameters, correctionX: !token.parameters.correctionX } };
  assert.equal(eventForResult('TELEPORT_DRY_RUN_PASSED', wrongToken).event, null);
});

test('states without an experiment never map a result to an event', async () => {
  const r = await q.cloneTest('zero');
  for (const s of ['BOOT', 'TITLE', 'FREE_ROAM_ALLEY', 'ENDING', 'CREDITS']) assert.equal(eventForResult(s, r).event, null);
});
