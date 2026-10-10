"""Physics-review sabotage round. Each mutation is applied to a fresh copy of echo/ (never the
worktree), the needle must occur exactly once (else REFUSED), then pytest and the independent
derive.py are run against the copy."""
import shutil, subprocess, sys, tempfile, pathlib
PY = "/Users/udsy/PycharmProjects/Qollab-Hackathon-Quantum-Unlocked/.venv/bin/python"
SRC = pathlib.Path(sys.argv[1])  # echo/
T, E, C, F = "quantum/teleportation.py", "quantum/entanglement.py", "quantum/cloning.py", "quantum/__init__.py"
J = "quantum/qollab_job.py"
M = [
 ("z-iff-m1", "rule: Z iff m1, X iff m0 everywhere (expected_corrections)", T,
  'return {"applyX": m1 == 1, "applyZ": m0 == 1}', 'return {"applyX": m0 == 1, "applyZ": m1 == 1}'),
 ("live-commit-swapped", "live_commit alone applies the swapped rule", T,
  'b = _branch(state_name, m0, m1, rule["applyX"], rule["applyZ"])', 'b = _branch(state_name, m0, m1, rule["applyZ"], rule["applyX"])'),
 ("no-bell-cx", "Bell measurement drops CX(q0,q1)", T,
  "    qc.cx(1, 2)\n    qc.cx(0, 1)\n", "    qc.cx(1, 2)\n"),
 ("no-bellpair-h", "Bell pair prepared without H(q1)", T,
  "    qc.h(1)\n    qc.cx(1, 2)", "    qc.cx(1, 2)"),
 ("deferred-cz-wrong-control", "deferred CZ controlled by q1 instead of q0", T,
  "qc.cz(0, 2)", "qc.cz(1, 2)"),
 ("deferred-cx-wrong-control", "deferred CX controlled by q0 instead of q1", T,
  "qc.cx(1, 2)  # stands", "qc.cx(0, 2)  # stands"),
 ("correction-order-ZX", "Bob applies Z before X", T,
  "    if apply_x:\n        fix.x(0)\n    if apply_z:\n        fix.z(0)",
  "    if apply_z:\n        fix.z(0)\n    if apply_x:\n        fix.x(0)"),
 ("correction-as-Y", "X+Z correction replaced by a single Y", T,
  "    if apply_x:\n        fix.x(0)\n    if apply_z:\n        fix.z(0)",
  "    if apply_x and apply_z:\n        fix.y(0)\n    elif apply_x:\n        fix.x(0)\n    elif apply_z:\n        fix.z(0)"),
 ("branch-prob-index-swap", "branch probability keys read m1 + 2*m0", T,
  "float(p[m0 + 2 * m1])", "float(p[m1 + 2 * m0])"),
 ("sampler-hardcoded-uniform", "sampler ignores Qiskit, uses hardcoded 1/4 (the 'scripted random' trap)", T,
  '        cumulative += probs[f"m0={m0},m1={m1}"]', "        cumulative += 0.25"),
 ("source-left-is-bob", "sourceFidelityAfterMeasurement reads Bob instead of q0", T,
  "source_left = partial_trace(post, [1, 2])", "source_left = partial_trace(post, [0, 1])"),
 ("bob-bloch-uncorrected", "branch model reports Bob's Bloch vector BEFORE the correction", T,
  '"bobBlochVector": bloch_vector(bob),', '"bobBlochVector": bloch_vector(partial_trace(post, [0, 1])),'),
 ("bloch-y-sign", "bloch_vector flips <Y> (a conjugation bug)", F,
  'return [float(rho.expectation_value(Pauli(p)).real) for p in "XYZ"]',
  'return [s * float(rho.expectation_value(Pauli(p)).real) for s, p in zip((1, -1, 1), "XYZ")]'),
 ("prep-order-rz-first", "generic states prepared RZ then RY (vision §10.5 says RY then RZ)", F,
  '"bloch_a": ((("ry", 1.137), ("rz", 0.44))', '"bloch_a": ((("rz", 0.44), ("ry", 1.137))'),
 ("withheld-one-branch", "corrections_withheld reports branch m0=0,m1=0 instead of the average", T,
  "    bob = partial_trace(state, [0, 1])\n    psi = target_state(state_name)\n    fid",
  "    keep = (np.arange(8) & 3) == 0\n    bob = partial_trace(Statevector(state.data * keep * 2), [0, 1])\n    psi = target_state(state_name)\n    fid"),
 ("clone-blank-is-plus", "booth's blank copy qubit starts in |+>, not |0>", C,
  "    qc.cx(0, 1)\n", "    qc.h(1)\n    qc.cx(0, 1)\n"),
 ("clone-by-purity", "copy verdict from source purity (correct physics, different derivation)", C,
  "independent = joint_fid > 1 - TOL", "independent = source_purity > 1 - TOL"),
 ("clone-loose-threshold", "copy verdict threshold 0.4 instead of 1-1e-9", C,
  "independent = joint_fid > 1 - TOL", "independent = joint_fid > 0.4"),
 ("clone-by-name-variant", "copy verdict: name in a hard list incl. the review's own names", C,
  "independent = joint_fid > 1 - TOL", "independent = state_name in ('zero', 'one', 'test_basis', 'test_zero_alias')"),
 ("clone-amp-key-swap", "amplitude keys swap source/copy", C,
  'key = f"source={index & 1},copy={(index >> 1) & 1}"', 'key = f"source={(index >> 1) & 1},copy={index & 1}"'),
 ("relay-partial-bell", "relay pair is RY(pi/3) not H: not maximally entangled", E,
  "    qc.h(0)\n    qc.cx(0, 1)\n    if", "    qc.ry(1.0471975512, 0)\n    qc.cx(0, 1)\n    if"),
 ("relay-xagree-one-H", "X-basis comparison rotates only the sender", E,
  "hh.h([0, 1])", "hh.h(0)"),
 ("relay-label-swap", "joint probability keys swap sender/receiver", E,
  'probs[f"sender={index & 1},receiver={(index >> 1) & 1}"] = p', 'probs[f"sender={(index >> 1) & 1},receiver={index & 1}"] = p'),
 ("relay-sender-Z-on-receiver", "sender's Z applied to the receiver's qubit", E,
  "        qc.z(0)", "        qc.z(1)"),
 ("job-endianness", "count keys read leftmost char as clbit 0", J,
  "return tuple(int(key[-1 - clbit]) for clbit in range(NUM_QUBITS))", "return tuple(int(key[clbit]) for clbit in range(NUM_QUBITS))"),
]
only = sys.argv[2:] or None
rows = []
for mid, what, f, old, new in M:
    if only and mid not in only: continue
    d = pathlib.Path(tempfile.mkdtemp(prefix=f"sab-{mid}-")) / "echo"
    shutil.copytree(SRC, d)
    p = d / f; txt = p.read_text()
    n = txt.count(old)
    if n != 1:
        rows.append((mid, what, "-", "-", f"REFUSED (needle found {n}x)")); continue
    p.write_text(txt.replace(old, new))
    t = subprocess.run([PY, "-m", "pytest", str(d / "tests"), "-q", "-p", "no:cacheprovider"], capture_output=True, text=True, cwd="/tmp")
    tail = (t.stdout.strip().splitlines() or ["?"])[-1]
    dv = subprocess.run([PY, "-I", "/tmp/pr-scratch/derive.py", str(d)], capture_output=True, text=True, cwd="/tmp")
    dtail = "red" if dv.returncode else "green"
    if dv.returncode not in (0, 1): dtail = f"error {dv.returncode}: " + (dv.stderr.strip().splitlines() or ["?"])[-1][:80]
    verdict = "RED" if t.returncode == 1 else ("NULL (green)" if t.returncode == 0 else f"exit {t.returncode}")
    rows.append((mid, what, f"{t.returncode} `{tail}`", dtail, verdict))
    shutil.rmtree(d.parent)
print("| mutation | breaks | pytest exit / tail | review derive.py | suite verdict |")
print("|---|---|---|---|---|")
for r in rows: print("| `%s` | %s | %s | %s | %s |" % r)
