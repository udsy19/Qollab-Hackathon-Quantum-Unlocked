#!/usr/bin/env node
// Renders echo/data/* into script.md: the full ECHO script in play order, for the owner to read.
// Rendered from the modules themselves, so the script cannot drift from what the game ships.
//   node evidence/story-ui/story-data/render-script.mjs [--data <dir>] > evidence/story-ui/story-data/script.md

import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const i = process.argv.indexOf('--data')
const dataDir = resolve(i > 0 ? process.argv[i + 1] : join(here, '../../../echo/data'))
const load = f => import(pathToFileURL(join(dataDir, f)).href)
const { STORY, MOMENTS, SCREEN_TEXT } = await load('story.js')
const { OBJECTIVES, HINTS, FAILURES, HUD, TERMINALS } = await load('objectives.js')
const { JOURNAL, DECLASSIFIED, TEACHBACK, CREDITS } = await load('teachback.js')

// Where reactions and failure lines sit in play order (presentation only; the data keys them).
const MOMENT_AFTER = {
  CLONE_SUPERPOSITION_FAILED: ['clone_increase_voltage'],
  RELAY_UNDERSTOOD: ['relay_bay_cable'],
  TELEPORT_DRY_RUN: ['teleport_dry_run_failed', 'teleport_commit_locked'],
}
const FAILURES_AT = {
  CLONE_SUPERPOSITION_FAILED: 'cloning', RELAY_SEND_FAILED: 'bell_signalling',
  ROOFTOP_UNLOCKED: 'link_repair', TELEPORT_DRY_RUN: 'teleportation',
}
const ORDER = ['OPENING', 'FREE_ROAM_ALLEY', 'CLONE_INTRO', 'CLONE_BASIS_PASSED', 'CLONE_SUPERPOSITION_FAILED',
  'CLONE_UNDERSTOOD', 'RELAY_UNLOCKED', 'RELAY_INTRO', 'RELAY_BELL_CREATED', 'RELAY_SEND_FAILED', 'RELAY_UNDERSTOOD',
  'ROOFTOP_UNLOCKED', 'LINK_REPAIRED', 'TELEPORT_DRY_RUN', 'TELEPORT_DRY_RUN_PASSED', 'TELEPORT_COMMITTED', 'ENDING']
const MISSION = { CLONE_INTRO: 'MISSION 1 · THE COPY', RELAY_UNLOCKED: 'MISSION 2 · THE CONNECTION', ROOFTOP_UNLOCKED: 'MISSION 3 · ONE OF ONE' }

const out = []
const p = s => out.push(s)
const mark = o => (o && typeof o === 'object' && o.src ? ` *(verbatim ${o.src})*` : ' ✎')
const txt = o => (typeof o === 'string' ? o : o.text)
const beat = b => p(`- **${b.speaker}:** ${b.text}${b.direction ? ` _[${b.direction}]_` : ''}${mark(b)}`)

p('# ECHO: ONE OF ONE — the full script, in play order')
p('')
p('Rendered by `evidence/story-ui/story-data/render-script.mjs` from `echo/data/{story,objectives,teachback}.js`. Do not edit by hand.')
p('')
p('**Key:** *(verbatim §x)* = quoted word for word from `ECHO_MASTER_VISION.md` (the check verifies this against the doc). ✎ = new text written for this script; the owner should review it. `{n}` and similar are slots the game fills in.')
p('')
p(`## TITLE\n\n> **${SCREEN_TEXT.gameTitle.text}**${mark(SCREEN_TEXT.gameTitle)}\n`)

let words = 0
for (const st of ORDER) {
  if (MISSION[st]) p(`---\n\n# ${MISSION[st]}\n`)
  p(`## ${st}`)
  p('')
  if (st === 'OPENING') {
    p(`> Title card: **${SCREEN_TEXT.openingCard.text}**${mark(SCREEN_TEXT.openingCard)}  `)
    p(`> Billboard: **${SCREEN_TEXT.billboard.text}**${mark(SCREEN_TEXT.billboard)}`)
    p('')
  }
  const o = OBJECTIVES[st]
  if (o) p(`**HUD:** OBJECTIVE ${String(o.number).padStart(2, '0')} — ${o.text}${mark(o)}\n`)
  for (const b of STORY[st] ?? []) { beat(b); words += b.text.split(/\s+/).length }
  for (const m of MOMENT_AFTER[st] ?? []) {
    p(`\n*Reaction \`${m}\`:*`)
    for (const b of MOMENTS[m]) { beat(b); words += b.text.split(/\s+/).length }
  }
  if (FAILURES_AT[st]) {
    p(`\n*Failure lines (\`${FAILURES_AT[st]}\`, shown when the player gets it wrong):*`)
    for (const [k, v] of Object.entries(FAILURES[FAILURES_AT[st]])) p(`- \`${k}\`: ${txt(v)}${mark(v)}`)
  }
  if (st === 'CLONE_UNDERSTOOD') p(`\n> Learning text: **${SCREEN_TEXT.cloneLearning.text}**${mark(SCREEN_TEXT.cloneLearning)}`)
  if (st === 'ENDING') {
    p(`\n> On screen: **${SCREEN_TEXT.endingCard.text}**${mark(SCREEN_TEXT.endingCard)}  `)
    p(`> Title: **${SCREEN_TEXT.endingTitle.text}**${mark(SCREEN_TEXT.endingTitle)}`)
  }
  const ladder = Object.entries(HINTS).find(([, h]) => h.states.includes(st))
  if (ladder) {
    p(`\n*Hints (\`${ladder[0]}\`, on request, no penalty):*`)
    ladder[1].ladder.forEach((h, n) => p(`${n + 1}. _${h.kind}_ — ${h.text}${mark(h)}`))
  }
  const j = JOURNAL.find(e => e.unlock === st)
  if (j) p(`\n*Journal unlocks — ${j.title}:* ${j.text}${mark(j)}`)
  p('')
}

p('---\n\n# DECLASSIFIED\n')
for (const t of DECLASSIFIED.tabs) {
  p(`## ${txt(t.title)}${mark(t.title)}\n`)
  p(`- **What I did:** ${t.whatIDid} ✎`)
  p(`- **What the qubits did:** ${t.whatTheQubitsDid} ✎`)
  p(`- **Exact gates:** \`${t.gates}\``)
  p(`- **Expected data:**`)
  for (const e of t.expected) p(`  - ${e}`)
  if (t.verificationNote) p(`- **How it was verified:** ${t.verificationNote} ✎`)
  p(`- **Misconception:** "${t.misconception.wrong}" — ${t.misconception.why} ✎`)
  p('')
}
p(`*Provenance note:* ${DECLASSIFIED.provenanceNote} ✎\n`)
p('## Teach-back (optional, no score)\n')
TEACHBACK.forEach((q, n) => {
  p(`${n + 1}. **${q.question}**${mark(q)}`)
  p(`   - Answer: ${q.answer} ✎`)
  for (const c of q.choices) p(`   - ${c.right ? '✔' : '✘'} "${c.right ?? c.wrong}" → ${c.why} ✎`)
})
p('\n---\n\n# CREDITS\n')
for (const c of CREDITS) p(`- ${c.text}`)

p('\n---\n\n# Appendix: HUD and terminal copy\n')
const dump = (obj, path) => {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !('text' in v)) dump(v, `${path}.${k}`)
    else p(`- \`${path}.${k}\`: ${txt(v)}${mark(v)}`)
  }
}
dump(HUD, 'HUD')
dump(TERMINALS, 'TERMINALS')
p(`\n*Spoken words across all beats: ${words}.*`)
console.log(out.join('\n'))
