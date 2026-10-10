#!/usr/bin/env node
// Drives the assembled harness in the local runner (headless Chrome) and grades ONLY what it reads
// out of the rendered page: the JSON in #harness-json, the build token, and the runner's own
// window.__runner counters. Every delivered result is re-validated here, in Node, with the contract
// file's bytes, and the physics values are re-derived here from closed forms, not read from the
// engine.
//   drive.cjs --port N --dest DIR --expect-build TOKEN --scenario conformant|head --out DIR --tag NAME
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
if (!port || !dest || !expectBuild) { console.error('usage: drive.cjs --port N --dest DIR --expect-build TOKEN [--scenario conformant|head]'); process.exit(2); }

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
const BLOCH_A = blochState(1.137, 0.44);
const BLOCH_B = blochState(2.3, -1.9);
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
    if (c.ok) check(`${c.label}: delivered value re-validates in Node`, c.nodeVerdict.length === 0 && !c.shape.isMap && c.shape.factsIsArray && !c.shape.proxyFields.length, c.nodeVerdict.length ? c.nodeVerdict : c.shape);
  }
  const by = (label) => dump.calls.find((c) => c.label === label);
  if (scenario === 'head') {
    for (const c of dump.calls) check(`${c.label}: non-conforming engine output is a LOUD ScientificModuleError`, !c.ok && c.error.name === 'ScientificModuleError' && Array.isArray(c.error.errors) && c.error.errors.length > 0, c.ok ? 'delivered' : c.error);
  } else {
    for (const c of dump.calls) check(`${c.label}: adapter returned a result`, c.ok, c.ok ? `${c.ms} ms` : c.error);
    const r = (label) => (by(label) && by(label).ok ? by(label).result : {});
    const plus = r('cloning(plus)');
    check('cloning(plus): joint P(00)=P(11)=0.5, every other key 0, keyQubits [1,0]', near(plus.probabilities?.['00'], 0.5) && near(plus.probabilities?.['11'], 0.5) && Object.entries(plus.probabilities || {}).every(([k, p]) => k === '00' || k === '11' || p === 0) && JSON.stringify(plus.keyQubits) === '[1,0]', plus.probabilities);
    check('cloning(plus): each output purity 0.5 (entangled, not two copies)', near(plus.observables?.purityQ0, 0.5) && near(plus.observables?.purityQ1, 0.5), plus.observables);
    const zero = r('cloning(zero)');
    check('cloning(zero): basis state copies (purities 1)', near(zero.observables?.purityQ0, 1) && near(zero.observables?.purityQ1, 1), zero.observables);
    for (const g of ['I', 'X', 'Z']) {
      const rel = r(`relay(${g})`);
      check(`relay(${g}): receiver marginal exactly 0.5/0.5, keyQubits [1]`, near(rel.probabilities?.['0'], 0.5) && near(rel.probabilities?.['1'], 0.5) && JSON.stringify(rel.keyQubits) === '[1]', rel.probabilities);
    }
    const cal = r('calibration(bloch_a)');
    const bits = cal.measurementBits || {};
    check('calibration: bits m0, m1 each 0 or 1', [0, 1].includes(bits.m0) && [0, 1].includes(bits.m1), bits);
    for (const [x, z] of [[false, false], [true, false], [false, true], [true, true]]) {
      const label = `dryRun(bloch_a, m0=${bits.m0}, m1=${bits.m1}, X=${x}, Z=${z})`;
      const want = dryRunFidelity(BLOCH_A, bits.m0, bits.m1, x, z);
      check(`${label}: fidelity = ${want.toFixed(6)} (closed form)`, near(r(label).fidelity, want, 1e-6), r(label).fidelity);
    }
    const fixed = r('dryRun(bloch_a, m0=1, m1=0, X=false, Z=false)');
    check('dryRun(bloch_a,1,0,no correction): fidelity = cos²(1.137)', near(fixed.fidelity, Math.cos(1.137) ** 2, 1e-6), { got: fixed.fidelity, want: Math.cos(1.137) ** 2 });
    const c1 = r('commit#1(bloch_b)');
    const cb = c1.measurementBits || {};
    check('commit: receiver fidelity 1 after the rule on live bits', near(c1.fidelity, 1, 1e-9) && near(dryRunFidelity(BLOCH_B, cb.m0, cb.m1, cb.m1 === 1, cb.m0 === 1), 1), { fidelity: c1.fidelity, bits: cb });
    check('commit: a second call returns the SAME promise (token consumed once)', dump.commit.samePromise === true, dump.commit);
    check('commit: a call after it settled returns the same recorded object', dump.commit.sameObjectAfterSettle === true, dump.commit);
  }
  // ---- the one selected-backend job --------------------------------------------
  const v = dump.verification;
  const s = dump.spy.counts;
  check('verify ×2: the second call returns the SAME promise', v.samePromise === true, v.samePromise);
  check('verify ×2: both callers get the same value', v.sameValue === true, v.sameValue);
  check('spy: exactly 1 entry into qollab_job.run_bell_verification_once', s.verificationCalls === 1, s);
  check('spy: exactly 1 backend.run attempted', s.backendRunAttempts === 1, s);
  check('spy: that backend.run completed (stack entered via callPromising)', s.backendRunCompleted === 1, s);
  if (v.first?.status === 'verified') {
    const nv = validateExperimentResult(v.first.result);
    const counts = v.first.result.counts || {};
    check('verified result re-validates in Node', nv.length === 0, nv);
    check('verified counts: 256 shots, ideal Bell keys only', Object.values(counts).reduce((a, b) => a + b, 0) === 256 && Object.keys(counts).every((k) => k === '00' || k === '11'), counts);
  } else {
    check('rejected: ScientificModuleError with §8.6 wording + reasons, no result passed on', v.first?.status === 'rejected' && v.first.name === 'ScientificModuleError' && /verification unavailable/.test(v.first.message) && Array.isArray(v.first.errors) && v.first.errors.length > 0, v.first);
  }
  const failed = results.filter((x) => !x.ok).length;
  fs.writeFileSync(path.join(out, `${tag}-dump.json`), JSON.stringify({ assembly, runnerCounters: { jobs: runner.jobs, refusedByRunner: runner.refused }, runnerLogTail: runner.log, dump, checks: results }, null, 2));
  fs.writeFileSync(path.join(out, `${tag}-results.json`), JSON.stringify(results, null, 2));
  if (!results.length) process.exit(2);
  console.log(`${tag}: ${results.length - failed}/${results.length} checks passed · runner's own JS-side backend.run counter: ${runner.jobs}`);
  process.exit(failed ? 1 : 0);
})();
