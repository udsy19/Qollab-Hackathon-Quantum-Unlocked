#!/usr/bin/env node
// Drives the local runner the way a player drives the game: Run, see the title over the canvas,
// press Start, open Settings and change Quality, read the quantum module's answer, press Verify
// twice, then Restart from the pause menu. It grades what it reads from the rendered page (DOM,
// canvas size, screenshot pixels) and from the runner's own job counter, never from the
// project's console messages.
//
//   node tools/qollab-runner/check.cjs --port 4890 --backend builtin|ionq-mock --out <dir> \
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
const out = path.resolve(arg('--out', 'evidence/platform/shell'));
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

// Physics the check knows on its own (vision §7.2): CNOT on |+>|0> gives a Bell pair, whose
// overlap with |+>|+> is 1/2 and each half of which has purity 1/2.
const CLONE_PLUS = { overlap: 0.5, purity: 0.5 };

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
    // DPR 2 so the three quality caps (1, 1.5, 1.75) are distinguishable in the canvas size.
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2 });
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
    const shot = (name) => page.screenshot({ path: path.join(out, `${tag}-${name}.png`) });

    // Provenance (law 16): the token is read out of the served, rendered page.
    const build = await text('echo-build');
    check('build token visible', build && build !== '…', build);
    if (expectBuild) {
      if (build !== expectBuild) {
        console.error(`ABORT: served build ${build} is not the expected ${expectBuild}`);
        process.exit(2);
      }
      check('served build matches --expect-build', true, build);
    }
    check('backend name rendered from injected backend', (await text('echo-backend')) === 'basic_simulator', await text('echo-backend'));

    // Runner fidelity: the frame must refuse what Qollab's frame refuses.
    const sandbox = await frame.evaluate(async () => {
      let storage = 'allowed';
      try { window.localStorage.length; } catch { storage = 'blocked'; }
      let post = 'allowed';
      try { await fetch(location.href, { method: 'POST' }); } catch { post = 'blocked'; }
      return { storage, post, websocket: typeof WebSocket, worker: typeof Worker };
    });
    check('runner sandbox: localStorage and POST blocked, no WebSocket/Worker', sandbox.storage === 'blocked' && sandbox.post === 'blocked' && sandbox.websocket === 'undefined' && sandbox.worker === 'undefined', sandbox);

    // ---- 1. title screen over the canvas -------------------------------------------------------
    const menuState = () => frame.evaluate(() => {
      const m = document.querySelector('#echo-ui .echo-menu');
      return m ? { visible: m.dataset.visible, screen: m.dataset.screen ?? null, h1: document.querySelector('#echo-ui h1')?.textContent ?? null } : null;
    });
    const title = await menuState();
    check('story-ui menu is mounted inside #echo-ui and shows the title', title && title.visible === 'true' && title.screen === 'title' && /ECHO/.test(title.h1 || ''), title);
    check('quest shows BOOT —BOOT_COMPLETE→ TITLE', (await text('echo-quest')) === 'BOOT —BOOT_COMPLETE→ TITLE', await text('echo-quest'));
    await shot('1-title-over-canvas');

    // ---- 2. Start → OPENING --------------------------------------------------------------------
    await frame.click('#echo-ui [data-action="start"]');
    await sleep(500);
    const afterStart = await menuState();
    check('Start closes the menu', afterStart && afterStart.visible === 'false', afterStart);
    check('quest shows TITLE —START→ OPENING', (await text('echo-quest')) === 'TITLE —START→ OPENING', await text('echo-quest'));
    // The title's backdrop dims the world on purpose (story-ui), so the delivered pixels are graded
    // once the menu is closed: the cyan pillar of the placeholder room must be on screen.
    await sleep(800);
    const canvasBox = await (await frame.$('#echo-canvas')).boundingBox();
    // Only the middle of the canvas is graded: the HUD's cyan text sits over the corners and
    // alone gave ~5,000 "cyan" pixels on a canvas that was never rendered (sabotage no-render).
    const mid = { x: canvasBox.x + canvasBox.width * 0.25, y: canvasBox.y + canvasBox.height * 0.2, width: canvasBox.width * 0.5, height: canvasBox.height * 0.6 };
    const png = await page.screenshot({ clip: mid, encoding: 'base64' });
    const scratch = await browser.newPage();
    const lit = await scratch.evaluate(async (b64) => {
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
      return { w: g.width, h: g.height, cyan };
    }, png);
    await scratch.close();
    check('Three.js canvas paints the room once the menu closes (cyan pixels in the middle > 20000)', lit.cyan > 20000 && canvasBox.width > 600, lit);
    await shot('2-after-start');

    // ---- 3. Settings: quality low → high, measured on the canvas itself ------------------------
    const ratio = () => frame.$eval('#echo-canvas', (c) => +(c.width / c.clientWidth).toFixed(3));
    await page.keyboard.press('Escape');
    await sleep(300);
    const pause = await menuState();
    check('Esc after Start opens the pause menu', pause && pause.screen === 'pause', pause);
    await frame.click('#echo-ui .echo-menu [data-screen="pause"] [data-action="settings"]');
    await sleep(300);
    await frame.select('#echo-set-quality', 'low');
    await sleep(500);
    const low = await ratio();
    check('quality low → canvas pixel ratio 1', low === 1, { ratio: low, strip: await text('echo-render') });
    await shot('3a-settings-quality-low');
    await frame.select('#echo-set-quality', 'high');
    await sleep(500);
    const high = await ratio();
    check('quality high → canvas pixel ratio 1.75', high === 1.75, { ratio: high, strip: await text('echo-render') });
    await shot('3b-settings-quality-high');

    // ---- 4. the quantum module's answer --------------------------------------------------------
    const q = await waitFor(async () => {
      const t = await text('echo-quantum');
      return t && !/Calibrating/.test(t) ? t : null;
    }, 60000, 'quantum module answer');
    const nums = /overlap with two copies (\d+\.\d+), each output purity (\d+\.\d+)/.exec(q);
    check('quantum module answers through the bridge: |+> copy overlap 0.5, purity 0.5', nums &&
      Math.abs(+nums[1] - CLONE_PLUS.overlap) < 1e-6 && Math.abs(+nums[2] - CLONE_PLUS.purity) < 1e-6, q);
    // Back out of settings and pause, so the game is in play for the verify step.
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await sleep(300);
    await shot('4-quantum-answer');

    // ---- 5. one job, and the guard refusing a second -------------------------------------------
    await frame.click('#echo-verify');
    const counts = JSON.parse(await waitFor(async () => {
      const t = await text('echo-verify-out');
      return t && t.trim().startsWith('{') ? t : null;
    }, 60000, 'backend counts')).counts || {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    check('first press: counts from one job, 256 shots', total === 256, counts);
    // Binomial(256, 0.5): sd = 8, so 88..168 is +-5 sd; a non-Bell circuit fails it.
    check('first press: only 00/11, each 88..168 of 256', Object.keys(counts).every((k) => k === '00' || k === '11') &&
      counts['00'] >= 88 && counts['00'] <= 168 && counts['11'] >= 88 && counts['11'] <= 168, counts);
    const firstStatus = await text('echo-verify-status');
    check('first press: the result passes the shared contract (status "Done")', /^Done: 1 job/.test(firstStatus || ''), firstStatus);
    check('runner counted exactly 1 backend.run after first press', (await page.evaluate(() => window.__runner.jobs)) === 1, await page.evaluate(() => window.__runner.jobs));
    await frame.click('#echo-verify');
    await sleep(2500);
    const status = await text('echo-verify-status');
    const runner = await page.evaluate(() => ({ jobs: window.__runner.jobs, refused: window.__runner.refusedByRunner }));
    check('second press: page shows a visible refusal', /^Refused/.test(status || ''), status);
    check('second press: runner saw no second backend.run', runner.jobs === 1 && runner.refused === 0, runner);
    await shot('5-second-job-refused');

    // ---- 6. Restart from pause → TITLE (§9.5) --------------------------------------------------
    await page.keyboard.press('Escape');
    await sleep(300);
    await frame.click('#echo-ui .echo-menu [data-screen="pause"] [data-action="restart"]');
    await sleep(500);
    const restarted = await menuState();
    check('Restart returns to the title screen', restarted && restarted.screen === 'title', restarted);
    check('quest shows OPENING → TITLE (reset)', (await text('echo-quest')) === 'OPENING → TITLE (reset)', await text('echo-quest'));
    await shot('6-restart-title');
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
