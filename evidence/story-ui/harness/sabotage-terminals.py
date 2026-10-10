"""Sabotage round for the terminals gates. Each sabotage is applied to a DISPOSABLE detached git
worktree of HEAD (never the tracked files), served on PORT, and graded by that copy's
drive-terminals.mjs (run from the copy, so a sabotage of the drive itself is graded too) and
copy-check.mjs. A sabotage that leaves both gates green is a NULL and is reported as such.
Commit first: the copy is HEAD, not the working tree.
Usage (worktree root): python3 evidence/story-ui/harness/sabotage-terminals.py [port]"""
import os, shutil, subprocess, sys, tempfile, time

ROOT = os.getcwd()
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8791
DRIVE = 'evidence/story-ui/harness/drive-terminals.mjs'
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
    ('S13 Esc listener on document in the bubble phase (where the pause menu also listens)', T, "  window.addEventListener('keydown', onKey, true);\n", "  document.addEventListener('keydown', onKey);\n", None),
    # terminals-conform: the 16-case failure lines.
    ('S14 m0 and m1 swapped in the lookup key', T, "`m0=${bits.m0},m1=${bits.m1}|", "`m0=${bits.m1},m1=${bits.m0}|", None),
    ('S15 per-switch logic restored (with no_corrections)', T, "    const out = TELEPORT_FAILURE_CASES[`m0=${bits.m0},m1=${bits.m1}|X=${onOff(x)},Z=${onOff(z)}`].map((k) => F[k]);\n",
     "    const out = [];\n    if (bits.m1 && !x) out.push(F.missing_X);\n    if (!bits.m1 && x) out.push(F.extra_X);\n    if (bits.m0 && !z) out.push(F.missing_Z);\n    if (!bits.m0 && z) out.push(F.extra_Z);\n    if (!x && !z && (bits.m0 || bits.m1)) out.push(F.no_corrections);\n", None),
    ('S16 per-switch logic restored (no_corrections left out)', T, "    const out = TELEPORT_FAILURE_CASES[`m0=${bits.m0},m1=${bits.m1}|X=${onOff(x)},Z=${onOff(z)}`].map((k) => F[k]);\n",
     "    const out = [];\n    if (bits.m1 && !x) out.push(F.missing_X);\n    if (!bits.m1 && x) out.push(F.extra_X);\n    if (bits.m0 && !z) out.push(F.missing_Z);\n    if (!bits.m0 && z) out.push(F.extra_Z);\n", None),
    ('S17 one map entry dropped (a both-wrong case)', DATA, " 'm0=1,m1=1|X=off,Z=off': ['missing_X', 'missing_Z'],", "", None),
    ('S18 one map entry dropped (a correct case)', DATA, " 'm0=1,m1=0|X=off,Z=on': [],", "", None),
    ('S19 map entry read in Qiskit c1c0 order (01 shows the 10 line)', DATA, "'m0=0,m1=1|X=off,Z=off': ['missing_X']", "'m0=0,m1=1|X=off,Z=off': ['missing_Z']", None),
    ('S20 closed form broken in the drive (m0 and m1 swapped)', DRIVE, "const rx = (x ? 1 : 0) ^ m1, rz = (z ? 1 : 0) ^ m0;", "const rx = (x ? 1 : 0) ^ m0, rz = (z ? 1 : 0) ^ m1;", None),
]

def run(name, path, old, new, also, port):
    d = os.path.join(tempfile.mkdtemp(prefix='sab-term-'), 'wt')
    subprocess.run(['git', 'worktree', 'add', '--detach', '-q', d, 'HEAD'], check=True)
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
        dr = subprocess.run(['node', os.path.join(d, DRIVE), str(port), out], capture_output=True, text=True, timeout=300, cwd=d)
        fails = [l for l in dr.stdout.splitlines() if l.startswith('FAIL')]
        cc = subprocess.run(['node', os.path.join(d, 'evidence/story-ui/harness/copy-check.mjs'), os.path.join(d, T), os.path.join(out, 'drive-result.json')], capture_output=True, text=True, cwd=d)
        cfails = [l for l in cc.stdout.splitlines() if l.startswith('FAIL')]
        return name, f'drive exit {dr.returncode}, copy-check exit {cc.returncode}', fails[:3], cfails[:2]
    except subprocess.TimeoutExpired:
        return name, 'NO VERDICT (drive hung)', [], []
    finally:
        srv.kill()
        srv.wait()
        subprocess.run(['git', 'worktree', 'remove', '--force', d], check=False)
        shutil.rmtree(os.path.dirname(d), ignore_errors=True)

print('| sabotage | verdict | first failing checks |\n|---|---|---|')
only = sys.argv[2:]  # optional sabotage-id prefixes, e.g. S14 S20
for i, (name, path, old, new, also) in enumerate(SABOTAGES):
    if only and not any(name.startswith(o + ' ') for o in only):
        continue
    n, v, f, c = run(name, path, old, new, also, PORT)
    tag = 'RED — ' if 'exit 1' in v else 'NULL — ' if 'exit 0, copy-check exit 0' in v else 'REFUSED/NO VERDICT — '
    print(f"| {n} | {tag}{v} | {' ; '.join(f + c)[:400]} |", flush=True)
