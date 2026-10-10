// The dev-only fake adapter must tell the physics truth of vision §7 for the documented cases.
// Expected numbers are written from §7.2–§7.4 by hand, not read back from the fake.
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertExperimentResult } from './schema.mjs';
import { createFakeQuantum } from '../fakeQuantum.js';

const TOL = 1e-9;
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < TOL, `${msg}: ${a} vs ${b}`);
const fast = () => createFakeQuantum({ delayMs: 0 });

test('every result is a schema-valid ExperimentResult labelled documented_preview', async () => {
  const q = fast();
  const rs = [
    await q.cloneTest('zero'), await q.bellSignalling('X'),
    await q.teleportDryRun('plus', false, false, { m0: 0, m1: 0 }),
    await q.verifySelectedBackendOnce(),
  ];
  for (const r of rs) { assertExperimentResult(r); assert.equal(r.engine, 'documented_preview'); }
});

test('§7.2 cloning: basis states copy, |+> and phase states do not', async () => {
  const q = fast();
  // [state, copy fidelity with |psi>|psi>, purity of each output half]
  const want = { zero: [1, 1], one: [1, 1], plus: [0.5, 0.5], phase: [0.25, 0.5] };
  for (const [s, [fid, purity]] of Object.entries(want)) {
    const r = await q.cloneTest(s);
    assert.equal(r.experiment, 'cloning');
    close(r.fidelity, fid, `${s} copy fidelity`);
    close(r.parameters.reducedPurity, purity, `${s} reduced purity`);
    assert.equal(r.parameters.copied, fid > 1 - 1e-6, `${s} copied flag`);
  }
  // |+> naive clone is the Bell state: only q0q1=00 and 11, half each.
  const plus = await q.cloneTest('plus');
  close(plus.probabilities['q0q1=00'], 0.5, '|+> 00');
  close(plus.probabilities['q0q1=11'], 0.5, '|+> 11');
  close((plus.probabilities['q0q1=01'] ?? 0) + (plus.probabilities['q0q1=10'] ?? 0), 0, '|+> 01+10');
  const one = await q.cloneTest('one');
  close(one.probabilities['q0q1=11'], 1, '|1> -> |11>');
});

test('§7.3 no-signalling: receiver marginal is 0.5/0.5 for I, X and Z; joint Z-basis correlations differ I vs X', async () => {
  const q = fast();
  const joint = {};
  for (const g of ['I', 'X', 'Z']) {
    const r = await q.bellSignalling(g);
    assert.equal(r.experiment, 'bell_signalling');
    close(r.probabilities['receiver=0'], 0.5, `${g} P(0)`);
    close(r.probabilities['receiver=1'], 0.5, `${g} P(1)`);
    joint[g] = r.parameters;
  }
  close(joint.I.jointSame, 1, 'I: outcomes always agree');
  close(joint.X.jointSame, 0, 'X: outcomes always differ');
  close(joint.Z.jointSame, 1, 'Z: Z-basis correlations unchanged');
});

test('§7.4 teleportation: for six+ states and all four branches, fidelity 1 iff X==m1 and Z==m0 (generic states)', async () => {
  const q = fast();
  for (const s of ['zero', 'one', 'plus', 'minus', 'phase', 'bloch']) {
    for (const m0 of [0, 1]) for (const m1 of [0, 1]) {
      for (const X of [false, true]) for (const Z of [false, true]) {
        const r = await q.teleportDryRun(s, X, Z, { m0, m1 });
        assert.deepEqual(r.measurementBits, { m0, m1 });
        const right = X === (m1 === 1) && Z === (m0 === 1);
        if (right) close(r.fidelity, 1, `${s} m0=${m0} m1=${m1} correct`);
        // For the generic Bloch point every wrong choice is visibly wrong. (For |0>, a spurious Z
        // is only a phase and still has fidelity 1 — physically true; see report.)
        if (s === 'bloch' && !right) assert.ok(r.fidelity < 0.99, `${s} wrong corr fidelity ${r.fidelity}`);
      }
    }
  }
});

test('teleport without bits given samples them uniformly-ish and reports them', async () => {
  let i = 0;
  const seq = [0.1, 0.3, 0.6, 0.9];
  const q = createFakeQuantum({ delayMs: 0, random: () => seq[i++ % 4] });
  const seen = new Set();
  for (let k = 0; k < 4; k++) {
    const r = await q.teleportDryRun('plus', false, false);
    seen.add(`${r.measurementBits.m0}${r.measurementBits.m1}`);
  }
  assert.equal(seen.size, 4);
});

test('injectable failure rejects the next call only, then the adapter recovers', async () => {
  const q = fast();
  q.failNext('simulated bridge timeout');
  await assert.rejects(q.cloneTest('plus'), /simulated bridge timeout/);
  assertExperimentResult(await q.cloneTest('plus'));
});

test('async delay is real: a call does not resolve synchronously', async () => {
  const q = createFakeQuantum({ delayMs: 30 });
  const t0 = Date.now();
  await q.bellSignalling('I');
  assert.ok(Date.now() - t0 >= 25);
});

test('verifySelectedBackendOnce: no fabricated counts, and a second call is refused (one job per run)', async () => {
  const q = fast();
  const r = await q.verifySelectedBackendOnce();
  assert.equal(r.counts, undefined, 'a fake must never invent backend counts');
  assert.ok(r.facts.some((f) => /no backend job/i.test(f)));
  await assert.rejects(q.verifySelectedBackendOnce(), /once/);
});

test('unknown inputs are refused, not defaulted', async () => {
  const q = fast();
  await assert.rejects(q.cloneTest('minus'), /unknown/);
  await assert.rejects(q.bellSignalling('Y'), /unknown/);
  await assert.rejects(q.teleportDryRun('nope', false, false), /unknown/);
});
