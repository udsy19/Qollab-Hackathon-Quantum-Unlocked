"""Independent physics oracle for ECHO: ONE OF ONE (red-team, not product code).

Ground truth for no-cloning, no-signalling and teleportation, derived two ways that do not
share code: (1) a hand-written numpy tensor model in which every qubit is its own array axis,
so no bit-ordering convention exists to get wrong; (2) Qiskit `Statevector` / `DensityMatrix`
/ `partial_trace` / `state_fidelity`. Tests require the two to agree, so a convention slip in
either path goes red. Nothing here reads or imports `echo/` (gate-independence law 4).

Register contract (ECHO_MASTER_VISION.md §7.1): q0 = source, q1 = Alice's local Bell half,
q2 = Bob's receiver half. Bell pair H(q1) CX(q1,q2); Bell measurement CX(q0,q1) H(q0);
m0 = readout of q0, m1 = readout of q1. Receiver: X iff m1 = 1, Z iff m0 = 1.

Imports are restricted to what Qollab's Pyodide Qiskit ships: numpy, qiskit core circuit
construction, qiskit.quantum_info and the pure-Python BasicSimulator. No qiskit_aer.
"""
from __future__ import annotations

import itertools
import math

import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.circuit import ClassicalRegister, QuantumRegister
from qiskit.providers.basic_provider import BasicSimulator
from qiskit.quantum_info import DensityMatrix, Operator, Statevector, partial_trace, state_fidelity

BITS = [(0, 0), (0, 1), (1, 0), (1, 1)]  # (m0, m1)
CORRECTIONS = [(False, False), (True, False), (False, True), (True, True)]  # (applyX, applyZ)

I2 = np.eye(2, dtype=complex)
X = np.array([[0, 1], [1, 0]], dtype=complex)
Y = np.array([[0, -1j], [1j, 0]], dtype=complex)
Z = np.array([[1, 0], [0, -1]], dtype=complex)
H = np.array([[1, 1], [1, -1]], dtype=complex) / math.sqrt(2)
S = np.diag([1, 1j]).astype(complex)
T = np.diag([1, np.exp(1j * math.pi / 4)]).astype(complex)
P = [np.diag([1, 0]).astype(complex), np.diag([0, 1]).astype(complex)]  # |0><0|, |1><1|
GATES = {"I": I2, "X": X, "Y": Y, "Z": Z, "H": H, "S": S, "T": T}


# ---------------------------------------------------------------- input states

def ket(theta: float, phi: float) -> np.ndarray:
    """cos(theta/2)|0> + e^{i phi} sin(theta/2)|1>  ==  U(theta, phi, 0)|0> in Qiskit."""
    return np.array([math.cos(theta / 2), np.exp(1j * phi) * math.sin(theta / 2)], dtype=complex)


def random_states(n: int = 50, seed: int = 20261011) -> list[tuple[str, float, float]]:
    """Haar-random single-qubit states as (name, theta, phi); theta = arccos(1 - 2u)."""
    rng = np.random.default_rng(seed)
    return [(f"haar{k:02d}", float(math.acos(1 - 2 * rng.random())), float(2 * math.pi * rng.random()))
            for k in range(n)]


def named_states() -> list[tuple[str, float, float]]:
    """The six+ states of vision §7.4. 'ry_then_rz' is circuit order ry(1.137) then rz(0.44),
    i.e. the operator RZ(0.44)·RY(1.137)|0> (equal to U(1.137, 0.44) up to global phase)."""
    return [
        ("|0>", 0.0, 0.0),
        ("|1>", math.pi, 0.0),
        ("|+>", math.pi / 2, 0.0),
        ("|->", math.pi / 2, math.pi),
        ("|+i>", math.pi / 2, math.pi / 2),
        ("ry_then_rz", 1.137, 0.44),
    ]


def bloch(psi: np.ndarray) -> tuple[float, float, float]:
    rho = np.outer(psi, psi.conj())
    return tuple(float(np.real(np.trace(rho @ p))) for p in (X, Y, Z))


def random_unitary(dim: int, rng: np.random.Generator) -> np.ndarray:
    m = rng.normal(size=(dim, dim)) + 1j * rng.normal(size=(dim, dim))
    q, r = np.linalg.qr(m)
    return q * (np.diag(r) / np.abs(np.diag(r)))


# ---------------------------------------------------------------- path 1: numpy tensors
# Each qubit is one axis of a (2,)*n array; axis k IS qubit k. No flattening, no endianness.

