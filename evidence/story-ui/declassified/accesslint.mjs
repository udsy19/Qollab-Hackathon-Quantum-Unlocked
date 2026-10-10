// accesslint (@accesslint/core runAudit, injected as its IIFE) on the OPEN Declassified dialog, every
// tab, 1280×720 at 100% and 200% text. Exit 0 no violations inside the dialog · 1 some · 2 refused.
// The engine caches between runs: clearAllCaches() before every audit, or later tabs are graded stale.
// Usage: node accesslint.mjs <path to @accesslint/core/dist/index.iife.js>   (port 8771)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
const require = createRequire('/opt/homebrew/lib/node_modules/@modelcontextprotocol/server-puppeteer/');
const puppeteer = require('puppeteer');
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const iife = process.argv[2];
if (!iife || !fs.existsSync(iife)) { console.log('REFUSED: pass the @accesslint/core IIFE path'); process.exit(2); }
const server = http.createServer((req, res) => {
  const p = path.join(repo, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(repo) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
for (let t = 0; ; t++) {
  const err = await new Promise((r) => { server.once('error', r); server.listen(8771, '127.0.0.1', () => r(null)); });
  if (!err) break;
  if (t >= 90) { console.log(`REFUSED: ${err.message}`); process.exit(2); }
  await new Promise((r) => setTimeout(r, 2000));
}
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const out = [];
let inDialog = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:8771/evidence/story-ui/harness/declassified.html', { waitUntil: 'networkidle0' });
  await page.addScriptTag({ content: fs.readFileSync(iife, 'utf8') });
  await page.evaluate(() => echoHarness.declassified.open(echoHarness.SAMPLE));
  for (const scale of [100, 200]) {
    await page.evaluate((s) => echoHarness.menu.setSettings({ textScale: s }), scale);
    const n = await page.evaluate(() => document.querySelectorAll('[role="tab"]').length);
    for (let i = 0; i < n; i++) {
      // Answer every teach-back question so the feedback regions are audited too.
      await page.evaluate((i) => { document.querySelectorAll('[role="tab"]')[i].click(); document.querySelectorAll('[data-question] button').forEach((b) => b.click()); }, i);
      const r = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"][aria-label="Declassified"]');
        const res = (AccessLint.clearAllCaches(), AccessLint.runAudit(document));
        return { tab: document.querySelector('[role="tab"][aria-selected="true"]').textContent, v: res.violations.map((v) => ({ rule: v.ruleId, impact: v.impact, selector: v.selector, inDialog: !!(v.element ? dlg.contains(v.element) : (v.selector && dlg.querySelector(v.selector.split(' > ').pop()))), msg: (v.message || '').slice(0, 140) })) };
      });
      for (const v of r.v) { out.push({ scale, tab: r.tab, ...v }); if (v.inDialog) inDialog += 1; }
    }
  }
  // Positive control: an unnamed button planted in the open panel must be flagged AND attributed to
  // the dialog. (A nameless-dialog control does not work: accesslint 0.21.0 names a dialog from its
  // content, so aria-dialog-name never fires on a dialog that has text — measured with a probe page.)
  const control = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"][aria-label="Declassified"]');
    const b = document.createElement('button');
    b.id = 'al-control';
    d.querySelector('[role="tabpanel"]:not([hidden])').append(b);
    const hits = (AccessLint.clearAllCaches(), AccessLint.runAudit(document)).violations.filter((v) => (v.element ? d.contains(v.element) : /al-control/.test(v.selector || ''))).map((v) => v.ruleId);
    b.remove();
    return hits;
  });
  console.log(`control (unnamed button planted in the dialog): ${control.length ? 'flagged ' + control.join(',') : 'NOT FLAGGED'}`);
  if (!control.length) { console.log('REFUSED: the audit could not see a planted violation inside the dialog'); process.exitCode = 2; }
} finally { await browser.close(); server.close(); }
const uniq = [...new Map(out.map((v) => [`${v.rule}|${v.selector}|${v.inDialog}`, v])).values()];
for (const v of uniq) console.log(`${v.inDialog ? 'DIALOG ' : 'page   '} ${v.impact?.padEnd(9)} ${v.rule}  ${v.selector}  — ${v.msg}`);
console.log(`\n${out.length} violation instances (${uniq.length} distinct); inside the dialog: ${inDialog}`);
fs.writeFileSync(path.join(here, 'accesslint.json'), JSON.stringify(uniq, null, 2));
process.exit(process.exitCode === 2 ? 2 : inDialog ? 1 : 0);
