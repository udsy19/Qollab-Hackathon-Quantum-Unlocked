#!/usr/bin/env node
// tools/art-preview/rain-gate.mjs — dev-only pixel gate for rain (never uploaded).
//   node tools/art-preview/serve.mjs 5162 &  then  node tools/art-preview/rain-gate.mjs 5162 [label]
// Needs playwright-core (not vendored): PW_CORE=/path/to/node_modules/playwright-core, and Chrome.
// For each pose it renders the SAME frame twice (rain shown / hidden) and reads the framebuffer, so the
// diff is the rain alone; the only thing taken from rain.js is the group to hide. Ground truth is the
// pose: the relay, passage and elevator poses see only indoor space, so ANY rain pixel there is a leak.
// Exit 0 green · 1 red · 2 refused (could not grade).
let chromium
try { ({ chromium } = await import(process.env.PW_CORE ?? 'playwright-core')) } catch (e) { console.error(`refused: playwright-core not found (${e.message})`); process.exit(2) }
const [,, port = '5162', label = ''] = process.argv
const INDOOR = new Set(['relay', 'passage', 'elevator'])
// Outdoors the rain must stay atmosphere: rain-covered pixels (p99 luminance) at most half the accent
// strips' median luminance (vision §5.3 contrast hierarchy). Before this change: 0.60-0.70 vs 0.71.
const ACCENT_RATIO = 0.5
const MAX_INDOOR_COVERAGE_PCT = 0.01
// Positive control: outdoors the rain must still be there. Without it, a gate whose hide step failed
// (identical frames) or a shelter that swallowed the whole world would read as "no leak" = green.
const MIN_OUTDOOR_COVERAGE_PCT = 0.5
let red = 0, refused = 0, checks = 0
const POSES = {
  alley: null, relay: null,
  passage: [[0, 1.7, -27.6], [0, 1.5, -40]],
  elevator: [[16, 1.7, -50], [9, 1.5, -50]],
}
const measure = () => {
  const a = window.__art, r = a.renderer, gl = r.getContext()
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight
  const grab = () => { r.render(a.scene, a.camera); const b = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); return b }
  const on = grab(); a.rain.group.visible = false; const off = grab(); a.rain.group.visible = a.rain.intensity > 0
  const L = (b, i) => (0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2]) / 255
  let n = 0, rainPx = 0, accN = 0, accSum = 0, accLs = [], accWash = 0, bgRainLs = [], dSum = 0, addMax = 0, adds = []
  for (let i = 0; i < on.length; i += 4 * 3) {
    n++
    const mx = Math.max(off[i], off[i + 1], off[i + 2]), mn = Math.min(off[i], off[i + 1], off[i + 2])
    const accent = mx > 150 && (mx - mn) / mx > 0.45
    const d = Math.max(Math.abs(on[i] - off[i]), Math.abs(on[i + 1] - off[i + 1]), Math.abs(on[i + 2] - off[i + 2]))
    if (accent) { accN++; accLs.push(L(off, i)); accWash += d }
    else { if (d > 4) { rainPx++; bgRainLs.push(L(on, i)); const add = L(on, i) - L(off, i); adds.push(add); if (add > addMax) addMax = add } dSum += d }
  }
  const pct = (arr, p) => { if (!arr.length) return 0; arr.sort((x, y) => x - y); return arr[Math.floor((arr.length - 1) * p)] }
  return { samples: n, rainCoveragePct: +(100 * rainPx / n).toFixed(2), meanRainDelta: +(dSum / (n - accN)).toFixed(3),
    rainLumP99: +pct(bgRainLs, 0.99).toFixed(3), rainLumMax: +pct(bgRainLs, 1).toFixed(3), rainAddP99: +pct(adds, 0.99).toFixed(3), rainAddMax: +addMax.toFixed(3),
    accentPx: accN, accentLumMedian: +pct(accLs, 0.5).toFixed(3), accentWashMean: accN ? +(accWash / accN).toFixed(2) : null }
}
// A page that never loads (syntax error, server down) is no verdict at all: refuse, never red or green.
let browser
try {
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1300,820'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
  page.on('pageerror', e => console.log('PAGEERROR', e.message))
  page.setDefaultTimeout(15000)
  for (const q of ['low', 'med', 'high']) for (const [view, pose] of Object.entries(POSES)) {
    await page.goto(`http://127.0.0.1:${port}/tools/art-preview/?nopanel&q=${q}&view=${pose ? 'alley' : view}`)
    await page.waitForFunction(() => window.__art)
    if (pose) await page.evaluate(([p, t]) => { const a = window.__art; a.setView = () => {}; a.camera.position.fromArray(p); a.camera.lookAt(...t) }, pose)
    await page.waitForTimeout(1500)
    const rows = []
    for (let k = 0; k < 3; k++) { rows.push(await page.evaluate(measure)); await page.waitForTimeout(400) }
    const best = rows.reduce((m, r) => (r.rainCoveragePct > m.rainCoveragePct ? r : m)) // worst case of 3 frames
    let verdict
    if (INDOOR.has(view)) verdict = best.rainCoveragePct <= MAX_INDOOR_COVERAGE_PCT ? 'green' : 'red'
    else if (!best.accentPx) verdict = 'refused' // no accent pixels found: nothing to compare against
    else verdict = best.rainCoveragePct >= MIN_OUTDOOR_COVERAGE_PCT && best.rainLumP99 <= ACCENT_RATIO * best.accentLumMedian ? 'green' : 'red'
    if (verdict === 'red') red++
    if (verdict === 'refused') refused++
    checks++
    console.log(JSON.stringify({ label, q, view, verdict, ...best }))
  }
} catch (e) {
  console.error(`refused: ${e.message.split('\n')[0]}`)
  await browser?.close()
  process.exit(2)
}
await browser.close()
console.log(`rain-gate: ${checks} checks, ${red} red, ${refused} refused`)
process.exit(checks === 0 || refused ? 2 : red ? 1 : 0)
