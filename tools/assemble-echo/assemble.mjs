#!/usr/bin/env node
// tools/assemble-echo/assemble.mjs — build ONE echo/ tree from every lane's branch, by lane ownership.
//   node tools/assemble-echo/assemble.mjs --out <dir> [--ref <lane>=<git ref>]... [--repo <git dir>]
//   node tools/assemble-echo/assemble.mjs --out <dir> --release [--manifest <file>]   # the Qollab upload
// Each path comes from the ref of the lane that owns it (.claude/rules/lane-ownership.md). Every path
// present in more than one ref is printed; differing bytes are a CONFLICT. A path that only a
// non-owner lane carries is NON-OWNER, and a path no rule covers is UNOWNED. The tree is always
// written, so a red run can be inspected, but only exit 0 is releasable.
// Exit: 0 green · 1 conflict / ownership violation · 2 could not run.
//
// --release builds the folder the owner uploads to Qollab as-is:
//   1. paths in RELEASE_EXCLUDE are not written (printed EXCLUDED) and are not graded, since they
//      never ship; they stay in the repo;
//   2. the manifest (default <out>.manifest.tsv, never inside <out>, or it would be uploaded) lists
//      `sha256<TAB>bytes<TAB>path` for every file found by walking <out> after the write;
//   3. tools/qollab-caps/check.mjs grades <out>, and its verdict is part of the exit code;
//   4. every blocker is printed as `BLOCKER  <lane>  <kind>  echo/<file>:<line>` (assembly reds and
//      caps reds, attributed to the lane whose bytes were written), every backend.run call site as
//      `SITE`, then a per-lane count table. Exit: 0 only if assembly AND caps are green; 2 if caps
//      could not grade.
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const LANES = ['platform', 'quantum', 'gameplay', 'story-ui', 'art']
const DEFAULT_REFS = Object.fromEntries(LANES.map((l) => [l, `lane/${l}/integration`]))

// lane-ownership.md, first match wins. Art's files inside scene/ and game/ come before gameplay's
// folders; every other file at the echo/ root is a platform release file.
const ART_SCENE = /^echo\/scene\/(lighting|rain|props|buildings|effects)\.js$/
const RULES = [
  ['quantum', (p) => p.startsWith('echo/quantum/') || p.startsWith('echo/tests/')],
  ['art', (p) => p.startsWith('echo/assets/') || ART_SCENE.test(p) || p === 'echo/game/audio.js'],
  ['gameplay', (p) => p.startsWith('echo/game/') || p.startsWith('echo/scene/')],
  ['story-ui', (p) => p.startsWith('echo/ui/') || p.startsWith('echo/data/') || p === 'echo/main.css'],
  ['platform', (p) => /^echo\/[^/]+$/.test(p)],
]
const ownerOf = (path) => RULES.find(([, test]) => test(path))?.[0] ?? null

// Repo-only paths, never uploaded: tests make Pyodide load pytest and ~10 packages on every Run
// (supervisor consult 9); the smoke doc is dev-only, README.md is the write-up (consult 4).
// Declared here once; nothing else may hold a copy of this list.
const RELEASE_EXCLUDE = [
  ['echo/tests/**', (p) => p.startsWith('echo/tests/')],
  ['echo/QOLLAB_SMOKE_TEST.md', (p) => p === 'echo/QOLLAB_SMOKE_TEST.md'],
]
const excludedBy = (path) => RELEASE_EXCLUDE.find(([, test]) => test(path))?.[0] ?? null
const CAPS = join(dirname(fileURLToPath(import.meta.url)), '../qollab-caps/check.mjs')

function refuse(msg) {
  console.error(`assemble-echo: REFUSED — ${msg}`)
  process.exit(2)
}

const argv = process.argv.slice(2)
const refs = { ...DEFAULT_REFS }
let out = null
let repo = process.cwd()
let release = false
let manifest = null
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  const v = argv[i + 1]
  if (a === '--out') { out = resolve(v); i++ }
  else if (a === '--repo') { repo = resolve(v); i++ }
  else if (a === '--release') release = true
  else if (a === '--manifest') { manifest = resolve(v); i++ }
  else if (a === '--ref') {
    const m = /^([\w-]+)=(.+)$/.exec(v ?? '')
    if (!m || !LANES.includes(m[1])) refuse(`--ref wants <lane>=<ref> with lane one of ${LANES.join('|')}, got ${v}`)
    refs[m[1]] = m[2]
    i++
  } else refuse(`unknown argument ${a}`)
}
if (!out) refuse('--out <dir> is required')
if (existsSync(out) && readdirSync(out).length) refuse(`--out ${out} is not empty; the assembled tree must hold only what the refs carry`)
if (manifest && !release) refuse('--manifest only applies with --release')
if (release) {
  manifest ??= `${out}.manifest.tsv`
  if ((manifest + '/').startsWith(out + '/')) refuse(`--manifest ${manifest} is inside --out; it would be uploaded`)
  if (!existsSync(CAPS)) refuse(`caps gate ${CAPS} not found`)
}

