#!/usr/bin/env node
// tools/assemble-echo/sabotage.mjs — falsify the --release mode on DISPOSABLE COPIES (the real files are never written).
//   node tools/assemble-echo/sabotage.mjs
// Each mutation copies assemble.mjs and qollab-caps/check.mjs into a temp tree (same relative layout,
// so the copy finds its caps), applies exact-string edits, asserts the bytes changed (a no-op would be
// a fake "caught"), then grades the copy:
//   fixtures — run-fixtures.mjs --assembler <copy>; exit 1 means the fixtures noticed;
//   exit=<n> — the copy, in --release mode on a clean fixture tree, must exit n (the sabotage is in a
//              dependency and the assembler must pass its verdict through).
// A mutation that is not noticed is a NULL, printed and counted; the harness exits 1 if any exist.
import { spawnSync, execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = { asm: readFileSync(join(HERE, 'assemble.mjs'), 'utf8'), caps: readFileSync(join(HERE, '../qollab-caps/check.mjs'), 'utf8') }
const STUB = (exit, sites) => `console.log('  info: backend.run: ${sites} call site(s)'); process.exit(${exit})\n`

// [name, { asm?: [[from, to]...], caps?: [[from, to]...] | string (whole replacement) }, grade]
const MUT = [
  // 1. the exclusion
  ['exclusion removed', { asm: [['const excl = release && excludedBy(path)', 'const excl = false']] }, 'fixtures'],
  ['exclusion AND the leak re-check removed', { asm: [['const excl = release && excludedBy(path)', 'const excl = false'],
    ['  if (excl) { red++; block(', '  if (false) { red++; block(']] }, 'fixtures'],
  ["'echo/tests/**' dropped from the list", { asm: [["['echo/tests/**', (p) => p.startsWith('echo/tests/')],", '']] }, 'fixtures'],
  ['smoke doc dropped from the list', { asm: [["['echo/QOLLAB_SMOKE_TEST.md', (p) => p === 'echo/QOLLAB_SMOKE_TEST.md'],", '']] }, 'fixtures'],
  // 2. the manifest
  ['manifest omits one file', { asm: [['const lines = onDisk.map(', 'const lines = onDisk.slice(1).map(']] }, 'fixtures'],
  ['manifest lists a phantom file', { asm: [["writeFileSync(manifest, lines.join('\\n') + '\\n')", "writeFileSync(manifest, [...lines, '0\\t0\\tghost.js'].join('\\n') + '\\n')"]] }, 'fixtures'],
  ['manifest bytes off by one', { asm: [['\\t${b.length}\\t', '\\t${b.length + 1}\\t']] }, 'fixtures'],
  // 3. the caps verdict
  ['caps returns 1, assembly green', { caps: STUB(1, 0) }, 'exit=1'],
  ['caps refuses (2), assembly green', { caps: STUB(2, 0) }, 'exit=2'],
  ['caps crashes (no site list), assembly green', { caps: 'process.exit(1)\n' }, 'exit=2'],
  ['assembler ignores the caps exit code', { asm: [["const verdict = red || caps.status === 1 ? 'RED' : 'GREEN'", "const verdict = red ? 'RED' : 'GREEN'"]] }, 'fixtures'],
  // 4. attribution
  ['caps blockers all blamed on platform', { asm: [["const laneOf = (rel) => sourceLane.get(rel) ?? 'tree'", "const laneOf = () => 'platform'"]] }, 'fixtures'],
  ['conflict blamed on the kept lane', { asm: [["block([h.lane], 'CONFLICT'", "block([take.lane], 'CONFLICT'"]] }, 'fixtures'],
  ['conflict line off by one', { asm: [['return i + 1\n}', 'return i\n}']] }, 'fixtures'],
]

function cleanRepo() {
  const repo = mkdtempSync(join(tmpdir(), 'assemble-sab-repo-'))
  const g = (...a) => execFileSync('git', ['-C', repo, ...a], { stdio: 'pipe' })
  const lanes = { platform: { 'echo/main.js': 'main', 'echo/index.html': 'index' }, quantum: { 'echo/quantum/a.py': 'a' }, gameplay: {}, 'story-ui': {}, art: {} }
  g('init', '-q', '-b', 'base')
  g('-c', 'user.name=fx', '-c', 'user.email=fx@invalid', 'commit', '-q', '--allow-empty', '-m', 'base')
  for (const [lane, files] of Object.entries(lanes)) {
    g('checkout', '-q', '-B', `lane/${lane}/integration`, 'base')
    for (const [p, b] of Object.entries(files)) { mkdirSync(dirname(join(repo, p)), { recursive: true }); writeFileSync(join(repo, p), b) }
    g('add', '-A')
    g('-c', 'user.name=fx', '-c', 'user.email=fx@invalid', 'commit', '-q', '--allow-empty', '-m', lane)
    g('rm', '-rq', '--ignore-unmatch', 'echo')
  }
  return repo
}

// control: the unmutated pair must pass the fixtures and exit 0 on the clean tree, or nothing below means anything
const repo = cleanRepo()
const runRelease = (asm) => {
  const out = join(mkdtempSync(join(tmpdir(), 'assemble-sab-out-')), 'echo')
  const r = spawnSync('node', [asm, '--repo', repo, '--out', out, '--release'], { encoding: 'utf8' })
  rmSync(dirname(out), { recursive: true, force: true })
  return r.status
}
const control = spawnSync('node', [join(HERE, 'run-fixtures.mjs')], { encoding: 'utf8' }).status
const controlExit = runRelease(join(HERE, 'assemble.mjs'))
if (control !== 0 || controlExit !== 0) { console.log(`REFUSED: control is not green (fixtures exit ${control}, clean release exit ${controlExit})`); process.exit(2) }
console.log('control: fixtures exit 0, clean release exit 0')

let nulls = 0
console.log('mutation'.padEnd(46), 'edit?', 'result')
for (const [name, edits, grade] of MUT) {
  const tmp = mkdtempSync(join(tmpdir(), 'assemble-sab-'))
  mkdirSync(join(tmp, 'assemble-echo'))
  mkdirSync(join(tmp, 'qollab-caps'))
  let changed = true
  const files = {}
  for (const k of ['asm', 'caps']) {
    const e = edits[k]
    if (typeof e === 'string') files[k] = e
    else files[k] = (e ?? []).reduce((acc, [f, t]) => { const n = acc.replace(f, () => t); if (n === acc) changed = false; return n }, SRC[k])
    if (e && files[k] === SRC[k]) changed = false
  }
  if (!changed) { nulls++; console.log(name.padEnd(46), 'NO-OP', 'REFUSED: a mutation did not apply, result is meaningless'); rmSync(tmp, { recursive: true, force: true }); continue }
  const asm = join(tmp, 'assemble-echo', 'assemble.mjs')
  writeFileSync(asm, files.asm)
  writeFileSync(join(tmp, 'qollab-caps', 'check.mjs'), files.caps)
  let caught, detail
  if (grade === 'fixtures') {
    const r = spawnSync('node', [join(HERE, 'run-fixtures.mjs'), '--assembler', asm], { encoding: 'utf8' })
    const failed = r.stdout.split('\n').filter((l) => l.startsWith('FAIL')).map((l) => l.split(/\s+/)[1])
    caught = r.status === 1
    detail = caught ? `CAUGHT by: ${failed.join(', ')}` : `NULL (fixtures exit ${r.status})`
  } else {
    const want = Number(grade.split('=')[1])
    const got = runRelease(asm)
    caught = got === want
    detail = caught ? `CAUGHT: release exit ${got} (want ${want})` : `NULL: release exit ${got}, want ${want}`
  }
  if (!caught) nulls++
  console.log(name.padEnd(46), 'yes  ', detail)
  rmSync(tmp, { recursive: true, force: true })
}
rmSync(repo, { recursive: true, force: true })
console.log(`${MUT.length} mutations, ${nulls} null/refused`)
process.exit(nulls ? 1 : 0)
