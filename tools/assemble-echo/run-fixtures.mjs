#!/usr/bin/env node
// tools/assemble-echo/run-fixtures.mjs — does assemble.mjs go red on every violation and green on a clean set?
//   node tools/assemble-echo/run-fixtures.mjs [--assembler <path>]   # --assembler grades a disposable (sabotaged) copy
// Each fixture is five lane branches committed into a THROW-AWAY git repo (never the shared one).
// Expected verdict lines and bytes are written by hand here, not read from the assembler's output.
// Release fixtures re-derive the upload from the output tree itself (walk + sha256) and hold the
// manifest to it; the paths that must be absent are typed here, not imported from the assembler.
import { spawnSync, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync } from 'node:fs'
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

// ------------------------------------------------------------------ release mode
const walk = (root, d = root) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(root, join(d, e.name)) : [join(d, e.name).slice(root.length + 1).split('\\').join('/')])
const sha = (b) => createHash('sha256').update(b).digest('hex')
const DEV = { 'echo/tests/test_x.py': 'def test_x(): pass', 'echo/QOLLAB_SMOKE_TEST.md': '# smoke' }
const RELEASE_BASE = {
  ...CLEAN,
  platform: { ...CLEAN.platform, 'echo/README.md': '# ECHO' },
  quantum: { ...CLEAN.quantum, 'echo/tests/test_x.py': DEV['echo/tests/test_x.py'] },
}
const relWith = (lane, files) => ({ ...RELEASE_BASE, [lane]: { ...RELEASE_BASE[lane], ...files } })
const NEVER_UPLOADED = ['tests', 'tests/test_x.py', 'tests/test_cloning.py', 'QOLLAB_SMOKE_TEST.md']

const RELEASE = [
  // [name, lanes, exit, lines that must appear (prefix), files that must be present]
  ['release-clean', relWith('platform', { 'echo/QOLLAB_SMOKE_TEST.md': DEV['echo/QOLLAB_SMOKE_TEST.md'] }), 0,
    ['EXCLUDED    echo/QOLLAB_SMOKE_TEST.md', 'EXCLUDED    echo/tests/test_x.py', 'EXCLUDED    echo/tests/test_cloning.py', 'caps  GREEN'],
    ['README.md', 'main.js', 'index.html', 'quantum/cloning.py']],
  // the smoke doc carried by quantum: a non-owner path, but it is never uploaded, so it blocks nothing
  ['release-smoke-on-quantum', relWith('quantum', { 'echo/QOLLAB_SMOKE_TEST.md': DEV['echo/QOLLAB_SMOKE_TEST.md'] }), 0,
    ['EXCLUDED    echo/QOLLAB_SMOKE_TEST.md'], ['README.md']],
  // two backend.run sites: the assembly is clean, so only caps can turn this red
  ['release-caps-red', {
    ...relWith('gameplay', { 'echo/game/second.js': '\nexport const go = (backend) => backend.run(1)\n' }),
    platform: { ...RELEASE_BASE.platform, 'echo/main.js': 'export const go = (backend) => backend.run(0)\n' },
  }, 1,
    ['BLOCKER  gameplay   backend-run-count  echo/game/second.js:2', 'BLOCKER  platform   backend-run-count  echo/main.js:1',
      'SITE     gameplay   backend.run  echo/game/second.js:2', 'caps  RED'], ['game/second.js']],
  ['release-unresolved-import', relWith('gameplay', { 'echo/game/state.js': "import { x } from './missing.js'\n" }), 1,
    ['BLOCKER  gameplay   import-unresolved  echo/game/state.js:1'], []],
  // a drifted copy is the carrying lane's blocker, at the first line where the bytes differ
  ['release-conflict', relWith('platform', { 'echo/main.css': 'css\nsmoke' }), 1,
    ['CONFLICT    echo/main.css', 'BLOCKER  platform   CONFLICT  echo/main.css:2'], ['main.css']],
]

for (const [name, lanes, exit, mustSay, present] of RELEASE) {
  const repo = makeRepo(lanes)
  const tmp = mkdtempSync(join(tmpdir(), 'assemble-out-'))
  const out = join(tmp, 'echo')
  const manifest = join(tmp, 'manifest.tsv')
  const r = spawnSync('node', [ASSEMBLER, '--repo', repo, '--out', out, '--release', '--manifest', manifest], { encoding: 'utf8' })
  const said = r.stdout.split('\n')
  const missing = mustSay.filter((m) => !said.some((l) => l.startsWith(m)))
  const onDisk = existsSync(out) ? walk(out) : []
  const leaked = NEVER_UPLOADED.filter((p) => existsSync(join(out, p)))
  const absent = present.filter((p) => !existsSync(join(out, p)))
  // the manifest must be exactly the tree: same paths, and each line's bytes and sha256 measured here
  const want = onDisk.sort().map((p) => { const b = readFileSync(join(out, p)); return `${sha(b)}\t${b.length}\t${p}` })
  const got = existsSync(manifest) ? readFileSync(manifest, 'utf8').split('\n').filter(Boolean) : null
  const manifestBad = !got ? 'no manifest written'
    : got.length !== want.length || got.some((l, i) => l !== want[i])
      ? `manifest ${got.length} line(s) vs ${want.length} file(s) on disk; first mismatch: ${got.find((l, i) => l !== want[i]) ?? want[got.length]}`
      : ''
  const why = [
    r.status !== exit && `exit ${r.status}, want ${exit}${r.stderr ? ` (${r.stderr.trim()})` : ''}`,
    missing.length && `missing: ${missing.join(' | ')}`,
    leaked.length && `LEAKED into the upload: ${leaked.join(', ')}`,
    absent.length && `absent from the upload: ${absent.join(', ')}`,
    onDisk.length === 0 && 'empty upload',
    manifestBad,
  ].filter(Boolean).join('; ')
  verdict(name, !why, why)
  rmSync(repo, { recursive: true, force: true })
  rmSync(tmp, { recursive: true, force: true })
}

const total = FIXTURES.length + 1 + RELEASE.length
console.log(`${bad ? 'RED' : 'GREEN'}  ${total - bad}/${total} fixture(s) behaved`)
process.exit(bad ? 1 : 0)