const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'buffer', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] })

// claims: path -> [{ lane, sha }]
const claims = new Map()
for (const lane of LANES) {
  let commit = ''
  try { commit = git('rev-parse', '--verify', '--quiet', `${refs[lane]}^{commit}`).toString().trim() } catch { /* refused below */ }
  if (!commit) refuse(`lane ${lane}: ref ${refs[lane]} does not resolve to a commit`)
  const entries = git('ls-tree', '-r', '-z', commit, '--', 'echo/').toString().split('\0').filter(Boolean)
  console.log(`ref   ${lane.padEnd(9)} ${refs[lane]} @ ${commit.slice(0, 9)}  (${entries.length} file(s) under echo/)`)
  for (const e of entries) {
    const m = /^(\d+) (\w+) (\w+)\t(.+)$/.exec(e)
    if (!m || m[2] !== 'blob') refuse(`lane ${lane}: unexpected tree entry ${JSON.stringify(e)}`)
    if (!claims.has(m[4])) claims.set(m[4], [])
    claims.get(m[4]).push({ lane, sha: m[3] })
  }
}
if (claims.size === 0) refuse('no lane carries any file under echo/')

// blockers: { lane, kind, file, line, msg } — printed in the release summary
const blockers = []
const block = (lanes, kind, file, line, msg) => { for (const lane of new Set(lanes)) blockers.push({ lane, kind, file, line, msg }) }
const firstDiffLine = (a, b) => {
  const x = a.toString('utf8').split('\n')
  const y = b.toString('utf8').split('\n')
  let i = 0
  while (i < x.length && i < y.length && x[i] === y[i]) i++
  return i + 1
}

let red = 0
const expected = new Set() // upload-relative paths this run must leave on disk
const sourceLane = new Map() // upload-relative path -> lane whose bytes were written
for (const path of [...claims.keys()].sort()) {
  const holders = claims.get(path)
  const excl = release && excludedBy(path)
  if (excl) {
    console.log(`EXCLUDED    ${path}  (${excl}) carried by ${holders.map((h) => `${h.lane}:${h.sha.slice(0, 7)}`).join(' ')}; release upload omits it`)
    continue
  }
  const owner = ownerOf(path)
  const who = holders.map((h) => `${h.lane}:${h.sha.slice(0, 7)}`).join(' ')
  let take = holders.find((h) => h.lane === owner)
  if (!owner) {
    red++
    take = holders[0]
    console.log(`UNOWNED     ${path}  carried by ${who}; no lane-ownership rule covers it`)
    block(holders.map((h) => h.lane), 'UNOWNED', path, 0, 'no lane-ownership rule covers it')
  } else if (!take) {
    red++
    take = holders[0]
    console.log(`NON-OWNER   ${path}  owned by ${owner}, taken from ${take.lane} (${who})`)
    block(holders.map((h) => h.lane), 'NON-OWNER', path, 0, `owned by ${owner}, which does not carry it`)
  }
  if (holders.length > 1) {
    if (holders.some((h) => h.sha !== take.sha)) {
      red++
      console.log(`CONFLICT    ${path}  in ${holders.length} refs with different bytes: ${who}; took ${take.lane}`)
      // the blocker is each drifted copy's lane, at the first line where its bytes leave the taken copy
      const kept = git('cat-file', 'blob', take.sha)
      for (const h of holders.filter((h) => h.sha !== take.sha)) {
        block([h.lane], 'CONFLICT', path, firstDiffLine(kept, git('cat-file', 'blob', h.sha)), `differs from ${take.lane}'s copy`)
      }
    } else {
      console.log(`DUPLICATE   ${path}  in ${holders.length} refs, identical bytes: ${who}; took ${take.lane}`)
    }
  }
  const rel = path.slice('echo/'.length)
  const dest = join(out, rel)
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, git('cat-file', 'blob', take.sha))
  expected.add(rel)
  sourceLane.set(rel, take.lane)
}
if (expected.size === 0) refuse('every path under echo/ was excluded; nothing to upload')