def apply1(t: np.ndarray, u: np.ndarray, q: int) -> np.ndarray:
    return np.moveaxis(np.tensordot(u, t, axes=([1], [q])), 0, q)


def apply_cx(t: np.ndarray, c: int, tq: int) -> np.ndarray:
    out = t.copy()
    idx = [slice(None)] * t.ndim
    idx[c] = 1
    sub = t[tuple(idx)]
    tq_sub = tq if tq < c else tq - 1
    out[tuple(idx)] = np.moveaxis(np.tensordot(X, sub, axes=([1], [tq_sub])), 0, tq_sub)
    return out


def np_teleport_pre_measurement(psi: np.ndarray) -> np.ndarray:
    t = np.zeros((2, 2, 2), dtype=complex)
    t[:, 0, 0] = psi
    t = apply1(t, H, 1)
    t = apply_cx(t, 1, 2)       # Bell pair on (q1, q2)
    t = apply_cx(t, 0, 1)
    t = apply1(t, H, 0)         # Bell-basis rotation on (q0, q1)
    return t


def np_branches(psi: np.ndarray) -> dict[tuple[int, int], tuple[float, np.ndarray]]:
    """(m0, m1) -> (probability, Bob's normalized pre-correction ket). Axis 0 = q0 = m0."""
    t = np_teleport_pre_measurement(psi)
    out = {}
    for m0, m1 in BITS:
        bob = t[m0, m1, :]
        p = float(np.real(np.vdot(bob, bob)))
        out[(m0, m1)] = (p, bob / math.sqrt(p))
    return out


def tensor_to_qiskit(t: np.ndarray) -> Statevector:
    """The ONE place the bit-order convention is written: Qiskit index = sum_k a_k 2^k."""
    flat = np.zeros(2 ** t.ndim, dtype=complex)
    for bits in itertools.product((0, 1), repeat=t.ndim):
        flat[sum(b << k for k, b in enumerate(bits))] = t[bits]
    return Statevector(flat)


# ---------------------------------------------------------------- path 2: Qiskit

def correction_rule(m0: int, m1: int) -> tuple[bool, bool]:
    """(applyX, applyZ) per vision §7.1: X iff m1 = 1, Z iff m0 = 1."""
    return (m1 == 1, m0 == 1)


def correction_operator(apply_x: bool, apply_z: bool) -> Operator:
    qc = QuantumCircuit(1)
    if apply_x:
        qc.x(0)
    if apply_z:
        qc.z(0)
    return Operator(qc)


def teleport_circuit(theta: float, phi: float) -> QuantumCircuit:
    qc = QuantumCircuit(3)
    qc.u(theta, phi, 0, 0)
    qc.h(1)
    qc.cx(1, 2)
    qc.cx(0, 1)
    qc.h(0)
    return qc


def qk_branches(theta: float, phi: float) -> dict:
    """(m0, m1) -> (prob, Bob rho, q0 rho, q1 rho) after projecting q0 onto |m0>, q1 onto |m1>."""
    sv = Statevector.from_instruction(teleport_circuit(theta, phi))
    out = {}
    for m0, m1 in BITS:
        proj = sv.evolve(Operator(P[m0]), qargs=[0]).evolve(Operator(P[m1]), qargs=[1])
        p = float(np.real(np.vdot(proj.data, proj.data)))
        normed = Statevector(proj.data / math.sqrt(p))
        out[(m0, m1)] = (p,
                         partial_trace(normed, [0, 1]),
                         partial_trace(normed, [1, 2]),
                         partial_trace(normed, [0, 2]))
    return out


def corrected_fidelity(bob: DensityMatrix, apply_x: bool, apply_z: bool, theta: float, phi: float) -> float:
    fixed = bob.evolve(correction_operator(apply_x, apply_z))
    return float(state_fidelity(fixed, Statevector(ket(theta, phi))))


def derive_rule_by_search(theta: float, phi: float) -> dict[tuple[int, int], list[tuple[bool, bool]]]:
    """For each branch, every correction reaching fidelity 1. Derived by trying all four, so it
    does not consult `correction_rule` — the independent check of that function."""
    found = {}
    for bits, (_, bob, _, _) in qk_branches(theta, phi).items():
        found[bits] = [c for c in CORRECTIONS if corrected_fidelity(bob, *c, theta, phi) > 1 - 1e-9]
    return found


def fidelity_table(states) -> list[dict]:
    rows = []
    for name, th, ph in states:
        for bits, (p, bob, _, _) in qk_branches(th, ph).items():
            rows.append({"state": name, "m0": bits[0], "m1": bits[1], "p": p,
                         **{f"X{int(c[0])}Z{int(c[1])}": corrected_fidelity(bob, *c, th, ph) for c in CORRECTIONS}})
    return rows


