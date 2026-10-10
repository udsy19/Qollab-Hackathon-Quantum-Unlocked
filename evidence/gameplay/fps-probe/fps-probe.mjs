// FPS probe for the ECHO graybox: HEADED Chrome, real keyboard walk path, an independent frame timer.
//
//   node evidence/gameplay/fps-probe/fps-probe.mjs [--port N] [--res 1280x720,1920x1080] [--rates 1,4,6]
//                                                   [--modes vsync,uncapped] [--window-ms 6000] [--out DIR]
//
// Modes: `vsync` is what the attached display shows (rAF is paced by its refresh); `uncapped` is the same
// headed window with --disable-gpu-vsync --disable-frame-rate-limit, which measures frame-time capacity.
// On the probe machine the main display is a 30 Hz TV, so `vsync` cannot read above 30 there.
//
// Walk path (vision §9 quest order, driven through the dev terminal like world-playthrough.mjs):
// alley → booth → connector → relay chamber → rooftop (pre-commit) → rooftop with the city lit (ENDING).
// At each space the driver stops, and for each CPU throttle (CDP Emulation.setCPUThrottlingRate) holds
// ArrowLeft for --window-ms so the camera sweeps the whole space while frames are recorded.
//
// The frame timer is NOT the game's counter: a script injected with evaluateOnNewDocument (before the
// game exists) records every requestAnimationFrame timestamp, and wraps WebGL2 draw/create calls to
// count draws, triangles, textures, buffers and programs at the GL boundary. The game's own `perf:fps`
// bus event is recorded alongside, only to report disagreement.
// Controls (law 2/3): a second page with a ~40 ms busy-loop per frame injected via evaluateOnNewDocument
// (that page only, never the repo) must read < 30 FPS; and the game's perf:fps falsified to 999 must
// leave the independent reading unchanged.
// Provenance (law 16): BUILD read from echo/game/app.js on disk must equal the served module's BUILD and
// the token in the served app.js bytes; mismatch → exit 2.
// Exit 0 = measured (the FPS verdict is in the JSON, not the exit code), 1 = a control failed, 2 = refused.
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(path.join(execSync('npm root -g').toString().trim(), '@modelcontextprotocol/server-puppeteer/'));
const puppeteer = require('puppeteer');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../../..');
const PORT = Number(opt('--port', 40000 + Math.floor(Math.random() * 20000)));
// WxH or WxH@DPR (device scale factor; the game caps its pixel ratio at 1.5, echo/scene/renderer.js).
const RESOLUTIONS = opt('--res', '1280x720,1920x1080').split(',').map((r) => { const [wh, d] = r.split('@'); const [w, h] = wh.split('x').map(Number); return [w, h, Number(d ?? 1)]; });
const RATES = opt('--rates', '1,4,6').split(',').map(Number);
const MODES = opt('--modes', 'vsync').split(',');
const WINDOW_MS = Number(opt('--window-ms', 6000));
const OUT = path.resolve(opt('--out', path.join(HERE, 'run')));
const SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const expected = /BUILD = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'echo/game/app.js'), 'utf8'))[1];
const gitHead = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();

// ---------------------------------------------------------------- server (own port)
const servers = [];
let browser;
process.on('exit', () => servers.forEach((s) => s.kill()));
const die = (code) => async (e) => { console.error(e); await browser?.close().catch(() => {}); servers.forEach((s) => s.kill()); process.exit(code); };
process.on('uncaughtException', die(2));
process.on('unhandledRejection', die(2));
async function startServer(port) {
  const proc = spawn('python3', [path.join(ROOT, 'dev/gameplay/dev_engine.py'), String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  servers.push(proc);
  let err = '';
  proc.stderr.on('data', (d) => { err += d; });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`server on ${port} did not start: ${err}`)), 30000);
    proc.stdout.on('data', (d) => { if (String(d).includes(`:${port}/`)) { clearTimeout(t); resolve(); } });
    proc.on('exit', (c) => { clearTimeout(t); reject(new Error(`server on ${port} exited ${c}: ${err}`)); });
  });
  return `http://127.0.0.1:${port}/dev/gameplay/world.html`;
}
const URL_ = await startServer(PORT);

