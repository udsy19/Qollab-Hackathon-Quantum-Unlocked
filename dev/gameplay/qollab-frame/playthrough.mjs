// The world as Qollab runs it: inside <iframe sandbox="allow-scripts">, cross-origin, unfocused,
// driven ONLY by real CDP mouse and keyboard input sent to the top-level page (never by focusing
// the frame from script). The checks:
//   starts unfocused, focus overlay on top, keys ignored → a click focuses → WASD moves → drag orbits
//   → ←/→ orbit → E at the booth opens it → startGame().ended still pending → blur with S held:
//   overlay back, nothing moves, no key sticks → re-click resumes → Esc pauses → (quest walked to
//   ENDING through the dev engine, a shortcut) → ended still pending → real click on Credits →
//   ended resolves {reason:'credits'}. document.pointerLockElement null at every step; no page errors.
//
//   node dev/gameplay/qollab-frame/playthrough.mjs [outDir] [--port 8691] [--falsify]
//
// --falsify: four sabotages, each on a DISPOSABLE copy of the tree (law 10) served by its own server,
// each after the same check passes on the unbroken copy: overlay never shown · pointer lock made
// mandatory · ended resolves at once · drag orbit removed. Each must turn its check red.
// Provenance (law 16): expected BUILD read from echo/game/app.js bytes; served BUILD read in the frame.
// Exit 0 = every check passed, 1 = a check failed, 2 = could not grade.
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(path.join(execSync('npm root -g').toString().trim(), '@modelcontextprotocol/server-puppeteer/'));
const puppeteer = require('puppeteer');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const PORT = Number(opt('--port', 8691));
const OUT = path.resolve(argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--port') ?? path.join(os.tmpdir(), 'echo-qollab-frame'));
const FALSIFY = argv.includes('--falsify');
fs.mkdirSync(OUT, { recursive: true });
const expected = /BUILD = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'echo/game/app.js'), 'utf8'))[1];
const SENS = 0.0026; // echo/game/camera.js: rad per px of mouse

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const servers = [];
let browser;
async function cleanup() { await browser?.close().catch(() => {}); servers.forEach((s) => s.kill()); }
const refuse = async (why) => { console.error(`REFUSED: ${why}`); await cleanup(); process.exit(2); };
process.on('exit', () => servers.forEach((s) => s.kill()));
process.on('unhandledRejection', (e) => { console.error(e); servers.forEach((s) => s.kill()); process.exit(2); });

async function startServer(root, port) {
  const proc = spawn('python3', [path.join(root, 'dev/gameplay/qollab-frame/server.py'), String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  servers.push(proc);
  let err = '';
  proc.stderr.on('data', (d) => { err += d; });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`server on ${port} did not start: ${err}`)), 30000);
    proc.stdout.on('data', (d) => { if (String(d).includes(`:${port}/`)) { clearTimeout(t); resolve(); } });
    proc.on('exit', (c) => { clearTimeout(t); reject(new Error(`server on ${port} exited ${c}: ${err}`)); });
  });
  return `http://127.0.0.1:${port}/dev/gameplay/qollab-frame/host.html`;
}

browser = await puppeteer.launch({
  headless: 'new',
  executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1280,720'],
});

// One session: the host page, the game frame inside it, and every error either of them raises.
async function openHost(url) {
  const errors = [];
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.setCacheEnabled(false);
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle0' });
  const frameOk = await page.waitForFrame((f) => f.url().includes('/dev/gameplay/world.html'), { timeout: 15000 }).then(() => true, () => false);
  if (!frameOk) return { page, errors, frame: null };
  const frame = page.frames().find((f) => f.url().includes('/dev/gameplay/world.html'));
  const booted = await frame.waitForFunction(() => window.__echo, { timeout: 20000 }).then(() => true, () => false);
  const box = await (await page.$('iframe')).boundingBox();
  return { page, errors, frame: booted ? frame : null, box };
}

