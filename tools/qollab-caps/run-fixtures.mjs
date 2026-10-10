#!/usr/bin/env node
// tools/qollab-caps/run-fixtures.mjs — does check.mjs go red on every rule, and stay green on the clean tree?
//   node tools/qollab-caps/run-fixtures.mjs [--checker <path>]     # --checker grades a disposable (sabotaged) copy
// Expectations below are written by hand from the fixture files, not read from the checker's output.
// Each red fixture must produce EXACTLY the listed `file:line rule` pairs: a missing pair means the rule
// went blind, an extra one means it over-fires.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ci = process.argv.indexOf('--checker')
const CHECKER = ci > 0 ? resolve(process.argv[ci + 1]) : join(HERE, 'check.mjs')
const FX = join(HERE, 'fixtures')

const RED = {
  'html-document-tag': { exit: 1, expect: ['index.html:1 html-document-tag', 'index.html:2 html-document-tag', 'index.html:3 html-document-tag'] },
  'html-script': { exit: 1, expect: ['index.html:2 html-script'] },
  'html-stylesheet': { exit: 1, expect: ['index.html:1 html-stylesheet'] },
  'entry-main-missing': { exit: 1, expect: ['main.js:0 entry-main'] },
  'entry-index-missing': { exit: 1, expect: ['index.html:0 entry-index'] },
  storage: { exit: 1, tagged: 'storage/main.js:5 storage', expect: ['main.js:1 storage', 'main.js:2 storage', 'main.js:3 storage', 'main.js:4 storage', 'main.js:5 storage'] },
  'network-write': { exit: 1, expect: ['main.js:1 network-write', 'main.js:2 network-write', 'main.js:3 network-write', 'main.js:3 network-api', 'main.js:4 network-write'] },
  'network-api': { exit: 1, expect: ['main.js:1 network-api', 'main.js:2 network-api', 'main.js:3 network-api', 'main.js:4 network-api', 'main.js:5 network-api'] },
  'import-specifier': { exit: 1, expect: ['main.js:1 import-specifier', 'main.js:2 import-specifier', 'main.js:3 import-specifier', 'main.js:4 import-specifier', 'main.js:5 import-specifier'] },
  'import-unresolved': { exit: 1, expect: ['main.js:1 import-unresolved', 'main.js:2 import-unresolved'] },
  'backend-run-count': { exit: 1, expect: ['game/second.js:1 backend-run-count', 'main.js:1 backend-run-count', 'main.js:2 backend-run-count', 'main.js:3 backend-run-count',
    'game/second.js:1 backend-run-site', 'main.js:1 backend-run-site', 'main.js:2 backend-run-site', 'main.js:3 backend-run-site'] },
  'backend-run-python': { exit: 1, expect: ['q/mod.py:2 backend-run-site'] },
  'hardcoded-backend': { exit: 1, expect: ['main.js:1 import-specifier', 'main.js:1 hardcoded-backend', 'main.js:2 hardcoded-backend', 'main.js:3 hardcoded-backend'] },
  'hardcoded-secret': { exit: 1, expect: ['main.js:1 hardcoded-secret', 'main.js:2 hardcoded-secret', 'main.js:3 hardcoded-secret'] },
}

// fixtures/forms: every way to reach backend.run, each next to the one ruled site (quantum/bridge.js:4), so a
// form that escapes shows as a MISSING pair. Red-team named js-destructure, js-alias, js-bracket, py-getattr;
// the rest were written from the language, not from their list (gate-independence law 4a).
const B = ['quantum/bridge.js:4 backend-run-count']
const two = (at) => [...B, `${at} backend-run-count`, `${at} backend-run-site`]
const FORMS = {
  'js-destructure': two('main.js:4'), 'js-alias': two('main.js:4'), 'js-bracket': two('main.js:3'), 'py-getattr': two('q/mod.py:2'),
  'js-reflect-get': two('main.js:3'), 'js-run-call': two('main.js:3'), 'js-spread': two('main.js:4'), 'js-param-flow': two('main.js:4'),
  'js-cross-file-param': two('game/net.js:2'), 'js-destructure-rename': two('main.js:4'), 'js-optional-chain': two('main.js:3'),
  'js-computed': two('main.js:4'), 'js-bind': two('main.js:3'), 'js-alias-chain': two('main.js:6'), 'js-object-prop': two('main.js:4'),
  'js-alias-called-twice': [...two('main.js:4'), 'main.js:5 backend-run-count', 'main.js:5 backend-run-site'],
  'py-alias': two('q/mod.py:3'), 'py-param-flow': two('q/mod.py:2'), 'py-getattr-computed': two('q/mod.py:2'), 'py-attrgetter': two('q/mod.py:4'),
  'py-walrus': two('q/mod.py:3'), 'py-dunder': two('q/mod.py:2'), 'py-class-init': two('q/mod.py:6'),
  'site-outside-bridge': ['main.js:1 backend-run-site'],
  // flows the analysis cannot follow are red (an unfollowed flow could reach run): a library no file defines, a return value
  'escape-unresolved': ['main.js:4 backend-run-escape', 'main.js:6 backend-run-escape'],
  'js-eval': ['main.js:3 backend-run-escape'], 'js-computed-store': two('main.js:5'),
  'js-run-stored-escapes': two('main.js:3'), 'js-default-param': two('main.js:4'),
  'site-in-bridge-wrong-fn': ['quantum/bridge.js:7 backend-run-site'],
  'ok-ruled-site': [],
  // false positives: a forbidden word only inside a string, in a file main.js never loads or in a docstring
  'fp-test-asserts-absence': [], 'fp-docstring': [],
  // ...and the controls the narrowing must not reach: code, a reachable test file, a parenthesised value, a computed import
  'fp-control-test-code': ['tests/test_leak.py:1 hardcoded-secret'],
  'fp-control-reachable-test': ['tests/helper.py:1 hardcoded-secret', 'tests/helper2.py:1 hardcoded-secret'], // JS->py and py->py edges
  'fp-control-paren-string': ['q/engine.py:2 hardcoded-backend'],
  'fp-control-dynamic-import': ['tests/test_job.py:10 hardcoded-backend', 'tests/test_job.py:10 hardcoded-secret', 'tests/test_job.py:16 network-api', 'tests/test_job.py:16 storage'],
}

