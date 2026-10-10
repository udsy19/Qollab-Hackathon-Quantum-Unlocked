# Recompute every fake number with Qiskit (Statevector, partial_trace, state_fidelity) and diff.
import json, subprocess, sys, numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity, DensityMatrix
fake = json.loads(subprocess.check_output(['node', 'dump_fake.mjs', sys.argv[1]]))
def prep(qc, s, q=0):
    if s == 'one': qc.x(q)
    elif s == 'plus': qc.h(q)
    elif s == 'minus': qc.x(q); qc.h(q)
    elif s == 'phase': qc.h(q); qc.s(q)
    elif s == 'bloch': qc.ry(1.137, q); qc.rz(0.44, q)
    elif s == 'story_token': qc.ry(2.31, q); qc.rz(-2.05, q)
def single(s):
    qc = QuantumCircuit(1); prep(qc, s); return Statevector(qc)
bad = 0
for s, r in fake['clone'].items():
    qc = QuantumCircuit(2); prep(qc, s); qc.cx(0, 1); out = Statevector(qc)
    psi = single(s); fid = state_fidelity(out, psi.tensor(psi))
    pur = float(np.real(partial_trace(out, [0]).purity()))
    ok = abs(fid - r['fidelity']) < 1e-9 and abs(pur - r['parameters']['reducedPurity']) < 1e-9
    bad += not ok
    print(f"clone {s:6} qiskit F={fid:.6f} purity={pur:.6f} | fake F={r['fidelity']} purity={r['parameters']['reducedPurity']} copied={r['parameters']['copied']} engine={r['engine']} {'OK' if ok else 'MISMATCH'}")
for g, r in fake['bell'].items():
    qc = QuantumCircuit(2); qc.h(0); qc.cx(0, 1); getattr(qc, {'I': 'id', 'X': 'x', 'Z': 'z'}[g])(0)
    bob = partial_trace(Statevector(qc), [0]); p0 = float(np.real(bob.data[0, 0]))
    ok = abs(p0 - r['probabilities']['receiver=0']) < 1e-9 and np.allclose(bob.data, np.eye(2) / 2)
    bad += not ok
    print(f"bell sender={g} qiskit bob=I/2:{np.allclose(bob.data, np.eye(2)/2)} P0={p0:.6f} | fake P0={r['probabilities']['receiver=0']} {'OK' if ok else 'MISMATCH'}")
wrong_f1 = []
for t in fake['tele']:
    # branch-projected protocol in Qiskit: postselect m0,m1 then apply corrections on q2
    qc = QuantumCircuit(3); prep(qc, t['s']); qc.h(1); qc.cx(1, 2); qc.cx(0, 1); qc.h(0)
    sv = Statevector(qc).data.reshape(2, 2, 2)  # index [q2][q1][q0]
    bob = sv[:, t['m1'], t['m0']]; p = float(np.vdot(bob, bob).real); bob = bob / np.sqrt(p)
    if t['X']: bob = np.array([bob[1], bob[0]])
    if t['Z']: bob = np.array([bob[0], -bob[1]])
    f = state_fidelity(Statevector(bob), single(t['s']))
    correct = (t['X'] == (t['m1'] == 1)) and (t['Z'] == (t['m0'] == 1))
    ok = abs(f - t['f']) < 1e-9 and abs(p - t['p']) < 1e-9
    bad += not ok
    if not correct and f > 0.999999: wrong_f1.append((t['s'], t['m0'], t['m1'], t['X'], t['Z']))
    if correct and f < 0.999999: print('CORRECT CHOICE BELOW 1', t, f); bad += 1
print('teleport cases', len(fake['tele']), 'mismatches total', bad)
print('WRONG corrections that still score fidelity 1:', len(wrong_f1))
for w in wrong_f1: print('  state=%s m0=%d m1=%d chose X=%s Z=%s' % w)
