"""The one selected-backend job of an ECHO run: a Bell-pair correlation check (vision §8.4, §10.7).

Every puzzle in the game is computed locally with exact Qiskit. This module is the only place
that touches the `backend` chosen in Qollab's Select QPU dialog, and it does so at most once per
run: IonQ backends accept one job per run, and a second `backend.run` stops the run
(https://qollab.xyz/learn/docs/runtime-environment#one-job-per-run-on-ionq).

The backend is never created or named here. In a JS project it is a JS global; main.js passes it
in, through `.callPromising` — a plain call on an IonQ backend fails with an XHR ConnectionError
(https://qollab.xyz/learn/docs/js-qiskit-projects).

Bit order: the circuit measures q0 -> clbit 0 and q1 -> clbit 1. Qiskit writes count keys as
"c1 c0", so the RIGHTMOST character is q0. qiskit-ionq follows the same convention.
"""

from numbers import Integral

from qiskit import QuantumCircuit

from .formats import experiment_result

DEFAULT_SHOTS = 256
NUM_QUBITS = 2
# Explicit register mapping, written once: classical bit i holds the readout of QUBIT_OF_CLBIT[i].
QUBIT_OF_CLBIT = (0, 1)
# Count keys returned to the game read q1 then q0, left to right (Qiskit's order), declared as the
# contract's keyQubits so the UI never has to know the convention.
KEY_QUBITS = [1, 0]
BACKEND_EXPERIMENT = "backend_verification"  # the owner's value (owner-answers 2026-10-10)

_job_submitted = False


class BackendJobAlreadyUsed(RuntimeError):
    """Raised on a second verification attempt in the same run."""


def build_backend_verification_circuit():
    """H on q0, CNOT q0->q1, measure q0->c0 and q1->c1. Gate-only, so every backend accepts it."""
    qc = QuantumCircuit(NUM_QUBITS, NUM_QUBITS, name="echo_backend_verification")
    qc.h(0)
    qc.cx(0, 1)
    for clbit, qubit in enumerate(QUBIT_OF_CLBIT):
        qc.measure(qubit, clbit)
    return qc


def describe_backend_verification_circuit():
    """JSON-safe description, derived from the circuit that is actually submitted."""
    qc = build_backend_verification_circuit()
    operations = [
        {
            "gate": inst.operation.name,
            "qubits": [qc.find_bit(q).index for q in inst.qubits],
            "clbits": [qc.find_bit(c).index for c in inst.clbits],
        }
        for inst in qc.data
    ]
    return {
        "qubits": qc.num_qubits,
        "clbits": qc.num_clbits,
        "operations": operations,
        "drawing": str(qc.draw(output="text")),
    }


def _clbit_values(key):
    """Turn one count key into (c0, c1). Accepts Qiskit bitstrings ("01") and hex ("0x1")."""
    if not isinstance(key, str):
        raise ValueError(f"count key {key!r} is not a string")
    if key.startswith("0x"):
        try:
            value = int(key, 16)
        except ValueError:
            raise ValueError(f"count key {key!r} is not valid hex") from None
        if value >= 2 ** NUM_QUBITS:
            raise ValueError(f"count key {key!r} sets a classical bit this circuit does not have")
        return tuple((value >> clbit) & 1 for clbit in range(NUM_QUBITS))
    if len(key) != NUM_QUBITS or set(key) - {"0", "1"}:
        raise ValueError(f"count key {key!r} is not a {NUM_QUBITS}-bit string")
    # Rightmost character is clbit 0.
    return tuple(int(key[-1 - clbit]) for clbit in range(NUM_QUBITS))


