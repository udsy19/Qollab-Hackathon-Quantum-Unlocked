// Run every dumped bridge result through the platform's REAL validateExperimentResult.
// usage: node validate.mjs <path/to/contracts.js> <results.jsonl>
// Exit: 0 every call valid · 1 at least one rejected or errored · 2 could not grade (no input, no validator).
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const [contractsPath, resultsPath] = process.argv.slice(2)
if (!contractsPath || !resultsPath) { console.error('usage: node validate.mjs <contracts.js> <results.jsonl>'); process.exit(2) }
const { validateExperimentResult } = await import(pathToFileURL(resolve(contractsPath)).href)
if (typeof validateExperimentResult !== 'function') { console.error('no validateExperimentResult export'); process.exit(2) }

const lines = readFileSync(resultsPath, 'utf8').split('\n').filter(Boolean)
if (lines.length === 0) { console.error('zero results: refusing to grade'); process.exit(2) }

let bad = 0
const byFn = new Map()
for (const line of lines) {
  const { call, result, error } = JSON.parse(line)
  const errs = error ? [`python raised ${error}`] : validateExperimentResult(result)
  const fn = call.replace(/\(.*$/, '')
  const row = byFn.get(fn) ?? { calls: 0, rejected: 0, errors: new Map() }
  row.calls++
  if (errs.length) { row.rejected++; bad++ }
  for (const e of errs) { const k = e.replace(/"\d[\d.e-]*"/g, '"<n>"'); row.errors.set(k, (row.errors.get(k) ?? 0) + 1) }
  byFn.set(fn, row)
  console.log(`${errs.length ? 'REJECT' : 'ok    '} ${call}${errs.length ? '\n         ' + errs.join('\n         ') : ''}`)
}
console.log('\n| function | calls | rejected | distinct errors (count) |\n|---|---|---|---|')
for (const [fn, r] of byFn) {
  const errs = [...r.errors].map(([e, n]) => `${e} (${n})`).join('<br>') || '—'
  console.log(`| \`${fn}\` | ${r.calls} | ${r.rejected} | ${errs} |`)
}
console.log(`\n${lines.length} calls graded, ${bad} rejected`)
process.exit(bad ? 1 : 0)