def format_fidelity_table(rows) -> str:
    lines = ["state        m0 m1  P(m)   none     X        Z        X+Z      <- fidelity after correction",
             "                           X0Z0     X1Z0     X0Z1     X1Z1"]
    for r in rows:
        lines.append(f"{r['state']:<12} {r['m0']}  {r['m1']}  {r['p']:.3f}  "
                     + "  ".join(f"{r[k]:.5f}" for k in ("X0Z0", "X1Z0", "X0Z1", "X1Z1")))
    return "\n".join(lines)


def deferred_measurement_circuit(theta: float, phi: float) -> QuantumCircuit:
    """Vision §7.4 / §10.5: coherent corrections CX(q1,q2), CZ(q0,q2). Gate-level check only,
    NOT a model of a physically separated link."""
    qc = teleport_circuit(theta, phi)
    qc.cx(1, 2)
    qc.cz(0, 2)
    return qc


# ---------------------------------------------------------------- endianness

def bits_from_counts_key(key: str, m0_clbit: int = 0, m1_clbit: int = 1) -> tuple[int, int]:
    """Qiskit counts keys print the HIGHEST clbit index first: in '01', c1 = 0 and c0 = 1.
    Registers are space-separated, last-added register leftmost."""
    flat = key.replace(" ", "")
    return int(flat[-1 - m0_clbit]), int(flat[-1 - m1_clbit])


def sample_counts(qc: QuantumCircuit, shots: int = 256, seed: int = 7) -> dict[str, int]:
    backend = BasicSimulator()
    return dict(backend.run(transpile(qc, backend), shots=shots, seed_simulator=seed).result().get_counts())


def endianness_fixture(m0: int, m1: int) -> QuantumCircuit:
    """Deterministic m0, m1 written to c0, c1 (single 2-bit register)."""
    qc = QuantumCircuit(2, 2)
    if m0:
        qc.x(0)
    if m1:
        qc.x(1)
    qc.measure(0, 0)  # q0 -> c0 = m0
    qc.measure(1, 1)  # q1 -> c1 = m1
    return qc


def measured_teleport_probe(basis: str) -> QuantumCircuit:
    """Full measured protocol with NO correction, Bob measured into c2.
    Source |0>, Z basis: Bob = X^m1 Z^m0 |0> ~ |m1>, so Bob's bit must equal m1.
    Source |+>, X basis: Bob ~ Z^m0 X^m1 |+> ~ |(-)^m0>, so Bob's bit must equal m0.
    Ties each clbit to its physical meaning with real sampling, not with a label."""
    qc = QuantumCircuit(3, 3)
    if basis == "X":
        qc.h(0)
    qc.h(1)
    qc.cx(1, 2)
    qc.cx(0, 1)
    qc.h(0)
    qc.measure(0, 0)
    qc.measure(1, 1)
    if basis == "X":
        qc.h(2)
    qc.measure(2, 2)
    return qc


def two_register_fixture() -> QuantumCircuit:
    qc = QuantumCircuit(QuantumRegister(2, "q"), ClassicalRegister(1, "m0"), ClassicalRegister(1, "m1"))
    qc.x(0)               # m0 = 1, m1 = 0
    qc.measure(0, qc.cregs[0][0])
    qc.measure(1, qc.cregs[1][0])
    return qc


def dynamic_feedforward_supported_by_basic_simulator() -> tuple[bool, str]:
    qc = QuantumCircuit(2, 1)
    qc.h(0)
    qc.measure(0, 0)
    with qc.if_test((qc.clbits[0], 1)):
        qc.x(1)
    try:
        sample_counts(qc, shots=8)
        return True, "ran"
    except Exception as exc:  # noqa: BLE001 — the message is the finding
        return False, f"{type(exc).__name__}: {exc}"


# ---------------------------------------------------------------- no-cloning

def naive_cnot_clone(theta: float, phi: float) -> Statevector:
    qc = QuantumCircuit(2)
    qc.u(theta, phi, 0, 0)
    qc.cx(0, 1)
    return Statevector.from_instruction(qc)


