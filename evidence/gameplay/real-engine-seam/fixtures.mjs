// Feed v2's OWN fixtures (main: tools/contract-check/fixtures.json good/bad, teleport-fixtures.json
// example) into gameplay's quest code running on main's v2 contracts.js. Expectations: expected.mjs
// (docs only), keyed on each fixture's inputs (parameters / measurementBits), never on its verdict.
// Usage: node fixtures.mjs [--gameplay dir] [--main dir]   Exit 0 all match · 1 a mismatch · 2 could not run.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, machineAt } from './lib.mjs';
import { expectedFor, STATES_FOR } from './expected.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const HERE = fileURLToPath(new URL('.', import.meta.url));
const GAMEPLAY = resolve(arg('--gameplay', '/tmp/seam-gameplay'));
const MAIN = resolve(arg('--main', '/tmp/seam-main'));
const fx = JSON.parse(readFileSync(join(MAIN, 'tools/contract-check/fixtures.json'), 'utf8'));
const tfx = JSON.parse(readFileSync(join(MAIN, 'tools/contract-check/teleport-fixtures.json'), 'utf8'));
const G = await load(GAMEPLAY, join(MAIN, 'echo/contracts.js'), 'fixtures');

const MISSION = { cloning: 'cloning', bell_signalling: 'bell', teleportation: 'teleport_correction' };
function asRow(result) {
  const p = result.parameters ?? {};
  const mb = result.measurementBits ?? {};
  const mission = MISSION[result.experiment];
  if (!mission) return null;
  if (mission === 'teleport_correction' && result.fidelity === undefined) return { mission: 'teleport_bits', engine: result.engine };
  return { mission, engine: result.engine, state: p.state, senderGate: p.senderGate, m0: mb.m0, m1: mb.m1, applyX: p.applyX, applyZ: p.applyZ, theta: p.theta };
}

const lines = [];
let mismatches = 0;
const cases = [
  ...fx.good.map((g, i) => [`good[${i}] ${g.name}`, g.result ?? g]),
  ['teleport example bitsResult', tfx.example.bitsResult],
  ...tfx.example.corrections.map((c, i) => [`teleport example correction[${i}] X=${c.request.applyX} Z=${c.request.applyZ}`, c.result]),
];
for (const [name, result] of cases) {
  const row = asRow(result);
  if (!row) { lines.push(`| ${name} | — | (no quest state consumes ${result.experiment}) | — | — | n/a |`); continue; }
  for (const qs of STATES_FOR[row.mission]) {
    const expected = expectedFor(row, qs);
    const m = machineAt(G, qs);
    const out = await m.experiment(async () => structuredClone(result));
    const verdict = expected === undefined ? 'UNSETTLED' : expected === out.event ? 'PASS' : 'FAIL';
    if (verdict === 'FAIL') mismatches++;
    lines.push(`| ${name} | ${qs} | ${expected ?? 'none'} | ${out.event ?? 'none'} | ${(out.reason ?? '').slice(0, 80)} | ${verdict} |`);
  }
}
let badRefused = 0;
for (const b of fx.bad) {
  const r = b.result ?? b.value ?? b;
  const out = G.rules.eventForResult('CLONE_INTRO', r);
  if (out.event === null) badRefused++;
}
const md = ['| fixture | quest state | expected (docs) | gameplay event | gameplay reason | verdict |', '|---|---|---|---|---|---|', ...lines,
  '', `bad fixtures refused by gameplay eventForResult (CLONE_INTRO): ${badRefused}/${fx.bad.length}`];
writeFileSync(join(HERE, 'out/fixtures.md'), md.join('\n') + '\n');
console.log(md.join('\n'));
if (!cases.length) process.exit(2);
process.exit(mismatches ? 1 : 0);