def interpret_counts(raw_counts, backend_name, shots_requested=None):
    """Raw counts from the selected backend -> ExperimentResult dict (vision §8.4).

    Anything malformed or empty raises ValueError: the UI must show "verification unavailable",
    never an invented or empty success.
    """
    if hasattr(raw_counts, "to_py"):  # counts handed over from JS arrive as a JsProxy
        raw_counts = raw_counts.to_py()
    if not isinstance(raw_counts, dict) or not raw_counts:
        raise ValueError(f"expected a non-empty dict of counts, got {raw_counts!r}")

    # Keys are rewritten so character i (left to right) is the readout of KEY_QUBITS[i].
    counts = {}
    for key, count in raw_counts.items():
        if isinstance(count, bool) or not isinstance(count, Integral) or count < 0:
            raise ValueError(f"count for {key!r} is {count!r}, not a non-negative integer")
        clbits = _clbit_values(key)
        qubit_bit = {QUBIT_OF_CLBIT[c]: bit for c, bit in enumerate(clbits)}
        canonical = "".join(str(qubit_bit[q]) for q in KEY_QUBITS)
        counts[canonical] = counts.get(canonical, 0) + int(count)

    shots = sum(counts.values())
    if shots == 0:
        raise ValueError("the backend returned zero shots")
    correlated = counts.get("00", 0) + counts.get("11", 0)
    fraction = correlated / shots

    facts = [
        f"Counts from one job on the backend chosen in Qollab's Select QPU dialog, "
        f"which reported itself as '{backend_name}'.",
        "Circuit: H on q0, CNOT from q0 to q1, then measure both qubits. "
        "An ideal simulator gives only 00 and 11; noise or hardware can add 01 and 10.",
        f"{correlated} of {shots} shots ({fraction:.1%}) had both qubits agree (00 or 11).",
        "Each key reads right to left: the right bit is q0, the left bit is q1 (Qiskit's order).",
        "This is a Bell-pair correlation check, not teleportation. Teleportation is verified "
        "by exact local Qiskit statevector math in the game.",
        "The agreement carries no message: on its own, each qubit reads 0 or 1 at random.",
        "If the selected backend is a simulator, these counts are a simulation, "
        "not a measurement of a physical quantum device.",
    ]
    if shots_requested is not None and shots != shots_requested:
        # IonQ's simulators return probabilities; qiskit-ionq turns them into counts, and on the
        # noisy path it rounds probability x shots, so the total can drift from the request.
        facts.append(f"The backend returned {shots} counts for {shots_requested} requested shots.")

    # The sampled tallies stay in `counts` and `facts`: `observables` is for exact numbers.
    return experiment_result(
        experiment=BACKEND_EXPERIMENT,
        engine="qollab_selected_backend",
        circuit_description="Bell pair: H on q0, CNOT q0->q1, measure q0->c0 and q1->c1",
        qubits=NUM_QUBITS,
        parameters={"shots": shots_requested if shots_requested is not None else shots,
                    "backend": str(backend_name)},
        counts=counts,
        key_qubits=KEY_QUBITS,
        facts=facts,
    )


def _backend_label(backend):
    """The name the selected backend reports about itself; never a name chosen here."""
    name = getattr(backend, "name", None)
    if callable(name):  # BackendV1 exposes name() as a method
        name = name()
    label = str(name) if name else "an unnamed backend"
    noise = getattr(getattr(backend, "options", None), "noise_model", None)
    if isinstance(noise, str) and noise:
        label += f" (noise model {noise})"
    return label


def run_backend_verification_once(backend, shots=DEFAULT_SHOTS):
    """Submit the Bell circuit to the injected backend, at most once per run.

    The allowance is spent BEFORE submitting: if the job fails, IonQ may already have counted
    it, so a retry in the same run is refused too and the player is told to restart the run.
    """
    global _job_submitted
    if _job_submitted:
        raise BackendJobAlreadyUsed(
            "The selected backend allows one verification job per run, and it has been used. "
            "Restart the run to verify again."
        )
    _job_submitted = True
    job = backend.run(build_backend_verification_circuit(), shots=shots)
    raw = job.result().get_counts()
    return interpret_counts(raw, _backend_label(backend), shots_requested=shots)
