"""Mission 2, THE CONNECTION (vision §7.3): a Bell pair alone carries no message.

q0 = sender's half, q1 = receiver's half, (|00>+|11>)/√2. The sender applies I, X or Z to q0 only.
The receiver's reduced state (partial trace over the sender) is I/2 every time, so receiver-only
statistics never change. What does change is the JOINT record, which can only be seen by bringing
both logs together over a classical channel.
"""
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace

from . import bloch_vector
from .formats import experiment_result

SENDER_GATES = ("I", "X", "Z")


def _agreement(state):
    """P(sender bit == receiver bit) for a two-qubit Statevector, q0 = sender, q1 = receiver."""
    p = state.probabilities()  # index = q0 + 2*q1
    return float(p[0] + p[3])


def bell_signalling(sender_gate="I"):
    if sender_gate not in SENDER_GATES:
        raise ValueError(f"sender gate must be one of {SENDER_GATES}")
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)
    if sender_gate == "X":
        qc.x(0)
    elif sender_gate == "Z":
        qc.z(0)
    state = Statevector.from_instruction(qc)

    receiver = partial_trace(state, [0])  # trace OUT the sender, keep the receiver
    # The probability table is the RECEIVER-ONLY view (keyQubits [1]), the one the puzzle shows, and it
    # is EXACT: read off the partial trace, never sampled (owner ruling 2026-10-10: Mission 2's receiver
    # panel shows exact probabilities only). The joint record is invisible at the receiver, so it
    # travels only as the agreement observables.
    marginal = {"0": float(receiver.data[0, 0].real), "1": float(receiver.data[1, 1].real)}

    hh = QuantumCircuit(2)
    hh.h([0, 1])
    z_agree = _agreement(state)
    x_agree = _agreement(state.evolve(hh))

    facts = [
        f"Receiver alone, EXACT (partial trace, not sampled): P(0) = {marginal['0']:.6f}, P(1) = {marginal['1']:.6f}, "
        "whatever the sender did.",
        "Entanglement alone sends no message: the receiver's local results look the same for I, X and Z.",
        f"Comparing both logs afterwards: Z-basis bits agree with probability {z_agree:.6f}, X-basis bits with probability {x_agree:.6f}.",
        "That comparison needs a classical channel; it is the amber link, not the entanglement, that carries information.",
    ]
    bx, by, bz = bloch_vector(receiver)
    return experiment_result(
        experiment="bell_signalling",
        engine="exact_qiskit_local",
        circuit_description=f"H(q0); CX(q0 -> q1) Bell pair; sender applies {sender_gate} on q0 (sender), q1 = receiver",
        qubits=2,
        parameters={"senderGate": sender_gate},
        probabilities=marginal,
        key_qubits=[1],
        facts=facts,
        observables={
            "receiverPurity": float(receiver.purity().real),
            "receiverBlochX": bx,
            "receiverBlochY": by,
            "receiverBlochZ": bz,
            "zBasisAgreement": z_agree,
            "xBasisAgreement": x_agree,
        },
    )
