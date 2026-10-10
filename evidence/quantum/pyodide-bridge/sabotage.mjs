// Applies one named sabotage to a COPY of bridge.js. A pattern that does not match is exit 2:
// a sabotage that silently did not apply would report a pass that measured nothing.
import { readFileSync, writeFileSync } from 'node:fs';
const [file, name] = process.argv.slice(2);
const SABOTAGES = {
  'bare-toJs': [[/\.toJs\(\{ dict_converter: Object\.fromEntries \}\)/g, '.toJs()']],
  // Stronger than bare-toJs (a null on Pyodide 314.0.7, whose bare toJs() already gives plain objects):
  // hand the PyProxy itself on, unconverted.
  'no-toJs': [[/return value\.toJs\(\{ dict_converter: Object\.fromEntries \}\);/, 'return value;'], [/value\.destroy\(\);/, '']],
  'no-memo': [[/if \(!verification\) /, '']],
  'plain-call': [[/run_bell_verification_once\.callPromising\(backend\)/, 'run_bell_verification_once(backend)']],
  'swallow-validator': [[/const errors = validateExperimentResult\(/g, 'const errors = [] || validateExperimentResult(']],
};
let src = readFileSync(file, 'utf8');
if (!SABOTAGES[name]) { console.error(`unknown sabotage ${name}`); process.exit(2); }
for (const [re, to] of SABOTAGES[name]) {
  if (!re.test(src)) { console.error(`sabotage ${name}: pattern ${re} not found in ${file}`); process.exit(2); }
  src = src.replace(re, to);
}
writeFileSync(file, src);
console.log(`sabotage ${name} applied to ${file}`);
