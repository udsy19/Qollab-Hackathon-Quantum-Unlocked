// Headless playthrough of the gameplay harness through REAL input (keyboard + mouse drag), with
// screenshots. Usage: node dev/gameplay/world-playthrough.mjs [outDir]   (server must be on :8612)
// Default outDir is a scratch dir; --publish (only after a fully green run) copies the record to
// PUBLISH_DIR, replacing what was there — a deliberate act, never a side effect of grading.
// Provenance: the expected BUILD token is read from echo/game/app.js bytes on disk, the served one from
// the page; a mismatch aborts (exit 2). Exit 0 = every check passed, 1 = a check failed.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(path.join(execSync('npm root -g').toString().trim(), '@modelcontextprotocol/server-puppeteer/'));
const puppeteer = require('puppeteer');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) ?? path.join(process.env.TMPDIR ?? '/tmp', 'echo-playthrough'));
const URL_ = 'http://127.0.0.1:8612/dev/gameplay/world.html';
fs.mkdirSync(OUT, { recursive: true });
const expected = /BUILD = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'echo/game/app.js'), 'utf8'))[1];

const PUBLISH_DIR = path.join(ROOT, 'evidence/gameplay/world-controller');
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1280,720'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
await page.setCacheEnabled(false);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL_, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__echo, { timeout: 20000 });

const served = await page.evaluate(() => window.__echo.BUILD);
const gl = await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('webgl2');
  const ext = c?.getExtension('WEBGL_debug_renderer_info');
  return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
console.log(`build expected=${expected} served=${served} renderer=${gl}`);
if (served !== expected) { console.error('BUILD MISMATCH — refusing to grade'); await browser.close(); process.exit(2); }

const dbg = () => page.evaluate(() => { const d = window.__echo.debug; return { state: d.state, player: d.player, focus: d.focus, camera: d.camera, doors: d.doors() }; });
const shot = async (name) => { await sleep(120); await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };
const promptVisible = () => page.evaluate(() => !document.getElementById('prompt').hidden);
const SENS = 0.0026;
// --falsify: after each check, break the mechanism it checks in this (disposable) page and require the
// check to flip; then restore. A sabotage that does not flip the check is a FAIL.
const FALSIFY = process.argv.includes('--falsify');
const setCollider = (id, enabled) => page.evaluate((i, e) => { for (const c of window.__echo.debug.colliders) if (c.id === i) c.enabled = e; }, id, enabled);

// Turn with the arrow keys (keyboard camera, 600 px-equivalent/s): the mouse is checked separately,
// because under pointer lock a synthetic cursor jump back to centre would count as a turn.
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
async function pushInto(yaw, ms) {
  await turnTo(yaw);
  await page.keyboard.down('KeyW');
  await sleep(ms);
  await page.keyboard.up('KeyW');
  await sleep(200);
  return (await dbg()).player;
}
// Drive gameplay-quest-core's dev terminal by its button text, waiting for each fake-quantum call.
async function tbtn(text, expectState) {
  const ok = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('#term-host button')].find((x) => x.textContent.trim() === t && !x.disabled);
    if (b) b.click();
    return Boolean(b);
  }, text);
  if (!ok) throw new Error(`no enabled terminal button "${text}" in ${(await dbg()).state}`);
  await page.waitForFunction(() => ![...document.querySelectorAll('#term-host .dt-actions button')].some((b) => b.disabled), { timeout: 5000 });
  await sleep(50);
  const st = (await dbg()).state;
  if (expectState) check(`terminal "${text}" → ${expectState}`, st === expectState, st);
}
async function calibrate() {
  await tbtn('Bell-measure a calibration qubit');
  await page.evaluate(() => {
    const m = document.querySelector('#term-host .dt-actions span').textContent.match(/m0=(\d) m1=(\d)/);
    document.getElementById('dt-x').checked = m[2] === '1'; // X iff m1 = 1
    document.getElementById('dt-z').checked = m[1] === '1'; // Z iff m0 = 1
  });
  await tbtn('Apply & verify', 'TELEPORT_DRY_RUN_PASSED');
}
async function closeTerminal() { await page.click('#term-close'); await sleep(150); }
async function pressE() { await page.keyboard.press('KeyE'); await sleep(250); }

