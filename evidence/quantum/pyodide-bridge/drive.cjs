#!/usr/bin/env node
// Drives the assembled harness in the local runner (headless Chrome) and grades ONLY what it reads
// out of the rendered page: the JSON in #harness-json, the build token, and the runner's own
// window.__runner counters. Every delivered result is re-validated here, in Node, with the contract
// file's bytes, and the physics values are re-derived here from closed forms, not read from the
// engine.
//   drive.cjs --port N --dest DIR --expect-build TOKEN --scenario conformant|fault --out DIR --tag NAME
// `fault`: pb_spy plays a lying engine (assembled with --fault); the bridge must refuse every lie, loudly.
// Exit: 0 green · 1 red · 2 no verdict.
const path = require('node:path');
const fs = require('node:fs');
const { execSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const port = Number(arg('--port'));
const dest = arg('--dest');
const expectBuild = arg('--expect-build');
const scenario = arg('--scenario', 'conformant');
const out = path.resolve(arg('--out', '.'));
const tag = arg('--tag', scenario);
const shotTo = arg('--shot-to');
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!port || !dest || !expectBuild) { console.error('usage: drive.cjs --port N --dest DIR --expect-build TOKEN [--scenario conformant|fault]'); process.exit(2); }

function loadPuppeteer() {
  const c = [process.env.PUPPETEER_CORE, 'puppeteer-core'];
  try { c.push(path.join(execSync('npm root -g').toString().trim(), '@modelcontextprotocol/server-puppeteer/node_modules/puppeteer-core')); } catch {}
  for (const x of c.filter(Boolean)) { try { return require(x); } catch {} }
  console.error('NO VERDICT: puppeteer-core not found'); process.exit(2);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- independent physics (closed forms) -------------------------------------
// |psi> = RZ(phi) RY(theta) |0>, the engine's generic Bloch points (vision §10.5 order).
const C = (re, im = 0) => ({ re, im });
const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const add = (a, b) => C(a.re + b.re, a.im + b.im);
const conj = (a) => C(a.re, -a.im);
const blochState = (theta, phi) => [mul(C(Math.cos(theta / 2)), C(Math.cos(-phi / 2), Math.sin(-phi / 2))), mul(C(Math.sin(theta / 2)), C(Math.cos(phi / 2), Math.sin(phi / 2)))];
const X = ([a, b]) => [b, a];
const Z = ([a, b]) => [a, C(-b.re, -b.im)];
const fid = (u, v) => { const ip = add(mul(conj(u[0]), v[0]), mul(conj(u[1]), v[1])); return ip.re ** 2 + ip.im ** 2; };
// Before correction Bob holds X^m1 Z^m0 |psi> (up to a global phase); he then applies X? and Z?.
function dryRunFidelity(psi, m0, m1, applyX, applyZ) {
  let s = psi;
  if (m0) s = Z(s);
  if (m1) s = X(s);
  if (applyX) s = X(s);
  if (applyZ) s = Z(s);
  return fid(psi, s);
}
// Generic: every wrong X/Z must visibly fail, i.e. no Bloch component squared above 0.9 (owner ruling #7).
const blochMax2 = (theta, phi) => Math.max((Math.sin(theta) * Math.cos(phi)) ** 2, (Math.sin(theta) * Math.sin(phi)) ** 2, Math.cos(theta) ** 2);
const near = (a, b, tol = 1e-9) => typeof a === 'number' && Math.abs(a - b) <= tol;

(async () => {
  const { validateExperimentResult } = await import(pathToFileURL(path.join(dest, 'echo', 'contracts.js')).href);
  const assembly = JSON.parse(fs.readFileSync(path.join(dest, 'ASSEMBLY.json'), 'utf8'));
  const puppeteer = loadPuppeteer();
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok: !!ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? `  — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
  };
  let browser, dump, runner;
  try {
    browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--window-size=1400,1180', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1180 });
    const t0 = Date.now();
    // Unconditional fresh load (law 16): no cache, new browser profile every run.
    await page.setCacheEnabled(false);
    await page.goto(`http://127.0.0.1:${port}/?autorun=1&backend=ionq-mock`, { waitUntil: 'load' });
    for (;;) {
      const st = await page.evaluate(() => window.__runner && window.__runner.status).catch(() => null);
      if (st === 'done' || st === 'error') break;
      if (Date.now() - t0 > 300000) throw new Error('run did not finish within 300 s');
      await sleep(250);
    }
    const wallSeconds = +((Date.now() - t0) / 1000).toFixed(1);
    runner = await page.evaluate(() => ({ status: window.__runner.status, error: window.__runner.error, jobs: window.__runner.jobs, refused: window.__runner.refusedByRunner, log: window.__runner.log.slice(-40) }));
    check('main.js (harness) ran to the end without error', !runner.error, runner.error || `page load → done in ${wallSeconds}s`);
    const frame = page.frames().find((f) => f.url().includes('/frame.html'));
    if (!frame) throw new Error('project frame not found');
    const text = (sel) => frame.$eval(sel, (e) => e.textContent).catch(() => null);
    const build = await text('#build-token');
    if (build !== expectBuild && runner.error) {
      // main.js died before it could render the token: a red, but the build is unproven.
      check('served build token rendered', false, `none rendered (${build}); run error above`);
      fs.writeFileSync(path.join(out, `${tag}-results.json`), JSON.stringify(results, null, 2));
      await browser.close(); process.exit(1);
    }
    if (build !== expectBuild) { console.error(`ABORT (no verdict): served build ${build} is not the expected ${expectBuild}`); await browser.close(); process.exit(2); }
    check('served build token matches the one just written', true, build);
    await sleep(300);
    const shot = path.join(out, `${tag}-runner-page.png`);
    await page.screenshot({ path: shot, fullPage: true });
    if (shotTo) { fs.mkdirSync(path.dirname(shotTo), { recursive: true }); fs.copyFileSync(shot, shotTo); }
    const raw = await text('#harness-json');
    if (!raw || !raw.trim().startsWith('{')) {
      fs.writeFileSync(path.join(out, `${tag}-dump.json`), JSON.stringify({ assembly, runner, harnessJson: raw }, null, 2));
      throw Object.assign(new Error('harness produced no JSON'), { red: !!runner.error });
    }
    dump = JSON.parse(raw);
    wallSeconds && (dump.timing.wallSecondsPageToDone = wallSeconds);
  } catch (e) {
    if (browser) await browser.close();
    if (e.red) { check('harness rendered its JSON', false, e.message); fs.writeFileSync(path.join(out, `${tag}-results.json`), JSON.stringify(results, null, 2)); process.exit(1); }
    console.error(`NO VERDICT: ${e.message}`); process.exit(2);
  }
  await browser.close();

  // ---- grading ------------------------------------------------------------------
  check('Python ran in Pyodide (sys.platform emscripten)', dump.platform.sysPlatform === 'emscripten', dump.platform);
  check('Qiskit 2.x loaded', /^2\./.test(dump.platform.qiskit), dump.platform.qiskit);
  for (const c of dump.calls) {
    c.nodeVerdict = c.ok ? validateExperimentResult(c.result) : null;
    // Universal invariant: anything handed on must be valid when re-checked from the bytes.
    if (c.ok && !c.hook) check(`${c.label}: delivered value re-validates in Node`, c.nodeVerdict.length === 0 && !c.shape.isMap && c.shape.factsIsArray && !c.shape.proxyFields.length, c.nodeVerdict.length ? c.nodeVerdict : c.shape);
  }
  check(`spy fault mode is ${scenario === 'fault'} (the scenario being graded)`, dump.spy.fault === (scenario === 'fault'), dump.spy.fault);
  const by = (label) => dump.calls.find((c) => c.label === label);
  const r = (label) => (by(label) && by(label).ok ? by(label).result : {});
  const s = dump.spy.counts;
  const v = dump.verification;
  const draws = dump.calls.filter((c) => /^calibration#/.test(c.label));
  const cal = by(dump.dryRun.calibration);
  const calP = cal?.ok ? cal.result.parameters : {};
  const calBits = cal?.ok ? cal.result.measurementBits : {};
  const dry = dump.calls.filter((c) => c.label.startsWith('dryRun('));
  const choiceOf = (c) => ({ x: /X=true/.test(c.label), z: /Z=true/.test(c.label) });
  const follows = (c) => { const { x, z } = choiceOf(c); return x === (calBits.m1 === 1) && z === (calBits.m0 === 1); };
  check('dry run: four X/Z choices were tried on one calibration', dry.length === 4 && dry.filter(follows).length === 1, dry.map((c) => c.label));
  check('spy: exactly 1 backend.run attempted, and it completed (stack entered via callPromising)', s.backendRunAttempts === 1 && s.backendRunCompleted === 1, s);
  check('spy: exactly 1 entry into qollab_job.run_backend_verification_once', s.verificationCalls === 1, s);
  check('verify ×2: the second call returns the SAME promise', v.samePromise === true, v.samePromise);
  check('verify after RESTART: still the same promise (one job per run, not per story)', v.afterRestartSamePromise === true, v.afterRestartSamePromise);
  if (scenario === 'fault') {
    for (const c of dry.filter((c) => !follows(c)))
      check(`${c.label}: engine claimed F=1 on a wrong choice → LOUD ScientificModuleError naming the physics`, !c.ok && c.error.name === 'ScientificModuleError' && (c.error.errors || []).some((e) => /disagrees with the physics/.test(e)), c.ok ? `delivered F=${c.result.fidelity}` : c.error);
    for (const c of dry.filter(follows)) check(`${c.label}: the truthful branch is still delivered`, c.ok, c.ok ? c.result.fidelity : c.error);
    check('verify: old name "bell_verification" → LOUD §8.6 ScientificModuleError, nothing passed on', v.first?.status === 'rejected' && v.first.name === 'ScientificModuleError' && /verification unavailable/.test(v.first.message) && (v.first.errors || []).some((e) => /bell_verification/.test(e)), v.first);
  } else {
    for (const c of dump.calls) check(`${c.label}: adapter returned a result`, c.ok, c.ok ? `${c.ms} ms` : c.error);
    const plus = r('cloning(plus)');
    check('cloning(plus): joint P(00)=P(11)=0.5, every other key 0, keyQubits [1,0]', near(plus.probabilities?.['00'], 0.5) && near(plus.probabilities?.['11'], 0.5) && Object.entries(plus.probabilities || {}).every(([k, p]) => k === '00' || k === '11' || p === 0) && JSON.stringify(plus.keyQubits) === '[1,0]', plus.probabilities);
    check('cloning(plus): each output purity 0.5 (entangled, not two copies)', near(plus.observables?.purityQ0, 0.5) && near(plus.observables?.purityQ1, 0.5), plus.observables);
    const zero = r('cloning(zero)');
    check('cloning(zero): basis state copies (purities 1)', near(zero.observables?.purityQ0, 1) && near(zero.observables?.purityQ1, 1), zero.observables);
    for (const g of ['I', 'X', 'Z']) {
      const rel = r(`relay(${g})`);
      check(`relay(${g}): receiver marginal exactly 0.5/0.5, keyQubits [1]`, near(rel.probabilities?.['0'], 0.5) && near(rel.probabilities?.['1'], 0.5) && JSON.stringify(rel.keyQubits) === '[1]', rel.probabilities);
    }
    // ---- Mission 3: bits first, corrections second, on a FRESH generic state ----
    const angles = draws.filter((d) => d.ok).map((d) => [d.result.parameters?.theta, d.result.parameters?.phi]);
    check('calibration: every draw carries finite theta/phi, bits only (no fidelity, no applyX/Z)', draws.length >= 2 && draws.every((d) => d.ok && Number.isFinite(d.result.parameters?.theta) && Number.isFinite(d.result.parameters?.phi) && d.result.fidelity === undefined && !('applyX' in d.result.parameters) && [0, 1].includes(d.result.measurementBits?.m0) && [0, 1].includes(d.result.measurementBits?.m1)), angles);
    check('calibration: every draw is generic (max Bloch component² ≤ 0.9, re-derived here)', angles.length >= 2 && angles.every(([t, p]) => blochMax2(t, p) <= 0.9), angles.map(([t, p]) => +blochMax2(t, p).toFixed(4)));
    check('calibration: the draws differ (a fresh random state each time, not a named one)', angles.length >= 2 && new Set(angles.map((a) => a.join(','))).size === angles.length, angles);
    check('calibration: the graded draw is on a non-00 branch', calBits.m0 === 1 || calBits.m1 === 1, { draw: dump.dryRun.calibration, bits: calBits });
    const psi = blochState(calP.theta, calP.phi);
    for (const c of dry) {
      const res = c.ok ? c.result : {};
      const { x, z } = choiceOf(c);
      const want = dryRunFidelity(psi, calBits.m0, calBits.m1, x, z);
      check(`${c.label}: theta/phi round-trip exactly from the measurement into the branch`, res.parameters?.theta === calP.theta && res.parameters?.phi === calP.phi && res.measurementBits?.m0 === calBits.m0 && res.measurementBits?.m1 === calBits.m1, { got: res.parameters, want: { theta: calP.theta, phi: calP.phi, ...calBits } });
      check(`${c.label}: fidelity = ${want.toFixed(6)} (closed form on the measured state)`, near(res.fidelity, want, 1e-6), res.fidelity);
      if (follows(c)) check(`${c.label}: the rule's choice scores F ≥ 0.999999`, res.fidelity >= 0.999999, res.fidelity);
      else check(`${c.label}: a wrong X/Z on a non-00 branch scores F < 0.999999`, typeof res.fidelity === 'number' && res.fidelity < 0.999999, res.fidelity);
    }
    const ba = dump.spy.branchArgs || [];
    check('spy: Python teleport_branch received the measured theta/phi on every dry run', ba.length === dry.length && ba.every((a) => a.theta === calP.theta && a.phi === calP.phi), ba);
    // ---- the story token ----
    const c1 = r('commit#1');
    const cb = c1.measurementBits || {};
    check('commit: the hidden token arrives (fidelity 1 after the rule on live bits, no angles leaked)', near(c1.fidelity, 1, 1e-9) && [0, 1].includes(cb.m0) && [0, 1].includes(cb.m1) && c1.parameters?.theta === undefined, { fidelity: c1.fidelity, bits: cb, parameters: c1.parameters });
    check('commit: the second and a later call get the SAME recorded result (no second teleport)', dump.commit.sameRecordedObject === true, dump.commit);
    check('commit: Python itself refuses a second live_commit (TokenAlreadyConsumed)', dump.commit.pythonSecondCommit?.refused === true, dump.commit.pythonSecondCommit);
    const c4 = r('commit#4 after RESTART');
    check('RESTART: a commit after resetStoryToken succeeds, as a NEW result (fidelity 1)', dump.commit.afterRestartIsNewObject === true && near(c4.fidelity, 1, 1e-9), { fidelity: c4.fidelity, err: by('commit#4 after RESTART')?.error });
    check('spy: Python saw exactly 2 live_commit calls (one per story) and 1 reset', s.commitCalls === 2 && s.commitsCompleted === 2 && s.resetCalls === 1, s);
    // ---- the one selected-backend job ----
    check('verify: RESOLVES (not rejected)', v.first?.status === 'verified', v.first);
    check('verify ×2: both callers get the same value', v.sameValue === true, v.sameValue);
    if (v.first?.status === 'verified') {
      const res = v.first.result;
      const nv = validateExperimentResult(res);
      check('verify: experiment "backend_verification", engine qollab_selected_backend, re-validates in Node', nv.length === 0 && res.experiment === 'backend_verification' && res.engine === 'qollab_selected_backend', { experiment: res.experiment, engine: res.engine, errors: nv });
      const counts = res.counts || {};
      check('verify: 256 shots, ideal Bell keys only', Object.values(counts).reduce((a, b) => a + b, 0) === 256 && Object.keys(counts).every((k) => k === '00' || k === '11'), counts);
    }
  }
  const failed = results.filter((x) => !x.ok).length;
  fs.writeFileSync(path.join(out, `${tag}-dump.json`), JSON.stringify({ assembly, runnerCounters: { jobs: runner.jobs, refusedByRunner: runner.refused }, runnerLogTail: runner.log, dump, checks: results }, null, 2));
  fs.writeFileSync(path.join(out, `${tag}-results.json`), JSON.stringify(results, null, 2));
  if (!results.length) process.exit(2);
  console.log(`${tag}: ${results.length - failed}/${results.length} checks passed · runner's own JS-side backend.run counter: ${runner.jobs}`);
  process.exit(failed ? 1 : 0);
})();
