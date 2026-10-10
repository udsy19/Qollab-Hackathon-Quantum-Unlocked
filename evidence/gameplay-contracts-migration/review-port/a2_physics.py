# PORT of evidence/gameplay-quest-review/a2_physics.py for the new fake. Every fake number is
# recomputed with Qiskit (Statevector, partial_trace, state_fidelity). Calibration states are
# prepared from the angles the fake reports (ry(theta) then rz(phi), §10.5 circuit order).
import json, subprocess, sys, numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity
here = sys.path[0]
fake = json.loads(subprocess.check_output(['node', here + '/dump_fake.mjs', sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else '2000']))
def prep_named(qc, s):
    if s == 'one': qc.x(0)
    elif s == 'plus': qc.h(0)
    elif s == 'phase': qc.h(0); qc.s(0)
def prep_angles(qc, theta, phi): qc.ry(theta, 0); qc.rz(phi, 0)
bad = 0
for s, r in fake['clone'].items():
    qc = QuantumCircuit(2); prep_named(qc, s); qc.cx(0, 1); out = Statevector(qc)
    one = QuantumCircuit(1); prep_named(one, s); psi = Statevector(one)
    fid = state_fidelity(out, psi.tensor(psi))
    pur1 = float(np.real(partial_trace(out, [0]).purity())); pur0 = float(np.real(partial_trace(out, [1]).purity()))
    probs = {k: float(v) for k, v in out.probabilities_dict().items()}  # Qiskit keys are q1q0 = keyQubits [1,0]
    ok = abs(fid - r['fidelity']) < 1e-9 and abs(pur1 - r['observables']['purityQ1']) < 1e-9 and abs(pur0 - r['observables']['purityQ0']) < 1e-9 \
        and r['keyQubits'] == [1, 0] and all(abs(probs.get(k, 0) - v) < 1e-9 for k, v in r['probabilities'].items())
    bad += not ok
    print(f"clone {s:6} qiskit F={fid:.6f} purity q0/q1={pur0:.6f}/{pur1:.6f} | fake F={r['fidelity']} {r['observables']} keyQubits={r['keyQubits']} {'OK' if ok else 'MISMATCH'}")
for g, r in fake['bell'].items():
    qc = QuantumCircuit(2); qc.h(0); qc.cx(0, 1); getattr(qc, {'I': 'id', 'X': 'x', 'Z': 'z'}[g])(0)
    sv = Statevector(qc); marg = {k: float(v) for k, v in sv.probabilities_dict(qargs=[1]).items()}
    bob = partial_trace(sv, [0])
    ok = r['keyQubits'] == [1] and all(abs(marg.get(k, 0) - r['probabilities'][k]) < 1e-9 for k in ('0', '1')) and np.allclose(bob.data, np.eye(2) / 2)
    bad += not ok
    print(f"bell sender={g} qiskit marginal(q1)={marg} | fake {r['probabilities']} keyQubits={r['keyQubits']} {'OK' if ok else 'MISMATCH'}")
def teleport_check(t, prep):
    qc = QuantumCircuit(3); prep(qc); qc.h(1); qc.cx(1, 2); qc.cx(0, 1); qc.h(0)
    sv = Statevector(qc).data.reshape(2, 2, 2)  # [q2][q1][q0]
    bob = sv[:, t['m1'], t['m0']]; p = float(np.vdot(bob, bob).real); bob = bob / np.sqrt(p)
    if t['X']: bob = np.array([bob[1], bob[0]])
    if t['Z']: bob = np.array([bob[0], -bob[1]])
    one = QuantumCircuit(1); prep(one); f = state_fidelity(Statevector(bob), Statevector(one))
    correct = (t['X'] == (t['m1'] == 1)) and (t['Z'] == (t['m0'] == 1))
    return f, p, correct
def run(rows, label):
    global bad
    wrong_f1, wrong, maxwrong = 0, 0, 0.0
    for t in rows:
        f, p, correct = teleport_check(t, lambda qc, t=t: prep_angles(qc, t['theta'], t['phi']))
        if abs(f - t['f']) > 1e-9 or abs(p - t['p']) > 1e-9: bad += 1
        if correct and f < 0.999999: bad += 1; print('CORRECT CHOICE BELOW 1', t, f)
        if not correct:
            wrong += 1; maxwrong = max(maxwrong, f)
            if f > 0.999999: wrong_f1 += 1
    print(f"{label}: {len(rows)} dry runs, {wrong} wrong choices, WRONG corrections that still score fidelity 1: {wrong_f1}, max fidelity shown for a wrong choice {maxwrong:.6f}")
    return wrong_f1
game_f1 = run(fake['random'], 'random generic calibration (the game path)')
distinct = len({(t['theta'], t['phi']) for t in fake['random']})
print(f"distinct calibration states drawn: {distinct} of {len(fake['random'])} attempts")
ctl = run(fake['control'], 'POSITIVE CONTROL named Pauli eigenstates passed explicitly')
# story token: the fake keeps its angles hidden; recompute from the fixed point in the fake source (ry 2.31, rz -2.05)
tok_bad = 0
for t in fake['token']:
    f, p, correct = teleport_check(t, lambda qc: prep_angles(qc, 2.31, -2.05))
    tok_bad += (not correct) or abs(f - t['f']) > 1e-9 or f < 0.999999
print(f"story-token commits: {len(fake['token'])}, rule-correct with fidelity 1 and matching Qiskit: {len(fake['token']) - tok_bad}")
bad += tok_bad
print('engines seen:', sorted({t['engine'] for t in fake['random'] + fake['token']}))
print('mismatches total', bad)
# Red if: any number disagrees with Qiskit, any wrong choice on the game path shows fidelity 1, a
# calibration state was reused, or the positive control stopped detecting the Pauli blind spot.
sys.exit(1 if bad or game_f1 or distinct != len(fake['random']) or ctl == 0 else 0)
