// DEV-ONLY: plays the harness in headless Chrome by clicking its buttons, the way a person would,
// including the bad paths: spam, injected bridge failure, acknowledgement before the panel, wrong
// corrections retried on a fresh state, a failed commit retried, RESTART from ENDING, a stale
// result after resetGame(), and an engine fault after measurement: the commit latches, the honest
// error offers RESTART, and the next session commits.
// Usage: node dev/gameplay/playthrough.mjs <port> <outDir>
//   (serve with `python3 dev/gameplay/dev_engine.py <port>`: the repo root + the real-Qiskit dev engine)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const puppeteer = require(`${execSync('npm root -g').toString().trim()}/@modelcontextprotocol/server-puppeteer/node_modules/puppeteer`);
const [port, out = 'evidence/gameplay-contracts-migration/playthrough'] = process.argv.slice(2);
if (!port) { console.error('usage: playthrough.mjs <port> [outDir]'); process.exit(2); }
mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${port}/dev/gameplay/harness.html?t=${Date.now()}`, { waitUntil: 'networkidle0' });
// Engine commit calls per session, counted at the quantum adapter (outside the machine), so the
// one-measurement-per-token claim does not rest on the machine's own latch.
await page.evaluate(() => {
  const h = window.__harness; const real = h.quantum.commitStoryToken;
  h.commitCalls = {};
  h.quantum.commitStoryToken = (...a) => { h.commitCalls[h.machine.epoch] = (h.commitCalls[h.machine.epoch] ?? 0) + 1; return real(...a); };
});
const commitCalls = () => page.evaluate(() => ({ ...window.__harness.commitCalls }));

const state = () => page.evaluate(() => window.__harness.machine.state);
const latch = () => page.evaluate(() => window.__harness.machine.commit);
const note = () => page.$eval('.dt-note', (n) => n.textContent);
const steps = [];
const fail = async (msg) => { console.log(steps.join('\n')); throw new Error(`${msg} (state ${await state()}, note: ${await note()})`); };
async function click(text) {
  const ok = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t && !x.disabled);
    if (!b) return false; b.click(); return true;
  }, text);
  if (!ok) await fail(`no enabled button "${text}"`);
}
const enabled = (text) => page.evaluate((t) => [...document.querySelectorAll('button')].some((x) => x.textContent.trim() === t && !x.disabled), text);
// The terminal's note ends in "…" while a quantum call is in flight.
const settle = () => page.waitForFunction(() => !document.querySelector('.dt-note').textContent.endsWith('…'), { timeout: 5000 });
let shotN = 0;
const shot = async (name) => { shotN++; await page.screenshot({ path: `${out}/${String(shotN).padStart(2, '0')}-${name}.png` }); };
async function step(text, expectState) {
  await click(text); await settle();
  const s = await state();
  steps.push(`${text} -> ${s} [latch ${await latch()}] | ${await note()}`);
  if (expectState && s !== expectState) await fail(`after "${text}" expected ${expectState}`);
}

// One calibration attempt. Bits are read from the screen first, then X/Z chosen (owner ruling).
async function dryRun(correct) {
  await step('Bell-measure a fresh calibration qubit');
  const bits = await page.evaluate(() => {
    const m = document.querySelector('.dt-bits').textContent.match(/m0 = (\d) .* m1 = (\d)/);
    return { m0: +m[1], m1: +m[2] };
  });
  let x = bits.m1 === 1; const z = bits.m0 === 1;
  if (!correct) x = !x; // one wrong correction: visibly wrong on a generic state
  await step(`Apply ${x && z ? 'X then Z' : x ? 'X' : z ? 'Z' : 'no correction'}`);
  const r = await page.evaluate(() => JSON.parse(document.querySelector('.dt-result').textContent));
  return { bits, fidelity: r.fidelity, theta: r.parameters.theta, phi: r.parameters.phi };
}

// The player's way through every mission up to `until`, by clicking.
async function playTo(until) {
  for (let guard = 0; guard < 80 && (await state()) !== until; guard++) {
    const s = await state();
    const play = {
      BOOT: ['BOOT_COMPLETE'], TITLE: ['START'], OPENING: ['SKIP'], FREE_ROAM_ALLEY: ['OPEN_CLONE_BOOTH'],
      CLONE_INTRO: ['Duplicate zero'], CLONE_BASIS_PASSED: ['Duplicate plus'],
      CLONE_SUPERPOSITION_FAILED: ['story-ui stub: show result panel', 'EXPLANATION_READ'], CLONE_UNDERSTOOD: ['EXIT_BOOTH'],
      RELAY_UNLOCKED: ['REACH_RELAY'], RELAY_INTRO: ['Sender I'], RELAY_BELL_CREATED: ['Sender X'],
      RELAY_SEND_FAILED: ['story-ui stub: show result panel', 'VIEW_RECEIVER_MARGINAL'], RELAY_UNDERSTOOD: ['OPEN_ROOFTOP'],
      ROOFTOP_UNLOCKED: ['REPAIR_CLASSICAL_LINK'], LINK_REPAIRED: ['RUN_DRY_TEST'],
    }[s];
    if (s === 'TELEPORT_DRY_RUN') { await dryRun(true); continue; }
    if (!play) await fail(`playTo(${until}): no move in ${s}`);
    for (const t of play) await step(t);
  }
  if ((await state()) !== until) await fail(`playTo(${until}) did not arrive`);
}

// ---- session 0: title -> ending, every bad path on the way, RESTART from ENDING
await step('BOOT_COMPLETE', 'TITLE');
await shot('title');
await step('START', 'OPENING');
await step('SKIP', 'FREE_ROAM_ALLEY');
await step('OPEN_CLONE_BOOTH', 'CLONE_INTRO');
await click('repeat last accepted event 5×');
if (await state() !== 'CLONE_INTRO') await fail('repeat advanced the quest');
await step('Duplicate plus', 'CLONE_INTRO'); // superposition before basis does nothing
await step('Duplicate zero', 'CLONE_BASIS_PASSED');
await click('fail next quantum call');
await step('Duplicate plus', 'CLONE_BASIS_PASSED'); // honest error, no progress
await step('Duplicate plus', 'CLONE_SUPERPOSITION_FAILED');
await step('EXPLANATION_READ', 'CLONE_SUPERPOSITION_FAILED'); // ruling 13: refused before the panel
await shot('ack-refused-before-result-panel');
await step('story-ui stub: show result panel', 'CLONE_SUPERPOSITION_FAILED');
await shot('result-panel-shown');
await step('EXPLANATION_READ', 'CLONE_UNDERSTOOD');
await playTo('LINK_REPAIRED');
await step('RUN_DRY_TEST', 'TELEPORT_DRY_RUN');

const wrong = await dryRun(false);
steps.push(`wrong dry run: bits ${JSON.stringify(wrong.bits)} state theta=${wrong.theta} phi=${wrong.phi} fidelity shown ${wrong.fidelity}`);
// contracts' GENERIC_MAX_WRONG_FIDELITY: on a generic state every wrong choice scores at most 0.9.
if (await state() !== 'TELEPORT_DRY_RUN' || !(wrong.fidelity <= 0.9)) await fail('a wrong dry run did not visibly fail');
await shot('dry-run-wrong-correction-visibly-fails');
let pass = null; const attempts = [wrong];
for (let i = 0; i < 20 && (await state()) === 'TELEPORT_DRY_RUN'; i++) {
  pass = await dryRun(true); attempts.push(pass);
  if ((await state()) === 'TELEPORT_DRY_RUN') await shot(`dry-run-correct-but-00-retry-${i}`);
}
const fresh = new Set(attempts.map((a) => `${a.theta},${a.phi}`)).size;
steps.push(`dry-run attempts ${attempts.length}, distinct calibration states ${fresh}; passing bits ${JSON.stringify(pass.bits)}`);
if (fresh !== attempts.length) await fail('a retry reused a calibration state');
if (pass.bits.m0 === 0 && pass.bits.m1 === 0) await fail('a 00 run unlocked COMMIT');
if (await state() !== 'TELEPORT_DRY_RUN_PASSED') await fail('no dry-run pass');
await shot('dry-run-passed-on-a-fresh-state');

await click('fail next quantum call');
await step('COMMIT TRANSFER (story token, once)', 'TELEPORT_DRY_RUN_PASSED');
if (await latch() !== 'idle') await fail('an errored commit (nothing measured) latched');
await shot('commit-call-errored-nothing-measured-retry-offered');
await step('COMMIT TRANSFER (story token, once)', 'TELEPORT_COMMITTED');
await shot('committed');
if (await enabled('COMMIT TRANSFER (story token, once)')) await fail('commit still offered');
const direct = await page.evaluate(() => window.__harness.machine.send('COMMIT_TRANSFER'));
steps.push(`direct send('COMMIT_TRANSFER') -> ${JSON.stringify(direct)}`);
if (direct.ok) await fail('direct commit accepted');
await step('ANIMATION_END', 'ENDING');
await shot('ending-offers-restart');
await step('RESTART', 'TITLE');
await shot('restart-from-ending-title-session-1');

// ---- session 1: reset mid-call, then the same state again before the old result lands (ABA)
await playTo('CLONE_INTRO');
await click('Duplicate zero'); // 200 ms in flight
await click('resetGame()');
for (const t of ['START', 'SKIP', 'OPEN_CLONE_BOOTH']) await click(t);
if (await state() !== 'CLONE_INTRO') await fail('could not re-enter CLONE_INTRO');
await settle();
await page.waitForFunction(() => /DROPPED/.test(document.querySelector('.dt-note').textContent), { timeout: 3000 }).catch(() => {});
steps.push(`stale result after resetGame -> ${await state()} | ${await note()}`);
if (await state() !== 'CLONE_INTRO' || !/DROPPED/.test(await note())) await fail('stale result was not dropped');
await shot('reset-mid-call-stale-result-dropped');

// ---- session 1 continues: the commit result comes back wrong -> latched, honest error, RESTART
await playTo('TELEPORT_DRY_RUN_PASSED');
await click('engine fault on next commit');
await step('COMMIT TRANSFER (story token, once)', 'TELEPORT_DRY_RUN_PASSED');
if (await latch() !== 'measured_refused') await fail('a measured, refused commit did not latch');
if (await enabled('COMMIT TRANSFER (story token, once)')) await fail('a latched commit is still offered');
const faultText = await page.$eval('.dt-fault', (n) => n.innerText).catch(() => '');
steps.push(`fault panel: ${faultText.replace(/\n+/g, ' | ')}`);
if (!/measured and consumed/.test(faultText) || !/Verification failed/.test(faultText) || !/Refusal: \S/.test(faultText)) await fail('no honest scientific-module error');
if (!(await enabled('RESTART (resetGame)'))) await fail('a measured, refused commit stranded the player: no RESTART offered');
// Under the button: the machine itself refuses, and the engine is never called again.
const again = await page.evaluate(async () => {
  let calls = 0;
  const r = await window.__harness.machine.commitTransfer(async () => { calls++; return null; });
  return { ok: r.ok, commit: r.commit, calls };
});
steps.push(`direct commitTransfer() while latched -> ${JSON.stringify(again)}`);
if (again.ok || again.calls !== 0) await fail('a second commit request reached the engine');
if (await latch() !== 'measured_refused' || (await state()) !== 'TELEPORT_DRY_RUN_PASSED') await fail('latch broke');
await shot('commit-measured-refused-honest-error-restart-offered');

// ---- session 2: RESTART from the fault, a fresh token commits; title -> credits via DECLASSIFIED
const faultSession = await page.evaluate(() => window.__harness.machine.epoch);
await step('RESTART (resetGame)', 'TITLE');
if (await latch() !== 'idle' || await page.$('.dt-fault')) await fail('RESTART did not start a clean session');
await playTo('TELEPORT_DRY_RUN_PASSED');
await step('COMMIT TRANSFER (story token, once)', 'TELEPORT_COMMITTED');
await step('ANIMATION_END', 'ENDING');
await shot('after-fault-restart-next-session-reaches-ending');
await step('OPEN_SCIENCE', 'DECLASSIFIED');
await step('OPEN_CREDITS', 'CREDITS');
await shot('credits');
await step('RESTART (resetGame)', 'TITLE'); // CREDITS is terminal (contracts v2): its restart is resetGame()
await shot('restart-from-credits-title-session-4');

const calls = await commitCalls();
steps.push(`engine commit calls per session: ${JSON.stringify(calls)} (fault session ${faultSession})`);
// Session 0: one errored call (nothing measured) + its retry. The fault session and the session
// RESTART opened from it: exactly one engine call each.
const want = { 0: 2, [faultSession]: 1, [faultSession + 1]: 1 };
if (JSON.stringify(calls) !== JSON.stringify(want)) await fail(`engine commit calls ${JSON.stringify(calls)}, expected ${JSON.stringify(want)}`);
const log = await page.$eval('#log', (n) => n.innerText);
console.log(steps.join('\n'));
console.log('--- page errors:', errors.length ? errors : 'none');
console.log('--- bus log (newest first):\n' + log);
await browser.close();
if (errors.length) process.exit(1);
