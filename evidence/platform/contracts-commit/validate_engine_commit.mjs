// Grade the quantum engine's REAL commit output with validateCommitResult, unadapted.
//   node validate_engine_commit.mjs <contracts.js> <engine_commit.json>    # exit 0 all valid · 1 any invalid · 2 refused
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const [contracts, dump] = process.argv.slice(2)
if (!contracts || !dump) { console.log('REFUSED: usage <contracts.js> <engine_commit.json>'); process.exit(2) }
const C = await import(pathToFileURL(resolve(contracts)).href)
const D = JSON.parse(readFileSync(dump, 'utf8'))
if (!Array.isArray(D.commits) || D.commits.length !== 4) { console.log(`REFUSED: expected 4 commits (one per branch), got ${D.commits?.length}`); process.exit(2) }
let bad = 0
for (const { seed, result } of D.commits) {
  const e = C.validateCommitResult(result)
  bad += e.length > 0
  console.log(`${e.length ? 'INVALID' : 'valid  '} seed=${seed} bits=${JSON.stringify(result.measurementBits)} F=${result.fidelity} parameters=${JSON.stringify(result.parameters)}`)
  for (const x of e) console.log(`    - ${x}`)
}
console.log(`second live_commit without reset: ${D.secondCallWithoutReset}`)
console.log(`engine commits: ${D.commits.length - bad}/${D.commits.length} valid`)
process.exit(bad ? 1 : 0)
