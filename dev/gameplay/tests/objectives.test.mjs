import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSpec } from './spec.mjs';
import { objectiveFor } from '../../../echo/game/objectives.js';

test('every §9.1 state has exactly one objective id (states from the doc, not the map)', () => {
  for (const s of loadSpec().states) {
    const id = objectiveFor(s);
    assert.match(id, /^obj\.[a-z_]+$/, s);
  }
  assert.throws(() => objectiveFor('NOT_A_STATE'));
});

test('the mission states point the player at the right place', () => {
  assert.equal(objectiveFor('FREE_ROAM_ALLEY'), 'obj.find_booth');
  assert.equal(objectiveFor('RELAY_UNLOCKED'), 'obj.reach_relay');
  assert.equal(objectiveFor('ROOFTOP_UNLOCKED'), 'obj.repair_link');
});