// Walk what landed on disk, not what the loop believes it wrote, and compare by path.
const onDisk = (function walk(d) {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name).slice(out.length + 1).split('\\').join('/')])
})(out).sort()
const stray = onDisk.filter((p) => !expected.has(p))
const lost = [...expected].filter((p) => !onDisk.includes(p))
if (stray.length || lost.length) refuse(`disk and plan disagree: on disk only [${stray.join(', ')}], planned only [${lost.join(', ')}]`)
console.log(`${red ? 'RED' : 'GREEN'}  ${onDisk.length} file(s) in ${out}; ${red} violation(s)`)
if (!release) process.exit(red ? 1 : 0)

// ------------------------------------------------------------------ release
// The excluded set is re-checked on the walked tree, so a path that reaches disk by any route is red.
for (const p of onDisk) {
  const excl = excludedBy(`echo/${p}`)
  if (excl) { red++; block([sourceLane.get(p) ?? 'tree'], 'LEAKED', `echo/${p}`, 0, `matches ${excl} but is in the upload`) }
}

const lines = onDisk.map((p) => {
  const b = readFileSync(join(out, p))
  return `${createHash('sha256').update(b).digest('hex')}\t${b.length}\t${p}`
})
mkdirSync(dirname(manifest), { recursive: true })
writeFileSync(manifest, lines.join('\n') + '\n')
console.log(`MANIFEST    ${manifest}  ${lines.length} file(s), ${lines.reduce((n, l) => n + Number(l.split('\t')[1]), 0)} bytes`)

const caps = spawnSync('node', [CAPS, '--root', out], { encoding: 'utf8', maxBuffer: 64 << 20 })
const capsOut = (caps.stdout ?? '') + (caps.stderr ?? '')
for (const l of capsOut.split('\n').filter(Boolean)) console.log(`caps  ${l}`)
if (caps.status !== 0 && caps.status !== 1) {
  console.log(`REFUSED  caps exited ${caps.status ?? caps.signal}; the upload is ungraded`)
  process.exit(2)
}
const label = basename(out)
const laneOf = (rel) => sourceLane.get(rel) ?? 'tree'
const capsFindings = capsOut.split('\n').map((l) => new RegExp(`^${label}/(\\S*?):(\\d+) (\\S+) (.*)$`).exec(l)).filter(Boolean)
for (const [, rel, line, rule, msg] of capsFindings) block([laneOf(rel)], rule, `echo/${rel}`, Number(line), msg)
// a red verdict with no attributable finding is still red, and says so
if (caps.status === 1 && capsFindings.length === 0) block(['tree'], 'caps-red', 'echo/', 0, 'caps exited 1 but no finding line parsed')

const sites = /info: backend\.run: \d+ call site\(s\)(?:: (.*))?$/m.exec(capsOut)
if (!sites) { console.log('REFUSED  caps printed no backend.run site list'); process.exit(2) }
for (const s of (sites[1] ?? '').split(', ').filter(Boolean)) {
  const m = new RegExp(`^${label}/(.+):(\\d+)$`).exec(s)
  console.log(`SITE     ${(m ? laneOf(m[1]) : 'tree').padEnd(9)}  backend.run  ${m ? `echo/${m[1]}:${m[2]}` : s}`)
}

console.log('blockers, by lane (the lane whose ref must change):')
for (const b of blockers.sort((a, b) => a.lane.localeCompare(b.lane) || a.file.localeCompare(b.file) || a.line - b.line)) {
  console.log(`BLOCKER  ${b.lane.padEnd(9)}  ${b.kind}  ${b.file}:${b.line}  ${b.msg}`)
}
const KINDS = ['CONFLICT', 'NON-OWNER', 'UNOWNED', 'LEAKED', 'import-unresolved', 'import-specifier', 'backend-run-count', 'backend-run-python']
const cols = [...KINDS, 'other caps']
console.log(`| lane | ${cols.join(' | ')} | total |`)
console.log(`|${' --- |'.repeat(cols.length + 2)}`)
for (const lane of [...LANES, 'tree']) {
  const mine = blockers.filter((b) => b.lane === lane)
  if (lane === 'tree' && !mine.length) continue
  const n = cols.map((k) => mine.filter((b) => (k === 'other caps' ? !KINDS.includes(b.kind) : b.kind === k)).length)
  console.log(`| ${lane} | ${n.join(' | ')} | ${mine.length} |`)
}
const verdict = red || caps.status === 1 ? 'RED' : 'GREEN'
console.log(`RELEASE ${verdict}  ${onDisk.length} file(s) to upload from ${out}; assembly ${red ? 'RED' : 'GREEN'}, caps ${caps.status === 0 ? 'GREEN' : 'RED'}; ${blockers.length} blocker(s)`)
process.exit(verdict === 'RED' ? 1 : 0)
