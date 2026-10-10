// engine-bridge-review probe entry (replaces echo/main.js in a DISPOSABLE copy). Grades nothing:
// drive.cjs reads #harness-json and derive.py compares the numbers with its own numpy.
import * as probe from 'ebr_probe';
import * as teleportation from 'quantum.teleportation';
import * as bridge from './quantum/bridge.js';
import { validateCommitResult, validateExperimentResult } from './contracts.js';

const BUILD = '__BUILD_TOKEN__';
const STATES = '__STATES__';
const $ = (id) => document.getElementById(id);
$('build-token').textContent = BUILD;
const plainOf = (p) => { try { return p.toJs({ dict_converter: Object.fromEntries }); } finally { p.destroy(); } };
const settle = (p) => Promise.resolve(p).then((r) => ({ ok: true, r }), (e) => ({ ok: false, name: e?.name, message: String(e?.message ?? e).split('\n').filter(Boolean).pop() }));

// A census of every leaf that crossed the bridge: anything but number/string/boolean/plain object/array.
function census(v, path, bad) {
  if (v === null || ['number', 'string', 'boolean'].includes(typeof v)) { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(`${path}: non-finite`); return; }
  if (Array.isArray(v)) return v.forEach((x, i) => census(x, `${path}[${i}]`, bad));
  const proto = Object.getPrototypeOf(v);
  if (typeof v === 'object' && (proto === Object.prototype || proto === null)) return Object.entries(v).forEach(([k, x]) => census(x, `${path}.${k}`, bad));
  bad.push(`${path}: ${Object.prototype.toString.call(v)} ${v?.constructor?.name ?? ''}`);
}

const engine = plainOf(await probe.engine_outputs.callPromising(STATES));
const bad = []; census(engine, 'engine', bad);

// Through the bridge as the game calls it: draws until a non-00 branch, then the four choices.
const draws = [];
for (let i = 0; i < 12; i++) { const d = await settle(bridge.calibrationMeasurement()); draws.push(d); if (d.ok && (d.r.measurementBits.m0 || d.r.measurementBits.m1)) break; }
const cal = draws[draws.length - 1];
const dry = [];
for (const [x, z] of [[false, false], [true, false], [false, true], [true, true]]) dry.push({ x, z, ...(await settle(bridge.teleportDryRun(cal.r, x, z))) });
for (const d of [...draws, ...dry]) if (d.ok) census(d.r, 'bridge', bad);

// The commit as the bridge does it today, and as CONTRACTS.md asks it to be judged.
const c1 = await settle(bridge.commitTransfer());
const commitVerdicts = c1.ok ? { experiment: validateExperimentResult(c1.r), commit: validateCommitResult(c1.r) } : null;
// Bridge-equivalent sequence if the commit validator rejects AFTER Python latched (what callEngine does):
// JS unlatches and lets the player retry; Python has already consumed the token.
const retryDirect = await settle(teleportation.live_commit.callPromising());
await bridge.resetStoryToken();
const c2 = await settle(bridge.commitTransfer());

const dump = { build: BUILD, platform: plainOf(await probe.platform.callPromising()), engine, typeCensusBad: bad,
  bridge: { draws, dry, commit1: c1, commitVerdicts, pythonRetryAfterCommit: retryDirect, commitAfterRestart: c2 } };
$('harness-json').textContent = JSON.stringify(dump);
$('summary').textContent = `Python ${dump.platform.python} ${dump.platform.sysPlatform} qiskit ${dump.platform.qiskit}\n` +
  `type census: ${bad.length} non-plain leaves\ncalibration draws: ${draws.map((d) => d.ok ? `${d.r.measurementBits.m0}${d.r.measurementBits.m1}` : 'ERR').join(' ')}\n` +
  `dry run F (X,Z = 00,10,01,11): ${dry.map((d) => d.ok ? d.r.fidelity.toFixed(6) : d.name).join(' ')}\n` +
  `commit#1 via bridge: ${c1.ok ? 'resolved' : c1.message}; validateCommitResult: ${commitVerdicts ? (commitVerdicts.commit.join(' | ') || 'valid') : '-'}\n` +
  `Python retry after commit: ${retryDirect.ok ? 'resolved' : retryDirect.message}\ncommit after RESTART: ${c2.ok ? 'resolved' : c2.message}`;
$('status').textContent = 'probe finished';
