# Sabotage round (gate-independence laws 10 and 15): each fix is reverted, alone, in a DISPOSABLE
# copy of the tree at the commit under test; the unit suite and the ported review scripts run
# against the copy. A sabotage whose replacement does not apply is an error (exit 2), not a pass.
import os, re, shutil, subprocess, sys, tempfile
SRC = sys.argv[1]  # a clean checkout of the commit under test
HERE = os.path.dirname(os.path.abspath(__file__))
PORT = os.path.join(HERE, '..', 'review-port')
PY = sys.executable
S = [
  ('S1 queue removed (nested send/reset delivered immediately)', 'echo/game/state.js', '    if (draining) return;\n', '    if (false) return;\n'),
  ('S2a epoch removed from the ticket check', 'echo/game/state.js', 't.epoch === epoch && t.seq === seq', 't.seq === seq'),
  ('S2b seq removed from the ticket check', 'echo/game/state.js', 't.epoch === epoch && t.seq === seq', 't.epoch === epoch'),
  ('S2c epoch AND seq removed (name compare only, the old guard)', 'echo/game/state.js', 't.epoch === epoch && t.seq === seq', 't.state === state'),
  ('S2d stale-session check removed from commitTransfer', 'echo/game/state.js', "    if (t.epoch !== epoch) return { ok: false, commit, stale: true, result, reason: 'the result belongs to a reset session' };\n", ''),
  ('S3 latch: in-flight/committed check removed', 'echo/game/state.js', '    if (commit !== COMMIT_STATUS.IDLE) return', '    if (false) return'),
  ('S4 latch: a measured refusal re-arms COMMIT', 'echo/game/state.js', '      commit = COMMIT_STATUS.MEASURED_REFUSED;\n', '      commit = COMMIT_STATUS.IDLE;\n'),
  ('S5 direct send(COMMIT_TRANSFER) allowed', 'echo/game/state.js', "    if (event === COMMIT) return `${COMMIT} is sent only by commitTransfer()`;\n", ''),
  ('S6 F6 validation + try/catch removed from eventForResult', 'echo/game/missionRules.js', "  const errors = validateExperimentResult(result);\n  if (errors.length) return none(`invalid result: ${errors.join('; ')}`);\n  try {\n    const out = RULES[state](result);\n    return typeof out === 'string' ? { event: out, reason: 'result shows the lesson' } : out;\n  } catch (err) {\n    return none(`result could not be judged: ${err.message}`);\n  }\n", "  if (!result || typeof result.experiment !== 'string' || typeof result.parameters !== 'object') return none('no result');\n  const out = RULES[state](result);\n  return typeof out === 'string' ? { event: out, reason: 'result shows the lesson' } : out;\n"),
  ('S7 F7 receiver check reduced to P(0) only', 'echo/game/missionRules.js', "  if (r.keyQubits?.length !== 1 || r.keyQubits[0] !== 1) return 'probabilities are not the receiver (q1) marginal';\n  const p = r.probabilities ?? {};\n  const keys = Object.keys(p).sort().join(',');\n  if (keys !== '0,1') return `receiver marginal needs outcomes 0 and 1, got ${keys || 'none'}`;\n  if (Math.abs(p['0'] - 0.5) > MARGINAL_TOL || Math.abs(p['1'] - 0.5) > MARGINAL_TOL)", "  const p = r.probabilities ?? {};\n  if (typeof p['0'] !== 'number' || Math.abs(p['0'] - 0.5) > MARGINAL_TOL)"),
  ('S8 F8 spec.mjs skips an unparseable row', 'dev/gameplay/tests/spec.mjs', "    if (!m) throw new Error(`vision doc §9.2 line ${i - first}: cannot parse ${JSON.stringify(lines[i])}`);\n", '    if (!m) continue;\n'),
  ('S9 ack gate removed (ruling 13)', 'echo/game/state.js', "    if (ACKNOWLEDGEMENTS.has(event) && (panelSeq !== seq || queue.length)) return", "    if (false) return"),
  ('S10 00 dry run unlocks COMMIT again', 'echo/game/missionRules.js', "    if (r.measurementBits.m0 === 0 && r.measurementBits.m1 === 0) return none(", "    if (false) return none("),
  ('S11 fake dry run uses a fixed Pauli state (|+>) instead of fresh random generic', 'dev/gameplay/fakeQuantum.js', 'angles = randomGenericState(random)) =>', 'angles = { theta: Math.PI / 2, phi: 0 }) =>'),
  ('S12 fake dry run reuses ONE generic state for every attempt', 'dev/gameplay/fakeQuantum.js', 'angles = randomGenericState(random)) =>', 'angles = { theta: 1.137, phi: 0.44 }) =>'),
]
def run(cmd, cwd):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=600)
    return p.returncode, p.stdout + p.stderr
def summary(root):
    code, out = run(['node', '--test', 'dev/gameplay/tests/*.test.mjs'], root)
    m = re.search(r'ℹ pass (\d+)[\s\S]*?ℹ fail (\d+)', out)
    unit = f'unit pass {m.group(1)} fail {m.group(2)}' if m else f'unit NO VERDICT (exit {code})'
    fails = sorted(set(re.findall(r'^not ok \d+ - (.+)$', out, re.M)))
    a3 = run(['node', os.path.join(PORT, 'a3_robust.mjs'), root], root)[1]
    a2c, a2 = run([PY, os.path.join(PORT, 'a2_physics.py'), root, '400'], root)
    a2 = re.sub(r', max fidelity shown for a wrong choice [0-9.]+', '', a2)  # random per run; the count is the verdict
    picks = [l for l in (a3 + a2).splitlines() if re.match(r'(A\.|    world|B\.|D\.|E\. (bits|parameters|bell)|F\.|random generic|distinct)', l)]
    return unit, fails, picks, a2c
results = []
base = summary(SRC)
print('BASELINE (no sabotage):', base[0], '| a2 exit', base[3]); [print('   ', l) for l in base[2]]
if not re.match(r'unit pass [1-9]\d* fail 0$', base[0]) or base[3] != 0:
    print('BASELINE IS NOT GREEN: the round would measure nothing'); sys.exit(2)
for name, rel, old, new in S:
    d = tempfile.mkdtemp(prefix='gcm-sab-')
    root = os.path.join(d, 'tree')
    shutil.copytree(SRC, root, ignore=shutil.ignore_patterns('.git', 'evidence', 'vault', 'node_modules'))
    shutil.copy(os.path.join(SRC, 'ECHO_MASTER_VISION.md'), root)
    path = os.path.join(root, rel)
    text = open(path, encoding='utf-8').read()
    if old not in text:
        print(f'{name}: SABOTAGE DID NOT APPLY ({rel})'); sys.exit(2)
    open(path, 'w', encoding='utf-8').write(text.replace(old, new, 1))
    unit, fails, picks, a2c = summary(root)
    print(f'\n{name}\n   {unit} | a2 exit {a2c}')
    for f in fails: print('   red:', f)
    for l in picks:
        if l not in base[2]: print('   changed:', l)
    shutil.rmtree(d)
