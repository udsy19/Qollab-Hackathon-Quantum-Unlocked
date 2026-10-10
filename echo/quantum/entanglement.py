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
    marginal = {"0": float(receiver.data[0, 0].real), "1": float(receiver.data[1, 1].real)}

    probs = {}
    for index, p in enumerate(state.probabilities()):
        probs[f"sender={index & 1},receiver={(index >> 1) & 1}"] = p

    hh = QuantumCircuit(2)
    hh.h([0, 1])
    z_agree = _agreement(state)
    x_agree = _agreement(state.evolve(hh))

    facts = [
        f"Receiver alone: P(0) = {marginal['0']:.6f}, P(1) = {marginal['1']:.6f}, whatever the sender did.",
        "Entanglement alone sends no message: the receiver's local results look the same for I, X and Z.",
        f"Comparing both logs afterwards: Z-basis bits agree with probability {z_agree:.6f}, X-basis bits with probability {x_agree:.6f}.",
        "That comparison needs a classical channel; it is the amber link, not the entanglement, that carries information.",
    ]
    return experiment_result(
        experiment="bell_signalling",
        engine="exact_qiskit_local",
        kind="receiver_marginal",
        circuit_description=f"H(q0); CX(q0 -> q1) Bell pair; sender applies {sender_gate} on q0 (sender), q1 = receiver",
        qubits=2,
        parameters={"senderGate": sender_gate},
        probabilities=probs,
        facts=facts,
        circuit_text=qc.draw(output="text"),
        details={
            "receiverMarginal": marginal,
            "receiverPurity": float(receiver.purity().real),
            "receiverBlochVector": bloch_vector(receiver),
            "zBasisAgreement": z_agree,
            "xBasisAgreement": x_agree,
        },
    )
