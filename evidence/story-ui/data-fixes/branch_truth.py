"""Independent ground truth for ECHO's teleportation failure lines (lane story-ui, local tooling only).

For every Bell-measurement outcome (m0, m1) and every receiver plan (X on/off, Z on/off), run the
real teleportation protocol on a generic state in Qiskit, project onto the outcome, apply the plan
to the receiver and report what the receiver actually holds. Nothing here reads echo/data.

    python branch_truth.py            -> JSON on stdout (consumed by story-data/check.mjs)
    python branch_truth.py --markdown -> the 16-case table

Qubits: q0 = source, q1 = local Bell half, q2 = receiver half. m0 = source readout (q0),
m1 = local Bell-half readout (q1). The plan applies X first, then Z, to q2.
"""
import json
import sys

import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, DensityMatrix, partial_trace, state_fidelity

THETA, PHI = 1.137, 0.44  # owner ruling 2026-10-10: generic state ry(1.137) then rz(0.44)

prep = QuantumCircuit(1)
prep.ry(THETA, 0)
prep.rz(PHI, 0)
psi = Statevector(prep)

PAULI = {"I": np.eye(2), "X": np.array([[0, 1], [1, 0]]), "Z": np.diag([1, -1])}
PAULI["XZ"] = PAULI["X"] @ PAULI["Z"]  # bit flip and phase flip together (Y up to a phase)


def receiver_before_plan(m0, m1):
    qc = QuantumCircuit(3)
    qc.ry(THETA, 0)
    qc.rz(PHI, 0)
    qc.h(1)
    qc.cx(1, 2)
    qc.cx(0, 1)
    qc.h(0)
    sv = Statevector(qc).data.copy()
    # Project onto q0 = m0, q1 = m1 (little-endian index: bit k is qubit k).
    for i in range(8):
        if (i & 1) != m0 or ((i >> 1) & 1) != m1:
            sv[i] = 0
    prob = float(np.vdot(sv, sv).real)
    out = Statevector(sv / np.sqrt(prob))
    return out, prob


rows = []
for m0 in (0, 1):
    for m1 in (0, 1):
        before, prob = receiver_before_plan(m0, m1)
        for x in (0, 1):
            for z in (0, 1):
                plan = QuantumCircuit(3)
                if x:
                    plan.x(2)
                if z:
                    plan.z(2)
                rho = partial_trace(DensityMatrix(before.evolve(plan)), [0, 1])
                fid = {p: float(state_fidelity(rho, Statevector(m @ psi.data))) for p, m in PAULI.items()}
                held = [p for p, f in fid.items() if f > 1 - 1e-9]
                if len(held) != 1:
                    raise SystemExit(f"generic-state assumption broken at {(m0, m1, x, z)}: {fid}")
                residual = held[0]
                rows.append({
                    "m0": m0, "m1": m1, "x": x, "z": z, "prob": round(prob, 12),
                    "fidelity": round(fid["I"], 6),
                    "residual": residual,  # receiver holds residual·psi
                    "bitFlipLeft": "X" in residual,
                    "phaseFlipLeft": "Z" in residual,
                })

if "--markdown" in sys.argv:
    print(f"Generic state: ry({THETA}) then rz({PHI}). Local Qiskit statevector, outcome projected exactly.\n")
    print("| m0 m1 | plan X Z | P(outcome) | receiver holds | fidelity with test state |")
    print("|---|---|---|---|---|")
    for r in rows:
        held = {"I": "the test state", "X": "X·state (bit-flipped)", "Z": "Z·state (phase-flipped)",
                "XZ": "XZ·state (bit- and phase-flipped)"}[r["residual"]]
        print(f"| {r['m0']} {r['m1']} | {'on ' if r['x'] else 'off'} {'on ' if r['z'] else 'off'} | {r['prob']:.3f} | {held} | {r['fidelity']:.4f} |")
else:
    json.dump({"theta": THETA, "phi": PHI, "rows": rows}, sys.stdout)
