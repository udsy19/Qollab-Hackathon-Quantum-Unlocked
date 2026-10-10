"""Hardening sabotage round (gate-independence laws 2, 10, 15). Each mutation is applied to a
DISPOSABLE copy of echo/ (never the worktree); its needle must occur exactly once (else REFUSED);
then the full pytest suite and the independent derivation (derive.py, next to this file) run
against the copy. A mutation the suite does not turn red is reported as a NULL, never hidden.

usage: python sabotage.py <path/to/echo> [mutation-id ...]   -> markdown table on stdout
contracts.js: $ECHO_CONTRACTS_JS (the copy is not a git checkout); default /tmp/qh-contracts.js.
Exit: 0 table written (nulls are listed in it) · 2 could not run.
"""
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

PY = sys.executable
HERE = pathlib.Path(__file__).resolve().parent
T, E, C, F, J, O = ("quantum/teleportation.py", "quantum/entanglement.py", "quantum/cloning.py",
                    "quantum/__init__.py", "quantum/qollab_job.py", "quantum/formats.py")

# (id, what it breaks, file, needle, replacement). Physics-review ids are kept; their needles are
# re-targeted at the post-contract-conformance code (the review's needles no longer exist).
M = [
    # ---- physics-review mutations (evidence/physics-review/sabotage.py), re-targeted
    ("z-iff-m1", "rule: Z iff m1, X iff m0", T,
     'return {"applyX": m1 == 1, "applyZ": m0 == 1}', 'return {"applyX": m0 == 1, "applyZ": m1 == 1}'),
    ("live-commit-swapped", "live_commit alone applies the swapped rule", T,
     'b = _branch(gates, m0, m1, rule["applyX"], rule["applyZ"])', 'b = _branch(gates, m0, m1, rule["applyZ"], rule["applyX"])'),
    ("no-bell-cx", "Bell measurement drops CX(q0,q1)", T, "    qc.cx(1, 2)\n    qc.cx(0, 1)\n", "    qc.cx(1, 2)\n"),
    ("no-bellpair-h", "Bell pair prepared without H(q1)", T, "    qc.h(1)\n    qc.cx(1, 2)", "    qc.cx(1, 2)"),
    ("deferred-cz-wrong-control", "deferred CZ controlled by q1", T, "qc.cz(0, 2)", "qc.cz(1, 2)"),
    ("deferred-cx-wrong-control", "deferred CX controlled by q0", T, "qc.cx(1, 2)  # stands", "qc.cx(0, 2)  # stands"),
    ("correction-order-ZX", "Bob applies Z before X (global phase: true null)", T,
     "    if apply_x:\n        fix.x(0)\n    if apply_z:\n        fix.z(0)",
     "    if apply_z:\n        fix.z(0)\n    if apply_x:\n        fix.x(0)"),
    ("correction-as-Y", "X+Z replaced by Y (global phase: true null)", T,
     "    if apply_x:\n        fix.x(0)\n    if apply_z:\n        fix.z(0)",
     "    if apply_x and apply_z:\n        fix.y(0)\n    elif apply_x:\n        fix.x(0)\n    elif apply_z:\n        fix.z(0)"),
    ("sampler-hardcoded-uniform", "sampler ignores Qiskit, uses 1/4 (F5)", T,
     "        cumulative += probs[_key(m0, m1)]", "        cumulative += 0.25"),
    ("source-left-is-bob", "sourceFidelityAfterMeasurement reads Bob", T,
     "source_left = partial_trace(post, [1, 2])", "source_left = partial_trace(post, [0, 1])"),
    ("bob-bloch-uncorrected", "receiver Bloch reported BEFORE the correction (F1)", T,
     '"bob": bob,', '"bob": partial_trace(post, [0, 1]),'),
    ("bloch-y-sign", "bloch_vector flips <Y> (F1)", F,
     'return [float(rho.expectation_value(Pauli(p)).real) for p in "XYZ"]',
     'return [s * float(rho.expectation_value(Pauli(p)).real) for s, p in zip((1, -1, 1), "XYZ")]'),
    ("prep-order-rz-first", "generic states prepared RZ then RY", F,
     'return (("ry", theta), ("rz", phi))', 'return (("rz", phi), ("ry", theta))'),
    ("withheld-one-branch", "corrections_withheld reports branch 00, not the average", T,
     "    bob = partial_trace(state, [0, 1])\n    psi = target_state(gates)\n    fid",
     "    keep = (np.arange(8) & 3) == 0\n    bob = partial_trace(Statevector(state.data * keep * 2), [0, 1])\n    psi = target_state(gates)\n    fid"),
    ("clone-blank-is-plus", "blank copy starts in |+>", C, "    qc.cx(0, 1)\n", "    qc.h(1)\n    qc.cx(0, 1)\n"),
    ("clone-by-purity", "copy verdict from source purity (correct physics, other route: control)", C,
     "independent = joint_fid > 1 - TOL", "independent = source_purity > 1 - TOL"),
    ("clone-loose-threshold", "copy verdict threshold 0.4", C,
     "independent = joint_fid > 1 - TOL", "independent = joint_fid > 0.4"),
    ("clone-by-name-variant", "copy verdict from a name list incl. the tests' names (F6)", C,
     "independent = joint_fid > 1 - TOL", "independent = state_name in ('zero', 'one', 'test_basis', 'test_zero_alias')"),
    ("clone-by-name-prefix", "copy verdict from name patterns (F6, widened)", C,
     "independent = joint_fid > 1 - TOL", "independent = state_name in ('zero', 'one') or 'basis' in state_name or 'zero' in state_name"),
    ("relay-partial-bell", "relay pair is RY(pi/3), not H", E,
     "    qc.h(0)\n    qc.cx(0, 1)\n    if", "    qc.ry(1.0471975512, 0)\n    qc.cx(0, 1)\n    if"),
    ("relay-xagree-one-H", "X-basis comparison rotates only the sender", E, "hh.h([0, 1])", "hh.h(0)"),
    ("relay-sender-Z-on-receiver", "sender's Z on the receiver (true null: (Z⊗I)Φ+=(I⊗Z)Φ+)", E, "        qc.z(0)", "        qc.z(1)"),
    ("job-endianness", "count keys read leftmost char as clbit 0", J,
     "return tuple(int(key[-1 - clbit]) for clbit in range(NUM_QUBITS))", "return tuple(int(key[clbit]) for clbit in range(NUM_QUBITS))"),
    ("job-hand-built-dict", "interpret_counts bypasses the guarded builder (F7)", J,
     "    return experiment_result(\n        experiment=BACKEND_EXPERIMENT,",
     "    return dict(\n        experiment=BACKEND_EXPERIMENT,"),
    # ---- new: one per owner ruling (lanes/quantum/rulings.md)
    ("token-angles-in-parameters", "ruling 2: live_commit leaks the token's angles in parameters", T,
     "        parameters=_commit_parameters(seed),", "        parameters={**_commit_parameters(seed), 'theta': STATES[TOKEN][0][0][1]},"),
    ("token-bloch-in-observables", "ruling 2: live_commit reports the token's receiver Bloch vector", T,
     '        observables={"branchProbability": b["branchProbability"]},',
     '        observables={"branchProbability": b["branchProbability"], **_bloch("receiver", b["bob"])},'),
    ("token-accepted-for-calibration", "ruling 2: the token can be used as a dry-run state", F,
     "    if state == TOKEN and not story_token:", "    if False:"),
    ("token-label-shows-angles", "ruling 2: the token's catalogue label carries its angles", F,
     '"the story token (never shown)"', '"RY(1.9) then RZ(2.3) on |0>"'),
    ("second-commit-allowed", "ruling 8: a second live_commit in one run is allowed", T,
     "    if _token_consumed:\n", "    if False:\n"),
    ("consumed-on-error", "ruling 8: token marked consumed BEFORE the computation", T,
     "    global _token_consumed\n    if _token_consumed:",
     "    global _token_consumed\n    _was = _token_consumed\n    _token_consumed = True\n    if _was:"),
    ("reset-does-nothing", "ruling 8: reset_story_token() leaves the latch set", T,
     "    _token_consumed = False\n", "    pass\n"),
    ("calibration-not-generic", "ruling 1: the draw can return a near-axis point", T,
     "        if max(abs(x), abs(y), abs(z)) <= GENERIC_BLOCH_MAX - 1e-9:", "        if True:"),
    ("calibration-generic-check-off", "ruling 1: corrections call accepts non-generic angles", F,
     "    if max(abs(c) for c in r) > GENERIC_BLOCH_MAX:", "    if False:"),
    ("calibration-hidden-state", "ruling 1: corrections call ignores the passed angles (module state)", T,
     "    gates, _ = state_gates(state, theta, phi)\n    b = _branch(",
     "    gates, _ = state_gates(state, *((_LAST or (theta, phi)) if state == CALIBRATION else (theta, phi)))\n    b = _branch("),
    ("calibration-fixed-state", "ruling 1: every dry run uses the same calibration point", T,
     "        theta, phi = draw_calibration_angles(rng)", "        theta, phi = 1.137, 0.44"),
    ("m1-label-old", "ruling 5: m1 labelled 'local Bell-half readout' (old label)", T,
     'M1_LABEL = "LOCAL BELL-HALF READOUT m1"', 'M1_LABEL = "m1 (local Bell-half readout)"'),
    ("backend-experiment-old", "ruling 6: experiment value bell_verification", J,
     'BACKEND_EXPERIMENT = "backend_verification"', 'BACKEND_EXPERIMENT = "bell_verification"'),
    ("relay-exact-label-dropped", "ruling 7: relay receiver panel loses its EXACT label", E,
     "Receiver alone, EXACT", "Receiver alone"),
    ("relay-counts-for-receiver", "ruling 7: relay result carries sampled counts for the receiver", O,
     '    if counts is not None and engine == "exact_qiskit_local":\n        raise',
     '    if False:\n        raise'),
    ("fidelity-text-measured", "F4: fidelity text loses 'computed exactly'", T,
     "computed exactly by local Qiskit", "measured by the receiver"),
    ("source-fact-false-cause", "F3: basis source fact restores the false cause", T,
     "the readout was random (50/50) and happened to match", "it equals this basis state because it was already a known Z value; it happened to match"),
]
# relay-counts-for-receiver is a two-step mutation: the guard is dropped AND the relay adds counts.
EXTRA = {"relay-counts-for-receiver": (E, "        probabilities=marginal,\n",
                                        "        probabilities=marginal,\n        counts={'0': 128, '1': 128},\n")}


