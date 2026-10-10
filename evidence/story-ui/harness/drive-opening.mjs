// Drives opening.html with REAL key presses in REAL time and asserts what the player sees.
// Expected text comes from echo/data (pure data), never from the module under test.
// Modes run in parallel as separate browsers (a background tab throttles timers):
//   node drive-opening.mjs <port> <outDir>            run every mode, merge verdicts
//   node drive-opening.mjs <port> <outDir> <mode>     full | skip | rm | s200a | s200b
// Exit 0 green · 1 red · 2 refused (the page itself did not load).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const port = process.argv[2] || '8781';
const out = process.argv[3] || 'evidence/story-ui/opening';
const mode = process.argv[4];
fs.mkdirSync(out, { recursive: true });

const MODES = ['full', 'skip', 'rm', 's200a', 's200b'];
if (!mode) {
  const runs = MODES.map((m) => new Promise((resolve) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), port, out, m], { stdio: ['ignore', 'pipe', 'inherit'] });
    let text = '';
    child.stdout.on('data', (d) => { text += d; });
    child.on('close', (code) => resolve({ m, code, text }));
  }));
  const results = await Promise.all(runs);
  for (const r of results) process.stdout.write(`\n── mode ${r.m} (exit ${r.code})\n${r.text}`);
  const worst = results.some((r) => r.code === 2) ? 2 : results.some((r) => r.code !== 0) ? 1 : 0;
  console.log(`\nOVERALL exit ${worst}`);
  process.exit(worst);
}

const require = createRequire('/opt/homebrew/lib/node_modules/@modelcontextprotocol/server-puppeteer/');
const puppeteer = require('puppeteer');
const { SCREEN_TEXT, STORY } = await import(pathToFileURL(path.join(repo, 'echo/data/story.js')));
const { OBJECTIVES } = await import(pathToFileURL(path.join(repo, 'echo/data/objectives.js')));

const checks = [];
let failed = 0;
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-first-run', '--force-device-scale-factor=1'],
});
const errors = [];
async function open(query, viewport = { width: 1280, height: 720 }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });
  // Record every caption page the screen reader is given, and the visible line count at that moment.
  await page.evaluateOnNewDocument(() => {
    window.__seen = [];
    window.__maxLines = 0;
    window.__t0 = performance.now();
    document.addEventListener('DOMContentLoaded', () => {
      const live = () => document.querySelector('.echo-dialogue .echo-sr-only');
      new MutationObserver(() => {
        const l = live();
        if (l && l.textContent) window.__seen.push({ at: Math.round(performance.now() - window.__t0), text: l.textContent });
      }).observe(document.body, { subtree: true, childList: true, characterData: true });
      setInterval(() => {
        const t = document.querySelector('.echo-dialogue__text');
        if (!t) return;
        const lh = parseFloat(getComputedStyle(t).lineHeight);
        window.__maxLines = Math.max(window.__maxLines, Math.round(t.scrollHeight / lh));
      }, 100);
    });
  });
  await page.goto(`http://127.0.0.1:${port}/evidence/story-ui/harness/opening.html${query}`, { waitUntil: 'networkidle0' });
  const loaded = await page.evaluate(() => !!window.echoOpening);
  if (!loaded) { console.log('REFUSED: harness did not load', errors); await browser.close(); process.exit(2); }
  await page.waitForFunction(() => window.echoOpening.hash);
  return page;
}
const shot = (page, name) => page.screenshot({ path: path.join(out, name) });
const since = (page) => page.evaluate(() => Math.round(performance.now() - window.__t0));
const waitUntilMs = async (page, ms) => { const now = await since(page); if (ms > now) await sleep(ms - now); };
const evts = (page) => page.evaluate(() => window.echoOpening.events.map((e) => e.event));
const overlayCount = (page) => page.evaluate(() => document.querySelectorAll('.echo-opening').length);

