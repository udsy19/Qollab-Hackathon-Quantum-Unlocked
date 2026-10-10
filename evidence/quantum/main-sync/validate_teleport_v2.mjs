// Grade the engine's teleport results with contracts v2's REAL two-phase validators.
// The request side is NOT read from the engine: bloch_a is contracts' TELEPORT_TEST_STATE (§10.5),
// bloch_b is typed here from echo/quantum/__init__.py's literal ry(2.3) rz(-1.9) and cross-checked
// by validateTeleportBitsRequest (generic).
// usage: node validate_teleport_v2.mjs <contracts.js> <teleport.jsonl>   exit 0 all valid · 1 any rejected · 2 refused
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
const [cp, rp] = process.argv.slice(2)
const C = await import(pathToFileURL(resolve(cp)).href)
const REQ = { bloch_a: { ...C.TELEPORT_TEST_STATE }, bloch_b: { theta: 2.3, phi: -1.9 } }
for (const [k, r] of Object.entries(REQ)) if (C.validateTeleportBitsRequest(r).length) { console.log(`REFUSED: ${k} request not generic`); process.exit(2) }
const lines = readFileSync(rp, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
if (lines.length < 35) { console.log(`REFUSED: only ${lines.length} lines`); process.exit(2) }
let bad = 0, n = 0
const tally = new Map()
for (const L of lines) {
  n++
  let errs, tag
  if (L.probe) { tag = `probe ${L.probe}`; errs = L.error ? [`engine has no v2 entry point: ${L.error}`] : [] }
  else if (L.phase === 1) { tag = `phase-1 ${L.state}`; errs = C.validateTeleportBitsResult(REQ[L.state], L.result) }
  else { const req = { ...REQ[L.state], m0: L.m0, m1: L.m1, applyX: L.applyX, applyZ: L.applyZ }
    tag = `phase-2 ${L.state} m0=${L.m0} m1=${L.m1} X=${L.applyX} Z=${L.applyZ}`; errs = C.validateTeleportCorrectionResult(req, L.result) }
  if (errs.length) bad++
  for (const e of errs) { const k = `${tag.split(' ')[0]} ${tag.startsWith('probe') ? tag : ''}| ${e.replace(/-?\d+\.\d+/g, '<n>')}`; tally.set(k, (tally.get(k) ?? 0) + 1) }
  console.log(`${errs.length ? 'REJECT' : 'ok    '} ${tag}${errs.length ? '\n         ' + errs.join('\n         ') : ''}`)
}
console.log('\n| phase | distinct error | count |\n|---|---|---|')
for (const [k, c] of tally) { const [p, e] = k.split('| '); console.log(`| ${p.trim()} | ${e} | ${c} |`) }
console.log(`\n${n} results graded, ${bad} rejected`)
process.exit(bad ? 1 : 0)
