"""Sabotage round for echo/quantum (gate-independence laws 2, 10, 15).

Each mutation is applied to a DISPOSABLE copy of echo/ in a temp dir — the real tree is never touched.
The suite is run against the copy and its exit code recorded. A mutation whose exit code is 0 is a NULL:
the tests could not see that break. Writes evidence/quantum-core/sabotage.md.

Run: .venv/bin/python evidence/quantum-core/sabotage_round.py
"""
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
ECHO = ROOT / "echo"
OUT = pathlib.Path(__file__).resolve().parent / "sabotage.md"

# (id, file, old, new, what it breaks)
MUTATIONS = [
    ("rule-swap-xz", "quantum/teleportation.py",
     'return {"applyX": m1 == 1, "applyZ": m0 == 1}', 'return {"applyX": m0 == 1, "applyZ": m1 == 1}',
     "X/Z <-> m0/m1 mapping swapped in the correction rule"),
    ("bit-label-swap", "quantum/teleportation.py",
     "keep = ((index & 1) == m0) & (((index >> 1) & 1) == m1)", "keep = ((index & 1) == m1) & (((index >> 1) & 1) == m0)",
     "m0/m1 swapped when projecting the Bell measurement"),
    ("no-bell-H", "quantum/teleportation.py",
     "    qc.cx(0, 1)\n    qc.h(0)\n", "    qc.cx(0, 1)\n",
     "H(q0) removed from the Bell measurement"),
    ("trace-wrong-qubit-branch", "quantum/teleportation.py",
     "bob = partial_trace(post, [0, 1])", "bob = partial_trace(post, [0, 2])",
     "branch model keeps Alice's half instead of Bob"),
    ("trace-wrong-qubit-withheld", "quantum/teleportation.py",
     "    bob = partial_trace(state, [0, 1])\n    psi", "    bob = partial_trace(state, [1, 2])\n    psi",
     "corrections-withheld keeps the source instead of Bob"),
    ("trace-wrong-qubit-deferred", "quantum/teleportation.py",
     "bob = partial_trace(Statevector.from_instruction(qc), [0, 1])", "bob = partial_trace(Statevector.from_instruction(qc), [1, 2])",
     "deferred check keeps the source instead of Bob"),
    ("hardcoded-fidelity-branch", "quantum/teleportation.py",
     '"fidelity": float(state_fidelity(bob, psi)),', '"fidelity": 1.0,',
     "branch model returns fidelity 1.0 regardless"),
    ("hardcoded-fidelity-deferred", "quantum/teleportation.py",
     "fid = float(state_fidelity(bob, target_state(state_name)))", "fid = 1.0",
     "deferred check returns fidelity 1.0 regardless"),
    ("deferred-no-cz", "quantum/teleportation.py",
     "        qc.cz(0, 2)  #", "        pass  #",
     "deferred check drops the coherent Z correction"),
    ("sampler-order-swap", "quantum/teleportation.py",
     "BRANCHES = ((0, 0), (0, 1), (1, 0), (1, 1))", "BRANCHES = ((0, 0), (1, 0), (0, 1), (1, 1))",
     "sampler walks branches in a different order than labelled"),
    ("trace-wrong-qubit-cloning", "quantum/cloning.py",
     "copy = partial_trace(joint, [0])", "copy = partial_trace(joint, [1])",
     "cloning reports the source twice instead of source and copy"),
    ("clone-by-name", "quantum/cloning.py",
     "independent = joint_fid > 1 - TOL", 'independent = state_name in ("zero", "one")',
     "isTwoIndependentCopies looked up by name (the §10.3 trap)"),
    ("clone-no-cx", "quantum/cloning.py",
     "    qc.cx(0, 1)\n    joint", "    joint",
     "duplicator CNOT removed"),
    ("trace-wrong-qubit-receiver", "quantum/entanglement.py",
     "receiver = partial_trace(state, [0])", "receiver = partial_trace(state, [1])",
     "relay reports the sender's marginal instead of the receiver's"),
    ("sender-gate-on-receiver", "quantum/entanglement.py",
     "        qc.x(0)\n", "        qc.x(1)\n",
     "sender's X applied to the receiver's qubit"),
    ("formats-allow-complex", "quantum/formats.py",
     'raise TypeError(f"{path}: {type(value).__name__} is not JSON-safe")', "return value",
     "builder lets complex/objects through"),
    ("formats-allow-counts-exact", "quantum/formats.py",
     'raise ValueError("exact_qiskit_local results carry probabilities, not counts")', "pass",
     "exact results may carry shot counts"),
    ("formats-no-phrase-guard", "quantum/formats.py",
     'raise ValueError(f"{path}: forbidden claim {phrase!r}")', "pass",
     "forbidden-claim guard removed"),
    ("formats-no-rounding-plain", "quantum/formats.py",
     "        return int(value)\n", "        return value\n",
     "numpy ints leak through unconverted"),
]


def run(mid, rel, old, new):
    with tempfile.TemporaryDirectory() as tmp:
        copy = pathlib.Path(tmp) / "echo"
        shutil.copytree(ECHO, copy, ignore=shutil.ignore_patterns("__pycache__", ".pytest_cache"))
        target = copy / rel
        src = target.read_text()
        n = src.count(old)
        if n != 1:
            return 2, f"REFUSED: anchor found {n} times"
        target.write_text(src.replace(old, new))
        p = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", str(copy / "tests")],
                           capture_output=True, text=True, timeout=600)
        tail = p.stdout.strip().splitlines()[-1] if p.stdout.strip() else p.stderr.strip()[-200:]
        return p.returncode, tail


def main():
    base = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", str(ECHO / "tests")],
                          capture_output=True, text=True)
    if base.returncode != 0:
        print("REFUSED: the unmutated suite is not green; a sabotage round against it measures nothing")
        print(base.stdout[-2000:])
        return 2
    lines = ["# Sabotage round — echo/quantum", "",
             f"Produced by `evidence/quantum-core/sabotage_round.py` (python {sys.version.split()[0]}).",
             f"Unmutated suite: exit {base.returncode} — `{base.stdout.strip().splitlines()[-1]}`", "",
             "| mutation | breaks | pytest exit | verdict | summary |", "|---|---|---|---|---|"]
    nulls = 0
    for mid, rel, old, new, what in MUTATIONS:
        code, tail = run(mid, rel, old, new)
        verdict = "RED (caught)" if code == 1 else ("**NULL — stayed green**" if code == 0 else "REFUSED")
        nulls += code == 0
        lines.append(f"| `{mid}` | {what} | {code} | {verdict} | {re.sub(r'[|]', '/', tail)} |")
        print(mid, code, tail)
    lines += ["", f"{len(MUTATIONS)} mutations, {nulls} null(s)."]
    OUT.write_text("\n".join(lines) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
