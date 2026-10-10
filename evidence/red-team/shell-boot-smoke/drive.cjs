#!/usr/bin/env node
// Red-team reach drive: plays one served ECHO tree on the player's path — keyboard only (Tab,
// Enter, WASD, arrows, E, Esc) after one focus of the project frame — and grades each row of the
// reach table from what a PLAYER can see (visible DOM text, the delivered canvas pixels), never
// from the product's console. The product's own quest strip (#echo-quest) is recorded alongside as
// a secondary, product-reported column, never used as the verdict.
// LOCAL RUNNER ONLY: nothing here is a Qollab or IonQ result.
//
//   node drive.cjs --port <p> --variant A|B0|BB|A-sab --token <served token> --out <dir>
// Exit: 0 drive completed (whatever the reach) · 2 could not grade (token mismatch, no frame, ...).
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execSync } = require('node:child_process');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = Number(arg('--port'));
const VARIANT = arg('--variant');
const TOKEN = arg('--token');
const OUT = path.resolve(arg('--out', '.'));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!PORT || !VARIANT || !TOKEN) { console.error('usage: drive.cjs --port --variant --token --out'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const puppeteer = require(path.join(execSync('npm root -g').toString().trim(), '@modelcontextprotocol/server-puppeteer/node_modules/puppeteer-core'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const refuse = (why) => { console.error(`REFUSED: ${why}`); process.exit(2); };

const ROWS = ['boot', 'title', 'opening', 'move', 'reach booth', 'E at booth', 'clone result panel', 'relay',
  'receiver EXACT panel', 'rooftop', 'bits shown', 'X/Z choice', 'dry run', 'commit', 'ending', 'credits'];
const reach = Object.fromEntries(ROWS.map((r) => [r, { status: 'not reached', detail: 'an earlier row stalled', shot: null }]));
const mark = (row, status, detail, shot = null) => {
  reach[row] = { status, detail, shot };
  console.log(`ROW  ${row.padEnd(22)} ${status.padEnd(12)} ${detail}${shot ? `  [${shot}]` : ''}`);
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--window-size=1280,800', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  const consoleLog = [];
  page.on('console', (m) => consoleLog.push(`[host ${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => consoleLog.push(`[host pageerror] ${e}`));
  let n = 0;
  const shot = async (name) => { const f = `${String(++n).padStart(2, '0')}-${VARIANT}-${name}.png`; await page.screenshot({ path: path.join(OUT, f) }); return f; };
  const finish = async (code) => {
    let runner = {};
    try { runner = await page.evaluate(() => ({ status: window.__runner.status, jobs: window.__runner.jobs, error: window.__runner.error, log: window.__runner.log })); } catch {}
    fs.writeFileSync(path.join(OUT, 'console.log'), [...consoleLog, '--- runner log (project console as the runner shows it) ---',
      ...((runner.log || []).map((l) => (typeof l === 'string' ? l : JSON.stringify(l))))].join('\n') + '\n');
    fs.writeFileSync(path.join(OUT, 'reach.json'), JSON.stringify({ variant: VARIANT, token: TOKEN, reach, extra }, null, 1));
    await browser.close();
    process.exit(code);
  };
  const extra = { machine: execSync('/usr/sbin/sysctl -n hw.model machdep.cpu.brand_string').toString().trim().replace(/\n/g, ' · '), node: process.version };

  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${PORT}/?autorun=1&backend=builtin`, { waitUntil: 'load' });
  const frameOf = () => page.frames().find((f) => f.url().includes('/frame.html'));
  // main.js may still be awaiting Python calibration when the world is playable, so boot is graded
  // on the delivered page, not on the run finishing: wait for the token + a non-blank canvas, up to 300 s.
  let frame;
  for (;;) {
    frame = frameOf();
    const st = await page.evaluate(() => window.__runner?.status).catch(() => null);
    const tok = frame ? await frame.$eval('#sbs-token', (e) => e.textContent).catch(() => null) : null;
    if (tok && (st === 'done' || st === 'error' || st === 'running')) {
      if (st !== 'running' || Date.now() - t0 > 20000) break;
    }
    if (Date.now() - t0 > 300000) break;
    await sleep(500);
  }
  if (!frame) refuse('project frame never appeared');
  const served = await frame.$eval('#sbs-token', (e) => e.textContent).catch(() => null);
  if (served !== TOKEN) { console.error(`ABORT: served token ${served} != expected ${TOKEN}`); await finish(2); }
  console.log(`provenance: served token ${served} == expected (law 16)`);
  // Let the run settle (calibration) a little longer, but never past 120 s more.
  for (let i = 0; i < 240; i++) {
    const st = await page.evaluate(() => window.__runner.status);
    if (st === 'done' || st === 'error') break;
    await sleep(500);
  }
  extra.loadSeconds = +((Date.now() - t0) / 1000).toFixed(1);
  extra.runnerStatus = await page.evaluate(() => window.__runner.status);
  extra.runError = await page.evaluate(() => window.__runner.error);

  // ---- player-visible readers -------------------------------------------------------------------
  const visibleText = () => frame.evaluate(() => {
    const out = [];
    const walk = (el) => {
      if (el.id === 'sbs-token' || el.id === 'echo-system') return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
      for (const c of el.childNodes) {
        if (c.nodeType === 3 && c.textContent.trim()) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) out.push(c.textContent.trim());
        } else if (c.nodeType === 1) walk(c);
      }
    };
    walk(document.body);
    return out.join(' | ');
  });
  const questStrip = () => frame.$eval('#echo-quest', (e) => e.textContent).catch(() => null);
  const canvasStats = async () => {
    const b64 = await page.screenshot({ encoding: 'base64', clip: { x: 320, y: 200, width: 640, height: 400 } });
    const s = await browser.newPage();
    const r = await s.evaluate(async (b) => {
      const img = new Image(); img.src = `data:image/png;base64,${b}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      return Array.from(g.getImageData(0, 0, c.width, c.height).data);
    }, b64);
    await s.close();
    return r;
  };
  const diff = (a, b) => { let d = 0; for (let i = 0; i < a.length; i += 4) d += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return +(d / (a.length / 4)).toFixed(3); };
  const lit = (a) => { let k = 0; for (let i = 0; i < a.length; i += 4) if (a[i] + a[i + 1] + a[i + 2] > 60) k++; return k; };
  const stepLog = [];
  const note = async (label) => stepLog.push({ label, quest: await questStrip(), text: (await visibleText()).slice(0, 400) });

  // ---- boot --------------------------------------------------------------------------------------
  const px0 = await canvasStats();
  const bootShot = await shot('boot');
  await note('boot');
  if (extra.runError) mark('boot', 'blocked', `main.js threw: ${extra.runError}`, bootShot);
  else mark('boot', lit(px0) > 2000 ? 'reached' : 'blocked', `runner ${extra.runnerStatus}; ${lit(px0)} lit px in the centre crop`, bootShot);

  // ---- title: a visible heading with ECHO and a Start control, reached by keyboard ----------------
  await page.evaluate(() => document.querySelector('iframe')?.focus());
  const startReady = async () => frame.evaluate(() => {
    const a = document.activeElement;
    return a && /^(start|play|new game|begin)$/i.test((a.textContent || '').trim());
  });
  const titleVisible = /ECHO/.test(await visibleText()) && /\bStart\b|\bPLAY\b/i.test(await visibleText());
  let tabs = 0;
  if (titleVisible) {
    await frame.evaluate(() => document.body.focus());
    while (!(await startReady()) && tabs < 25) { await page.keyboard.press('Tab'); tabs++; await sleep(60); }
  }
  const titleShot = await shot('title');
  if (!titleVisible) mark('title', 'blocked', `no visible ECHO title with Start: "${(await visibleText()).slice(0, 160)}"`, titleShot);
  else if (!(await startReady())) mark('title', 'blocked', `Start not reachable with Tab (${tabs} presses)`, titleShot);
  else {
    const before = await visibleText();
    await page.keyboard.press('Enter');
    await sleep(1500);
    const after = await visibleText();
    const stillTitle = /\bStart\b/.test(after) && /Settings/.test(after) && /Controls/.test(after);
    if (stillTitle) mark('title', 'blocked', 'Enter on Start (focused via Tab) left the title menu on screen', titleShot);
    else mark('title', 'reached', `Start focused after ${tabs} Tab(s); Enter closed the title`, titleShot);
    extra.titleBefore = before.slice(0, 300);
  }
  await note('after Start');
  if (reach.title.status !== 'reached') return wrapUp();

  // ---- opening: new story text on screen after Start ---------------------------------------------
  let opening = '';
  for (let i = 0; i < 16 && !opening; i++) {
    const t = await visibleText();
    if (/Skip|MIRROR|MICA|RIN|Nacre|NACRE/.test(t)) opening = t;
    else await sleep(500);
  }
  const openShot = await shot('opening');
  mark('opening', opening ? 'reached' : 'blocked', opening ? `opening text/skip visible: "${opening.slice(0, 140)}"` : `nothing new after Start; screen text: "${(await visibleText()).slice(0, 140)}"`, openShot);
  // Skip it the way a player would (Esc), then try to move. If the opening never appeared, Esc is
  // still pressed: it is what a stuck player tries.
  await page.keyboard.press('Escape');
  await sleep(1200);
  if (/Resume|PAUSED/i.test(await visibleText())) { await page.keyboard.press('Escape'); await sleep(600); }
  await note('after Esc');

  // ---- move: canvas change with W held vs. an idle control of the same length -------------------
  const a0 = await canvasStats(); await sleep(1200); const a1 = await canvasStats();
  const idle = diff(a0, a1);
  await page.keyboard.down('KeyW'); await sleep(1200); const b1 = await canvasStats(); await page.keyboard.up('KeyW');
  const moved = diff(a1, b1);
  const moveShot = await shot('after-W');
  extra.move = { idleDiff: idle, wDiff: moved };
  const movedOk = moved > Math.max(2, idle * 3);
  mark('move', movedOk ? 'reached' : 'blocked', `mean |Δpx| with W held ${moved} vs idle ${idle} (needs > max(2, 3×idle))`, moveShot);
  await note('after W');

  // ---- the booth: only a world with an interactable can have one --------------------------------
  const hasGame = await frame.evaluate(() => !!window.sbsGame).catch(() => false);
  if (!movedOk || !hasGame) {
    const why = !movedOk ? 'the player cannot move' : 'no world with interactables in this tree';
    for (const r of ROWS.slice(4)) mark(r, 'not present', why);
    return wrapUp();
  }
  // BRIDGED steering: read position/focus from window.sbsGame.debug, press real keys.
  extra.bridged = 'steering reads sbsGame.debug (position, focus); every input is a real key press';
  const dbg = () => frame.evaluate(() => { const d = window.sbsGame.debug; return { state: d.state, player: d.player, focus: d.focus, camera: d.camera }; });
  const TURN = 600 * 0.0026;
  async function turnTo(yaw) {
    for (let i = 0; i < 8; i++) {
      const { camera } = await dbg();
      let df = Math.atan2(Math.sin(yaw - camera.yaw), Math.cos(yaw - camera.yaw));
      if (Math.abs(df) < 0.04) return;
      const k = df > 0 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down(k); await sleep(Math.max(8, (Math.abs(df) / TURN) * 1000 * (i ? 0.8 : 0.9))); await page.keyboard.up(k); await sleep(40);
    }
  }
  async function walkTo(x, z, tol = 0.25) {
    for (let i = 0; i < 80; i++) {
      const { player } = await dbg();
      const dx = x - player.x, dz = z - player.z, d = Math.hypot(dx, dz);
      if (d < tol) break;
      await turnTo(Math.atan2(-dx, -dz));
      await page.keyboard.down('KeyW'); await sleep(Math.min(300, Math.max(60, (d / 3.1) * 600))); await page.keyboard.up('KeyW');
    }
    await sleep(250);
    return dbg();
  }
  // Route from gameplay's own world-playthrough.mjs (cb803ff, lines 220-222).
  await walkTo(1.5, -6); await walkTo(2.6, -11.5); let s = await walkTo(3.6, -11.5, 0.2);
  for (let i = 0; i < 3 && s.focus !== 'copy_booth'; i++) {
    await turnTo(Math.atan2(-(3.9 - s.player.x), -(-11.5 - s.player.z)));
    await page.keyboard.down('KeyW'); await sleep(70); await page.keyboard.up('KeyW'); await sleep(250);
    s = await dbg();
  }
  const boothText = await visibleText();
  const boothShot = await shot('at-booth');
  const promptSeen = /\bE\b/.test(boothText) && /booth|copy|clone|interact|use/i.test(boothText);
  extra.atBooth = { focus: s.focus, player: s.player, state: s.state };
  if (s.focus !== 'copy_booth') mark('reach booth', 'blocked', `steering did not bring the booth into focus (focus=${s.focus}, pos=${JSON.stringify(s.player)})`, boothShot);
  else mark('reach booth', promptSeen ? 'reached' : 'blocked', promptSeen ? 'E prompt visible' : `in range (gameplay focus=copy_booth) but NO prompt on screen; screen text: "${boothText.slice(0, 120)}"`, boothShot);

  // ---- E at the booth: a terminal panel must appear -----------------------------------------------
  const preE = await visibleText();
  await page.keyboard.press('KeyE'); await sleep(1500);
  const postE = await visibleText();
  const eShot = await shot('after-E');
  const d1 = await dbg();
  extra.afterE = { state: d1.state, terminalOpen: await frame.evaluate(() => window.sbsGame.terminalOpen) };
  const panel = postE !== preE && /clone|copy|terminal|calibrat|qubit|booth/i.test(postE.replace(preE, ''));
  mark('E at booth', panel ? 'reached' : 'blocked', panel ? 'terminal panel appeared' : `no panel; game state ${d1.state}, terminalOpen=${extra.afterE.terminalOpen}`, eShot);
  // A stuck player tries to walk away and to pause.
  const c0 = await canvasStats(); await page.keyboard.down('KeyS'); await sleep(1000); await page.keyboard.up('KeyS'); const c1 = await canvasStats();
  await page.keyboard.press('Escape'); await sleep(600);
  const stuck = await dbg();
  extra.stuckAfterE = { posAfterS: stuck.player, canvasDiffWithS: diff(c0, c1), pausedText: /Resume|PAUSED/i.test(await visibleText()) };
  extra.stuckShot = await shot('stuck-after-E');
  for (const r of ROWS.slice(6)) mark(r, panel ? 'not reached' : 'not present', panel ? 'drive stops after the first terminal' : 'no terminal UI in any pinned tree');
  return wrapUp();

  async function wrapUp() {
    // ---- FPS: rAF callbacks over 10 s in the project frame ----------------------------------------
    extra.fps = await frame.evaluate(() => new Promise((res) => {
      let k = 0; const t = performance.now();
      const f = () => { k++; if (performance.now() - t < 10000) requestAnimationFrame(f); else res(+(k / ((performance.now() - t) / 1000)).toFixed(1)); };
      requestAnimationFrame(f);
    })).catch((e) => `error ${e}`);
    // Control: the same 10 s rAF count in the runner's HOST page (no WebGL), to tell a headless rAF
    // cap from the scene's own cost.
    extra.fpsHostControl = await page.evaluate(() => new Promise((res) => {
      let k = 0; const t = performance.now();
      const f = () => { k++; if (performance.now() - t < 10000) requestAnimationFrame(f); else res(+(k / ((performance.now() - t) / 1000)).toFixed(1)); };
      requestAnimationFrame(f);
    }));
    extra.gl = await frame.evaluate(() => { const c = document.createElement('canvas').getContext('webgl2'); const x = c?.getExtension('WEBGL_debug_renderer_info'); return x ? c.getParameter(x.UNMASKED_RENDERER_WEBGL) : 'unknown'; }).catch(() => 'unknown');
    // ---- backend.run per page load: our own wrapper (runner copy), plus the runner's own counter --
    extra.backendRuns = await frame.evaluate(() => ({ js: window.sbsJsRuns, py: window.sbsPyRuns })).catch(() => null);
    extra.backendRuns.runnerCounter = await page.evaluate(() => window.__runner.jobs);
    // A player who finds the shell's Verify button and presses it twice (keyboard: Tab to it, Enter).
    if (await frame.$('#echo-verify')) {
      const pressVerify = async () => {
        await frame.evaluate(() => document.body.focus());
        for (let i = 0; i < 40; i++) {
          if (await frame.evaluate(() => document.activeElement?.id === 'echo-verify')) { await page.keyboard.press('Enter'); return true; }
          await page.keyboard.press('Tab'); await sleep(30);
        }
        return false;
      };
      const p1 = await pressVerify(); await sleep(8000); const p2 = await pressVerify(); await sleep(3000);
      extra.verifyPresses = { reachedByTab: [p1, p2], status: await frame.$eval('#echo-verify-status', (e) => e.textContent).catch(() => null),
        runs: await frame.evaluate(() => ({ js: window.sbsJsRuns, py: window.sbsPyRuns })), runnerCounter: await page.evaluate(() => window.__runner.jobs) };
      extra.verifyShot = await shot('verify-twice');
    }
    extra.steps = stepLog;
    console.log(`backend.run per load (before Verify): ${JSON.stringify(extra.backendRuns)}  after Verify×2: ${JSON.stringify(extra.verifyPresses?.runs ?? null)}`);
    console.log(`fps(10 s rAF) ${extra.fps} (host-page control ${extra.fpsHostControl}) on ${extra.machine} · ${extra.gl}`);
    await finish(0);
  }
})().catch((e) => { console.error(`REFUSED: drive crashed: ${e.stack || e}`); process.exit(2); });