// Nothing visible leaves the viewport or overflows; captions, Skip and HUD rows never overlap.
const geometry = (page) => page.evaluate(() => {
  const W = innerWidth, H = innerHeight, bad = [];
  for (const el of document.querySelectorAll('#ui *')) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || el.closest('[hidden]') || el.classList.contains('echo-sr-only')) continue;
    if (el.closest('[data-visible="false"]') || parseFloat(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) bad.push(`${el.className} out of viewport ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && cs.display !== 'contents') bad.push(`${el.className} scrollWidth ${el.scrollWidth} > ${el.clientWidth}`);
  }
  const boxes = ['.echo-hud__top', '.echo-dialogue', '.echo-hud__bottom', '.echo-opening__skip', '.echo-opening__card'].map((s) => document.querySelector(s))
    .filter((e) => e && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[data-visible="false"]') && parseFloat(getComputedStyle(e).opacity) > 0)
    .map((e) => [e.className, e.getBoundingClientRect()]);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [a, ra] = boxes[i], [b, rb] = boxes[j];
    if (ra.left < rb.right && rb.left < ra.right && ra.top < rb.bottom && rb.top < ra.bottom) bad.push(`overlap ${a} / ${b}`);
  }
  return bad;
});
const skipFocus = (page) => page.evaluate(() => {
  const a = document.activeElement;
  const cs = getComputedStyle(a);
  return { isSkip: a.classList.contains('echo-opening__skip'), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}` };
});

// Every expected beat's text must be reconstructible from the pages the player was given, in order.
function beatsSeen(seen) {
  const expected = STORY.OPENING.map((b) => `${b.speaker}: ${b.text}`);
  const texts = seen.map((s) => s.text);
  const missing = [];
  let cursor = 0;
  for (const beat of expected) {
    let acc = '';
    let found = false;
    for (let i = cursor; i < texts.length; i++) {
      acc = acc ? `${acc} ${texts[i].replace(/^[^:]+: /, '')}` : texts[i];
      if (acc === beat) { cursor = i + 1; found = true; break; }
      if (!beat.startsWith(acc)) break;
    }
    if (!found) missing.push(beat);
  }
  return missing;
}

