// Drives shell.html with REAL key presses (CDP Input events, so Tab really moves focus) and
// asserts what the player would see. Exit 0 green · 1 red · 2 refused (harness did not load).
// Usage: node drive.mjs <port> <outDir> [WIDTHxHEIGHT]   (default 1280x720)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('/opt/homebrew/lib/node_modules/@modelcontextprotocol/server-puppeteer/');
const puppeteer = require('puppeteer');

const port = process.argv[2] || '8742';
const out = process.argv[3] || 'evidence/story-ui/ui-shell';
const [vw, vh] = (process.argv[4] || '1280x720').split('x').map(Number);
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
await page.setViewport({ width: vw, height: vh });
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

// An ASCII ket on screen (|0>, |+>, |00>) is a defect; the data keeps them, the screen must not.
const ASCII_KET = /\|[^|<>\s]{1,8}>/;

// Walks beats page by page with real Enter presses and returns what each page showed.
async function walkBeats(beats) {
  await page.evaluate((b) => { echoHarness.dialogue.play(b); }, beats);
  const pages = [];
  // Enter skips a reveal only while one is running; pressing it on a finished page would advance
  // and put the walk out of phase. "Finished" = the visible text equals the page's screen-reader
  // copy (used to steer the walk only; grading compares against the source data).
  const revealing = () => page.evaluate(() => {
    const live = document.querySelector('.echo-dialogue .echo-sr-only').textContent;
    return !live.endsWith(document.querySelector('.echo-dialogue__text').textContent) || document.querySelector('.echo-dialogue__text').textContent === '';
  });
  for (let i = 0; i < 400; i++) {
    if (await revealing()) await press('Enter', 'Enter (skip reveal)');
    const d = await dialogueLines();
    d.beat = await page.evaluate(() => echoHarness.dialogue.element.querySelector('.echo-dialogue__speaker').textContent);
    pages.push(d);
    await press('Enter', 'Enter (next)');
    if (!(await page.evaluate(() => echoHarness.dialogue.active))) break;
  }
  return pages;
}
function grade(pages, beats) {
  // Rejoin the pages into the script, in order, with kets mapped back to ASCII.
  const words = pages.map((p) => p.text.replace(/⟩/g, '>')).join(' ').split(/\s+/).filter(Boolean);
  const source = beats.map((b) => b.text.trim().split(/\s+/)).flat();
  const asciiOnScreen = pages.filter((p) => ASCII_KET.test(p.text)).map((p) => p.text);
  const ketsInSource = beats.map((b) => (b.text.match(new RegExp(ASCII_KET, 'g')) || []).length).reduce((a, b) => a + b, 0);
  const ketsOnScreen = pages.map((p) => (p.text.match(/\|[^|<>\s]{1,8}⟩/g) || []).length).reduce((a, b) => a + b, 0);
  return { rejoined: words.join(' ') === source.join(' '), asciiOnScreen, ketsInSource, ketsOnScreen,
    overTwo: pages.filter((p) => !(p.lines >= 1 && p.lines <= 2)) };
}
// For every page that ends mid-sentence, render the sentence holding the break ALONE in a clone of
// the live text box (same width and font) and count its lines. A mid-sentence break is allowed only
// when that sentence by itself is longer than 2 lines.
const midSentence = (pages, beats) => page.evaluate((pages, beats) => {
  const live = document.querySelector('.echo-dialogue__text');
  const probe = live.cloneNode(false);
  const r = live.getBoundingClientRect();
  probe.style.cssText = `position:fixed;left:0;top:0;width:${r.width}px;visibility:hidden;min-height:0`;
  live.parentNode.append(probe);
  const lh = parseFloat(getComputedStyle(probe).lineHeight);
  const end = /[.?!…]["'”’)\]]*$/;
  const bad = [];
  // The probe must measure what the live box would: a narrower or smaller-type probe makes every
  // sentence "longer than 2 lines" and this check vacuous (sabotage S12 found that null).
  const pf = getComputedStyle(probe).fontSize, lf = getComputedStyle(live).fontSize;
  if (Math.abs(probe.clientWidth - live.clientWidth) > 1 || pf !== lf) bad.push(`probe ${probe.clientWidth}px/${pf} does not match the live box ${live.clientWidth}px/${lf}`);
  let bi = 0, consumed = 0;
  const beatWords = beats.map((b) => b.text.trim().split(/\s+/));
  for (const p of pages) {
    consumed += p.text.split(/\s+/).filter(Boolean).length;
    const words = beatWords[bi];
    if (consumed < words.length && !end.test(words[consumed - 1])) {
      let s = consumed - 1; while (s > 0 && !end.test(words[s - 1])) s -= 1;
      let e = consumed - 1; while (e < words.length - 1 && !end.test(words[e])) e += 1;
      probe.textContent = words.slice(s, e + 1).join(' ').replace(/\|([^|<>\s]{1,8})>/g, '|$1⟩');
      const lines = Math.round(probe.scrollHeight / lh);
      if (lines <= 2) bad.push(`"${p.text}" breaks mid-sentence, yet "${probe.textContent}" fits in ${lines} line(s)`);
    }
    if (consumed >= words.length) { bi += 1; consumed = 0; }
  }
  probe.remove();
  return bad;
}, pages, beats);

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
  check('settings: opened from pause, Caption style focused', f.id === 'echo-set-captionStyle', JSON.stringify(f));
  // Captions are always on (owner ruling): no control in the menu may turn them off, and the
  // caption-style select offers exactly the contract's styles.
  const capCtl = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.echo-menu label')].map((l) => l.textContent.trim());
    const toggles = [...document.querySelectorAll('.echo-menu input[type=checkbox]')].map((c) => document.querySelector(`label[for="${c.id}"]`)?.textContent.trim() || c.name);
    const sel = document.querySelector('.echo-menu select[name="captionStyle"]');
    return { labels, toggles, options: sel ? [...sel.options].map((o) => o.value) : null, contract: [...echoHarness.CAPTION_STYLES] };
  });
  check('settings: no Subtitles/captions on-off control exists', !capCtl.labels.some((l) => /subtit/i.test(l)) && !capCtl.toggles.some((t) => /subtit|caption/i.test(t)), JSON.stringify(capCtl));
  check('settings: caption-style select offers exactly contracts.CAPTION_STYLES', JSON.stringify(capCtl.options) === JSON.stringify(capCtl.contract), JSON.stringify(capCtl));
  // Form controls read in the UI's own type, not the system font: the select and its options
  // compute the same font-family as the settings labels beside them.
  const fonts = await page.evaluate(() => {
    const ff = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontFamily : null; };
    return { label: ff('.echo-settings__label'), select: ff('.echo-menu select'), option: ff('.echo-menu select option'), button: ff('.echo-menu .echo-button') };
  });
  check('settings: select and options use the UI font, not the system font', fonts.select === fonts.label && fonts.option === fonts.label && !/^system-ui/.test(fonts.select || 'system-ui'), JSON.stringify(fonts));
  check('settings: the focused first control shows a 3px focus ring', /solid 3px/.test(f.outline), f.outline);
  await shot('05a-settings-caption-style.png');
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
  const longBeats = await page.evaluate(() => echoHarness.BEATS.long);
  const walkPages = await walkBeats(longBeats);
  const walk = grade(walkPages, longBeats);
  check('dialogue 200%: every page ≤2 lines', walk.overTwo.length === 0, walkPages.map((p) => `${p.page}:${p.lines}`).join(' '));
  check('dialogue 200%: pages rejoin to the exact beat text (no word lost)', walk.rejoined);
  const walkMid = await midSentence(walkPages, longBeats);
  check('dialogue 200%: a page breaks mid-sentence only when that sentence alone exceeds 2 lines', walkMid.length === 0, walkMid.join(' | '));
  check('dialogue 200%: no ASCII ket on screen; every |x> shows as |x⟩', walk.asciiOnScreen.length === 0 && walk.ketsOnScreen === walk.ketsInSource && walk.ketsInSource > 0, JSON.stringify({ ascii: walk.asciiOnScreen, inSource: walk.ketsInSource, onScreen: walk.ketsOnScreen }));
  // Every spoken beat in echo/data/story.js, walked at 200% with real Enter presses.
  const script = await page.evaluate(() => echoHarness.SCRIPT);
  const scriptPages = await walkBeats(script);
  const sg = grade(scriptPages, script);
  const sMid = await midSentence(scriptPages, script);
  check(`script 200%: all ${script.length} beats, every page ≤2 lines`, script.length > 50 && sg.overTwo.length === 0, sg.overTwo.map((p) => `${p.lines}: ${p.text}`).join(' | '));
  check('script 200%: pages rejoin to the exact script (no word lost)', sg.rejoined);
  check('script 200%: no page breaks mid-sentence unless the sentence alone exceeds 2 lines', sMid.length === 0, sMid.join(' | '));
  check('script 200%: no ASCII ket on screen', sg.asciiOnScreen.length === 0 && sg.ketsOnScreen === sg.ketsInSource && sg.ketsInSource > 0, JSON.stringify({ ascii: sg.asciiOnScreen, inSource: sg.ketsInSource, onScreen: sg.ketsOnScreen }));
  fs.writeFileSync(path.join(out, 'script-pages-200.txt'), scriptPages.map((p) => `[${p.beat} ${p.page || '1/1'} · ${p.lines} line(s)] ${p.text}`).join('\n') + '\n');
  const fs200 = await page.evaluate(() => getComputedStyle(document.querySelector('.echo-dialogue__text')).fontSize);
  check('dialogue 200%: caption font is 2× the 100% size (18.4px → 36.8px)', fs200 === '36.8px', fs200);
  await page.evaluate(() => { echoHarness.dialogue.play(echoHarness.BEATS.long); });
  await press('Enter', 'Enter (skip reveal)');
  await settle();
  const g200 = await geometry();
  check('hud+dialogue 200%: nothing leaves the viewport, overflows or overlaps', g200.length === 0, g200.join('; '));
  await shot('06-hud-dialogue-200.png');
  // HUD kets and row integrity at 200%. The top row holds objective and countdown side by side
  // (§6.3); if it is allowed to wrap, the countdown drops under the objective and this goes red.
  await page.evaluate(() => echoHarness.hud.showTooltip('Q-SOURCE HOLDS |ψ> · TEST STATE |+>', { duration: 0 }));
  await settle();
  const hudRow = await page.evaluate(() => {
    const o = document.querySelector('.echo-hud__objective').getBoundingClientRect();
    const t = document.querySelector('.echo-hud__timer').getBoundingClientRect();
    return { objTop: Math.round(o.top), timerTop: Math.round(t.top), objRight: Math.round(o.right), timerLeft: Math.round(t.left), tooltip: document.querySelector('.echo-hud__tooltip').textContent };
  });
  check('hud 200%: countdown stays on the objective row (top row does not wrap)', Math.abs(hudRow.objTop - hudRow.timerTop) <= 1 && hudRow.timerLeft >= hudRow.objRight, JSON.stringify(hudRow));
  check('hud: tooltip shows kets as |x⟩, never ASCII', !ASCII_KET.test(hudRow.tooltip) && /\|ψ⟩/.test(hudRow.tooltip), hudRow.tooltip);
  const gh = await geometry();
  check('hud 200% with tooltip: nothing leaves the viewport, overflows or overlaps', gh.length === 0, gh.join('; '));
  await shot('06b-hud-200.png');
  await page.evaluate(() => echoHarness.hud.hideTooltip());
  // Page 2 of the long beat: the ket sentence, starting where page 1's sentence ended.
  await press('Enter', 'Enter (next page)');
  await press('Enter', 'Enter (skip reveal)');
  await settle();
  const p2 = await dialogueLines();
  check('dialogue 200%: page 2 opens on a new sentence and shows |0⟩ |1⟩ |+⟩', /^The duplicator/.test(p2.text) && /\|0⟩.*\|1⟩.*\|\+⟩/.test(p2.text), JSON.stringify(p2));
  await shot('06c-dialogue-200-ket-page.png');
  // A stale caller that still passes the retired subtitles:false must not hide the story, and
  // the menu reports settings that pass the platform contract.
  await page.evaluate(() => echoHarness.menu.setSettings({ subtitles: false }));
  const capOn = await page.evaluate(() => ({ display: getComputedStyle(document.querySelector('.echo-dialogue')).display,
    attr: document.getElementById('ui').dataset.subtitles ?? null, errors: echoHarness.validateSettings(echoHarness.menu.getSettings()) }));
  check('captions always on: setSettings({subtitles:false}) leaves the dialogue displayed', capOn.display !== 'none' && capOn.attr === null, JSON.stringify(capOn));
  check('settings: menu.getSettings() passes contracts.validateSettings', capOn.errors.length === 0, capOn.errors.join('; '));

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
