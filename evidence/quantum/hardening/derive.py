"""Independent re-derivation for the hardening round, re-targeted from evidence/physics-review/derive.py
(whose field names predate contract-conformance). Own numpy; full 2^n matrices built with np.kron
(index = q0 + 2*q1 + 4*q2: q0 is the RIGHTMOST kron factor). Shares no code with echo/tests or the
engine; engine values are imported only to be compared. Exit 0 = every number within 1e-8, 1 = not."""
import itertools, math, random, sys
import numpy as np
sys.path.insert(0, sys.argv[1])  # path to echo/
from quantum import cloning, entanglement, teleportation

I = np.eye(2, dtype=complex); X = np.array([[0, 1], [1, 0]], complex); Z = np.diag([1, -1]).astype(complex)
Y = np.array([[0, -1j], [1j, 0]]); H = np.array([[1, 1], [1, -1]], complex) / math.sqrt(2)
P0 = np.diag([1, 0]).astype(complex); P1 = np.diag([0, 1]).astype(complex)
def RY(t): return np.array([[math.cos(t/2), -math.sin(t/2)], [math.sin(t/2), math.cos(t/2)]], complex)
def RZ(p): return np.diag([np.exp(-0.5j*p), np.exp(0.5j*p)])
def op(n, g, q):
    m = np.array([[1]], complex)
    for k in reversed(range(n)): m = np.kron(m, g if k == q else I)
    return m
def cx(n, c, t): return op(n, P0, c) + op(n, P1, c) @ op(n, X, t)
def czg(n, a, b): return op(n, P0, a) + op(n, P1, a) @ op(n, Z, b)
def keep1(psi, n, q):
    t = np.moveaxis(psi.reshape([2]*n), n-1-q, 0).reshape(2, -1)
    return t @ t.conj().T
def fid(psi, rho): return float(np.real(psi.conj() @ rho @ psi))
def bloch(rho): return [float(np.real(np.trace(rho @ P))) for P in (X, Y, Z)]
def B(r, pre): return [r["observables"][f"{pre}Bloch{a}"] for a in "XYZ"]

worst = 0.0
n_cmp = 0
def cmp(label, mine, eng):
    global worst, n_cmp
    d = float(np.max(np.abs(np.array(mine, float) - np.array(eng, float))))
    worst = max(worst, d); n_cmp += np.size(mine)
    if d >= 1e-8: print(f"  DIFF {label}: mine={np.round(mine, 6).tolist()} engine={np.round(eng, 6).tolist()} |d|={d:.1e}")

NAMED = {"zero": I, "one": X, "plus": H, "minus": H @ X, "phase": np.diag([1, 1j]) @ H,
         "bloch_a": RZ(0.44) @ RY(1.137), "bloch_b": RZ(-1.9) @ RY(2.3)}
cases = [(n, U @ np.array([1, 0], complex), {}) for n, U in NAMED.items()]
for seed in range(6):  # calibration states: the angles come from the engine's draw, the state is built here
    p = teleportation.bell_measurement("calibration", seed=seed)["parameters"]
    th, ph = p["theta"], p["phi"]
    psi = RZ(ph) @ RY(th) @ np.array([1, 0], complex)
    assert max(c * c for c in bloch(np.outer(psi, psi.conj()))) <= 0.9 + 1e-12, f"draw {seed} not generic"
    cases.append(("calibration", psi, {"theta": th, "phi": ph}))

for name, psi, kw in cases:
    s = np.kron(np.kron([1, 0], [1, 0]), psi).astype(complex)
    for U in (op(3, H, 1), cx(3, 1, 2), cx(3, 0, 1), op(3, H, 0)): s = U @ s
    for m0, m1 in itertools.product((0, 1), (0, 1)):
        idx = [m0 + 2*m1 + 4*b for b in (0, 1)]
        bob = s[idx]; pb = float(np.vdot(bob, bob).real); bob = bob / math.sqrt(pb)
        for ax, az in itertools.product((0, 1), (0, 1)):
            b2 = bob
            if ax: b2 = X @ b2
            if az: b2 = Z @ b2
            e = teleportation.teleport_branch(name, m0, m1, bool(ax), bool(az), **kw)
            lab = f"{name}{kw} m0={m0} m1={m1} ax={ax} az={az}"
            cmp(lab + " fidelity", [abs(np.vdot(psi, b2))**2], [e["fidelity"]])
            cmp(lab + " receiver Bloch", bloch(np.outer(b2, b2.conj())), B(e, "receiver"))
            cmp(lab + " input Bloch", bloch(np.outer(psi, psi.conj())), B(e, "input"))
            cmp(lab + " branch p / source overlap", [pb, abs(psi[m0])**2],
                [e["observables"]["branchProbability"], e["observables"]["sourceFidelityAfterMeasurement"]])
    w = teleportation.corrections_withheld(name, **kw)
    cmp(f"{name} withheld Bloch", bloch(keep1(s, 3, 2)), B(w, "receiver"))
    for cxon, czon in itertools.product((0, 1), (0, 1)):
        t = s.copy()
        if cxon: t = cx(3, 1, 2) @ t
        if czon: t = czg(3, 0, 2) @ t
        cmp(f"{name} deferred {cxon}{czon}", [fid(psi, keep1(t, 3, 2))],
            [teleportation.verify_deferred(name, bool(cxon), bool(czon), **kw)["fidelity"]])
    if name != "calibration":
        c = cx(2, 0, 1) @ np.kron([1, 0], psi).astype(complex)
        rs, rc = keep1(c, 2, 0), keep1(c, 2, 1)
        d = cloning.run_calibration(name)["observables"]
        cmp(f"{name} clone", [np.trace(rs@rs).real, np.trace(rc@rc).real, fid(psi, rs), fid(psi, rc), abs(np.vdot(np.kron(psi, psi), c))**2],
            [d["purityQ0"], d["purityQ1"], d["fidelityQ0WithInput"], d["fidelityQ1WithInput"], d["jointFidelityWithTwoCopies"]])

for g, G in (("I", I), ("X", X), ("Z", Z)):
    b = op(2, G, 0) @ cx(2, 0, 1) @ op(2, H, 0) @ np.array([1, 0, 0, 0], complex)
    rr = keep1(b, 2, 1); e = entanglement.bell_signalling(g)
    pz = np.abs(b)**2; px = np.abs(np.kron(H, H) @ b)**2
    cmp(f"relay {g}", [rr[0, 0].real, rr[1, 1].real, pz[0]+pz[3], px[0]+px[3]],
        [e["probabilities"]["0"], e["probabilities"]["1"], e["observables"]["zBasisAgreement"], e["observables"]["xBasisAgreement"]])

# live commit: the token's state is never exposed, so the check is the one the physics allows from
# outside: the delivered fidelity is 1 on every live branch the seeds reach (all four).
seen = set()
for seed in range(24):
    teleportation.reset_story_token()
    r = teleportation.live_commit(seed=seed)
    seen.add((r["measurementBits"]["m0"], r["measurementBits"]["m1"]))
    cmp(f"live_commit seed={seed} fidelity", [1.0], [r["fidelity"]])
teleportation.reset_story_token()
if seen != {(0, 0), (0, 1), (1, 0), (1, 1)}:
    print(f"  DIFF live_commit branches reached: {sorted(seen)}"); worst = max(worst, 1.0)
print(f"{n_cmp} numbers compared; WORST |mine - engine| = {worst:.2e}")
sys.exit(0 if worst < 1e-8 else 1)
