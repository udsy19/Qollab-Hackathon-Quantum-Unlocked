// Headless playthrough of the 3D gameplay harness through REAL input (keyboard + mouse drag), with
// screenshots: title → three missions → a visibly wrong dry run → commit → city lit → ending →
// RESTART → title, then a second full run after the reset, ending through the credits.
//
//   node dev/gameplay/world-playthrough.mjs [outDir] [--port 8647] [--falsify] [--publish]
//
// The script starts its own server (dev/gameplay/dev_engine.py: the worktree root + the real-Qiskit
// dev engine) on --port, never a shared one. Default outDir is a scratch dir; --publish (only after a
// fully green run) copies the record to PUBLISH_DIR — a deliberate act, never a side effect of grading.
// Provenance (law 16): the expected BUILD token is read from echo/game/app.js bytes on disk, the served
// one from the page; a mismatch aborts (exit 2).
// --falsify: in-page collider sabotage, plus three sabotages on DISPOSABLE COPIES of the tree (law 10),
// each served by its own server: a WORLD_CHANGES id renamed in the subscriber, the RESTART/reset
// handler removed, and the EVENT_SOURCES gate removed. Each must turn its check red.
// Exit 0 = every check passed, 1 = a check failed, 2 = could not grade.
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(path.join(execSync('npm root -g').toString().trim(), '@modelcontextprotocol/server-puppeteer/'));
const puppeteer = require('puppeteer');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const PORT = Number(opt('--port', 8647));
const OUT = path.resolve(argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--port') ?? path.join(process.env.TMPDIR ?? '/tmp', 'echo-v2-playthrough'));
const PUBLISH_DIR = path.join(ROOT, 'evidence/gameplay/world-v2-port');
const FALSIFY = flag('--falsify');
fs.mkdirSync(OUT, { recursive: true });
const expected = /BUILD = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'echo/game/app.js'), 'utf8'))[1];

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const refuse = async (why) => { console.error(`REFUSED: ${why}`); await cleanup(); process.exit(2); };

