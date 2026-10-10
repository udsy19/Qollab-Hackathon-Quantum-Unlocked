"""ECHO quantum engine: exact local Qiskit experiments for the three missions.

Imported from JS as `quantum.cloning`, `quantum.entanglement`, `quantum.teleportation` (Qollab dotted
module names). Every public function returns a plain dict built by `formats.experiment_result`.

Qiskit is little-endian: qubit 0 is the RIGHTMOST character of a bitstring label and the least
significant bit of a statevector index. Outcome tables use Qiskit's own keys and always travel with
`keyQubits` (platform contract), which names the qubit behind each key character, left to right.
"""
import math

from qiskit import QuantumCircuit
from qiskit.quantum_info import DensityMatrix, Pauli, Statevector

# Prepared states: name -> (gate sequence on |0>, plain-language label).
# The generic Bloch points apply RY(theta) then RZ(phi), the order of vision §10.5.
STATES = {
    "zero": ((), "|0>"),
    "one": ((("x",),), "|1>"),
    "plus": ((("h",),), "|+> = (|0>+|1>)/√2"),
    "minus": ((("x",), ("h",)), "|-> = (|0>-|1>)/√2"),
    "phase": ((("h",), ("s",)), "(|0>+i|1>)/√2"),
    "bloch_a": ((("ry", 1.137), ("rz", 0.44)), "RY(1.137) then RZ(0.44) on |0>"),
    "bloch_b": ((("ry", 2.3), ("rz", -1.9)), "RY(2.3) then RZ(-1.9) on |0>"),
    # The story token (vision §7.4): a fixed generic point, Bloch r = (-0.773, -0.454, -0.443), so
    # every wrong correction would score r_P^2 <= 0.60. Its angles never appear in a result: its
    # label says nothing, and only `teleportation.live_commit` may prepare it (story_token=True).
    "story_token": ((("ry", 2.03), ("rz", -2.61)), "the story token (never shown)"),
}
# Platform's STORY_TOKEN_ID (echo/contracts.js): the one name for the token, also the commit's
# `parameters.stateId`. test_commit_seam pins the two together.
STORY_TOKEN_ID = "story_token"
# A dry run's state: fresh random angles, passed explicitly from the bits call to the corrections
# call (never held here between calls).
CALIBRATION = "calibration"
# "Generic": a wrong X/Z leaves a residual Pauli P, and the receiver's fidelity is then r_P^2, the
# square of that Bloch component (vault/Reports/quantum-physics-review.md §1). Requiring every
# r_P^2 <= 0.9 (|r_P| <= 0.949) means every wrong choice scores <= 0.9, far below the 0.999999 pass
# line, and moves the receiver's arrow by >= 2*asin(sqrt(0.1)) = 36.9 degrees. 0.9 is platform's
# GENERIC_MAX_WRONG_FIDELITY (echo/contracts.js, contracts-v2), so the engine accepts exactly the
# states the contract lets the game send.
GENERIC_MAX_WRONG_FIDELITY = 0.9
# Platform's FIDELITY_PASS (§7.4 ideal-validation band); test_commit_seam pins the two together.
FIDELITY_PASS = 0.999999


def calibration_gates(theta, phi):
    """The gate sequence of a calibration point: RY(theta) then RZ(phi) on |0>."""
    return (("ry", theta), ("rz", phi))


def state_gates(state, theta=None, phi=None, story_token=False):
    """Resolve a state spec to (gates, label). `state` is a catalogue name, or CALIBRATION with its
    angles. The token is refused unless the caller is the one story commit."""
    if state == CALIBRATION:
        for name, v in (("theta", theta), ("phi", phi)):
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
                raise ValueError(f"a calibration state needs finite numeric {name}, got {v!r}")
        gates = calibration_gates(float(theta), float(phi))
        r = bloch_vector(DensityMatrix(target_state(gates)))
        if max(c * c for c in r) > GENERIC_MAX_WRONG_FIDELITY:
            raise ValueError(f"calibration state is not generic: Bloch vector {[round(c, 6) for c in r]} lets a wrong "
                             f"correction score above {GENERIC_MAX_WRONG_FIDELITY}, so the mistake could pass unseen")
        return gates, f"RY({float(theta):.6f}) then RZ({float(phi):.6f}) on |0>"
    if theta is not None or phi is not None:
        raise ValueError(f"angles are only accepted for state {CALIBRATION!r}, not {state!r}")
    if state == STORY_TOKEN_ID and not story_token:
        raise ValueError("the story token is not a calibration state: it is consumed once, at the final commit")
    if state not in STATES:
        raise ValueError(f"unknown prepared state {state!r}; choose one of {sorted(set(STATES) - {STORY_TOKEN_ID})} or {CALIBRATION!r}")
    return STATES[state]


def prepare(qc, gates, qubit):
    """Append a gate sequence (from `state_gates`) on `qubit` of `qc`."""
    for gate, *params in gates:
        getattr(qc, gate)(*params, qubit)


def target_state(gates):
    """The one-qubit state |psi> itself, for fidelity comparisons."""
    qc = QuantumCircuit(1)
    prepare(qc, gates, 0)
    return Statevector.from_instruction(qc)


def bloch_vector(rho):
    """[<X>, <Y>, <Z>] of a one-qubit DensityMatrix; [0,0,0] means maximally mixed."""
    return [float(rho.expectation_value(Pauli(p)).real) for p in "XYZ"]


def probability_table(state, qargs):
    """Exact outcome probabilities over `qargs`, EVERY outcome listed (zeros included, so the UI can
    show "never 01"). Returns (table, keyQubits). `Statevector.probabilities(qargs)` indexes outcome
    i with qargs[0] as its least significant bit, so the key, written most significant first, reads
    qargs reversed."""
    probs = state.probabilities(list(qargs))
    n = len(qargs)
    return {format(i, f"0{n}b"): float(p) for i, p in enumerate(probs)}, list(reversed(qargs))