// ---------------------------------------------------------------- the independent recorder
// Runs before any page script. Its rAF callback is registered first, so in each frame it runs before
// the game's: the GL counters it snapshots are the previous frame's render.
const RECORDER = () => {
  const R = (window.__fp = { ts: [], draws: [], tris: [], live: { textures: 0, buffers: 0, programs: 0 }, game: [] });
  let draws = 0;
  let tris = 0;
  const P = WebGL2RenderingContext.prototype;
  const TRI = 4; // gl.TRIANGLES
  const wrap = (name, f) => { const o = P[name]; P[name] = function (...a) { f(a); return o.apply(this, a); }; };
  wrap('drawElements', (a) => { draws++; if (a[0] === TRI) tris += a[1] / 3; });
  wrap('drawArrays', (a) => { draws++; if (a[0] === TRI) tris += a[2] / 3; });
  wrap('drawElementsInstanced', (a) => { draws++; if (a[0] === TRI) tris += (a[1] / 3) * a[4]; });
  wrap('drawArraysInstanced', (a) => { draws++; if (a[0] === TRI) tris += (a[2] / 3) * a[3]; });
  for (const [mk, rm, key] of [['createTexture', 'deleteTexture', 'textures'], ['createBuffer', 'deleteBuffer', 'buffers'], ['createProgram', 'deleteProgram', 'programs']]) {
    wrap(mk, () => { R.live[key]++; });
    wrap(rm, () => { R.live[key]--; });
  }
  // GPU time per game frame, at the GL boundary: EXT_disjoint_timer_query_webgl2 around every rAF callback
  // that is not ours (the game's frame = sim + render submission). Disjoint results are dropped.
  R.gpu = [];
  R.gpuTimer = null;
  let gl = null;
  let ext = null;
  const queries = [];
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const c = getContext.call(this, type, ...rest);
    if (type === 'webgl2' && c && !gl) { gl = c; ext = c.getExtension('EXT_disjoint_timer_query_webgl2'); R.gpuTimer = Boolean(ext); }
    return c;
  };
  const raf = window.requestAnimationFrame.bind(window);
  // Also the CPU time of every such callback (sim + render submission), timed here, not by the game.
  R.cpu = [];
  window.requestAnimationFrame = (cb) => raf((t) => {
    const q = ext && queries.length <= 8 ? gl.createQuery() : null;
    if (q) gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
    const c0 = performance.now();
    try { cb(t); } finally {
      R.cpu.push([c0, performance.now() - c0]);
      if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); queries.push(q); }
    }
  });
  const pollGpu = () => {
    while (queries.length && gl.getQueryParameter(queries[0], gl.QUERY_RESULT_AVAILABLE)) {
      const q = queries.shift();
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
      if (!disjoint) R.gpu.push([performance.now(), gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6]);
      gl.deleteQuery(q);
    }
  };
  R.blurs = [];
  window.addEventListener('blur', () => R.blurs.push(performance.now()));
  const busy = Number(window.__FP_BUSY_MS || 0);
  // Cadence is read with performance.now() at callback entry: with --disable-frame-rate-limit the rAF
  // argument (frame begin time) clusters and does not reflect when frames actually ran.
  const loop = () => {
    R.ts.push(performance.now());
    if (ext) pollGpu();
    R.draws.push(draws);
    R.tris.push(tris);
    draws = 0;
    tris = 0;
    if (busy) { const end = performance.now() + busy; while (performance.now() < end); }
    raf(loop);
  };
  raf(loop);
};

async function launch(w, h, mode) {
  browser = await puppeteer.launch({
    headless: false,
    executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    defaultViewport: null,
    args: [
      '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist',
      '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
      '--disable-features=CalculateNativeWinOcclusion', `--window-size=${w},${h + 140}`, '--window-position=0,0',
      ...(mode === 'uncapped' ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : []),
    ],
  });
}

