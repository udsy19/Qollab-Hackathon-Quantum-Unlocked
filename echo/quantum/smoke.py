"""G0 platform smoke: the smallest real Qiskit computations the JS bridge can reach.

Called from main.js through `.callPromising(...)`. Every function returns plain
serialisable Python objects (dict / list / str / float), never Qiskit objects,
except `bell_measure_circuit`, whose QuantumCircuit is handed straight to
`backend.run` and never inspected in JS.
"""

import sys

import qiskit
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity


def _bell_unitary_part():
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)
    return qc


def bell_probabilities():
    """Exact (statevector) facts about |Phi+> = (|00> + |11>)/sqrt(2).

    These are probabilities, not sampled counts: they come from the amplitudes,
    so they are exactly 0.5 / 0.5 with no shot noise.
    """
    sv = Statevector.from_instruction(_bell_unitary_part())
    probs = {k: round(float(v), 12) for k, v in sv.probabilities_dict().items()}
    # Tracing out either half of a Bell pair leaves the maximally mixed state:
    # purity 0.5 means the local half alone carries no information (the root of
    # no-signalling, which mission 2 teaches).
    rho_q0 = partial_trace(sv, [1])
    target = Statevector([2 ** -0.5, 0, 0, 2 ** -0.5])
    return {
        "kind": "exact_statevector",
        "state": "Phi+ = (|00> + |11>)/sqrt(2)",
        "probabilities": probs,
        "reduced_purity_q0": round(float(rho_q0.purity().real), 12),
        "fidelity_with_phi_plus": round(float(state_fidelity(sv, target)), 12),
        "qiskit_version": qiskit.__version__,
        "python_version": sys.version.split()[0],
        "platform": sys.platform,
    }


def bell_measure_circuit():
    """The single circuit sent to the selected backend: a measured Bell pair.

    Ideal counts are only '00' and '11', roughly half each; a noise model may
    add a few '01'/'10'.
    """
    qc = _bell_unitary_part()
    qc.measure_all()
    return qc
