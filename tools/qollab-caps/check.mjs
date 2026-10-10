#!/usr/bin/env node
// tools/qollab-caps/check.mjs — would echo/ break on Qollab's STATIC upload/runtime rules?
//
//   node tools/qollab-caps/check.mjs                 # grades <repo>/echo
//   node tools/qollab-caps/check.mjs --root <dir>    # grades another tree (fixtures, disposable copies)
//
// Exit 0 green · 1 red · 2 refused (could not grade: no root, zero files, a file the scanner
// cannot tokenise). Every failure prints `file:line rule-id message`.
//
// INDEPENDENCE (gate-independence): the only input is the byte content of the files under the root.
// Nothing here reads the game's own account of itself (no manifest, no status file).
//
// SOUNDNESS: rules 5-9 are lexical. A small tokenizer (JS and Python) masks comments, and separately
// masks string literals, so a word in a comment is never a finding. Words inside a string literal
// ARE findings (a bracket access like window['localStorage'] must not slip through) and are tagged
// "inside a string literal" so a human can triage. What a lexical check cannot see is printed under
// LIMITATIONS on every run — a rule that cannot be sound is named, never silently passed.

import { readdirSync, lstatSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve, relative, basename, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const argRoot = process.argv.indexOf('--root')
const ROOT = argRoot > 0 ? resolve(process.argv[argRoot + 1] ?? '') : resolve(HERE, '../../echo')

const MAX_FILES = 100
const MAX_BYTES = 2_000_000 // strict reading of "2 MB"; 2 MiB (2,097,152) is an open owner question

// A crash must never read as red (exit 1 is a verdict): an internal error is exit 2, could not grade.
process.on('uncaughtException', (e) => { console.log(`REFUSED: internal error: ${e && e.stack ? e.stack : e}`); process.exit(2) })

const findings = []
const infos = []
function report(file, line, rule, msg) { findings.push({ file, line, rule, msg }) }
function refuse(msg) { console.log(`REFUSED: ${msg}`); process.exit(2) }

// ------------------------------------------------------------------ files
if (!existsSync(ROOT) || !lstatSync(ROOT).isDirectory()) refuse(`root ${ROOT} is not a directory`)
const label = basename(ROOT)
const files = [] // { rel, abs, size, link }
;(function walk(dir) {
  for (const name of readdirSync(dir)) { // readdirSync includes dotfiles
    const abs = join(dir, name)
    const st = lstatSync(abs)
    if (st.isDirectory()) walk(abs)
    else files.push({ rel: relative(ROOT, abs).split('\\').join('/'), abs, size: st.size, link: st.isSymbolicLink() })
  }
})(ROOT)
if (files.length === 0) refuse(`zero files under ${ROOT}: nothing was scanned, so nothing can be called green`)
const relSet = new Set(files.map((f) => f.rel))
const loc = (f) => `${label}/${f}`

// ------------------------------------------------------------------ tokenizer
// Returns { noComment, code, strings }: both same length as src (newlines preserved so offsets map to
// lines). `noComment` has comments blanked; `code` also has string/regex contents blanked.
// Throws {line, msg} when the source cannot be tokenised (unterminated string/comment/template).
function tokenize(src, lang) {
  const nc = src.split('')
  const cd = src.split('')
  const strings = []
  const blank = (arr, a, b) => { for (let k = a; k < b; k++) if (arr[k] !== '\n') arr[k] = ' ' }
  const lineOf = (i) => src.slice(0, i).split('\n').length
  const fail = (i, msg) => { throw { line: lineOf(i), msg } }
  const js = lang === 'js'
  const tpl = [] // JS: brace-depth counters for open `${ ... }`
  let lastSig = '' // last significant code char, for regex-vs-divide
  let lastWord = ''
  const REGEX_AFTER = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', ';', '+', '-', '*', '%', '<', '>', '~', '^'])
  const KW_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do'])

  function templateBody(i, startAt) { // i is just after the backtick or the closing `}` of an expression
    const s0 = i
    while (i < src.length) {
      const c = src[i]
      if (c === '\\') { i += 2; continue }
      if (c === '`') { strings.push({ start: s0, end: i, text: src.slice(s0, i), quote: '`' }); blank(cd, s0, i); return i + 1 }
      if (c === '$' && src[i + 1] === '{') { strings.push({ start: s0, end: i, text: src.slice(s0, i), quote: '`', interp: true }); blank(cd, s0, i); tpl.push(0); return i + 2 }
      i++
    }
    fail(startAt, 'unterminated template literal')
  }

  let i = 0
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (js && c === '/' && n === '/') { const e = src.indexOf('\n', i); const end = e < 0 ? src.length : e; blank(nc, i, end); blank(cd, i, end); i = end; continue }
    if (!js && c === '#') { const e = src.indexOf('\n', i); const end = e < 0 ? src.length : e; blank(nc, i, end); blank(cd, i, end); i = end; continue }
    if (js && c === '/' && n === '*') {
      const e = src.indexOf('*/', i + 2)
      if (e < 0) fail(i, 'unterminated block comment')
      blank(nc, i, e + 2); blank(cd, i, e + 2); i = e + 2; continue
    }
    if (c === '"' || c === "'" || (js && c === '`')) {
      if (c === '`') { i = templateBody(i + 1, i); lastSig = '"'; lastWord = ''; continue }
      const triple = !js && src.startsWith(c.repeat(3), i)
      const q = triple ? c.repeat(3) : c
      const s = i + q.length
      let j = s
      for (;;) {
        if (j >= src.length) fail(i, 'unterminated string literal')
        if (src[j] === '\\') { j += 2; continue }
        if (src.startsWith(q, j)) break
        if (!triple && src[j] === '\n') fail(i, 'unterminated string literal (newline before closing quote)')
        j++
      }
      strings.push({ start: s, end: j, text: src.slice(s, j), quote: q })
      blank(cd, s, j)
      i = j + q.length; lastSig = '"'; lastWord = ''; continue
    }
    if (js && c === '/' && (REGEX_AFTER.has(lastSig) || KW_REGEX.has(lastWord))) { // regex literal
      let j = i + 1
      let cls = false
      for (;;) {
        if (j >= src.length || src[j] === '\n') fail(i, 'unterminated regex literal (or a division the scanner mistook for one)')
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === '[') cls = true
        else if (src[j] === ']') cls = false
        else if (src[j] === '/' && !cls) break
        j++
      }
      blank(cd, i + 1, j); i = j + 1; lastSig = ')'; lastWord = ''; continue
    }
    if (js && tpl.length) {
      if (c === '{') tpl[tpl.length - 1]++
      else if (c === '}') {
        if (tpl[tpl.length - 1] === 0) { tpl.pop(); i = templateBody(i + 1, i); continue }
        tpl[tpl.length - 1]--
      }
    }
    if (!/\s/.test(c)) {
      lastSig = c
      lastWord = ''
      if (/[A-Za-z_$]/.test(c)) { const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i, i + 80)); lastWord = m[0]; lastSig = 'a'; i += m[0].length; continue }
    }
    i++
  }
  return { noComment: nc.join(''), code: cd.join(''), strings }
}

