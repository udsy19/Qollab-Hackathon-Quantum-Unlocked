// Drives terminals.html with REAL input (CDP key presses and mouse clicks) and asserts what the
// player sees and what the terminal emits. Exit 0 green · 1 red · 2 refused (harness did not load).
// Usage: node drive-terminals.mjs <port> <outDir>
//
// Independence: the correct correction for each (m0, m1) is derived HERE from vision §7.1 (X iff
// m1 = 1, Z iff m0 = 1) using the bits read off the screen, never from the terminal. Expected
// fidelities are recomputed here from the stub's Bloch vector (closed form), and compared with the
// number the terminal DISPLAYS. Event order is compared with the §9.2 chain, typed from the vision.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('/opt/homebrew/lib/node_modules/@modelcontextprotocol/server-puppeteer/');
const puppeteer = require('puppeteer');

const port = process.argv[2] || '8761';
const out = process.argv[3] || 'evidence/story-ui/terminals';
const only = process.env.ONLY || '';
fs.mkdirSync(out, { recursive: true });
const url = `http://127.0.0.1:${port}/evidence/story-ui/harness/terminals.html`;
const keys = [];
const checks = [];
let failed = 0;
function check(name, ok, detail = '') {
  checks.push({ name, ok: !!ok, detail });
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
page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function press(key, label) {
  keys.push(label || key);
  const [mod, k] = key.includes('+') ? key.split('+') : [null, key];
  if (mod) await page.keyboard.down(mod);
  await page.keyboard.press(k);
  if (mod) await page.keyboard.up(mod);
  await sleep(40);
}
const shot = async (name) => { await sleep(260); await page.screenshot({ path: path.join(out, name) }); };
const H = (fn, ...a) => page.evaluate(fn, ...a);
const events = () => H(() => [...echoHarness.events]);
const calls = (m) => H((m) => echoHarness.stub.calls.filter((c) => c.method === m).length, m);
const panelText = () => H(() => document.querySelector('.echo-terminal')?.innerText ?? '');
const active = () => H(() => { const a = document.activeElement; return (a.innerText || a.getAttribute('aria-label') || '').trim(); });
const idle = () => page.waitForFunction(() => !document.querySelector('.echo-terminal[aria-busy="true"]'), { timeout: 5000 });

// Keyboard only: Tab until the focused control's text matches, then Enter.
async function tabTo(re, { activate = true, max = 40 } = {}) {
  for (let i = 0; i < max; i++) {
    if (re.test(await active())) {
      if (activate) await press('Enter', `Enter (${(await active()).replace(/\s+/g, ' ')})`);
      return true;
    }
    await press('Tab');
  }
  throw new Error(`tabTo: no focusable control matching ${re} (focused: ${await active()})`);
}
// Mouse: click the visible button whose text matches.
async function click(re) {
  const h = await page.evaluateHandle((src) => {
    const r = new RegExp(src);
    return [...document.querySelectorAll('.echo-terminal button')].find((b) => b.getClientRects().length && r.test(b.innerText.trim()));
  }, re.source);
  const el = h.asElement();
  if (!el) throw new Error(`click: no button ${re}`);
  keys.push(`(mouse) click ${re}`);
  await el.click();
  await sleep(40);
}
const role = (r) => H((r) => document.querySelector(`.echo-terminal [data-role="${r}"]`)?.innerText.trim() ?? null, r);
const isDisabled = (re) => H((src) => {
  const b = [...document.querySelectorAll('.echo-terminal button')].find((x) => new RegExp(src).test(x.innerText.trim()));
  return b ? b.disabled || b.getAttribute('aria-disabled') === 'true' : null;
}, re.source);
const engineShown = async () => /ENGINE[\s:]*(DOCUMENTED PREVIEW|EXACT LOCAL QISKIT)/.test(await panelText());

try {
  await page.goto(url, { waitUntil: 'networkidle0' });
  if (!(await H(() => !!window.echoHarness))) { console.log('REFUSED: harness did not load', errors); process.exit(2); }
  await page.waitForFunction(() => window.echoHarness.hash);
  const prov = await H(() => ({ version: echoHarness.VERSION, hash: echoHarness.hash }));
  console.log('provenance', JSON.stringify(prov));
  await H(() => { echoHarness.stub.control.delayMs = 120; });

  // ---------------------------------------------------------------- copy_booth, keyboard only
  keys.push('=== copy_booth (keyboard only) ===');
  await H(() => echoHarness.terminal.open('copy_booth'));
  await shot('01-booth-open.png');
  check('booth: opens with focus inside the terminal', await H(() => !!document.activeElement.closest('.echo-terminal')));
  await tabTo(/^\|0⟩$/);
  await tabTo(/^DUPLICATE$/);
  check('booth: CALIBRATING shown while the engine is pending', /CALIBRATING/.test(await panelText()));
  await shot('02-booth-calibrating.png');
  await idle();
  check('booth |0⟩: TWO BASIS VALUES MATCHED: YES', /TWO BASIS VALUES MATCHED: YES/.test(await panelText()));
  check('booth |0⟩: engine label visible', await engineShown());
  await shot('03-booth-zero-match.png');
  await tabTo(/^\|1⟩$/);
  await tabTo(/^DUPLICATE$/);
  await idle();
  check('booth |1⟩: TWO BASIS VALUES MATCHED: YES', /TWO BASIS VALUES MATCHED: YES/.test(await panelText()));
  await shot('04-booth-one-match.png');
  await tabTo(/^\|\+⟩$/);
  await tabTo(/^DUPLICATE$/);
  await idle();
  const plusText = await panelText();
  check('booth |+⟩: TWO INDEPENDENT COPIES: NO', /TWO INDEPENDENT COPIES: NO/.test(plusText));
  check('booth |+⟩: failure says why (FAILURES.cloning.plus_not_copied)', /Each output alone is random, not a copy of \|\+⟩/.test(plusText));
  check('booth |+⟩: kets rendered as ⟩, no raw |x> left', !/\|[0-9+\-]>/.test(plusText), (plusText.match(/\|[^|\s]{1,3}>/g) || []).join(','));
  check('booth |+⟩: engine label visible', await engineShown());
  await shot('05-booth-plus-fails.png');
  await tabTo(/^WHY DID THAT FAIL\?$/);
  const why = await panelText();
  check('booth why: purity 0.5 shown for each output', (why.match(/PURITY\s*0\.5/g) || []).length >= 2, why.match(/PURITY[^\n]*/g)?.join(' | '));
  await shot('06-booth-why.png');
  await tabTo(/^INCREASE VOLTAGE$/);
  check('booth: INCREASE VOLTAGE explained, not punished', /Same result\. The limit is a rule of physics/.test(await panelText()));
  await shot('07-booth-voltage.png');
  const evBeforeReroute = await events();
  check('booth: EXPLANATION_READ not emitted before the deduction', !evBeforeReroute.includes('EXPLANATION_READ'), evBeforeReroute.join(','));
  await tabTo(/^REROUTE, DO NOT DUPLICATE$/);
  await sleep(120);
  await shot('08-booth-reroute.png');
  check('booth: learning text shown', /CNOT copies a known computational-basis bit, but not an arbitrary unknown qubit\./.test(await panelText()));
  const evBooth = (await events()).filter((e) => !e.startsWith('CLOSE_TERMINAL'));
  check('booth: events in §9.2 order', JSON.stringify(evBooth) === JSON.stringify(['BASIS_DEMO_OK', 'SUPERPOSITION_DEMO_FAILED', 'EXPLANATION_READ']), evBooth.join(','));
  await press('Escape');
  check('booth: ESC closes the terminal', await H(() => !echoHarness.terminal.isOpen()));
  check('booth: ESC emits CLOSE_TERMINAL {id}', (await events()).at(-1) === 'CLOSE_TERMINAL{"id":"copy_booth"}', (await events()).at(-1));

  // ---------------------------------------------------------------- relay_core, mouse
  keys.push('=== relay_core (mouse) ===');
  await H(() => { echoHarness.events.length = 0; echoHarness.terminal.open('relay_core'); });
  await shot('10-relay-open.png');
  await click(/^PREPARE BELL PAIR$/);
  await idle();
  for (const g of ['I', 'X', 'Z']) {
    await click(new RegExp(`^${g}$`));
    await click(/^SEND$/);
    await idle();
    const rx = await panelText();
    check(`relay ${g}: receiver-only EXACT P(0)=0.5 P(1)=0.5`, /RECEIVER-ONLY DATA[\s\S]*EXACT[\s\S]*0\.5[\s\S]*0\.5/.test(rx) && !/count|shots/i.test(rx));
    check(`relay ${g}: per-gate failure line`, rx.includes({ I: 'Sender did nothing (I)', X: 'Sender flipped its half (X)', Z: 'Sender phase-flipped its half (Z)' }[g]));
    check(`relay ${g}: engine label visible`, await engineShown());
    await shot(`11-relay-receiver-${g}.png`);
  }
  await click(/^COMPARED PAIRED DATA$/);
  const paired = await panelText();
  check('relay: paired view shows Z/X agreement for the last gate (Z: Z agree 1, X agree 0)', /Z-BASIS RESULTS AGREE[\s\S]*1(\.0+)?\b[\s\S]*X-BASIS RESULTS AGREE[\s\S]*\b0(\.0+)?\b/.test(paired));
  await shot('12-relay-paired.png');
  const evRelay = (await events()).filter((e) => !e.startsWith('CLOSE_TERMINAL'));
  check('relay: events in §9.2 order, each once', JSON.stringify(evRelay) === JSON.stringify(['PREPARE_BELL_PAIR', 'ATTEMPT_NO_SIGNALLING', 'VIEW_RECEIVER_MARGINAL']), evRelay.join(','));
  await press('Escape');

  // ---------------------------------------------------------------- teleport_terminal, keyboard only
  keys.push('=== teleport_terminal (keyboard only) ===');
  await H(() => { echoHarness.events.length = 0; echoHarness.terminal.open('teleport_terminal'); });
  await shot('20-teleport-open.png');
  check('teleport: COMMIT disabled before any dry run', (await isDisabled(/^COMMIT ONE-WAY TRANSFER$/)) === true);
  await click(/^COMMIT ONE-WAY TRANSFER$/).catch(() => {});
  await H(() => { const b = [...document.querySelectorAll('.echo-terminal button')].find((x) => /COMMIT/.test(x.innerText)); b?.click(); });
  check('teleport: clicking a locked COMMIT calls nothing and emits nothing', (await calls('commitStoryTransfer')) === 0 && !(await events()).includes('COMMIT_TRANSFER'));

  const fidOf = (stateId, x, z, m0, m1) => H(([s, x, z, m0, m1]) => {
    const b = echoHarness.stub.states.get(s).b;
    const rx = (x ? 1 : 0) ^ m1, rz = (z ? 1 : 0) ^ m0;
    return rx && rz ? b[1] ** 2 : rx ? b[0] ** 2 : rz ? b[2] ** 2 : 1;
  }, [stateId, x, z, m0, m1]);

  async function setToggle(name, on) {
    const re = new RegExp(`^${name} ON THE RECEIVER`);
    await tabTo(re, { activate: false });
    const pressed = await H(() => document.activeElement.getAttribute('aria-pressed') === 'true');
    if (pressed !== on) await press('Space', `Space (toggle ${name} ${on ? 'ON' : 'OFF'})`);
  }
  const fidelity = {};
  for (const [m0, m1] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
    for (const wrong of [true, false]) {
      await H(([a, b]) => echoHarness.stub.control.bitsQueue.push([a, b]), [m0, m1]);
      await tabTo(/^EXECUTE BELL MEASUREMENT ON TEST STATE$/);
      await idle();
      const shownM0 = Number(await role('m0')), shownM1 = Number(await role('m1'));
      check(`teleport ${m0}${m1}: bits shown first (m0, m1) and plan before verify`, shownM0 === m0 && shownM1 === m1 && /SOURCE READOUT m0[\s\S]*LOCAL BELL-HALF READOUT m1/.test(await panelText()), `${shownM0},${shownM1}`);
      if (!wrong && m0 === 0 && m1 === 0) await shot('21-teleport-bits-00.png');
      // The rule, from vision §7.1, not from the terminal.
      let x = m1 === 1, z = m0 === 1;
      if (wrong) { if (m0 === 0 && m1 === 0) x = true; else if (m1 === 1) x = false; else z = !z; }
      await setToggle('X', x);
      await setToggle('Z', z);
      await tabTo(/^VERIFY DRY RUN$/);
      await idle();
      const stateId = await H(() => echoHarness.stub.results.at(-1).out.parameters.state);
      const expected = await fidOf(stateId, x, z, m0, m1);
      const shown = Number(await role('fidelity'));
      const t = await panelText();
      fidelity[`${m0}${m1}${wrong ? ' wrong' : ' right'}`] = { x, z, shown, expected: Number(expected.toFixed(6)) };
      check(`teleport ${m0}${m1} ${wrong ? 'wrong' : 'right'} (X ${x ? 'ON' : 'OFF'}, Z ${z ? 'ON' : 'OFF'}): displayed fidelity ${shown} = closed form ${expected.toFixed(6)}`, Math.abs(shown - expected) < 5e-7);
      check(`teleport ${m0}${m1} ${wrong ? 'wrong' : 'right'}: ${wrong ? 'fidelity < 1 and a FAILURES.teleportation line' : 'fidelity 1'}`,
        wrong ? shown < 0.999 && /DRY RUN FAILED/.test(t) && /(was off|but m[01] = 0)/.test(t) : Math.abs(shown - 1) < 1e-6 && /DRY RUN PASSED/.test(t));
      check(`teleport ${m0}${m1}: engine label visible`, await engineShown());
      await shot(`22-teleport-${m0}${m1}-${wrong ? 'wrong' : 'right'}.png`);
      if (!wrong && m0 === 0 && m1 === 0) {
        check('teleport 00 right: COMMIT stays locked (00 does not test the rule)', (await isDisabled(/^COMMIT ONE-WAY TRANSFER$/)) === true && /do(es)? not test the rule/.test(t));
      }
      if (m0 === 0 && m1 === 1 && wrong) {
        // ESC mid-flow, then reopen: the failed dry run is still on screen.
        await press('Escape', 'Escape (mid-flow)');
        check('teleport: ESC mid-flow closes', await H(() => !echoHarness.terminal.isOpen()));
        await H(() => echoHarness.terminal.open('teleport_terminal'));
        const re = await panelText();
        check('teleport: reopened with the dry-run result and bits intact', /DRY RUN FAILED/.test(re) && Number(await role('m1')) === 1);
        await shot('23-teleport-reopen-intact.png');
      }
    }
  }
  check('teleport: a correct non-00 dry run unlocks COMMIT', (await isDisabled(/^COMMIT ONE-WAY TRANSFER$/)) === false);
  const ev1 = await events();
  check('teleport: CORRECT_CALIBRATION emitted once, only after a non-00 pass', ev1.filter((e) => e === 'CORRECT_CALIBRATION').length === 1, ev1.join(','));

  // Commit error, then retry.
  await H(() => { echoHarness.stub.control.rejectNext = 1; });
  await tabTo(/^COMMIT ONE-WAY TRANSFER$/);
  await idle();
  const errT = await panelText();
  check('commit error: honest message, source NOT consumed, no COMMIT_TRANSFER', /SCIENTIFIC MODULE ERROR/.test(errT) && /STATE PRESENT/.test(errT) && !/MEASURED \/ CONSUMED/.test(errT) && !(await events()).includes('COMMIT_TRANSFER'));
  await shot('24-commit-error.png');
  // Retry with a double Enter and a double click racing the pending call.
  await H(() => { echoHarness.stub.control.delayMs = 400; });
  await tabTo(/^(RETRY|COMMIT ONE-WAY TRANSFER)$/, { activate: false });
  await press('Enter', 'Enter (commit retry)');
  await press('Enter', 'Enter (double)');
  await H(() => { const b = [...document.querySelectorAll('.echo-terminal button')].find((x) => /COMMIT|RETRY/.test(x.innerText)); b?.click(); b?.click(); });
  await shot('25-commit-in-progress.png');
  await idle();
  await H(() => { echoHarness.stub.control.delayMs = 120; });
  const okT = await panelText();
  check('commit: success shows MEASURED / CONSUMED and STATE RECOVERED', /STATE MEASURED \/ CONSUMED/.test(okT) && /STATE RECOVERED/.test(okT));
  check('commit: engine called exactly twice in total (1 error + 1 success) under double Enter + double click', (await calls('commitStoryTransfer')) === 2, String(await calls('commitStoryTransfer')));
  await shot('26-commit-success.png');
  await H(() => { const b = [...document.querySelectorAll('.echo-terminal button')].find((x) => /COMMIT/.test(x.innerText)); b?.click(); });
  await sleep(200);
  const ev2 = await events();
  check('commit: COMMIT_TRANSFER emitted exactly once', ev2.filter((e) => e === 'COMMIT_TRANSFER').length === 1, ev2.join(','));
  check('commit: a second attempt is refused with FAILURES.teleportation.already_committed and no engine call', (await calls('commitStoryTransfer')) === 2 && /Transfer complete\. The source was measured/.test(await panelText()));
  await shot('27-commit-second-refused.png');
  const evTel = ev2.filter((e) => !e.startsWith('CLOSE_TERMINAL'));
  check('teleport: events in §9.2 order', JSON.stringify(evTel) === JSON.stringify(['CORRECT_CALIBRATION', 'COMMIT_TRANSFER']), evTel.join(','));
  await press('Escape');
  await H(() => echoHarness.terminal.open('teleport_terminal'));
  check('commit: latched across close/reopen', (await isDisabled(/COMMIT ONE-WAY TRANSFER/)) === true && /MEASURED \/ CONSUMED/.test(await panelText()));
  await press('Escape');

  // ---------------------------------------------------------------- engine failure states
  keys.push('=== engine failure states ===');
  const resultText = () => H(() => document.querySelector('.echo-terminal [data-role="result"]')?.innerText ?? '');
  await H(() => { echoHarness.terminal.open('copy_booth'); echoHarness.stub.control.rejectNext = 1; });
  let before = await resultText();
  await click(/^\|0⟩$/); await click(/^DUPLICATE$/); await idle();
  check('engine error: SCIENTIFIC MODULE ERROR + RETRY, results panel unchanged (no invented numbers)', /SCIENTIFIC MODULE ERROR/.test(await panelText()) && (await resultText()) === before && (await isDisabled(/^RETRY$/)) === false);
  await shot('30-engine-error.png');
  await click(/^RETRY$/); await idle();
  check('engine error: RETRY recovers', /TWO BASIS VALUES MATCHED: YES/.test(await panelText()));
  await H(() => { echoHarness.stub.control.malformedNext = 1; });
  // A fresh terminal state is not available, so the malformed result goes to |+> after a page-level
  // check that the stub really returned it.
  before = await resultText();
  await click(/^\|1⟩$/); await click(/^DUPLICATE$/); await idle();
  const mal = await panelText();
  check('malformed: the stub really returned a bad shape', await H(() => echoHarness.stub.results.at(-1).out.engine === 'ionq_verified'));
  check('malformed: RESULT REFUSED with the validator reason, results panel unchanged', /RESULT REFUSED/.test(mal) && /engine must be one of/.test(mal) && (await resultText()) === before);
  await shot('31-malformed-refused.png');
  await H(() => { echoHarness.stub.control.delayMs = 4000; });
  await click(/^RETRY$/);
  await sleep(300);
  check('pending: CALIBRATING shown, aria-busy, ESC still closes (UI not frozen)', /CALIBRATING/.test(await panelText()) && (await H(() => document.querySelector('.echo-terminal').getAttribute('aria-busy'))) === 'true');
  await shot('32-calibrating.png');
  await press('Escape');
  check('pending: ESC closed the terminal mid-call', await H(() => !echoHarness.terminal.isOpen()));
  await H(() => { echoHarness.stub.control.delayMs = 120; });

  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (e) {
  check(`driver reached the end (${e.message})`, false);
} finally {
  fs.writeFileSync(path.join(out, 'drive-result.json'), JSON.stringify({ url, keys, checks, failed, errors }, null, 2));
  await browser.close();
}
console.log(`\n${checks.length} checks, ${failed} failed`);
process.exit(checks.length === 0 ? 2 : failed ? 1 : 0);
