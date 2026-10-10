"""ExperimentResult guard (vision §8.4) and the JS-bridge contract across EVERY public experiment call.

The sweep is conftest.bridge_calls(), which enumerates its inputs itself; it does not ask the modules."""
import ast
import functools
import json
import math
import pathlib

import numpy as np
import pytest

from conftest import BRIDGE_CALL_COUNT, bridge_calls
from quantum import formats


@functools.cache
def all_results():
    # Built lazily so a broken engine fails these tests instead of aborting collection.
    return [fn() for _, fn in bridge_calls()]


PLAIN = (dict, list, str, int, float, bool, type(None))


def walk(v, path="$"):
    # Exact type census: numpy.float64 subclasses float and would pass isinstance.
    assert type(v) in PLAIN, f"{path}: {type(v).__name__}"
    if isinstance(v, dict):
        for k, x in v.items():
            assert type(k) is str, f"{path}: key {k!r}"
            yield from walk(x, f"{path}.{k}")
    elif isinstance(v, list):
        for i, x in enumerate(v):
            yield from walk(x, f"{path}[{i}]")
    else:
        if type(v) is float:
            assert math.isfinite(v), path
        yield path, v


def test_sweep_size():
    assert len(all_results()) == BRIDGE_CALL_COUNT


@pytest.mark.parametrize("i", range(BRIDGE_CALL_COUNT))
def test_every_result_is_plain_and_json_safe(i):
    r = all_results()[i]
    list(walk(r))
    assert json.loads(json.dumps(r, allow_nan=False)) == r
    assert r["engine"] in ("exact_qiskit_local", "qollab_selected_backend", "documented_preview")
    # Platform's union plus the one pending request (report 0003); test_contract_conformance holds the rest.
    assert r["experiment"] in ("cloning", "bell_signalling", "teleportation", "bell_verification")
    assert not ("probabilities" in r and "counts" in r)
    assert r["facts"] and all(type(f) is str for f in r["facts"])
    if "probabilities" in r:
        assert sum(r["probabilities"].values()) == pytest.approx(1.0, abs=1e-9)


# Our own list (vision §2.4, §7.5), deliberately broader than any list inside the code.
FORBIDDEN = ["certified random", "certified quantum", "instant message", "instantly", "faster than light",
             "unhackable", "transmits the secret", "quantum advantage", "ran on ionq", "ionq verified",
             "true randomness", "true random", "teleported matter", "cloned the"]


def test_no_forbidden_claims_in_any_string():
    for r in all_results():
        for path, v in walk(r):
            if type(v) is str:
                low = v.lower()
                for phrase in FORBIDDEN:
                    assert phrase not in low, f"{path}: {phrase!r} in {v!r}"


def base(**kw):
    args = dict(experiment="cloning", engine="exact_qiskit_local",
                circuit_description="x", qubits=1, parameters={"state": "zero"}, facts=["f"])
    args.update(kw)
    return args


def test_builder_converts_numpy_and_rounds():
    r = formats.experiment_result(**base(fidelity=np.float64(0.12345678901234),
                                         parameters={"n": np.int64(3), "b": np.bool_(True)},
                                         observables={"v": np.float64(-0.0), "w": np.float64(0.5)},
                                         probabilities={"0": np.float64(1.0), "1": np.float64(0.0)}, key_qubits=[np.int64(0)]))
    assert type(r["fidelity"]) is float and r["fidelity"] == pytest.approx(0.1234567890, abs=1e-10)
    assert type(r["parameters"]["n"]) is int and type(r["parameters"]["b"]) is bool
    assert r["observables"] == {"v": 0.0, "w": 0.5} and all(type(x) is float for x in r["observables"].values())
    assert r["keyQubits"] == [0] and type(r["keyQubits"][0]) is int


@pytest.mark.parametrize("bad", [
    dict(observables={"z": 1j}),
    dict(observables={"z": np.complex128(1)}),
    dict(observables={"z": float("nan")}),
    dict(observables={"z": float("inf")}),
    dict(observables={"z": object()}),
    dict(observables={"z": True}),  # a verdict is a fact, not an observable
    dict(observables={"z": [0.1, 0.2]}),
    dict(observables={1: 2}),
    dict(parameters={"nested": {"a": 1}}),  # parameters are flat
    dict(parameters={"none": None}),
    dict(probabilities={"0": 1.0}),  # no keyQubits
    dict(probabilities={"0": 1.0}, key_qubits=[1]),  # qubit 1 does not exist (qubits=1)
    dict(probabilities={"00": 1.0}, key_qubits=[0]),  # key longer than keyQubits
    dict(probabilities={"m0=0": 1.0}, key_qubits=[0]),  # labels are not 0/1 keys
    dict(key_qubits=[0]),  # keyQubits without a table
    dict(fidelity=1.5),
    dict(qubits=0),
    dict(facts=[""]),
    dict(engine="ionq_magic"),
    dict(experiment="matter_transport"),
    dict(probabilities={"0": 1.0}, counts={"0": 3}, key_qubits=[0]),
    dict(counts={"0": 3}, key_qubits=[0]),  # exact engine may not carry shot counts
    dict(engine="qollab_selected_backend", probabilities={"0": 1.0}, key_qubits=[0]),
    dict(engine="qollab_selected_backend", counts={"0": 2.5}, key_qubits=[0]),
    dict(engine="qollab_selected_backend"),  # a selected-backend result without counts
    dict(probabilities={"0": 0.4}, key_qubits=[0]),  # does not sum to 1
    dict(measurementBits={"m0": 2, "m1": 0}),
    dict(facts=["The secret was sent instantly"]),
    dict(facts=[]),
])
def test_builder_refuses(bad):
    kw = base()
    if "measurementBits" in bad:
        kw["measurement_bits"] = bad.pop("measurementBits")
    kw.update(bad)
    with pytest.raises((TypeError, ValueError)):
        formats.experiment_result(**kw)


@pytest.mark.parametrize("bad", [1j, np.complex128(1), object(), float("nan"), {1: 2}, {"a": [1j]}])
def test_plain_refuses_what_does_not_survive_the_bridge(bad):
    # plain() is the first guard; the builder's per-field type checks are a second one, so this is
    # tested on its own (sabotage formats-allow-complex stayed green without it).
    with pytest.raises((TypeError, ValueError)):
        formats.plain(bad)


def test_counts_allowed_for_selected_backend():
    r = formats.experiment_result(**base(experiment="bell_verification", engine="qollab_selected_backend", qubits=2,
                                         counts={"00": np.int64(130), "11": 126}, key_qubits=[1, 0]))
    assert r["counts"] == {"00": 130, "11": 126} and "probabilities" not in r


ALLOWED_IMPORTS = {"qiskit", "qiskit.quantum_info", "numpy", "math", "random", "__future__"}


def test_quantum_modules_import_only_pyodide_safe_packages():
    root = pathlib.Path(__file__).resolve().parents[1] / "quantum"
    mine = ["__init__.py", "cloning.py", "entanglement.py", "teleportation.py", "formats.py"]
    for name in mine:
        tree = ast.parse((root / name).read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                mods = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom):
                if node.level:  # relative import within the package
                    continue
                mods = [node.module]
            else:
                continue
            for m in mods:
                assert m in ALLOWED_IMPORTS, f"{name}: import {m}"
