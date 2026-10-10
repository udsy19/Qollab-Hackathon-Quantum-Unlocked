#!/usr/bin/env node
// Drives the assembled harness in the local runner (headless Chrome, backend ionq-mock) and grades
// only what it reads out of the page: the build token, the harness JSON, and the RUNNER's own
// window.__runner counters (which the project cannot write). Bit order is decoded here from the raw
// key strings the spy captured below qollab_job, and from the delivered keyQubits, independently.
//   drive.cjs --port N --dest DIR --expect-build TOKEN --out DIR --tag NAME
// Exit: 0 green · 1 red · 2 no verdict.
const path = require('node:path');
const fs = require('node:fs');
const { execSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const port = Number(arg('--port')), dest = arg('--dest'), expectBuild = arg('--expect-build');
const out = path.resolve(arg('--out', '.')), tag = arg('--tag', 'run');
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!port || !dest || !expectBuild) { console.error('usage: drive.cjs --port N --dest DIR --expect-build TOKEN'); process.exit(2); }
function loadPuppeteer() {
  const c = [process.env.PUPPETEER_CORE, 'puppeteer-core'];
  try { c.push(path.join(execSync('npm root -g').toString().trim(), '@modelcontextprotocol/server-puppeteer/node_modules/puppeteer-core')); } catch {}
  for (const x of c.filter(Boolean)) { try { return require(x); } catch {} }
  console.error('NO VERDICT: puppeteer-core not found'); process.exit(2);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = 256; // owner ruling 2026-10-10 (13 questions #9)

(async () => {
  const { validateExperimentResult } = await import(pathToFileURL(path.join(dest, 'echo', 'contracts.js')).href);
  const assembly = JSON.parse(fs.readFileSync(path.join(dest, 'ASSEMBLY.json'), 'utf8'));
  const control = /-control/.test(assembly.variant);
  const puppeteer = loadPuppeteer();
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok: !!ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? `  — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
  };
  let browser, dump, runner;
  try {
    browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--window-size=1300,900'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1300, height: 900 });
    await page.setCacheEnabled(false); // law 16: unconditional fresh load
    const t0 = Date.now();
    await page.goto(`http://127.0.0.1:${port}/?autorun=1&backend=ionq-mock`, { waitUntil: 'load' });
    for (;;) {
      const st = await page.evaluate(() => window.__runner && window.__runner.status).catch(() => null);
      if (st === 'done' || st === 'error') break;
      if (Date.now() - t0 > 240000) throw new Error('run did not finish within 240 s');
      await sleep(250);
    }
    runner = await page.evaluate(() => ({ status: window.__runner.status, error: window.__runner.error, jobs: window.__runner.jobs, refused: window.__runner.refusedByRunner, log: window.__runner.log.slice(-30) }));
    const frame = page.frames().find((f) => f.url().includes('/frame.html'));
    if (!frame) throw new Error('project frame not found');
    const text = (sel) => frame.$eval(sel, (e) => e.textContent).catch(() => null);
    const build = await text('#build-token');
    if (build !== expectBuild) { console.error(`ABORT (no verdict): served build ${build} is not ${expectBuild}; runner error: ${runner.error}`); await browser.close(); process.exit(2); }
    check('served build token matches the one just written', true, build);
    check('harness main.js ran to the end without error', !runner.error, runner.error || 'done');
    await sleep(300);
    await page.screenshot({ path: path.join(out, `${tag}-runner-page.png`), fullPage: true });
    const raw = await text('#harness-json');
    if (!raw || !raw.trim().startsWith('{')) throw new Error('harness produced no JSON');
    dump = JSON.parse(raw);
  } catch (e) {
    if (browser) await browser.close();
    console.error(`NO VERDICT: ${e.message}`); process.exit(2);
  }
  await browser.close();

  // ---- how many jobs, seen from two places that do not trust each other ----------------------------
  check("runner's own JS-side counter: exactly 1 backend.run", runner.jobs === 1, { jobs: runner.jobs, refusedByRunner: runner.refused });
  check('runner refused nothing (IonQ one-job mock)', runner.refused === 0, runner.refused);
  check('Python-side spy (BasicSimulator.run): exactly 1 job', dump.spy.pythonBackendRunCalls === 1, dump.spy.pythonBackendRunCalls);
  check('verify asked twice: the second call is the same promise', dump.samePromise === true, dump.samePromise);
  const job = dump.spy.jobs[0] || {};
  const wantOps = control ? ['x', 'measure', 'measure'] : ['h', 'cx', 'measure', 'measure'];
  check(`submitted circuit is the ${control ? 'X-on-q0 control' : 'Bell'} circuit`, JSON.stringify(job.ops) === JSON.stringify(wantOps), { name: job.circuit, ops: job.ops });
  check(`submitted with shots=${SHOTS}`, job.kwargs?.shots === SHOTS, job.kwargs);

  // ---- bit order, from the raw keys (Qiskit: rightmost char is clbit 0; circuit maps q_i -> c_i) ----
  const rawCounts = job.rawCounts || {};
  const rawTotal = Object.values(rawCounts).reduce((a, b) => a + b, 0);
  const rawQ = { q0: 0, q1: 0 };
  for (const [k, n] of Object.entries(rawCounts)) { rawQ.q0 += Number(k[k.length - 1]) * n; rawQ.q1 += Number(k[k.length - 2]) * n; }
  if (control) check('raw keys: only "01" (clbit 0 on the RIGHT reads q0=1), all shots', JSON.stringify(Object.keys(rawCounts)) === '["01"]' && rawTotal === SHOTS, rawCounts);
  else check('raw keys: only 00/11, all shots', rawTotal === SHOTS && Object.keys(rawCounts).every((k) => k === '00' || k === '11'), rawCounts);

  const v = dump.first;
  check('verify #1 delivered a result', v.status === 'verified', v.status === 'verified' ? 'verified' : v);
  if (v.status === 'verified') {
    const r = v.result;
    const nv = validateExperimentResult(r);
    check('delivered result re-validates in Node from the contract bytes', nv.length === 0, nv);
    check('experiment backend_verification · engine qollab_selected_backend', r.experiment === 'backend_verification' && r.engine === 'qollab_selected_backend', [r.experiment, r.engine]);
    const ones = { q0: 0, q1: 0 }; let total = 0;
    for (const [key, n] of Object.entries(r.counts || {})) {
      total += n;
      [...key].forEach((ch, i) => { ones[`q${r.keyQubits[i]}`] += Number(ch) * n; });
    }
    if (control) check('delivered counts decode (via keyQubits) to q0=1, q1=0 on every shot', total === SHOTS && ones.q0 === SHOTS && ones.q1 === 0, { counts: r.counts, keyQubits: r.keyQubits, ones });
    else check('delivered counts decode to q0 == q1 on every shot, matching the raw readout', total === SHOTS && ones.q0 === ones.q1 && ones.q0 === rawQ.q0, { counts: r.counts, keyQubits: r.keyQubits, ones, rawQ });
    check('the fact line names the backend the runtime reported', (r.facts || []).some((f) => f.includes(dump.backendName)), dump.backendName);
  }
  const failed = results.filter((x) => !x.ok).length;
  fs.writeFileSync(path.join(out, `${tag}-dump.json`), JSON.stringify({ assembly, runner, dump, checks: results }, null, 2));
  if (!results.length) process.exit(2);
  console.log(`${tag}: ${results.length - failed}/${results.length} checks passed · runner JS counter ${runner.jobs} · python spy ${dump.spy.pythonBackendRunCalls}`);
  process.exit(failed ? 1 : 0);
})();