def buzek_hillery_clone(psi: np.ndarray) -> Statevector:
    """Optimal universal symmetric 1->2 cloner as an isometry on axes (copyA, copyB, ancilla):
    |0> -> sqrt(2/3)|00>|0> + sqrt(1/6)(|01>+|10>)|1>,  |1> -> sqrt(2/3)|11>|1> + sqrt(1/6)(|01>+|10>)|0>.
    Bužek & Hillery, PRA 54, 1844 (1996); optimality: Gisin & Massar, PRL 79, 2153 (1997)."""
    v0 = np.zeros((2, 2, 2), dtype=complex)
    v1 = np.zeros((2, 2, 2), dtype=complex)
    a, b = math.sqrt(2 / 3), math.sqrt(1 / 6)
    v0[0, 0, 0] = a
    v0[0, 1, 1] = v0[1, 0, 1] = b
    v1[1, 1, 1] = a
    v1[0, 1, 0] = v1[1, 0, 0] = b
    return tensor_to_qiskit(psi[0] * v0 + psi[1] * v1)


def copy_fidelities(sv: Statevector, psi: np.ndarray) -> tuple[float, float]:
    """Fidelity of copy qubit 0 and copy qubit 1 with psi (any further qubits are ancilla)."""
    target = Statevector(psi)
    qs = range(sv.num_qubits)
    a = partial_trace(sv, [q for q in qs if q != 0])
    b = partial_trace(sv, [q for q in qs if q != 1])
    return float(state_fidelity(a, target)), float(state_fidelity(b, target))


def basis_cloning_unitary(rng: np.random.Generator) -> np.ndarray:
    """A random 2-qubit unitary (Qiskit order, q0 = source, q1 = blank) that clones |0> and |1>
    perfectly: U|q0=0,q1=0> = |00>, U|q0=1,q1=0> = |q0=1,q1=1>. The other two columns are a
    random completion — linearity then fixes U|+,0> whatever the completion is."""
    fixed = {0b00: 0b00, 0b01: 0b11}  # input index (q0 + 2 q1) -> output index
    u = np.zeros((4, 4), dtype=complex)
    for i, o in fixed.items():
        u[o, i] = 1
    free_in = [k for k in range(4) if k not in fixed]
    free_out = [k for k in range(4) if k not in fixed.values()]
    q = random_unitary(2, rng)
    for j, i in enumerate(free_in):
        for r, o in enumerate(free_out):
            u[o, i] = q[r, j]
    return u


# ---------------------------------------------------------------- no-signalling

def _nonselective(rho: DensityMatrix, q: int, basis) -> DensityMatrix:
    """rho -> sum_k P_k rho P_k on qubit q: a measurement whose outcome Bob has NOT been told."""
    acc = np.zeros_like(rho.data)
    for pk in basis:
        op = Operator(pk)
        acc = acc + rho.evolve(op, qargs=[q]).data
    return DensityMatrix(acc)


def alice_acts(rho: DensityMatrix, action, alice_qargs: list[int]) -> DensityMatrix:
    """Apply a LOCAL Alice action. `action` is a gate name, 'measZ', 'measX', 'bell_measure',
    or a unitary matrix on `alice_qargs` (Qiskit order)."""
    if isinstance(action, np.ndarray):
        return rho.evolve(Operator(action), qargs=alice_qargs)
    if action == "measZ":
        for q in alice_qargs:
            rho = _nonselective(rho, q, P)
        return rho
    if action == "measX":
        for q in alice_qargs:
            rho = _nonselective(rho, q, [H @ P[0] @ H, H @ P[1] @ H])
        return rho
    if action == "bell_measure":
        a, b = alice_qargs
        qc = QuantumCircuit(rho.num_qubits)
        qc.cx(a, b)
        qc.h(a)
        rho = rho.evolve(qc)
        return _nonselective(_nonselective(rho, a, P), b, P)
    return rho.evolve(Operator(GATES[action]), qargs=[alice_qargs[0]])


def bob_rho(rho: DensityMatrix, bob: int) -> np.ndarray:
    return partial_trace(rho, [q for q in range(rho.num_qubits) if q != bob]).data


def bell_pair() -> DensityMatrix:
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)
    return DensityMatrix.from_instruction(qc)


def joint_same_probability(sender_gate: str, basis: str = "Z") -> float:
    """P(Alice's bit == Bob's bit) for the Bell pair after Alice's gate on q0, both measured in
    `basis`. Visible only once both logs are compared over a classical channel."""
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)
    if sender_gate != "I":
        getattr(qc, sender_gate.lower())(0)
    if basis == "X":
        qc.h(0)
        qc.h(1)
    probs = Statevector.from_instruction(qc).probabilities_dict()
    return float(probs.get("00", 0) + probs.get("11", 0))


if __name__ == "__main__":
    print(format_fidelity_table(fidelity_table(named_states())))
