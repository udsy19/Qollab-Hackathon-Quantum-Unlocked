"""Independent re-derivation for the ECHO physics review. Own numpy, full 2^n matrices built with
np.kron (index = q0 + 2*q1 + 4*q2, i.e. q0 is the RIGHTMOST kron factor). Shares no code with
echo/tests. Engine values are imported only to be compared at the end."""
import itertools, math, sys
import numpy as np
sys.path.insert(0, sys.argv[1])  # path to echo/
import quantum
from quantum import cloning, entanglement, teleportation

I = np.eye(2, dtype=complex); X = np.array([[0,1],[1,0]],complex); Z = np.diag([1,-1]).astype(complex)
Y = np.array([[0,-1j],[1j,0]]); H = np.array([[1,1],[1,-1]],complex)/math.sqrt(2)
P0 = np.diag([1,0]).astype(complex); P1 = np.diag([0,1]).astype(complex)
def RY(t): return np.array([[math.cos(t/2), -math.sin(t/2)],[math.sin(t/2), math.cos(t/2)]],complex)
def RZ(p): return np.diag([np.exp(-0.5j*p), np.exp(0.5j*p)])
def op(n, gate, q):  # single-qubit gate on qubit q of n
    m = np.array([[1]],complex)
    for k in reversed(range(n)): m = np.kron(m, gate if k == q else I)
    return m
def cx(n, c, t): return op(n, P0, c) + op(n, P1, c) @ op(n, X, t)
def czg(n, a, b): return op(n, P0, a) + op(n, P1, a) @ op(n, Z, b)
def ptrace_keep(psi, n, keep):  # reduced density matrix of qubit `keep`
    t = psi.reshape([2]*n)  # axes: q_{n-1} ... q0
    ax = n-1-keep
    t = np.moveaxis(t, ax, 0).reshape(2, -1)
    return t @ t.conj().T
def fid(psi, rho): return float(np.real(psi.conj() @ rho @ psi))
def bloch(rho): return [float(np.real(np.trace(rho@P))) for P in (X,Y,Z)]

# Three non-axis Bloch states: the engine's two plus one the engine has never seen.
STATES = {"bloch_a": (1.137, 0.44), "bloch_b": (2.3, -1.9), "rv_c": (0.7, 2.1)}
quantum.STATES["rv_c"] = ((("ry", 0.7), ("rz", 2.1)), "review state")
worst = 0.0
def cmp(label, mine, eng):
    global worst
    d = float(np.max(np.abs(np.array(mine, float) - np.array(eng, float))))
    worst = max(worst, d)
    flag = "OK " if d < 1e-8 else "DIFF"
    print(f"  {flag} {label}: mine={np.round(mine,6).tolist()} engine={np.round(eng,6).tolist()} |d|={d:.1e}")

