// node probe.cjs <port> <backend>  -> prints the probe JSON and the runner counter
const path = require('node:path'); const { execSync } = require('node:child_process');
const pp = require(path.join(execSync('npm root -g').toString().trim(), '@modelcontextprotocol/server-puppeteer/node_modules/puppeteer-core'));
(async () => {
  const [port, be] = process.argv.slice(2);
  const b = await pp.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
  const p = await b.newPage(); await p.setCacheEnabled(false);
  await p.goto(`http://127.0.0.1:${port}/?autorun=1&backend=${be}`);
  const t0 = Date.now();
  for (;;) { const st = await p.evaluate(() => window.__runner && window.__runner.status).catch(() => null); if (st === 'done' || st === 'error' || Date.now() - t0 > 240000) break; await new Promise((r) => setTimeout(r, 250)); }
  const r = await p.evaluate(() => ({ status: window.__runner.status, error: window.__runner.error, jobs: window.__runner.jobs, log: window.__runner.log.slice(-8) }));
  const f = p.frames().find((x) => x.url().includes('/frame.html'));
  const j = f ? await f.$eval('#probe-json', (e) => e.textContent).catch(() => null) : null;
  console.log(JSON.stringify({ backend: be, runner: r, probe: j ? JSON.parse(j) : null }, null, 1));
  await b.close(); process.exit(j && JSON.parse(j).ok ? 0 : 1);
})();