try {
  if (mode === 'full') {
    const page = await open('');
    await sleep(2500);
    const card = await page.evaluate(() => {
      const c = document.querySelector('.echo-opening__card');
      if (!c) return null;
      const cs = getComputedStyle(c), r = c.getBoundingClientRect();
      return { text: c.textContent.trim(), visible: cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.9 && r.width > 0 && r.right <= innerWidth && r.bottom <= innerHeight };
    });
    check('a: title card shows the openingCard text, fully visible', !!card && card.text === SCREEN_TEXT.openingCard.text && card.visible, JSON.stringify(card));
    const bb = await page.evaluate(() => document.querySelector('.echo-opening__billboard')?.textContent.trim());
    check('a: billboard line shows during shot A', bb === SCREEN_TEXT.billboard.text, String(bb));
    const f = await skipFocus(page);
    check('g: Skip control has keyboard focus on first frames', f.isSkip, JSON.stringify(f));
    check('g: Skip focus ring is a visible 3px solid outline', /solid 3px/.test(f.outline) && !/rgba\(0, 0, 0, 0\)/.test(f.outline), f.outline);
    await shot(page, '01-title-card.png');
    // Pin the shots: screenshot well after each shot's first caption has finished revealing.
    await waitUntilMs(page, 6000); await shot(page, '02-shot-a-billboard.png');
    await waitUntilMs(page, 13000); await shot(page, '03-shot-b-caption.png');
    await waitUntilMs(page, 26500); await shot(page, '04-shot-c-caption.png');
    await waitUntilMs(page, 34500); await shot(page, '05-shot-c-misconception.png');
    await waitUntilMs(page, 44100);
    await shot(page, '06a-hud-fade-start.png');
    await waitUntilMs(page, 47500);
    await shot(page, '06-shot-d-hud-objective.png');
    const hudNow = await page.evaluate(() => ({ visible: document.querySelector('.echo-hud')?.dataset.visible, obj: document.querySelector('.echo-hud__objtext')?.textContent }));
    check('d: HUD is visible with the FREE_ROAM_ALLEY objective during shot D', hudNow.visible === 'true' && hudNow.obj === OBJECTIVES.FREE_ROAM_ALLEY.text, JSON.stringify(hudNow));
    await waitUntilMs(page, 66500);
    const shots = await page.evaluate(() => window.echoOpening.shots);
    const order = shots.map((s) => s.name).join('');
    check('c: onShot fired A,B,C,D once each, in order', order === 'ABCD', order);
    const want = { A: 0, B: 10, C: 24, D: 44 };
    check('c: each shot fired within 1.2 s of its §4.1 start', shots.every((s) => Math.abs(s.t - want[s.name]) < 1.2), JSON.stringify(shots));
    const e = await evts(page);
    check('e: full run emits FINISHED exactly once and no SKIP', e.length === 1 && e[0] === 'FINISHED', JSON.stringify(e));
    const fin = await page.evaluate(() => window.echoOpening.events[0]?.at);
    check('e: FINISHED lands at about 65 s', fin > 64000 && fin < 67000, String(fin));
    check('e: overlay is gone after the run', (await overlayCount(page)) === 0);
    const missing = beatsSeen(await page.evaluate(() => window.__seen));
    check('b: every §4.1 line was shown whole, in order', missing.length === 0, missing.join(' | '));
    const maxLines = await page.evaluate(() => window.__maxLines);
    check('b: no caption ever needed more than 2 lines', maxLines <= 2 && maxLines >= 1, String(maxLines));
    const hudEnd = await page.evaluate(() => document.querySelector('.echo-hud')?.dataset.visible);
    check('d: HUD stays visible after FINISHED', hudEnd === 'true');
    for (let i = 0; i < 4; i++) await page.keyboard.press('Escape');
    await page.keyboard.press('Enter'); await page.keyboard.press('Space');
    await page.evaluate(() => document.querySelector('.echo-opening__skip')?.click());
    await sleep(300);
    const e2 = await evts(page);
    check('f: mashing Skip/Esc/Enter after the end emits nothing more', e2.length === 1, JSON.stringify(e2));
  }

  if (mode === 'skip') {
    // Escape at ~3 s, mashed.
    let page = await open('');
    await sleep(3000);
    await shot(page, '07-skip-at-3s.png');
    for (let i = 0; i < 6; i++) await page.keyboard.press('Escape');
    await sleep(500);
    check('d: Esc at ~3 s emits SKIP exactly once when mashed', JSON.stringify(await evts(page)) === '["SKIP"]', JSON.stringify(await evts(page)));
    check('d: overlay is gone after skip', (await overlayCount(page)) === 0);
    const hud = await page.evaluate(() => ({ v: document.querySelector('.echo-hud')?.dataset.visible, o: document.querySelector('.echo-hud__objtext')?.textContent }));
    check('d: skip lands with the HUD and objective showing', hud.v === 'true' && hud.o === OBJECTIVES.FREE_ROAM_ALLEY.text, JSON.stringify(hud));
    await sleep(8500);
    const after = await page.evaluate(() => ({ shots: window.echoOpening.shots.map((s) => s.name).join(''), ev: window.echoOpening.events.length, cap: document.querySelector('.echo-dialogue')?.dataset.visible }));
    check('d: nothing from the timeline fires after skip (no shot B, no FINISHED, caption hidden)', after.shots === 'A' && after.ev === 1 && after.cap === 'false', JSON.stringify(after));
    await page.close();
    // Enter on the auto-focused Skip button, and a second mount on the same root.
    page = await open('?double=1');
    await sleep(2000);
    check('mount twice: one overlay, not two', (await overlayCount(page)) === 1, String(await overlayCount(page)));
    await page.keyboard.press('Enter');
    await sleep(300);
    await page.keyboard.press('Enter');
    check('d: Enter on the focused Skip button skips; double mount still fires once', JSON.stringify(await evts(page)) === '["SKIP"]', JSON.stringify(await evts(page)));
    await page.close();
    // Mouse click on the visible control.
    page = await open('');
    await sleep(1500);
    await page.click('.echo-opening__skip');
    await page.click('body').catch(() => {});
    await sleep(300);
    check('d: clicking Skip emits SKIP once', JSON.stringify(await evts(page)) === '["SKIP"]', JSON.stringify(await evts(page)));
  }

  if (mode === 'rm') {
    const page = await open('?rm=1&cap=high-contrast');
    await waitUntilMs(page, 2500);
    await shot(page, '08-reduced-motion-card.png');
    await waitUntilMs(page, 24800); // 300 ms into the first shot-C caption
    const rm = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('.echo-opening, .echo-opening *, .echo-dialogue, .echo-dialogue *, .echo-hud, .echo-hud *')];
      const slow = nodes.filter((n) => {
        const cs = getComputedStyle(n);
        const longest = (list) => Math.max(0, ...list.split(',').map((s) => parseFloat(s) * (s.includes('ms') ? 1 : 1000)));
        return longest(cs.transitionDuration) > 0 || (cs.animationName !== 'none' && longest(cs.animationDuration) > 0);
      }).map((n) => n.className);
      const live = document.querySelector('.echo-dialogue .echo-sr-only').textContent.replace(/^[^:]+: /, '');
      return { slow, shown: document.querySelector('.echo-dialogue__text').textContent, live, n: nodes.length };
    });
    check('h: no transition or animation longer than 0 ms on opening, captions or HUD', rm.slow.length === 0 && rm.n > 5, `${rm.n} nodes; slow: ${rm.slow.join(',')}`);
    check('h: caption appears whole at once (no reveal)', rm.shown === rm.live && rm.shown.length > 0, `${rm.shown} / ${rm.live}`);
    const cs = await page.evaluate(() => { const d = document.querySelector('.echo-dialogue'); const s = getComputedStyle(d); return { bg: s.backgroundColor, border: s.borderLeftColor, color: getComputedStyle(document.querySelector('.echo-dialogue__text')).color }; });
    check('captionStyle high-contrast: caption is on a solid black panel with white text', cs.bg === 'rgb(0, 0, 0)' && cs.color === 'rgb(255, 255, 255)', JSON.stringify(cs));
    await shot(page, '09-reduced-motion-high-contrast-caption.png');
  }

  if (mode === 's200a' || mode === 's200b') {
    const vp = mode === 's200a' ? { width: 1280, height: 720 } : { width: 1024, height: 640 };
    const tag = `${vp.width}x${vp.height}`;
    const page = await open('?scale=200', vp);
    const bad = [];
    const snap = { 3000: 'card', 34500: 'misconception', 47500: 'hud' };
    for (let ms = 1000; ms <= 62000; ms += 1000) {
      await waitUntilMs(page, ms);
      const g = await geometry(page);
      if (g.length) bad.push(`${ms}ms: ${g.join('; ')}`);
      if (snap[ms]) await shot(page, `10-200pct-${tag}-${snap[ms]}.png`);
    }
    check(`200% at ${tag}: nothing clips, leaves the viewport or overlaps, sampled every second`, bad.length === 0, bad.slice(0, 4).join(' || '));
    const max = await page.evaluate(() => window.__maxLines);
    check(`200% at ${tag}: captions stay ≤2 lines`, max <= 2, String(max));
    const missing = beatsSeen(await page.evaluate(() => window.__seen));
    check(`200% at ${tag}: every §4.1 line still reaches the player whole`, missing.length === 0, missing.join(' | '));
    const f = await page.evaluate(() => { const b = document.querySelector('.echo-opening__skip'); if (!b) return null; const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, fits: r.right <= innerWidth && r.bottom <= innerHeight && b.scrollWidth <= b.clientWidth + 1 }; });
    check(`200% at ${tag}: Skip control fully visible and unclipped`, !!f && f.fits, JSON.stringify(f));
  }

  check('no page errors or failed requests', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(out, `result-${mode}.json`), JSON.stringify({ mode, failed, checks }, null, 2));
console.log(`${mode}: ${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