async function openPage(w, h, { busyMs = 0, fresh = false, dpr = 1 } = {}) {
  const page = fresh ? await browser.newPage() : ((await browser.pages())[0] ?? await browser.newPage());
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr });
  await page.setCacheEnabled(false);
  if (busyMs) await page.evaluateOnNewDocument((ms) => { window.__FP_BUSY_MS = ms; }, busyMs);
  await page.evaluateOnNewDocument(RECORDER);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.bringToFront();
  await page.goto(URL_, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__echo, { timeout: 60000 });
  // The game's own counter, recorded only to compare against ours.
  await page.evaluate(() => window.__echo.bus.on('perf:fps', (f) => window.__fp.game.push({ t: performance.now(), ...f })));
  return { page, errors };
}

async function provenance(pg) {
  const served = await pg.evaluate(() => window.__echo.BUILD);
  const bytes = await pg.evaluate(() => fetch('/echo/game/app.js', { cache: 'no-store' }).then((r) => r.text()));
  const inBytes = /BUILD = '([^']+)'/.exec(bytes)?.[1];
  const env = await pg.evaluate(() => {
    const c = document.createElement('canvas').getContext('webgl2');
    const ext = c?.getExtension('WEBGL_debug_renderer_info');
    const gc = document.querySelector('#game-root canvas');
    return {
      gpu: ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown',
      visibility: document.visibilityState, focused: document.hasFocus(),
      dpr: window.devicePixelRatio, inner: [innerWidth, innerHeight],
      canvas: gc ? [gc.width, gc.height] : null, ua: navigator.userAgent,
    };
  });
  console.log(`build disk=${expected} module=${served} bytes=${inBytes} | ${JSON.stringify(env)}`);
  if (served !== expected || inBytes !== expected) { console.error('REFUSED: BUILD MISMATCH'); await die(2)('mismatch'); }
  return { expected, served, inBytes, ...env };
}

// ---------------------------------------------------------------- input (technique copied from world-playthrough.mjs)
let page;
// The probe machine is shared: another app taking focus blurs this window and the game pauses itself
// (echo/game/app.js 'blur' handler). The driver resumes, and windows with a blur in them are flagged.
let resumes = 0;
const dbg = () => page.evaluate(() => {
  if (window.__echo.paused && window.__echo.debug.state !== 'TITLE') { window.__echo.resume(); window.__fp.resumed = (window.__fp.resumed ?? 0) + 1; }
  const d = window.__echo.debug;
  return { state: d.state, player: d.player, focus: d.focus, camera: d.camera, changes: d.changes(), paused: window.__echo.paused };
});
const SENS = 0.0026;
const TURN_RATE = 600 * SENS;
async function turnTo(yawTarget) {
  for (let i = 0; i < 8; i++) {
    const { camera } = await dbg();
    let diff = yawTarget - camera.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (Math.abs(diff) < 0.04) return;
    const key = diff > 0 ? 'ArrowLeft' : 'ArrowRight';
    await page.keyboard.down(key);
    await sleep(Math.max(8, (Math.abs(diff) / TURN_RATE) * 1000 * (i ? 0.8 : 0.9)));
    await page.keyboard.up(key);
    await sleep(40);
  }
}
async function walkTo(x, z, { tol = 0.25, sprint = false } = {}) {
  for (let i = 0; i < 80; i++) {
    const { player } = await dbg();
    const dx = x - player.x;
    const dz = z - player.z;
    const d = Math.hypot(dx, dz);
    if (d < tol) break;
    await turnTo(Math.atan2(-dx, -dz));
    if (sprint) await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyW');
    await sleep(Math.min(300, Math.max(60, (d / 3.1) * 1000 * 0.6)));
    await page.keyboard.up('KeyW');
    if (sprint) await page.keyboard.up('ShiftLeft');
  }
  await sleep(250);
  return (await dbg()).player;
}
async function approach(x, z, ax, az, id) {
  await walkTo(x, z, { tol: 0.2 });
  for (let i = 0; i < 3 && (await dbg()).focus !== id; i++) {
    const { player } = await dbg();
    await turnTo(Math.atan2(-(ax - player.x), -(az - player.z)));
    await page.keyboard.down('KeyW'); await sleep(70); await page.keyboard.up('KeyW');
    await sleep(250);
  }
  const s = await dbg();
  if (s.focus !== id) throw new Error(`no focus on ${id} at ${JSON.stringify(s.player)}`);
}
const termNote = () => page.evaluate(() => document.querySelector('#term-host .dt-note')?.textContent ?? '');
async function tbtn(text) {
  const ok = await page.evaluate((t) => [...document.querySelectorAll('#term-host button')].some((x) => x.textContent.trim() === t && !x.disabled), text);
  if (!ok) throw new Error(`no enabled terminal button "${text}" in ${(await dbg()).state}`);
  await page.evaluate((t) => [...document.querySelectorAll('#term-host button')].find((x) => x.textContent.trim() === t && !x.disabled).click(), text);
  await page.waitForFunction(() => !(document.querySelector('#term-host .dt-note')?.textContent ?? '').endsWith('…'), { timeout: 15000 });
  await sleep(60);
  return (await dbg()).state;
}
const bitsOnScreen = async () => {
  const t = await page.evaluate(() => document.querySelector('#term-host .dt-bits')?.textContent ?? '');
  const m = /SOURCE READOUT m0 = (\d) · LOCAL BELL-HALF READOUT m1 = (\d)/.exec(t);
  if (!m) throw new Error(`bits not on screen: "${t}" — ${await termNote()}`);
  return { m0: Number(m[1]), m1: Number(m[2]) };
};
const choiceFor = (x, z) => `Apply ${x && z ? 'X then Z' : x ? 'X' : z ? 'Z' : 'no correction'}`;
async function closeTerminal() { await page.click('#term-close'); await sleep(150); }
async function pressE() { await page.keyboard.press('KeyE'); await sleep(250); }

