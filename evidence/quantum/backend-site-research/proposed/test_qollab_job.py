"""Tests for echo/quantum/qollab_job.py — the one selected-backend Bell verification job.

Ground truth here is hand-derived physics, never the module's own output: a circuit that flips
only q0 must read as q0=1, q1=0, whichever way the counts were produced. Run with
    .venv/bin/python -m pytest echo/tests/test_qollab_job.py
"""

import json
import pathlib
import re
import sys

import pytest

ECHO_ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ECHO_ROOT))  # Qollab's project root is echo/, so modules import as quantum.*

from qiskit import QuantumCircuit  # noqa: E402
from qiskit.providers.basic_provider import BasicSimulator  # noqa: E402

import quantum.qollab_job as qj  # noqa: E402


def qubit_ones(result):
    """Shots in which each qubit read 1, read through the result's own keyQubits declaration."""
    ones = {"q0": 0, "q1": 0}
    for key, n in result["counts"].items():
        for char, qubit in zip(key, result["keyQubits"], strict=True):
            ones[f"q{qubit}"] += int(char) * n
    return ones


# ---------------------------------------------------------------- endianness, hand-written fixtures
# Qiskit count keys are written c1 c0: the RIGHTMOST character is classical bit 0, which the
# circuit fills from q0. These dicts were written by hand from that rule, not produced by the module.

@pytest.mark.parametrize(
    "raw, q0_ones, q1_ones",
    [
        ({"01": 100}, 100, 0),          # X on q0 only
        ({"10": 100}, 0, 100),          # X on q1 only
        ({"0x1": 100}, 100, 0),         # same as the first, as a hex key (int 1 = clbit 0 set)
        ({"0x2": 100}, 0, 100),
        ({"00": 30, "11": 70}, 70, 70),
        ({"00": 40, "01": 10, "10": 20, "11": 30}, 40, 50),
    ],
)
def test_hand_written_counts_read_with_q0_rightmost(raw, q0_ones, q1_ones):
    result = qj.interpret_counts(raw, backend_name="hand-written fixture", shots_requested=None)
    assert qubit_ones(result) == {"q0": q0_ones, "q1": q1_ones}


def test_correlated_fraction_counts_only_00_and_11():
    result = qj.interpret_counts({"00": 40, "01": 10, "10": 20, "11": 30},
                                 backend_name="hand-written fixture", shots_requested=100)
    assert sum(result["counts"].values()) == 100
    assert "70 of 100 shots (70.0%) had both qubits agree (00 or 11)." in result["facts"]
    # hex keys are normalised to the same Qiskit-order bitstrings get_counts() gives
    hexed = qj.interpret_counts({"0x0": 40, "0x1": 10, "0x2": 20, "0x3": 30},
                                backend_name="hand-written fixture", shots_requested=100)
    assert hexed["counts"] == {"00": 40, "01": 10, "10": 20, "11": 30}


# ---------------------------------------------------------------- endianness on real Qiskit output

def _x_circuit(qubit):
    qc = QuantumCircuit(2, 2)
    qc.x(qubit)
    qc.measure([0, 1], [0, 1])  # the same register mapping as the Bell job: clbit i <- qi
    return qc


@pytest.mark.parametrize("flipped, expected", [(0, {"q0": 64, "q1": 0}), (1, {"q0": 0, "q1": 64})])
def test_basic_simulator_output_reads_the_flipped_qubit(flipped, expected):
    """Qollab's built-in simulator IS Qiskit's BasicSimulator (python-qiskit-projects doc)."""
    raw = BasicSimulator().run(_x_circuit(flipped), shots=64).result().get_counts()
    result = qj.interpret_counts(raw, backend_name="local BasicSimulator", shots_requested=64)
    assert qubit_ones(result) == expected


def test_ionq_histogram_mapping_reads_the_flipped_qubit():
    """qiskit-ionq turns IonQ's integer histogram (qubit i = bit i) into Qiskit keys. Feed it the
    histogram an X-on-q0 circuit gives (state index 1) and check our reading of its output."""
    from qiskit_ionq.ionq_job import _build_counts  # the provider Qollab hands over for IonQ

    counts, _ = _build_counts({"1": 1.0}, num_qubits=2, clbits=[0, 1], shots=50)
    result = qj.interpret_counts(counts, backend_name="qiskit-ionq mapping", shots_requested=50)
    assert qubit_ones(result) == {"q0": 50, "q1": 0}


