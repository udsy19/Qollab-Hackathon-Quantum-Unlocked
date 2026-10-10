// The dev-only fake adapter must tell the physics truth of vision §7 and speak the platform
// ExperimentResult contract. Expected numbers are written from §7.2–§7.4 by hand, not read back
// from the fake; the shape check is platform's validateExperimentResult (no local copy).
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExperimentResult } from '../../../echo/contracts.js';
import { createFakeQuantum, randomGenericState, GENERIC_AXIS_BOUND } from '../fakeQuantum.js';

const TOL = 1e-9;
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < TOL, `${msg}: ${a} vs ${b}`);
const fast = () => createFakeQuantum({ delayMs: 0 });
const valid = (r) => assert.deepEqual(validateExperimentResult(r), [], JSON.stringify(r));
const NAMED = { zero: [0, 0], one: [Math.PI, 0], plus: [Math.PI / 2, 0], minus: [Math.PI / 2, Math.PI], phase: [Math.PI / 2, Math.PI / 2] };

test('every result passes platform validateExperimentResult and says documented_preview in engine and facts', async () => {
  const q = fast();
  const rs = [await q.cloneTest('zero'), await q.cloneTest('plus'), await q.bellSignalling('X'),
    await q.teleportDryRun(false, false, { m0: 0, m1: 0 }), await q.commitStoryToken()];
  for (const r of rs) {
    valid(r);
    assert.equal(r.engine, 'documented_preview');
    assert.ok(r.facts.some((f) => /not by Qiskit/.test(f)));
  }
});

test('§7.2 cloning: basis states copy, |+> and phase states do not', async () => {
  const q = fast();
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
  close(plus.probabilities['01'] + plus.probabilities['10'], 0, '|+> 01+10');
  close((await q.cloneTest('one')).probabilities['11'], 1, '|1> -> |11>');
});

test('§7.3 no-signalling: receiver marginal (keyQubits [1]) is 1/2,1/2 for I, X and Z; joint correlations differ I vs X', async () => {
  const q = fast();
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

test('§7.4 teleportation: fidelity 1 iff X==m1 and Z==m0, on named and random generic states', async () => {
  const q = fast();
  const states = [...Object.values(NAMED).map(([theta, phi]) => ({ theta, phi })), { theta: 1.137, phi: 0.44 }];
  for (const angles of states) {
    for (const m0 of [0, 1]) for (const m1 of [0, 1]) for (const X of [false, true]) for (const Z of [false, true]) {
      const r = await q.teleportDryRun(X, Z, { m0, m1 }, angles);
      assert.deepEqual(r.measurementBits, { m0, m1 });
      if (X === (m1 === 1) && Z === (m0 === 1)) close(r.fidelity, 1, `${JSON.stringify(angles)} m0=${m0} m1=${m1} correct`);
    }
  }
});

test('rulings 7/11: every dry run draws a fresh generic state, and every wrong X/Z on it shows fidelity <= 0.81', async () => {
  const q = fast();
  const seen = new Set();
  let wrong = 0;
  for (let i = 0; i < 200; i++) {
    const bits = q.sampleBellBits();
    const X = Math.random() < 0.5; const Z = Math.random() < 0.5;
    const r = await q.teleportDryRun(X, Z, bits);
    seen.add(`${r.parameters.theta},${r.parameters.phi}`);
    if (X !== (bits.m1 === 1) || Z !== (bits.m0 === 1)) {
      wrong++;
      assert.ok(r.fidelity <= GENERIC_AXIS_BOUND ** 2 + TOL, `wrong choice showed ${r.fidelity}`);
    }
  }
  assert.equal(seen.size, 200, 'a fresh state every attempt');
  assert.ok(wrong > 50, `exercised ${wrong} wrong choices`);
});

test('randomGenericState stays off every Pauli axis', () => {
  for (let i = 0; i < 2000; i++) {
    const { theta, phi } = randomGenericState();
    const n = [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
    assert.ok(n.every((x) => Math.abs(x) <= GENERIC_AXIS_BOUND));
  }
});

test('commitStoryToken is one atomic call: live bits, rule corrections, fidelity 1, and the token angles are not shown', async () => {
  const q = fast();
  const r = await q.commitStoryToken();
  assert.equal(r.parameters.stateId, 'story_token');
  assert.equal(r.parameters.correctionX, r.measurementBits.m1 === 1);
  assert.equal(r.parameters.correctionZ, r.measurementBits.m0 === 1);
  close(r.fidelity, 1, 'story token fidelity');
  assert.equal(r.parameters.theta, undefined);
});

test('Bell bits are sampled uniformly over the four outcomes', async () => {
  let i = 0;
  const seq = [0.1, 0.3, 0.6, 0.9];
  const q = createFakeQuantum({ delayMs: 0, random: () => seq[i++ % 4] });
  const seen = new Set();
  for (let k = 0; k < 4; k++) { const b = q.sampleBellBits(); seen.add(`${b.m0}${b.m1}`); }
  assert.equal(seen.size, 4);
});

test('injectable failure rejects the next call only, then the adapter recovers', async () => {
  const q = fast();
  q.failNext('simulated bridge timeout');
  await assert.rejects(q.cloneTest('plus'), /simulated bridge timeout/);
  valid(await q.cloneTest('plus'));
});

test('async delay is real: a call does not resolve synchronously', async () => {
  const q = createFakeQuantum({ delayMs: 30 });
  const t0 = Date.now();
  await q.bellSignalling('I');
  assert.ok(Date.now() - t0 >= 25);
});

test('unknown inputs are refused, not defaulted', async () => {
  const q = fast();
  await assert.rejects(q.cloneTest('minus'), /unknown/);
  await assert.rejects(q.cloneTest('constructor'), /unknown/);
  await assert.rejects(q.bellSignalling('Y'), /unknown/);
  await assert.rejects(q.teleportDryRun('story_token', false, { m0: 0, m1: 0 }), /unknown/);
  await assert.rejects(q.teleportDryRun(false, false, false), /unknown/);
  await assert.rejects(q.teleportDryRun(false, false, { m0: '0', m1: 0 }), /unknown/);
  await assert.rejects(q.teleportDryRun(false, false, { m0: 0, m1: 0 }, { theta: NaN, phi: 0 }), /unknown/);
});
