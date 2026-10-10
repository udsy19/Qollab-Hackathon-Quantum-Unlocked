"""Independent numpy re-derivation (no qiskit, no echo code) of the three lessons, compared with the
engine. Usage: python derive.py <echo-root> [engine.json]   (engine.json: Pyodide output to compare instead
of importing the engine on the host). Writes states.json (the inputs) and prints a table; exit 1 on mismatch.
Kron convention: a 3-qubit index is q0 + 2 q1 + 4 q2, so q0 is the RIGHTMOST kron factor."""
import json, math, sys
import numpy as np

I2 = np.eye(2); X = np.array([[0, 1], [1, 0]], complex); Z = np.diag([1, -1]).astype(complex)
Y = 1j * X @ Z; H = np.array([[1, 1], [1, -1]], complex) / math.sqrt(2); S = np.diag([1, 1j])
def RY(t): c, s = math.cos(t / 2), math.sin(t / 2); return np.array([[c, -s], [s, c]], complex)
def RZ(p): return np.diag([np.exp(-1j * p / 2), np.exp(1j * p / 2)])
def on(n, k, U):  # U on qubit k of n
    m = np.array([[1]], complex)
    for q in reversed(range(n)): m = np.kron(m, U if q == k else I2)
    return m
def cx(n, c, t):
    d = 2 ** n; M = np.zeros((d, d), complex)
    for i in range(d): M[i ^ (1 << t) if (i >> c) & 1 else i, i] = 1
    return M
def cz(n, a, b):
    return np.diag([-1 if (i >> a) & 1 and (i >> b) & 1 else 1 for i in range(2 ** n)]).astype(complex)
def psi_of(theta, phi): return RZ(phi) @ RY(theta) @ np.array([1, 0], complex)
def bob_rho(v3):  # reduced state of q2 from a 3-qubit vector (index q0 + 2q1 + 4q2)
    T = v3.reshape(2, 2, 2)  # axes: q2, q1, q0
    return np.einsum('aij,bij->ab', T, T.conj())
def fid(rho, psi): return float(np.real(psi.conj() @ rho @ psi))
def bloch(rho): return [float(np.real(np.trace(rho @ P))) for P in (X, Y, Z)]

def protocol(psi):
    v = np.kron(np.kron([1, 0], [1, 0]), psi).astype(complex)  # q2 ⊗ q1 ⊗ q0
    for U in (on(3, 1, H), cx(3, 1, 2), cx(3, 0, 1), on(3, 0, H)): v = U @ v
    return v

rng = np.random.default_rng(20261010)
states = []
while len(states) < 8:  # uniform on the sphere, kept only if generic (every r_P^2 <= 0.9)
    z = rng.uniform(-1, 1); ph = rng.uniform(-math.pi, math.pi); th = math.acos(z)
    if max(np.square(bloch(np.outer(psi_of(th, ph), psi_of(th, ph).conj())))) <= 0.9: states.append((th, ph))
json.dump({"states": states}, open("states.json", "w"))

rows, worst = [], 0.0
def cmp(what, mine, theirs, tol=1e-9):
    global worst
    d = abs(mine - theirs); worst = max(worst, d)
    rows.append((what, mine, theirs, d, d <= tol))

if len(sys.argv) > 2:
    eng = json.load(open(sys.argv[2])); src = "pyodide"
else:
    sys.path.insert(0, sys.argv[1]); from quantum import teleportation as T, cloning as Cl, entanglement as En
    eng = {"tele": [[T.teleport_branch("calibration", m0, m1, x, zz, theta=th, phi=ph) for (m0, m1) in ((0,0),(0,1),(1,0),(1,1)) for x in (False, True) for zz in (False, True)] for th, ph in states],
           "withheld": [T.corrections_withheld("calibration", theta=th, phi=ph) for th, ph in states],
           "deferred": [[T.verify_deferred("calibration", cx_, cz_, theta=th, phi=ph) for cx_ in (True, False) for cz_ in (True, False)] for th, ph in states],
           "clone": {s: Cl.run_calibration(s) for s in ("plus", "phase", "minus", "zero", "bloch_a")},
           "relay": {g: En.bell_signalling(g) for g in ("I", "X", "Z")}}
    src = "host"

