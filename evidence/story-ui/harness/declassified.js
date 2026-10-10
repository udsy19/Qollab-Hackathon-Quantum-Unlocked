// Harness for Declassified mode (fork of shell.js: different module under test and provenance file
// list; same canvas stand-in and badge). The badge hashes the exact bytes served, in FILES order.
import { mountMenu } from '../../../echo/ui/menu.js';
import { mountDeclassified } from '../../../echo/ui/declassified.js';
import { validateExperimentResult } from '../../../echo/contracts.js';

const VERSION = 'declassified r1';
const FILES = ['echo/main.css', 'echo/ui/accessibility.js', 'echo/ui/menu.js', 'echo/ui/declassified.js', 'echo/data/teachback.js'];

async function servedHash() {
  const parts = await Promise.all(FILES.map((f) => fetch(`../../../${f}`, { cache: 'no-store' }).then((r) => r.arrayBuffer())));
  const all = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let o = 0;
  for (const p of parts) { all.set(new Uint8Array(p), o); o += p.byteLength; }
  const digest = await crypto.subtle.digest('SHA-256', all);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

// SAMPLE run record. Values are the §10.3/§10.4 reference outputs and the CONTRACTS.md worked dry
// run (Qiskit 2.5.2, TELEPORT_TEST_STATE); no backend job, so `backend` is null.
const exact = (experiment, circuitDescription, qubits, extra) => ({ experiment, engine: 'exact_qiskit_local', circuitDescription, qubits, facts: ['sample'], ...extra });
const cloneCirc = 'prepare input on q0; CX(q0,q1)';
const tele = 'q0 = source, q1 = Alice Bell half, q2 = receiver; H(q1); CX(q1,q2); CX(q0,q1); H(q0); measure q0 -> m0, q1 -> m1';
export const SAMPLE = {
  clone: [
    exact('cloning', cloneCirc, 2, { parameters: { state: 'zero' }, probabilities: { '00': 1 }, keyQubits: [1, 0], observables: { purityQ0: 1, purityQ1: 1 } }),
    exact('cloning', cloneCirc, 2, { parameters: { state: 'one' }, probabilities: { '11': 1 }, keyQubits: [1, 0], observables: { purityQ0: 1, purityQ1: 1 } }),
    exact('cloning', cloneCirc, 2, { parameters: { state: 'plus' }, probabilities: { '00': 0.5, '11': 0.5 }, keyQubits: [1, 0], observables: { purityQ0: 0.5, purityQ1: 0.5 } }),
  ],
  relay: ['I', 'X', 'Z'].map((g) => exact('bell_signalling', 'H(q0); CX(q0,q1); sender gate on q0; receiver q1 alone', 2, { parameters: { senderGate: g }, probabilities: { 0: 0.5, 1: 0.5 }, keyQubits: [1] })),
  dryRuns: [
    { bits: exact('teleportation', tele, 3, { parameters: { theta: 1.137, phi: 0.44 }, measurementBits: { m0: 1, m1: 0 } }),
      result: exact('teleportation', tele, 3, { parameters: { theta: 1.137, phi: 0.44, applyX: false, applyZ: false }, measurementBits: { m0: 1, m1: 0 }, fidelity: 0.176668 }) },
    { bits: exact('teleportation', tele, 3, { parameters: { theta: 1.137, phi: 0.44 }, measurementBits: { m0: 1, m1: 0 } }),
      result: exact('teleportation', tele, 3, { parameters: { theta: 1.137, phi: 0.44, applyX: false, applyZ: true }, measurementBits: { m0: 1, m1: 0 }, fidelity: 1 }) },
  ],
  commit: exact('teleportation', tele, 3, { parameters: {}, measurementBits: { m0: 1, m1: 1 }, fidelity: 1 }),
  backend: null,
};
// A record with holes: no relay readings, no dry runs, a commit without its fidelity, an invalid clone.
export const SPARSE = {
  clone: [{ experiment: 'cloning', engine: 'made_up_engine', circuitDescription: 'x', qubits: 2, parameters: {}, facts: ['x'] }],
  commit: exact('teleportation', tele, 3, { parameters: {}, measurementBits: { m0: 0, m1: 1 } }),
};
for (const r of [...SAMPLE.clone, ...SAMPLE.relay, ...SAMPLE.dryRuns.flatMap((d) => [d.bits, d.result]), SAMPLE.commit]) {
  const e = validateExperimentResult(r);
  if (e.length) throw new Error(`harness SAMPLE is not a valid ExperimentResult: ${e.join('; ')}`);
}

const params = new URLSearchParams(location.search);
const root = document.getElementById('ui');
const log = [];
const menu = mountMenu(root, {
  settings: { textScale: Number(params.get('scale') || 100), reducedMotion: params.get('rm') === '1' },
  onStart: () => log.push(['start']),
});
// The ending screen's "Declassified" button stands in for gameplay's OPEN_SCIENCE.
const opener = document.createElement('button');
opener.className = 'echo-button';
opener.textContent = 'Open Declassified';
opener.style.cssText = 'position:absolute;left:40px;top:40px;pointer-events:auto';
root.append(opener);
const declassified = mountDeclassified(root, { menu, onEvent: (name) => log.push(['event', name]) });
opener.addEventListener('click', () => declassified.open(SAMPLE));

window.echoHarness = { menu, declassified, log, SAMPLE, SPARSE, opener };
servedHash().then((h) => {
  document.getElementById('provenance').textContent = `${VERSION} · sha256 ${h}`;
  Object.assign(window.echoHarness, { hash: h, version: VERSION, files: FILES });
});
