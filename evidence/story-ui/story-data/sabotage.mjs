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
  ['swapped correction rule', 'objectives.js', "'Apply X if m1 = 1 and Z if m0 = 1.'", "'Apply Z if m1 = 1 and X if m0 = 1.'"],
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
  // data-fixes (consult 4): one case per new check.
  ['credits: one character off the ruling', 'teachback.js', 'Harman, Epa', 'Harman, Eppa'],
  ['credits: an email added', 'teachback.js', "'Thank you for playing.'", "'Thank you for playing. team@example.com'"],
  ['m0 label in the old order', 'objectives.js', "m0Label: 'SOURCE READOUT m0'", "m0Label: 'm0  SOURCE READOUT'"],
  ['m1 label in the old order', 'objectives.js', "m1Label: 'LOCAL BELL-HALF READOUT m1'", "m1Label: 'm1  LOCAL BELL-HALF READOUT'"],
  ['dry run uses a partner at the vault', 'story.js', "'This console has a test rig. Both Bell halves stay here.'", "'Three slots: test source, your Bell half, and its partner at the vault.'"],
  ['dry run puts a half in the vault (other words)', 'story.js', "'This console has a test rig. Both Bell halves stay here.'", "'Your Bell half is here. The other waits in the vault.'"],
  ['zero-countdown beats removed', 'story.js', "    { speaker: 'MIRROR', text: 'Grid isolation held. Manual confirmation pending.' },\n    { speaker: 'MICA', text: 'The clock hit zero. Backup is still holding. Hurry, Rin.' },\n", ''],
  ['zero beat no longer says held (Mica still says holding)', 'story.js', "'Grid isolation held. Manual confirmation pending.'", "'Grid isolation paused. Manual confirmation pending.'"],
  ['HUD held status removed', 'objectives.js', "  countdownHeld: 'ISOLATION HELD // AWAITING CONFIRMATION',\n", ''],
  ['timer ends the game', 'story.js', "'The clock hit zero. Backup is still holding. Hurry, Rin.'", "'The clock hit zero. Game over, Rin.'"],
  ['00 dry-run beat removed', 'story.js', "    { speaker: 'VEGA', text: 'Right, but 00 needs no fix. That proves nothing yet.' },\n", ''],
  ['commit_locked drops the non-00 rule', 'objectives.js', "'Commit locked. First pass a dry run whose bits are not 00: the token can be measured only once.'", "'Commit locked. Pass a dry run first: the token can be measured only once.'"],
  ['Rin given a pronoun', 'story.js', "'The clock hit zero. Backup is still holding. Hurry, Rin.'", "'The clock hit zero. Tell Rin she has to hurry.'"],
  ['teach-back with two right choices', 'teachback.js', "{ wrong: 'The booth needed more power.'", "{ right: 'The booth needed more power.'"],
  ['teach-back choice without a why', 'teachback.js', "why: 'Yes. Correlation is not a message.'", "why: ''"],
  ['teach-back scored', 'teachback.js', "'Yes. Two bits pick one of four fixes.'", "'Yes. +1 point. Two bits pick one of four fixes.'"],
  ['captions can be turned off', 'objectives.js', "pause: 'ESC  PAUSE',", "pause: 'ESC  PAUSE (turn off captions here)',"],
  ['branch: extra_X claims "already right" again', 'objectives.js', "'X was on but m1 = 0. That X added a bit flip the bits never called for.'", "'X was on but m1 = 0. That flip damaged a state that was already right.'"],
  ['branch: missing_Z claims "left phase-flipped" again', 'objectives.js', "'m0 = 1 but Z was off. The phase flip that m0 = 1 flags was never undone.'", "'m0 = 1 but Z was off. The receiver state is left phase-flipped.'"],
  ['branch: both-wrong case names only one flip', 'objectives.js', "'11:00': ['missing_X', 'missing_Z']", "'11:00': ['missing_X']"],
  ['branch: failure line on a correct plan', 'objectives.js', "'01:10': []", "'01:10': ['extra_X']"],
  ['branch: wrong line for the case', 'objectives.js', "'01:00': ['missing_X']", "'01:00': ['extra_X']"],
  ['branch: a case deleted', 'objectives.js', " '10:01': [],", ''],
  ['branch: unjudged failure line added', 'objectives.js', "    blind_spot:", "    no_corrections: 'No corrections set.',\n    blind_spot:"],
  ['branch: line text off its claim record', 'objectives.js', "'X was on but m1 = 0. That X added a bit flip the bits never called for.'", "'X was on but m1 = 1. That X added a bit flip the bits never called for.'"],
  // Enabling step (law 15): break the PHYSICS, not the data. The real data must go red.
  ['truth: m0/m1 swapped in the projection', null, null, null, { truth: ["(i & 1) != m0 or ((i >> 1) & 1) != m1", "(i & 1) != m1 or ((i >> 1) & 1) != m0"] }],
  ['truth: plan applies Z where X belongs', null, null, null, { truth: ["plan.x(2)", "plan.z(2)"] }],
  ['truth: python missing', null, null, null, { env: { ECHO_PYTHON: '/nonexistent/python' } }],
]
const truthSrc = join(here, '../data-fixes/branch_truth.py')

// Law: a sabotage verdict means nothing unless the unmutated baseline is green.
const base = spawnSync(process.execPath, [check, '--data', real], { encoding: 'utf8' })
if (base.status !== 0) { console.error(`REFUSED: baseline is not green (exit ${base.status}); sabotage verdicts would be contaminated`); process.exit(2) }

const rows = []
let refused = 0
for (const [name, file, find, replace, opt = {}] of CASES) {
  const dir = mkdtempSync(join(tmpdir(), 'story-sabotage-'))
  try {
    cpSync(real, dir, { recursive: true })
    const env = { ...process.env, ...(opt.env ?? {}) }
    if (file) {
      const p = join(dir, file)
      const src = readFileSync(p, 'utf8')
      if (!src.includes(find)) { rows.push([name, 'REFUSED (find string absent)', '']); refused++; continue }
      writeFileSync(p, src.replace(find, replace))
    }
    if (opt.truth) {
      const t = readFileSync(truthSrc, 'utf8')
      if (!t.includes(opt.truth[0])) { rows.push([name, 'REFUSED (find string absent)', '']); refused++; continue }
      const tp = join(dir, 'branch_truth.py')
      writeFileSync(tp, t.replace(opt.truth[0], opt.truth[1]))
      env.ECHO_BRANCH_TRUTH = tp
    }
    const r = spawnSync(process.execPath, [check, '--data', dir], { encoding: 'utf8', env })
    const firstFail = (r.stdout.match(/^FAIL .*$/m) ?? [r.stderr.trim()])[0] ?? ''
    rows.push([name, r.status === 1 ? 'RED' : r.status === 0 ? 'GREEN (null)' : r.status === 2 ? 'REFUSED by gate (exit 2)' : `exit ${r.status}`, firstFail.slice(0, 140)])
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
console.log('| sabotage | verdict | first failure line |\n|---|---|---|')
for (const [n, v, f] of rows) console.log(`| ${n} | ${v} | ${f.replace(/\|/g, '\\|')} |`)
const nulls = rows.filter(r => r[1].startsWith('GREEN')).length
console.log(`\n${rows.length} cases · ${rows.filter(r => r[1] === 'RED').length} red · ${nulls} null · ${refused} refused`)
process.exit(refused ? 2 : 0)
