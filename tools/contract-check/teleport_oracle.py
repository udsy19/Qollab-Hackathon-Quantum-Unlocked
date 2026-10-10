#!/usr/bin/env python3
"""tools/contract-check/teleport_oracle.py — the Qiskit ground truth for the two-phase teleport dry run.

    python3 tools/contract-check/teleport_oracle.py           # assert the physics, (re)write teleport-fixtures.json
    python3 tools/contract-check/teleport_oracle.py --check   # assert, and exit 1 if the committed file differs

Independent of echo/contracts.js: nothing here imports or reads it. For each test state and every
(m0, m1, applyX, applyZ) — 16 combinations — it projects the Bell measurement onto (m0, m1), traces
Bob's qubit out with partial_trace, applies the player's X then Z, and compares with the source
using state_fidelity. It asserts that fidelity is 1 exactly on the rule of vision §7.1 and visibly
below 1 on every other choice, then writes the rows check.mjs grades the contract against.

Registers (§7.1): q0 = source, q1 = Alice's local Bell half, q2 = Bob. m0 = source readout (q0),
m1 = local Bell-half readout (q1).
"""
import json
import math
import pathlib
import random
import sys

import numpy as np
import qiskit
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity

OUT = pathlib.Path(__file__).resolve().parent / "teleport-fixtures.json"
PASS = 0.999999            # §7.4: ideal validation threshold
GENERIC_MAX_WRONG = 0.9    # a wrong choice must score at most this on a dry-run state (visible failure)
TEST_STATE = (1.137, 0.44)  # §10.5 / owner: ry(1.137) then rz(0.44), circuit order
PROTOCOL = "q0 = source, q1 = local Bell half, q2 = receiver; H(q1); CX(q1,q2); CX(q0,q1); H(q0); measure q0 -> m0, q1 -> m1"


def source(theta, phi):
    qc = QuantumCircuit(1)
    qc.ry(theta, 0)
    qc.rz(phi, 0)
    return Statevector.from_instruction(qc)


def protocol(theta, phi):
    qc = QuantumCircuit(3)
    qc.ry(theta, 0)
    qc.rz(phi, 0)
    qc.h(1)
    qc.cx(1, 2)
    qc.cx(0, 1)
    qc.h(0)
    return Statevector.from_instruction(qc)


def branch_probabilities(state):
    # probabilities([0, 1]) is indexed m0 + 2*m1; keyed "m1m0" so keyQubits = [1, 0] (Qiskit order).
    p = state.probabilities([0, 1])
    return {f"{m1}{m0}": float(p[m0 + 2 * m1]) for m1 in (0, 1) for m0 in (0, 1)}


def fidelity(theta, phi, m0, m1, apply_x, apply_z):
    state = protocol(theta, phi)
    idx = np.arange(8)
    keep = ((idx & 1) == m0) & (((idx >> 1) & 1) == m1)
    projected = state.data * keep
    prob = float(np.sum(np.abs(projected) ** 2))
    bob = partial_trace(Statevector(projected / math.sqrt(prob)), [0, 1])
    fix = QuantumCircuit(1)
    if apply_x:
        fix.x(0)
    if apply_z:
        fix.z(0)
    return float(state_fidelity(bob.evolve(fix), source(theta, phi))), prob


def rows_for(theta, phi):
    rows = []
    for m0 in (0, 1):
        for m1 in (0, 1):
            for ax in (False, True):
                for az in (False, True):
                    f, prob = fidelity(theta, phi, m0, m1, ax, az)
                    rows.append({"m0": m0, "m1": m1, "applyX": ax, "applyZ": az, "fidelity": round(f, 12),
                                 "branchProbability": round(prob, 12)})
    return rows


def generic(theta, phi):
    """Generic = every one of the 12 wrong choices visibly fails, judged by Qiskit fidelities."""
    wrong = [r["fidelity"] for r in rows_for(theta, phi) if r["fidelity"] < PASS]
    return len(wrong) == 12 and max(wrong) <= GENERIC_MAX_WRONG


def bits_result(theta, phi, rng):
    probs = branch_probabilities(protocol(theta, phi))
    u, acc = rng.random(), 0.0
    for key, p in probs.items():
        acc += p
        if u < acc:
            break
    m1, m0 = int(key[0]), int(key[1])
    return {
        "experiment": "teleportation",
        "engine": "exact_qiskit_local",
        "circuitDescription": f"ry({theta:.6f}) then rz({phi:.6f}) on q0; {PROTOCOL}",
        "qubits": 3,
        "parameters": {"theta": theta, "phi": phi},
        "probabilities": {k: round(v, 12) for k, v in probs.items()},
        "keyQubits": [1, 0],
        "measurementBits": {"m0": m0, "m1": m1},
        "facts": [f"SOURCE READOUT m0 = {m0}. LOCAL BELL-HALF READOUT m1 = {m1}.",
                  "One sample drawn from the exact Qiskit branch probabilities; one sample proves nothing on its own."],
    }


