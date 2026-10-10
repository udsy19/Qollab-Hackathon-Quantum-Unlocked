// Feed the quantum engine's REAL two-phase results (dump_teleport_v2.py) to contracts v2's own
// teleport validators: validateTeleportBitsResult, validateTeleportCorrectionResult, dryRunVerdict.
//   node teleport_v2_check.mjs <dump.json> <contracts.js>
// Column "as shipped" is the verdict that ships. Column "renamed" re-keys ONLY parameters
// (state → theta/phi) as a diagnostic: it isolates naming from physics, so a pass there proves the
// engine's fidelities agree with the contract's independent cross-check. It is never the verdict.
// Exit 0 = every as-shipped check passes · 1 = a failure · 2 = could not run / zero checks.
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [dumpPath, contractsPath] = process.argv.slice(2)
if (!contractsPath) { console.error('usage: node teleport_v2_check.mjs dump.json contracts.js'); process.exit(2) }
const d = JSON.parse(readFileSync(dumpPath, 'utf8'))
const C = await import(pathToFileURL(contractsPath).href)
const req1 = { theta: d.state.theta, phi: d.state.phi }
if (C.validateTeleportBitsRequest(req1).length) { console.error('REFUSED: test state not generic', C.validateTeleportBitsRequest(req1)); process.exit(2) }
const rename = r => { const { state, ...p } = r.parameters; return { ...r, parameters: { ...p, theta: req1.theta, phi: req1.phi } } }

let fails = 0, checks = 0, renamedOk = 0, renamedN = 0
const firstErr = new Map()
console.log('## phase 1 (bits) — validateTeleportBitsResult')
for (const [k, r] of Object.entries(d.phase1)) {
  const e = C.validateTeleportBitsResult(req1, r); checks++; if (e.length) fails++
  const e2 = C.validateTeleportBitsResult(req1, rename(r)); renamedN++; if (!e2.length) renamedOk++
  console.log(`bits m0m1=${k}: as shipped ${e.length ? 'INVALID' : 'valid'}; renamed ${e2.length ? 'INVALID ' + e2.join('; ') : 'valid'}`)
  for (const x of e) firstErr.set(x, (firstErr.get(x) ?? 0) + 1)
}
console.log('\n## phase 2 (corrections) — validateTeleportCorrectionResult + dryRunVerdict')
console.log('| m0 m1 | X Z | engine F | as shipped | renamed: passed / unlocksCommit | expected by rule |')
console.log('|---|---|---|---|---|---|')
for (const r of d.phase2) {
  const p = r.parameters
  const req2 = { ...req1, m0: p.m0, m1: p.m1, applyX: p.applyX, applyZ: p.applyZ }
  const e = C.validateTeleportCorrectionResult(req2, r); checks++; if (e.length) fails++
  for (const x of e) firstErr.set(x, (firstErr.get(x) ?? 0) + 1)
  const v = C.dryRunVerdict(req2, rename(r)); renamedN++
  const rule = C.expectedCorrections(p.m0, p.m1)
  const follows = rule.applyX === p.applyX && rule.applyZ === p.applyZ
  // the renamed verdict must say passed exactly when the rule is followed (generic state)
  if (!v.errors.length && v.passed === follows) renamedOk++
  console.log(`| ${p.m0} ${p.m1} | ${+p.applyX} ${+p.applyZ} | ${r.fidelity.toFixed(6)} | ${e.length ? 'INVALID' : 'valid'} | ${v.errors.length ? 'ERR ' + v.errors.join('; ') : `${v.passed} / ${v.unlocksCommit}`} | ${follows ? 'pass' : 'fail'} |`)
}
console.log('\n## as-shipped errors (count × message)')
for (const [m, n] of firstErr) console.log(`${n} × ${m}`)
console.log('\n## commit: what the engine does with the story token')
for (const [name, c] of Object.entries(d.commit)) {
  checks++
  if (c.error) { fails++; console.log(`live_commit(${JSON.stringify(name)}): ERROR ${c.error}`) }
  else console.log(`live_commit(${JSON.stringify(name)}): parameters ${JSON.stringify(c.result.parameters)}`)
}
if (!checks) { console.error('zero checks ran'); process.exit(2) }
console.log(`\nrenamed diagnostic (physics vs the contract's own cross-check): ${renamedOk}/${renamedN} agree`)
console.log(`${fails} of ${checks} as-shipped checks failed`)
process.exit(fails ? 1 : 0)
