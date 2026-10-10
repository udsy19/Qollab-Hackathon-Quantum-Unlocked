#!/usr/bin/env node
// Drives the local runner the way the owner will drive Qollab: Run, read the
// panel, click and type inside the frame, then one of three job paths. It grades
// only what it reads from the rendered page and from the runner's own job
// counter, never from the project's console messages.
//   --scenario auto    let the countdown send the one job, then press Verify: refused
//   --scenario cancel  press Cancel during the countdown: no job is ever sent
//   --scenario button  press Verify during the countdown: exactly one job
// Input goes through Chrome's input pipeline (CDP mouse and key events at
// screen coordinates), never dispatchEvent, so it is the path a person's click takes.
//
//   node tools/qollab-runner/check.cjs --port 4871 --backend ionq-mock --out evidence/platform/g0 \
//        [--scenario auto|cancel|button] [--expect-build <token>] [--tag name]
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
const scenario = arg('--scenario', 'auto');
const tag = arg('--tag', `${backend}-${scenario}`);
const AUTO_SEND_MS = 5000; // the page's countdown; checks wait past it by a margin
const expectBuild = arg('--expect-build');
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!port || !['auto', 'cancel', 'button'].includes(scenario)) {
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
    // main.js now stays alive until its one job settles, so "ready" is the
    // bridge JSON on the page, not the run's done event.
    const text = (id) => frameOf().$eval(`#${id}`, (e) => e.textContent).catch(() => null);
    const bridgeRaw = await waitFor(async () => {
      if (await page.evaluate(() => window.__runner.status === 'error')) throw new Error('stop');
      const t = frameOf() && (await text('bridge-out'));
      return t && t.trim().startsWith('{') ? t : null;
    }, 300000, 'bridge JSON').catch(async () => {
      throw new Error(`no bridge JSON; runner error: ${await page.evaluate(() => window.__runner.error)}`);
    });
    const bridgeSeenAt = Date.now();
    const loadSeconds = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`bridge result on the page ${loadSeconds}s after load`);
    const frame = frameOf();
    const diag = () => frame.$$eval('#input-diag td[data-diag]', (tds) => Object.fromEntries(tds.map((td) => [td.dataset.diag, td.textContent])));
    const runnerState = () => page.evaluate(() => ({ status: window.__runner.status, jobs: window.__runner.jobs, refused: window.__runner.refusedByRunner, error: window.__runner.error }));

    // (a) Counters at 0 on load, read from the rendered panel before any input.
    const d0 = await diag();
    check('(a) diag panel rendered with the three counters at 0', d0.pointerdown === '0' && d0.click === '0' && d0.keydown === '0', d0);
    const r0 = await runnerState();
    check('(a) main.js still running after the bridge result (not Done.)', r0.status === 'running', r0);
    check('(a) auto-send countdown visible', /^Auto-sending the one job in \d s/.test((await text('autosend-status')) || ''), await text('autosend-status'));
    await page.screenshot({ path: path.join(out, `${tag}-a-counters-zero.png`) });

    // Scenario action inside the countdown window.
    if (scenario === 'cancel') await (await frame.$('#autosend-cancel')).click();
    if (scenario === 'button') await (await frame.$('#verify-btn')).click();
    const afterAction = await diag();

    // (b) A real click on the scene canvas and a real keypress.
    const sceneBox = await (await frame.$('#scene')).boundingBox();
    await page.mouse.click(sceneBox.x + sceneBox.width * 0.6, sceneBox.y + sceneBox.height * 0.6);
    await page.keyboard.press('KeyK');
    await sleep(300);
    const d1 = await diag();
    const extra = scenario === 'auto' ? 0 : 1; // the scenario's own button click
    check('(b) one canvas click counted: pointerdown and click +1', +d1.pointerdown === 1 + extra && +d1.click === 1 + extra, { before: afterAction, after: d1 });
    check('(b) one keypress counted, last key k', d1.keydown === '1' && d1['last key'] === 'k', d1);
    check('(b) last pointer target is the canvas', d1['last pointer target'] === 'canvas#scene', d1['last pointer target']);
    check('(b) document.hasFocus() true after the click', d1['document.hasFocus()'] === 'true', d1['document.hasFocus()']);
    check('(b) verdict reads INPUT REACHES PAGE', /^INPUT REACHES PAGE/.test(d1.verdict), d1.verdict);
    check('(b) frame origin is opaque ("null"), as on Qollab', d1.origin === 'null', d1.origin);
    await page.screenshot({ path: path.join(out, `${tag}-b-counters-after-input.png`) });
    // Qollab's iframe has no allow-pointer-lock, so a request from inside must be
    // refused. (Control: the same panel in a frame WITH allow-pointer-lock reads
    // GRANTED — evidence/platform/g0-input-diagnostic/pointer-lock-control/.)
    await page.keyboard.press('KeyL');
    const lock = await waitFor(async () => {
      const v = (await diag())['pointer lock'];
      return /^(REFUSED|GRANTED)/.test(v) ? v : null;
    }, 5000, 'pointer lock answer').catch(() => 'no answer');
    check('(b) pointer lock REFUSED, as in Qollab\'s allow-scripts-only frame', /^REFUSED/.test(lock), lock);

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

    // Runner fidelity: the frame must refuse what Qollab's frame refuses.
    const sandbox = await frame.evaluate(async () => {
      let storage = 'allowed';
      try { window.localStorage.length; } catch { storage = 'blocked'; }
      let post = 'allowed';
      try { await fetch(location.href, { method: 'POST' }); } catch { post = 'blocked'; }
      return { storage, post, websocket: typeof WebSocket, worker: typeof Worker };
    });
    check('runner sandbox: localStorage and POST blocked, no WebSocket/Worker', sandbox.storage === 'blocked' && sandbox.post === 'blocked' && sandbox.websocket === 'undefined' && sandbox.worker === 'undefined', sandbox);

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
    const bridge = JSON.parse(bridgeRaw);
    const p = bridge.probabilities || {};
    check('bridge: exact P(00)=P(11)=0.5, nothing else', Math.abs(p['00'] - 0.5) < 1e-9 && Math.abs(p['11'] - 0.5) < 1e-9 && Object.keys(p).length === 2, p);
    check('bridge: reduced purity of one half = 0.5', Math.abs(bridge.reduced_purity_q0 - 0.5) < 1e-9, bridge.reduced_purity_q0);
    check('bridge: ran in Pyodide (sys.platform emscripten)', bridge.platform === 'emscripten', bridge.platform);
    check('bridge: Qiskit 2.x', /^2\./.test(bridge.qiskit_version), bridge.qiskit_version);

    const gradeCounts = async (via) => {
      const countsRaw = await waitFor(async () => {
        const t = await text('backend-out');
        return t && t.trim().startsWith('{') ? t : null;
      }, 60000, 'backend counts').catch(() => null);
      // The page owes the counts; their absence is a red, not a missing verdict.
      check(`${via}: counts shown on the page`, !!countsRaw, countsRaw ? 'shown' : 'nothing within 60 s');
      if (!countsRaw) return;
      const counts = JSON.parse(countsRaw).counts;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      check(`${via}: counts from one job, 256 shots`, total === 256, counts);
      check(`${via}: ideal Bell counts only 00/11`, Object.keys(counts).every((k) => k === '00' || k === '11'), Object.keys(counts));
      // Binomial(256, 0.5): sd = 8, so 88..168 is +-5 sd. Catches a circuit that is
      // not a Bell pair (all '11', all '00') which the two checks above let through.
      check(`${via}: both 00 and 11 present, each 88..168 of 256`, counts['00'] >= 88 && counts['00'] <= 168 && counts['11'] >= 88 && counts['11'] <= 168, counts);
    };
    // Wait past the countdown, so a send that should not happen has had its chance.
    const pastCountdown = async () => {
      await sleep(Math.max(0, AUTO_SEND_MS + 3000 - (Date.now() - bridgeSeenAt)));
    };

    if (scenario === 'auto') {
      // (c) The countdown sends the one job with no input at all.
      await gradeCounts('(c) auto-send');
      check('(c) status says the job came from the countdown', /^Done: 1 job \(auto\), 256 shots/.test((await text('verify-status')) || '') && /fired/.test((await text('autosend-status')) || ''), [await text('autosend-status'), await text('verify-status')]);
      check('(c) runner counted exactly 1 backend.run', (await runnerState()).jobs === 1, await runnerState());
      await waitFor(async () => (await runnerState()).status === 'done', 10000, 'main.js to return after the job').catch(() => null);
      check('(c) main.js returned after the job settled (Done.)', (await runnerState()).status === 'done', await runnerState());
      await page.screenshot({ path: path.join(out, `${tag}-c-auto-send-one-job.png`) });
      // Then a press must be refused by the PAGE, and the runner must see no second job.
      await (await frame.$('#verify-btn')).click();
      await sleep(2500);
      const status = await text('verify-status');
      const r = await runnerState();
      check('(c) press after auto-send: page shows a visible refusal', /^Refused/.test(status || ''), status);
      check('(c) press after auto-send: runner saw no second backend.run', r.jobs === 1 && r.refused === 0, r);
      await page.screenshot({ path: path.join(out, `${tag}-c2-press-refused.png`) });
    } else if (scenario === 'cancel') {
      // (d) Cancel pressed: nothing is ever sent, and the run is still alive.
      await pastCountdown();
      const r = await runnerState();
      check('(d) cancel: runner saw 0 backend.run calls', r.jobs === 0, r);
      check('(d) cancel: no counts on the page', ((await text('backend-out')) || '').trim() === '', await text('backend-out'));
      check('(d) cancel: page says the auto-send was cancelled', /cancelled/.test((await text('autosend-status')) || ''), await text('autosend-status'));
      check('(d) cancel: main.js still running, so Verify can still send the one job', r.status === 'running', r);
      await page.screenshot({ path: path.join(out, `${tag}-d-cancel-no-job.png`) });
    } else {
      // (e) Button pressed during the countdown: exactly one job, and the countdown never fires.
      await gradeCounts('(e) button');
      await pastCountdown();
      const r = await runnerState();
      check('(e) button: runner counted exactly 1 backend.run past the countdown', r.jobs === 1 && r.refused === 0, r);
      check('(e) button: the job came from the button, the countdown was stopped', /^Done: 1 job \(button\), 256 shots/.test((await text('verify-status')) || '') && /button was pressed/.test((await text('autosend-status')) || ''), [await text('autosend-status'), await text('verify-status')]);
      await page.screenshot({ path: path.join(out, `${tag}-e-button-one-job.png`) });
    }
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
