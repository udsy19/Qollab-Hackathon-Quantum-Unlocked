#!/usr/bin/env node
// tools/art-preview/interior-gate.mjs — dev-only readability gate for the indoor rooms (never uploaded).
//   node tools/art-preview/serve.mjs 5171 &  then  node tools/art-preview/interior-gate.mjs 5171 [label] [shotDir]
// Needs playwright-core (PW_CORE=/path/to/node_modules/playwright-core) and Chrome, like rain-gate.mjs.
// Same harness shape as rain-gate (poses, exit codes, refuse-on-no-load), but a separate script: rain-gate
// grades a rain-on/rain-off diff, this grades lit surfaces, which needs a material-class pass instead.
//
// Ground truth for "which pixel is what" comes from the SCENE's materials, never from lighting.js: a second
// render swaps every mesh to a flat class colour — opaque (or fully faded-in) MeshBasicMaterial = accent (gameplay's emitters:
// rings, conduit, schematic, strips), any lit material = surface, background = sky. Transparent/additive
// unlit meshes (light cards, glow bars) are graded as SURFACE, so a fill card can never pad the accent side.
//
// Per room (relay / passage / elevator) and preset:
//   readable: surface p50 ≥ MIN_P50 and ≥ MIN_LIT_FRAC of surface pixels at L ≥ LIT_L
//   dark:     surface p90 ≤ MAX_P90 (the mood stays dark; a blown-out wall cannot carry the median)
//   accents:  accent median ≥ surface p99 (vision §5.3: accents first)
// Relay energized (RELAY_BELL_CREATED): surface mean L ≥ ENERGY_GAIN × the same pose before the change,
// and the dark and accents checks still hold after it.
// Exit 0 green · 1 red · 2 refused (could not grade).
import { mkdirSync } from 'node:fs'
let chromium
try { const pw = await import(process.env.PW_CORE ?? 'playwright-core'); chromium = pw.chromium ?? pw.default.chromium } catch (e) { console.error(`refused: playwright-core not found (${e.message})`); process.exit(2) }
const [,, port = '5171', label = 'run', shotDir = ''] = process.argv
if (shotDir) mkdirSync(shotDir, { recursive: true })

// Display-space luminance (0..1) of the delivered sRGB bytes. Before this pass the rooms read 5-10%
// (renders/rain-shelter-readability/after-*-med.png). "Readable but dark": most wall/floor pixels clear a
// low floor, the middle of the room sits near a tenth of white, and the bright tail stays under the accents.
const LIT_L = 0.06, MIN_LIT_FRAC = 0.5, MIN_P50 = 0.075, MAX_P90 = 0.4
const ENERGY_GAIN = 1.15
const ROOMS = ['relay', 'passage', 'elevator']

const measure = (litL) => {
  const a = window.__art, r = a.renderer, gl = r.getContext(), T = a.THREE
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight
  const grab = () => { r.render(a.scene, a.camera); const b = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); return b }
  const beauty = grab()
  // Class pass: red = accent, green = surface, blue = sky. Lines/points (rain) are hidden for this pass only.
  const acc = new T.MeshBasicMaterial({ color: 0xff0000, fog: false }), surf = new T.MeshBasicMaterial({ color: 0x00ff00, fog: false })
  const swapped = [], hidden = []
  a.scene.traverse((o) => {
    if ((o.isLine || o.isLineSegments || o.isPoints) && o.visible) { hidden.push(o); o.visible = false }
    if (!o.isMesh || !o.material) return
    const m = Array.isArray(o.material) ? o.material[0] : o.material
    const accent = m.isMeshBasicMaterial && m.blending === T.NormalBlending && (!m.transparent || m.opacity >= 0.99)
    swapped.push([o, o.material]); o.material = accent ? acc : surf
  })
  const bg = a.scene.background, fog = a.scene.fog
  a.scene.background = new T.Color(0x0000ff); a.scene.fog = null
  const cls = grab()
  a.scene.background = bg; a.scene.fog = fog
  for (const [o, m] of swapped) o.material = m
  for (const o of hidden) o.visible = true
  acc.dispose(); surf.dispose()
  const L = (i) => (0.2126 * beauty[i] + 0.7152 * beauty[i + 1] + 0.0722 * beauty[i + 2]) / 255
  const surfL = [], accL = []; let n = 0, sky = 0, cyan = 0
  for (let i = 0; i < beauty.length; i += 4 * 2) {
    n++
    const R = cls[i], G = cls[i + 1]
    if (R > 200 && G < 60) accL.push(L(i))
    else if (G > 200 && R < 60) { surfL.push(L(i)); cyan += (beauty[i + 1] + beauty[i + 2]) / 2 - beauty[i] }
    else sky++
  }
  const pct = (arr, p) => (arr.length ? arr[Math.floor((arr.length - 1) * p)] : NaN)
  surfL.sort((x, y) => x - y); accL.sort((x, y) => x - y)
  const ns = surfL.length || 1
  const r3 = (x) => +x.toFixed(3)
  return { samples: n, surfacePx: surfL.length, accentPx: accL.length, skyPx: sky,
    p10: r3(pct(surfL, 0.1)), p50: r3(pct(surfL, 0.5)), p90: r3(pct(surfL, 0.9)), p99: r3(pct(surfL, 0.99)),
    mean: r3(surfL.reduce((s, x) => s + x, 0) / ns), litFrac: r3(surfL.filter((x) => x >= litL).length / ns),
    accentMedian: r3(pct(accL, 0.5)), cyanness: r3(cyan / ns / 255) }
}

