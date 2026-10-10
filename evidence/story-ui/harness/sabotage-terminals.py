"""Sabotage round for the terminals gates. Each sabotage is applied to a DISPOSABLE copy of the
worktree's echo/ + harness (never the tracked files), served on its own port, and graded by
drive-terminals.mjs and copy-check.mjs. A sabotage that leaves both gates green is a NULL and is
reported as such. Usage (worktree root): python3 evidence/story-ui/harness/sabotage-terminals.py"""
import os, shutil, socket, subprocess, sys, tempfile, time

def free_port():
    # A port another worker already holds made a sabotage REFUSE (exit 2) instead of grade: bind 0.
    with socket.socket() as so:
        so.bind(('127.0.0.1', 0))
        return so.getsockname()[1]

ROOT = os.getcwd()
CONTRACTS = subprocess.run(['git', 'show', 'lane/platform/integration:echo/contracts.js'], capture_output=True, check=True).stdout
T = 'echo/ui/terminal.js'
STUB = 'evidence/story-ui/harness/stub-engine.js'
DATA = 'echo/data/objectives.js'
SABOTAGES = [
    ('S1 no busy guard on engine calls (double commit)', T, "    if (s.busy) return false;\n", "", None),
    ('S2 commit guard removed too', T, "    if (s.busy) return;\n    // One atomic", "    // One atomic", 'S1'),
    ('S3 a correct 00 dry run unlocks COMMIT', T, "s.dry.pass && !s.dry.trivial && shown", "s.dry.pass && shown", None),
    ('S4 correction rule swapped in the terminal (X iff m0)', T, "({ x: m1 === 1, z: m0 === 1 })", "({ x: m0 === 1, z: m1 === 1 })", None),
    ('S5 EXPLANATION_READ on opening WHY instead of the deduction', T, "(s) => s.choice === 'reroute']", "(s) => s.why || s.choice === 'reroute']", None),
    ('S6 source shown CONSUMED while the commit is in flight', T, "const consumed = !!s.committed;", "const consumed = !!s.committed || s.committing;", None),
    ('S7 validator skipped', T, "const errors = validateExperimentResult(result);", "const errors = [];", None),
    ('S8 hardcoded copy in terminal.js', T, "s.status.kind === 'error' ? C.moduleError : C.refused", "s.status.kind === 'error' ? 'MODULE BROKE, TRY AGAIN LATER' : C.refused", None),
    ('S9 m0/m1 labels swapped in data', DATA, "    m0Label: 'SOURCE READOUT m0',\n    m1Label: 'LOCAL BELL-HALF READOUT m1',", "    m0Label: 'LOCAL BELL-HALF READOUT m1',\n    m1Label: 'SOURCE READOUT m0',", None),
    ('S10 enabling step: stub fidelity always 1', STUB, "fidelity: r6(fidelity),", "fidelity: 1,", None),
    ('S11 acknowledgements flushed as soon as the engine answers, before the result is rendered', T, "    onOk(result);\n    render();", "    onOk(result);\n    if (id === 'relay_core') { s.paintedSend = true; s.paintedReceiver = true; flush(id); }\n    render();", None),
    ('S12 ESC no longer closes (listener removed)', T, "  window.addEventListener('keydown', onKey, true);\n", "", None),
]

def run(name, path, old, new, also, port):
    d = tempfile.mkdtemp(prefix='sab-term-')
    for sub in ('echo', 'evidence/story-ui/harness'):
        shutil.copytree(os.path.join(ROOT, sub), os.path.join(d, sub))
    open(os.path.join(d, 'echo/contracts.js'), 'wb').write(CONTRACTS)
    edits = [(path, old, new)]
    if also:
        prev = next(s for s in SABOTAGES if s[0].startswith(also))
        edits.insert(0, (prev[1], prev[2], prev[3]))
    for p, o, n in edits:
        f = os.path.join(d, p)
        src = open(f).read()
        if o not in src:
            return name, 'NOT APPLIED (anchor missing)', '', ''
        open(f, 'w').write(src.replace(o, n, 1))
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1', '--directory', d], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    try:
        out = os.path.join(d, 'out')
        dr = subprocess.run(['node', os.path.join(ROOT, 'evidence/story-ui/harness/drive-terminals.mjs'), str(port), out], capture_output=True, text=True, timeout=240)
        fails = [l for l in dr.stdout.splitlines() if l.startswith('FAIL')]
        cc = subprocess.run(['node', os.path.join(ROOT, 'evidence/story-ui/harness/copy-check.mjs'), os.path.join(d, T), os.path.join(out, 'drive-result.json')], capture_output=True, text=True)
        cfails = [l for l in cc.stdout.splitlines() if l.startswith('FAIL')]
        return name, f'drive exit {dr.returncode}, copy-check exit {cc.returncode}', fails[:3], cfails[:2]
    except subprocess.TimeoutExpired:
        return name, 'NO VERDICT (drive hung)', [], []
    finally:
        srv.kill()
        shutil.rmtree(d, ignore_errors=True)

print('| sabotage | verdict | first failing checks |\n|---|---|---|')
for i, (name, path, old, new, also) in enumerate(SABOTAGES):
    n, v, f, c = run(name, path, old, new, also, free_port())
    tag = 'RED — ' if 'exit 1' in v else 'NULL — ' if 'exit 0, copy-check exit 0' in v else 'REFUSED/NO VERDICT — '
    print(f"| {n} | {tag}{v} | {' ; '.join(f + c)[:400]} |", flush=True)
