// Feed the quantum lane's REAL results (dump_results.py) to the platform contract validator and to
// gameplay's missionRules, both imported from disposable exports. Exit 0 = every result valid AND
// every happy-path state advances; 1 = a mismatch; 2 = could not run.
//   node cross_lane_check.mjs <results.json> <contracts.js> <missionRules.js>
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [resultsPath, contractsPath, rulesPath] = process.argv.slice(2)
if (!rulesPath) { console.error('usage: node cross_lane_check.mjs results.json contracts.js missionRules.js'); process.exit(2) }
const results = JSON.parse(readFileSync(resultsPath, 'utf8'))
const { validateExperimentResult } = await import(pathToFileURL(contractsPath).href)
const { eventForResult } = await import(pathToFileURL(rulesPath).href)
const WANT = { CLONE_INTRO: 'BASIS_DEMO_OK', CLONE_BASIS_PASSED: 'SUPERPOSITION_DEMO_FAILED', RELAY_INTRO: 'PREPARE_BELL_PAIR',
  RELAY_BELL_CREATED: 'ATTEMPT_NO_SIGNALLING', TELEPORT_DRY_RUN: 'CORRECT_CALIBRATION', TELEPORT_DRY_RUN_PASSED: 'COMMIT_TRANSFER' }
let bad = 0, checked = 0
for (const [state, r] of Object.entries(results)) {
  const errs = validateExperimentResult(r); checked++
  console.log(`\n## ${state}  (${r.experiment}/${r.kind ?? '-'})`)
  console.log(`contract: ${errs.length ? 'INVALID' : 'valid'}`); for (const e of errs) console.log(`  - ${e}`)
  if (errs.length) bad++
  if (WANT[state]) {
    const out = eventForResult(state, r); checked++
    const ok = out.event === WANT[state]
    console.log(`gameplay: want ${WANT[state]}, got ${out.event} (${out.reason})  ${ok ? 'ADVANCES' : 'STUCK'}`)
    if (!ok) bad++
  }
}
if (!checked) { console.error('zero checks ran'); process.exit(2) }
console.log(`\n${bad} of ${checked} checks failed`)
process.exit(bad ? 1 : 0)
