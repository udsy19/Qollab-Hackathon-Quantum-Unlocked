#!/usr/bin/env node
// Drives the local runner the way a player drives the game: Run, see the title over the canvas,
// press Start, open Settings and change Quality, read the quantum module's answer, then one of
// three paths to the one selected-backend job, then Restart from the pause menu. On the way it
// reads the input diagnostic panel (echo/diag.js) before and after real input. It grades what it
// reads from the rendered page (DOM, canvas size, screenshot pixels) and from the runner's own
// instruments (job counter, job results, the moment main.js returned, messages dropped after
// Done.), never from the project's console messages.
//   --scenario auto    the countdown sends the one job with no input; a later press is refused
//   --scenario cancel  Cancel during the countdown: no job at all; a later press sends the one job
//   --scenario button  Verify during the countdown: exactly one job, the countdown never fires
// Input goes through Chrome's input pipeline (CDP mouse and key events at screen coordinates),
// never dispatchEvent, so it is the path a person's click takes.
//
//   node tools/qollab-runner/check.cjs --port 4890 --backend builtin|ionq-mock --out <dir> \
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
const out = path.resolve(arg('--out', 'evidence/platform/shell'));
const scenario = arg('--scenario', 'auto');
const tag = arg('--tag', `${backend}-${scenario}`);
const AUTO_SEND_MS = 5000; // the page's countdown; checks wait past it by a margin
const expectBuild = arg('--expect-build');
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!port || !['auto', 'cancel', 'button'].includes(scenario)) {
  console.error('usage: check.cjs --port <n> [--backend builtin|ionq-mock] [--scenario auto|cancel|button] [--out dir] [--expect-build token] [--tag name]');
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
    const runnerState = () => page.evaluate(() => {
      const r = window.__runner;
      return { status: r.status, jobs: r.jobs, refused: r.refusedByRunner, settled: r.jobsSettled, jobsAtDone: r.jobsAtDone, settledAtDone: r.jobsSettledAtDone, dropped: r.dropped, error: r.error };
    });
    // main.js stays alive until its one job settles, so "ready" is the quantum module's answer on
    // the page, not the run's done event.
    const quantumLine = () => frameOf().$eval('#echo-quantum', (e) => e.textContent).catch(() => null);
    const q = await waitFor(async () => {
      if ((await runnerState()).status === 'error') throw new Error('stop');
      const t = frameOf() && (await quantumLine());
      return t && !/Calibrating/.test(t) ? t : null;
    }, 300000, 'quantum module answer').catch(async () => {
      throw new Error(`no quantum module answer; runner error: ${(await runnerState()).error}`);
    });
    const bridgeSeenAt = Date.now();
    const loadSeconds = ((Date.now() - t0) / 1000).toFixed(1);
    const frame = frameOf();
    const r0 = await runnerState();
    check('main.js still running after the bridge result (no early Done.), and no error', r0.status === 'running' && !r0.error, { ...r0, readyIn: `${loadSeconds}s` });
    const text = (id) => frame.$eval(`#${id}`, (e) => e.textContent).catch(() => null);
    const shot = (name) => page.screenshot({ path: path.join(out, `${tag}-${name}.png`) });
    const diag = () => frame.$$eval('#input-diag td[data-diag]', (tds) => Object.fromEntries(tds.map((td) => [td.dataset.diag, td.textContent])));
    // A click at the element's centre on screen, through Chrome's input pipeline.
    const press = async (sel) => {
      const el = await frame.$(sel);
      if (!el) throw new Error(`${sel} not on the page`);
      await el.click();
    };

    // ---- 0. the input diagnostic and the auto-send countdown, before any input ------------------
    const d0 = await diag();
    check('(a) diag panel rendered with the three counters at 0', d0.pointerdown === '0' && d0.click === '0' && d0.keydown === '0', d0);
    const countdown = await text('echo-autosend-status');
    check('(a) auto-send countdown visible', /^Auto-sending the one job in \d s/.test(countdown || ''), countdown);
    // The scenario's own action, inside the countdown window, BEFORE the screenshot: a DPR-2
    // swiftshader screenshot takes seconds, long enough for the countdown to fire first.
    if (scenario === 'cancel') await press('#echo-autosend-cancel');
    if (scenario === 'button') await press('#echo-verify');
    const dAction = await diag();
    if (scenario !== 'auto') console.log(`scenario action done ${((Date.now() - bridgeSeenAt) / 1000).toFixed(1)} s after the bridge result was seen`);
    await shot('a-counters-zero');

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
    await press('#echo-ui [data-action="start"]');
    await sleep(500);
    const dStart = await diag();
    check('(b) the Start click is counted: pointerdown and click +1', +dStart.pointerdown === +dAction.pointerdown + 1 && +dStart.click === +dAction.click + 1, { before: dAction, after: dStart });
    check('(b) document.hasFocus() true after the click', dStart['document.hasFocus()'] === 'true', dStart['document.hasFocus()']);
    check('(b) frame origin is opaque ("null"), as on Qollab', dStart.origin === 'null', dStart.origin);
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
    const dEsc = await diag();
    check('(b) the Escape key is counted: keydown +1, last key Escape', +dEsc.keydown === +dStart.keydown + 1 && dEsc['last key'] === 'Escape', dEsc);
    check('(b) verdict reads INPUT REACHES PAGE', /^INPUT REACHES PAGE/.test(dEsc.verdict || ''), dEsc.verdict);
    await shot('b-counters-after-input');
    const pause = await menuState();
    check('Esc after Start opens the pause menu', pause && pause.screen === 'pause', pause);
    await press('#echo-ui .echo-menu [data-screen="pause"] [data-action="settings"]');
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

    // ---- 4. the quantum module's answer (read at the start) -------------------------------------
    const nums = /overlap with two copies (\d+\.\d+), each output purity (\d+\.\d+)/.exec(q);
    check('quantum module answers through the bridge: |+> copy overlap 0.5, purity 0.5', nums &&
      Math.abs(+nums[1] - CLONE_PLUS.overlap) < 1e-6 && Math.abs(+nums[2] - CLONE_PLUS.purity) < 1e-6, q);
    // Back out of settings and pause, so the game is in play for the verify step.
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await sleep(300);
    await shot('4-quantum-answer');

    // Qollab's frame has no allow-pointer-lock, so a request from inside must be refused. (Control:
    // the same panel in a frame WITH allow-pointer-lock reads GRANTED —
    // evidence/platform/g0-input-diagnostic/pointer-lock-control/.)
    await page.keyboard.press('KeyL');
    const lock = await waitFor(async () => {
      const v = (await diag())['pointer lock'];
      return /^(REFUSED|GRANTED)/.test(v) ? v : null;
    }, 5000, 'pointer lock answer').catch(() => 'no answer');
    check('(b) pointer lock REFUSED, as in Qollab\'s allow-scripts-only frame', /^REFUSED/.test(lock), lock);

    // ---- 5. the one job: auto-send, cancel or button --------------------------------------------
    const gradeCounts = async (via) => {
      const raw = await waitFor(async () => {
        const t = await text('echo-verify-out');
        return t && t.trim().startsWith('{') ? t : null;
      }, 60000, 'backend counts').catch(() => null);
      // The page owes the counts; their absence is a red, not a missing verdict.
      check(`${via}: counts shown on the page`, !!raw, raw ? 'shown' : `nothing within 60 s; status: ${await text('echo-verify-status')}`);
      if (!raw) return;
      const counts = JSON.parse(raw).counts || {};
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      check(`${via}: counts from one job, 256 shots`, total === 256, counts);
      // Binomial(256, 0.5): sd = 8, so 88..168 is +-5 sd; a non-Bell circuit fails it.
      check(`${via}: only 00/11, each 88..168 of 256`, Object.keys(counts).every((k) => k === '00' || k === '11') &&
        counts['00'] >= 88 && counts['00'] <= 168 && counts['11'] >= 88 && counts['11'] <= 168, counts);
    };
    // Wait past the countdown, so a send that should not happen has had its chance.
    const pastCountdown = () => sleep(Math.max(0, AUTO_SEND_MS + 3000 - (Date.now() - bridgeSeenAt)));
    // Keep-alive, from the runner's own instruments: main.js returns (Done.) only after the one job
    // was sent AND its result came back.
    const gradeDone = async (via) => {
      const r = await waitFor(async () => { const s = await runnerState(); return s.status !== 'running' ? s : null; }, 15000, 'main.js to return').catch(() => null);
      check(`${via}: main.js returned (Done.) after the job settled: 1 job sent and 1 result back at Done.`, r && r.status === 'done' && r.jobsAtDone === 1 && r.settledAtDone === 1, r || await runnerState());
      await sleep(1500);
      const r2 = await runnerState();
      const lost = await page.evaluate(() => window.__runner.log.filter((l) => l.kind === 'dropped').map((l) => l.msg));
      // Not graded: game lines after Done. (quest changes) are lost on Qollab by design of this
      // build, which returns once the job settles. The job's own outcome is graded above.
      console.log(`INFO  ${via}: ${r2.dropped} page message(s) after Done., which Qollab would drop: ${JSON.stringify(lost)}`);
    };
    const pressRefused = async (via) => {
      await press('#echo-verify');
      await sleep(2500);
      const status = await text('echo-verify-status');
      const r = await runnerState();
      check(`${via}: a later press shows a visible refusal`, /^Refused/.test(status || ''), status);
      check(`${via}: a later press sends no second backend.run`, r.jobs === 1 && r.refused === 0, r);
    };

    if (scenario === 'auto') {
      // (c) The countdown sends the one job with no input at all.
      await gradeCounts('(c) auto-send');
      check('(c) status says the job came from the countdown', /^Done: 1 job \(auto\) on /.test((await text('echo-verify-status')) || '') && /fired/.test((await text('echo-autosend-status')) || ''), [await text('echo-autosend-status'), await text('echo-verify-status')]);
      check('(c) runner counted exactly 1 backend.run', (await runnerState()).jobs === 1, await runnerState());
      await gradeDone('(c)');
      await shot('c-auto-send-one-job');
      await pressRefused('(c)');
    } else if (scenario === 'cancel') {
      // (d) Cancel pressed: nothing is sent, and the run is still alive so Verify still can.
      await pastCountdown();
      const r = await runnerState();
      check('(d) cancel: runner saw 0 backend.run calls past the countdown', r.jobs === 0, r);
      check('(d) cancel: no counts on the page', ((await text('echo-verify-out')) || '').trim() === '', await text('echo-verify-out'));
      check('(d) cancel: page says the auto-send was cancelled', /cancelled/.test((await text('echo-autosend-status')) || ''), await text('echo-autosend-status'));
      check('(d) cancel: main.js still running, so Verify can still send the one job', r.status === 'running', r);
      await shot('d-cancel-no-job');
      await press('#echo-verify');
      await gradeCounts('(d) button after cancel');
      check('(d) the job came from the button', /^Done: 1 job \(button\) on /.test((await text('echo-verify-status')) || ''), await text('echo-verify-status'));
      await gradeDone('(d)');
      await pressRefused('(d)');
    } else {
      // (e) Verify pressed during the countdown: exactly one job, and the countdown never fires.
      await gradeCounts('(e) button');
      await pastCountdown();
      const r = await runnerState();
      check('(e) button: runner counted exactly 1 backend.run past the countdown', r.jobs === 1 && r.refused === 0, r);
      check('(e) button: the job came from the button, the countdown was stopped', /^Done: 1 job \(button\) on /.test((await text('echo-verify-status')) || '') && /button was pressed/.test((await text('echo-autosend-status')) || ''), [await text('echo-autosend-status'), await text('echo-verify-status')]);
      await gradeDone('(e)');
      await shot('e-button-one-job');
      await pressRefused('(e)');
    }
    const dEnd = await diag();
    check('verdict line still reads INPUT REACHES PAGE at the end', /^INPUT REACHES PAGE/.test(dEnd.verdict || ''), dEnd);
    await shot('5-verdict-and-job');

    // ---- 6. Restart from pause → TITLE (§9.5) --------------------------------------------------
    await page.keyboard.press('Escape');
    await sleep(300);
    await press('#echo-ui .echo-menu [data-screen="pause"] [data-action="restart"]');
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