// ---------------------------------------------------------------- measuring one space
const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
function summarise(ts, draws, tris) {
  const dt = [];
  for (let i = 1; i < ts.length; i++) dt.push(ts[i] - ts[i - 1]);
  const s = [...dt].sort((a, b) => a - b);
  const span = ts[ts.length - 1] - ts[0];
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  return {
    frames: dt.length,
    seconds: +(span / 1000).toFixed(2),
    avgFps: +((dt.length / span) * 1000).toFixed(1),
    // fps percentiles come from frame-time percentiles: the 5th-percentile fps is the 95th-percentile frame time.
    medianFps: +(1000 / pct(s, 0.5)).toFixed(1),
    p5Fps: +(1000 / pct(s, 0.95)).toFixed(1),
    p1Fps: +(1000 / pct(s, 0.99)).toFixed(1),
    longestFrameMs: +s[s.length - 1].toFixed(1),
    framesOver33ms: dt.filter((d) => d > 1000 / 30).length,
    glDrawsPerFrame: +mean(draws.slice(1)).toFixed(1),
    glTrianglesPerFrame: Math.round(mean(tris.slice(1))),
  };
}
async function measure(space, rate, { rotate = true, label = '' } = {}) {
  if ((await dbg()).paused) { await page.evaluate(() => window.__echo.resume()); await sleep(200); }
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await sleep(1000); // settle
  const i0 = await page.evaluate(() => window.__fp.ts.length);
  const g0 = await page.evaluate(() => window.__fp.game.length);
  const load = os.loadavg()[0];
  const programsBefore = await page.evaluate(() => window.__fp.live.programs);
  const tStart = await page.evaluate(() => performance.now());
  if (rotate) await page.keyboard.down('ArrowLeft');
  await sleep(WINDOW_MS);
  if (rotate) await page.keyboard.up('ArrowLeft');
  const raw = await page.evaluate((a, b, t0) => ({ blursInWindow: window.__fp.blurs.filter((t) => t >= t0).length, cpu: window.__fp.cpu.filter(([t]) => t >= t0).map(([, ms]) => ms), gpu: window.__fp.gpu.filter(([t]) => t >= t0).map(([, ms]) => ms), gpuTimer: window.__fp.gpuTimer, ts: window.__fp.ts.slice(a), draws: window.__fp.draws.slice(a), tris: window.__fp.tris.slice(a), live: { ...window.__fp.live }, game: window.__fp.game.slice(b) }), i0, g0, tStart);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await cdp.detach();
  const end = await dbg();
  const sum = summarise(raw.ts, raw.draws, raw.tris);
  const g = [...raw.gpu].sort((x, y) => x - y);
  const c = [...raw.cpu].sort((x, y) => x - y);
  sum.cpu = { samples: c.length, medianMs: +pct(c, 0.5).toFixed(3), p95Ms: +pct(c, 0.95).toFixed(3), p99Ms: +pct(c, 0.99).toFixed(3), maxMs: +c.at(-1).toFixed(2) };
  sum.programsCompiledDuringWindow = raw.live.programs - programsBefore;
  sum.gpu = raw.gpuTimer ? { samples: g.length, medianMs: g.length ? +pct(g, 0.5).toFixed(3) : null, p95Ms: g.length ? +pct(g, 0.95).toFixed(3) : null, maxMs: g.length ? +g.at(-1).toFixed(3) : null } : 'EXT_disjoint_timer_query_webgl2 unavailable';
  const gameFps = raw.game.map((g) => g.fps);
  const rec = {
    space, rate, label, loadavg1: +load.toFixed(2), blursInWindow: raw.blursInWindow, state: end.state, pausedAtEnd: end.paused, player: end.player, ...sum, glLive: raw.live,
    game: { perfFpsSamples: gameFps, perfFpsMedian: gameFps.length ? [...gameFps].sort((a, b) => a - b)[Math.floor(gameFps.length / 2)] : null, rendererInfoCalls: raw.game.at(-1)?.calls ?? null, msPerFrame: raw.game.map((g) => g.ms) },
    t: raw.ts.map((x) => +(x - raw.ts[0]).toFixed(2)),
  };
  console.log(`${label.padEnd(10)} ${space.padEnd(12)} ${rate}x  avg ${sum.avgFps}  median ${sum.medianFps}  p5 ${sum.p5Fps}  p1 ${sum.p1Fps}  max ${sum.longestFrameMs} ms  | game perf:fps median ${rec.game.perfFpsMedian}  | draws ${sum.glDrawsPerFrame} (renderer.info ${rec.game.rendererInfoCalls}) tris ${sum.glTrianglesPerFrame}  cpu ${sum.cpu.medianMs}/${sum.cpu.p95Ms}/${sum.cpu.maxMs} ms  gpu ${sum.gpu.medianMs}/${sum.gpu.p95Ms} ms  +prog ${sum.programsCompiledDuringWindow}  load ${load.toFixed(1)}${raw.blursInWindow ? '  BLUR' : ''}${end.paused ? '  PAUSED!' : ''}`);
  return rec;
}

