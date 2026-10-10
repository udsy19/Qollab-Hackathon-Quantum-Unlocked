"""Mission 1, THE COPY (vision §7.2): the naive CNOT "duplicator" on prepared calibration states.

CNOT(source -> blank |0>) maps a|0>+b|1> to a|00>+b|11>. That is two copies only when a or b is 0;
for any superposition the outputs are entangled and each alone is mixed. Whether the outputs are two
independent copies is DERIVED from the computed state, never looked up by state name.
"""
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity

from . import prepare, probability_table, state_gates, target_state
from .formats import experiment_result

TOL = 1e-9


def run_calibration(state_name="plus"):
    """Try to copy prepared state `state_name` (q0 = source) onto a blank qubit (q1 = copy)."""
    gates, label = state_gates(state_name)
    qc = QuantumCircuit(2)
    prepare(qc, gates, 0)
    qc.cx(0, 1)
    joint = Statevector.from_instruction(qc)
    psi = target_state(gates)

    # partial_trace(state, [k]) traces OUT qubit k.
    source = partial_trace(joint, [1])
    copy = partial_trace(joint, [0])
    two_copies = psi.tensor(psi)
    joint_fid = float(state_fidelity(joint, two_copies))
    source_purity = float(source.purity().real)
    copy_purity = float(copy.purity().real)
    independent = joint_fid > 1 - TOL
    entangled = source_purity < 1 - TOL

    # keyQubits [1, 0]: key "10" means q1 (copy) = 1, q0 (source) = 0.
    probs, key_qubits = probability_table(joint, [0, 1])

    if independent:
        facts = [
            "Two matching basis values: this input was already a Z-basis state, so the circuit only copied a known classical value.",
            "This does not work for an unknown state; try a superposition.",
        ]
    else:
        facts = [
            f"Not two independent copies: the result overlaps |psi>⊗|psi> with fidelity {joint_fid:.6f}.",
            f"Each output alone has purity {source_purity:.6f}; an independent copy of a pure state would have purity 1.",
        ]
        if entangled:
            facts.append("The two outputs are entangled with each other, not copies of the input.")
    facts.append("No-cloning: no circuit copies an arbitrary unknown qubit; this booth only uses known calibration states.")

    return experiment_result(
        experiment="cloning",
        engine="exact_qiskit_local",
        circuit_description=f"prepare {label} on q0 (source); CX(q0 -> q1 blank copy)",
        qubits=2,
        parameters={"state": state_name},
        probabilities=probs,
        key_qubits=key_qubits,
        # |<psi psi|out>|^2, computed from the joint state above: Mission 1's rules read this field
        # (>= FIDELITY_PASS on a basis state, below it on a superposition), never the state's name.
        fidelity=joint_fid,
        facts=facts,
        observables={
            "purityQ0": source_purity,
            "purityQ1": copy_purity,
            "fidelityQ0WithInput": float(state_fidelity(source, psi)),
            "fidelityQ1WithInput": float(state_fidelity(copy, psi)),
            "jointFidelityWithTwoCopies": joint_fid,
        },
    )