def correction_result(theta, phi, m0, m1, ax, az):
    f, _ = fidelity(theta, phi, m0, m1, ax, az)
    fix = " then ".join(g for g, on in (("X", ax), ("Z", az)) if on) or "no correction"
    return {
        "experiment": "teleportation",
        "engine": "exact_qiskit_local",
        "circuitDescription": f"ry({theta:.6f}) then rz({phi:.6f}) on q0; {PROTOCOL}; project onto m0={m0}, m1={m1}; receiver applies {fix}",
        "qubits": 3,
        "parameters": {"theta": theta, "phi": phi, "applyX": ax, "applyZ": az},
        "measurementBits": {"m0": m0, "m1": m1},
        "fidelity": round(f, 12),
        "facts": [f"Receiver test fidelity {f:.6f}."],
    }


def main():
    failures = []
    rng = random.Random(20261010)
    states = [{"name": "test state ry(1.137) rz(0.44)", "theta": TEST_STATE[0], "phi": TEST_STATE[1]}]
    while len(states) < 4:  # fresh random generic states, as the dry run uses (owner ruling 7)
        theta, phi = round(rng.uniform(0, math.pi), 6), round(rng.uniform(-math.pi, math.pi), 6)
        if generic(theta, phi):
            states.append({"name": f"random generic #{len(states)}", "theta": theta, "phi": phi})

    for s in states:
        s["rows"] = rows_for(s["theta"], s["phi"])
        for r in s["rows"]:
            rule = r["applyX"] == (r["m1"] == 1) and r["applyZ"] == (r["m0"] == 1)  # §7.1, typed from the text
            ok = r["fidelity"] >= PASS
            if ok != rule:
                failures.append(f"{s['name']}: m0={r['m0']} m1={r['m1']} X={r['applyX']} Z={r['applyZ']} F={r['fidelity']}")
            if abs(r["branchProbability"] - 0.25) > 1e-9:
                failures.append(f"{s['name']}: branch ({r['m0']},{r['m1']}) has probability {r['branchProbability']}, not 1/4")
        passes = sum(r["fidelity"] >= PASS for r in s["rows"])
        worst_wrong = max(r["fidelity"] for r in s["rows"] if r["fidelity"] < PASS)
        print(f"{s['name']:32} theta={s['theta']:.6f} phi={s['phi']:+.6f}  F=1 on {passes}/16  max wrong F={worst_wrong:.6f}")

    # The worked example in CONTRACTS.md: phase 1 on the test state, then all four choices on its bits.
    t, p = TEST_STATE
    phase1 = bits_result(t, p, random.Random(7))
    b = phase1["measurementBits"]
    example = {
        "bitsRequest": {"theta": t, "phi": p},
        "bitsResult": phase1,
        "corrections": [
            {"request": {"theta": t, "phi": p, "m0": b["m0"], "m1": b["m1"], "applyX": ax, "applyZ": az},
             "result": correction_result(t, p, b["m0"], b["m1"], ax, az)}
            for ax in (False, True) for az in (False, True)
        ],
    }

    if failures:
        print("\n".join(f"  FAIL  {f}" for f in failures))
        print(f"teleport-oracle: RED — {len(failures)} failure(s)")
        sys.exit(1)

    doc = {"_comment": "Written by tools/contract-check/teleport_oracle.py (Qiskit). Do not edit by hand.",
           "qiskit": qiskit.__version__, "pass": PASS, "genericMaxWrong": GENERIC_MAX_WRONG,
           "states": states, "example": example}
    text = json.dumps(doc, indent=1) + "\n"
    if "--check" in sys.argv:
        same = OUT.exists() and OUT.read_text() == text
        print(f"teleport-oracle: {'GREEN' if same else 'RED'} — committed fixtures {'match' if same else 'DIFFER from'} a fresh Qiskit run")
        sys.exit(0 if same else 1)
    OUT.write_text(text)
    print(f"teleport-oracle: GREEN — {16 * len(states)} combinations, fidelity 1 exactly on X iff m1=1, Z iff m0=1; wrote {OUT.name}")


if __name__ == "__main__":
    main()