async function shot(name) { await sleep(150); await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); }

async function walkPath(label) {
  const out = [];
  const at = async (space, opts) => {
    await shot(`${label}-${space}`);
    for (const r of RATES) out.push(await measure(space, r, { label, ...opts }));
  };
  await page.click('#play');
  await sleep(400);
  // Alley
  await walkTo(0, -3);
  await turnTo(0);
  await at('alley');
  // Booth (before the experiment), then the clone mission through the dev terminal
  await walkTo(1.5, -6, { sprint: true });
  await walkTo(2.6, -11.5);
  await turnTo(-Math.PI / 2);
  await at('booth');
  await approach(3.6, -11.5, 3.9, -11.5, 'copy_booth');
  await pressE();
  await tbtn('Duplicate zero');
  await tbtn('Duplicate plus');
  await tbtn('story-ui stub: show result panel');
  await tbtn('EXPLANATION_READ');
  await closeTerminal();
  // Connector (door A open)
  await walkTo(0, -18);
  await sleep(1100);
  await walkTo(0, -29);
  await turnTo(0);
  await at('connector');
  // Relay chamber: run mission 2 so the conduit is lit, then measure
  await walkTo(0, -40, { sprint: true });
  await approach(0, -47.5, 0, -48.2, 'relay_core');
  await pressE();
  await tbtn('Sender I');
  await closeTerminal();
  await approach(0, -47.5, 0, -48.2, 'relay_core');
  await pressE();
  await tbtn('Sender X');
  await tbtn('story-ui stub: show result panel');
  await tbtn('VIEW_RECEIVER_MARGINAL');
  await closeTerminal();
  await walkTo(2.5, -44);
  await turnTo(Math.PI);
  await at('relay');
  // Elevator → rooftop, repair the link, measure the rooftop before the commit
  await walkTo(2.5, -46);
  await sleep(1100);
  await walkTo(13, -50);
  await walkTo(20, -50);
  await walkTo(21.5, -55);
  await approach(21.5, -56.9, 21.5, -57.3, 'classical_socket');
  await pressE();
  await closeTerminal();
  await walkTo(24, -52);
  await turnTo(Math.atan2(-(62 - 24), -(-78 + 52)));
  await at('rooftop');
  // Teleport terminal: correct dry runs until one passes, then the single commit
  await walkTo(30, -47);
  await approach(30, -44.2, 30, -43.6, 'teleport_terminal');
  await pressE();
  let passed = false;
  for (let i = 0; i < 16 && !passed; i++) {
    await tbtn('Bell-measure a fresh calibration qubit');
    const b = await bitsOnScreen();
    passed = (await tbtn(choiceFor(b.m1 === 1, b.m0 === 1))) === 'TELEPORT_DRY_RUN_PASSED';
  }
  if (!passed) throw new Error('dry run never passed');
  await tbtn('COMMIT TRANSFER (story token, once)');
  await page.waitForFunction(() => window.__echo.debug.state === 'ENDING', { timeout: 10000 });
  const lit = (await dbg()).changes;
  if (!lit.includes('city_lighting_wave')) throw new Error(`city not lit: ${lit}`);
  // The harness's ENDING panel would cover the city; hide it in this page only (the camera holds the final shot).
  await page.evaluate(() => { document.getElementById('ending').hidden = true; });
  await at('rooftop-lit', { rotate: false });
  return out;
}

