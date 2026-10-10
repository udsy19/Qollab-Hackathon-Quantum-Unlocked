// Gate for Declassified mode (vision §4.5, §6). Drives harness/declassified.html with REAL key
// presses (CDP Input events) and asserts what a player would see.
// Exit 0 green · 1 red · 2 refused (harness did not load, or zero checks).
// Usage: node drive.mjs [outDir] [--root <repo root to serve>]   (serves on port 8771 only)
//
// Independence: expected copy comes from echo/data/teachback.js read here in Node, expected numbers
// from the harness's run record re-formatted here, the credits team line from the owner's ruling
// (typed below, not read from data), the engine kinds from ECHO_MASTER_VISION.md §8.4.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire('/opt/homebrew/lib/node_modules/@modelcontextprotocol/server-puppeteer/');
const puppeteer = require('puppeteer');

const here = path.dirname(fileURLToPath(import.meta.url));
const argRoot = process.argv.indexOf('--root');
const repo = path.resolve(argRoot > 0 ? process.argv[argRoot + 1] : path.join(here, '../../..'));
const out = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : here);
fs.mkdirSync(out, { recursive: true });
const PORT = 8771;
const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };

// ---------------------------------------------------------------- independent expectations
const data = await import(pathToFileURL(path.join(repo, 'echo/data/teachback.js')).href).catch((e) => refuse(`data import: ${e.message}`));
const vision = fs.readFileSync(path.join(repo, 'ECHO_MASTER_VISION.md'), 'utf8');
const ek = vision.match(/type EngineKind = ([^;]+);/);
if (!ek) refuse('EngineKind not found in vision §8.4');
const ENGINE_KINDS = [...ek[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
const TEAM = 'Team The Quantubians (NYU Tandon School of Engineering): Udaya (captain), George, Harman, Epa';
const ket = (s) => s.replace(/\|([^|<>\s]{1,8})>/g, '|$1⟩');
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const fmt = (x) => String(Number(x.toFixed(6)));
const ASCII_KET = /\|[^|<>\s]{1,8}>/;
// A score is a number shown to the player; the phrase "no score" is not one.
const SCORE = /score\s*[:=]?\s*\d|\b[0-3]\s*(\/|of|out of)\s*3\b|\bpoints?\b|correct answers/i;

// ---------------------------------------------------------------- static server (this gate's own port)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(repo, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(repo) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r, j) => server.listen(PORT, '127.0.0.1', r).on('error', j)).catch((e) => refuse(`port ${PORT}: ${e.message}`));

const checks = [];
const keys = [];
let failed = 0;
function check(name, ok, detail = '') {
  checks.push({ name, ok: !!ok, detail: String(detail ?? '').slice(0, 600) });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? '  — ' + String(detail).slice(0, 400) : ''}`);
}

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-first-run', '--force-device-scale-factor=1'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });

async function press(key, label) {
  keys.push(label || key);
  const [mod, k] = key.includes('+') ? key.split('+') : [null, key];
  if (mod) await page.keyboard.down(mod);
  await page.keyboard.press(k);
  if (mod) await page.keyboard.up(mod);
  await new Promise((r) => setTimeout(r, 40));
}
const settle = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: path.join(out, name) });
const DLG = '[role="dialog"][aria-label="Declassified"]';
const focused = () => page.evaluate((DLG) => {
  const a = document.activeElement;
  const cs = getComputedStyle(a);
  const dlg = document.querySelector(DLG);
  return { tag: a.tagName, role: a.getAttribute('role'), text: (a.textContent || '').trim().slice(0, 120), inDialog: !!(dlg && dlg.contains(a)),
    outlineStyle: cs.outlineStyle, outlineWidth: parseFloat(cs.outlineWidth), outlineColor: cs.outlineColor };
}, DLG);
const ringOk = (f) => f.outlineStyle === 'solid' && f.outlineWidth >= 2;
// The visible text of the open panel, as a player reads it.
const panelText = () => page.evaluate(() => {
  const p = [...document.querySelectorAll('[role="tabpanel"]')].find((x) => !x.hidden && x.getClientRects().length);
  return p ? p.innerText : '';
});
// Clipping: inside the dialog nothing is wider than its box, nothing sticks out horizontally, and the
// only vertical overflow allowed is a scroll container the keyboard can reach.
const geometry = () => page.evaluate((DLG) => {
  const W = innerWidth, H = innerHeight, bad = [];
  const dlg = document.querySelector(DLG);
  if (!dlg) return ['no dialog'];
  const d = dlg.getBoundingClientRect();
  if (d.left < -1 || d.top < -1 || d.right > W + 1 || d.bottom > H + 1) bad.push(`dialog out of viewport ${[d.left, d.top, d.right, d.bottom].map(Math.round)}`);
  for (const el of dlg.querySelectorAll('*')) {
    if (el.closest('[hidden]') || !el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) bad.push(`${el.tagName}.${el.className} scrollWidth ${el.scrollWidth} > ${el.clientWidth}`);
    if (r.left < d.left - 1 || r.right > d.right + 1) bad.push(`${el.tagName}.${el.className} sticks out horizontally`);
    const scroller = /auto|scroll/.test(cs.overflowY);
    if (el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 0 && !scroller && cs.overflowY !== 'visible') bad.push(`${el.tagName}.${el.className} clips vertically (overflow ${cs.overflowY})`);
    if (scroller && el.scrollHeight > el.clientHeight + 1 && el.tabIndex < 0) bad.push(`${el.tagName}.${el.className} scrolls but cannot take focus`);
    if (cs.textOverflow === 'ellipsis') bad.push(`${el.tagName}.${el.className} uses ellipsis`);
  }
  return bad;
}, DLG);

try {
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`http://127.0.0.1:${PORT}/evidence/story-ui/harness/declassified.html`, { waitUntil: 'networkidle0' });
  if (!(await page.evaluate(() => !!window.echoHarness))) refuse(`harness did not load: ${errors.join(' | ')}`);
  await page.waitForFunction(() => window.echoHarness.hash);
  const prov = await page.evaluate(() => ({ version: echoHarness.version, hash: echoHarness.hash, files: echoHarness.files }));
  console.log('provenance', JSON.stringify(prov));

  // 0. Control: before Declassified, a started game opens pause on Esc (else the Esc check proves nothing).
  await page.evaluate(() => { echoHarness.menu.showTitle(); document.querySelector('[data-action="start"]').click(); });
  await settle(100);
  await press('Escape', 'Escape (control)');
  check('control: Esc opens pause in a started game', await page.evaluate(() => echoHarness.menu.isOpen() && echoHarness.menu.screen === 'pause'));
  await press('Escape', 'Escape (resume)');
  await settle(100);

  // 1. Open from the ending's button by keyboard.
  await page.evaluate(() => echoHarness.opener.focus());
  await press('Enter', 'Enter (open Declassified)');
  await settle();
  check('open: isOpen() is true', await page.evaluate(() => echoHarness.declassified.isOpen()));
  const dlgInfo = await page.evaluate((DLG) => {
    const d = document.querySelector(DLG);
    return d && { modal: d.getAttribute('aria-modal'), visible: d.getClientRects().length > 0 && getComputedStyle(d).visibility !== 'hidden' };
  }, DLG);
  check('open: a visible modal dialog named Declassified', dlgInfo && dlgInfo.modal === 'true' && dlgInfo.visible, JSON.stringify(dlgInfo));
  let f = await focused();
  check('open: focus moved into the dialog with a visible ring', f.inDialog && ringOk(f), JSON.stringify(f));

  const tabNames = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim()));
  const expectTabs = [data.DECLASSIFIED_UI?.tabs?.journal, ...data.DECLASSIFIED.tabs.map((t) => t.title.text), data.DECLASSIFIED_UI?.tabs?.teachback, data.DECLASSIFIED_UI?.tabs?.credits];
  check('tabs: journal, the 3 §4.5 tabs, teach-back, credits, in that order', JSON.stringify(tabNames) === JSON.stringify(expectTabs), JSON.stringify(tabNames));

  // 2. Journal (first tab): every number from the record, each inside a group labelled with its engine.
  const rec = await page.evaluate(() => echoHarness.SAMPLE);
  const journal = await panelText();
  const want = [];
  for (const c of rec.clone) want.push(...Object.values(c.observables).map(fmt), ...Object.values(c.probabilities).map(fmt));
  for (const r of rec.relay) want.push(r.parameters.senderGate, ...Object.values(r.probabilities).map(fmt));
  for (const d of rec.dryRuns) want.push(fmt(d.result.fidelity));
  want.push(fmt(rec.commit.fidelity));
  const missingNums = want.filter((w) => !journal.includes(w));
  check('journal: every value in the run record is shown', missingNums.length === 0 && journal.length > 0, `missing ${missingNums.join(',')}`);
  const groups = await page.evaluate(() => [...document.querySelectorAll('[role="tabpanel"]:not([hidden]) [data-engine]')].map((g) => ({ engine: g.dataset.engine, text: g.innerText })));
  const recEngines = [...rec.clone, ...rec.relay, ...rec.dryRuns.map((d) => d.result), rec.commit].map((r) => r.engine);
  check('journal: one engine-labelled group per recorded result, in record order', JSON.stringify(groups.map((g) => g.engine)) === JSON.stringify(recEngines), JSON.stringify(groups.map((g) => g.engine)));
  const labelMiss = groups.filter((g) => !g.text.includes(data.RUN_JOURNAL?.engines?.[g.engine] ?? '\u0000'));
  check('journal: each group shows its engine label text', groups.length > 0 && labelMiss.length === 0, labelMiss.map((g) => g.engine).join(','));
  check('journal: every engine kind in vision §8.4 has a label', ENGINE_KINDS.every((k) => typeof data.RUN_JOURNAL?.engines?.[k] === 'string'), ENGINE_KINDS.join(','));
  const loose = await page.evaluate(() => {
    const p = document.querySelector('[role="tabpanel"]:not([hidden])');
    if (!p) return ['no panel'];
    const bad = [];
    const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (/\d/.test(n.textContent) && !n.parentElement.closest('[data-engine]') && n.parentElement.getClientRects().length) bad.push(n.textContent.trim());
    }
    return bad;
  });
  check('journal: no number outside an engine-labelled group', loose.length === 0, loose.join(' | '));
  check('journal: bits carry BIT_LABELS (SOURCE READOUT m0 / LOCAL BELL-HALF READOUT m1)', (journal.match(/SOURCE READOUT m0/g) || []).length >= 3 && (journal.match(/LOCAL BELL-HALF READOUT m1/g) || []).length >= 3);
  const nr = data.RUN_JOURNAL?.notRecorded ?? '\u0000';
  // innerText applies CSS text-transform, so headings are matched case-insensitively.
  const backendIdx = journal.toLowerCase().indexOf((data.RUN_JOURNAL?.sections?.backend ?? '\u0000').toLowerCase());
  check('journal: absent backend job reads "not recorded"', backendIdx >= 0 && journal.slice(backendIdx).includes(nr), journal.slice(-300));
  // m0=1, m1=0 in both sample dry runs: the rule is Z only (X iff m1=1, Z iff m0=1).
  const rules = [...journal.matchAll(/Rule for these bits[^\n]*\n\s*([^\n]+)/g)].map((x) => x[1].trim());
  check('journal: dry-run rule line reads Z only for m0=1, m1=0 (both dry runs)', rules.length === 2 && rules.every((r) => /^Z\b/.test(r) && !/\bX\b/.test(r)), JSON.stringify(rules));
  check('journal: no ASCII ket on screen', !ASCII_KET.test(journal), journal.match(ASCII_KET)?.[0]);
  await shot('01-journal.png');

  // 3. Each §4.5 tab by ArrowRight: every data line present, kets rendered as ⟩, no ASCII ket left.
  await page.evaluate(() => document.querySelector('[role="tab"]')?.focus());
  for (const [i, t] of data.DECLASSIFIED.tabs.entries()) {
    await press('ArrowRight', `ArrowRight (→ ${t.title.text})`);
    await settle(80);
    f = await focused();
    const sel = await page.evaluate(() => document.activeElement.getAttribute('aria-selected'));
    check(`tab ${t.title.text}: ArrowRight focuses and selects it, ring visible`, f.role === 'tab' && f.text.includes(t.title.text) && sel === 'true' && ringOk(f), JSON.stringify(f));
    const txt = await panelText();
    const lines = [t.whatIDid, t.whatTheQubitsDid, t.gates, ...t.expected, t.misconception.wrong, t.misconception.why, t.verificationNote].filter(Boolean).map(ket);
    const miss = lines.filter((l) => !norm(txt).includes(norm(l)));
    check(`tab ${t.title.text}: every data line shown whole, kets as |x⟩`, miss.length === 0 && txt.length > 0, miss.join(' || '));
    check(`tab ${t.title.text}: no ASCII ket on screen`, !ASCII_KET.test(txt), (txt.match(new RegExp(ASCII_KET, 'g')) || []).join(' '));
    await shot(`0${2 + i}-tab-${t.id}.png`);
  }
  check('provenance note shown on a science tab', norm(await panelText()).includes(norm(data.DECLASSIFIED.provenanceNote)));

  // 4. Teach-back: Tab to every choice, Enter, read its why. No score anywhere.
  await press('ArrowRight', 'ArrowRight (→ teach-back)');
  await settle(80);
  const tbChoices = data.TEACHBACK.flatMap((q) => q.choices.map((c) => ({ q: q.question, text: c.right ?? c.wrong, why: c.why, right: !!c.right })));
  const seenWhy = new Set();
  const qSeen = new Set();
  let whyShot = false;
  for (let i = 0; i < 40 && seenWhy.size < tbChoices.length; i++) {
    await press('Tab');
    f = await focused();
    if (!f.inDialog || !ringOk(f)) { check('teach-back: focus stays in the dialog with a ring', false, JSON.stringify(f)); break; }
    const c = tbChoices.find((x) => norm(f.text).endsWith(norm(ket(x.text))));
    if (!c || seenWhy.has(c.text)) continue;
    await press('Enter', `Enter (choose "${c.text.slice(0, 30)}…")`);
    await settle(60);
    const fb = await page.evaluate((q) => {
      const field = [...document.querySelectorAll('[data-question]')].find((x) => x.innerText.includes(q));
      const live = field && field.querySelector('[aria-live]');
      return live ? live.innerText : '';
    }, c.q);
    const mark = c.right ? data.DECLASSIFIED_UI?.rightMark : data.DECLASSIFIED_UI?.wrongMark;
    if (mark && norm(fb).includes(norm(ket(c.why))) && fb.includes(mark)) { seenWhy.add(c.text); qSeen.add(c.q); }
    else check(`teach-back: "${c.text.slice(0, 40)}" shows its why`, false, fb);
    if (!whyShot && !c.right && c.q === data.TEACHBACK[1].question) { whyShot = true; await shot('07-teachback-why.png'); }
  }
  check(`teach-back: all ${tbChoices.length} choices reached by Tab, each showed its why and a right/not-quite mark`, seenWhy.size === tbChoices.length, `${seenWhy.size}/${tbChoices.length}`);
  check('teach-back: all 3 questions answered', qSeen.size === 3, qSeen.size);
  const tbText = await panelText();
  check('teach-back: the 3 §4.5 questions shown verbatim', tbText.length > 0 && data.TEACHBACK.every((q) => tbText.includes(q.question)));
  check('teach-back: no score shown', tbText.length > 0 && !SCORE.test(tbText), tbText.match(SCORE)?.[0]);
  check('teach-back: no ASCII ket on screen', !ASCII_KET.test(tbText));
  await shot('06-teachback.png');

  // 5. Credits: owner-ruled team line verbatim, MIT line, support line, no email.
  await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].find((t) => t.getAttribute('aria-selected') === 'true')?.focus());
  await press('ArrowRight', 'ArrowRight (→ credits)');
  await settle(80);
  const cr = await panelText();
  check('credits: owner-ruled team line, verbatim', cr.includes(TEAM), cr.slice(0, 200));
  check('credits: license line names udsy19 and contributors and MIT', /MIT/.test(cr) && cr.includes('udsy19 and contributors'));
  check('credits: "This effort is supported by Qollab & IonQ"', cr.includes('This effort is supported by Qollab & IonQ'));
  check('credits: no email address anywhere in the dialog', !(await page.evaluate((DLG) => /\S+@\S+\.\S+/.test(document.querySelector(DLG)?.innerText ?? 'x@y.z'), DLG)));
  check('credits: every CREDITS row from the data is shown', cr.length > 0 && data.CREDITS.every((c) => cr.includes(c.text)), data.CREDITS.filter((c) => !cr.includes(c.text)).map((c) => c.role).join(','));
  await shot('08-credits.png');
  const evs = await page.evaluate(() => echoHarness.log.filter((l) => l[0] === 'event').map((l) => l[1]));
  check('credits: opening the credits tab fired OPEN_CREDITS once', evs.filter((e) => e === 'OPEN_CREDITS').length === 1, JSON.stringify(evs));

  // 6. Focus trap: 2×(focusable count)+2 Tab/Shift+Tab presses never leave the dialog, ring always on.
  const nFocus = await page.evaluate((DLG) => document.querySelector(DLG)?.querySelectorAll('button,[tabindex="0"]').length ?? 0, DLG);
  let trapOk = true, trapDetail = '';
  for (let i = 0; i < nFocus * 2 + 2; i++) {
    await press(i % 3 === 2 ? 'Shift+Tab' : 'Tab');
    f = await focused();
    if (!f.inDialog || !ringOk(f)) { trapOk = false; trapDetail = JSON.stringify(f); break; }
  }
  check(`focus: trapped and visible over ${nFocus * 2 + 2} Tab/Shift+Tab presses`, trapOk && nFocus > 0, trapDetail);

  // 7. Esc while open: pause must NOT open; Esc closes Declassified (CLOSE_SCIENCE) and focus returns.
  await page.evaluate(() => document.querySelector('[role="tab"]')?.focus());
  await press('Escape', 'Escape (in Declassified)');
  await settle(100);
  const afterEsc = await page.evaluate(() => ({ pause: echoHarness.menu.isOpen(), open: echoHarness.declassified.isOpen(), focusOpener: document.activeElement === echoHarness.opener, events: echoHarness.log.filter((l) => l[0] === 'event').map((l) => l[1]) }));
  check('esc: pause did not open while Declassified owned Esc', afterEsc.pause === false, JSON.stringify(afterEsc));
  check('esc: Declassified closed and focus returned to the opener', afterEsc.open === false && afterEsc.focusOpener, JSON.stringify(afterEsc));
  await press('Escape', 'Escape (after close: pause allowed again)');
  check('esc: after close, Esc opens pause again (pause re-allowed)', await page.evaluate(() => echoHarness.menu.isOpen()));
  await press('Escape', 'Escape (resume)');
  await settle(100);

  // 8. Missing fields → "not recorded", never a default or NaN.
  await page.evaluate(() => echoHarness.declassified.open(echoHarness.SPARSE));
  await settle();
  const sp = await panelText();
  const nrCount = sp.split(nr).length - 1;
  check('sparse: relay, dry runs, commit fidelity and backend each read "not recorded" (≥4)', nrCount >= 4, `${nrCount} in: ${sp.slice(0, 400)}`);
  check('sparse: invalid result shown as not recorded (contract check), engine not invented', sp.includes(data.RUN_JOURNAL?.invalid ?? '\u0000') && !sp.includes('made_up_engine'), sp.slice(0, 300));
  check('sparse: no NaN / undefined / null / default 0.5 on screen', sp.length > 0 && !/NaN|undefined|null|0\.5\b/.test(sp), sp.match(/NaN|undefined|null|0\.5\b/)?.[0]);
  check('sparse: commit bits still shown (m0 = 0, m1 = 1)', /SOURCE READOUT m0\D{0,6}0[\s\S]{0,80}LOCAL BELL-HALF READOUT m1\D{0,6}1/.test(sp), sp.slice(-300));
  await shot('09-missing-fields.png');
  await page.evaluate(() => echoHarness.declassified.close());
  await settle(100);

  // 9. Reduced motion: transitions measured with it off (control: non-zero) and on (all zero).
  await page.evaluate(() => echoHarness.declassified.open(echoHarness.SAMPLE));
  await settle();
  const motion = () => page.evaluate((DLG) => {
    const d = document.querySelector(DLG);
    if (!d) return { durations: [], animations: [] };
    const els = [d, d.querySelector('[role="tab"]'), d.querySelector('[role="tabpanel"]:not([hidden])'), ...d.querySelectorAll('button')].filter(Boolean);
    return { durations: els.map((e) => getComputedStyle(e).transitionDuration), animations: els.map((e) => getComputedStyle(e).animationName) };
  }, DLG);
  const before = await motion();
  check('motion off (control): the dialog animates (some transition > 0)', before.durations.some((v) => v.split(',').some((x) => parseFloat(x) > 0)), JSON.stringify(before.durations.slice(0, 4)));
  await page.evaluate(() => echoHarness.menu.setSettings({ reducedMotion: true }));
  const after = await motion();
  check('reduced motion: every transition is 0s and no animation runs', after.durations.length > 0 && after.durations.every((v) => v.split(',').every((x) => parseFloat(x) === 0)) && after.animations.every((a) => a === 'none'), JSON.stringify(after).slice(0, 300));
  await page.evaluate((b, a) => {
    const box = document.createElement('pre');
    box.id = 'motion-readout';
    box.style.cssText = 'position:fixed;left:8px;bottom:28px;z-index:99;background:#000;color:#ffe14d;font:12px ui-monospace,monospace;padding:6px;margin:0;white-space:pre-wrap;max-width:60vw';
    box.textContent = `getComputedStyle().transitionDuration (dialog, tab, panel, first buttons)\nreduced motion OFF: ${b.durations.slice(0, 5).join(' | ')}\nreduced motion ON:  ${a.durations.slice(0, 5).join(' | ')}`;
    document.body.append(box);
  }, before, after);
  await shot('10-reduced-motion.png');
  await page.evaluate(() => { document.getElementById('motion-readout').remove(); echoHarness.menu.setSettings({ reducedMotion: false }); });

  // 10. 200% text at 1280×720 and 1024×640: no clipping on any tab.
  await page.evaluate(() => echoHarness.menu.setSettings({ textScale: 200 }));
  for (const [w, h] of [[1280, 720], [1024, 640]]) {
    await page.setViewport({ width: w, height: h });
    await settle(150);
    await page.evaluate(() => document.querySelector('[role="tab"]')?.focus());
    await press('Home');
    for (let i = 0; i < expectTabs.length; i++) {
      if (i) await press('ArrowRight');
      await settle(60);
      const g = await geometry();
      const fs200 = await page.evaluate(() => { const p = document.querySelector('[role="tabpanel"]:not([hidden])'); return p ? getComputedStyle(p).fontSize : '0px'; });
      check(`200% ${w}×${h} tab ${expectTabs[i]}: no clipping (font ${fs200})`, g.length === 0 && parseFloat(fs200) >= 28, g.slice(0, 5).join('; '));
      if (w === 1280 && (i === 0 || i === 4)) await shot(`11-200pct-${w}-${i === 0 ? 'journal' : 'teachback'}.png`);
      if (w === 1024 && i === 3) await shot(`12-200pct-${w}-transfer.png`);
    }
  }

  check('no page errors', errors.length === 0, errors.join(' | '));
  fs.writeFileSync(path.join(out, 'drive-result.json'), JSON.stringify({ provenance: prov, keys, checks, failed, errors }, null, 2));
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${checks.length} checks, ${failed} failed`);
process.exit(checks.length === 0 ? 2 : failed ? 1 : 0);
