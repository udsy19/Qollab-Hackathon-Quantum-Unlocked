"""Law-3 / law-15 sabotage round for the physics oracle.

Each sabotage copies physics_oracle.py and test_physics_oracle.py into a fresh temp dir,
applies exact string edits (each must match EXACTLY once, else the row is REFUSED — a
sabotage that silently did not apply would read as a pass), runs pytest on the copy, and
records the verdict. The files in this directory are never modified (law 10).

    python evidence/red-team/physics-oracle/sabotage.py   # writes out/sabotage_results.md
Exit 0 only if the control is green and every sabotage expected red went red.
"""
from __future__ import annotations

import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
LIB, TEST = "physics_oracle.py", "test_physics_oracle.py"
SCAN, SCAN_TEST = "backend_run_audit.py", "test_backend_run_audit.py"
COPIED = (LIB, TEST, SCAN, SCAN_TEST)

# (id, what it simulates, expect_red, [(file, old, new), ...])
SABOTAGES = [
    ("control", "no edit: the copy must be green", False, []),
    ("swap_xz_rule", "X iff m0, Z iff m1 (rule swapped)", True,
     [(LIB, "return (m1 == 1, m0 == 1)", "return (m0 == 1, m1 == 1)")]),
    ("swap_m0_m1_projection", "Qiskit path projects q1 as m0 and q0 as m1", True,
     [(LIB, "Operator(P[m0]), qargs=[0]).evolve(Operator(P[m1]), qargs=[1])",
       "Operator(P[m0]), qargs=[1]).evolve(Operator(P[m1]), qargs=[0])")]),
    ("swap_m0_m1_numpy", "tensor path reads Bob at [m1, m0]", True,
     [(LIB, "bob = t[m0, m1, :]", "bob = t[m1, m0, :]")]),
    ("reverse_bitstring", "counts key read left-to-right", True,
     [(LIB, "int(flat[-1 - m0_clbit]), int(flat[-1 - m1_clbit])", "int(flat[m0_clbit]), int(flat[m1_clbit])")]),
    ("drop_z_correction", "Z correction never applied", True,
     [(LIB, "    if apply_z:\n        qc.z(0)", "    if apply_z:\n        pass")]),
    ("drop_x_correction", "X correction never applied", True,
     [(LIB, "    if apply_x:\n        qc.x(0)", "    if apply_x:\n        pass")]),
    ("no_bell_pair", "teleport without the entangling CX(q1,q2)", True,
     [(LIB, "    qc.u(theta, phi, 0, 0)\n    qc.h(1)\n    qc.cx(1, 2)", "    qc.u(theta, phi, 0, 0)\n    qc.h(1)")]),
    ("endianness_convention", "tensor->Qiskit index uses big-endian", True,
     [(LIB, "sum(b << k for k, b in enumerate(bits))", "sum(b << (t.ndim - 1 - k) for k, b in enumerate(bits))")]),
    ("cnot_cloner_removed", "naive cloner does nothing", True,
     [(LIB, "    qc.u(theta, phi, 0, 0)\n    qc.cx(0, 1)\n    return Statevector", "    qc.u(theta, phi, 0, 0)\n    return Statevector")]),
    ("bh_cloner_overclaims", "Bužek-Hillery amplitude 2/3 -> 3/4 (a 'better' cloner)", True,
     [(LIB, "a, b = math.sqrt(2 / 3), math.sqrt(1 / 6)", "a, b = math.sqrt(3 / 4), math.sqrt(1 / 6)")]),
    ("selective_measurement_leak", "Bob is told one outcome (signalling leak)", True,
     [(LIB, "    for pk in basis:\n        op = Operator(pk)", "    for pk in basis[:1]:\n        op = Operator(pk)")]),
    ("alice_gate_lands_on_bob", "Alice's named gate acts on Bob's qubit", True,
     [(LIB, "return rho.evolve(Operator(GATES[action]), qargs=[alice_qargs[0]])",
       "return rho.evolve(Operator(GATES[action]), qargs=[rho.num_qubits - 1])")]),
    ("textbook_table_swapped", "enabling step: the test's own hand table swaps (0,1)/(1,0)", True,
     [(TEST, "(0, 1): (True, False), (1, 0): (False, True)", "(0, 1): (False, True), (1, 0): (True, False)")]),
    ("swap_xz_plus_loose_tolerance", "rule swapped AND test tolerance loosened 1e-12 -> 1.0", True,
     [(LIB, "return (m1 == 1, m0 == 1)", "return (m0 == 1, m1 == 1)"),
      (TEST, "EXACT = 1e-12", "EXACT = 1.0")]),
    ("z_basis_suite_drop_z", "Z dropped AND every input state replaced by |0>/|1> only", True,
     [(LIB, "    if apply_z:\n        qc.z(0)", "    if apply_z:\n        pass"),
      (TEST, "STATES = po.random_states(50) + po.named_states()", "STATES = po.named_states()[:2]"),
      (LIB, "    rng = np.random.default_rng(seed)\n    return [", "    return po_basis_only(n)\n    rng = np.random.default_rng(seed)\n    return ["),
      (LIB, "def random_states(", "def po_basis_only(n):\n    return [(f'b{k}', math.pi * (k % 2), 0.0) for k in range(n)]\n\n\ndef random_states(")]),
    ("scanner_misses_aliases", "backend_run_audit: alias `b = backend; b.run()` not tracked", True,
     [(SCAN, "            for m in ALIAS.finditer(ln):\n                names.add(m.group(1))\n", "")]),
    ("scanner_counts_comments", "backend_run_audit: commented-out calls counted as live", True,
     [(SCAN, "(comments if _is_comment(ln) else sites).append", "sites.append")]),
    ("scanner_misses_member_calls", "backend_run_audit: `this.backend.run` / `selectedBackend.run` missed", True,
     [(SCAN, r'DIRECT = re.compile(r"""\b\w*backend\w*\s*', r'DIRECT = re.compile(r"""\bbackend\s*')]),
    ("counting_backend_allows_two", "CountingBackend lets a second job through", True,
     [(SCAN, "if len(self.calls) > 1:", "if len(self.calls) > 2:")]),
]


