// DEV-ONLY: plays the harness in headless Chrome by clicking its buttons, the way a person would,
// including the bad paths (spam, injected failure, wrong corrections, reset mid-call).
// Usage: node dev/gameplay/playthrough.mjs <port> <outDir>   (a server must be serving the repo root)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const puppeteer = require(`${execSync('npm root -g').toString().trim()}/@modelcontextprotocol/server-puppeteer/node_modules/puppeteer`);
const [port = '8611', out = 'evidence/gameplay-quest-core'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${port}/dev/gameplay/harness.html?t=${Date.now()}`, { waitUntil: 'networkidle0' });

const state = () => page.evaluate(() => window.__harness.machine.state);
const note = () => page.$eval('.dt-note', (n) => n.textContent);
async function click(text) {
  const ok = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t && !x.disabled);
    if (!b) return false; b.click(); return true;
  }, text);
  if (!ok) throw new Error(`no enabled button "${text}" in ${await state()}`);
}
const settle = () => page.waitForFunction(() => ![...document.querySelectorAll('.dt-actions button')].some((b) => b.disabled), { timeout: 5000 });
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const steps = [];
async function step(text, expectState) {
  await click(text); await settle();
  const s = await state();
  steps.push(`${text} -> ${s} | ${await note()}`);
  if (expectState && s !== expectState) throw new Error(`after "${text}" expected ${expectState}, got ${s}: ${await note()}`);
}

await step('Boot', 'TITLE');
await step('Start', 'OPENING');
await step('Skip opening', 'FREE_ROAM_ALLEY');
await step('E at booth', 'CLONE_INTRO');
await click('repeat last accepted event 5×'); // spam E at the booth: OPEN_CLONE_BOOTH is no longer valid
if (await state() !== 'CLONE_INTRO') throw new Error('repeat advanced the quest');
await step('Duplicate plus', 'CLONE_INTRO'); // wrong order: superposition before basis does nothing
await step('Duplicate zero', 'CLONE_BASIS_PASSED');
await click('fail next quantum call');
await step('Duplicate plus', 'CLONE_BASIS_PASSED'); // injected failure: honest error, no progress
await shot('01-injected-failure-no-progress');
await step('Duplicate plus', 'CLONE_SUPERPOSITION_FAILED'); // retry succeeds
await shot('02-clone-superposition-failed');
await step('Read the scan', 'CLONE_UNDERSTOOD');
await step('Leave booth', 'RELAY_UNLOCKED');
await step('E at relay', 'RELAY_INTRO');
await step('Sender I', 'RELAY_BELL_CREATED');
await step('Sender I', 'RELAY_BELL_CREATED'); // doing nothing is not an attempt to signal
await step('Sender X', 'RELAY_SEND_FAILED');
await shot('03-relay-receiver-marginal');
await step('Read receiver panel', 'RELAY_UNDERSTOOD');
await step('Open rooftop', 'ROOFTOP_UNLOCKED');
await step('E at socket', 'LINK_REPAIRED');
await step('Start calibration', 'TELEPORT_DRY_RUN');

// Dry run: first a deliberately wrong choice (no corrections when some are needed), then the right one.
async function dryRun(correct) {
  await click('Bell-measure a calibration qubit');
  const bits = await page.evaluate(() => {
    const m = document.querySelector('.dt-actions span').textContent.match(/m0=(\d) m1=(\d)/);
    return { m0: +m[1], m1: +m[2] };
  });
  let x = bits.m1 === 1; let z = bits.m0 === 1;
  if (!correct) { x = !x; z = !z; } // flip both so the choice is wrong for every bit pair
  await page.evaluate((x, z) => { document.getElementById('dt-x').checked = x; document.getElementById('dt-z').checked = z; }, x, z);
  return bits;
}
await dryRun(false); await step('Apply & verify', 'TELEPORT_DRY_RUN');
await shot('04-dry-run-wrong-corrections');
await dryRun(true); await step('Apply & verify', 'TELEPORT_DRY_RUN_PASSED');
await step('COMMIT TRANSFER (story token, once)', 'TELEPORT_COMMITTED');
await shot('05-committed');
const recommit = await page.evaluate(() => window.__harness.machine.send('COMMIT_TRANSFER'));
steps.push(`direct second COMMIT_TRANSFER -> ${JSON.stringify(recommit)}`);
if (recommit.ok) throw new Error('second commit accepted');
await step('Transfer animation ends', 'ENDING');
await step('Declassified', 'DECLASSIFIED');
await step('Credits', 'CREDITS');
await shot('06-credits');
await step('Restart', 'TITLE');

// Reset mid-call: a result arriving after reset must be dropped.
for (const t of ['Start', 'Skip opening', 'E at booth']) await click(t);
await click('Duplicate zero');
await click('reset()');
await settle();
steps.push(`reset during in-flight clone -> ${await state()} | ${await note()}`);
if (await state() !== 'TITLE') throw new Error('stale result advanced the quest after reset');
await shot('07-reset-mid-call');

const log = await page.$eval('#log', (n) => n.innerText);
console.log(steps.join('\n'));
console.log('--- page errors:', errors.length ? errors : 'none');
console.log('--- bus log (newest first):\n' + log);
await browser.close();
if (errors.length) process.exit(1);
