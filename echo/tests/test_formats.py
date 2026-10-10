"""ExperimentResult guard (vision §8.4) and the JS-bridge contract across EVERY public experiment call.

The sweep below enumerates its inputs itself; it does not ask the modules which inputs exist."""
import ast
import functools
import json
import math
import pathlib

import numpy as np
import pytest

from quantum import cloning, entanglement, formats, teleportation

STATES = ["zero", "one", "plus", "minus", "phase", "bloch_a", "bloch_b"]


def every_result():
    for s in STATES:
        yield cloning.run_calibration(s)
        yield teleportation.corrections_withheld(s)
        yield teleportation.verify_deferred(s)
        yield teleportation.bell_measurement(s, seed=1)
        yield teleportation.live_commit(s, seed=2)
        for m0 in (0, 1):
            for m1 in (0, 1):
                for ax in (False, True):
                    for az in (False, True):
                        yield teleportation.teleport_branch(s, m0, m1, ax, az)
    for g in ("I", "X", "Z"):
        yield entanglement.bell_signalling(g)


SWEEP_SIZE = 7 * (5 + 16) + 3


@functools.cache
def all_results():
    # Built lazily so a broken engine fails these tests instead of aborting collection.
    return list(every_result())
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
    assert len(all_results()) == SWEEP_SIZE


@pytest.mark.parametrize("i", range(SWEEP_SIZE))
def test_every_result_is_plain_and_json_safe(i):
    r = all_results()[i]
    list(walk(r))
    assert json.loads(json.dumps(r, allow_nan=False)) == r
    assert r["engine"] in ("exact_qiskit_local", "qollab_selected_backend", "documented_preview")
    assert r["experiment"] in ("cloning", "bell_signalling", "teleportation")
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
    args = dict(experiment="cloning", engine="exact_qiskit_local", kind="naive_cnot_clone",
                circuit_description="x", qubits=1, parameters={"state": "zero"}, facts=["f"])
    args.update(kw)
    return args


def test_builder_converts_numpy_and_rounds():
    r = formats.experiment_result(**base(fidelity=np.float64(0.12345678901234), details={"n": np.int64(3), "b": np.bool_(True), "v": np.array([0.5, -0.0])}))
    assert type(r["fidelity"]) is float and r["fidelity"] == pytest.approx(0.1234567890, abs=1e-10)
    assert type(r["details"]["n"]) is int and type(r["details"]["b"]) is bool
    assert r["details"]["v"] == [0.5, 0.0] and all(type(x) is float for x in r["details"]["v"])


@pytest.mark.parametrize("bad", [
    dict(details={"z": 1j}),
    dict(details={"z": np.complex128(1)}),
    dict(details={"z": float("nan")}),
    dict(details={"z": float("inf")}),
    dict(details={"z": object()}),
    dict(details={1: 2}),
    dict(engine="ionq_magic"),
    dict(experiment="matter_transport"),
    dict(probabilities={"a": 1.0}, counts={"a": 3}),
    dict(counts={"a": 3}),  # exact engine may not carry shot counts
    dict(engine="qollab_selected_backend", probabilities={"a": 1.0}),
    dict(engine="qollab_selected_backend", counts={"a": 2.5}),
    dict(probabilities={"a": 0.4}),  # does not sum to 1
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


def test_counts_allowed_for_selected_backend():
    r = formats.experiment_result(**base(experiment="bell_signalling", engine="qollab_selected_backend",
                                         counts={"00": np.int64(130), "11": 126}))
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
