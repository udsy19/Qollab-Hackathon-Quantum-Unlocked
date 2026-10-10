#!/usr/bin/env node
// Story-data gate for ECHO (lane story-ui). Local tooling only; never shipped in echo/.
//
//   node evidence/story-ui/story-data/check.mjs [--data <dir>] [--vision <file>]
//
// Exit codes: 0 green · 1 red · 2 refused (could not grade: missing vision doc, module that will not
// import, or zero checks run).
//
// Independence: the quest states and the cast are parsed from ECHO_MASTER_VISION.md (§9.1, §2.2),
// never from the data under test or from contracts.js. Every string the data modules export is
// walked recursively, so a forbidden claim cannot hide in a field this file did not anticipate.

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../..')
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined }
const dataDir = resolve(arg('--data') ?? join(repo, 'echo/data'))
const visionPath = resolve(arg('--vision') ?? join(repo, 'ECHO_MASTER_VISION.md'))

const LINE = 42
const MAX_LINES = 2
const refuse = msg => { console.error(`REFUSED: ${msg}`); process.exit(2) }

// ------------------------------------------------------------------ ground truth from the vision doc
if (!existsSync(visionPath)) refuse(`vision doc not found at ${visionPath}`)
const vision = readFileSync(visionPath, 'utf8')