def run_one(sid, edits) -> tuple[str, int, str]:
    with tempfile.TemporaryDirectory(prefix=f"oracle-sab-{sid}-") as tmp:
        tmpd = pathlib.Path(tmp)
        for f in COPIED:
            shutil.copy(HERE / f, tmpd / f)
        for f, old, new in edits:
            text = (tmpd / f).read_text()
            n = text.count(old)
            if n != 1:
                return "REFUSED", 2, f"edit matched {n} times in {f}: {old[:50]!r}"
            (tmpd / f).write_text(text.replace(old, new))
        env = dict(os.environ, PHYSICS_ORACLE_OUT=str(tmpd / "out"))
        proc = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", str(tmpd)],
                              capture_output=True, text=True, env=env, cwd=tmpd, timeout=300)
        tail = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else proc.stderr[-200:]
        failed = sorted(set(re.findall(r"FAILED \S+::(\w+)", proc.stdout)))
        return ("RED" if proc.returncode else "GREEN"), proc.returncode, tail + (" | " + ", ".join(failed[:6]) if failed else "")


def main() -> int:
    rows, bad = [], 0
    for sid, what, expect_red, edits in SABOTAGES:
        verdict, code, detail = run_one(sid, edits)
        ok = verdict == ("RED" if expect_red else "GREEN")
        bad += not ok
        rows.append(f"| `{sid}` | {what} | {'red' if expect_red else 'green'} | **{verdict}** (exit {code}) | "
                    f"{'as expected' if ok else 'NULL — did not go as expected'} | {detail} |")
    table = ("| sabotage | simulates | expected | verdict | | pytest tail · failing tests |\n|---|---|---|---|---|---|\n"
             + "\n".join(rows))
    out = HERE / "out"
    out.mkdir(exist_ok=True)
    (out / "sabotage_results.md").write_text(table + "\n")
    print(table)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
