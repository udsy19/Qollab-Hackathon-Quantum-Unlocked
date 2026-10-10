// One-off probe (not a gate): do platform's two-phase dry-run validators accept the engine's real
// results as emitted?  node probe_contract_seam.mjs <dir with echo/contracts.js> <real-results.json>
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [root, json] = process.argv.slice(2);
const k = await import(pathToFileURL(resolve(root, 'echo/contracts.js')).href);
const R = JSON.parse(readFileSync(json, 'utf8'));
const ANGLES = { bloch_a: [1.137, 0.44], bloch_b: [2.3, -1.9] }; // quantum/__init__.py STATES
let p1 = 0; let p1ok = 0; let p2 = 0; let p2ok = 0; const why = new Map();
for (const b of R.bits) { const [theta, phi] = ANGLES[b.parameters.state]; const e = k.validateTeleportBitsResult({ theta, phi }, b); p1++; if (!e.length) p1ok++; else for (const x of e) why.set(x.replace(/-?\d[\d.e-]*/g, '#'), (why.get(x.replace(/-?\d[\d.e-]*/g, '#')) ?? 0) + 1); }
for (const b of R.branches.filter((x) => ANGLES[x.parameters.state])) {
  const [theta, phi] = ANGLES[b.parameters.state]; const { m0, m1, applyX, applyZ } = b.parameters;
  const e = k.validateTeleportCorrectionResult({ theta, phi, m0, m1, applyX, applyZ }, b); p2++; if (!e.length) p2ok++; else for (const x of e) why.set(x.replace(/-?\d[\d.e-]*/g, '#'), (why.get(x.replace(/-?\d[\d.e-]*/g, '#')) ?? 0) + 1);
}
console.log(`phase-1 (bell_measurement) results accepted by validateTeleportBitsResult: ${p1ok}/${p1}`);
console.log(`phase-2 (teleport_branch, generic states) accepted by validateTeleportCorrectionResult: ${p2ok}/${p2}`);
for (const [w, n] of [...why].sort((a, b) => b[1] - a[1])) console.log(`  ${n}x ${w}`);
