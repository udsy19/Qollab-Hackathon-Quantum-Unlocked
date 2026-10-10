"""Prints what each terminal would receive from the quantum engine, plus the full teleportation
fidelity table. Writes evidence/quantum-core/transcript.txt.

Run: .venv/bin/python evidence/quantum-core/transcript.py
"""
import io
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "echo"))

import qiskit  # noqa: E402

from quantum import STATES, cloning, entanglement, teleportation  # noqa: E402

OUT = pathlib.Path(__file__).resolve().parent / "transcript.txt"
buf = io.StringIO()


def show(title, result):
    buf.write(f"\n=== {title} ===\n")
    buf.write(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n")


buf.write(f"ECHO quantum engine transcript — python {sys.version.split()[0]}, qiskit {qiskit.__version__}\n")
buf.write("Every value below was computed by local Qiskit (Statevector / partial_trace / state_fidelity).\n")

for s in ("zero", "plus", "phase", "bloch_a"):
    show(f"MISSION 1 booth: cloning.run_calibration({s!r})", cloning.run_calibration(s))
for g in ("I", "X", "Z"):
    show(f"MISSION 2 relay: entanglement.bell_signalling({g!r})", entanglement.bell_signalling(g))

show("MISSION 3 dry run step 1: teleportation.bell_measurement('bloch_a', seed=11)",
     teleportation.bell_measurement("bloch_a", seed=11))
for ax, az in ((False, False), (True, False), (False, True), (True, True)):
    show(f"MISSION 3 dry run step 2: teleportation.teleport_branch('bloch_a', m0=1, m1=0, apply_x={ax}, apply_z={az})",
         teleportation.teleport_branch("bloch_a", 1, 0, ax, az))
show("MISSION 3 Declassified: teleportation.corrections_withheld('bloch_a')", teleportation.corrections_withheld("bloch_a"))
show("MISSION 3 Declassified: teleportation.verify_deferred('bloch_a')", teleportation.verify_deferred("bloch_a"))
show("MISSION 3 Declassified: teleportation.verify_deferred('bloch_a', controlled_z=False)",
     teleportation.verify_deferred("bloch_a", controlled_z=False))
show("MISSION 3 commit: teleportation.live_commit('bloch_b', seed=2026)", teleportation.live_commit("bloch_b", seed=2026))

buf.write("\n=== Teleportation branch model: fidelity for every state x branch (m0,m1) x choice (X,Z) ===\n")
buf.write("rule: X iff m1=1, Z iff m0=1; '*' marks the rule's choice\n")
choices = [(False, False), (True, False), (False, True), (True, True)]
header = "state     m0m1 | " + " | ".join(f"{'X' if x else '-'}{'Z' if z else '-'}" for x, z in choices)
buf.write(header + "\n")
for s in STATES:
    for m0 in (0, 1):
        for m1 in (0, 1):
            cells = []
            for x, z in choices:
                f = teleportation.teleport_branch(s, m0, m1, x, z)["fidelity"]
                mark = "*" if (x == (m1 == 1) and z == (m0 == 1)) else " "
                cells.append(f"{f:.6f}{mark}")
            buf.write(f"{s:<9} {m0} {m1}  | " + " | ".join(cells) + "\n")

OUT.write_text(buf.getvalue())
print(buf.getvalue())
