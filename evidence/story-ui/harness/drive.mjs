// Drives shell.html with REAL key presses (CDP Input events, so Tab really moves focus) and
// asserts what the player would see. Exit 0 green · 1 red · 2 refused (harness did not load).
// Usage: node drive.mjs <port> <outDir>
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('/opt/homebrew/lib/node_modules/@modelcontextprotocol/server-puppeteer/');
const puppeteer = require('puppeteer');

const port = process.argv[2] || '8742';
const out = process.argv[3] || 'evidence/story-ui/ui-shell';
fs.mkdirSync(out, { recursive: true });
const url = `http://127.0.0.1:${port}/evidence/story-ui/harness/shell.html`;
const keys = [];
const checks = [];
let failed = 0;
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-first-run', '--force-device-scale-factor=1'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
// A 404 is an error unless it is the browser's own favicon probe (the harness has no favicon).
page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });

async function press(key, label) {
  keys.push(label || key);
  const [mod, k] = key.includes('+') ? key.split('+') : [null, key];
  if (mod) await page.keyboard.down(mod);
  await page.keyboard.press(k);
  if (mod) await page.keyboard.up(mod);
  await new Promise((r) => setTimeout(r, 60));
}
const shot = (name) => page.screenshot({ path: path.join(out, name) });
const settle = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const focused = () => page.evaluate(() => {
  const a = document.activeElement;
  const cs = getComputedStyle(a);
  return { tag: a.tagName, text: (a.textContent || a.name || a.id).trim(), id: a.id,
    outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, inMenu: !!a.closest('.echo-menu') };
});

// Geometry gate: nothing visible in the UI leaves the viewport or overflows its own box,
// and the HUD rows and dialogue do not overlap.
const geometry = () => page.evaluate(() => {
  const W = innerWidth, H = innerHeight, bad = [];
  for (const el of document.querySelectorAll('#ui *')) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || el.closest('[hidden]') || el.classList.contains('echo-sr-only')) continue;
    if (el.closest('[data-visible="false"]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) bad.push(`${el.className} out of viewport ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && cs.display !== 'contents' && el.type !== 'range') bad.push(`${el.className} scrollWidth ${el.scrollWidth} > ${el.clientWidth}`);
  }
  const boxes = ['.echo-hud__top', '.echo-dialogue', '.echo-hud__bottom'].map((s) => document.querySelector(s))
    .filter((e) => e && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[data-visible="false"]'))
    .map((e) => [e.className, e.getBoundingClientRect()]);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [a, ra] = boxes[i], [b, rb] = boxes[j];
    if (ra.left < rb.right && rb.left < ra.right && ra.top < rb.bottom && rb.top < ra.bottom) bad.push(`overlap ${a} / ${b}`);
  }
  return bad;
});
const dialogueLines = () => page.evaluate(() => {
  const t = document.querySelector('.echo-dialogue__text');
  const lh = parseFloat(getComputedStyle(t).lineHeight);
  return { lines: Math.round(t.scrollHeight / lh), page: document.querySelector('.echo-dialogue__page').textContent, text: t.textContent };
});

async function walkBeat(beatKey) {
  await page.evaluate((k) => { echoHarness.dialogue.play(echoHarness.BEATS[k]); }, beatKey);
  const pages = [];
  for (let i = 0; i < 20; i++) {
    await press('Enter', 'Enter (skip reveal)');
    const d = await dialogueLines();
    pages.push(d);
    await press('Enter', 'Enter (next)');
    if (!(await page.evaluate(() => echoHarness.dialogue.active))) break;
  }
  const source = await page.evaluate((k) => echoHarness.BEATS[k][0].text, beatKey);
  return { pages, rejoined: pages.map((p) => p.text).join(' ') === source.trim().split(/\s+/).join(' ') };
}

