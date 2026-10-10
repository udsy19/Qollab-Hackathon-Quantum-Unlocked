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
const pending = [] // lexical findings, graded after reachability: { rel, src, off, rule, msg, inStr }
const parsed = [] // every tokenised .js/.py file: { rel, kind, src, nc, cd, strings }
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
  // Lexical findings are held until reachability is known: a hit that is only inside a string literal, in
  // code main.js can never execute (or in a Python docstring), is printed as info instead (see `executable`).
  const emit = (rule, m, msg) => {
    const inStr = cd[m.index] !== nc[m.index] && /\S/.test(nc[m.index])
    pending.push({ rel: f.rel, src, off: m.index, rule, msg, inStr })
  }
  if (kind !== 'html') parsed.push({ rel: f.rel, kind, src, nc, cd, strings })

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
    if (BACKEND_ID_STRING.test(s.text)) pending.push({ rel: f.rel, src, off: s.start, rule: 'hardcoded-backend', msg: `"${s.text.trim().slice(0, 60)}" looks like a backend id`, inStr: true })
    else infos.push(`${loc(f.rel)}:${lineAt(src, s.start)} prose string mentions IonQ, not a backend id; allowed (UI/provenance text)`)
  }

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

// ------------------------------------------------------------------ reachability: which files can run
// A file runs on Qollab only if main.js reaches it: JS imports (static, literal import(), literal require())
// and JS -> Python module specifiers, then Python imports. Anything that could load code by a computed
// name (non-literal import()/require(), importlib, __import__, exec, eval, runpy) in a reachable file makes
// EVERY file reachable: the narrowing below may only ever be switched off by doubt, never on.
const byRel = new Map(parsed.map((p) => [p.rel, p]))
const pyModule = (dotted) => { // module path -> the files that importing it executes
  const parts = dotted.split('.').filter(Boolean)
  const out = []
  for (let k = 1; k <= parts.length; k++) {
    const base = parts.slice(0, k).join('/')
    if (relSet.has(`${base}/__init__.py`)) out.push(`${base}/__init__.py`)
    if (k === parts.length && relSet.has(`${base}.py`)) out.push(`${base}.py`)
  }
  return out
}
function edgesOf(p) {
  const out = []
  let doubt = null
  const { cd, rel } = p
  if (p.kind === 'js') {
    const strAfter = (k) => p.strings.find((s) => s.start === k + 1)
    eachMatch(cd, /(?:\bfrom|\bimport|\brequire)\s*\(?\s*(['"`])/, (m) => {
      const s = strAfter(m.index + m[0].length - 1)
      if (!s) return
      const spec = s.text
      if (spec.startsWith('./') || spec.startsWith('../')) out.push(posix.normalize(posix.join(posix.dirname(rel), spec.split(/[?#]/)[0])))
      else if (/^[A-Za-z_]\w*(\.[A-Za-z_]\w*)*$/.test(spec)) out.push(...pyModule(spec))
    })
    eachMatch(cd, /\b(?:import|require)\s*\(\s*(?!['"`])/, (m) => { doubt = `${rel}:${lineAt(p.src, m.index)} loads a module by a computed name` })
  } else {
    eachMatch(cd, /^[ \t]*(?:from[ \t]+(\.*)([\w.]*)[ \t]+import[ \t]+(\([^)]*\)|[^\n]*)|import[ \t]+([^\n]*))/m, (m) => {
      if (m[4] !== undefined) { for (const part of m[4].split(',')) out.push(...pyModule(part.trim().split(/\s+/)[0])); return }
      let pkg = m[2]
      if (m[1]) { // relative: one dot is this package
        const up = posix.dirname(rel).split('/').filter((x) => x && x !== '.')
        up.splice(up.length - (m[1].length - 1))
        pkg = [...up, ...m[2].split('.').filter(Boolean)].join('.')
      }
      if (pkg) out.push(...pyModule(pkg))
      for (const name of m[3].replace(/[()]/g, '').split(',')) {
        const n = name.trim().split(/\s+/)[0]
        if (n && n !== '*') out.push(...pyModule(pkg ? `${pkg}.${n}` : n))
      }
    })
    eachMatch(cd, /\bimportlib\b|\b__import__\b|\bexec\s*\(|\beval\s*\(|\brunpy\b/, (m) => { doubt = `${rel}:${lineAt(p.src, m.index)} can load code by a computed name (${m[0].trim()})` })
  }
  return { out, doubt }
}
const reachable = new Set()
let reachDoubt = relSet.has('main.js') ? null : 'main.js is missing, so nothing can be ruled out'
for (const queue = relSet.has('main.js') ? ['main.js'] : []; queue.length && !reachDoubt;) {
  const rel = queue.shift()
  if (reachable.has(rel)) continue
  reachable.add(rel)
  const p = byRel.get(rel)
  if (!p) continue
  const { out, doubt } = edgesOf(p)
  if (doubt) reachDoubt = doubt
  for (const t of out) if (!reachable.has(t)) queue.push(t)
}
const executable = (rel) => reachDoubt !== null || reachable.has(rel)
if (reachDoubt) infos.push(`reachability off (every file treated as executable): ${reachDoubt}`)

// A Python string that is a whole statement on its own (a docstring, or a bare string expression) is never
// a value: nothing can read it. Only such a string, at bracket depth 0, alone on its line(s), qualifies;
// a string inside ( ) [ ] { } or after `=`, `return`, a call, or a `\` continuation is data and still fires.
function bareStatementString(p, off) {
  const s = p.strings.find((x) => x.start <= off && off < x.end)
  if (!s) return false
  const q = s.quote.length
  let a = s.start - q
  while (a > 0 && /[rRbBuUfF]/.test(p.cd[a - 1])) a--
  const lineStart = p.cd.lastIndexOf('\n', a - 1) + 1
  if (p.cd.slice(lineStart, a).trim()) return false
  const prevEnd = p.cd.slice(0, lineStart).replace(/\s+$/, '')
  if (prevEnd.endsWith('\\')) return false
  const after = p.cd.slice(s.end + q, (p.cd.indexOf('\n', s.end + q) + 1 || p.cd.length + 1) - 1)
  if (after.trim()) return false
  let depth = 0
  for (let k = 0; k < a; k++) { const c = p.cd[k]; if ('([{'.includes(c)) depth++; else if (')]}'.includes(c)) depth-- }
  return depth === 0
}
for (const h of pending) {
  const p = byRel.get(h.rel) // undefined for HTML, which has no string notion and is always graded
  const at = `${loc(h.rel)}:${lineAt(h.src, h.off)}`
  if (h.inStr && p && p.kind === 'py' && bareStatementString(p, h.off)) infos.push(`${at} ${h.rule} not graded: inside a Python docstring/bare string statement, which no code can read (${h.msg})`)
  else if (h.inStr && !executable(h.rel)) infos.push(`${at} ${h.rule} not graded: inside a string literal in a file main.js never loads (${h.msg})`)
  else report(loc(h.rel), lineAt(h.src, h.off), h.rule, h.msg + (h.inStr ? ' (inside a string literal)' : ''))
}

// ------------------------------------------------------------------ rule 8: every way to reach backend.run
// Owner ruling (lanes/platform/owner-answers.md, 2026-10-10): exactly one guarded backend.run site,
// quantum/bridge.js verifySelectedBackendOnce. A site is any place `run` is obtained from a value that
// carries the injected backend: through aliases (b = backend), containers ({...backend}, [backend], {backend}),
// destructuring ({ run } = backend), computed and reflective access (backend[k], Reflect.get, getattr,
// attrgetter) and function arguments (f(backend) taints f's parameter, tree-wide by function NAME, JS and
// Python alike, which is how bridge.js hands backend to Python). Flow-insensitive and scope-insensitive:
// a name tainted anywhere in a file is tainted everywhere in it. That over-approximates (a false red names
// the alias) and never under-approximates for the forms above; what it cannot follow is under LIMITATIONS.
const OPENERS = '([{'
const CLOSERS = ')]}'
const IDC = /[A-Za-z0-9_$]/
const KEYWORDS = new Set(['if', 'while', 'for', 'switch', 'return', 'await', 'typeof', 'catch', 'with', 'elif', 'not', 'and', 'or', 'in', 'of', 'yield', 'new', 'void', 'delete', 'case', 'else', 'do', 'assert', 'lambda', 'is', 'function', 'def', 'class', 'async', 'print'])
const skipBack = (cd, k) => { while (k > 0 && /\s/.test(cd[k - 1])) k--; return k }
const skipFwd = (cd, k) => { while (k < cd.length && /\s/.test(cd[k])) k++; return k }
function matchBack(cd, i) { let d = 0; for (let k = i; k >= 0; k--) { if (CLOSERS.includes(cd[k])) d++; else if (OPENERS.includes(cd[k]) && --d === 0) return k } return -1 }
function matchFwd(cd, i) { let d = 0; for (let k = i; k < cd.length; k++) { if (OPENERS.includes(cd[k])) d++; else if (CLOSERS.includes(cd[k]) && --d === 0) return k } return -1 }
function identBefore(cd, end) { let k = end; while (k > 0 && IDC.test(cd[k - 1])) k--; return k < end && !/[0-9]/.test(cd[k]) ? { start: k, name: cd.slice(k, end) } : null }
const optionalDot = (cd, k) => { // if a '.' or '?.' (not '...') ends just before k, the position before it; else -1
  const b = skipBack(cd, k)
  if (cd[b - 1] !== '.' || cd[b - 2] === '.') return -1
  let c = b - 1
  if (cd[c - 1] === '?') c--
  return skipBack(cd, c)
}
// The member chain ending at `end`, segments nearest-first: for `ctx?.dev[0](x)` -> call, index, dev, ctx.
function chainBefore(cd, end) {
  const segs = []
  let k = skipBack(cd, end)
  for (;;) {
    const c = cd[k - 1]
    if (c === ']' || c === ')') {
      const o = matchBack(cd, k - 1)
      if (o < 0) break
      let b = skipBack(cd, o)
      if (cd[b - 1] === '.' && cd[b - 2] === '?') b = skipBack(cd, b - 2)
      const prev = cd[b - 1]
      const id = identBefore(cd, b)
      const attached = prev && (IDC.test(prev) || prev === ']' || prev === ')') && !(id && KEYWORDS.has(id.name))
      if (c === ']') { segs.push({ type: 'index', open: o, close: k - 1 }); if (!attached) { k = o; break } k = b; continue }
      if (attached) { segs.push({ type: 'call', open: o, close: k - 1 }); k = b; continue }
      segs.push({ type: 'paren', open: o, close: k - 1 }); k = o; break
    }
    const id = identBefore(cd, k)
    if (!id || KEYWORDS.has(id.name)) break
    segs.push({ type: 'name', name: id.name, start: id.start })
    k = id.start
    const d = optionalDot(cd, k)
    if (d < 0) break
    k = d
  }
  return { start: k, segs }
}
// Where does the value occupying [vs, ve) go? Scans outwards to the nearest unmatched opener or statement end.
function contextOf(p, vs) {
  const { cd } = p
  const js = p.kind === 'js'
  let d = 0
  let eq = -1
  let commas = 0
  for (let k = vs - 1; k >= 0; k--) {
    const c = cd[k]
    if (CLOSERS.includes(c)) { d++; continue }
    if (OPENERS.includes(c)) { if (d) { d--; continue } return { opener: k, eq, commas } }
    if (d) continue
    if (c === ';') return { stmt: k + 1, eq, commas }
    if (c === '\n') {
      const pe = skipBack(cd, k)
      const last = cd[pe - 1] ?? ''
      if (js ? !/[=,(+\-*/?:|&[{.!<>%^~]/.test(last) : last !== '\\') return { stmt: k + 1, eq, commas }
      continue
    }
    if (c === ',') { commas++; continue }
    if (c === '=' && eq < 0 && commas === 0 && cd[k + 1] !== '=' && cd[k + 1] !== '>' && !'=!<>+-*/%&|^'.includes(cd[k - 1] ?? '')) eq = k
  }
  return { stmt: 0, eq, commas }
}
const taintedParams = new Map() // function name -> Map(position|'kw:name' -> 'obj'|'fn')
const addParam = (fn, key, kind) => { if (!taintedParams.has(fn)) taintedParams.set(fn, new Map()); const m = taintedParams.get(fn); if (m.get(key) === 'obj' || m.get(key) === kind) return false; m.set(key, kind); return true }
const declaredFns = new Set()
const declaredPy = new Set()
function splitTop(text) { const out = []; let d = 0; let cur = ''; for (const c of text) { if (OPENERS.includes(c)) d++; else if (CLOSERS.includes(c)) d--; if (c === ',' && d === 0) { out.push(cur); cur = '' } else cur += c } if (cur.trim()) out.push(cur); return out }
function declsOf(p) { // [{ name, params: [{ name } | { pattern, open }], open }]
  const { cd } = p
  const out = []
  const params = (o) => { const e = matchFwd(cd, o); return e < 0 ? null : { list: splitTop(cd.slice(o + 1, e)), close: e } }
  const add = (name, o) => {
    const ps = params(o)
    if (!ps) return
    let list = ps.list.map((raw) => {
      const t = raw.replace(/^\s*(?:\*\*|\*|\.\.\.)/, '').trim()
      if (t.startsWith('{')) return { pattern: t }
      const n = /^([A-Za-z_$][\w$]*)/.exec(t)
      return { name: n ? n[1] : '' }
    })
    if (p.kind === 'py' && list[0] && /^(self|cls)$/.test(list[0].name)) list = list.slice(1)
    out.push({ name, params: list })
    declaredFns.add(name)
    if (p.kind === 'py') declaredPy.add(name)
  }
  if (p.kind === 'py') { eachMatch(cd, /\bdef\s+([A-Za-z_]\w*)\s*\(/, (m) => add(m[1], m.index + m[0].length - 1)); return out }
  eachMatch(cd, /\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/, (m) => add(m[1], m.index + m[0].length - 1))
  eachMatch(cd, /([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\s+)?function\b\s*\*?\s*[\w$]*\s*\(/, (m) => add(m[1], m.index + m[0].length - 1))
  eachMatch(cd, /([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\s*)?\(/, (m) => { const o = m.index + m[0].length - 1; const e = matchFwd(cd, o); if (e > 0 && /^\s*=>/.test(cd.slice(e + 1, e + 8))) add(m[1], o) })
  eachMatch(cd, /([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*=>/, (m) => { if (m[2] !== 'async') { out.push({ name: m[1], params: [{ name: m[2] }] }); declaredFns.add(m[1]) } })
  eachMatch(cd, /(^|[\s;{},])([A-Za-z_$][\w$]*)\s*\(/, (m) => { // class/object methods: name(params) {
    if (KEYWORDS.has(m[2])) return
    const o = m.index + m[0].length - 1
    const e = matchFwd(cd, o)
    if (e > 0 && cd[skipFwd(cd, e + 1)] === '{' && !/\bfunction\s*\*?\s*$/.test(cd.slice(Math.max(0, m.index - 12), m.index + m[1].length))) add(m[2], o)
  })
  return out
}
const sites = [] // { rel, off, form, py }
const escapes = [] // backend flows the analysis cannot follow: graded red, because an unfollowed flow can reach run
const boundObtains = [] // run obtained into a name: counted through that name's calls, or once if never called
function fileTaint(p, decls) { // flow-insensitive fixpoint inside one file
  const obj = new Set(['backend'])
  const fn = new Set()
  for (const dcl of decls) {
    const ms = [taintedParams.get(dcl.name), p.kind === 'py' && taintedParams.get(`py:${dcl.name}`)].filter(Boolean)
    if (!ms.length) continue
    dcl.params.forEach((prm, k) => {
      const kind = ms.map((m) => m.get(k) ?? (prm.name && m.get(`kw:${prm.name}`))).sort()[0] // 'fn' < 'obj': either taint applies
      if (!kind) return
      if (prm.pattern) destructure(p, prm.pattern, -1, obj, fn, kind)
      else if (prm.name) (kind === 'fn' ? fn : obj).add(prm.name)
    })
  }
  return { obj, fn }
}
// `{ a, run: x, ['run']: y, [k]: z, ...rest }` taken from a backend-carrying value
function destructure(p, pattern, off, obj, fn, kind, record) {
  if (kind !== 'obj') return
  for (const raw of splitTop(pattern.trim().replace(/^\{|\}$/g, ''))) {
    const t = raw.trim()
    if (!t) continue
    if (t.startsWith('...')) { obj.add(t.slice(3).trim()); continue }
    const kv = /^(\[[^\]]*\]|['"`]?\s*[\w$]*\s*['"`]?)\s*(?::\s*([A-Za-z_$][\w$]*))?\s*(?:=.*)?$/s.exec(t)
    if (!kv || pattern.trim().startsWith('[')) { if (record) record({ off, escape: true, form: `destructuring the gate cannot read (${t.slice(0, 40)})` }); continue }
    let key = kv[1].trim()
    const alias = kv[2] ?? key
    if (key.startsWith('[')) { if (record) record({ off, form: `destructuring with a computed key ${key} from a backend value` }); continue }
    if (/^['"`]/.test(key)) { // the key's text is blanked in cd: read it from the source
      const at = p.cd.indexOf(key, off < 0 ? 0 : off)
      key = at >= 0 ? p.src.slice(at + 1, at + key.length - 1).trim() : key
    }
    if (key === 'run') { fn.add(alias); if (record) record({ off, alias, bound: true, form: `destructured { run${alias !== 'run' ? ': ' + alias : ''} } from a backend value` }) }
  }
}
// Sinks that only read or print a value: passing backend to them cannot submit a job.
const SAFE_SINKS = new Set(['String', 'Number', 'Boolean', 'log', 'error', 'warn', 'info', 'debug', 'stringify', 'str', 'repr', 'print', 'isinstance', 'hasattr', 'len', 'id', 'bool'])
// Calls whose result is (or holds) the argument itself: the result is followed as the value.
const WRAPPERS = new Set(['Proxy', 'create', 'assign', 'resolve', 'freeze', 'structuredClone', 'all', 'race', 'allSettled', 'from', 'of', 'list', 'tuple', 'dict', 'copy', 'deepcopy'])
function analyse(p, decls, T, record) { // one pass: grows T, records sites when `record` is set; returns whether T grew
  const { cd } = p
  const js = p.kind === 'js'
  let grew = false
  const grow = (set, name) => { if (name && !set.has(name)) { set.add(name); grew = true } }
  const nameRe = (names) => new RegExp(`(?<![\\w$])(${[...names].map((n) => n.replace(/\$/g, '\\$')).join('|')})(?![\\w$])`, 'g')
  const strAt = (k) => p.strings.find((s) => s.start === k + 1)
  const keyText = (o, e) => { // text of a literal string key between brackets, or null if not a literal
    const inner = cd.slice(o + 1, e)
    const q = inner.search(/['"`]/)
    if (q < 0) return /^\s*\d+\s*$/.test(inner) ? '#num' : null
    const s = strAt(o + 1 + q)
    if (!s || s.interp || cd.slice(o + 1, o + 1 + q).trim() || cd.slice(s.end + s.quote.length, e).trim()) return null
    return s.text
  }
  // A method call on a backend-carrying value (`[backend].forEach((b) => …)`, `Promise.resolve(backend).then(…)`)
  // hands it to any inline callback: every parameter of a callback written in that call's arguments carries it.
  const callbacks = (end) => {
    const a = skipFwd(cd, end)
    const mm = /^(?:\?\.|\.)\s*[A-Za-z_$][\w$]*\s*\(/.exec(cd.slice(a, a + 60))
    if (!mm) return
    const o = a + mm[0].length - 1
    const args = cd.slice(o + 1, matchFwd(cd, o))
    eachMatch(args, /(?:\bfunction\b[^(]*\(([^)]*)\)|\(([^()]*)\)\s*=>|([A-Za-z_$][\w$]*)\s*=>|\blambda\s+([^:]*):)/, (c) => {
      for (const prm of (c[1] ?? c[2] ?? c[3] ?? c[4]).split(',')) { const n = /^\s*(?:\.\.\.)?([A-Za-z_$][\w$]*)/.exec(prm); if (n) grow(T.obj, n[1]) }
    })
  }
  const taintedSeg = (sg) => (sg.type === 'name' && T.obj.has(sg.name)) || (sg.type === 'paren' && nameRe(T.obj).test(cd.slice(sg.open + 1, sg.close)))
  // (1) obtain `run` as a member: x.run, x?.run, x['run'], x?.['run']
  const obtains = []
  eachMatch(cd, /(?<!\.)(\?\.|\.)\s*run(?![\w$])/, (m) => obtains.push({ off: m.index, recvEnd: m.index, after: m.index + m[0].length, form: 'member .run' }))
  if (js) {
    for (const s of p.strings) {
      if (s.text !== 'run' || s.interp) continue
      const q = s.start - s.quote.length
      const b = skipBack(cd, q)
      if (cd[b - 1] !== '[') continue
      const e = skipFwd(cd, s.end + s.quote.length)
      if (cd[e] !== ']') continue
      let r = skipBack(cd, b - 1)
      if (cd[r - 1] === '.' && cd[r - 2] === '?') r = r - 2
      obtains.push({ off: b - 1, recvEnd: r, after: e + 1, form: `bracket ['run']` })
    }
  }
  for (const o of obtains) {
    const ch = chainBefore(cd, o.recvEnd)
    if (!ch.segs.some(taintedSeg)) continue
    if (!record) continue
    const a = skipFwd(cd, o.after)
    const rest = cd.slice(a, a + 12)
    if (cd[a] === '(' || /^\.\s*(call|apply)\s*\(/.test(rest) || (js && /^\?\.\s*\(/.test(rest))) { record({ off: o.off, form: `${o.form} called` }); continue }
    if (/^\.\s*bind\b/.test(rest)) { record({ off: o.off, form: `${o.form}.bind (an escaped run)` }); continue }
    const ctx = contextOf(p, ch.start)
    const target = ctx.eq >= 0 && cd.slice(ctx.eq + 1, ch.start).trim() === '' ? identBefore(cd, skipBack(cd, ctx.eq)) : null
    if (target && ctx.opener === undefined) { T.fn.add(target.name); record({ off: o.off, alias: target.name, bound: true, form: `${o.form} stored in ${target.name}` }) }
    else record({ off: o.off, form: `${o.form} taken without a call (escapes)` })
  }
  // (2) computed access on a backend value: backend[k] (a literal key other than 'run', or a number, is fine)
  eachMatch(cd, /\[/, (m) => {
    const e = matchFwd(cd, m.index)
    let r = skipBack(cd, m.index)
    if (cd[r - 1] === '.' && cd[r - 2] === '?') r -= 2
    if (e < 0 || !(IDC.test(cd[r - 1] ?? '') || cd[r - 1] === ')' || cd[r - 1] === ']')) return
    const ch = chainBefore(cd, r)
    if (!ch.segs.length || !taintedSeg(ch.segs[0])) return
    const key = keyText(m.index, e)
    if (key === 'run' || key === '#num' || (key !== null && key !== 'run')) return // 'run' is counted by (1)
    if (record) record({ off: m.index, form: 'computed property access on a backend value (cannot prove it is not run)' })
  })
  // (3) Python reflection that names the attribute by a string: operator.attrgetter / methodcaller
  if (!js) eachMatch(cd, /\b(attrgetter|methodcaller)\s*\(/, (m) => {
    const o = m.index + m[0].length - 1
    const e = matchFwd(cd, o)
    const first = splitTop(cd.slice(o + 1, e))[0] ?? ''
    const q = first.search(/['"]/)
    const s = q >= 0 && !first.slice(0, q).trim() ? strAt(o + 1 + q) : null
    if (s && s.text !== 'run' && !first.slice(q).replace(/^(['"])\s*\1/, '').trim()) return
    if (record) record({ off: m.index, form: `${m[1]}(${s ? `'${s.text}'` : 'a computed name'}) (reflective access to run)` })
  })
  // (4) every place a backend-carrying value, or a run function, flows
  for (const kind of ['obj', 'fn']) {
    const names = kind === 'obj' ? T.obj : T.fn
    if (!names.size) continue
    eachMatch(cd, nameRe(names), (m) => {
      const ve = m.index + m[0].length
      const nx = cd.slice(skipFwd(cd, ve), skipFwd(cd, ve) + 2)
      if (kind === 'fn') {
        const decl = /(?:\bfunction|\bdef)\s*$/.test(cd.slice(Math.max(0, m.index - 10), m.index))
        if (!decl && cd[m.index - 1] !== '.' && (nx[0] === '(' || /^\.\s*(call|apply)\s*\(/.test(cd.slice(skipFwd(cd, ve), skipFwd(cd, ve) + 10)))) { if (record) record({ off: m.index, form: `call of ${m[0]}, a run function taken from backend` }); return }
      }
      const escape = (form) => { if (record) record({ off: m.index, escape: true, form }) }
      if (nx[0] === '.' && nx[1] !== '.' || nx[0] === '[' || nx[0] === '(' || nx === '?.') { callbacks(ve); return } // a member/call ON it: (1)-(2) grade those
      let vs = chainBefore(cd, ve).start
      let ctx
      for (let hop = 0; hop < 8; hop++) {
        ctx = contextOf(p, vs)
        if (ctx.opener === undefined) break
        const o = ctx.opener
        const close = matchFwd(cd, o)
        const b = skipBack(cd, o)
        const prevId = identBefore(cd, b)
        if (cd[o] === '(') {
          const afterClose = cd.slice(skipFwd(cd, close + 1), skipFwd(cd, close + 1) + 2)
          const declParams = afterClose === '=>' || (!js && prevId && /\bdef\s+$/.test(cd.slice(Math.max(0, prevId.start - 8), prevId.start))) || (prevId && /\bfunction\s*\*?\s*$/.test(cd.slice(Math.max(0, prevId.start - 12), prevId.start))) || (prevId && prevId.name === 'function') ||
            (js && prevId && !KEYWORDS.has(prevId.name) && cd[skipFwd(cd, close + 1)] === '{' && !/[.]\s*$/.test(cd.slice(0, prevId.start))) || (!js && prevId && prevId.name === 'lambda')
          if (declParams) { // a parameter list: only a default value (dev = backend) is a flow
            const dflt = ctx.eq >= 0 ? identBefore(cd, skipBack(cd, ctx.eq)) : null
            if (dflt) grow(kind === 'fn' ? T.fn : T.obj, dflt.name)
            return
          }
          const attached = cd[b - 1] && (IDC.test(cd[b - 1]) || cd[b - 1] === ')' || cd[b - 1] === ']') && !(prevId && KEYWORDS.has(prevId.name))
          if (!attached) { // parenthesised expression or a keyword's parentheses: for (x of <value>) binds x
            const head = /\bfor\s*$/.test(cd.slice(Math.max(0, b - 4), b)) && /^\s*(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s+(?:of|in)\b/.exec(cd.slice(o + 1, vs))
            if (head) { grow(T.obj, head[1]); return }
            vs = o; continue
          }
          const callee = chainBefore(cd, b)
          const names2 = callee.segs.filter((s) => s.type === 'name').map((s) => s.name)
          let fname = names2[0]
          let pos = ctx.commas
          let lang = '' // '' = a JS or a Python definition of that name; 'py:' = Python only
          if (/^(callPromising|callPromisingKwargs|callKwargs)$/.test(fname)) { fname = names2[1]; lang = 'py:' }
          else if (fname === 'call') { fname = names2[1]; pos -= 1 }
          else if (fname === 'apply' || fname === 'bind') fname = null
          const owner = names2[1]
          if (kind === 'obj' && fname && pos === 0 && ((owner === 'Reflect' && /^(get|getOwnPropertyDescriptor)$/.test(fname)) || (owner === 'Object' && /^(getOwnPropertyDescriptors?|entries|values|getPrototypeOf)$/.test(fname)) || (!js && /^(getattr|vars|type)$/.test(fname)))) {
            const args = splitTop(cd.slice(o + 1, close))
            const keyArg = args[1]
            if (keyArg !== undefined && /^\s*['"]\s*['"]\s*$/.test(keyArg)) {
              const s = strAt(o + 1 + cd.slice(o + 1, close).indexOf(keyArg) + keyArg.search(/['"]/))
              if (s && s.text !== 'run') return
            }
            if (record) record({ off: o, form: `${owner ? owner + '.' : ''}${fname}(backend${keyArg !== undefined ? ', …' : ''}) (reflective access to run)` })
            return
          }
          if (!fname || SAFE_SINKS.has(fname) || fname === 'run' || (!js && /^(attrgetter|methodcaller)$/.test(fname))) return // read-only, or already a site
          if (kind === 'obj' && owner === 'Object' && fname === 'assign') { const t0 = /^\s*([A-Za-z_$][\w$]*)\s*$/.exec(splitTop(cd.slice(o + 1, close))[0] ?? ''); if (t0) grow(T.obj, t0[1]) }
          const kw = ctx.eq >= 0 ? identBefore(cd, skipBack(cd, ctx.eq)) : null
          const key = kw && !js ? `kw:${kw.name}` : pos
          if (addParam(lang + fname, key, kind)) grew = true
          const isNew = /\bnew\s+$/.test(cd.slice(Math.max(0, callee.start - 8), callee.start))
          if (isNew && addParam('constructor', key, kind)) grew = true
          if (WRAPPERS.has(fname)) { vs = callee.start; callbacks(close + 1); continue } // the result IS the value: follow it
          if (!(lang ? declaredPy : declaredFns).has(fname) && !(isNew && declaredFns.has('constructor'))) escape(`passed to ${fname}(), which no ${lang ? 'Python ' : ''}file in the upload defines`)
          return // a defined function: its parameter carries the value from here (taintedParams)
        }
        if (cd[o] === '[') { if (cd[b - 1] && (IDC.test(cd[b - 1]) || cd[b - 1] === ')' || cd[b - 1] === ']') && !(prevId && KEYWORDS.has(prevId.name))) return; vs = o; callbacks(close + 1); continue }
        // '{': an object literal is a container; a block is a statement boundary
        if (/[(,=:[?]$/.test(cd[b - 1] ?? '') || /\breturn$/.test(cd.slice(Math.max(0, b - 6), b))) { vs = o; callbacks(close + 1); continue }
        break
      }
      const stmtStart = ctx.stmt ?? (ctx.opener !== undefined ? ctx.opener + 1 : 0) // a block's '{' starts the statement
      const head = cd.slice(stmtStart, vs).trim()
      if (ctx.eq < 0) {
        if (/^(?:return|yield|throw|export\s+default)\b/.test(head) || /=>\s*$/.test(head)) escape('returned from a function, which the gate does not follow into its callers')
        else if (!js && /^for\s+([A-Za-z_]\w*)\s+in\b/.test(head)) grow(T.obj, /^for\s+([A-Za-z_]\w*)/.exec(head)[1])
        return
      }
      const lhs = cd.slice(stmtStart, ctx.eq).trim().replace(/^(?:export\s+)?(?:const|let|var)\s+/, '').replace(/:$/, '')
      if ((lhs.startsWith('{') || lhs.startsWith('[')) && js) { destructure(p, lhs, stmtStart, T.obj, T.fn, kind, record); return }
      for (const part of lhs.split(',')) { const id = /([A-Za-z_$][\w$]*)\s*$/.exec(part.trim()); if (id) grow(kind === 'fn' ? T.fn : T.obj, id[1]) }
    })
  }
  return grew
}
const units = parsed.map((p) => ({ p, decls: declsOf(p) }))
const paramState = () => JSON.stringify([...taintedParams].map(([k, v]) => [k, [...v]]))
for (let round = 0; ; round++) { // tree-wide fixpoint: a parameter tainted by a call in one file feeds the next
  if (round === 25) refuse('backend taint did not converge in 25 rounds; the backend.run count cannot be trusted')
  const before = paramState()
  for (const u of units) {
    u.T = fileTaint(u.p, u.decls)
    let k = 0
    while (analyse(u.p, u.decls, u.T, null)) if (++k === 50) refuse(`${loc(u.p.rel)}: backend aliases did not converge`)
  }
  if (paramState() === before) break
}
for (const u of units) {
  const seen = new Set()
  analyse(u.p, u.decls, u.T, (s) => {
    const key = `${s.off}|${s.form}`
    if (seen.has(key)) return
    seen.add(key)
    if (s.escape) escapes.push({ rel: u.p.rel, off: s.off, form: s.form })
    else if (s.bound) boundObtains.push({ rel: u.p.rel, ...s, py: u.p.kind === 'py' })
    else sites.push({ rel: u.p.rel, off: s.off, form: s.form, py: u.p.kind === 'py' })
  })
}
for (const b of boundObtains) { // a run taken into a name that is never called still escaped: count it once
  if (!sites.some((s) => s.rel === b.rel && s.form.startsWith(`call of ${b.alias},`))) sites.push({ rel: b.rel, off: b.off, form: `${b.form}, never called here (escapes)`, py: b.py })
}

// rule 8 verdicts
const RULED = 'quantum/bridge.js'
const ruledBody = (() => { // the body of verifySelectedBackendOnce in quantum/bridge.js, as [start, end)
  const p = byRel.get(RULED)
  if (!p) return null
  const m = /\bfunction\s+verifySelectedBackendOnce\s*\(|\bverifySelectedBackendOnce\s*[:=]\s*(?:async\s*)?(?:function\b[^(]*)?\(/.exec(p.cd)
  if (!m) return null
  const close = matchFwd(p.cd, m.index + m[0].length - 1)
  const open = p.cd.indexOf('{', close)
  if (close < 0 || open < 0 || p.cd.slice(close + 1, open).replace(/=>/, '').trim()) return null
  return [open, matchFwd(p.cd, open)]
})()
const lineOfSite = (s) => lineAt(byRel.get(s.rel).src, s.off)
sites.sort((a, b) => a.rel.localeCompare(b.rel) || a.off - b.off)
if (sites.length > 1) sites.forEach((s, k) => report(loc(s.rel), lineOfSite(s), 'backend-run-count', `backend.run site ${k + 1} of ${sites.length} (${s.form}); at most one is allowed (a second job stops the run on IonQ)`))
for (const s of sites) {
  const ok = s.rel === RULED && ruledBody && s.off > ruledBody[0] && s.off < ruledBody[1]
  if (ok) continue
  const where = s.py ? 'Python reaches backend.run here' : s.rel === RULED ? 'backend.run in quantum/bridge.js but outside verifySelectedBackendOnce' : 'backend.run reached outside quantum/bridge.js'
  report(loc(s.rel), lineOfSite(s), 'backend-run-site', `${where} (${s.form}); the owner's one ruled site is quantum/bridge.js verifySelectedBackendOnce`)
}
// An unfollowed flow is red, not a limitation: the gate's GREEN claims "no second site", and it cannot
// claim that about a value it lost. Restructure the code so backend only reaches quantum/bridge.js.
for (const e of escapes.sort((a, b) => a.rel.localeCompare(b.rel) || a.off - b.off)) report(loc(e.rel), lineAt(byRel.get(e.rel).src, e.off), 'backend-run-escape', `backend is ${e.form}; the gate cannot follow it to a run, so it cannot certify one site`)
infos.push(sites.length === 1 ? `backend.run: exactly one site, ${loc(sites[0].rel)}:${lineOfSite(sites[0])} (${sites[0].form})` : `backend.run: ${sites.length} site(s) reached from backend in scanned code`)

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
