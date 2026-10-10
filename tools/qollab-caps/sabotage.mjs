#!/usr/bin/env node
// tools/qollab-caps/sabotage.mjs — falsify check.mjs on a DISPOSABLE COPY (the real file is never written).
//   node tools/qollab-caps/sabotage.mjs
// For each mutation: copy check.mjs to a temp dir, apply one exact-string edit, assert the edit really
// changed the bytes (a silent no-op would be a fake "caught"), then run run-fixtures.mjs against the copy.
// run-fixtures exiting 1 means the fixtures noticed the sabotage. Exit 0 from the harness = a NULL: the
// mutated checker still passes every fixture, so that logic is not pinned by any fixture.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const orig = readFileSync(join(HERE, 'check.mjs'), 'utf8')
const RULES = ['file-count', 'file-size', 'html-document-tag', 'html-script', 'html-stylesheet', 'entry-main', 'entry-index', 'storage',
  'network-write', 'network-api', 'import-specifier', 'import-unresolved', 'backend-run-count', 'backend-run-python', 'hardcoded-backend', 'hardcoded-secret']

const MUT = [
  ...RULES.map((r) => [`drop rule ${r}`, 'function report(file, line, rule, msg) {', `function report(file, line, rule, msg) { if (rule === '${r}') return;`]),
  ['MAX_FILES 100 -> 101', 'const MAX_FILES = 100', 'const MAX_FILES = 101'],
  ['MAX_BYTES 2e6 -> 2e6+1', 'const MAX_BYTES = 2_000_000', 'const MAX_BYTES = 2_000_001'],
  ['walk skips dotfiles', "for (const name of readdirSync(dir)) {", "for (const name of readdirSync(dir).filter((n) => !n.startsWith('.'))) {"],
  ['zero-files refusal removed', 'if (files.length === 0) refuse(', 'if (false) refuse('],
  // two layers guard a tokenizer failure (refuse, then the uncaughtException handler): kill one and the other still exits 2
  ['tokenizer failure: refuse() removed (handler remains)', "if (e && e.line) refuse(", "if (false) refuse("],
  ['tokenizer failure: refuse() AND crash handler removed', ["if (e && e.line) refuse(", "process.on('uncaughtException'"], ["if (false) refuse(", "process.on('uncaughtExceptionX'"]],
  ['JS comments not masked', "if (js && c === '/' && n === '/') {", "if (false) {"],
  ['JS block comments not masked', "if (js && c === '/' && n === '*') {", "if (false) {"],
  ['Python # comments not masked', "if (!js && c === '#') {", "if (false) {"],
  ['Python triple quotes off', "const triple = !js && src.startsWith(c.repeat(3), i)", "const triple = false"],
  ['regex literals not recognised', "(REGEX_AFTER.has(lastSig) || KW_REGEX.has(lastWord))", "false"],
  ['template ${} expressions not rescanned', "tpl.push(0); return i + 2", "return i + 2"],
  ['HTML comments not masked', "return src.replace(/<!--[\\s\\S]*?-->/g,", "return src.replace(/(?!)/g,"],
  ['IonQ prose treated as backend id', 'if (BACKEND_ID_STRING.test(s.text))', 'if (true)'],
  ['three/addons accepted nowhere', "spec.startsWith('three/addons/') ||", ''],
  ['https URLs not accepted', "/^https:\\/\\//.test(spec)", 'false'],
  ['relative imports not resolved', "if (!relSet.has(target))", 'if (false)'],
  ['backend.run bracket form ignored', "eachMatch(nc, /\\bbackend\\s*\\[", "eachMatch('', /\\bbackend\\s*\\["],
  ['"inside a string literal" tag removed', "(inStr ? ' (inside a string literal)' : '')", "''"],
  ['entry-main/index checks swapped to always-present', "if (!relSet.has('main.js'))", "if (false)"],
  ['fetch non-literal method info removed', "eachMatch(cd, /\\bfetch\\s*\\(", "eachMatch('', /\\bfetch\\s*\\("],
]

let nulls = 0
const tmp = mkdtempSync(join(tmpdir(), 'qollab-caps-sab-'))
console.log('mutation'.padEnd(52), 'edit?', 'harness')
const EQUIVALENT = new Set(['tokenizer failure: refuse() removed (handler remains)']) // declared: the second layer still exits 2, so no fixture can tell
for (const [name, from, to] of MUT) {
  const pairs = Array.isArray(from) ? from.map((f, k) => [f, to[k]]) : [[from, to]]
  const mutated = pairs.reduce((acc, [f, t]) => acc.replace(f, () => t), orig)
  const changed = mutated !== orig
  if (!changed) { console.log(name.padEnd(52), 'NO-OP', 'REFUSED: mutation did not apply, result is meaningless'); nulls++; continue }
  const copy = join(tmp, 'check.mjs')
  writeFileSync(copy, mutated)
  // a mutant that merely crashes would turn every fixture red for the wrong reason: refuse those
  const probe = spawnSync('node', [copy, '--root', join(HERE, 'fixtures', 'clean')], { encoding: 'utf8' })
  if (/Error|REFUSED: internal/.test(probe.stdout + probe.stderr)) { nulls++; console.log(name.padEnd(52), 'yes  ', 'INVALID: mutant crashes or refuses the clean tree'); continue }
  const r = spawnSync('node', [join(HERE, 'run-fixtures.mjs'), '--checker', copy], { encoding: 'utf8' })
  const failed = r.stdout.split('\n').filter((l) => l.startsWith('FAIL')).map((l) => l.split(/\s+/)[1])
  const caught = r.status === 1
  if (!caught && !EQUIVALENT.has(name)) nulls++
  console.log(name.padEnd(52), 'yes  ', !caught && EQUIVALENT.has(name) ? 'NULL, equivalent mutant (declared)' : caught ? `CAUGHT by: ${failed.slice(0, 4).join(', ')}${failed.length > 4 ? ', +' + (failed.length - 4) : ''}` : `NULL (harness exit ${r.status})`)
}
rmSync(tmp, { recursive: true, force: true })
console.log(`${MUT.length} mutations, ${nulls} null/refused`)
process.exit(nulls ? 1 : 0)
