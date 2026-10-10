// Guard for the vision §8.4 ExperimentResult shape. Test-only: the shipped guard is the platform
// lane's shared contract; when it lands, these tests should import it and this file be deleted.
import assert from 'node:assert/strict';

const EXPERIMENTS = ['cloning', 'bell_signalling', 'teleportation'];
const ENGINES = ['exact_qiskit_local', 'qollab_selected_backend', 'documented_preview'];
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

export function assertExperimentResult(r) {
  assert.equal(typeof r, 'object');
  assert.ok(EXPERIMENTS.includes(r.experiment), `experiment ${r.experiment}`);
  assert.ok(ENGINES.includes(r.engine), `engine ${r.engine}`);
  assert.equal(typeof r.circuitDescription, 'string');
  assert.ok(r.circuitDescription.length > 0);
  assert.ok(Number.isInteger(r.qubits) && r.qubits > 0);
  assert.equal(typeof r.parameters, 'object');
  for (const v of Object.values(r.parameters)) assert.ok(['string', 'number', 'boolean'].includes(typeof v));
  for (const k of ['probabilities', 'counts']) {
    if (r[k] === undefined) continue;
    for (const v of Object.values(r[k])) assert.ok(isNum(v));
  }
  if (r.probabilities) {
    const sum = Object.values(r.probabilities).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `probabilities sum ${sum}`);
  }
  if (r.fidelity !== undefined) assert.ok(isNum(r.fidelity) && r.fidelity >= -1e-12 && r.fidelity <= 1 + 1e-12);
  assert.ok(Array.isArray(r.facts) && r.facts.every((f) => typeof f === 'string'));
  if (r.measurementBits !== undefined) {
    assert.ok([0, 1].includes(r.measurementBits.m0) && [0, 1].includes(r.measurementBits.m1));
  }
  // Plain serialisable data only (the JS<->Python bridge contract).
  assert.deepEqual(JSON.parse(JSON.stringify(r)), r);
}