try {
  await page.goto(url, { waitUntil: 'networkidle0' });
  const loaded = await page.evaluate(() => !!window.echoHarness);
  if (!loaded) { console.log('REFUSED: harness did not load', errors); process.exit(2); }
  await page.waitForFunction(() => window.echoHarness.hash);
  const prov = await page.evaluate(() => ({ version: echoHarness.version, hash: echoHarness.hash }));
  console.log('provenance', JSON.stringify(prov));

  // 1. Title, focus ring on the first item without touching the mouse.
  await settle();
  let f = await focused();
  check('title: Start has focus on load', f.text === 'Start', JSON.stringify(f));
  check('title: focus ring is a 3px solid outline', /solid 3px/.test(f.outline), f.outline);
  await shot('01-title-focus.png');
  await press('Tab');
  await press('Tab');
  await press('Tab');
  f = await focused();
  check('title: Tab wraps inside the menu (Start→Settings→Controls→Start)', f.text === 'Start', f.text);

  // 2. Start → HUD in the §6.3 layout.
  await press('Enter');
  await settle();
  const hudText = await page.evaluate(() => [...document.querySelectorAll('.echo-hud__top, .echo-hud__bottom')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
  check('hud: top row reads brand/objective/countdown', /ECHO \/\/ DISTRICT 09.*OBJECTIVE 02.*RESTORE THE ENTANGLEMENT RELAY.*GRID SHUTDOWN 08:42/i.test(hudText[0]), hudText[0]);
  check('hud: bottom row reads capsule + prompt', /Q-SOURCE: PRESERVED.*E INTERACT/.test(hudText[1]), hudText[1]);
  check('hud: capsule state carries a glyph, not only colour', await page.evaluate(() => document.querySelector('.echo-status__glyph').textContent === '◆'));
  await page.evaluate(() => echoHarness.hud.showTooltip('W A S D  MOVE   ·   MOUSE  LOOK', { duration: 0 }));
  await settle();
  check('hud 100%: geometry clean', (await geometry()).length === 0, (await geometry()).join('; '));
  await shot('02-hud.png');
  await page.evaluate(() => echoHarness.hud.hideTooltip());

  // 3. Dialogue: a long beat is paginated into ≤2-line pages; Enter skips the reveal, then advances.
  await page.evaluate(() => { echoHarness.done = false; echoHarness.dialogue.play(echoHarness.BEATS.long).then(() => { echoHarness.done = true; }); });
  await settle(120);
  const mid = await dialogueLines();
  await press('Enter', 'Enter (skip reveal)');
  let d = await dialogueLines();
  check('dialogue: reveal was in progress, Enter skipped to the full caption', mid.text.length < d.text.length, `${mid.text.length} → ${d.text.length}`);
  check('dialogue 100%: page 1 is ≤2 lines', d.lines <= 2 && d.lines >= 1, JSON.stringify(d));
  check('dialogue 100%: long beat split into ≥2 pages', /^1\/[2-9]/.test(d.page), d.page);
  await settle();
  await shot('03-dialogue-long-page1.png');
  await press('Enter', 'Enter (next page)');
  await press('Enter', 'Enter (skip reveal)');
  d = await dialogueLines();
  check('dialogue 100%: page 2 is ≤2 lines', d.lines <= 2, JSON.stringify(d));
  await settle();
  await shot('03b-dialogue-long-page2.png');

  // 4. Pause and settings by keyboard alone.
  keys.push('--- pause/settings ---');
  await press('Escape');
  await settle();
  f = await focused();
  check('pause: Esc opens pause with Resume focused', f.text === 'Resume', JSON.stringify(f));
  await shot('04-pause.png');
  for (let i = 0; i < 6; i++) await press('Tab');
  f = await focused();
  check('pause: 6×Tab keeps focus inside the menu', f.inMenu, f.text);
  await press('Shift+Tab');
  f = await focused();
  check('pause: Shift+Tab keeps focus inside the menu', f.inMenu, f.text);
  // Return to Resume, then go to Settings.
  await page.evaluate(() => document.querySelector('[data-screen="pause"] [data-action="resume"]').focus());
  keys.push('(focus reset to Resume for a known sequence)');
  await press('Tab');
  await press('Enter');
  await settle();
  f = await focused();
  check('settings: opened from pause, Subtitles focused', f.id === 'echo-set-subtitles', JSON.stringify(f));
  await press('Tab'); // reduced motion
  await press('Tab'); // text size
  f = await focused();
  check('settings: text size range reachable by Tab', f.id === 'echo-set-textScale', f.id);
  for (let i = 0; i < 4; i++) await press('ArrowRight');
  const scale = await page.evaluate(() => document.getElementById('ui').dataset.textScale);
  check('settings: ArrowRight×4 sets text scale 200', scale === '200', scale);
  await settle();
  await shot('05-settings-200.png');
  check('settings 200%: geometry clean', (await geometry()).length === 0, (await geometry()).join('; '));
  await press('Escape', 'Escape (back to pause)');
  f = await focused();
  check('settings: Esc returns to pause with Settings focused', f.text === 'Settings', f.text);
  await press('Escape', 'Escape (resume)');
  await settle();
  check('pause: Esc resumes (menu closed)', await page.evaluate(() => !echoHarness.menu.isOpen()));

  // 5. HUD + dialogue at 200%.
  keys.push('--- walk every page of the long beat at 200% ---');
  const walk = await walkBeat('long');
  check('dialogue 200%: every page ≤2 lines', walk.pages.every((p) => p.lines >= 1 && p.lines <= 2), walk.pages.map((p) => `${p.page}:${p.lines}`).join(' '));
  check('dialogue 200%: pages rejoin to the exact beat text (no word lost)', walk.rejoined);
  const fs200 = await page.evaluate(() => getComputedStyle(document.querySelector('.echo-dialogue__text')).fontSize);
  check('dialogue 200%: caption font is 2× the 100% size (18.4px → 36.8px)', fs200 === '36.8px', fs200);
  await page.evaluate(() => { echoHarness.dialogue.play(echoHarness.BEATS.long); });
  await press('Enter', 'Enter (skip reveal)');
  await settle();
  const g200 = await geometry();
  check('hud+dialogue 200%: nothing leaves the viewport, overflows or overlaps', g200.length === 0, g200.join('; '));
  await shot('06-hud-dialogue-200.png');

  // 6. Reduced motion: transitions measured before (must be non-zero, or the check proves nothing) and after.
  const motion = () => page.evaluate(() => {
    const pick = (s) => document.querySelector(s);
    const els = { dialogue: '.echo-dialogue', prompt: '.echo-hud__prompt', menu: '.echo-menu', button: '.echo-button', hudTop: '.echo-hud__top' };
    const out = {};
    for (const [k, s] of Object.entries(els)) out[k] = getComputedStyle(pick(s)).transitionDuration;
    out.promptKeyAnimation = getComputedStyle(pick('.echo-hud__prompt .echo-key')).animationName;
    return out;
  });
  const before = await motion();
  check('motion off: transitions are non-zero (control)', Object.entries(before).filter(([k]) => k !== 'promptKeyAnimation').every(([, v]) => v.split(',').some((x) => parseFloat(x) > 0)), JSON.stringify(before));
  keys.push('--- reduced motion by keyboard ---');
  await press('Escape');
  await press('Tab');
  await press('Enter'); // Settings
  await press('Tab'); // reduced motion checkbox
  await press('Space');
  const rm = await page.evaluate(() => document.getElementById('ui').dataset.reducedMotion);
  check('settings: Space on Reduced motion sets data-reduced-motion=on', rm === 'on', rm);
  await press('Escape', 'Escape (back)');
  await press('Escape', 'Escape (resume)');
  const after = await motion();
  check('reduced motion: every UI transition computes to 0s', Object.entries(after).filter(([k]) => k !== 'promptKeyAnimation').every(([, v]) => v.split(',').every((x) => parseFloat(x) === 0)), JSON.stringify(after));
  check('reduced motion: prompt pulse animation is none', after.promptKeyAnimation === 'none', after.promptKeyAnimation);
  await page.evaluate((b, a) => {
    const box = document.createElement('pre');
    box.id = 'motion-readout';
    box.style.cssText = 'position:fixed;left:8px;top:45%;z-index:99;background:#000;color:#ffe14d;font:12px ui-monospace,monospace;padding:6px;margin:0';
    box.textContent = 'getComputedStyle(...).transitionDuration\nreduced motion OFF: ' + JSON.stringify(b, null, 0) + '\nreduced motion ON:  ' + JSON.stringify(a, null, 0);
    document.body.append(box);
  }, before, after);
  await shot('07-reduced-motion.png');

  // Title at 200% (scale is still 200 from the settings step).
  // As in the game: the title comes before the HUD and dialogue exist on screen.
  await page.evaluate(() => { document.getElementById('motion-readout').remove(); echoHarness.dialogue.clear(); echoHarness.hud.setVisible(false); echoHarness.menu.showTitle(); });
  await settle();
  const gt = await geometry();
  check('title 200%: nothing leaves the viewport or overflows', gt.length === 0, gt.join('; '));
  await shot('08-title-200.png');

  check('no page errors', errors.length === 0, errors.join(' | '));
  fs.writeFileSync(path.join(out, 'drive-result.json'), JSON.stringify({ url, provenance: prov, keys, checks, failed, errors }, null, 2));
} finally {
  await browser.close();
}
console.log(`\n${checks.length} checks, ${failed} failed`);
process.exit(checks.length === 0 ? 2 : failed ? 1 : 0);