// ---------------------------------------------------------------- servers (own port, own process)
const servers = [];
// A crash must not leave a server holding the port for the next run.
process.on('exit', () => servers.forEach((s) => s.kill()));
process.on('uncaughtException', (e) => { console.error(e); servers.forEach((s) => s.kill()); process.exit(2); });
process.on('unhandledRejection', (e) => { console.error(e); servers.forEach((s) => s.kill()); process.exit(2); });
async function startServer(root, port) {
  const proc = spawn('python3', [path.join(root, 'dev/gameplay/dev_engine.py'), String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
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
let browser;
async function cleanup() { await browser?.close().catch(() => {}); servers.forEach((s) => s.kill()); }

browser = await puppeteer.launch({
  headless: 'new',
  executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1280,720'],
});

async function openPage(url, errors) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.setCacheEnabled(false);
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle0' });
  return page;
}

let URL_;
try { URL_ = await startServer(ROOT, PORT); } catch (e) { await refuse(e.message); }
const errors = [];
const page = await openPage(URL_, errors);
try { await page.waitForFunction(() => window.__echo, { timeout: 20000 }); } catch { await refuse(`the game did not boot: ${errors.join(' | ')}`); }

const served = await page.evaluate(() => window.__echo.BUILD);
const gl = await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('webgl2');
  const ext = c?.getExtension('WEBGL_debug_renderer_info');
  return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
console.log(`build expected=${expected} (echo/game/app.js on disk) served=${served} port=${PORT} renderer=${gl}`);
if (served !== expected) await refuse('BUILD MISMATCH — the served page is not the build on disk');

// ---------------------------------------------------------------- input helpers (real keyboard/mouse)
const dbg = (pg = page) => pg.evaluate(() => {
  const d = window.__echo.debug;
  return { state: d.state, player: d.player, focus: d.focus, camera: d.camera, doors: d.doors(), changes: d.changes() };
});
const shot = async (name) => { await sleep(120); await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };
const promptVisible = () => page.evaluate(() => !document.getElementById('prompt').hidden);
const SENS = 0.0026;
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
// Stand at (x, z) and face the device at (ax, az) the way a player does: a short step toward it.
async function approach(x, z, ax, az, id) {
  await walkTo(x, z, { tol: 0.2 });
  for (let i = 0; i < 3 && (await dbg()).focus !== id; i++) {
    const { player } = await dbg();
    await turnTo(Math.atan2(-(ax - player.x), -(az - player.z)));
    await page.keyboard.down('KeyW'); await sleep(70); await page.keyboard.up('KeyW');
    await sleep(250);
  }
  return dbg();
}
async function pushInto(yaw, ms) {
  await turnTo(yaw);
  await page.keyboard.down('KeyW');
  await sleep(ms);
  await page.keyboard.up('KeyW');
  await sleep(200);
  return (await dbg()).player;
}
// Click a dev-terminal button by its text, then wait for the engine call.
const termNote = () => page.evaluate(() => document.querySelector('#term-host .dt-note')?.textContent ?? '');
async function tbtn(text, expectState) {
  const ok = await page.evaluate((t) => [...document.querySelectorAll('#term-host button')].some((x) => x.textContent.trim() === t && !x.disabled), text);
  if (!ok) throw new Error(`no enabled terminal button "${text}" in ${(await dbg()).state}`);
  // Terminal buttons are clicked with element.click() (an untrusted DOM click, not the mouse): in one
  // run a mouse click at the button's box did nothing once the panel re-centred. The dev terminal is
  // not the product UI; movement, E, Esc and the menus use real keyboard and mouse input.
  // The note must change, so a click that did nothing fails loudly.
  const before = await termNote();
  await page.evaluate((t) => [...document.querySelectorAll('#term-host button')].find((x) => x.textContent.trim() === t && !x.disabled).click(), text);
  if ((await termNote()) === before && !/show result panel/.test(text)) throw new Error(`terminal button "${text}" did nothing (note unchanged: ${before})`);
  await page.waitForFunction(() => !(document.querySelector('#term-host .dt-note')?.textContent ?? '').endsWith('…'), { timeout: 15000 });
  await sleep(60);
  const st = (await dbg()).state;
  if (expectState) check(`terminal "${text}" → ${expectState}`, st === expectState, st);
  return st;
}
const bitsOnScreen = async () => {
  const t = await page.evaluate(() => document.querySelector('#term-host .dt-bits')?.textContent ?? '');
  const m = /SOURCE READOUT m0 = (\d) · LOCAL BELL-HALF READOUT m1 = (\d)/.exec(t);
  if (!m) throw new Error(`bits not on screen: "${t}" — note: ${await termNote()} — state ${(await dbg()).state}`);
  return { m0: Number(m[1]), m1: Number(m[2]) };
};
const choiceFor = (applyX, applyZ) => `Apply ${applyX && applyZ ? 'X then Z' : applyX ? 'X' : applyZ ? 'Z' : 'no correction'}`;
async function closeTerminal() { await page.click('#term-close'); await sleep(150); }
async function pressE() { await page.keyboard.press('KeyE'); await sleep(250); }
const lastResult = () => page.evaluate(() => JSON.parse(document.querySelector('#term-host .dt-result')?.textContent || 'null'));

// ---------------------------------------------------------------- one full run, start to ENDING
async function fullRun(run) {
  const first = run === 1;
  const tag = (n) => `r${run}-${n}`;
  if (first) await shot('01-title');
  check(`run ${run}: title shown at TITLE`, (await dbg()).state === 'TITLE' && await page.evaluate(() => !document.getElementById('title').hidden));
  await page.click('#play');
  await sleep(400);
  check(`run ${run}: PLAY → FREE_ROAM_ALLEY`, (await dbg()).state === 'FREE_ROAM_ALLEY');
  if (first) {
    await shot('02-alley-start');
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

  // Walk to the booth; run 1 records it as walk.mp4 (CDP screencast, stitched with ffmpeg).
  let cdp; let nFrames = 0; let walkStart = 0;
  const frames = path.join(OUT, 'walk-frames');
  if (first) {
    fs.rmSync(frames, { recursive: true, force: true });
    fs.mkdirSync(frames);
    cdp = await page.createCDPSession();
    cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
      fs.writeFileSync(path.join(frames, `f${String(nFrames++).padStart(4, '0')}.jpg`), Buffer.from(data, 'base64'));
      await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
    walkStart = Date.now();
  }
  await walkTo(1.5, -6, { sprint: true });
  await walkTo(2.6, -11.5);
  let s = await approach(3.6, -11.5, 3.9, -11.5, 'copy_booth');
  check(`run ${run}: prompt at booth when near + facing`, s.focus === 'copy_booth' && await promptVisible(), JSON.stringify(s.player));
  if (first) await shot('03-booth-prompt');

  if (first) {
    // No prompt through the pylon (within range, facing the console, wall in between).
    await walkTo(0.6, -14.6);
    await walkTo(2.2, -13.0, { tol: 0.15 });
    s = await dbg();
    const dAnchor = Math.hypot(3.9 - s.player.x, -11.5 - s.player.z);
    check('no prompt behind pylon (in range, facing)', s.focus === null && !(await promptVisible()), `dist=${dAnchor.toFixed(2)} heading=${s.player.heading.toFixed(2)}`);
    if (FALSIFY) {
      await setCollider('booth_pylon', false);
      await sleep(150);
      const f = await dbg();
      check('SABOTAGE pylon collider off → same spot now prompts (check flips)', f.focus === 'copy_booth', `focus=${f.focus}`);
      await setCollider('booth_pylon', true);
      await sleep(150);
      check('restore pylon → no prompt again', (await dbg()).focus === null);
    }
    // Door A blocks before the clone mission.
    await walkTo(0, -22);
    const p = await pushInto(0, 1500);
    check('door A blocks before corridor_door_opens', p.z > -26.0, `z=${p.z.toFixed(2)}`);
    if (FALSIFY) {
      await setCollider('door_alley', false);
      const q = await pushInto(0, 900);
      check('SABOTAGE door A collider off → player passes the door line (check flips)', q.z < -26.3, `z=${q.z.toFixed(2)}`);
      await walkTo(0, -22);
      await setCollider('door_alley', true);
    }
    await walkTo(2.6, -11.5);
    await approach(3.6, -11.5, 3.9, -11.5, 'copy_booth');
  }

  // --- Mission 1: the booth
  await pressE();
  check(`run ${run}: E opens booth terminal, quest → CLONE_INTRO`, (await dbg()).state === 'CLONE_INTRO');
  if (first) {
    await cdp.send('Page.stopScreencast');
    const walkSecs = (Date.now() - walkStart) / 1000;
    await sleep(200);
    try {
      execSync(`ffmpeg -loglevel error -y -framerate ${Math.max(1, nFrames / walkSecs).toFixed(2)} -i ${frames}/f%04d.jpg -c:v libx264 -pix_fmt yuv420p -vf scale=1280:-2 ${path.join(OUT, 'walk.mp4')}`);
      console.log(`walk video: ${nFrames} frames over ${walkSecs.toFixed(1)} s → walk.mp4`);
    } catch (e) { console.log(`walk video FAILED: ${e.message}`); }
  }
  await tbtn('Duplicate zero', 'CLONE_BASIS_PASSED');
  await tbtn('Duplicate plus', 'CLONE_SUPERPOSITION_FAILED');
  const plus = await lastResult();
  check(`run ${run}: |+> copy shows fidelity 0.5 from exact_qiskit_local`, plus?.engine === 'exact_qiskit_local' && Math.abs(plus.fidelity - 0.5) < 1e-9, `${plus?.engine} F=${plus?.fidelity}`);
  check(`run ${run}: EXPLANATION_READ refused before the result panel (ruling 13)`, !(await page.evaluate(() => [...document.querySelectorAll('#term-host button')].find((b) => b.textContent === 'EXPLANATION_READ' && !b.disabled) && window.__echo.quest.can('EXPLANATION_READ', 'terminal_acknowledgement'))));
  await tbtn('story-ui stub: show result panel');
  if (first) await shot('04-booth-result-panel');
  await tbtn('EXPLANATION_READ', 'CLONE_UNDERSTOOD');
  // EVENT_SOURCES: a terminal cannot walk the player out of the booth.
  const viaTerminal = await page.evaluate(() => window.__echo.quest.send('EXIT_BOOTH', 'terminal_acknowledgement'));
  check(`run ${run}: EXIT_BOOTH sent from a terminal is refused (EVENT_SOURCES)`, !viaTerminal.ok && (await dbg()).state === 'CLONE_UNDERSTOOD', viaTerminal.reason);
  check(`run ${run}: no EXIT_BOOTH button in the world terminal`, !(await page.evaluate(() => [...document.querySelectorAll('#term-host button')].some((b) => b.textContent === 'EXIT_BOOTH'))));
  await closeTerminal();
  await walkTo(0, -18);
  await turnTo(0);
  await sleep(1100);
  s = await dbg();
  check(`run ${run}: corridor_door_opens in force and door A open`, s.changes?.includes('corridor_door_opens') && s.doors.find((d) => d.id === 'door_alley').t === 1, JSON.stringify(s.changes));
  if (first) await shot('05-door-open');

  // --- Connector → relay; door B blocks
  await walkTo(0, -30);
  await walkTo(0, -40, { sprint: true });
  check(`run ${run}: EXIT_BOOTH world trigger → RELAY_UNLOCKED`, (await dbg()).state === 'RELAY_UNLOCKED');
  if (first) {
    await walkTo(5, -44);
    await walkTo(7.5, -50);
    const p = await pushInto(-Math.PI / 2, 1500);
    check('door B blocks before rooftop_access_unlocked', p.x < 9.2, `x=${p.x.toFixed(2)}`);
    await walkTo(3, -45);
  }
  s = await approach(0, -47.5, 0, -48.2, 'relay_core');
  check(`run ${run}: prompt at relay core`, s.focus === 'relay_core' && await promptVisible(), JSON.stringify(s.player));
  await pressE();
  await tbtn('Sender I', 'RELAY_BELL_CREATED');
  await closeTerminal();
  await walkTo(3, -44);
  await turnTo(Math.atan2(-(-4 - 3), -(-50 + 44)));
  s = await dbg();
  check(`run ${run}: cyan_conduit_illuminates in force`, s.changes?.includes('cyan_conduit_illuminates'));
  if (first) await shot('06-relay-conduit-lit');
  await approach(0, -47.5, 0, -48.2, 'relay_core');
  await pressE();
  await tbtn('Sender X', 'RELAY_SEND_FAILED');
  const bell = await lastResult();
  check(`run ${run}: receiver marginal after X is exactly 1/2, 1/2 (exact_qiskit_local)`, bell?.engine === 'exact_qiskit_local' && bell.probabilities['0'] === 0.5 && bell.probabilities['1'] === 0.5, JSON.stringify(bell?.probabilities));
  await tbtn('story-ui stub: show result panel');
  if (first) await shot('07-relay-receiver-panel');
  await tbtn('VIEW_RECEIVER_MARGINAL', 'RELAY_UNDERSTOOD');
  await closeTerminal();
  await walkTo(2.5, -46);
  await turnTo(Math.atan2(-(9 - 2.5), -(-50 + 46)));
  await sleep(1100);
  s = await dbg();
  check(`run ${run}: rooftop_access_unlocked in force and door B open`, s.changes?.includes('rooftop_access_unlocked') && s.doors.find((d) => d.id === 'door_relay').t === 1);

  // --- Elevator → rooftop
  const viaInteract = await page.evaluate(() => window.__echo.quest.send('OPEN_ROOFTOP', 'interactable'));
  check(`run ${run}: OPEN_ROOFTOP from an interactable is refused (EVENT_SOURCES)`, !viaInteract.ok && (await dbg()).state === 'RELAY_UNDERSTOOD', viaInteract.reason);
  await walkTo(13, -50);
  check(`run ${run}: OPEN_ROOFTOP world trigger → ROOFTOP_UNLOCKED`, (await dbg()).state === 'ROOFTOP_UNLOCKED');
  await walkTo(20, -50);
  await walkTo(21.5, -55);
  s = await approach(21.5, -56.9, 21.5, -57.3, 'classical_socket');
  check(`run ${run}: prompt at classical socket`, s.focus === 'classical_socket' && await promptVisible());
  await pressE();
  await closeTerminal();
  check(`run ${run}: socket → LINK_REPAIRED`, (await dbg()).state === 'LINK_REPAIRED');
  await walkTo(24, -52);
  await turnTo(Math.atan2(-(62 - 24), -(-78 + 52)));
  await sleep(600);
  if (first) await shot('08-fiber-to-skyline');

  // --- Teleport terminal: a wrong dry run, then a correct one, then the single commit
  await walkTo(30, -47);
  s = await approach(30, -44.2, 30, -43.6, 'teleport_terminal');
  check(`run ${run}: prompt at teleport_terminal`, s.focus === 'teleport_terminal' && await promptVisible(), JSON.stringify(s.player));
  await pressE();
  check(`run ${run}: E at terminal → TELEPORT_DRY_RUN`, (await dbg()).state === 'TELEPORT_DRY_RUN');
  check(`run ${run}: COMMIT not offered before a passed dry run`, !(await page.evaluate(() => [...document.querySelectorAll('#term-host button')].some((b) => b.textContent.startsWith('COMMIT')))));
  // Wrong dry run: bits on screen first, then a choice that breaks the §7.1 rule.
  await tbtn('Bell-measure a fresh calibration qubit');
  const wb = await bitsOnScreen();
  const four = await page.evaluate(() => [...document.querySelectorAll('#term-host button')].filter((b) => b.textContent.startsWith('Apply ')).length);
  check(`run ${run}: bits shown before corrections, all four choices offered`, four === 4, `m0=${wb.m0} m1=${wb.m1}`);
  const phase1 = await lastResult();
  check(`run ${run}: phase 1 carries bits and no fidelity, on a generic calibration state`, phase1?.engine === 'exact_qiskit_local' && phase1.fidelity === undefined && Number.isFinite(phase1.parameters.theta), JSON.stringify(phase1?.parameters));
  if (first) await shot('09-dry-run-bits-on-screen');
  await tbtn(choiceFor(wb.m1 !== 1, wb.m0 === 1), 'TELEPORT_DRY_RUN'); // wrong X
  const wrong = await lastResult();
  const wrongNote = await termNote();
  check(`run ${run}: wrong dry run visibly fails (Qiskit fidelity ≤ 0.9) and stays in TELEPORT_DRY_RUN`, wrong?.fidelity <= 0.9 && /wrong correction/.test(wrongNote), `F=${wrong?.fidelity} θ=${wrong?.parameters.theta?.toFixed(3)} φ=${wrong?.parameters.phi?.toFixed(3)} — ${wrongNote}`);
  if (first) await shot('10-dry-run-wrong-fails');
  // Correct dry runs on fresh states until one needs X or Z (a 00 pass does not unlock COMMIT).
  const states = new Set([`${phase1.parameters.theta}`]);
  let passed = false;
  for (let i = 0; i < 12 && !passed; i++) {
    await tbtn('Bell-measure a fresh calibration qubit');
    states.add(`${(await lastResult()).parameters.theta}`);
    const b = await bitsOnScreen();
    passed = (await tbtn(choiceFor(b.m1 === 1, b.m0 === 1))) === 'TELEPORT_DRY_RUN_PASSED';
  }
  check(`run ${run}: correct dry run → TELEPORT_DRY_RUN_PASSED, every attempt on a fresh state`, passed && states.size >= 2, `${states.size} distinct states`);
  if (first) await shot('11-dry-run-passed');
  await tbtn('COMMIT TRANSFER (story token, once)');
  check(`run ${run}: commit → TELEPORT_COMMITTED`, (await dbg()).state === 'TELEPORT_COMMITTED');
  const second = await page.evaluate(() => window.__echo.quest.commitTransfer(() => window.__engine.commitStoryToken()));
  check(`run ${run}: a second commit is refused (token consumed once)`, !second.ok, second.reason);
  await sleep(300);
  if (first) await shot('12-commit-wave-start');
  await sleep(2500);
  s = await dbg();
  check(`run ${run}: city_lighting_wave in force`, s.changes?.includes('city_lighting_wave'));
  if (first) await shot('13-city-lit');
  await page.waitForFunction(() => window.__echo.debug.state === 'ENDING', { timeout: 8000 });
  check(`run ${run}: ANIMATION_END → ENDING`, true);
  if (first) await shot('14-ending');
}

const atSpawn = (s) => s.state === 'TITLE' && Math.abs(s.player.z - 2) < 0.01 && Math.abs(s.player.x) < 0.01
  && s.doors.every((d) => !d.open && d.t === 0) && s.changes?.length === 0;

// ---------------------------------------------------------------- run 1, RESTART, run 2, credits restart
await fullRun(1);
await page.click('#end-restart'); // ENDING's RESTART edge (owner ruling 12)
await sleep(400);
let s = await dbg();
check('ENDING → RESTART → TITLE: player at spawn, doors closed, no world change in force', atSpawn(s), JSON.stringify({ state: s.state, player: s.player, changes: s.changes }));
await shot('15-restart-title');
await fullRun(2);
await page.click('#end-credits');
await sleep(200);
await shot('16-credits');
await page.click('#credits-restart'); // CREDITS is terminal: its restart is resetGame()
await sleep(400);
s = await dbg();
check('CREDITS → Restart (resetGame) → TITLE: player at spawn, world reset', atSpawn(s), JSON.stringify({ state: s.state, player: s.player }));

// Pause, resume, and the pause menu's restart (game.reset → resetGame()).
await page.click('#play');
await sleep(400);
await walkTo(0, -3);
await page.keyboard.press('Escape');
await sleep(300);
check('Esc pauses', await page.evaluate(() => window.__echo.paused && !document.getElementById('pause').hidden));
let p = (await dbg()).player;
await page.keyboard.down('KeyW'); await sleep(500); await page.keyboard.up('KeyW');
check('no movement while paused', Math.abs((await dbg()).player.z - p.z) < 1e-6);
await page.click('#resume');
await sleep(200);
check('Resume unpauses', !(await page.evaluate(() => window.__echo.paused)));
await walkTo(0, -6);
await page.keyboard.press('Escape');
await sleep(300);
await page.click('#restart');
await sleep(400);
s = await dbg();
check('Pause → Restart → TITLE, player at spawn', atSpawn(s) && s.camera.yaw === 0, JSON.stringify(s.player));
await page.click('#play');
await sleep(3000);
const readout = await page.evaluate(() => document.getElementById('readout').textContent);
console.log(`readout (headless, NOT a laptop FPS measurement): ${readout.replace(/\n/g, ' | ')}`);
console.log(`page errors: ${errors.length}`);
errors.forEach((e) => console.log(`  ${e}`));
check('no page errors in the main run', errors.length === 0);

// ---------------------------------------------------------------- sabotage on disposable copies
// Reach CLONE_UNDERSTOOD the short way (each event from its rightful source; experiments through the
// dev terminal's engine), so each sabotaged check runs in seconds.
async function toCloneUnderstood(pg) {
  await pg.evaluate(async () => {
    const q = window.__echo.quest;
    const e = window.__engine;
    q.send('START', 'menu'); q.send('SKIP', 'dialogue'); q.send('OPEN_CLONE_BOOTH', 'interactable');
    await q.experiment(() => e.cloneTest('zero'));
    await q.experiment(() => e.cloneTest('plus'));
    q.resultPanelShown();
    q.send('EXPLANATION_READ', 'terminal_acknowledgement');
  });
  return (await dbg(pg)).state;
}
const SABOTAGES = [
  { name: 'WORLD_CHANGES id renamed in the subscriber (alley door: corridor_door_opens → corridor_door_open)',
    file: 'echo/scene/alley.js', from: "openOn: 'corridor_door_opens'", to: "openOn: 'corridor_door_open'",
    // The check: after CLONE_UNDERSTOOD, corridor_door_opens is in force and door A opens.
    async check(pg) {
      if (!(await pg.waitForFunction(() => window.__echo, { timeout: 8000 }).then(() => true, () => false))) return { ok: false, detail: 'world did not boot' };
      await toCloneUnderstood(pg);
      await sleep(1200);
      const d = await dbg(pg);
      return { ok: d.doors.find((x) => x.id === 'door_alley')?.open === true, detail: JSON.stringify(d.doors) };
    } },
  { name: 'reset handler removed (app.js: QUEST_STATE_CHANGED to RESET_STATE no longer resets the world)',
    file: 'echo/game/app.js', from: 'if (to === RESET_STATE) { resetWorld(); return; }', to: '',
    // The check: walk away from spawn with real keys, Pause → Restart, the player is back at spawn.
    async check(pg) {
      await pg.waitForFunction(() => window.__echo, { timeout: 8000 });
      await pg.click('#play'); await sleep(300);
      await pg.keyboard.down('KeyW'); await sleep(900); await pg.keyboard.up('KeyW'); await sleep(200);
      await pg.keyboard.press('Escape'); await sleep(300);
      await pg.click('#restart'); await sleep(400);
      const d = await dbg(pg);
      return { ok: d.state === 'TITLE' && Math.abs(d.player.z - 2) < 0.01, detail: `state=${d.state} z=${d.player.z.toFixed(2)}` };
    } },
  { name: 'EVENT_SOURCES gate removed (state.js accepts any via)',
    file: 'echo/game/state.js', from: 'if (via !== src.via) return', to: 'if (false) return',
    // The check: in CLONE_UNDERSTOOD, EXIT_BOOTH sent from a terminal is refused and the state holds.
    async check(pg) {
      await pg.waitForFunction(() => window.__echo, { timeout: 8000 });
      await toCloneUnderstood(pg);
      const r = await pg.evaluate(() => window.__echo.quest.send('EXIT_BOOTH', 'terminal_acknowledgement'));
      const d = await dbg(pg);
      return { ok: !r.ok && d.state === 'CLONE_UNDERSTOOD', detail: `send ok=${r.ok} state=${d.state}` };
    } },
];
if (FALSIFY) {
  let port = PORT + 1;
  for (const sab of SABOTAGES) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'echo-sabotage-'));
    for (const d of ['echo', 'dev', 'tools/contract-check']) fs.cpSync(path.join(ROOT, d), path.join(dir, d), { recursive: true });
    const f = path.join(dir, sab.file);
    const src = fs.readFileSync(f, 'utf8');
    if (!src.includes(sab.from)) await refuse(`sabotage "${sab.name}": the text to break is not in ${sab.file} (the gate would be measuring nothing)`);
    // Control first: the same check on the unbroken copy must pass, or a red proves nothing.
    const ctlUrl = await startServer(dir, port++);
    const ctlErr = [];
    const ctl = await openPage(ctlUrl, ctlErr);
    const c = await sab.check(ctl).catch((e) => ({ ok: false, detail: String(e) }));
    await ctl.close();
    fs.writeFileSync(f, src.replace(sab.from, sab.to));
    const url = await startServer(dir, port++);
    const sabErr = [];
    const pg = await openPage(url, sabErr);
    const r = await sab.check(pg).catch((e) => ({ ok: false, detail: String(e) }));
    await pg.close();
    check(`control (copy, unbroken): ${sab.name.split(' (')[0]} check passes`, c.ok, c.detail);
    check(`SABOTAGE ${sab.name} → check goes red`, !r.ok, `${r.detail}${sabErr.length ? ` | page error: ${sabErr[0].slice(0, 160)}` : ''}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ build: served, port: PORT, renderer: gl, readout, results, errors }, null, 2));
await cleanup();
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} checks passed`);
if (flag('--publish')) {
  if (failed) console.log('not publishing: run was not green');
  else {
    fs.rmSync(PUBLISH_DIR, { recursive: true, force: true });
    fs.mkdirSync(PUBLISH_DIR, { recursive: true });
    for (const f of fs.readdirSync(OUT)) if (/\.(png|mp4|json)$/.test(f)) fs.copyFileSync(path.join(OUT, f), path.join(PUBLISH_DIR, f));
    console.log(`published → ${PUBLISH_DIR}`);
  }
}
process.exit(failed ? 1 : 0);
