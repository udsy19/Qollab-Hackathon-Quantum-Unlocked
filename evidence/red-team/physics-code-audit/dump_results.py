"""Dump the quantum lane's REAL results for the happy path as JSON (input to cross_lane_check.mjs).

    ECHO_ROOT=/tmp/pca/q/echo python evidence/red-team/physics-code-audit/dump_results.py > results.json
"""
import json
import os
import sys

sys.path.insert(0, os.environ["ECHO_ROOT"])
from qiskit.providers.basic_provider import BasicSimulator  # noqa: E402

from quantum import cloning, entanglement, qollab_job, teleportation  # noqa: E402

bits = teleportation.bell_measurement("bloch_a", seed=5)["measurementBits"]
rule = teleportation.expected_corrections(bits["m0"], bits["m1"])
out = {
    # quest state the result is offered in -> the result the terminal would get
    "CLONE_INTRO": cloning.run_calibration("zero"),
    "CLONE_BASIS_PASSED": cloning.run_calibration("plus"),
    "RELAY_INTRO": entanglement.bell_signalling("I"),
    "RELAY_BELL_CREATED": entanglement.bell_signalling("X"),
    "TELEPORT_DRY_RUN": teleportation.teleport_branch("bloch_a", bits["m0"], bits["m1"], rule["applyX"], rule["applyZ"]),
    "TELEPORT_DRY_RUN_PASSED": teleportation.live_commit("bloch_b", seed=9),
    "BACKEND_VERIFICATION": qollab_job.run_bell_verification_once(BasicSimulator(), shots=256),
}
print(json.dumps(out, allow_nan=False))