// --- Title
await shot('01-title');
check('title shown at TITLE', (await dbg()).state === 'TITLE');
await page.click('#play');
await sleep(400);
check('PLAY → FREE_ROAM_ALLEY', (await dbg()).state === 'FREE_ROAM_ALLEY');
await shot('02-alley-start');
{
  const y0 = (await dbg()).camera.yaw;
  await page.mouse.move(640, 600);
  await page.mouse.down();
  for (let k = 1; k <= 5; k++) await page.mouse.move(640 + 40 * k, 600);
  await page.mouse.up();
  await sleep(150);
  const y1 = (await dbg()).camera.yaw;
  check('mouse drag (+200 px) orbits the camera', Math.abs(y1 - y0 + 200 * SENS) < 0.05, `yaw ${y0.toFixed(2)} → ${y1.toFixed(2)}`);
  await turnTo(0);
}

// --- Walk to the booth, recording a frame sequence
const frames = path.join(OUT, 'walk-frames');
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames);
// CDP screencast of the walk (frames written as they arrive; stitched to walk.mp4 with ffmpeg).
const cdp = await page.createCDPSession();
let nFrames = 0;
cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
  fs.writeFileSync(path.join(frames, `f${String(nFrames++).padStart(4, '0')}.jpg`), Buffer.from(data, 'base64'));
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
const walkStart = Date.now();
await walkTo(1.5, -6, { sprint: true });
await walkTo(2.6, -11.5);
await walkTo(3.6, -11.5, { tol: 0.2 });
await sleep(600);
await cdp.send('Page.stopScreencast');
const walkSecs = (Date.now() - walkStart) / 1000;
await sleep(200);
try {
  execSync(`ffmpeg -loglevel error -y -framerate ${Math.max(1, nFrames / walkSecs).toFixed(2)} -i ${frames}/f%04d.jpg -c:v libx264 -pix_fmt yuv420p -vf scale=1280:-2 ${path.join(OUT, 'walk.mp4')}`);
  console.log(`walk video: ${nFrames} frames over ${walkSecs.toFixed(1)} s → walk.mp4`);
} catch (e) { console.log(`walk video FAILED: ${e.message}`); }
let s = await dbg();
check('prompt at booth when near + facing', s.focus === 'copy_booth' && await promptVisible(), JSON.stringify(s.player));
await shot('03-booth-prompt');

// --- No prompt through the pylon (within range, facing the console, wall in between)
await walkTo(0.6, -14.6);
await walkTo(2.2, -13.0, { tol: 0.15 });
s = await dbg();
const dAnchor = Math.hypot(3.9 - s.player.x, -11.5 - s.player.z);
check('no prompt behind pylon (in range, facing)', s.focus === null && !(await promptVisible()), `dist=${dAnchor.toFixed(2)} heading=${s.player.heading.toFixed(2)}`);
await shot('04-no-prompt-behind-pylon');
if (FALSIFY) {
  await setCollider('booth_pylon', false);
  await sleep(150);
  const f = await dbg();
  check('SABOTAGE pylon collider off → same spot now prompts', f.focus === 'copy_booth', `focus=${f.focus}`);
  await setCollider('booth_pylon', true);
  await sleep(150);
  check('restore pylon → no prompt again', (await dbg()).focus === null);
}

