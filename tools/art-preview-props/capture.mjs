// DEV-ONLY driver: screenshots, draw-call census, autoplay proof and offline cue WAVs.
// Usage: node tools/art-preview-props/capture.mjs <port> <rendersDir>   (serve the repo root first)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const puppeteer = require(`${execSync('npm root -g').toString().trim()}/@modelcontextprotocol/server-puppeteer/node_modules/puppeteer`);
const [port, out] = process.argv.slice(2);
if (!port || !out) { console.error('usage: capture.mjs <port> <outDir>'); process.exit(2); }
mkdirSync(`${out}/audio`, { recursive: true });
const base = `http://127.0.0.1:${port}/tools/art-preview-props`;
const only = process.env.ONLY?.split(',');
const want = (k) => !only || only.includes(k);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=user-gesture-required'],
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const errors = [];
async function open(url, w = 1280, h = 720) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  page.on('pageerror', (e) => errors.push(`${url}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${url}: ${m.text()}`); });
  await page.goto(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  return page;
}
const report = {};

if (want('shots')) {
  const shots = [
    ['lineup-low', 'view=lineup&q=low'], ['lineup-med', 'view=lineup&q=med'], ['lineup-high', 'view=lineup&q=high'],
    ['lineup-after-high', 'view=lineup&q=high&state=after'],
    ['booth-10m', 'view=booth&dist=10'], ['booth-10m-after', 'view=booth&dist=10&state=after'], ['booth-3m-initials', 'view=booth&dist=3&az=1.25'],
    ['relay-10m', 'view=relay&dist=10'], ['relay-10m-after', 'view=relay&dist=10&state=after'],
    ['mast-14m', 'view=mast&dist=14&az=0.75'], ['mast-14m-after', 'view=mast&dist=14&az=0.75&state=after'],
    ['quantum-console-3m', 'view=quantum&dist=3'], ['quantum-console-3m-after', 'view=quantum&dist=3&state=after'],
    ['classical-console-3m', 'view=classical&dist=3'], ['kiosk-4m', 'view=kiosk&dist=4&az=0.2'], ['kiosk-10m', 'view=kiosk&dist=10'],
    ['billboard-slogan-12m', 'view=slogan&dist=12&az=0'], ['billboard-shelter-before-10m', 'view=shelter&dist=10&az=0'],
    ['billboard-shelter-after-10m', 'view=shelter&dist=10&az=0&state=after'], ['holo-8m', 'view=holo&dist=8&az=0'], ['arrow-4m', 'view=arrow&dist=4&az=0'],
    ['tram-far', 'view=tram&dist=6&az=0'],
  ];
  report.shots = {};
  for (const [name, q] of shots) {
    const page = await open(`${base}/?shot=1&${q}`);
    await page.waitForFunction('window.__ready === true', { timeout: 30000 });
    report.shots[name] = await page.evaluate('window.__calls');
    await page.screenshot({ path: `${out}/${name}.png` });
    await page.close();
  }
}

if (want('drawcalls')) {
  const page = await open(`${base}/?view=drawcalls`, 640, 360);
  await page.waitForFunction('window.__ready === true', { timeout: 30000 });
  report.drawcalls = JSON.parse(await page.$eval('#out', (n) => n.textContent));
  await page.close();
}

if (want('proof')) {
  const page = await open(`${base}/audio-proof.html`, 640, 360);
  await page.waitForFunction('!!window.__proof');
  report.before = await page.evaluate('window.__proof.before()');
  await page.click('#gesture');                     // a real trusted input event
  await page.waitForFunction('window.__unlockedByClick !== undefined', { timeout: 10000 });
  report.after = await page.evaluate('window.__proof.after()');
  await page.close();
}

if (want('wav')) {
  const page = await open(`${base}/audio-proof.html`, 640, 360);
  await page.waitForFunction('!!window.__render');
  const jobs = [
    ...['terminal_wake', 'terminal_input', 'terminal_close', 'radio_static_burst', 'ui_success', 'ui_failure', 'door_open'].map((id) => ['cue', id, 2.0]),
    ['cue', 'music_swell', 15], ['reactor', 'reactor_audio_begins', 6],
    ...['alley', 'substation', 'relay', 'rooftop'].map((z) => ['zone', z, 6]),
  ];
  report.wav = {};
  for (const [kind, id, sec] of jobs) {
    const r = await page.evaluate((k, i, s) => window.__render(k, i, s), kind, id, sec);
    const file = `${out}/audio/${kind === 'zone' ? `zone-${id}` : id}.wav`;
    writeFileSync(file, Buffer.from(r.b64, 'base64'));
    report.wav[id] = { file, peakDbfs: +(20 * Math.log10(r.peak || 1e-9)).toFixed(1), rmsDbfs: +(20 * Math.log10(r.rms || 1e-9)).toFixed(1) };
  }
  await page.close();
}

// The autoplay contract (§11.1), asserted — not just printed. Each line names what would be wrong.
const fail = [];
if (report.before) {
  const b = report.before, a = report.after;
  if (b.contextsBeforeUnlock !== 0) fail.push(`an AudioContext existed before any user input (${b.contextsBeforeUnlock})`);
  if (b.oscillatorsBeforeUnlock !== 0) fail.push(`oscillators were created before unlock (${b.oscillatorsBeforeUnlock})`);
  if (b.callErrors.length || b.pageErrors.length) fail.push(`calls before unlock threw: ${[...b.callErrors, ...b.pageErrors].join('; ')}`);
  for (const k of ['unknownCue', 'unknownZone', 'volume101', 'volumeFraction']) if (!b[k]?.startsWith('RangeError')) fail.push(`${k} did not throw a RangeError (${b[k]})`);
  if (a.contextsAfterUnlock !== 1 || !a.unlocked) fail.push(`a real click did not unlock exactly one running context (${a.contextsAfterUnlock}, ${a.unlocked})`);
  if (!(a.successAdded > 0 && a.swellAdded > 0)) fail.push(`cues after unlock created no voices (${a.successAdded}, ${a.swellAdded})`);
  if (a.swellRepeatAdded !== 0) fail.push(`music_swell played twice without reset (${a.swellRepeatAdded} voices)`);
  if (!(a.swellAfterResetAdded > 0)) fail.push('reset() did not unlatch music_swell');
}
if (report.wav) for (const [id, w] of Object.entries(report.wav)) {
  if (w.peakDbfs > -1) fail.push(`${id} clips (peak ${w.peakDbfs} dBFS)`);
  if (w.rmsDbfs < -70) fail.push(`${id} is silent (rms ${w.rmsDbfs} dBFS)`);
}
report.fail = fail;
report.errors = errors;
await browser.close();
writeFileSync(`${out}/capture-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(errors.length || fail.length ? 1 : 0);
