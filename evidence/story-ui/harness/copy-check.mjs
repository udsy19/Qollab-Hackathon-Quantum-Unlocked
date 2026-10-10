// Copy gate for echo/ui/terminal.js: player-facing words come from echo/data/objectives.js only.
// Static half: every string literal in terminal.js that reads as prose (two or more words of
// letters) is a failure unless it is a code comment, a class name, a selector or a diagnostic
// (guard messages are developer text shown under a RESULT REFUSED heading that comes from data).
// Rendered half: the leaf texts the drive captured (drive-result.json "leaves") must each be a data
// string (after ket rendering and template filling), a number, a bit, or notation.
// Exit 0 green · 1 red · 2 refused.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const file = process.argv[2] || path.join(repo, 'echo/ui/terminal.js');
const leavesFile = process.argv[3] || path.join(repo, 'evidence/story-ui/terminals/drive-result.json');
const refuse = (m) => { console.error(`REFUSED: ${m}`); process.exit(2); };
if (!fs.existsSync(file)) refuse(`${file} missing`);
const src = fs.readFileSync(file, 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).map((l) => l.replace(/\s\/\/ .*$/, '')).join('\n');

let checks = 0, failed = 0;
const check = (name, ok, detail = '') => { checks++; if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

// Guard and validator diagnostics: developer-facing reasons, shown only as the detail line.
const DIAGNOSTIC = /(must be|sum to|required|is not|differ from|not shown on the receiver panel|unknown interactable|is not an INTERACTABLE_IDS value)/;
const literals = [...src.matchAll(/'([^'\n]*)'|`([^`\n]*)`|"([^"\n]*)"/g)].map((m) => m[1] ?? m[2] ?? m[3]);
const prose = literals.filter((s) => /[A-Za-z]{2,}[ ,.:][ ]?[A-Za-z]{2,}/.test(s.replace(/\$\{[^}]*\}/g, ' x ')) && !/^[a-z0-9_\-. [\]="]+$/.test(s) && !DIAGNOSTIC.test(s) && !/^echo-/.test(s) && !/\[data-/.test(s) && !/^\.\.?\//.test(s));
check('terminal.js: no prose string literals outside echo/data', prose.length === 0, prose.join(' | '));

const data = await import(pathToFileURL(path.join(repo, 'echo/data/objectives.js')).href);
const strings = [];
(function walk(v) { if (typeof v === 'string') strings.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); })({ T: data.TERMINALS, F: data.FAILURES, H: data.HINTS, U: data.HUD });
const ket = (s) => s.replace(/\|([^|<>\s]{1,3})>/g, '|$1⟩');
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const exact = new Set(strings.map((s) => norm(ket(s))));
const templates = strings.filter((s) => /\{\w+\}/.test(s)).map((s) => new RegExp('^' + norm(ket(s)).replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{\w+\\?\}/g, '.+?') + '$'));
const NOTATION = /^(?:[01]|[IXZ]|-?\d+\.\d+|P\((?:[01]|\|[01]⟩)\)|\|[0-9+]⟩)$/;

if (!fs.existsSync(leavesFile)) refuse(`${leavesFile} missing: run drive-terminals.mjs first`);
const leaves = JSON.parse(fs.readFileSync(leavesFile, 'utf8')).leaves;
if (!Array.isArray(leaves) || leaves.length < 50) refuse(`too few rendered leaves captured (${leaves?.length})`);
const engines = Object.values(data.TERMINALS.common.engines);
const unknown = [...new Set(leaves.map(norm))].filter((t) => {
  if (!t || exact.has(t) || NOTATION.test(t) || templates.some((r) => r.test(t))) return false;
  if (engines.some((e) => t === `${data.TERMINALS.common.engineLabel}: ${e}`)) return false;
  const toggle = t.match(/^(.*) \[(ON|OFF)\]$/); if (toggle && exact.has(toggle[1])) return false;
  const joint = t.match(/^(.*?): (.*)$/); if (joint && exact.has(joint[1]) && /^[0-9.|⟩+ ]+$/.test(joint[2])) return false;
  if (/^[a-zA-Z]+: /.test(t) && DIAGNOSTIC.test(t)) return false; // the refused/error detail line
  if (/^[a-zA-Z]+: stub: /.test(t)) return false; // the harness-injected error text
  return true;
});
check(`rendered: all ${new Set(leaves).size} distinct on-screen texts trace to echo/data or notation`, unknown.length === 0, unknown.join(' | '));
console.log(`\n${checks} checks, ${failed} failed`);
process.exit(checks === 0 ? 2 : failed ? 1 : 0);