let bad = 0
function run(root) { return spawnSync('node', [CHECKER, '--root', root], { encoding: 'utf8' }) }
function pairs(out) { return out.split('\n').map((l) => /^[^\/\s]+\/(\S*?):(\d+) ([\w-]+) /.exec(l)).filter(Boolean).map((m) => `${m[1]}:${m[2]} ${m[3]}`).sort() }
function verdict(name, ok, why, r) {
  if (!ok) bad++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(24)} exit=${r.status}${why ? '  ' + why : ''}`)
  if (!ok && process.env.VERBOSE) console.log(r.stdout + r.stderr)
}
function grade(name, root, spec) {
  const r = run(root)
  const got = pairs(r.stdout)
  const want = [...spec.expect].sort()
  const missing = want.filter((w) => !got.includes(w))
  const extra = got.filter((g) => !want.includes(g))
  const noTag = spec.tagged && !r.stdout.split('\n').some((l) => l.startsWith(spec.tagged) && l.includes('(inside a string literal)'))
  const noInfo = (spec.info ?? []).filter((t) => !r.stdout.split('\n').some((l) => l.includes('LIMITATION-HIT') && l.includes(t)))
  const ok = r.status === spec.exit && !missing.length && !extra.length && !noTag && !noInfo.length
  verdict(name, ok, ok ? '' : `want exit ${spec.exit}; missing=[${missing}] extra=[${extra}]${noTag ? ' string-literal tag absent' : ''}${noInfo.length ? ' info absent: ' + noInfo : ''}`, r)
}

grade('clean', join(FX, 'clean'), { exit: 0, expect: [] })
grade('limitations', join(FX, 'limitations'), { exit: 0, expect: [], info: ['main.js:1 dynamic import()', 'main.js:3 fetch method is not'] })
for (const [name, spec] of Object.entries(RED)) grade(name, join(FX, name), spec)
for (const [name, expect] of Object.entries(FORMS)) grade(`forms/${name}`, join(FX, 'forms', name), { exit: expect.length ? 1 : 0, expect })

// generated fixtures: too big or too many to commit
const tmp = mkdtempSync(join(tmpdir(), 'qollab-caps-'))
function tree(name, nFiles, bigBytes) {
  const root = join(tmp, name)
  mkdirSync(join(root, 'assets'), { recursive: true })
  writeFileSync(join(root, 'index.html'), '<div id="g"></div>\n')
  writeFileSync(join(root, 'main.js'), "export const a = 1\n")
  for (let i = 0; i < nFiles - 2; i++) writeFileSync(join(root, 'assets', `f${i}.txt`), 'x')
  if (bigBytes) writeFileSync(join(root, 'assets', 'big.bin'), Buffer.alloc(bigBytes))
  return root
}
grade('file-count-100 (boundary)', tree('c100', 100), { exit: 0, expect: [] })
grade('file-count-101', tree('c101', 101), { exit: 1, expect: [':0 file-count'] })
grade('file-count-hidden', (() => { const r = tree('chid', 100); writeFileSync(join(r, '.hidden'), 'x'); return r })(), { exit: 1, expect: [':0 file-count'] })
grade('file-size-2000000 (boundary)', tree('s0', 3, 2_000_000), { exit: 0, expect: [] })
grade('file-size-2000001', tree('s1', 3, 2_000_001), { exit: 1, expect: ['assets/big.bin:0 file-size'] })
// refusals
const zero = join(tmp, 'zero'); mkdirSync(zero)
verdict('zero-files', run(zero).status === 2, 'must be exit 2', run(zero))
verdict('missing-root', run(join(tmp, 'nope')).status === 2, 'must be exit 2', run(join(tmp, 'nope')))
const unt = tree('unt', 2); writeFileSync(join(unt, 'main.js'), "const a = 'oops\n")
verdict('unterminated-string', run(unt).status === 2, 'must be exit 2', run(unt))
rmSync(tmp, { recursive: true, force: true })

console.log(bad ? `RED: ${bad} fixture expectation(s) failed` : 'GREEN: every fixture behaved as written')
process.exit(bad ? 1 : 0)
