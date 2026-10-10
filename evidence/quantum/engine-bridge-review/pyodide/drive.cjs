// Loads the probe in the local runner, checks the served build token, saves the JSON + a screenshot.
// drive.cjs --port N --token T --out DIR. Exit 0 = JSON captured, 2 = no verdict.
const path = require('path'), fs = require('fs'), { execSync } = require('child_process');
const a = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const [port, token, out] = [a('--port'), a('--token'), a('--out')];
let pp; for (const x of [process.env.PUPPETEER_CORE, 'puppeteer-core', path.join(execSync('npm root -g').toString().trim(), '@modelcontextprotocol/server-puppeteer/node_modules/puppeteer-core')].filter(Boolean)) { try { pp = require(x); break; } catch {} }
if (!pp) { console.error('NO VERDICT: no puppeteer-core'); process.exit(2); }
(async () => {
  const b = await pp.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage(); await page.setViewport({ width: 1200, height: 700 }); await page.setCacheEnabled(false);
  await page.goto(`http://127.0.0.1:${port}/?autorun=1&backend=ionq-mock`, { waitUntil: 'load' });
  const t0 = Date.now();
  for (;;) { const st = await page.evaluate(() => window.__runner && window.__runner.status).catch(() => null); if (st === 'done' || st === 'error') break; if (Date.now() - t0 > 400000) { console.error('NO VERDICT: timeout'); process.exit(2); } await new Promise((r) => setTimeout(r, 300)); }
  const err = await page.evaluate(() => window.__runner.error);
  const f = page.frames().find((x) => x.url().includes('/frame.html'));
  const txt = (s) => f.$eval(s, (e) => e.textContent).catch(() => null);
  const build = await txt('#build-token');
  await page.screenshot({ path: path.join(out, 'pyodide-probe-page.png'), fullPage: true });
  if (build !== token) { console.error(`NO VERDICT: served build ${build} != ${token}; runner error ${err}`); process.exit(2); }
  fs.writeFileSync(path.join(out, 'pyodide-engine.json'), await txt('#harness-json'));
  console.log(await txt('#summary')); console.log(`runner error: ${err}; ${(Date.now() - t0) / 1000}s`);
  await b.close();
})();
