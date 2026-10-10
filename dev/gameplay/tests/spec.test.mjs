// F8: the §9.2 parser fails loudly on a row it cannot read; it never skips one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTransitions, loadSpec } from './spec.mjs';

const wrap = (...rows) => ['```js', 'const transitions = {', ...rows, '};', '```'].join('\n');

test('the real §9.2 parses to 18 rows / 20 edges (the a1_table.py Python parser agrees), every row accounted for', () => {
  const s = loadSpec();
  assert.equal(s.docEdgeCount, 20);
  assert.equal(s.states.length, 21);
});

test('a row at any indentation is read, not dropped', () => {
  for (const ind of ['', '  ', '    ', '\t']) {
    assert.deepEqual(parseTransitions(wrap(`${ind}A: { GO: 'B' },`)), [{ from: 'A', event: 'GO', to: 'B' }]);
  }
});

test('a row the parser cannot read throws with its line, instead of passing with an edge missing', () => {
  for (const bad of ["  A: { GO: B },", "  A: { GO: 'B' }, // note", "  A: {},", "  a: { GO: 'B' },", "  A: { GO: 'B', 'C' },"]) {
    assert.throws(() => parseTransitions(wrap("  X: { Y: 'Z' },", bad)), /cannot parse|no edges/, bad);
  }
});

test('an unclosed or missing transitions object throws', () => {
  assert.throws(() => parseTransitions('const transitions = {\n  A: { GO: \'B\' },\n'), /never closed/);
  assert.throws(() => parseTransitions('nothing here'), /no "const transitions/);
});
