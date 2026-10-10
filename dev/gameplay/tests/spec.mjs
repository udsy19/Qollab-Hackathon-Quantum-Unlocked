// Ground truth for the quest-machine checks, re-derived from the owner's vision doc bytes
// (ECHO_MASTER_VISION.md §9.1 and §9.2) plus the owner-accepted additions named below.
// It never reads echo/contracts.js, so a drifted table cannot vouch for itself
// (gate-independence law 4). Every line of the §9.2 object must parse: a row this parser cannot
// read is an error, never a skip (law 8; review F8 went green with an edge silently dropped).
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

const ROW = /^([A-Z_]+):\s*\{\s*((?:[A-Z_]+:\s*'[A-Z_]+'\s*,?\s*)*)\},?$/;
const PAIR = /([A-Z_]+):\s*'([A-Z_]+)'/g;

export function parseTransitions(block) {
  const lines = block.split('\n');
  const first = lines.findIndex((l) => /^\s*const transitions = \{\s*$/.test(l));
  if (first < 0) throw new Error('vision doc §9.2: no "const transitions = {" line');
  const last = lines.findIndex((l, i) => i > first && /^\s*\};\s*$/.test(l));
  if (last < 0) throw new Error('vision doc §9.2: transitions object is never closed');
  const edges = [];
  for (let i = first + 1; i < last; i++) {
    const line = lines[i].trim();
    if (line === '') continue;
    const m = line.match(ROW);
    if (!m) throw new Error(`vision doc §9.2 line ${i - first}: cannot parse ${JSON.stringify(lines[i])}`);
    const pairs = [...m[2].matchAll(PAIR)];
    if (pairs.length === 0) throw new Error(`vision doc §9.2 line ${i - first}: row ${m[1]} has no edges`);
    for (const p of pairs) edges.push({ from: m[1], event: p[1], to: p[2] });
  }
  return edges;
}

// Owner-accepted additions (owner-answers 2026-10-10 § 13 lane design questions, item 1), as named
// by platform's CONTRACTS.md § Additions: item 1 (BOOT -> TITLE, DECLASSIFIED -> CREDITS,
// DECLASSIFIED -> ENDING, which contracts v2 names CLOSE_SCIENCE) and item 12 ("the ENDING screen
// offers RESTART directly").
export const ACCEPTED_ADDITIONS = Object.freeze([
  { from: 'BOOT', event: 'BOOT_COMPLETE', to: 'TITLE' },
  { from: 'DECLASSIFIED', event: 'OPEN_CREDITS', to: 'CREDITS' },
  { from: 'DECLASSIFIED', event: 'CLOSE_SCIENCE', to: 'ENDING' },
  { from: 'ENDING', event: 'RESTART', to: 'TITLE' },
]);

export function loadSpec(path = VISION_PATH) {
  const text = readFileSync(path, 'utf8');
  const states = section(text, '## 9.1 Required states')
    .split('\n').map((s) => s.trim()).filter(Boolean);
  if (states.length === 0) throw new Error('vision doc §9.1: zero states parsed');
  const edges = parseTransitions(section(text, '## 9.2 Type-safe-ish transition design'));
  if (edges.length === 0) throw new Error('vision doc §9.2: zero edges parsed');
  const all = [...edges, ...ACCEPTED_ADDITIONS];
  const events = [...new Set(all.map((e) => e.event))];
  return { states, edges: all, events, docEdgeCount: edges.length };
}

export const edgeKey = (e) => `${e.from} --${e.event}--> ${e.to}`;