let red = 0, refused = 0, checks = 0
const verdict = (ok) => { checks++; if (!ok) red++; return ok ? 'green' : 'red' }
let browser
try {
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1300,820'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  page.setDefaultTimeout(15000)
  const shot = async (name) => { if (shotDir) await page.screenshot({ path: `${shotDir}/${label}-${name}.png` }) }
  const out = (o) => console.log(JSON.stringify({ label, ...o }))
  for (const q of ['low', 'med', 'high']) {
    for (const view of [...ROOMS, 'alley']) {
      await page.goto(`http://127.0.0.1:${port}/tools/art-preview/?nopanel&noaudio&q=${q}&view=${view}`)
      await page.waitForFunction(() => window.__art)
      await page.waitForTimeout(1200)
      const m = await page.evaluate(measure, LIT_L)
      await shot(`${view}-${q}`)
      if (view === 'alley') { out({ q, view, verdict: 'info', ...m }); continue }
      if (!m.surfacePx || !m.accentPx) { refused++; out({ q, view, verdict: 'refused', why: 'no surface or accent pixels', ...m }); continue }
      out({ q, view, readable: verdict(m.p50 >= MIN_P50 && m.litFrac >= MIN_LIT_FRAC), dark: verdict(m.p90 <= MAX_P90), accents: verdict(m.accentMedian >= m.p99), ...m })
      if (view !== 'relay') continue
      // §9.3: the Bell pair energizes the relay — gameplay's own state flip (rings, conduit) plus art's handler.
      await page.evaluate(() => {
        const a = window.__art
        a.district.applyQuestState('RELAY_BELL_CREATED', { instant: true })
        a.effects.apply('cyan_conduit_illuminates', { instant: true })
      })
      await page.waitForTimeout(600)
      const e = await page.evaluate(measure, LIT_L)
      await shot(`relay-energized-${q}`)
      out({ q, view: 'relay-energized', energized: verdict(e.mean >= ENERGY_GAIN * m.mean), dark: verdict(e.p90 <= MAX_P90), accents: verdict(e.accentMedian >= e.p99), gain: +(e.mean / m.mean).toFixed(3), ...e })
      // The amber schematic close-up (RELAY_UNDERSTOOD), graded only for the record.
      await page.evaluate(() => {
        const a = window.__art
        a.district.applyQuestState('RELAY_UNDERSTOOD', { instant: true })
        a.effects.apply('amber_schematic_visible', { instant: true })
        a.camera.position.set(0, 2.0, -53.2); a.camera.lookAt(0, 4.2, -59)
      })
      await page.waitForTimeout(600)
      out({ q, view: 'schematic', verdict: 'info', ...(await page.evaluate(measure, LIT_L)) })
      await shot(`schematic-${q}`)
    }
  }
} catch (e) {
  console.error(`refused: ${e.message.split('\n')[0]}`)
  await browser?.close()
  process.exit(2)
}
await browser.close()
console.log(`interior-gate: ${checks} checks, ${red} red, ${refused} refused`)
process.exit(checks === 0 || refused ? 2 : red ? 1 : 0)
