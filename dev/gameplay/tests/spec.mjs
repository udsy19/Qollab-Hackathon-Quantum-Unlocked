// Ground truth for the quest-machine checks, re-derived from the owner's vision doc bytes
// (ECHO_MASTER_VISION.md §9.1 and §9.2) plus the edges the gameplay supervisor's brief adds.
// It never reads echo/game/state.js, so a drifted TRANSITIONS table cannot vouch for itself
// (gate-independence law 4).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const VISION_PATH = resolve(here, '../../../ECHO_MASTER_VISION.md');

function section(text, heading) {
  const start = text.indexOf(heading);
  if (start < 0) throw new Error(`vision doc: heading not found: ${heading}`);
  const open = text.indexOf('```', start);
  const body = text.indexOf('\n', open) + 1;
  const close = text.indexOf('```', body);
  if (open < 0 || close < 0) throw new Error(`vision doc: no code block under ${heading}`);
  return text.slice(body, close);
}

export function loadSpec(path = VISION_PATH) {
  const text = readFileSync(path, 'utf8');
  const states = section(text, '## 9.1 Required states')
    .split('\n').map((s) => s.trim()).filter(Boolean);
  if (states.length === 0) throw new Error('vision doc §9.1: zero states parsed');

  const edges = [];
  for (const line of section(text, '## 9.2 Type-safe-ish transition design').split('\n')) {
    const m = line.match(/^\s{2}([A-Z_]+):\s*\{(.*)\},?\s*$/);
    if (!m) continue;
    for (const pair of m[2].matchAll(/([A-Z_]+):\s*'([A-Z_]+)'/g)) {
      edges.push({ from: m[1], event: pair[1], to: pair[2] });
    }
  }
  if (edges.length === 0) throw new Error('vision doc §9.2: zero edges parsed');

  // Additions named in the gameplay brief (consult 1), not in §9.2.
  const BRIEF_EDGES = [
    { from: 'BOOT', event: 'BOOTED', to: 'TITLE' },
    { from: 'DECLASSIFIED', event: 'RESTART', to: 'TITLE' },
    { from: 'CREDITS', event: 'RESTART', to: 'TITLE' },
    { from: 'DECLASSIFIED', event: 'OPEN_CREDITS', to: 'CREDITS' },
    { from: 'CREDITS', event: 'OPEN_SCIENCE', to: 'DECLASSIFIED' },
  ];
  const all = [...edges, ...BRIEF_EDGES];
  const events = [...new Set(all.map((e) => e.event))];
  return { states, edges: all, events, docEdgeCount: edges.length };
}

export const edgeKey = (e) => `${e.from} --${e.event}--> ${e.to}`;
