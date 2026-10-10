#!/usr/bin/env node
// tools/assemble-echo/run-fixtures.mjs — does assemble.mjs go red on every violation and green on a clean set?
//   node tools/assemble-echo/run-fixtures.mjs [--assembler <path>]   # --assembler grades a disposable (sabotaged) copy
// Each fixture is five lane branches committed into a THROW-AWAY git repo (never the shared one).
// Expected verdict lines and bytes are written by hand here, not read from the assembler's output.
import { spawnSync, execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ai = process.argv.indexOf('--assembler')
const ASSEMBLER = ai > 0 ? resolve(process.argv[ai + 1]) : join(HERE, 'assemble.mjs')

const CLEAN = {
  platform: { 'echo/main.js': 'main', 'echo/index.html': 'index', 'echo/contracts.js': 'contracts' },
  quantum: { 'echo/quantum/cloning.py': 'cloning', 'echo/tests/test_cloning.py': 'test' },
  gameplay: { 'echo/game/state.js': 'state', 'echo/scene/alley.js': 'alley' },
  'story-ui': { 'echo/main.css': 'css', 'echo/ui/menu.js': 'menu' },
  art: { 'echo/scene/rain.js': 'rain', 'echo/game/audio.js': 'audio', 'echo/assets/a.png': 'png' },
}
const withFiles = (lane, files) => ({ ...CLEAN, [lane]: { ...CLEAN[lane], ...files } })

const FIXTURES = [
  // [name, lanes, exit, verdict lines that must appear (prefix match), files whose bytes are checked]
  ['clean', CLEAN, 0, [], { 'main.css': 'css', 'scene/rain.js': 'rain', 'game/audio.js': 'audio', 'scene/alley.js': 'alley' }],
  ['conflict-main-css', withFiles('platform', { 'echo/main.css': 'smoke css' }), 1,
    ['CONFLICT    echo/main.css  in 2 refs'], { 'main.css': 'css' }],
  ['duplicate-identical', withFiles('gameplay', { 'echo/contracts.js': 'contracts' }), 0,
    ['DUPLICATE   echo/contracts.js  in 2 refs'], { 'contracts.js': 'contracts' }],
  ['duplicate-drifted', withFiles('gameplay', { 'echo/contracts.js': 'old contracts' }), 1,
    ['CONFLICT    echo/contracts.js'], { 'contracts.js': 'contracts' }],
  ['non-owner', withFiles('platform', { 'echo/quantum/smoke.py': 'smoke' }), 1,
    ['NON-OWNER   echo/quantum/smoke.py  owned by quantum, taken from platform'], { 'quantum/smoke.py': 'smoke' }],
  ['art-file-from-gameplay', withFiles('gameplay', { 'echo/scene/lighting.js': 'lights' }), 1,
    ['NON-OWNER   echo/scene/lighting.js  owned by art'], {}],
  ['unowned', withFiles('story-ui', { 'echo/misc/x.js': 'x' }), 1, ['UNOWNED     echo/misc/x.js'], {}],
]

let bad = 0
const verdict = (name, ok, why) => {
  if (!ok) bad++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(24)}${why ? '  ' + why : ''}`)
}

function makeRepo(lanes) {
  const repo = mkdtempSync(join(tmpdir(), 'assemble-fx-'))
  const g = (...a) => execFileSync('git', ['-C', repo, ...a], { stdio: 'pipe' })
  g('init', '-q', '-b', 'base')
  g('-c', 'user.name=fx', '-c', 'user.email=fx@invalid', 'commit', '-q', '--allow-empty', '-m', 'base')
  for (const [lane, files] of Object.entries(lanes)) {
    g('checkout', '-q', '-B', `lane/${lane}/integration`, 'base')
    for (const [p, body] of Object.entries(files)) {
      mkdirSync(dirname(join(repo, p)), { recursive: true })
      writeFileSync(join(repo, p), body)
    }
    g('add', '-A')
    g('-c', 'user.name=fx', '-c', 'user.email=fx@invalid', 'commit', '-q', '--allow-empty', '-m', lane)
    g('rm', '-rq', '--ignore-unmatch', 'echo')
  }
  return repo
}

for (const [name, lanes, exit, mustSay, bytes] of FIXTURES) {
  const repo = makeRepo(lanes)
  const out = join(mkdtempSync(join(tmpdir(), 'assemble-out-')), 'echo')
  const r = spawnSync('node', [ASSEMBLER, '--repo', repo, '--out', out], { encoding: 'utf8' })
  const said = r.stdout.split('\n')
  const missing = mustSay.filter((m) => !said.some((l) => l.startsWith(m)))
  const extra = said.filter((l) => /^(CONFLICT|NON-OWNER|UNOWNED|DUPLICATE) /.test(l) && !mustSay.some((m) => l.startsWith(m)))
  const wrongBytes = Object.entries(bytes).filter(([p, b]) => !existsSync(join(out, p)) || readFileSync(join(out, p), 'utf8') !== b).map(([p]) => p)
  const why = [
    r.status !== exit && `exit ${r.status}, want ${exit}${r.stderr ? ` (${r.stderr.trim()})` : ''}`,
    missing.length && `missing: ${missing.join(' | ')}`,
    extra.length && `unexpected: ${extra.join(' | ')}`,
    wrongBytes.length && `wrong bytes: ${wrongBytes.join(', ')}`,
  ].filter(Boolean).join('; ')
  verdict(name, !why, why)
  rmSync(repo, { recursive: true, force: true })
  rmSync(dirname(out), { recursive: true, force: true })
}

// A ref that does not exist is "could not run", never a pass or a red.
{
  const repo = makeRepo(CLEAN)
  const out = join(mkdtempSync(join(tmpdir(), 'assemble-out-')), 'echo')
  const r = spawnSync('node', [ASSEMBLER, '--repo', repo, '--out', out, '--ref', 'art=lane/art/nope'], { encoding: 'utf8' })
  verdict('missing-ref', r.status === 2, r.status === 2 ? '' : `exit ${r.status}, want 2`)
  rmSync(repo, { recursive: true, force: true })
}

const total = FIXTURES.length + 1
console.log(`${bad ? 'RED' : 'GREEN'}  ${total - bad}/${total} fixture(s) behaved`)
process.exit(bad ? 1 : 0)
