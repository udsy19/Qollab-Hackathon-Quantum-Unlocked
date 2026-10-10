"""Independent Qiskit check of the teleport failure lines (objectives.js TELEPORT_FAILURE_CASES, FAILURES.teleportation).
Receiver state is computed by projecting the real 3-qubit protocol onto (m0, m1) and applying the player's X/Z plan;
the residual Pauli is then IDENTIFIED by fidelity against {I,X,Z,XZ}·psi. The correction rule is never used here.
Reads the case table as JSON on stdin: {"m0m1:XZ": [line ids]}. Prints a table; exit 1 on any false line."""
import json, sys
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity, Operator

def prep():
    qc = QuantumCircuit(1); qc.ry(1.137, 0); qc.rz(0.44, 0); return qc  # circuit order, owner ruling (3)

psi = Statevector(prep())
def receiver(m0, m1, x, z):
    qc = QuantumCircuit(3); qc.compose(prep(), [0], inplace=True)
    qc.h(1); qc.cx(1, 2); qc.cx(0, 1); qc.h(0)
    sv = Statevector(qc)
    # project q0 -> m0, q1 -> m1 (Qiskit index i: bit k of i is qubit k)
    keep = np.array([((i >> 0) & 1) == m0 and ((i >> 1) & 1) == m1 for i in range(8)])
    v = np.where(keep, sv.data, 0); v = v / np.linalg.norm(v)
    s = Statevector(v)
    if x: s = s.evolve(Operator.from_label('X'), [2])
    if z: s = s.evolve(Operator.from_label('Z'), [2])
    return partial_trace(s, [0, 1])

P = {'I': 'I', 'X': 'X', 'Z': 'Z', 'XZ': None}
def residual(rho):
    best = {}
    for name in ['I', 'X', 'Z', 'Y']:
        best[name] = state_fidelity(rho, psi.evolve(Operator.from_label(name)))
    # Y = iXZ: same state up to global phase as XZ psi
    name = max(best, key=best.get); assert best[name] > 1 - 1e-9, best
    return {'I': set(), 'X': {'X'}, 'Z': {'Z'}, 'Y': {'X', 'Z'}}[name], state_fidelity(rho, psi)

cases = json.load(sys.stdin); bad = 0
print('| key m0m1:XZ | residual flips (Qiskit) | F(receiver, psi) | lines shown | physics-true lines | verdict |')
print('|---|---|---|---|---|---|')
for m0 in (0, 1):
    for m1 in (0, 1):
        for x in (0, 1):
            for z in (0, 1):
                flips, F = residual(receiver(m0, m1, x, z))
                truth = set()
                # a line names one switch and one bit; it is true iff its premise holds and the residual carries that flip
                if m1 == 1 and x == 0 and 'X' in flips: truth.add('missing_X')
                if m1 == 0 and x == 1 and 'X' in flips: truth.add('extra_X')
                if m0 == 1 and z == 0 and 'Z' in flips: truth.add('missing_Z')
                if m0 == 0 and z == 1 and 'Z' in flips: truth.add('extra_Z')
                key = f'{m0}{m1}:{x}{z}'; shown = set(cases.get(key, ['<absent>']))
                ok = shown == truth and ((F > 1 - 1e-9) == (not flips))
                bad += not ok
                print(f"| {key} | {''.join(sorted(flips)) or '-'} | {F:.6f} | {','.join(sorted(shown)) or '-'} | {','.join(sorted(truth)) or '-'} | {'OK' if ok else 'FALSE'} |")
print(f'\n16 cases, {16 - bad} true, {bad} false'); sys.exit(1 if bad else 0)