for name, (th, ph) in STATES.items():
    psi = RZ(ph) @ RY(th) @ np.array([1,0],complex)
    r = bloch(np.outer(psi, psi.conj()))
    print(f"\n### {name}: theta={th}, phi={ph}, Bloch r={np.round(r,6).tolist()}")
    # ---- teleportation, q0 source, q1 Alice, q2 Bob
    s = np.kron(np.kron([1,0],[1,0]), psi).astype(complex)  # q2 q1 q0
    for U in (op(3,H,1), cx(3,1,2), cx(3,0,1), op(3,H,0)): s = U @ s
    for m0, m1 in itertools.product((0,1),(0,1)):
        idx = [m0 + 2*m1 + 4*b for b in (0,1)]
        bob = s[idx]; p = float(np.vdot(bob,bob).real); bob = bob/math.sqrt(p)
        textbook = np.linalg.matrix_power(X,m1) @ np.linalg.matrix_power(Z,m0) @ psi
        assert abs(abs(np.vdot(textbook, bob))-1) < 1e-12, "Bob != X^m1 Z^m0 psi"
        row_mine, row_eng, row_closed = [], [], []
        for ax, az in itertools.product((0,1),(0,1)):
            b2 = bob
            if ax: b2 = X @ b2
            if az: b2 = Z @ b2
            row_mine.append(abs(np.vdot(psi, b2))**2)
            e = teleportation.teleport_branch(name, m0, m1, bool(ax), bool(az))
            row_eng.append(e["fidelity"])
            # closed form: residual Pauli X^(ax^m1) Z^(az^m0) -> fidelity r_P^2 (1 if identity)
            rx, rz = ax ^ m1, az ^ m0
            row_closed.append(1.0 if not (rx or rz) else (r[0]**2 if rx and not rz else r[2]**2 if rz and not rx else r[1]**2))
            assert abs(e["details"]["branchProbability"] - p) < 1e-9
            assert abs(e["details"]["sourceFidelityAfterMeasurement"] - abs(psi[m0])**2) < 1e-9
        cmp(f"m0={m0} m1={m1} p={p:.6f} fid[--,-Z,X-,XZ] (ax,az order)", row_mine, row_eng)
        cmp(f"m0={m0} m1={m1} closed form r_P^2", row_closed, row_eng)
        bb = bloch(np.outer(bob,bob.conj()))
        corr = np.linalg.matrix_power(Z,m0) @ np.linalg.matrix_power(X,m1) @ bob
        e = teleportation.teleport_branch(name, m0, m1, False, False)
        cmp(f"  Bob conditional Bloch (uncorrected)", bb, e["details"]["receiverBlochVector"])
        e = teleportation.teleport_branch(name, m0, m1, m1==1, m0==1)
        cmp(f"  Bob corrected Bloch == psi Bloch", bloch(np.outer(corr,corr.conj())), e["details"]["receiverBlochVector"])
    cmp("branch probabilities", [0.25]*4, [teleportation.bell_measurement(name, seed=0)["probabilities"][f"m0={a},m1={b}"] for a,b in itertools.product((0,1),(0,1))])
    rho_w = ptrace_keep(s, 3, 2)
    cmp("withheld Bob rho (re)", rho_w.real.ravel(), np.ravel(teleportation.corrections_withheld(name)["details"]["receiverAverageState"]["re"]))
    for cxon, czon in itertools.product((0,1),(0,1)):
        t = s.copy()
        if cxon: t = cx(3,1,2) @ t
        if czon: t = czg(3,0,2) @ t
        cmp(f"deferred cx={cxon} cz={czon}", [fid(psi, ptrace_keep(t,3,2))], [teleportation.verify_deferred(name, bool(cxon), bool(czon))["fidelity"]])
    # ---- cloning, q0 source, q1 copy
    c = cx(2,0,1) @ np.kron([1,0], psi).astype(complex)
    rs, rc = ptrace_keep(c,2,0), ptrace_keep(c,2,1)
    d = cloning.run_calibration(name)["details"]
    cmp("clone purities [src,copy]", [np.trace(rs@rs).real, np.trace(rc@rc).real], [d["sourcePurity"], d["copyPurity"]])
    cmp("clone fidelities [src,copy,joint]", [fid(psi,rs), fid(psi,rc), abs(np.vdot(np.kron(psi,psi), c))**2],
        [d["sourceFidelity"], d["copyFidelity"], d["jointFidelityWithTwoCopies"]])
    print(f"  closed form purity 1-2|a|^2|b|^2 = {1-2*abs(psi[0])**2*abs(psi[1])**2:.6f}; isTwoIndependentCopies={d['isTwoIndependentCopies']}")
    # ---- relay is input-independent, covered below

print("\n### relay (Bell pair q0 sender, q1 receiver)")
for g, G in (("I", I), ("X", X), ("Z", Z)):
    b = cx(2,0,1) @ op(2,H,0) @ np.array([1,0,0,0],complex)
    b = op(2,G,0) @ b
    rr = ptrace_keep(b,2,1)
    e = entanglement.bell_signalling(g)
    cmp(f"{g}: receiver marginal", [rr[0,0].real, rr[1,1].real], [e["details"]["receiverMarginal"]["0"], e["details"]["receiverMarginal"]["1"]])
    pz = np.abs(b)**2; hb = np.kron(H,H) @ b; px = np.abs(hb)**2
    cmp(f"{g}: [zAgree, xAgree]", [pz[0]+pz[3], px[0]+px[3]], [e["details"]["zBasisAgreement"], e["details"]["xBasisAgreement"]])
    cmp(f"{g}: joint probs sender/receiver", [pz[s_ + 2*r_] for s_ in (0,1) for r_ in (0,1)], [e["probabilities"][f"sender={s_},receiver={r_}"] for s_ in (0,1) for r_ in (0,1)])
print(f"\nWORST |mine - engine| over every compared number: {worst:.2e}")
sys.exit(0 if worst < 1e-8 else 1)
