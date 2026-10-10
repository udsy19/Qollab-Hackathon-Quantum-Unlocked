"""Generate REAL engine results for the gameplay <-> quantum seam measurement.

Calls the quantum lane's Python entrypoints (echo/quantum on lane/quantum/integration) with the venv's
Qiskit, and records every returned dict. Nothing here builds a result by hand.

Random generic dry-run states (owner ruling 2026-10-10, 13 questions #7): the engine has no
(theta, phi) entrypoint, only named states. To exercise its real code on random generic states this
harness REGISTERS each drawn state in the engine's own `STATES` table as ry(theta) then rz(phi) on |0>
(the order of vision §10.5), so every number below is still computed by the engine's functions. That
registration is the harness's only intervention, and it is itself finding S-T1 (no theta/phi input).

Independent oracle: every teleport row also carries `oracleFidelity`, computed here with plain numpy
matrices in a qubit ordering of our own (q0 LEFTMOST in the tensor product, the opposite of Qiskit),
straight from vision §7.1's protocol text. It shares no code with the engine or with contracts.js.

Usage: python3 gen_results.py <path/to/quantum-worktree/echo> > out/results.jsonl
"""
import json
import math
import pathlib
import random
import sys

import numpy as np

ECHO = pathlib.Path(sys.argv[1]).resolve()
sys.path.insert(0, str(ECHO))

import quantum  # noqa: E402
from quantum import cloning, entanglement, teleportation  # noqa: E402

SEED = 20261010
N_GENERIC = 6
GENERIC_MAX_WRONG = 0.9  # owner ruling: a wrong correction must visibly fail (re-derived below by brute force)

# ---------------------------------------------------------------- independent numpy oracle (§7.1)
I2 = np.eye(2)
X = np.array([[0, 1], [1, 0]], dtype=complex)
Z = np.array([[1, 0], [0, -1]], dtype=complex)
H = np.array([[1, 1], [1, -1]], dtype=complex) / math.sqrt(2)


def ry(t):
    return np.array([[math.cos(t / 2), -math.sin(t / 2)], [math.sin(t / 2), math.cos(t / 2)]], dtype=complex)


def rz(p):
    return np.array([[np.exp(-1j * p / 2), 0], [0, np.exp(1j * p / 2)]], dtype=complex)


def kron(*ms):
    out = np.array([[1]], dtype=complex)
    for m in ms:
        out = np.kron(out, m)
    return out


def cnot(control, target, n=3):
    """CNOT on n qubits, q0 LEFTMOST: basis index bit (n-1-q) is qubit q."""
    dim = 2 ** n
    U = np.zeros((dim, dim), dtype=complex)
    for i in range(dim):
        bits = [(i >> (n - 1 - q)) & 1 for q in range(n)]
        if bits[control]:
            bits[target] ^= 1
        j = sum(b << (n - 1 - q) for q, b in enumerate(bits))
        U[j, i] = 1
    return U


def oracle_fidelity(psi, m0, m1, apply_x, apply_z):
    """§7.1: H(q1); CX(q1,q2); CX(q0,q1); H(q0); project q0 -> m0, q1 -> m1; Bob applies X then Z."""
    state = kron(psi.reshape(2, 1), np.array([[1], [0]]), np.array([[1], [0]])).reshape(8)
    state = kron(I2, H, I2) @ state
    state = cnot(1, 2) @ state
    state = cnot(0, 1) @ state
    state = kron(H, I2, I2) @ state
    bob = np.array([state[(m0 << 2) | (m1 << 1) | b] for b in (0, 1)])
    bob = bob / np.linalg.norm(bob)
    if apply_x:
        bob = X @ bob
    if apply_z:
        bob = Z @ bob
    return float(abs(np.vdot(psi, bob)) ** 2)


def psi_of(theta, phi):
    return rz(phi) @ ry(theta) @ np.array([1, 0], dtype=complex)


def worst_wrong(theta, phi):
    """Largest fidelity any WRONG choice can score, by brute force over the 12 wrong combinations."""
    psi = psi_of(theta, phi)
    return max(oracle_fidelity(psi, m0, m1, x, z)
               for m0 in (0, 1) for m1 in (0, 1) for x in (False, True) for z in (False, True)
               if (x, z) != (m1 == 1, m0 == 1))


# ---------------------------------------------------------------- generic states, registered in the engine
rng = random.Random(SEED)
generic = []
while len(generic) < N_GENERIC:
    theta = math.acos(1 - 2 * rng.random())  # uniform on the Bloch sphere
    phi = 2 * math.pi * rng.random() - math.pi
    if worst_wrong(theta, phi) <= GENERIC_MAX_WRONG:
        name = f"gen{len(generic)}"
        quantum.STATES[name] = ((("ry", theta), ("rz", phi)), f"RY({theta:.6f}) then RZ({phi:.6f}) on |0>")
        generic.append((name, theta, phi))

