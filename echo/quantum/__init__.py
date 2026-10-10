"""ECHO quantum engine: exact local Qiskit experiments for the three missions.

Imported from JS as `quantum.cloning`, `quantum.entanglement`, `quantum.teleportation` (Qollab dotted
module names). Every public function returns a plain dict built by `formats.experiment_result`.

Qiskit is little-endian: qubit 0 is the RIGHTMOST character of a bitstring label and the least
significant bit of a statevector index. No code here parses raw bitstrings; outcome keys are built
from explicit register names ("m0=1,m1=0", "sender=0,receiver=1").
"""
from qiskit import QuantumCircuit
from qiskit.quantum_info import Pauli, Statevector

# Prepared calibration states: name -> (gate sequence on |0>, plain-language label).
# The generic Bloch points apply RY(theta) then RZ(phi), the order of vision §10.5.
STATES = {
    "zero": ((), "|0>"),
    "one": ((("x",),), "|1>"),
    "plus": ((("h",),), "|+> = (|0>+|1>)/√2"),
    "minus": ((("x",), ("h",)), "|-> = (|0>-|1>)/√2"),
    "phase": ((("h",), ("s",)), "(|0>+i|1>)/√2"),
    "bloch_a": ((("ry", 1.137), ("rz", 0.44)), "RY(1.137) then RZ(0.44) on |0>"),
    "bloch_b": ((("ry", 2.3), ("rz", -1.9)), "RY(2.3) then RZ(-1.9) on |0>"),
}


def prepare(qc, state_name, qubit):
    """Append the preparation of `state_name` on `qubit` of `qc`."""
    if state_name not in STATES:
        raise ValueError(f"unknown prepared state {state_name!r}; choose one of {sorted(STATES)}")
    for gate, *params in STATES[state_name][0]:
        getattr(qc, gate)(*params, qubit)


def target_state(state_name):
    """The one-qubit state |psi> itself, for fidelity comparisons."""
    qc = QuantumCircuit(1)
    prepare(qc, state_name, 0)
    return Statevector.from_instruction(qc)


def bloch_vector(rho):
    """[<X>, <Y>, <Z>] of a one-qubit DensityMatrix; [0,0,0] means maximally mixed."""
    return [float(rho.expectation_value(Pauli(p)).real) for p in "XYZ"]
