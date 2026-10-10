// Applies one named sabotage to a COPY of bridge.js (or, for a `py:` sabotage, of qollab_job.py next to
// it). A pattern that does not match is exit 2: a sabotage that silently did not apply would report a
// pass that measured nothing.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
  // A second JS submit inside the one verification (IonQ refuses the second job of a run).
  'second-js-run': [[/    const job = await backend\.run\(circuit, \{ shots: BACKEND_SHOTS \}\);/,
    '    await backend.run(circuit, { shots: BACKEND_SHOTS });\n    const job = await backend.run(circuit, { shots: BACKEND_SHOTS });']],
  // Python submits again on its own, with the backend bridge.js hands it for the label.
  'py:python-runs-again': [[/    if not isinstance\(backend_name, str\):\n/,
    '    if not isinstance(backend_name, str):\n        backend_name.run(build_backend_verification_circuit(), shots=256).result()\n']],
};
const target = name.startsWith('py:') ? join(dirname(file), 'qollab_job.py') : file;
let src = readFileSync(target, 'utf8');
if (!SABOTAGES[name]) { console.error(`unknown sabotage ${name}`); process.exit(2); }
for (const [re, to] of SABOTAGES[name]) {
  if (!re.test(src)) { console.error(`sabotage ${name}: pattern ${re} not found in ${target}`); process.exit(2); }
  src = src.replace(re, to);
}
writeFileSync(target, src);
console.log(`sabotage ${name} applied to ${target}`);
