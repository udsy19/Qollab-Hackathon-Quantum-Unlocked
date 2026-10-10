#!/usr/bin/env node
// tools/assemble-echo/assemble.mjs — build ONE echo/ tree from every lane's branch, by lane ownership.
//   node tools/assemble-echo/assemble.mjs --out <dir> [--ref <lane>=<git ref>]... [--repo <git dir>]
// Each path comes from the ref of the lane that owns it (.claude/rules/lane-ownership.md). Every path
// present in more than one ref is printed; differing bytes are a CONFLICT. A path that only a
// non-owner lane carries is NON-OWNER, and a path no rule covers is UNOWNED. The tree is always
// written, so a red run can be inspected, but only exit 0 is releasable.
// Exit: 0 green · 1 conflict / ownership violation · 2 could not run.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

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

function refuse(msg) {
  console.error(`assemble-echo: REFUSED — ${msg}`)
  process.exit(2)
}

const argv = process.argv.slice(2)
const refs = { ...DEFAULT_REFS }
let out = null
let repo = process.cwd()
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  const v = argv[i + 1]
  if (a === '--out') { out = resolve(v); i++ }
  else if (a === '--repo') { repo = resolve(v); i++ }
  else if (a === '--ref') {
    const m = /^([\w-]+)=(.+)$/.exec(v ?? '')
    if (!m || !LANES.includes(m[1])) refuse(`--ref wants <lane>=<ref> with lane one of ${LANES.join('|')}, got ${v}`)
    refs[m[1]] = m[2]
    i++
  } else refuse(`unknown argument ${a}`)
}
if (!out) refuse('--out <dir> is required')
if (existsSync(out) && readdirSync(out).length) refuse(`--out ${out} is not empty; the assembled tree must hold only what the refs carry`)

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

let red = 0
let written = 0
for (const path of [...claims.keys()].sort()) {
  const holders = claims.get(path)
  const owner = ownerOf(path)
  const who = holders.map((h) => `${h.lane}:${h.sha.slice(0, 7)}`).join(' ')
  let take = holders.find((h) => h.lane === owner)
  if (!owner) {
    red++
    take = holders[0]
    console.log(`UNOWNED     ${path}  carried by ${who}; no lane-ownership rule covers it`)
  } else if (!take) {
    red++
    take = holders[0]
    console.log(`NON-OWNER   ${path}  owned by ${owner}, taken from ${take.lane} (${who})`)
  }
  if (holders.length > 1) {
    if (holders.some((h) => h.sha !== take.sha)) {
      red++
      console.log(`CONFLICT    ${path}  in ${holders.length} refs with different bytes: ${who}; took ${take.lane}`)
    } else {
      console.log(`DUPLICATE   ${path}  in ${holders.length} refs, identical bytes: ${who}; took ${take.lane}`)
    }
  }
  const dest = join(out, path.slice('echo/'.length))
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, git('cat-file', 'blob', take.sha))
  written++
}

// Count what landed on disk, not what the loop believes it wrote.
const onDisk = (function count(d) {
  return readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(join(d, e.name)) : 1), 0)
})(out)
if (onDisk !== written || onDisk !== claims.size) refuse(`wrote ${written}, found ${onDisk} on disk, expected ${claims.size}`)
console.log(`${red ? 'RED' : 'GREEN'}  ${onDisk} file(s) in ${out}; ${red} violation(s)`)
process.exit(red ? 1 : 0)