NAMED = {"bloch_a": (1.137, 0.44), "bloch_b": (2.3, -1.9)}  # the engine's own generic points
STATE_ANGLES = {**NAMED, **{n: (t, p) for n, t, p in generic}}


def emit(row):
    print(json.dumps(row, allow_nan=False))


def call(rowid, mission, label, fn, **extra):
    try:
        result = fn()
        json.dumps(result, allow_nan=False)
        emit({"id": rowid, "mission": mission, "call": label, "result": result, **extra})
    except Exception as e:  # noqa: BLE001 — recorded as a row, never skipped
        emit({"id": rowid, "mission": mission, "call": label, "error": f"{type(e).__name__}: {e}", **extra})


# Mission 1 (§7.2): every prepared state the engine knows.
for s in ("zero", "one", "plus", "minus", "phase", "bloch_a", "bloch_b"):
    call(f"clone:{s}", "cloning", f"cloning.run_calibration({s!r})", lambda s=s: cloning.run_calibration(s), state=s)

# Mission 2 (§7.3): every sender action.
for g in entanglement.SENDER_GATES:
    call(f"bell:{g}", "bell", f"entanglement.bell_signalling({g!r})", lambda g=g: entanglement.bell_signalling(g), senderGate=g)

# Mission 3 phase 1: one Bell measurement per (state, branch); seeds searched until every branch was drawn.
for name, (theta, phi) in STATE_ANGLES.items():
    seen = {}
    for seed in range(200):
        r = teleportation.bell_measurement(name, seed=seed)
        b = (r["measurementBits"]["m0"], r["measurementBits"]["m1"])
        seen.setdefault(b, seed)
        if len(seen) == 4:
            break
    for (m0, m1), seed in sorted(seen.items()):
        call(f"bits:{name}:{m0}{m1}", "teleport_bits", f"teleportation.bell_measurement({name!r}, seed={seed})",
             lambda name=name, seed=seed: teleportation.bell_measurement(name, seed=seed),
             state=name, theta=theta, phi=phi, request={"theta": theta, "phi": phi})

# Mission 3 phase 2: all 4 branches x 4 corrections, on generic states AND on the non-generic named
# states (where a wrong choice can still score 1, the blind spot the generic-state ruling closes).
for name in [*STATE_ANGLES, "zero", "plus", "phase"]:
    for m0 in (0, 1):
        for m1 in (0, 1):
            for ax in (False, True):
                for az in (False, True):
                    extra = {"state": name, "m0": m0, "m1": m1, "applyX": ax, "applyZ": az}
                    if name in STATE_ANGLES:
                        theta, phi = STATE_ANGLES[name]
                        extra.update(theta=theta, phi=phi, oracleFidelity=oracle_fidelity(psi_of(theta, phi), m0, m1, ax, az),
                                     request={"theta": theta, "phi": phi, "m0": m0, "m1": m1, "applyX": ax, "applyZ": az})
                    else:
                        psi = np.asarray(teleportation.target_state(name).data)
                        extra.update(oracleFidelity=oracle_fidelity(psi, m0, m1, ax, az))
                    call(f"corr:{name}:{m0}{m1}:{int(ax)}{int(az)}", "teleport_correction",
                         f"teleportation.teleport_branch({name!r}, {m0}, {m1}, {ax}, {az})",
                         lambda name=name, m0=m0, m1=m1, ax=ax, az=az: teleportation.teleport_branch(name, m0, m1, ax, az),
                         **extra)

# The commit (§7.4): live_commit on a fixed token state, one seed per live branch.
for name in ("bloch_a", "gen0"):
    seen = {}
    for seed in range(200):
        r = teleportation.live_commit(name, seed=seed)
        b = (r["measurementBits"]["m0"], r["measurementBits"]["m1"])
        seen.setdefault(b, seed)
        if len(seen) == 4:
            break
    for (m0, m1), seed in sorted(seen.items()):
        theta, phi = STATE_ANGLES[name]
        call(f"commit:{name}:{m0}{m1}", "commit", f"teleportation.live_commit({name!r}, seed={seed})",
             lambda name=name, seed=seed: teleportation.live_commit(name, seed=seed),
             state=name, theta=theta, phi=phi,
             oracleFidelity=oracle_fidelity(psi_of(theta, phi), m0, m1, m1 == 1, m0 == 1))

print(f"generic states: {[(n, round(t, 6), round(p, 6), round(worst_wrong(t, p), 6)) for n, t, p in generic]}", file=sys.stderr)
