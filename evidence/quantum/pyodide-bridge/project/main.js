// pyodide-bridge harness entry (replaces echo/main.js in a DISPOSABLE copy only; never shipped).
// Drives every adapter in echo/quantum/bridge.js inside the local runner's Pyodide and renders
// what came back. It grades nothing itself: drive.cjs reads the rendered JSON and re-validates it
// in Node from the contract bytes.
import * as spy from 'pb_spy';
import * as bridge from './quantum/bridge.js';
import { validateExperimentResult } from './contracts.js';

const BUILD = '__BUILD_TOKEN__';
const tBody = performance.now(); // ms since the frame started: Pyodide + Qiskit + module imports
const $ = (id) => document.getElementById(id);
$('build-token').textContent = BUILD;
$('backend-name').textContent = String(backend.name);

const plainOf = (proxy) => { try { return proxy.toJs({ dict_converter: Object.fromEntries }); } finally { proxy.destroy(); } };
const calls = [];

function describe(value) {
  // Facts about the delivered JS value that JSON would erase (a Map stringifies as {}).
  return {
    isMap: value instanceof Map,
    factsIsArray: Array.isArray(value?.facts),
    proxyFields: Object.entries(value ?? {}).filter(([, v]) => v && typeof v === 'object' && typeof v.toJs === 'function').map(([k]) => k),
  };
}

async function call(label, fn) {
  const t0 = performance.now();
  const rec = { label };
  try {
    const value = await fn();
    rec.ms = +(performance.now() - t0).toFixed(1);
    rec.ok = true;
    rec.shape = describe(value);
    rec.pageVerdict = validateExperimentResult(value);
    rec.result = value;
  } catch (err) {
    rec.ms = +(performance.now() - t0).toFixed(1);
    rec.ok = false;
    rec.error = { name: err?.name, message: String(err?.message ?? err), errors: err?.errors ?? null };
  }
  calls.push(rec);
  row(rec);
  return rec;
}

function row(rec) {
  const tr = document.createElement('tr');
  const verdict = rec.ok ? (rec.pageVerdict.length ? `REJECTED: ${rec.pageVerdict.join('; ')}` : 'valid') : `${rec.error.name}: ${rec.error.message}`;
  const key = rec.ok ? (rec.result.fidelity !== undefined ? `F=${rec.result.fidelity}` : rec.result.probabilities ? JSON.stringify(rec.result.probabilities) : '') : '';
  for (const text of [rec.label, `${rec.ms} ms`, verdict, key]) {
    const td = document.createElement('td');
    td.textContent = text;
    tr.appendChild(td);
  }
  tr.className = rec.ok && !rec.pageVerdict.length ? 'ok' : 'bad';
  $('rows').appendChild(tr);
}

// Mission 1: the copy booth.
for (const s of ['plus', 'plus', 'plus', 'zero', 'one', 'bloch_a']) await call(`cloning(${s})`, () => bridge.cloneTest(s));
// Mission 2: the relay.
for (const g of ['I', 'X', 'Z']) await call(`relay(${g})`, () => bridge.bellSignalling(g));
// Mission 3: calibration bits first, then the player's X/Z choice on those bits (owner ruling 2026-10-10).
const cal = await call('calibration(bloch_a)', () => bridge.calibrationMeasurement('bloch_a'));
const bits = cal.ok ? cal.result.measurementBits : { m0: 1, m1: 0 };
for (const [x, z] of [[false, false], [true, false], [false, true], [true, true]])
  await call(`dryRun(bloch_a, m0=${bits.m0}, m1=${bits.m1}, X=${x}, Z=${z})`, () => bridge.teleportDryRun('bloch_a', x, z, bits));
await call('dryRun(bloch_a, m0=1, m1=0, X=false, Z=false)', () => bridge.teleportDryRun('bloch_a', false, false, { m0: 1, m1: 0 }));
// The story token: committed once; a second call must hand back the same recorded result.
const c1p = bridge.commitTransfer('bloch_b');
const c2p = bridge.commitTransfer('bloch_b');
const commit1 = await call('commit#1(bloch_b)', () => c1p);
const commit2 = await call('commit#2(bloch_b)', () => c2p);
const commit3 = await call('commit#3 after settle', () => bridge.commitTransfer('bloch_b'));

// The one selected-backend job, asked for twice.
const tv = performance.now();
const v1 = bridge.verifySelectedBackendOnce();
const v2 = bridge.verifySelectedBackendOnce();
const settle = (p) => p.then((result) => ({ status: 'verified', result }), (e) => ({ status: 'rejected', name: e?.name, message: String(e?.message ?? e), errors: e?.errors ?? null }));
const [r1, r2] = await Promise.all([settle(v1), settle(v2)]);
const verifyMs = +(performance.now() - tv).toFixed(1);
const r1Verdict = r1?.status === 'verified' ? validateExperimentResult(r1.result) : null;

// What does a BARE toJs() give on this Pyodide? (The contract and the vision assume a Map.)
const probe = await spy.nested_probe.callPromising();
const bare = probe.toJs();
const toJsDefault = { topIsMap: bare instanceof Map, topType: Object.prototype.toString.call(bare), innerIsMap: (bare instanceof Map ? bare.get('outer') : bare.outer) instanceof Map, listIsArray: Array.isArray(bare instanceof Map ? bare.get('list') : bare.list), json: JSON.stringify(bare) };
probe.destroy();

const dump = {
  toJsDefault,
  build: BUILD,
  backendName: String(backend.name),
  platform: plainOf(await spy.platform.callPromising()),
  timing: { msFrameStartToMainBody: +tBody.toFixed(1), verifyMs },
  calls,
  commit: { samePromise: c1p === c2p, sameObjectAfterSettle: commit1.result !== undefined && commit1.result === commit3.result && commit1.result === commit2.result },
  verification: { samePromise: v1 === v2, first: r1, second: r2, sameValue: r1.result === r2.result && r1.message === r2.message, pageVerdictOfFirst: r1Verdict },
  spy: plainOf(await spy.snapshot.callPromising()),
};
$('harness-json').textContent = JSON.stringify(dump, null, 2);
$('verify-line').textContent = `verifySelectedBackendOnce ×2 → ${r1.status} · same promise: ${v1 === v2} · ` +
  `spy: backend.run attempts ${dump.spy.counts.backendRunAttempts}, completed ${dump.spy.counts.backendRunCompleted}, ` +
  `qollab_job calls ${dump.spy.counts.verificationCalls}` + (r1.message ? ` · ${r1.name}: ${r1.message}` : '');
$('platform-line').textContent = `Python ${dump.platform.python} on ${dump.platform.sysPlatform} · Qiskit ${dump.platform.qiskit} · main.js body at ${dump.timing.msFrameStartToMainBody} ms`;
$('status').textContent = 'harness finished';
