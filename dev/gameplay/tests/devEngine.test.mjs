// The harness's dev engine (dev_engine.py, real Qiskit in local CPython) must tell the physics truth
// of vision §7 and speak the v2 contract. Expected numbers are written from §7.2–§7.4 by hand, not
// read back from the engine; shapes and verdicts are platform's validators (no local copy).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { validateExperimentResult, validateTeleportBitsResult, validateTeleportCorrectionResult,
  makeCorrectionRequest, dryRunVerdict, randomGenericState, TELEPORT_TEST_STATE } from '../../../echo/contracts.js';
import { startDevEngine } from './devEngineServer.mjs';

const server = await startDevEngine();
after(() => server.stop());
const q = server.engine();

const TOL = 1e-9;
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < TOL, `${msg}: ${a} vs ${b}`);
const valid = (r) => assert.deepEqual(validateExperimentResult(r), [], JSON.stringify(r));

test('every result passes validateExperimentResult, is exact_qiskit_local, and says it is the dev engine', async () => {
  const bits = await q.teleportBits(TELEPORT_TEST_STATE);
  const rs = [await q.cloneTest('zero'), await q.cloneTest('plus'), await q.bellSignalling('X'), bits,
    await q.teleportCorrection(makeCorrectionRequest(TELEPORT_TEST_STATE, bits, { applyX: false, applyZ: false })),
    await q.commitStoryToken()];
  for (const r of rs) {
    valid(r);
    assert.equal(r.engine, 'exact_qiskit_local');
    assert.ok(r.facts.some((f) => /Dev engine: Qiskit in local CPython/.test(f)), 'labelled as the dev engine');
  }
});

test('§7.2 cloning: basis states copy, |+> and phase states do not', async () => {
  const want = { zero: [1, 1], one: [1, 1], plus: [0.5, 0.5], phase: [0.25, 0.5] };
  for (const [s, [fid, purity]] of Object.entries(want)) {
    const r = await q.cloneTest(s);
    close(r.fidelity, fid, `${s} copy fidelity`);
    close(r.observables.purityQ0, purity, `${s} purity q0`);
    close(r.observables.purityQ1, purity, `${s} purity q1`);
  }
  const plus = await q.cloneTest('plus');
  assert.deepEqual(plus.keyQubits, [1, 0]);
  close(plus.probabilities['00'], 0.5, '|+> 00');
  close(plus.probabilities['11'], 0.5, '|+> 11');
  close((plus.probabilities['01'] ?? 0) + (plus.probabilities['10'] ?? 0), 0, '|+> 01+10');
  close((await q.cloneTest('one')).probabilities['11'], 1, '|1> -> |11>');
});

test('§7.3 no-signalling: receiver marginal (keyQubits [1]) is 1/2,1/2 for I, X and Z; joint correlations differ I vs X', async () => {
  const obs = {};
  for (const g of ['I', 'X', 'Z']) {
    const r = await q.bellSignalling(g);
    assert.deepEqual(r.keyQubits, [1]);
    close(r.probabilities['0'], 0.5, `${g} P(0)`);
    close(r.probabilities['1'], 0.5, `${g} P(1)`);
    close(r.observables.receiverPurity, 0.5, `${g} receiver purity`);
    obs[g] = r.observables;
  }
  close(obs.I.jointSame, 1, 'I: outcomes always agree');
  close(obs.X.jointSame, 0, 'X: outcomes always differ');
  close(obs.Z.jointSame, 1, 'Z: Z-basis correlations unchanged');
});

test('§7.4 two-phase dry run: bits first (no fidelity), then the verdict passes iff X==m1 and Z==m0, on the test state and fresh generic states', async () => {
  const states = [TELEPORT_TEST_STATE, randomGenericState(), randomGenericState(), randomGenericState()];
  for (const req of states) {
    const bits = await q.teleportBits(req);
    assert.deepEqual(validateTeleportBitsResult(req, bits), []);
    assert.equal(bits.fidelity, undefined, 'phase 1 shows no fidelity before the player chooses');
    for (const m0 of [0, 1]) for (const m1 of [0, 1]) for (const applyX of [false, true]) for (const applyZ of [false, true]) {
      const corr = { theta: req.theta, phi: req.phi, m0, m1, applyX, applyZ };
      const r = await q.teleportCorrection(corr);
      assert.deepEqual(validateTeleportCorrectionResult(corr, r), [], JSON.stringify(corr));
      const right = applyX === (m1 === 1) && applyZ === (m0 === 1);
      assert.equal(dryRunVerdict(corr, r).passed, right, JSON.stringify(corr));
      if (right) close(r.fidelity, 1, 'correct choice'); else assert.ok(r.fidelity <= 0.9, `wrong choice visibly fails: ${r.fidelity}`);
    }
  }
});

test('Bell-measurement bits cover all four outcomes over fresh states', async () => {
  const seen = new Set();
  for (let i = 0; i < 60 && seen.size < 4; i++) {
    const b = (await q.teleportBits(randomGenericState())).measurementBits;
    seen.add(`${b.m0}${b.m1}`);
  }
  assert.equal(seen.size, 4);
});

test('commitStoryToken is one atomic call: live bits, rule corrections, fidelity 1, and the token angles are not shown', async () => {
  const r = await q.commitStoryToken();
  assert.equal(r.parameters.stateId, 'story_token');
  assert.equal(r.parameters.applyX, r.measurementBits.m1 === 1);
  assert.equal(r.parameters.applyZ, r.measurementBits.m0 === 1);
  close(r.fidelity, 1, 'story token fidelity');
  assert.equal(r.parameters.theta, undefined);
  const faulty = server.engine();
  faulty.faultNextCommit();
  const bad = await faulty.commitStoryToken();
  assert.notEqual(bad.parameters.applyX, bad.measurementBits.m1 === 1, 'the fault applies the wrong X');
  assert.ok(bad.fidelity < 0.999999);
});

test('injectable failure rejects the next call only, then the adapter recovers', async () => {
  const f = server.engine();
  f.failNext('simulated bridge timeout');
  await assert.rejects(f.cloneTest('plus'), /simulated bridge timeout/);
  valid(await f.cloneTest('plus'));
});

test('unknown inputs are refused, not defaulted', async () => {
  await assert.rejects(q.cloneTest('minus'), /unknown/);
  await assert.rejects(q.cloneTest('constructor'), /unknown/);
  await assert.rejects(q.bellSignalling('Y'), /unknown/);
  await assert.rejects(q.teleportBits({ theta: 'x', phi: 0 }), /dev engine/);
});