function maskHtml(src) { // HTML comments only; HTML has no string notion worth masking here
  return src.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
}

const lineAt = (text, off) => { let n = 1; for (let k = 0; k < off; k++) if (text.charCodeAt(k) === 10) n++; return n }
function eachMatch(text, re, fn) { const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); let m; while ((m = g.exec(text))) { fn(m); if (m[0] === '') g.lastIndex++ } }

// ------------------------------------------------------------------ rule 1, 2: counts and sizes
if (files.length > MAX_FILES) report(`${label}/`, 0, 'file-count', `${files.length} files under the root (hidden included), cap is ${MAX_FILES}; ${files.length - MAX_FILES} too many`)
for (const f of files) {
  if (f.size > MAX_BYTES) report(loc(f.rel), 0, 'file-size', `${f.size} bytes exceeds ${MAX_BYTES} bytes (2 MB)`)
}
const dsStore = files.filter((f) => /(^|\/)(\.DS_Store|\.git(\/|$)|__MACOSX\/)/.test(f.rel)).length
if (dsStore) infos.push(`${dsStore} of the counted files are .DS_Store/.git/__MACOSX entries that Qollab's uploader drops; they are still counted here (strict)`)

// ------------------------------------------------------------------ rule 3, 4: entry files
if (!relSet.has('main.js')) report(loc('main.js'), 0, 'entry-main', 'echo/main.js does not exist: without it Qollab has no JS entry point')
if (!relSet.has('index.html')) report(loc('index.html'), 0, 'entry-index', 'echo/index.html does not exist: index.html + main.js together make a JS project')

