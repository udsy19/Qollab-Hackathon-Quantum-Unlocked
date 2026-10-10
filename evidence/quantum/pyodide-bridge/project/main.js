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

// `hook`: a call that returns no ExperimentResult (RESTART), so there is nothing to validate.
async function call(label, fn, { hook = false } = {}) {
  const t0 = performance.now();
  const rec = { label, hook };
  try {
    const value = await fn();
    rec.ms = +(performance.now() - t0).toFixed(1);
    rec.ok = true;
    rec.shape = describe(value);
    rec.pageVerdict = hook ? [] : validateExperimentResult(value);
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
  const r = rec.result ?? {};
  const bits = r.measurementBits ? `m0=${r.measurementBits.m0} m1=${r.measurementBits.m1}` : '';
  const angles = r.parameters?.theta !== undefined ? ` θ=${r.parameters.theta} φ=${r.parameters.phi}` : '';
  const key = !rec.ok || rec.hook ? '' : r.fidelity !== undefined ? `${bits} F=${r.fidelity}${angles}` : bits ? `${bits}${angles}` : r.probabilities ? JSON.stringify(r.probabilities) : '';
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
// Mission 3, the two-phase dry run (owner ruling 2026-10-10): each calibration draws a FRESH random
// generic state in Python; the player sees the bits, then picks X/Z on THAT result. Draws are
// repeated until one lands on a non-00 branch (a 00 pass does not unlock the commit), at most 12.
const draws = [];
for (let i = 0; i < 12; i++) {
  const rec = await call(`calibration#${i + 1}`, () => bridge.calibrationMeasurement());
  draws.push(rec);
  const b = rec.ok ? rec.result.measurementBits : null;
  if (draws.length >= 2 && (!b || b.m0 || b.m1)) break;
}
const cal = draws.find((d) => d.ok && (d.result.measurementBits.m0 || d.result.measurementBits.m1)) || draws[draws.length - 1];
const dryRuns = [];
for (const [x, z] of [[false, false], [true, false], [false, true], [true, true]])
  dryRuns.push(await call(`dryRun(${cal.label}, X=${x}, Z=${z})`, () => bridge.teleportDryRun(cal.result, x, z)));

// The story token: committed once. A second call must hand back the same recorded result, and
// Python must refuse a second live_commit even past the JS latch.
const c1p = (async () => bridge.commitTransfer())();
const c2p = (async () => bridge.commitTransfer())();
const commit1 = await call('commit#1', () => c1p);
const commit2 = await call('commit#2', () => c2p);
const commit3 = await call('commit#3 after settle', () => bridge.commitTransfer());
const pythonSecondCommit = plainOf(await spy.direct_second_commit.callPromising());

// The one selected-backend job, asked for twice.
const tv = performance.now();
const v1 = bridge.verifySelectedBackendOnce();
const v2 = bridge.verifySelectedBackendOnce();
const settle = (p) => Promise.resolve(p).then((result) => ({ status: 'verified', result }), (e) => ({ status: 'rejected', name: e?.name, message: String(e?.message ?? e), errors: e?.errors ?? null }));
const [r1, r2] = await Promise.all([settle(v1), settle(v2)]);
const verifyMs = +(performance.now() - tv).toFixed(1);
const r1Verdict = r1?.status === 'verified' ? validateExperimentResult(r1.result) : null;

// RESTART (the ending screen): the token is re-armed, the backend job is NOT.
await call('RESTART: resetStoryToken()', async () => { await bridge.resetStoryToken(); return { restarted: true }; }, { hook: true });
const commit4 = await call('commit#4 after RESTART', () => bridge.commitTransfer());
const v3 = (() => { try { return bridge.verifySelectedBackendOnce(); } catch (e) { return Promise.reject(e); } })();
const r3 = await settle(v3);

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
  dryRun: { calibration: cal.label, draws: draws.map((d) => d.label) },
  commit: {
    sameRecordedObject: commit1.result !== undefined && commit1.result === commit2.result && commit1.result === commit3.result,
    pythonSecondCommit,
    afterRestartIsNewObject: commit4.ok && commit4.result !== commit1.result,
  },
  verification: { samePromise: v1 === v2, first: r1, second: r2, sameValue: r1.result === r2.result && r1.message === r2.message, pageVerdictOfFirst: r1Verdict,
    afterRestartSamePromise: v3 === v1, afterRestart: r3 },
  spy: plainOf(await spy.snapshot.callPromising()),
};
$('harness-json').textContent = JSON.stringify(dump, null, 2);
const vr = r1.result;
$('verify-line').textContent = `verifySelectedBackendOnce ×2 → ${r1.status}` +
  (vr ? ` · experiment "${vr.experiment}" · engine ${vr.engine} · counts ${JSON.stringify(vr.counts)} · shots ${vr.parameters?.shots} · contract verdict: ${r1Verdict.length ? r1Verdict.join('; ') : 'valid'}` : '') +
  ` · same promise: ${v1 === v2} · after RESTART same promise: ${v3 === v1} · ` +
  `spy: backend.run attempts ${dump.spy.counts.backendRunAttempts} (from JS ${dump.spy.counts.backendRunFromJs}, from Python ${dump.spy.counts.backendRunFromPython}), ` +
  `completed ${dump.spy.counts.backendRunCompleted}, interpret_counts calls ${dump.spy.counts.interpretCalls}` + (r1.message ? ` · ${r1.name}: ${r1.message}` : '');
$('platform-line').textContent = `Python ${dump.platform.python} on ${dump.platform.sysPlatform} · Qiskit ${dump.platform.qiskit} · main.js body at ${dump.timing.msFrameStartToMainBody} ms`;
$('status').textContent = 'harness finished';