def apply(d, f, old, new):
    p = d / f
    txt = p.read_text()
    n = txt.count(old)
    if n != 1:
        return n
    p.write_text(txt.replace(old, new))
    return 1


def main():
    src = pathlib.Path(sys.argv[1]).resolve()
    only = set(sys.argv[2:])
    os.environ.setdefault("ECHO_CONTRACTS_JS", "/tmp/qh-contracts.js")
    if not pathlib.Path(os.environ["ECHO_CONTRACTS_JS"]).exists():
        print(f"no contracts.js at {os.environ['ECHO_CONTRACTS_JS']}", file=sys.stderr)
        sys.exit(2)
    rows = []
    for mid, what, f, old, new in M:
        if only and mid not in only:
            continue
        d = pathlib.Path(tempfile.mkdtemp(prefix=f"qh-{mid}-")) / "echo"
        shutil.copytree(src, d, ignore=shutil.ignore_patterns("__pycache__"))
        n = apply(d, f, old, new)
        if n == 1 and mid in EXTRA:
            n = apply(d, *EXTRA[mid])
        if n != 1:
            rows.append((mid, what, "-", "-", f"REFUSED (needle found {n}x)"))
            shutil.rmtree(d.parent)
            continue
        t = subprocess.run([PY, "-m", "pytest", str(d / "tests"), "-q", "-p", "no:cacheprovider", "-x", "--tb=no"],
                           capture_output=True, text=True, cwd="/tmp")
        tail = (t.stdout.strip().splitlines() or ["?"])[-1]
        dv = subprocess.run([PY, "-I", str(HERE / "derive.py"), str(d)], capture_output=True, text=True, cwd="/tmp")
        dtail = {0: "green", 1: "red"}.get(dv.returncode, f"error {dv.returncode}")
        verdict = "RED" if t.returncode == 1 else ("**NULL (green)**" if t.returncode == 0 else f"exit {t.returncode}")
        rows.append((mid, what, f"{t.returncode} `{tail}`", dtail, verdict))
        shutil.rmtree(d.parent)
    print("| mutation | breaks | pytest -x exit / tail | derive.py | suite verdict |")
    print("|---|---|---|---|---|")
    for r in rows:
        print("| `%s` | %s | %s | %s | %s |" % r)
    print(f"\n{len(rows)} mutations, {sum(r[4] == 'RED' for r in rows)} red, "
          f"{sum('NULL' in r[4] for r in rows)} null, {sum(r[4].startswith('REFUSED') for r in rows)} refused")


if __name__ == "__main__":
    main()