const s91 = vision.match(/## 9\.1 Required states\s+```\s*\n([\s\S]*?)```/)
if (!s91) refuse('could not find the §9.1 state list in the vision doc')
const STATES = s91[1].split('\n').map(s => s.trim()).filter(Boolean)
if (STATES.length < 10 || !STATES.every(s => /^[A-Z_]+$/.test(s))) refuse(`§9.1 parse looks wrong: ${STATES.join(',')}`)

// The HUD objective is on screen from the first free-roam moment until the transfer animation ends
// (§4.1 Shot D fades the HUD in; §4.4 Beat 5 hands over to the ending). Derived by position in §9.1.
const from = STATES.indexOf('FREE_ROAM_ALLEY'), to = STATES.indexOf('TELEPORT_COMMITTED')
if (from < 0 || to < from) refuse('§9.1 lacks FREE_ROAM_ALLEY..TELEPORT_COMMITTED')
const HUD_STATES = STATES.slice(from, to + 1)

const s22 = vision.match(/## 2\.2 Characters([\s\S]*?)\n## /)
if (!s22) refuse('could not find §2.2 Characters')
const CAST = [...s22[1].matchAll(/^### (\S+)/gm)].map(m => m[1].toUpperCase())
if (CAST.length < 4) refuse(`§2.2 cast parse looks wrong: ${CAST.join(',')}`)

// ------------------------------------------------------------------ load the data under test
async function load(file) {
  const p = join(dataDir, file)
  if (!existsSync(p)) refuse(`${p} does not exist`)
  try { return await import(pathToFileURL(p).href) } catch (e) { refuse(`${p} failed to import: ${e.message}`) }
}
const story = await load('story.js')
const objectives = await load('objectives.js')
const teachback = await load('teachback.js')

let checks = 0
const NEG = /\b(not|no|never|cannot|can't|won't|isn't|aren't|doesn't|didn't|nothing|without|neither|nor|none)\b|n't\b/i
// "no-cloning" is a name, not a negation: strip it before looking for one.
const NEG_FOR = s => typeof s === 'string' && NEG.test(s.replace(/no[- ]cloning/gi, ''))
const failures = []
const fail = (where, msg) => failures.push(`${where}: ${msg}`)
const check = (ok, where, msg) => { checks++; if (!ok) fail(where, msg) }

// Greedy word wrap, the way a subtitle box lays words out.
function wrap(text) {
  const lines = []
  let cur = ''
  for (const w of String(text).trim().split(/\s+/)) {
    if (w.length > LINE) return null
    if (!cur) cur = w
    else if (cur.length + 1 + w.length <= LINE) cur += ' ' + w
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines
}

// ------------------------------------------------------------------ 1. beats fit 2×42 and speakers are cast
const beatGroups = []
for (const name of ['STORY', 'MOMENTS']) {
  const g = story[name]
  if (!g || typeof g !== 'object') { fail(`story.${name}`, 'missing export'); continue }
  for (const [id, beats] of Object.entries(g)) beatGroups.push([`story.${name}.${id}`, beats])
}
if (!beatGroups.length) fail('story', 'no beat groups at all')
let beatCount = 0
for (const [where, beats] of beatGroups) {
  check(Array.isArray(beats) && beats.length > 0, where, 'must be a non-empty array of beats')
  if (!Array.isArray(beats)) continue
  beats.forEach((b, i) => {
    beatCount++
    const w = `${where}[${i}]`
    check(b && typeof b.text === 'string' && b.text.trim() !== '', w, 'text must be a non-empty string')
    check(b && typeof b.speaker === 'string' && CAST.includes(b.speaker), w,
      `speaker ${JSON.stringify(b?.speaker)} is not in the §2.2 cast (${CAST.join(', ')})`)
    const lines = wrap(b?.text ?? '')
    check(lines !== null && lines.length <= MAX_LINES, w,
      `does not fit ${MAX_LINES}×${LINE}: ${lines ? lines.length + ' lines' : 'a word longer than ' + LINE} — "${b?.text}"`)
  })
}

// A beat that voices a misconception (`misconception: true`) must be corrected by the very next
// beat, which must carry a negation; only then is it excused from the negatable claim patterns.
const excusedBeats = new Set()
for (const [where, beats] of beatGroups) {
  if (!Array.isArray(beats)) continue
  beats.forEach((b, i) => {
    if (b?.misconception !== true) return
    const next = beats[i + 1]
    check(next && NEG_FOR(next.text), `${where}[${i}]`, `misconception "${b.text}" is not corrected by a negating next beat`)
    excusedBeats.add(b)
  })
}

// Every quest state that opens a story sequence must be a real §9.1 state (keys verbatim).
for (const id of Object.keys(story.STORY ?? {})) check(STATES.includes(id), `story.STORY.${id}`, 'key is not a §9.1 state')

// ------------------------------------------------------------------ 2. every HUD-visible state has an objective
const OBJ = objectives.OBJECTIVES
if (!OBJ) fail('objectives.OBJECTIVES', 'missing export')
for (const s of HUD_STATES) {
  const o = OBJ?.[s]
  check(o && typeof o.text === 'string' && o.text.trim() !== '' && Number.isInteger(o.number), `objectives.OBJECTIVES.${s}`,
    `state the player sees has no objective {number, text}`)
}
for (const k of Object.keys(OBJ ?? {})) check(STATES.includes(k), `objectives.OBJECTIVES.${k}`, 'key is not a §9.1 state')

// ------------------------------------------------------------------ 3. every puzzle has exactly 3 escalating hints
const HINTS = objectives.HINTS
const LADDER = ['inspect', 'resource', 'operation'] // §6.6: inspection → resource → operation
if (!HINTS || !Object.keys(HINTS).length) fail('objectives.HINTS', 'missing or empty')
const hintedStates = new Set()
for (const [pid, p] of Object.entries(HINTS ?? {})) {
  const w = `objectives.HINTS.${pid}`
  check(Array.isArray(p?.ladder) && p.ladder.length === 3, w, `must have exactly 3 hints, has ${p?.ladder?.length ?? 0}`)
  ;(p?.ladder ?? []).forEach((h, i) => {
    check(h?.kind === LADDER[i], `${w}[${i}]`, `hint ${i + 1} must be kind "${LADDER[i]}", is ${JSON.stringify(h?.kind)}`)
    check(typeof h?.text === 'string' && h.text.trim() !== '', `${w}[${i}]`, 'hint text missing')
  })
  check(Array.isArray(p?.states) && p.states.length > 0, w, 'must name the quest states it applies to')
  for (const s of p?.states ?? []) { check(STATES.includes(s), w, `state ${s} is not a §9.1 state`); hintedStates.add(s) }
}
// A player can be stuck in any interactive state; each needs a ladder. (OPENING is a cutscene,
// TELEPORT_COMMITTED an animation — neither waits on the player.)
for (const s of HUD_STATES.filter(s => s !== 'TELEPORT_COMMITTED')) {
  check(hintedStates.has(s), `objectives.HINTS`, `no hint ladder covers state ${s}`)
}

// ------------------------------------------------------------------ 4. teach-back
const TB = teachback.TEACHBACK
check(Array.isArray(TB) && TB.length === 3, 'teachback.TEACHBACK', `must hold the 3 §4.5 questions, has ${TB?.length ?? 0}`)
;(TB ?? []).forEach((q, i) => {
  check(typeof q?.question === 'string' && typeof q?.answer === 'string' && q.answer.trim() !== '', `teachback.TEACHBACK[${i}]`, 'needs question and answer')
})

// ------------------------------------------------------------------ 5. forbidden claims, everywhere
// Derived from the MEANING of §2.4 and §7.5, not its words. A sentence is the unit; claims that a
// sentence may legitimately negate ("entanglement alone cannot send a message") are excused only by
// a negation in the same sentence. Unconditional patterns are never excused.
const UNCONDITIONAL = [
  [/faster[- ]than[- ]light|\bftl\b|superluminal/i, 'faster-than-light signalling (§2.4)'],
  [/certif\w*[^.]{0,30}random|\btrue(ly)? random|genuine(ly)? random|physical(ly)? quantum (entropy|random)|quantum[- ]random(ness)? (number|generator|source)|certified quantum/i, 'certified/physical quantum randomness from a simulator (§2.4, §7.5)'],
  [/unhackable|unbreakable|quantum encryption|quantum advantage/i, '§7.5 forbidden marketing claim'],
  [/instant(ly)? (quantum )?message|quantum message/i, '"instant/quantum message" (§7.5)'],
  [/teleport\w*\s+(rin|her|him|me|you|us|them|matter|people|objects?|atoms?|the (capsule|body|courier|token|device))\b|\bbeam(ed|s|ing)? (me|her|him|you|us|it) (up|over|across)/i, 'material teleportation (§2.4)'],
  [/\b(eye|eyes|eyeball|glance)\b[^.]{0,40}\b(qubit|particle|state|photon)|\b(look(s|ed|ing)?|peek(s|ed|ing)?|glanc\w+) at (the |a |an |it |this )?(qubit|particle|photon|quantum state)|\bwatching (the |a )?(qubit|particle)/i, 'measurement framed as a human eye looking (§2.4)'],
  [/\bX\s+(if|when|iff|on|for)\s+m0\b|\bZ\s+(if|when|iff|on|for)\s+m1\b/, 'swapped correction rule (§7.1: X iff m1=1, Z iff m0=1)'],
  [/\bm0\b[^.;]{0,20}\b(relay|bell[- ]half|local bell)|\bm1\b[^.;]{0,20}\bsource\b/i, 'swapped bit names (§7.1: m0 = source readout, m1 = local Bell half)'],
  // §7.3: for an ideal Bell pair the receiver-only marginal is exactly 50/50, whatever the sender does.
  [/\b(?!50%\s*\/\s*50%)\d{1,3}(\.\d+)?%\s*\/\s*\d{1,3}(\.\d+)?%/, 'receiver-only split other than 50% / 50% (§7.3)'],
]
const NEGATABLE = [
  // entanglement (blue link, Bell pair) carrying the message by itself
  [/(entangle\w*|bell pair|blue (link|cable)|correlation)[^.?!]{0,60}\b(send|sends|sent|transmit\w*|deliver\w*|carr(y|ies|ied)|signal\w*|messag\w*|instant\w*|immediate\w*)\b/i, 'entanglement transmits the message (§2.4)'],
  [/\b(instant\w*|immediate\w*)\b[^.?!]{0,40}\b(send|sent|arriv\w*|transfer\w*|transmit\w*|messag\w*|deliver\w*)/i, 'instant transfer (§2.4, §7.5)'],
  // a second independent copy of an unknown / the story state
  [/\b(two|second|independent|extra|spare|backup) (copies|copy|clones?|duplicates?)\b[^.?!]{0,30}\b(unknown|token|qubit|quantum state|source state|authori[sz]ation)|\bclon(e|ed|es|ing) (the|an?|this|that) (unknown|token|qubit|quantum state|source)|\b(still|both) (have|has|hold|holds) (it|the (state|token))\b/i, 'an independent copy of an unknown state (§2.4)'],
  [/\b(perfect|exact|identical|true|working|faithful) (copy|copies|clone|clones|duplicate)\b/i, 'a working copy of a quantum state (§2.4)'],
  // no-cloning stretched to classical information
  [/(no[- ]cloning|physics|quantum)[^.?!]{0,40}\b(prevent\w*|forbid\w*|stop\w*|block\w*|ban\w*)\b[^.?!]{0,30}\b(storage|storing|authenticat\w*|classical|files?|data|bits)\b/i, 'no-cloning stretched to storage/authentication/classical copying (§2.4)'],
]
const strings = [] // [path, string, owning object]
const sourced = []  // objects claiming { text, src }: text quoted verbatim from the vision
function walk(v, path, owner) {
  if (typeof v === 'string') strings.push([path, v, owner])
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, v))
  else if (v && typeof v === 'object') {
    if ('src' in v) sourced.push([path, v])
    for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, v)
  }
}
for (const [mod, name] of [[story, 'story'], [objectives, 'objectives'], [teachback, 'teachback']]) {
  for (const [k, v] of Object.entries(mod)) walk(v, `${name}.${k}`)
}
// Strings that QUOTE a misconception so it can be corrected say so, and only they are exempt
// from the negatable patterns: a field named `misconception` or `wrong` (teach-back distractors).
const quotesMisconception = p => /\.(misconception|wrong)(\[|$)/.test(p)
for (const [path, s, owner] of strings) {
  if (/\.src$/.test(path)) continue
  for (const sentence of s.split(/(?<=[.?!])\s+/)) {
    for (const [re, why] of UNCONDITIONAL) { checks++; if (re.test(sentence)) fail(path, `${why}: "${sentence}"`) }
    if (quotesMisconception(path) || excusedBeats.has(owner)) continue
    const negated = NEG_FOR(sentence)
    for (const [re, why] of NEGATABLE) { checks++; if (re.test(sentence) && !negated) fail(path, `${why}: "${sentence}"`) }
  }
}

// ------------------------------------------------------------------ 6. "verbatim" means verbatim
// A `src` tag claims the text is quoted from the vision doc. Verify it against the doc's bytes
// (quotes and whitespace normalised), so new text cannot pass itself off as the owner's.
const norm = t => t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ')
const visionNorm = norm(vision)
for (const [path, o] of sourced) {
  const t = o.text ?? o.question
  check(typeof t === 'string' && visionNorm.includes(norm(t)), path, `claims src ${o.src} but its text is not in the vision verbatim: "${t}"`)
}

// ------------------------------------------------------------------ 7. owner and supervisor rulings
// Exact strings come from the rulings, not from the data: lanes/story-ui/rulings.md (2026-10-10) and
// the supervisor's consult-4 brief, which fixed the credit line byte for byte.
const RULED = {
  team: 'Team The Quantubians (NYU Tandon School of Engineering): Udaya (captain), George, Harman, Epa',
  support: 'This effort is supported by Qollab & IonQ',
  licenseHolder: 'udsy19 and contributors',
  m0Label: 'SOURCE READOUT m0',
  m1Label: 'LOCAL BELL-HALF READOUT m1',
}
const CR = teachback.CREDITS ?? []
const credit = role => CR.filter(c => c?.role === role).map(c => c.text)
check(credit('team').length === 1 && credit('team')[0] === RULED.team, 'teachback.CREDITS.team', `must be exactly "${RULED.team}", is ${JSON.stringify(credit('team'))}`)
check(credit('support').length === 1 && credit('support')[0] === RULED.support, 'teachback.CREDITS.support', `must be exactly "${RULED.support}"`)
check(credit('license').some(t => t.includes(RULED.licenseHolder)), 'teachback.CREDITS.license', `must name "${RULED.licenseHolder}"`)
check(!CR.some(c => /@/.test(c?.text ?? '')), 'teachback.CREDITS', 'no emails in the credits')
const TT = objectives.TERMINALS?.teleport_terminal ?? {}
check(TT.m0Label === RULED.m0Label, 'objectives.TERMINALS.teleport_terminal.m0Label', `must be exactly "${RULED.m0Label}", is ${JSON.stringify(TT.m0Label)}`)
check(TT.m1Label === RULED.m1Label, 'objectives.TERMINALS.teleport_terminal.m1Label', `must be exactly "${RULED.m1Label}", is ${JSON.stringify(TT.m1Label)}`)

// Dry runs use the in-room test rig on fresh calibration states; only COMMIT spends a vault pair
// (VEGA: "Don't spend vault pairs on experiments"). In dry-run text, a sentence that names the vault
// must be about COMMIT or be a negation.
const DRY = /^(story\.STORY\.TELEPORT_DRY_RUN|story\.MOMENTS\.teleport_dry_run|objectives\.HINTS\.teleport_correct|objectives\.FAILURES\.teleportation)/
for (const [path, s] of strings) {
  checks++
  if (/partner (half )?at the vault/i.test(s)) fail(path, `dry runs never use a vault partner: "${s}"`)
  if (!DRY.test(path)) continue
  for (const sentence of s.split(/(?<=[.?!])\s+/)) {
    checks++
    if (/vault/i.test(sentence) && !/commit/i.test(sentence) && !NEG_FOR(sentence)) fail(path, `dry-run text puts the vault in the experiment: "${sentence}"`)
  }
}

// §1 anti-goal: "no game-over resulting from a non-pausing timer". At 00:00 the display holds, a
// held status shows, and the story continues.
if (!/no game-over resulting from a non-pausing timer/.test(vision)) refuse('vision no longer states the no-game-over timer anti-goal')
const zero = story.MOMENTS?.countdown_zero
check(Array.isArray(zero) && zero.length > 0, 'story.MOMENTS.countdown_zero', 'the countdown reaching 00:00 needs a beat')
// The held word must be about the isolation itself, not any other thing that happens to be "holding".
const HELD = /isolation[^.?!]*\b(hold|holds|held|holding)\b|\b(hold|holds|held|holding)\b[^.?!]*isolation/i
check(Array.isArray(zero) && zero.some(b => HELD.test(b?.text ?? '')), 'story.MOMENTS.countdown_zero', 'the zero beat must say the grid isolation is held')
check(typeof objectives.HUD?.countdownHeld === 'string' && /\bHELD\b/.test(objectives.HUD.countdownHeld), 'objectives.HUD.countdownHeld', 'the HUD needs a held status line for 00:00')
for (const [path, s] of strings) { checks++; if (/game[- ]over|mission failed|too late|you failed|time'?s up/i.test(s)) fail(path, `the timer never ends the game (§1): "${s}"`) }

// COMMIT unlocks after one correct dry run with bits other than 00 (owner ruling 2026-10-10): a
// correct 00 run needs no correction, so it proves nothing and must say so.
const d00 = story.MOMENTS?.teleport_dry_run_00
check(Array.isArray(d00) && d00.some(b => /\b00\b/.test(b?.text ?? '')), 'story.MOMENTS.teleport_dry_run_00', 'a correct 00 dry run must say it does not unlock COMMIT')
check(/\b00\b/.test(objectives.FAILURES?.teleportation?.commit_locked ?? ''), 'objectives.FAILURES.teleportation.commit_locked', 'must say the passing dry run needs bits other than 00')

// Rin has no pronouns (owner ruling). No data string uses a gendered third-person pronoun.
for (const [path, s] of strings) { checks++; if (!/\.src$/.test(path) && /\b(she|her|hers|herself|he|him|his|himself)\b/i.test(s)) fail(path, `gendered pronoun: "${s}"`) }

// Teach-back: one right and two wrong choices per question, each with a why; no score anywhere.
;(TB ?? []).forEach((q, i) => {
  const c = q?.choices ?? []
  check(c.length === 3 && c.filter(x => 'right' in x).length === 1 && c.filter(x => 'wrong' in x).length === 2, `teachback.TEACHBACK[${i}]`, 'needs exactly 1 right and 2 wrong choices')
  c.forEach((x, j) => check(typeof x?.why === 'string' && x.why.trim() !== '', `teachback.TEACHBACK[${i}].choices[${j}]`, 'every choice needs a why'))
})
for (const [path, s] of strings) {
  checks++
  if (/^teachback\.TEACHBACK/.test(path) && /\bscores?\b|\bpoints?\b|\d+\s*(\/|of|out of)\s*3\b/i.test(s)) fail(path, `teach-back is unscored: "${s}"`)
  checks++
  if (/(captions?|subtitles?)\s+(off|disabled)|(disable|turn off|hide)\s+(the )?(captions?|subtitles?)/i.test(s)) fail(path, `captions are always on: "${s}"`)
}

// ------------------------------------------------------------------ 8. teleportation failure lines are true on every branch
// Ground truth: branch_truth.py runs the real protocol in local Qiskit for every (m0, m1) × (X, Z)
// plan on a generic state and reports what the receiver holds. It never reads echo/data.
const PY = process.env.ECHO_PYTHON ?? '/Users/udsy/PycharmProjects/Qollab-Hackathon-Quantum-Unlocked/.venv/bin/python'
// ECHO_BRANCH_TRUTH exists only so the sabotage round can swap in a deliberately broken protocol.
const bt = spawnSync(PY, ['-I', resolve(process.env.ECHO_BRANCH_TRUTH ?? join(here, '../data-fixes/branch_truth.py'))], { encoding: 'utf8' })
if (bt.status !== 0) refuse(`branch_truth.py did not run (${PY}, exit ${bt.status}): ${(bt.stderr || bt.error?.message || '').trim().slice(-300)}`)
const TRUTH = JSON.parse(bt.stdout).rows
if (TRUTH.length !== 16) refuse(`branch truth has ${TRUTH.length} rows, expected 16`)
// What each failure line claims, recorded here by reading its words. `text` binds the record to the
// line: if the words change, the record no longer matches and the line is unjudged (red).
const LINE_CLAIMS = {
  missing_X: { text: [/\bm1 = 1\b/, /\bX was off\b/], holds: r => r.m1 === 1 && r.x === 0 && r.bitFlipLeft, flip: 'X' },
  extra_X: { text: [/\bm1 = 0\b/, /\bX was on\b/], holds: r => r.m1 === 0 && r.x === 1 && r.bitFlipLeft, flip: 'X' },
  missing_Z: { text: [/\bm0 = 1\b/, /\bZ was off\b/], holds: r => r.m0 === 1 && r.z === 0 && r.phaseFlipLeft, flip: 'Z' },
  extra_Z: { text: [/\bm0 = 0\b/, /\bZ was on\b/], holds: r => r.m0 === 0 && r.z === 1 && r.phaseFlipLeft, flip: 'Z' },
}
// Lines that are not chosen by (bits, plan): they are judged elsewhere or are not branch claims.
const NOT_BRANCH = ['blind_spot', 'commit_locked', 'already_committed']
const TF = objectives.FAILURES?.teleportation ?? {}
for (const k of Object.keys(TF)) {
  check(k in LINE_CLAIMS || NOT_BRANCH.includes(k), `objectives.FAILURES.teleportation.${k}`, 'a failure line this gate has no claim record for cannot be judged')
  if (k in LINE_CLAIMS) check(LINE_CLAIMS[k].text.every(re => re.test(TF[k])), `objectives.FAILURES.teleportation.${k}`, `text no longer matches its claim record: "${TF[k]}"`)
}
const CASES = objectives.TELEPORT_FAILURE_CASES
check(CASES && typeof CASES === 'object', 'objectives.TELEPORT_FAILURE_CASES', 'missing: which lines each (bits, plan) shows must be data')
const exactState = { X: /\bleft bit-flipped\b/i, Z: /\bleft phase-flipped\b/i }
for (const r of TRUTH) {
  const key = `${r.m0}${r.m1}:${r.x}${r.z}`
  const w = `objectives.TELEPORT_FAILURE_CASES['${key}']`
  const sel = CASES?.[key]
  check(Array.isArray(sel), w, 'every one of the 16 (bits, plan) cases needs an entry')
  if (!Array.isArray(sel)) continue
  if (r.residual === 'I') { check(sel.length === 0, w, `receiver holds the test state (fidelity ${r.fidelity}) but failure lines are shown`); continue }
  check(!r.bitFlipLeft || sel.some(k => LINE_CLAIMS[k]?.flip === 'X'), w, `receiver is left with a bit flip (fidelity ${r.fidelity}) and no line names it`)
  check(!r.phaseFlipLeft || sel.some(k => LINE_CLAIMS[k]?.flip === 'Z'), w, `receiver is left with a phase flip (fidelity ${r.fidelity}) and no line names it`)
  for (const k of sel) {
    const c = LINE_CLAIMS[k], t = TF[k]
    check(c && typeof t === 'string', w, `selects ${k}, which is not a judged teleportation failure line`)
    if (!c || typeof t !== 'string') continue
    check(c.holds(r), w, `${k} is false here (m0=${r.m0} m1=${r.m1} X=${r.x} Z=${r.z}, receiver holds ${r.residual}·state): "${t}"`)
    // Words that claim the REST of the receiver was right, or name one exact flip, are true only
    // when this line's flip is the whole error.
    const alone = /already (right|correct|fine)|otherwise (right|correct)|the only (error|mistake|flip)/i.test(t)
    for (const [flip, re] of Object.entries(exactState)) {
      if (re.test(t) && !(new RegExp(`left ${flip === 'X' ? 'bit' : 'phase'}- and`, 'i').test(t))) {
        check(r.residual === flip, w, `${k} says the receiver is ${re.source.replace(/\\b/g, '')}, but it holds ${r.residual}·state: "${t}"`)
      }
    }
    if (alone) check(r.residual === c.flip, w, `${k} says the rest was already right, but the receiver holds ${r.residual}·state: "${t}"`)
  }
}

// Placeholders the owner must fill are reported, not failed: they are the honest state.
const placeholders = strings.filter(([, s]) => /TODO_OWNER/.test(s))

// ------------------------------------------------------------------ verdict
if (checks === 0) refuse('zero checks ran')
console.log(`vision: ${STATES.length} §9.1 states, ${HUD_STATES.length} HUD states, cast ${CAST.join('/')}`)
console.log(`data: ${dataDir}`)
console.log(`counted: ${beatCount} beats in ${beatGroups.length} groups · ${Object.keys(HINTS ?? {}).length} hint ladders · ${strings.length} strings scanned · ${checks} checks`)
for (const [p, s] of placeholders) console.log(`placeholder (owner to fill): ${p} = "${s}"`)
if (failures.length) {
  for (const f of failures) console.log(`FAIL ${f}`)
  console.log(`RED: ${failures.length} failure(s)`)
  process.exit(1)
}
console.log('GREEN')
process.exit(0)
