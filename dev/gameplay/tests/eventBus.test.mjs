import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../../../echo/game/eventBus.js';

test('on/emit is synchronous and delivers the payload in subscription order', () => {
  const bus = createEventBus();
  const seen = [];
  bus.on('a', (p) => seen.push(['1', p]));
  bus.on('a', (p) => seen.push(['2', p]));
  bus.emit('a', 7);
  assert.deepEqual(seen, [['1', 7], ['2', 7]]);
});

test('off function unsubscribes only that listener and is safe to call twice', () => {
  const bus = createEventBus();
  const seen = [];
  const off = bus.on('a', () => seen.push('x'));
  bus.on('a', () => seen.push('y'));
  off(); off();
  bus.emit('a');
  assert.deepEqual(seen, ['y']);
});

test('a throwing listener does not stop the others, and the error is reported', () => {
  const errors = [];
  const bus = createEventBus({ onError: (err, type) => errors.push([err.message, type]) });
  const seen = [];
  bus.on('a', () => { throw new Error('boom'); });
  bus.on('a', () => seen.push('after'));
  bus.emit('a');
  assert.deepEqual(seen, ['after']);
  assert.deepEqual(errors, [['boom', 'a']]);
});

test('unsubscribing during emit does not skip the next listener', () => {
  const bus = createEventBus();
  const seen = [];
  const off = bus.on('a', () => { seen.push('1'); off(); });
  bus.on('a', () => seen.push('2'));
  bus.emit('a');
  bus.emit('a');
  assert.deepEqual(seen, ['1', '2', '2']);
});

test('emit with no listeners is a no-op', () => {
  assert.doesNotThrow(() => createEventBus().emit('nobody'));
});