// ---------------------------------------------------------------- run
let display = '';
try { display = execSync('/usr/sbin/system_profiler SPDisplaysDataType').toString().split('Displays:')[1]?.replace(/\s+/g, ' ').trim(); } catch { display = 'unknown'; }
console.log(`display: ${display}`);
const report = { gitHead, display, cpus: os.cpus().length, port: PORT, windowMs: WINDOW_MS, rates: RATES, modes: MODES, started: new Date().toISOString(), runs: [], controls: {}, profile: {} };
const save = () => fs.writeFileSync(path.join(OUT, 'fps-probe.json'), JSON.stringify(report, null, 1));
for (const mode of MODES) for (const [w, h, dpr] of RESOLUTIONS) {
  await launch(w, h, mode);
  const o = await openPage(w, h, { dpr });
  page = o.page;
  const prov = await provenance(page);
  if (prov.visibility !== 'visible') await die(2)(`REFUSED: page not visible (${prov.visibility})`);
  const label = `${mode}-${w}x${h}${dpr === 1 ? '' : `@${dpr}`}`;
  let rows;
  try { rows = await walkPath(label); } catch (e) {
    // One retry in a fresh browser: on the shared machine a window was once closed under the driver.
    console.log(`walk failed (${e.message.split('\n')[0]}); retrying ${label} once in a fresh browser`);
    await browser.close().catch(() => {});
    await launch(w, h, mode);
    page = (await openPage(w, h, { dpr })).page;
    rows = await walkPath(label);
  }
  report.runs.push({ mode, resolution: `${w}x${h}`, dpr, label, provenance: prov, errors: o.errors, rows });
  save();

  if (w === RESOLUTIONS[0][0] && h === RESOLUTIONS[0][1] && dpr === RESOLUTIONS[0][2]) {
    // Profile rooftop-lit at the heaviest throttle: CPU self time by function and file:line, plus a trace
    // whose compositor frame events are a second, browser-side count of the same window.
    const cdp = await page.createCDPSession();
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATES.at(-1) });
    await sleep(1000);
    await page.tracing.start({ categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.frame'] });
    const i0 = await page.evaluate(() => window.__fp.ts.length);
    await cdp.send('Profiler.start');
    await sleep(5000);
    const { profile } = await cdp.send('Profiler.stop');
    const i1 = await page.evaluate(() => window.__fp.ts.length);
    const trace = JSON.parse(Buffer.from(await page.tracing.stop()).toString('utf8'));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const dt = profile.timeDeltas ?? [];
    const self = new Map();
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    profile.samples.forEach((id, k) => {
      const cf = byId.get(id).callFrame;
      const key = `${cf.functionName || '(anon)'} ${cf.url.replace(/^.*?\/\/[^/]+/, '')}:${cf.lineNumber + 1}`;
      self.set(key, (self.get(key) ?? 0) + (dt[k] ?? 0) / 1000);
    });
    const total = [...self.values()].reduce((a, b) => a + b, 0);
    const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, ms]) => ({ fn: k, selfMs: +ms.toFixed(1), pct: +((100 * ms) / total).toFixed(1) }));
    const names = {};
    for (const e of trace.traceEvents) if (/^(DrawFrame|BeginFrame|Commit|ActivateLayerTree|BeginMainThreadFrame|AnimationFrame)$/.test(e.name)) names[e.name] = (names[e.name] ?? 0) + 1;
    report.profile[mode] = { space: 'rooftop-lit', resolution: label, rate: RATES.at(-1), seconds: 5, recorderFrames: i1 - i0, traceEventCounts: names, totalSampledMs: +total.toFixed(1), top };
    fs.writeFileSync(path.join(OUT, `profile-${label}-rooftop-lit.cpuprofile`), JSON.stringify(profile));
    console.log(`profile: recorder frames ${i1 - i0} in 5 s, trace ${JSON.stringify(names)}`);
    top.slice(0, 12).forEach((t) => console.log(`  ${t.pct}%  ${t.selfMs} ms  ${t.fn}`));
    await cdp.detach();

    // CONTROL A: the game's perf:fps falsified to 999 on this page; the independent reading must not move.
    await page.evaluate(() => { const b = window.__echo.bus; const emit = b.emit.bind(b); b.emit = (n, p) => emit(n, n === 'perf:fps' ? { ...p, fps: 999 } : p); });
    const a = await measure('rooftop-lit', 1, { rotate: false, label: 'ctrlA-999' });
    report.controls[`${mode}-gameCounterFalsified`] = { independentMedianFps: a.medianFps, gamePerfFpsMedian: a.game.perfFpsMedian };

    // CONTROL B: a fresh tab in the same headed browser with a 40 ms busy-loop per frame.
    await page.close();
    const b = await openPage(w, h, { busyMs: 40, fresh: true, dpr });
    page = b.page;
    await page.click('#play');
    await sleep(400);
    await shot(`${label}-control-busy40ms`);
    const rec = await measure('alley', 1, { label: 'ctrlB-40ms' });
    report.controls[`${mode}-busyLoop40ms`] = { medianFps: rec.medianFps, p5Fps: rec.p5Fps, gamePerfFpsMedian: rec.game.perfFpsMedian, wentRed: rec.medianFps < 30, row: rec };
  }
  save();
  await browser.close();
}
report.finished = new Date().toISOString();
save();
servers.forEach((s) => s.kill());
const busy = Object.entries(report.controls).filter(([k]) => k.endsWith('busyLoop40ms'));
const failed = busy.length === 0 || busy.some(([, v]) => !v.wentRed);
console.log(failed ? 'CONTROL FAILED: busy-loop page did not read < 30 FPS' : 'controls ok');
process.exit(failed ? 1 : 0);