// ------------------------------------------------------------------ per-file lexical rules
const PATTERNS = {
  storage: [
    [/\blocalStorage\b/, 'localStorage is unavailable on Qollab (no persistence between runs)'],
    [/\bsessionStorage\b/, 'sessionStorage is unavailable on Qollab'],
    [/\bindexedDB\b/, 'indexedDB is unavailable on Qollab'],
    [/\bdocument\s*\.\s*cookie\b/, 'document.cookie is unavailable on Qollab'],
    [/\bcookieStore\b/, 'cookieStore is cookie storage, unavailable on Qollab'],
  ],
  'network-write': [
    [/\bmethod\s*[:=]\s*(['"`])\s*(POST|PUT|DELETE|PATCH)\s*\1/i, 'non-GET request method; Qollab allows GET only'],
    [/\.\s*open\s*\(\s*(['"`])\s*(POST|PUT|DELETE|PATCH)\s*\1/i, 'XMLHttpRequest open() with a non-GET method'],
    [/\bsendBeacon\b/, 'navigator.sendBeacon is a POST'],
    [/\brequests\s*\.\s*(post|put|delete|patch)\s*\(/, 'requests.<write>() is a non-GET request'],
  ],
  'network-api': [
    [/\bXMLHttpRequest\b/, 'XMLHttpRequest is blocked on Qollab (use fetch with GET)'],
    [/\bWebSocket\b/, 'WebSocket is blocked on Qollab'],
    [/\bEventSource\b/, 'EventSource is not available on Qollab (long-lived connection)'],
    [/\bnew\s+Worker\s*\(/, 'web workers are blocked on Qollab'],
    [/\bSharedWorker\b/, 'SharedWorker is blocked on Qollab'],
    [/\bserviceWorker\b/, 'service workers are blocked on Qollab'],
    [/\bimportScripts\b/, 'importScripts is a worker API; workers are blocked on Qollab'],
  ],
  'hardcoded-secret': [
    [/\bapi[_-]?key\b/i, 'api_key: a key must never be in published code'],
    [/(?:[?&]token=|\btoken\s*=\s*['"][^'"\n]{3,}['"])/, 'hardcoded token= (query parameter or string value)'],
  ],
}
// Known id shapes only: a broader pattern fired on 'ionq_magic', a deliberately-invalid engine value in quantum's tests.
const BACKEND_ID_STRING = /^\s*ionq\s*$|\bionq[_.\-](?:simulator|qpu|aria|forte|harmony)\w*|\bqpu\.\w+|\bsimulator_ionq/i

const importSpecs = []
const backendRuns = [] // JS call sites
const pyBackendRuns = []
const kindOf = (rel) => (/\.(m?js|cjs)$/.test(rel) ? 'js' : rel.endsWith('.py') ? 'py' : rel.endsWith('.html') ? 'html' : null)
let codeFiles = 0

for (const f of files) {
  const kind = kindOf(f.rel)
  if (!kind) continue
  if (f.link) { report(loc(f.rel), 0, 'file-count', 'symlink: Qollab uploads cannot follow it; replace with a real file'); continue }
  let src
  try { src = readFileSync(f.abs, 'utf8') } catch (e) { refuse(`cannot read ${f.rel}: ${e.message}`) }
  codeFiles++
  let nc, cd, strings
  if (kind === 'html') { nc = maskHtml(src); cd = nc; strings = [] } else {
    try { ({ noComment: nc, code: cd, strings } = tokenize(src, kind)) } catch (e) {
      if (e && e.line) refuse(`${loc(f.rel)}:${e.line} cannot tokenise (${e.msg}); the lexical rules cannot be trusted on this file`)
      throw e
    }
  }
  const emit = (rule, m, msg) => {
    const inStr = cd[m.index] !== nc[m.index] && /\S/.test(nc[m.index])
    report(loc(f.rel), lineAt(src, m.index), rule, msg + (inStr ? ' (inside a string literal)' : ''))
  }

  // rule 3: index.html is a body fragment
  if (f.rel === 'index.html') {
    eachMatch(nc, /<\s*(html|head|body)\b/i, (m) => emit('html-document-tag', m, `<${m[1].toLowerCase()}> found: index.html must be a body fragment`))
    eachMatch(nc, /<\s*script\b/i, (m) => emit('html-script', m, '<script> in index.html does not run on Qollab; load code from main.js'))
    eachMatch(nc, /<\s*link\b[^>]*\brel\s*=\s*["']?stylesheet/i, (m) => emit('html-stylesheet', m, '<link rel=stylesheet>: main.css is the only stylesheet Qollab loads'))
  }

  // rules 5, 6, 9 (secret half)
  for (const [rule, list] of Object.entries(PATTERNS)) {
    for (const [re, msg] of list) eachMatch(nc, re, (m) => emit(rule, m, msg))
  }

  if (kind === 'html') continue // prose in HTML legitimately says "IonQ"; imports/backend do not apply

  // rule 9 (backend-name half): IonQ outside strings is an identifier/import; inside a string only a backend-id shape is a finding
  eachMatch(cd, /\bionq\w*/i, (m) => emit('hardcoded-backend', m, `${m[0]}: backend names must come from the injected backend, never from code`))
  for (const s of strings) {
    if (!/ionq/i.test(s.text)) continue
    if (BACKEND_ID_STRING.test(s.text)) report(loc(f.rel), lineAt(src, s.start), 'hardcoded-backend', `"${s.text.trim().slice(0, 60)}" looks like a backend id (inside a string literal)`)
    else infos.push(`${loc(f.rel)}:${lineAt(src, s.start)} prose string mentions IonQ, not a backend id; allowed (UI/provenance text)`)
  }

  // rule 8: backend.run call sites
  const sites = kind === 'py' ? pyBackendRuns : backendRuns
  eachMatch(cd, /\bbackend\s*\.\s*run\s*\(/, (m) => sites.push({ file: loc(f.rel), line: lineAt(src, m.index) }))
  eachMatch(nc, /\bbackend\s*\[\s*['"]run['"]\s*\]/, (m) => sites.push({ file: loc(f.rel), line: lineAt(src, m.index) }))
  eachMatch(cd, /\bbackend\s*\.\s*run\b(?!\s*\()/, (m) => infos.push(`LIMITATION-HIT ${loc(f.rel)}:${lineAt(src, m.index)} backend.run used without a direct call (aliased?); the call-site count may be low`))

  // rule 7: imports (JS only)
  if (kind === 'js') {
    for (const s of strings) {
      if (s.quote === '`' && (s.interp || src[s.end] === '$')) continue
      // text before the opening quote must end in `from` or `import` / `import(`
      if (/(?:\bfrom\s*|\bimport\s*\(?\s*)$/.test(cd.slice(Math.max(0, s.start - 80), s.start - 1))) {
        importSpecs.push({ file: f.rel, line: lineAt(src, s.start), spec: s.text })
      }
    }
    eachMatch(cd, /\bimport\s*\(\s*(?!['"`)])/, (m) => infos.push(`LIMITATION-HIT ${loc(f.rel)}:${lineAt(src, m.index)} dynamic import() with a non-literal specifier cannot be checked`))
    eachMatch(cd, /\bfetch\s*\([^;]*?\bmethod\s*:\s*(?!['"`])/, (m) => infos.push(`LIMITATION-HIT ${loc(f.rel)}:${lineAt(src, m.index)} fetch method is not a string literal; cannot tell whether it is GET`))
  }
}

// rule 7 verdicts
for (const { file, line, spec } of importSpecs) {
  const at = loc(file)
  if (spec.startsWith('./') || spec.startsWith('../')) {
    const target = posix.normalize(posix.join(posix.dirname(file), spec.split(/[?#]/)[0]))
    if (!relSet.has(target)) report(at, line, 'import-unresolved', `relative import "${spec}" resolves to ${target}, which is not in the upload`)
  } else if (/^https:\/\//.test(spec)) {
    // a full https URL is allowed
  } else if (spec === 'three' || spec.startsWith('three/addons/') || spec === 'postprocessing') {
    // provided by Qollab
  } else if (/^[A-Za-z_]\w*(\.[A-Za-z_]\w*)*$/.test(spec)) {
    const py = spec.split('.').join('/') + '.py'
    if (!relSet.has(py)) report(at, line, 'import-specifier', `bare import "${spec}" is not three, three/addons/*, postprocessing, and echo/${py} does not exist`)
  } else report(at, line, 'import-specifier', `import "${spec}" is not a relative path, https URL, provided package or Python module (http:// and protocol-relative URLs are not allowed)`)
}

// rule 8 verdicts
if (backendRuns.length > 1) backendRuns.forEach((r, k) => report(r.file, r.line, 'backend-run-count', `backend.run call site ${k + 1} of ${backendRuns.length} in echo/**/*.js; at most one is allowed (a second job stops the run on IonQ)`))
for (const r of pyBackendRuns) report(r.file, r.line, 'backend-run-python', 'Python calls backend.run itself; only JS may, unless the owner rules otherwise')
const allRuns = [...backendRuns, ...pyBackendRuns]
infos.push(`backend.run: ${allRuns.length} call site(s)${allRuns.length ? ': ' + allRuns.map((r) => `${r.file}:${r.line}`).join(', ') : ''}`)

// ------------------------------------------------------------------ output
const LIMITATIONS = [
  'backend.run is counted per CALL SITE, not per execution: one site in a loop, or reached through another variable (const b = backend; b.run()), is not caught. The runtime guard is the only proof of "one job".',
  'Code inside Python f-string {expressions} and any string-built access (window["local"+"Storage"]) is not scanned.',
  'Regex-literal vs division is a heuristic; a misread refuses (exit 2) rather than passing.',
  'Only .js .mjs .cjs .py .html are scanned for content; JSON/CSS/other files count toward caps 1-2 only.',
  'Static rules only: this runs nothing on Qollab, so it says nothing about the Qollab run itself.',
]
findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule))
for (const f of findings) console.log(`${f.file}:${f.line} ${f.rule} ${f.msg}`)
for (const x of infos) console.log(`  info: ${x}`)
console.log('LIMITATIONS (not covered by any rule above):')
for (const l of LIMITATIONS) console.log(`  - ${l}`)
const rules = new Set(findings.map((f) => f.rule))
console.log(`scanned ${files.length} files (${codeFiles} code files) under ${ROOT}`)
if (findings.length) { console.log(`RED: ${findings.length} failure(s) across ${rules.size} rule(s): ${[...rules].join(', ')}`); process.exit(1) }
console.log('GREEN: no static Qollab rule broken (see LIMITATIONS for what this cannot prove)')
