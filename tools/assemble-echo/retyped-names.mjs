#!/usr/bin/env node
// tools/assemble-echo/retyped-names.mjs — does any module outside contracts.js retype a contract name?
//   node tools/assemble-echo/retyped-names.mjs --root <assembled echo/ dir> [--only <path in root>]...
// A quest state, quest event, bus event or interactable id written as a string literal ('TITLE') or
// an object key (TITLE:) is a second copy of the contract that can drift from it; modules must
// import the name (QUEST_STATES.TITLE). The names are read from the tree's own contracts.js, since
// "is this a copy of contracts.js" is the question. Comments are stripped before matching.
// Exit: 0 green · 1 a retyped name · 2 could not run.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ri = process.argv.indexOf('--root')
if (ri < 0) { console.error('usage: retyped-names.mjs --root <dir>'); process.exit(2) }
const root = resolve(process.argv[ri + 1])
const only = process.argv.flatMap((a, i) => (a === '--only' ? [process.argv[i + 1]] : []))
const contractsPath = join(root, 'contracts.js')
if (!existsSync(contractsPath)) { console.error(`REFUSED: no contracts.js in ${root}`); process.exit(2) }
const c = await import(pathToFileURL(contractsPath).href)
const names = new Set([...c.QUEST_STATE_LIST, ...Object.keys(c.QUEST_EVENTS), ...Object.keys(c.BUS_EVENTS), ...Object.keys(c.INTERACTABLE_IDS)])
if (names.size < 20) { console.error(`REFUSED: only ${names.size} contract names read from ${contractsPath}`); process.exit(2) }

const files = (function walk(d) {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : /\.m?js$/.test(e.name) ? [join(d, e.name)] : []))
})(root).filter((f) => f !== contractsPath)
  .filter((f) => !only.length || only.includes(relative(root, f)))
if (!files.length || files.length < only.length) { console.error(`REFUSED: ${files.length} module(s) to scan (--only ${only.join(' ')})`); process.exit(2) }

let hits = 0
for (const f of files) {
  const lines = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).split('\n')
  lines.forEach((raw, i) => {
    const line = raw.replace(/(^|[^:'"`])\/\/.*$/, '$1')
    for (const m of line.matchAll(/(['"`])([A-Za-z_]+)\1|(?:^|[{,\s])([A-Z][A-Z_]+)\s*:(?!:)/g)) {
      const name = m[2] ?? m[3]
      if (names.has(name)) { hits++; console.log(`${relative(root, f)}:${i + 1} retyped contract name ${name}`) }
    }
  })
}
console.log(`${hits ? 'RED' : 'GREEN'}  ${files.length} module(s) scanned, ${names.size} contract names, ${hits} retyped`)
process.exit(hits ? 1 : 0)