// --- Door A blocks before the clone mission
await walkTo(0, -22);
let p = await pushInto(0, 1500);
check('door A blocks before CLONE_UNDERSTOOD', p.z > -26.0, `z=${p.z.toFixed(2)}`);
await shot('05-door-closed');
if (FALSIFY) {
  await setCollider('door_alley', false);
  const q = await pushInto(0, 900);
  check('SABOTAGE door A collider off → player passes the door line', q.z < -26.3, `z=${q.z.toFixed(2)}`);
  // Walkable guard: with EVERY collider off, the player still cannot leave the floor rects.
  await page.evaluate(() => { window.__saved = window.__echo.debug.colliders.map((c) => c.enabled); window.__echo.debug.colliders.forEach((c) => { c.enabled = false; }); });
  const w = await pushInto(Math.PI / 2, 2500); // face -X, toward the west alley wall at x=-6
  check('all colliders off → walkable guard still holds the map edge', w.x >= -6.01 || (w.z < -26 && w.x >= -2.51), `x=${w.x.toFixed(2)} z=${w.z.toFixed(2)}`);
  await walkTo(0, -22);
  await page.evaluate(() => window.__echo.debug.colliders.forEach((c, i) => { c.enabled = window.__saved[i]; }));
}

// --- Clone mission through the stub terminal
await walkTo(2.6, -11.5);
await walkTo(3.6, -11.5, { tol: 0.2 });
await pressE();
check('E opens booth terminal, quest → CLONE_INTRO', (await dbg()).state === 'CLONE_INTRO');
await shot('06-booth-terminal');
await tbtn('Duplicate zero', 'CLONE_BASIS_PASSED');
await tbtn('Duplicate plus', 'CLONE_SUPERPOSITION_FAILED');
await tbtn('Read the scan', 'CLONE_UNDERSTOOD');
await closeTerminal();
check('clone mission → CLONE_UNDERSTOOD', (await dbg()).state === 'CLONE_UNDERSTOOD');
await walkTo(0, -18);
await turnTo(0);
await sleep(1100);
s = await dbg();
check('door A open after CLONE_UNDERSTOOD', s.doors.find((d) => d.id === 'door_alley').t === 1);
await shot('07-door-open');

// --- Connector → relay; door B blocks
await walkTo(0, -30);
await walkTo(0, -40, { sprint: true });
check('EXIT_BOOTH trigger → RELAY_UNLOCKED', (await dbg()).state === 'RELAY_UNLOCKED');
await walkTo(5, -44);
await walkTo(7.5, -50);
p = await pushInto(-Math.PI / 2, 1500);
check('door B blocks before RELAY_UNDERSTOOD', p.x < 9.2, `x=${p.x.toFixed(2)}`);
await walkTo(3, -45);
await walkTo(0, -47.5, { tol: 0.2 });
s = await dbg();
check('prompt at relay core', s.focus === 'relay_core' && await promptVisible(), JSON.stringify(s.player));
await shot('08-relay-prompt');
await pressE();
await tbtn('Sender I', 'RELAY_BELL_CREATED');
await closeTerminal();
await walkTo(3, -44);
await turnTo(Math.atan2(-(-4 - 3), -(-50 + 44)));
await shot('09-relay-conduit-lit');
await walkTo(0, -47.5, { tol: 0.2 });
await pressE();
await tbtn('Sender X', 'RELAY_SEND_FAILED');
await tbtn('Read receiver panel', 'RELAY_UNDERSTOOD');
await closeTerminal();
check('relay mission → RELAY_UNDERSTOOD', (await dbg()).state === 'RELAY_UNDERSTOOD');
await walkTo(2.5, -46);
await turnTo(Math.atan2(-(9 - 2.5), -(-50 + 46)));
await sleep(1100);
await shot('10-relay-door-open');

