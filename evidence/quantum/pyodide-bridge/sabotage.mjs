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
  // Every Python call made plain: a JSPI stack is then never entered for the backend job.
  'plain-call': [[/fn\.callPromising\(\.\.\.args\)/, 'fn(...args)']],
  'swallow-validator': [[/const errors = validate\(result\);/, 'const errors = [] || validate(result);']],
  // The branch call loses the measured angles: Python is no longer told which state was measured.
  'no-theta-passthrough': [[/req\.applyZ, req\.theta, req\.phi\]/, 'req.applyZ]']],
  'no-latch': [[/if \(commit\) return commit;/, '']],
  'restart-no-python': [[/await teleportation\.reset_story_token\.callPromising\(\);/, '']],
  // RESTART also forgets the backend job: a second job per run (forbidden on IonQ).
  'restart-resets-memo': [[/  commit = null;\n\}/, '  commit = null;\n  verification = null;\n}']],
};
let src = readFileSync(file, 'utf8');
if (!SABOTAGES[name]) { console.error(`unknown sabotage ${name}`); process.exit(2); }
for (const [re, to] of SABOTAGES[name]) {
  if (!re.test(src)) { console.error(`sabotage ${name}: pattern ${re} not found in ${file}`); process.exit(2); }
  src = src.replace(re, to);
}
writeFileSync(file, src);
console.log(`sabotage ${name} applied to ${file}`);
