"""Harness-only spy (never shipped in echo/): counts selected-backend jobs from BELOW the bridge.

It wraps BasicSimulator.run at class level, so it sees a job whichever language submitted it:
Python (qollab_job calling backend.run) or JS (the runtime's backend proxy -> run.callPromisingKwargs).
The local runner's own counter sits on that JS proxy only, so comparing the two counts tells the
routes apart. Under the runner's ionq-mock it also calls run_sync, which, like IonQ's HTTP client
on Qollab, works only on a stack entered through callPromising (an emulation of the mechanism,
not of IonQ). It records each job's RAW counts, before qollab_job touches them.
"""
import js
from pyodide.ffi import run_sync
from qiskit import QuantumCircuit
from qiskit.providers.basic_provider import BasicSimulator

import quantum.qollab_job as qollab_job

CONTROL = False  # assemble.sh --control flips this line in the disposable copy
NETWORK_MOCK = "backend=ionq-mock" in str(js.location.search)
JOBS = []
_original_run = BasicSimulator.run


def _spied_run(self, circuit, *args, **kwargs):
    rec = {"attempt": len(JOBS) + 1, "circuit": circuit.name, "ops": [i.operation.name for i in circuit.data],
           "kwargs": {k: v for k, v in kwargs.items() if isinstance(v, (int, str))}}
    JOBS.append(rec)
    if NETWORK_MOCK:
        run_sync(js.Promise.resolve(0))  # raises unless the stack was entered via callPromising
    job = _original_run(self, circuit, *args, **kwargs)
    rec["rawCounts"] = dict(job.result().get_counts())
    return job


BasicSimulator.run = _spied_run


def _control_circuit():
    """Asymmetric control: X on q0 only, same register mapping (q0 -> c0, q1 -> c1)."""
    qc = QuantumCircuit(2, 2, name="harness_control_x_q0")
    qc.x(0)
    qc.measure(0, 0)
    qc.measure(1, 1)
    return qc


if CONTROL:
    qollab_job.build_backend_verification_circuit = _control_circuit


def snapshot():
    return {"pythonBackendRunCalls": len(JOBS), "jobs": JOBS, "networkMock": NETWORK_MOCK, "control": CONTROL}