// --- Elevator → rooftop
await walkTo(13, -50);
check('OPEN_ROOFTOP trigger → ROOFTOP_UNLOCKED', (await dbg()).state === 'ROOFTOP_UNLOCKED');
await walkTo(20, -50);
await walkTo(21.5, -55);
await walkTo(21.5, -56.9, { tol: 0.15 });
s = await dbg();
check('prompt at classical socket', s.focus === 'classical_socket' && await promptVisible());
await shot('11-socket-prompt');
await pressE();
await closeTerminal();
check('socket → LINK_REPAIRED', (await dbg()).state === 'LINK_REPAIRED');
await walkTo(24, -52);
await turnTo(Math.atan2(-(62 - 24), -(-78 + 52)));
await sleep(600);
await shot('12-fiber-to-skyline');

// --- Teleport terminal, commit, city reaction
await walkTo(30, -47);
await walkTo(30, -44.2, { tol: 0.15 });
s = await dbg();
check('prompt at teleport terminal', s.focus === 'teleport_terminal');
await pressE();
check('E at terminal → TELEPORT_DRY_RUN', (await dbg()).state === 'TELEPORT_DRY_RUN');
await calibrate();
await tbtn('COMMIT TRANSFER (story token, once)');
check('commit → TELEPORT_COMMITTED', (await dbg()).state === 'TELEPORT_COMMITTED');
await sleep(300);
await shot('13-commit-wave-start');
await sleep(2500);
await shot('14-commit-city-lit');
await page.waitForFunction(() => window.__echo.debug.state === 'ENDING', { timeout: 8000 });
await shot('15-ending');

// --- RESTART via credits (a quest transition, not quest:reset) must also reset the world
await page.click('#end-credits');
await sleep(200);
await shot('16a-credits');
await page.click('#credits-restart');
await sleep(400);
s = await dbg();
check('Credits → RESTART → TITLE, player at spawn, doors closed', s.state === 'TITLE' && Math.abs(s.player.z - 2) < 0.01 && s.doors.every((d) => !d.open && d.t === 0), JSON.stringify(s.player));
await shot('16-restart-title');
await page.click('#play');
await sleep(400);
await walkTo(0, -3);
await page.keyboard.press('Escape');
await sleep(300);
check('Esc pauses', await page.evaluate(() => window.__echo.paused && !document.getElementById('pause').hidden));
await shot('17-paused');
p = (await dbg()).player;
await page.keyboard.down('KeyW'); await sleep(500); await page.keyboard.up('KeyW');
check('no movement while paused', Math.abs((await dbg()).player.z - p.z) < 1e-6);
await page.click('#resume');
await sleep(200);
check('Resume unpauses', !(await page.evaluate(() => window.__echo.paused)));
// Restart from the pause menu (game.reset → quest:reset).
await walkTo(0, -6);
await page.keyboard.press('Escape');
await sleep(300);
await page.click('#restart');
await sleep(400);
s = await dbg();
check('Pause → Restart → TITLE, player at spawn', s.state === 'TITLE' && Math.abs(s.player.z - 2) < 0.01 && s.camera.yaw === 0, JSON.stringify(s.player));
await page.click('#play');
await sleep(300);

// FPS over a 3 s idle in the alley.
await sleep(3000);
const readout = await page.evaluate(() => document.getElementById('readout').textContent);
console.log(`readout: ${readout.replace(/\n/g, ' | ')}`);
await shot('18-fps-readout');

console.log(`page errors: ${errors.length}`);
errors.forEach((e) => console.log(`  ${e}`));
check('no page errors', errors.length === 0);
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ build: served, renderer: gl, readout, results, errors }, null, 2));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} checks passed`);
if (process.argv.includes('--publish')) {
  if (failed) console.log('not publishing: run was not green');
  else {
    fs.rmSync(PUBLISH_DIR, { recursive: true, force: true });
    fs.mkdirSync(PUBLISH_DIR, { recursive: true });
    for (const f of fs.readdirSync(OUT)) if (/\.(png|mp4|json)$/.test(f)) fs.copyFileSync(path.join(OUT, f), path.join(PUBLISH_DIR, f));
    console.log(`published → ${PUBLISH_DIR}`);
  }
}
process.exit(failed ? 1 : 0);
