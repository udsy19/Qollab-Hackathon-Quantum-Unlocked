#!/usr/bin/env node
// Sabotage round for check.mjs. Each case copies echo/data to a fresh temp dir (the real data is
// never touched), applies one mutation to the real text, runs the check, and records the verdict.
// A sabotage that stays GREEN is a null: the check cannot see that defect. Nulls are reported.
//   node evidence/story-ui/story-data/sabotage.mjs   → exit 0 when every case ran (nulls included)

import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const real = resolve(here, '../../../echo/data')
const check = join(here, 'check.mjs')

// [name, file, find, replace]. `find` must exist in the real data, or the case is refused.
const CASES = [
  ['overlong beat', 'story.js', "text: 'Two outputs. Not two copies.'", "text: 'Two outputs. Not two copies. And this sentence keeps going well past any two subtitle lines of text.'"],
  ['hint removed (ladder of 2)', 'objectives.js', "      { kind: 'operation', text: 'Press PREPARE BELL PAIR.' },\n", ''],
  ['hint ladder out of order', 'objectives.js', "{ kind: 'inspect', text: 'One test input has not been tried yet.' }", "{ kind: 'resource', text: 'One test input has not been tried yet.' }"],
  ['faster-than-light line', 'story.js', "'Test pair ready. Left half is yours. The right half plays the receiver.'", "'The pair links us faster than light.'"],
  ['swapped correction rule', 'objectives.js', "'Apply X if m1 = 1 and Z if m0 = 1. Set this for all four results.'", "'Apply Z if m1 = 1 and X if m0 = 1. Set this for all four results.'"],
  ['swapped bit names', 'objectives.js', "'Read the two bits: m0 is the source readout, m1 is your Bell half.'", "'Read the two bits: m0 is your Bell half, m1 is the source readout.'"],
  ['objective key misspelt', 'objectives.js', "  LINK_REPAIRED: { number: 3,", "  LINK_REPAIRD: { number: 3,"],
  ['speaker not in cast', 'story.js', "{ speaker: 'RIN', text: 'One of one.' }", "{ speaker: 'Narrator', text: 'One of one.' }"],
  ['misconception left uncorrected', 'story.js', "{ speaker: 'RIN', text: 'Not anymore.', src: '§4.4' }", "{ speaker: 'RIN', text: 'Of course.' }"],
  ['fake verbatim claim', 'story.js', "'Then we stop trying to make two.'", "'Then we stop trying to make three.'"],
  ['matter teleportation', 'story.js', "'One of one.'", "'Teleport me to the vault.'"],
  ['entanglement signals (plain verb)', 'story.js', "'The state now exists only at the vault.'", "'The entangled pair delivered the token to the vault.'"],
  ['certified randomness', 'teachback.js', "'Thank you for playing.'", "'Every bit was certified random.'"],
  // Expected nulls: phrasings outside the patterns, written to measure the check's reach honestly.
  ['entanglement signals (verb outside list)', 'story.js', "'The state now exists only at the vault.'", "'The Bell pair alone got the token to the vault.'"],
  ['entanglement claim excused by an unrelated "no"', 'story.js', "'The state now exists only at the vault.'", "'The pair carried the secret across the city in no time.'"],
  ['clone claim, "perfect copy"', 'story.js', "'Two outputs. Not two copies.'", "'The booth made a perfect copy of the |+> state.'"],
  ['clone claim, other words', 'story.js', "'Two outputs. Not two copies.'", "'The booth duplicated the |+> state.'"],
  ['randomness claim, other words', 'teachback.js', "'Thank you for playing.'", "'Simulator randomness is truly quantum.'"],
  ['wrong marginal in new text', 'objectives.js', "'Sender flipped its half (X). The receiver alone still sees 50% / 50%.'", "'Sender flipped its half (X). The receiver alone now sees 75% / 25%.'"],
  ['wrong marginal in a verbatim line', 'story.js', "'Receiver-only data: 50% / 50%. No decodable message.'", "'Receiver-only data: 75% / 25%. No decodable message.'"],
]

// Law: a sabotage verdict means nothing unless the unmutated baseline is green.
const base = spawnSync(process.execPath, [check, '--data', real], { encoding: 'utf8' })
if (base.status !== 0) { console.error(`REFUSED: baseline is not green (exit ${base.status}); sabotage verdicts would be contaminated`); process.exit(2) }

const rows = []
let refused = 0
for (const [name, file, find, replace] of CASES) {
  const dir = mkdtempSync(join(tmpdir(), 'story-sabotage-'))
  try {
    cpSync(real, dir, { recursive: true })
    const p = join(dir, file)
    const src = readFileSync(p, 'utf8')
    if (!src.includes(find)) { rows.push([name, 'REFUSED (find string absent)', '']); refused++; continue }
    writeFileSync(p, src.replace(find, replace))
    const r = spawnSync(process.execPath, [check, '--data', dir], { encoding: 'utf8' })
    const firstFail = (r.stdout.match(/^FAIL .*$/m) ?? [r.stderr.trim()])[0] ?? ''
    rows.push([name, r.status === 1 ? 'RED' : r.status === 0 ? 'GREEN (null)' : `exit ${r.status}`, firstFail.slice(0, 140)])
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
console.log('| sabotage | verdict | first failure line |\n|---|---|---|')
for (const [n, v, f] of rows) console.log(`| ${n} | ${v} | ${f.replace(/\|/g, '\\|')} |`)
const nulls = rows.filter(r => r[1].startsWith('GREEN')).length
console.log(`\n${rows.length} cases · ${rows.filter(r => r[1] === 'RED').length} red · ${nulls} null · ${refused} refused`)
process.exit(refused ? 2 : 0)
