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
  'network-write', 'network-api', 'import-specifier', 'import-unresolved', 'backend-run-count', 'backend-run-site', 'backend-run-escape', 'hardcoded-backend', 'hardcoded-secret']

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
  ['"inside a string literal" tag removed', "(inStr ? ' (inside a string literal)' : '')", "''"],
  ['entry-main/index checks swapped to always-present', "if (!relSet.has('main.js'))", "if (false)"],
  ['fetch non-literal method info removed', "eachMatch(cd, /\\bfetch\\s*\\(", "eachMatch('', /\\bfetch\\s*\\("],
  // ---- backend.run taint analysis (rule 8): disable each detector in turn
  ['backend seed name removed', "const obj = new Set(['backend'])", "const obj = new Set()"],
  ['alias assignment not followed', "if (id) grow(kind === 'fn' ? T.fn : T.obj, id[1])", 'if (false) grow(T.obj, id[1])'],
  ['computed-store container not tainted', " ?? /^([A-Za-z_$][\\w$]*)\\s*(?:\\?\\.)?\\s*\\[/.exec(t)", ''],
  ['destructured run not followed', "if (key === 'run') {", 'if (false) {'],
  ['destructuring escape removed', "if (!kv || pattern.trim().startsWith('[')) { if (record)", "if (!kv || pattern.trim().startsWith('[')) { if (false)"],
  ["bracket ['run'] obtain ignored", "if (s.text !== 'run' || s.interp) continue", 'continue'],
  ['optional chaining ?. not walked', "if (cd[c - 1] === '?') c--", ''],
  ['.run.call/.apply not a call', "/^\\.\\s*(call|apply)\\s*\\(/.test(rest)", 'false'],
  ['.run.bind not a site', "if (/^\\.\\s*bind\\b/.test(rest))", 'if (false)'],
  ['stored-never-called run not counted', "if (!sites.some((s) => s.rel === b.rel", "if (false && !sites.some((s) => s.rel === b.rel"],
  ['calls of a run alias not counted', "{ if (record) record({ off: m.index, form: `call of ${m[0]}", "{ if (false) record({ off: m.index, form: `call of ${m[0]}"],
  ['computed access on backend ignored', "if (record) record({ off: m.index, form: 'computed property", "if (false) record({ off: m.index, form: 'computed property"],
  ['Reflect.get / getattr / vars not reflective', "if (kind === 'obj' && fname && pos === 0 && ((owner === 'Reflect'", "if (false && ((owner === 'Reflect'"],
  ['attrgetter/methodcaller ignored', "if (!js) eachMatch(cd, /\\b(attrgetter|methodcaller)", "if (false) eachMatch(cd, /\\b(attrgetter|methodcaller)"],
  ['Python __getattribute__/__dict__ ignored', "if (o.reflective) { record({ off: o.off, form: o.form }); continue }", "if (o.reflective) continue"],
  ['argument -> parameter flow off', "if (addParam(lang + fname, key, kind)) grew = true", "if (false) grew = true"],
  ['tainted parameters never applied', "if (!ms.length) continue", 'continue'],
  ['tree-wide fixpoint stops after one round', "if (paramState() === before) break", 'break'],
  ['Python class -> __init__ not followed', ": !declaredPy.has(fname) // Python", ": false // Python"],
  ['inline callbacks not tainted', "if (!mm) return\n", "return\n"],
  ['array containers not followed', "!(prevId && KEYWORDS.has(prevId.name))) return; vs = o; callbacks(close + 1); continue }", "!(prevId && KEYWORDS.has(prevId.name))) return; return }"],
  ['object-literal containers not followed', "/\\breturn$/.test(cd.slice(Math.max(0, b - 6), b))) { vs = o; callbacks(close + 1); continue }", "/\\breturn$/.test(cd.slice(Math.max(0, b - 6), b))) { return }"],
  ['wrapper call results not followed', "if (WRAPPERS.has(fname))", 'if (false)'],
  ['for-of binding not tainted', "if (head) { grow(T.obj, head[1]); return }", 'if (head) return'],
  ['default parameter not tainted', "if (dflt) grow(", "if (false) grow("],
  ['walrus / parenthesised assignment not followed', "if (!attached && ctx.eq >= 0) {", "if (false) {"],
  ['unresolved callee is not an escape', "if (!(lang ? declaredPy : declaredFns).has(fname) &&", "if (false &&"],
  ['returned backend is not an escape', "/^(?:return|yield|throw|export\\s+default)\\b/.test(head) || /=>\\s*$/.test(head)) escape(", "false) escape("],
  ['eval/new Function/exec not an escape', "if (record) eachMatch(cd, js ? /(?<![.\\w$])eval", "if (false) eachMatch(cd, js ? /(?<![.\\w$])eval"],
  ['count threshold 1 -> 2', "if (sites.length > 1) sites.forEach", "if (sites.length > 2) sites.forEach"],
  ['ruled site anywhere in bridge.js', "s.off > ruledBody[0] && s.off < ruledBody[1]", 'true'],
  ['ruled file is main.js', "const RULED = 'quantum/bridge.js'", "const RULED = 'main.js'"],
  // ---- the false-positive narrowing: off (over-fires) and too wide (hides real hits)
  ['reachability narrowing off', "const executable = (rel) => reachDoubt !== null || reachable.has(rel)", 'const executable = (rel) => true'],
  ['nothing is reachable', "const executable = (rel) => reachDoubt !== null || reachable.has(rel)", 'const executable = (rel) => false'],
  ['computed-name load ignored', "if (doubt) reachDoubt = doubt", 'if (false) reachDoubt = doubt'],
  ['JS -> Python edges dropped', "else if (/^[A-Za-z_]\\w*(\\.[A-Za-z_]\\w*)*$/.test(spec)) out.push(...pyModule(spec))", ''],
  ['Python import edges dropped', "if (n && n !== '*') out.push(", "if (false) out.push("],
  ['docstring narrowing off', "if (h.inStr && p && p.kind === 'py' && bareStatementString(p, h.off))", 'if (false)'],
  ['docstring narrowing ignores brackets', "return depth === 0", 'return true'],
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
