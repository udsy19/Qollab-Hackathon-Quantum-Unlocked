#!/usr/bin/env node
// Drives the local runner the way the owner will drive Qollab: Run, read the
// panel, press "Verify on selected backend" twice. It grades only what it reads
// from the rendered page and from the runner's own job counter, never from the
// project's console messages.
//
//   node tools/qollab-runner/check.cjs --port 4871 --backend ionq-mock --out evidence/platform/g0 \
//        [--expect-build <token>] [--tag name]
//
// Exit codes: 0 green · 1 red · 2 could not grade (no verdict).
// Needs puppeteer-core and a local Chrome. Set PUPPETEER_CORE to its path if it
// is not resolvable from here (the default is the copy bundled with the global
// @modelcontextprotocol/server-puppeteer install).
const path = require('node:path');
const fs = require('node:fs');
const { execSync } = require('node:child_process');

function arg(k, d) {
  const i = process.argv.indexOf(k);
  return i >= 0 ? process.argv[i + 1] : d;
}
const port = Number(arg('--port'));
const backend = arg('--backend', 'builtin');
const out = path.resolve(arg('--out', 'evidence/platform/g0'));
const tag = arg('--tag', backend);
const expectBuild = arg('--expect-build');
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!port) {
  console.error('usage: check.cjs --port <n> [--backend builtin|ionq-mock] [--out dir] [--expect-build token] [--tag name]');
  process.exit(2);
}

function loadPuppeteer() {
  const candidates = [process.env.PUPPETEER_CORE, 'puppeteer-core'];
  try {
    candidates.push(path.join(execSync('npm root -g').toString().trim(), '@modelcontextprotocol/server-puppeteer/node_modules/puppeteer-core'));
  } catch {}
  for (const c of candidates.filter(Boolean)) {
    try {
      return require(c);
    } catch {}
  }
  console.error('REFUSED: puppeteer-core not found (set PUPPETEER_CORE)');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms, what) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn().catch(() => undefined);
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error(`timed out after ${ms} ms waiting for ${what}`);
    await sleep(250);
  }
}

(async () => {
  const puppeteer = loadPuppeteer();
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok: !!ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? `  — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
  };
  let browser;
  try {
    browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--window-size=1400,1180', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1180 });
    const t0 = Date.now();
    await page.goto(`http://127.0.0.1:${port}/?autorun=1&backend=${backend}`, { waitUntil: 'load' });
    const frameOf = () => page.frames().find((f) => f.url().includes('/frame.html'));
    await waitFor(async () => ['done', 'error'].includes(await page.evaluate(() => window.__runner.status)), 300000, 'run to finish');
    const loadSeconds = ((Date.now() - t0) / 1000).toFixed(1);
    const frame = frameOf();
    if (!frame) throw new Error('project frame not found');
    const runError = await page.evaluate(() => window.__runner.error);
    check('main.js ran to the end without error', !runError, runError || `ready in ${loadSeconds}s`);
    const text = (id) => frame.$eval(`#${id}`, (e) => e.textContent).catch(() => null);

    // Provenance (law 16): the token is read out of the served, rendered page.
    const build = await text('build-token');
    check('build token visible', build && build !== '…', build);
    if (expectBuild) {
      if (build !== expectBuild) {
        console.error(`ABORT: served build ${build} is not the expected ${expectBuild}`);
        process.exit(2);
      }
      check('served build matches --expect-build', true, build);
    }
    check('backend name rendered from injected backend', (await text('backend-name')) === 'basic_simulator', await text('backend-name'));

    // Scene: count lit pixels in the canvas area of the screenshot (delivered pixels, not draw calls).
    await sleep(800);
    const canvasBox = await (await frame.$('#scene')).boundingBox();
    const shotScene = path.join(out, `${tag}-1-scene-and-bridge.png`);
    await page.screenshot({ path: shotScene });
    // Grade the delivered pixels: clip the screenshot to the canvas and count
    // them in a scratch page (reading a WebGL canvas back directly returns a
    // cleared buffer, which is emission-vs-visibility in miniature).
    const png = await page.screenshot({ clip: canvasBox, encoding: 'base64' });
    const scratch = await browser.newPage();
    const sceneStats = await scratch.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const g = document.createElement('canvas');
      g.width = img.width;
      g.height = img.height;
      const ctx = g.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, g.width, g.height).data;
      let cyan = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 2] > 150 && d[i + 1] > 120 && d[i] < 120) cyan++;
      return { w: g.width, h: g.height, cyan, cyanShare: +(cyan / (g.width * g.height)).toFixed(4) };
    }, png);
    await scratch.close();
    check('Three.js canvas shows the cyan cube (pixels)', sceneStats.cyan > 2000 && canvasBox.width > 200, sceneStats);

    // Bridge: parse the rendered JSON and compare to the exact Bell values.
    const bridgeRaw = await waitFor(async () => {
      const t = await text('bridge-out');
      return t && t.trim().startsWith('{') ? t : null;
    }, 30000, 'bridge JSON');
    const bridge = JSON.parse(bridgeRaw);
    const p = bridge.probabilities || {};
    check('bridge: exact P(00)=P(11)=0.5, nothing else', Math.abs(p['00'] - 0.5) < 1e-9 && Math.abs(p['11'] - 0.5) < 1e-9 && Object.keys(p).length === 2, p);
    check('bridge: reduced purity of one half = 0.5', Math.abs(bridge.reduced_purity_q0 - 0.5) < 1e-9, bridge.reduced_purity_q0);
    check('bridge: ran in Pyodide (sys.platform emscripten)', bridge.platform === 'emscripten', bridge.platform);
    check('bridge: Qiskit 2.x', /^2\./.test(bridge.qiskit_version), bridge.qiskit_version);

    // One job.
    const btn = await frame.$('#verify-btn');
    await btn.click();
    const countsRaw = await waitFor(async () => {
      const t = await text('backend-out');
      return t && t.trim().startsWith('{') ? t : null;
    }, 60000, 'backend counts');
    const counts = JSON.parse(countsRaw).counts;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    check('first press: counts from one job, 256 shots', total === 256, counts);
    check('first press: ideal Bell counts only 00/11', Object.keys(counts).every((k) => k === '00' || k === '11'), Object.keys(counts));
    check('runner counted exactly 1 backend.run after first press', (await page.evaluate(() => window.__runner.jobs)) === 1, await page.evaluate(() => window.__runner.jobs));
    await page.screenshot({ path: path.join(out, `${tag}-2-one-job-counts.png`) });

    // Second press must be refused by the PAGE, and the runner must see no second job.
    await btn.click();
    await sleep(2500);
    const status = await text('verify-status');
    const runner = await page.evaluate(() => ({ jobs: window.__runner.jobs, refused: window.__runner.refusedByRunner }));
    check('second press: page shows a visible refusal', /^Refused/.test(status || ''), status);
    check('second press: runner saw no second backend.run', runner.jobs === 1 && runner.refused === 0, runner);
    await page.screenshot({ path: path.join(out, `${tag}-3-second-press-refused.png`) });
  } catch (e) {
    console.error(`NO VERDICT: ${e.message}`);
    if (browser) await browser.close();
    process.exit(2);
  }
  await browser.close();
  fs.writeFileSync(path.join(out, `${tag}-results.json`), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok).length;
  if (!results.length) process.exit(2);
  console.log(`${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
