// backend-site-research harness entry (replaces echo/main.js in a DISPOSABLE copy only; never shipped).
// Asks bridge.js for the selected-backend verification TWICE and renders what came back. It grades
// nothing: drive.cjs reads the JSON plus the runner's own counter and decides.
import * as spy from 'bs_spy';
import * as bridge from './quantum/bridge.js';

const BUILD = '__BUILD_TOKEN__';
const VARIANT = '__VARIANT__';
const $ = (id) => document.getElementById(id);
$('build-token').textContent = BUILD;
$('variant').textContent = VARIANT;
$('backend-name').textContent = String(backend.name);

const settle = (p) => p.then((result) => ({ status: 'verified', result }),
  (err) => ({ status: 'rejected', name: err?.name, message: String(err?.message ?? err), errors: err?.errors ?? null }));
const p1 = bridge.verifySelectedBackendOnce();
const p2 = bridge.verifySelectedBackendOnce();
const [first, second] = await Promise.all([settle(p1), settle(p2)]);
const snap = spy.snapshot();
const dump = { build: BUILD, variant: VARIANT, backendName: String(backend.name), samePromise: p1 === p2, first, second,
  spy: snap.toJs({ dict_converter: Object.fromEntries }) };
snap.destroy();

const row = (k, v) => { const tr = document.createElement('tr'); for (const t of [k, v]) { const td = document.createElement('td'); td.textContent = t; tr.appendChild(td); } $('rows').appendChild(tr); };
row('verify #1', first.status === 'verified' ? `verified · counts ${JSON.stringify(first.result.counts)} · keyQubits ${JSON.stringify(first.result.keyQubits)}` : `${first.name}: ${first.message}`);
row('verify #2 same promise', String(dump.samePromise));
row('Python-side backend.run calls (spy)', String(dump.spy.pythonBackendRunCalls));
row('raw counts of each job (spy, before qollab_job)', JSON.stringify(dump.spy.jobs.map((j) => j.rawCounts ?? null)));
$('harness-json').textContent = JSON.stringify(dump, null, 1);
console.log(`harness ${VARIANT}: python-side backend.run calls ${dump.spy.pythonBackendRunCalls}`);