def test_bell_circuit_on_basic_simulator_is_fully_correlated():
    qc = qj.build_backend_verification_circuit()
    raw = BasicSimulator().run(qc, shots=512, seed_simulator=7).result().get_counts()
    result = qj.interpret_counts(raw, backend_name="local BasicSimulator", shots_requested=512)
    assert set(result["counts"]) <= {"00", "11"}
    assert set(result["counts"]) <= {"00", "11"}  # the ideal simulator: only correlated outcomes
    # an ideal Bell pair gives each qubit 1 about half the time; 512 shots, 6 sigma ~ 68
    assert abs(qubit_ones(result)["q0"] - 256) < 68


# ---------------------------------------------------------------- the circuit and its description

def test_description_is_the_hand_expected_bell_circuit_and_json_safe():
    desc = qj.describe_backend_verification_circuit()
    assert json.loads(json.dumps(desc)) == desc
    assert desc["qubits"] == 2 and desc["clbits"] == 2
    assert desc["operations"] == [
        {"gate": "h", "qubits": [0], "clbits": []},
        {"gate": "cx", "qubits": [0, 1], "clbits": []},
        {"gate": "measure", "qubits": [0], "clbits": [0]},
        {"gate": "measure", "qubits": [1], "clbits": [1]},
    ]
    assert "q_0" in desc["drawing"] or "q0" in desc["drawing"]


# ---------------------------------------------------------------- malformed input is a failure

@pytest.mark.parametrize(
    "raw",
    [
        None, {}, [], "00", {"00": 0},
        {"0": 5}, {"000": 5}, {"02": 5}, {"0 1": 5}, {"0x4": 5}, {"0xz": 5},
        {"00": -1}, {"00": 1.5}, {"00": True}, {"00": "5"},
    ],
)
def test_malformed_or_empty_counts_raise(raw):
    with pytest.raises(ValueError):
        qj.interpret_counts(raw, backend_name="hand-written fixture", shots_requested=None)


# ---------------------------------------------------------------- the JS-submitted job

class FakeBackend:
    """Stands in for the injected backend: Python may read its name, and must never run it."""

    name = "fake-selected-backend"

    def run(self, *args, **kwargs):
        raise AssertionError("qollab_job ran the backend; the one backend.run lives in bridge.js")


def test_python_never_submits_a_job():
    """The owner's one guarded site is bridge.js: no Python code here may call `.run(` (AST, not grep)."""
    import ast
    tree = ast.parse((ECHO_ROOT / "quantum" / "qollab_job.py").read_text())
    runs = [n.lineno for n in ast.walk(tree)
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == "run"]
    assert runs == []


def test_counts_of_the_submitted_circuit_name_the_backend_and_follow_the_contract():
    raw = BasicSimulator().run(qj.build_backend_verification_circuit(), shots=128).result().get_counts()
    result = qj.interpret_backend_counts(raw, FakeBackend(), shots_requested=128)
    for field in ("experiment", "engine", "circuitDescription", "qubits", "parameters", "counts", "keyQubits", "facts"):
        assert field in result, field
    assert json.loads(json.dumps(result)) == result
    assert result["qubits"] == 2
    assert result["parameters"]["shots"] == 128
    assert any("fake-selected-backend" in f for f in result["facts"])


# ---------------------------------------------------------------- honesty (vision §7.5, §10.7)

FORBIDDEN = re.compile(r"certified quantum random|unhackable|instant quantum message|faster than light",
                       re.IGNORECASE)


def test_facts_are_honest():
    result = qj.interpret_counts({"00": 60, "11": 60, "01": 4}, backend_name="any",
                                 shots_requested=128)
    text = " ".join(result["facts"])
    assert not FORBIDDEN.search(text)
    assert "teleport" not in result["experiment"] and "teleport" not in result["circuitDescription"].lower()
    assert re.search(r"not teleportation", text, re.IGNORECASE)
    # IonQ's noisy simulators round probability x shots, so totals can differ from the request
    assert any("124" in f and "128" in f for f in result["facts"])


def test_module_never_creates_or_names_a_backend():
    source = (ECHO_ROOT / "quantum" / "qollab_job.py").read_text()
    code = "\n".join(line.split("#", 1)[0] for line in source.splitlines())
    code = re.sub(r'"""[\s\S]*?"""', "", code)  # docstrings may explain; code may not name
    for pattern in (r"BasicSimulator", r"IonQProvider", r"get_backend", r"\bAer\b", r"\bforte", r"\baria\b",
                    r"ionq_simulator", r"api_key|token"):
        assert not re.search(pattern, code, re.IGNORECASE), pattern