// Read-only views of the frame, for grading. Input never goes through these.
const view = (frame) => frame.evaluate(() => {
  const d = window.__echo.debug;
  const ov = document.querySelector('[data-focus-overlay]');
  const r = ov?.getBoundingClientRect();
  const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  return {
    state: d.state, player: d.player, focus: d.focus, yaw: d.camera.yaw, paused: window.__echo.paused,
    hasFocus: document.hasFocus(), origin: self.origin, lock: document.pointerLockElement === null ? null : String(document.pointerLockElement.tagName),
    // The overlay counts as shown only if it is what a click at the centre of the frame would hit.
    overlay: Boolean(ov && !ov.hidden && r.width >= innerWidth - 1 && r.height >= innerHeight - 1 && top && ov.contains(top)),
    ended: window.__ended ?? 'no-record',
    pause: !document.getElementById('pause').hidden,
  };
});
// Real input: page.mouse / page.keyboard on the top-level page, positioned in frame coordinates.
const clickFrame = async (s, x, y) => { await s.page.mouse.click(s.box.x + x, s.box.y + y); await sleep(200); };
const clickEl = async (s, sel) => {
  const r = await s.frame.evaluate((q) => { const b = document.querySelector(q).getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
  await clickFrame(s, r.x, r.y);
};
const hold = async (s, key, ms) => { await s.page.keyboard.down(key); await sleep(ms); await s.page.keyboard.up(key); await sleep(150); };
async function drag(s, px) {
  const x0 = s.box.width / 2;
  const y0 = s.box.height * 0.8;
  await s.page.mouse.move(s.box.x + x0, s.box.y + y0);
  await s.page.mouse.down();
  for (let k = 1; k <= 5; k++) await s.page.mouse.move(s.box.x + x0 + (px * k) / 5, s.box.y + y0);
  await s.page.mouse.up();
  await sleep(200);
}
const TURN_RATE = 600 * SENS; // ←/→ in app.js: 600 px-equivalent per second
async function turnTo(s, yawTarget) {
  for (let i = 0; i < 8; i++) {
    let diff = yawTarget - (await view(s.frame)).yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (Math.abs(diff) < 0.04) return;
    await hold(s, diff > 0 ? 'ArrowLeft' : 'ArrowRight', Math.max(8, (Math.abs(diff) / TURN_RATE) * 1000 * 0.85));
  }
}
async function walkTo(s, x, z, tol = 0.25) {
  for (let i = 0; i < 80; i++) {
    const { player } = await view(s.frame);
    const dx = x - player.x;
    const dz = z - player.z;
    const d = Math.hypot(dx, dz);
    if (d < tol) break;
    await turnTo(s, Math.atan2(-dx, -dz));
    await hold(s, 'KeyW', Math.min(300, Math.max(60, (d / 3.1) * 1000 * 0.6)));
  }
  await sleep(200);
}

// The checks the sabotage round reuses. Each takes a fresh session and returns {ok, detail}.
const focusAndPlay = async (s) => {
  const r = await s.frame.evaluate(() => { const b = document.getElementById('play').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await clickFrame(s, s.box.width / 2, s.box.height - 40); // the first click lands on the overlay
  await clickFrame(s, r.x, r.y);
  await sleep(300);
};
const CHECKS = {
  overlayAtStart: async (s) => {
    const v = await view(s.frame);
    return { ok: !v.hasFocus && v.overlay, detail: `hasFocus=${v.hasFocus} overlay=${v.overlay}` };
  },
  wasdAfterClick: async (s) => {
    await focusAndPlay(s);
    const a = await view(s.frame);
    await hold(s, 'KeyW', 600);
    const b = await view(s.frame);
    return { ok: a.state === 'FREE_ROAM_ALLEY' && a.player.z - b.player.z > 0.8, detail: `${a.state} z ${a.player.z.toFixed(2)} → ${b.player.z.toFixed(2)}` };
  },
  endedPendingMidGame: async (s) => {
    await focusAndPlay(s);
    await hold(s, 'KeyW', 300);
    const v = await view(s.frame);
    return { ok: v.state === 'FREE_ROAM_ALLEY' && v.ended === 'pending', detail: `${v.state} ended=${JSON.stringify(v.ended)}` };
  },
  dragOrbits: async (s) => {
    await focusAndPlay(s);
    const y0 = (await view(s.frame)).yaw;
    await drag(s, 200);
    const y1 = (await view(s.frame)).yaw;
    return { ok: Math.abs(y1 - y0 + 200 * SENS) < 0.05, detail: `yaw ${y0.toFixed(3)} → ${y1.toFixed(3)} (want Δ ${(-200 * SENS).toFixed(3)})` };
  },
};

// ---------------------------------------------------------------- main run
let url;
try { url = await startServer(ROOT, PORT); } catch (e) { await refuse(e.message); }
const s = await openHost(url);
if (!s.frame) await refuse(`the world did not boot inside the sandboxed frame: ${s.errors.join(' | ')}`);
const served = await s.frame.evaluate(() => window.__echo.BUILD);
console.log(`build expected=${expected} (echo/game/app.js on disk) served=${served} (read in the frame) port=${PORT}`);
if (served !== expected) await refuse('BUILD MISMATCH — the served frame is not the build on disk');
// Positive control for the error check: an error raised inside the frame must reach `errors`.
await s.frame.evaluate(() => console.error('positive-control: frame console error'));
await sleep(200);
const controlSeen = s.errors.some((e) => e.includes('positive-control'));
s.errors.length = 0;
if (!controlSeen) await refuse('a console error raised inside the frame did not reach the harness (the no-errors check would measure nothing)');

const sandboxAttr = await s.page.$eval('iframe', (f) => `${f.getAttribute('sandbox')}|${f.getAttribute('allow')}`);
let v = await view(s.frame);
check('frame is sandbox="allow-scripts" with no allow, origin null', sandboxAttr === 'allow-scripts|null' && v.origin === 'null', `${sandboxAttr} origin=${v.origin}`);

// Video of the whole main run: CDP screencast of the top-level page (the frame is inside it).
const frames = path.join(OUT, 'frames');
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames);
let nFrames = 0;
const cdp = await s.page.createCDPSession();
cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
  fs.writeFileSync(path.join(frames, `f${String(nFrames++).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
const t0 = Date.now();
const shot = async (name) => { await sleep(150); await s.page.screenshot({ path: path.join(OUT, `${name}.png`) }); };
const locks = [];
const sample = async (step) => { const x = await view(s.frame); locks.push([step, x.lock]); return x; };

v = await sample('start');
await shot('01-unfocused-overlay');
check('starts unfocused with the focus overlay covering the frame', !v.hasFocus && v.overlay, `hasFocus=${v.hasFocus} overlay=${v.overlay}`);
await hold(s, 'KeyW', 400);
await s.page.keyboard.press('Enter');
await s.page.keyboard.press('KeyE');
await sleep(200);
v = await sample('keys-before-focus');
check('keys before the first click do nothing (state TITLE, overlay still up)', v.state === 'TITLE' && v.overlay && !v.hasFocus, `${v.state} overlay=${v.overlay}`);

await clickFrame(s, s.box.width / 2, s.box.height - 40);
v = await sample('first-click');
check('a click on the overlay focuses the frame and removes the overlay', v.hasFocus && !v.overlay, `hasFocus=${v.hasFocus} overlay=${v.overlay}`);
await shot('02-focused-title');
await clickEl(s, '#play');
await sleep(300);
v = await sample('play');
check('PLAY (real click) → FREE_ROAM_ALLEY', v.state === 'FREE_ROAM_ALLEY', v.state);
check('startGame().ended is pending after PLAY', v.ended === 'pending', JSON.stringify(v.ended));

let a = v;
await hold(s, 'KeyW', 700);
v = await sample('wasd');
check('W moves the player forward (−z)', a.player.z - v.player.z > 1.0, `z ${a.player.z.toFixed(2)} → ${v.player.z.toFixed(2)}`);
a = v;
await hold(s, 'KeyD', 400);
v = await sample('strafe');
check('D strafes the player right (+x at yaw 0)', v.player.x - a.player.x > 0.4, `x ${a.player.x.toFixed(2)} → ${v.player.x.toFixed(2)}`);
await shot('03-moved');

a = v;
await drag(s, 200);
v = await sample('drag');
check('mouse drag (+200 px, left button) orbits the camera', Math.abs(v.yaw - a.yaw + 200 * SENS) < 0.05, `yaw ${a.yaw.toFixed(3)} → ${v.yaw.toFixed(3)}`);
a = v;
await s.page.mouse.move(s.box.x + 300, s.box.y + 300);
await s.page.mouse.down({ button: 'right' });
await s.page.mouse.move(s.box.x + 200, s.box.y + 300, { steps: 5 });
await s.page.mouse.up({ button: 'right' });
await sleep(200);
v = await sample('drag-right');
check('right-button drag (−100 px) orbits too', Math.abs(v.yaw - a.yaw - 100 * SENS) < 0.05, `yaw ${a.yaw.toFixed(3)} → ${v.yaw.toFixed(3)}`);
await shot('04-dragged');
a = v;
await s.page.mouse.move(s.box.x + 500, s.box.y + 300, { steps: 5 });
await sleep(150);
v = await sample('hover');
check('moving the mouse with no button held does not orbit', Math.abs(v.yaw - a.yaw) < 1e-9, `yaw ${a.yaw.toFixed(3)} → ${v.yaw.toFixed(3)}`);
a = v;
await hold(s, 'ArrowLeft', 500);
v = await sample('arrow-left');
check('← orbits the camera (yaw increases ~0.78 rad / 0.5 s)', v.yaw - a.yaw > 0.5, `yaw ${a.yaw.toFixed(3)} → ${v.yaw.toFixed(3)}`);
a = v;
await hold(s, 'ArrowRight', 500);
v = await sample('arrow-right');
check('→ orbits back', a.yaw - v.yaw > 0.5, `yaw ${a.yaw.toFixed(3)} → ${v.yaw.toFixed(3)}`);

// Walk to the booth with the keyboard only and press E.
await walkTo(s, 1.5, -6);
await walkTo(s, 2.6, -11.5);
await walkTo(s, 3.6, -11.5, 0.2);
for (let i = 0; i < 3 && (await view(s.frame)).focus !== 'copy_booth'; i++) {
  const { player } = await view(s.frame);
  await turnTo(s, Math.atan2(-(3.9 - player.x), -(-11.5 - player.z)));
  await hold(s, 'KeyW', 70);
}
v = await sample('at-booth');
check('the booth prompt shows when near and facing it', v.focus === 'copy_booth', JSON.stringify(v.player));
await shot('05-booth-prompt');
await s.page.keyboard.press('KeyE');
await sleep(300);
v = await sample('e-booth');
check('E at the booth → CLONE_INTRO (terminal open)', v.state === 'CLONE_INTRO', v.state);
check('startGame().ended still pending mid-game', v.ended === 'pending', JSON.stringify(v.ended));
await shot('06-booth-open');
await clickEl(s, '#term-close');
await sleep(200);

// Blur with S held (walking back from the booth): focus leaves the frame mid-stride; the keyup lands
// on the host, not the frame — the case where a key would stick.
const dist = (p, q) => Math.hypot(p.player.x - q.player.x, p.player.z - q.player.z);
a = await view(s.frame);
await s.page.keyboard.down('KeyS');
await sleep(400);
const midStride = await view(s.frame);
await s.page.mouse.click(120, 400); // the host's textarea, outside the frame
await sleep(250);
const atBlur = await sample('blur');
await s.page.keyboard.up('KeyS');
await shot('07-blurred-overlay');
check('S held moved the player before the blur', dist(a, midStride) > 0.3, `moved ${dist(a, midStride).toFixed(2)} m`);
check('blur → the frame loses focus and the overlay is back', !atBlur.hasFocus && atBlur.overlay, `hasFocus=${atBlur.hasFocus} overlay=${atBlur.overlay}`);
await hold(s, 'KeyW', 500);
await sleep(300);
v = await sample('blurred-keys');
check('nothing moves while unfocused (W pressed again on the host)', dist(v, atBlur) < 0.05, `moved ${dist(v, atBlur).toFixed(3)} m`);
await clickFrame(s, s.box.width / 2, s.box.height - 40);
a = await sample('refocus');
check('re-click → focus back, overlay gone, not paused', a.hasFocus && !a.overlay && !a.paused, `hasFocus=${a.hasFocus} overlay=${a.overlay} paused=${a.paused}`);
await sleep(700);
v = await view(s.frame);
check('no key stuck after the re-click (no input → no movement)', dist(v, a) < 0.02 && v.player.speed < 0.01, `moved ${dist(v, a).toFixed(3)} m, speed ${v.player.speed.toFixed(3)}`);
await hold(s, 'KeyS', 500);
v = await sample('resumed');
check('control resumes after the re-click (S moves the player)', dist(v, a) > 0.5, `moved ${dist(v, a).toFixed(2)} m`);
await shot('08-refocused');

await s.page.keyboard.press('Escape');
await sleep(300);
v = await sample('esc');
check('Esc pauses (pause menu shown)', v.paused && v.pause, `paused=${v.paused} menu=${v.pause}`);
a = v;
await hold(s, 'KeyW', 400);
v = await view(s.frame);
check('no movement while paused', dist(v, a) < 1e-6);
await shot('09-paused');
await clickEl(s, '#resume');
v = await sample('resume');
check('Resume (real click) unpauses', !v.paused && !v.pause);

// Shortcut, said plainly: the quest is walked from here to ENDING by the dev engine and the rightful
// event sources (as world-playthrough.mjs's sabotage helper does), not by walking the city again —
// the full walk is world-playthrough.mjs's job. Credits is then a real click.
await s.frame.evaluate(async () => {
  const { randomGenericState, makeCorrectionRequest } = await import(new URL('/echo/contracts.js', location.href).href);
  const q = window.__echo.quest;
  const e = window.__engine;
  await q.experiment(() => e.cloneTest('zero'));
  await q.experiment(() => e.cloneTest('plus'));
  q.resultPanelShown();
  q.send('EXPLANATION_READ', 'terminal_acknowledgement');
  q.send('EXIT_BOOTH', 'world_trigger');
  q.send('REACH_RELAY', 'interactable');
  await q.experiment(() => e.bellSignalling('I'));
  await q.experiment(() => e.bellSignalling('X'));
  q.resultPanelShown();
  q.send('VIEW_RECEIVER_MARGINAL', 'terminal_acknowledgement');
  q.send('OPEN_ROOFTOP', 'world_trigger');
  q.send('REPAIR_CLASSICAL_LINK', 'interactable');
  q.send('RUN_DRY_TEST', 'interactable');
  for (let i = 0; i < 20 && q.state === 'TELEPORT_DRY_RUN'; i++) {
    const req = randomGenericState();
    const bits = await e.teleportBits(req);
    const { m0, m1 } = bits.measurementBits;
    const corr = makeCorrectionRequest(req, bits, { applyX: m1 === 1, applyZ: m0 === 1 });
    await q.experiment(() => e.teleportCorrection(corr), corr);
  }
  await q.commitTransfer(() => e.commitStoryToken());
});
await s.frame.waitForFunction(() => window.__echo.debug.state === 'ENDING', { timeout: 12000 }).catch(() => {});
v = await sample('ending');
check('quest reaches ENDING (dev-engine shortcut)', v.state === 'ENDING', v.state);
check('startGame().ended still pending at ENDING', v.ended === 'pending', JSON.stringify(v.ended));
await shot('10-ending');
await clickEl(s, '#end-credits');
await sleep(300);
v = await sample('credits');
check('Credits (real click) → CREDITS', v.state === 'CREDITS', v.state);
check('startGame().ended resolves at CREDITS with reason "credits"', v.ended?.reason === 'credits' && v.ended?.state === 'CREDITS', JSON.stringify(v.ended));
await shot('11-credits');

await cdp.send('Page.stopScreencast');
const secs = (Date.now() - t0) / 1000;
await sleep(300);
try {
  const fr = Math.max(1, nFrames / secs).toFixed(2);
  execSync(`ffmpeg -loglevel error -y -framerate ${fr} -i ${frames}/f%05d.jpg -c:v libx264 -pix_fmt yuv420p -vf scale=1280:-2 ${path.join(OUT, 'qollab-frame-run.mp4')}`);
  execSync(`ffmpeg -loglevel error -y -framerate ${fr} -i ${frames}/f%05d.jpg -c:v libvpx-vp9 -b:v 1M -vf scale=1280:-2 ${path.join(OUT, 'qollab-frame-run.webm')}`);
  console.log(`video: ${nFrames} frames over ${secs.toFixed(1)} s → qollab-frame-run.mp4/.webm`);
} catch (e) { check('video encoded', false, e.message); }
fs.rmSync(frames, { recursive: true, force: true });

const held = locks.filter(([, l]) => l !== null);
check(`document.pointerLockElement null at all ${locks.length} sampled steps`, locks.length >= 15 && held.length === 0, held.map(([st, l]) => `${st}:${l}`).join(' '));
check('no uncaught errors or console errors (host + frame)', s.errors.length === 0, s.errors.slice(0, 3).join(' | '));
await s.page.close();

// ---------------------------------------------------------------- sabotage on disposable copies
const SABOTAGES = [
  { name: 'overlay never shown', file: 'echo/game/input.js', from: 'overlay.hidden = focused;', to: 'overlay.hidden = true;', check: 'overlayAtStart' },
  { name: 'pointer lock made mandatory', file: 'echo/game/app.js', from: '!terminalOpen && !paused && input.focused;', to: '!terminalOpen && !paused && input.focused && input.locked;', check: 'wasdAfterClick' },
  { name: 'ended resolves immediately', file: 'echo/game/app.js', from: 'const ended = new Promise((resolve) => { finish = resolve; });', to: 'const ended = Promise.resolve({ reason: "sabotage" }); finish = () => {};', check: 'endedPendingMidGame' },
  { name: 'drag orbit removed', file: 'echo/game/input.js', from: 'if (document.pointerLockElement === canvas || dragging) {', to: 'if (document.pointerLockElement === canvas) {', check: 'dragOrbits' },
];
if (FALSIFY) {
  let port = PORT + 1;
  for (const sab of SABOTAGES) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'echo-qf-sabotage-'));
    for (const d of ['echo', 'dev', 'tools/contract-check']) fs.cpSync(path.join(ROOT, d), path.join(dir, d), { recursive: true });
    const f = path.join(dir, sab.file);
    const src = fs.readFileSync(f, 'utf8');
    if (!src.includes(sab.from)) await refuse(`sabotage "${sab.name}": the text to break is not in ${sab.file} (the gate would be measuring nothing)`);
    const run = async () => {
      const u = await startServer(dir, port++);
      const sess = await openHost(u);
      const r = sess.frame ? await CHECKS[sab.check](sess).catch((e) => ({ ok: false, detail: String(e) })) : { ok: false, detail: `no boot: ${sess.errors[0] ?? ''}` };
      await sess.page.close();
      return r;
    };
    const c = await run(); // control first: the unbroken copy must pass, or a red proves nothing
    fs.writeFileSync(f, src.replace(sab.from, sab.to));
    const r = await run();
    check(`control (copy, unbroken): ${sab.check} passes`, c.ok, c.detail);
    check(`SABOTAGE ${sab.name} → ${sab.check} goes red`, !r.ok, r.detail);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ build: served, port: PORT, sandbox: sandboxAttr, locks, results }, null, 2));
await cleanup();
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