rule_ok = wrong_max = 0; wrong_max = 0.0
for si, (th, ph) in enumerate(states):
    psi = psi_of(th, ph); v = protocol(psi); r = bloch(np.outer(psi, psi.conj()))
    k = 0
    for m0, m1 in ((0, 0), (0, 1), (1, 0), (1, 1)):
        keep = np.array([((i & 1) == m0) and (((i >> 1) & 1) == m1) for i in range(8)])
        pv = v * keep; p = float(np.vdot(pv, pv).real); pv = pv / math.sqrt(p)
        rb = bob_rho(pv)
        # Bob before correction must be X^m1 Z^m0 |psi>
        pre = np.linalg.matrix_power(X, m1) @ np.linalg.matrix_power(Z, m0) @ psi
        assert abs(fid(rb, pre) - 1) < 1e-12, "Bob's conditional state is not X^m1 Z^m0 psi"
        for ax in (False, True):
            for az in (False, True):
                U = (Z if az else I2) @ (X if ax else I2)  # X first, then Z (engine order)
                rc = U @ rb @ U.conj().T; f = fid(rc, psi)
                e = eng["tele"][si][k]; k += 1
                cmp(f"s{si} m0={m0} m1={m1} X={int(ax)} Z={int(az)} F", f, e["fidelity"])
                cmp(f"s{si} m0={m0} m1={m1} branchP", p, e["observables"]["branchProbability"])
                for c, nm in zip(bloch(rc), "XYZ"): cmp(f"s{si} {m0}{m1}{int(ax)}{int(az)} rx{nm}", c, e["observables"][f"receiverBloch{nm}"])
                assert e["measurementBits"] == {"m0": m0, "m1": m1}
                right = (ax == (m1 == 1)) and (az == (m0 == 1))
                if right: rule_ok += abs(f - 1) < 1e-12
                else: wrong_max = max(wrong_max, f)
    rho_w = bob_rho(v)  # bits withheld: average over branches
    cmp(f"s{si} withheld F", fid(rho_w, psi), eng["withheld"][si]["fidelity"])
    cmp(f"s{si} withheld purity", float(np.real(np.trace(rho_w @ rho_w))), eng["withheld"][si]["observables"]["receiverPurity"])
    j = 0
    for cx_ in (True, False):
        for cz_ in (True, False):
            w = v.copy()
            if cx_: w = cx(3, 1, 2) @ w
            if cz_: w = cz(3, 0, 2) @ w
            cmp(f"s{si} deferred cx={int(cx_)} cz={int(cz_)} F", fid(bob_rho(w), psi), eng["deferred"][si][j]["fidelity"]); j += 1

# cloning: CNOT(q0->q1) on prepared |psi>|0>
named = {"plus": H @ [1, 0], "phase": S @ H @ [1, 0], "minus": H @ X @ [1, 0], "zero": np.array([1, 0], complex),
         "bloch_a": psi_of(1.137, 0.44)}
for s, psi in named.items():
    v = cx(2, 0, 1) @ np.kron([1, 0], psi).astype(complex); T2 = v.reshape(2, 2)  # axes q1, q0
    r0 = T2.T @ T2.conj(); r1 = T2 @ T2.conj().T
    cmp(f"clone {s} purityQ0", float(np.real(np.trace(r0 @ r0))), eng["clone"][s]["observables"]["purityQ0"])
    cmp(f"clone {s} purityQ1", float(np.real(np.trace(r1 @ r1))), eng["clone"][s]["observables"]["purityQ1"])
    cmp(f"clone {s} joint F(psi⊗psi)", float(abs(np.vdot(np.kron(psi, psi), v)) ** 2), eng["clone"][s]["observables"]["jointFidelityWithTwoCopies"])
for g, U in (("I", I2), ("X", X), ("Z", Z)):
    v = on(2, 0, U) @ cx(2, 0, 1) @ on(2, 0, H) @ np.array([1, 0, 0, 0], complex)
    p = np.abs(v) ** 2  # index q0 + 2 q1
    cmp(f"relay {g} receiver P(0)", p[0] + p[1], eng["relay"][g]["probabilities"]["0"])
    cmp(f"relay {g} receiver P(1)", p[2] + p[3], eng["relay"][g]["probabilities"]["1"])
    cmp(f"relay {g} zAgree", p[0] + p[3], eng["relay"][g]["observables"]["zBasisAgreement"])
    vh = np.kron(H, H) @ v; ph_ = np.abs(vh) ** 2
    cmp(f"relay {g} xAgree", ph_[0] + ph_[3], eng["relay"][g]["observables"]["xBasisAgreement"])

bad = [r for r in rows if not r[4]]
for r in bad[:20]: print("MISMATCH", r)
print(f"source={src}  states={len(states)}  compared={len(rows)}  worst|diff|={worst:.3e}  mismatches={len(bad)}")
print(f"rule choices with F=1: {int(rule_ok)}/{len(states)*4}   max F over the {len(states)*12} wrong choices: {wrong_max:.6f}")
for s in ("plus", "phase"): print(f"clone {s}: purity mine={[round(x[1],12) for x in rows if x[0]==f'clone {s} purityQ0'][0]}")
sys.exit(1 if bad or rule_ok != len(states) * 4 or wrong_max > 0.9 else 0)
