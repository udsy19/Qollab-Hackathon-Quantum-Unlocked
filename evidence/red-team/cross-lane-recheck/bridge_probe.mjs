// Runtime probe of quantum's echo/quantum/bridge.js in NODE (not Pyodide, not Qollab). Its four
// `quantum.*` Python imports are replaced by stubs whose `.callPromising` replays RECORDED REAL
// engine output (dump_results.py / dump_teleport_v2.py) and counts calls; contracts.js is the real
// merged one. Measures: one engine call per run for verifySelectedBackendOnce and commitTransfer,
// retry after a failed commit, and whether the bridge hands the real results on or rejects them.
//   node bridge_probe.mjs <echo-root> <results.json> <teleport_v2.json>
// Exit 0 = every expectation met · 1 = an expectation failed · 2 = could not run.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const [root, resultsPath, tpPath] = process.argv.slice(2)
if (!tpPath) { console.error('usage: node bridge_probe.mjs <echo-root> <results.json> <teleport_v2.json>'); process.exit(2) }
const R = JSON.parse(readFileSync(resultsPath, 'utf8'))
const T = JSON.parse(readFileSync(tpPath, 'utf8'))

let src = readFileSync(join(root, 'quantum/bridge.js'), 'utf8')
const imports = [...src.matchAll(/^import \* as (\w+) from '(quantum\.\w+)';$/gm)]
if (imports.length !== 4) { console.error(`REFUSED: expected 4 quantum.* imports in bridge.js, found ${imports.length}`); process.exit(2) }
for (const [line, local, mod] of imports) src = src.replace(line, `const ${local} = globalThis.__stubs[${JSON.stringify(mod)}];`)
src = src.replace(`from '../contracts.js'`, `from ${JSON.stringify(pathToFileURL(join(root, 'contracts.js')).href)}`)

const calls = {}
// A PyProxy-like value: toJs({dict_converter}) gives the plain object, destroy() is a no-op.
const proxy = v => ({ toJs: () => structuredClone(v), destroy() {} })
const stub = (name, impl) => ({ callPromising: async (...a) => { calls[name] = (calls[name] ?? 0) + 1; return proxy(await impl(...a)) } })
let commitPlan = []  // queued outcomes for live_commit: a result or an Error
globalThis.__stubs = {
  'quantum.cloning': { run_calibration: stub('run_calibration', () => R.CLONE_INTRO) },
  'quantum.entanglement': { bell_signalling: stub('bell_signalling', () => R.RELAY_INTRO) },
  'quantum.teleportation': {
    bell_measurement: stub('bell_measurement', () => Object.values(T.phase1)[0]),
    teleport_branch: stub('teleport_branch', () => T.phase2[0]),
    live_commit: stub('live_commit', () => { const x = commitPlan.shift(); if (x instanceof Error) throw x; return x }),
  },
  'quantum.qollab_job': { run_bell_verification_once: stub('run_bell_verification_once', () => R.BACKEND_VERIFICATION) },
}
globalThis.backend = { name: 'probe-backend' }
const dir = mkdtempSync(join(tmpdir(), 'bridge-probe-'))
writeFileSync(join(dir, 'bridge.mjs'), src)
const B = await import(pathToFileURL(join(dir, 'bridge.mjs')).href)
console.error = () => {}  // the bridge logs rejections; the probe reports them itself

const rows = []
let bad = 0
const expect = (what, ok, detail) => { rows.push(`${ok ? 'PASS' : 'FAIL'}  ${what}  — ${detail}`); if (!ok) bad++ }
const settle = p => p.then(v => ({ ok: true, v }), e => ({ ok: false, e }))

// 1. verifySelectedBackendOnce: one engine call per run, however often it is pressed.
const v = await Promise.all([1, 2, 3].map(() => settle(B.verifySelectedBackendOnce())))
expect('verifySelectedBackendOnce ×3 reaches Python once', calls.run_bell_verification_once === 1, `python calls = ${calls.run_bell_verification_once}`)
expect('verifySelectedBackendOnce hands the REAL backend result on', v[0].ok,
  v[0].ok ? 'resolved' : `rejected: ${v[0].e.message.slice(0, 220)}`)

// 2. commitTransfer: a failed call unlatches (nothing measured), a returned result latches.
commitPlan = [new Error('ValueError: simulated bridge failure'), T.phase2[6], T.phase2[6]]
const c1 = await settle(B.commitTransfer('bloch_a'))
const c2 = await settle(B.commitTransfer('bloch_a'))
const c3 = await settle(B.commitTransfer('bloch_a'))
expect('commitTransfer retries after a failed call', !c1.ok && calls.live_commit >= 2, `first ${c1.ok ? 'resolved' : 'rejected'}, python calls after 2 = ${calls.live_commit}`)
expect('commitTransfer latches after a returned result', c2.ok && c3.ok && calls.live_commit === 2 && c2.v === c3.v,
  `python calls after 3 = ${calls.live_commit}, same result object = ${c2.ok && c3.ok && c2.v === c3.v}`)

// 3. the story token through the bridge: what gameplay's rule needs (parameters.stateId 'story_token').
const story = T.commit.story_token
expect('the engine accepts a story-token commit', !story.error, story.error ? `live_commit('story_token') → ${story.error}` : 'ok')

console.log(`bridge.js runtime probe (Node + stubs replaying recorded real output; NOT Pyodide/Qollab) on ${root}`)
for (const r of rows) console.log(r)
console.log(`${bad} of ${rows.length} expectations failed`)
process.exit(rows.length === 0 ? 2 : bad ? 1 : 0)
