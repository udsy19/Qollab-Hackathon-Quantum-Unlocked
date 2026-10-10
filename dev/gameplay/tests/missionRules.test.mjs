// The quest only advances on a result that shows the lesson; a bare click or a wrong result does nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { eventForResult, expectedCorrections } from '../../../echo/game/missionRules.js';
import { createFakeQuantum } from '../fakeQuantum.js';

const q = createFakeQuantum({ delayMs: 0 });

test('expectedCorrections is the §7.1 rule: X iff m1=1, Z iff m0=1', () => {
  assert.deepEqual(expectedCorrections(0, 0), { applyX: false, applyZ: false });
  assert.deepEqual(expectedCorrections(0, 1), { applyX: true, applyZ: false });
  assert.deepEqual(expectedCorrections(1, 0), { applyX: false, applyZ: true });
  assert.deepEqual(expectedCorrections(1, 1), { applyX: true, applyZ: true });
  assert.throws(() => expectedCorrections(2, 0));
});

test('no result (a bare click) never advances any mission state', () => {
  for (const s of ['CLONE_INTRO', 'CLONE_BASIS_PASSED', 'RELAY_INTRO', 'RELAY_BELL_CREATED', 'TELEPORT_DRY_RUN', 'TELEPORT_DRY_RUN_PASSED']) {
    assert.equal(eventForResult(s, undefined).event, null, s);
    assert.equal(eventForResult(s, {}).event, null, s);
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

test('relay: any Bell result prepares the pair; only a local X/Z attempt with a 50/50 receiver counts as the failed send', async () => {
  const I = await q.bellSignalling('I');
  const X = await q.bellSignalling('X');
  assert.equal(eventForResult('RELAY_INTRO', I).event, 'PREPARE_BELL_PAIR');
  assert.equal(eventForResult('RELAY_BELL_CREATED', I).event, null, 'doing nothing is not an attempt to signal');
  assert.equal(eventForResult('RELAY_BELL_CREATED', X).event, 'ATTEMPT_NO_SIGNALLING');
  assert.equal(eventForResult('RELAY_BELL_CREATED', await q.cloneTest('plus')).event, null);
});

test('dry run: advances only with corrections matching the bits AND fidelity ~1, never on the story token', async () => {
  for (const m0 of [0, 1]) for (const m1 of [0, 1]) {
    for (const X of [false, true]) for (const Z of [false, true]) {
      const r = await q.teleportDryRun('zero', X, Z, { m0, m1 });
      const right = X === (m1 === 1) && Z === (m0 === 1);
      // |0> with a spurious Z has fidelity 1 — the rule must still refuse it.
      assert.equal(eventForResult('TELEPORT_DRY_RUN', r).event, right ? 'CORRECT_CALIBRATION' : null, `X=${X} Z=${Z} m0=${m0} m1=${m1}`);
    }
  }
  const token = await q.teleportDryRun('story_token', false, false, { m0: 0, m1: 0 });
  assert.equal(eventForResult('TELEPORT_DRY_RUN', token).event, null, 'calibration may not spend the story token');
});

test('commit: only a correct transfer of the story token advances TELEPORT_DRY_RUN_PASSED', async () => {
  const good = await q.teleportDryRun('story_token', true, false, { m0: 0, m1: 1 });
  const wrong = await q.teleportDryRun('story_token', false, false, { m0: 0, m1: 1 });
  const calib = await q.teleportDryRun('plus', true, false, { m0: 0, m1: 1 });
  assert.equal(eventForResult('TELEPORT_DRY_RUN_PASSED', good).event, 'COMMIT_TRANSFER');
  assert.equal(eventForResult('TELEPORT_DRY_RUN_PASSED', wrong).event, null);
  assert.equal(eventForResult('TELEPORT_DRY_RUN_PASSED', calib).event, null);
});

test('states without an experiment never map a result to an event', async () => {
  const r = await q.cloneTest('zero');
  for (const s of ['BOOT', 'TITLE', 'FREE_ROAM_ALLEY', 'ENDING', 'CREDITS']) assert.equal(eventForResult(s, r).event, null);
});
