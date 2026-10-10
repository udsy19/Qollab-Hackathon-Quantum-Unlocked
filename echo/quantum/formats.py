"""Guarded builder for the vision §8.4 ExperimentResult.

Everything returned to JS crosses Pyodide's `.toJs()`, so a result may hold only dict / list / str /
int / float / bool. numpy scalars are converted; complex numbers, NaN/inf and arbitrary objects raise
instead of leaking a proxy or an unserialisable value into the game.
"""
import math

import numpy as np

ENGINES = ("exact_qiskit_local", "qollab_selected_backend", "documented_preview")
# Platform's EXPERIMENTS (echo/contracts.js) plus "backend_verification", the owner's value for the one
# selected-backend job (owner-answers 2026-10-10, 13 lane design questions, item 4): a Bell-pair
# correlation check that is neither the relay puzzle nor teleportation (vision §10.7). Platform has not
# added it to the contract yet.
EXPERIMENTS = ("cloning", "bell_signalling", "teleportation", "backend_verification")
PROBABILITY_TOLERANCE = 1e-9  # the platform validator's tolerance
DECIMALS = 10

# Vision §2.4 / §7.5: phrases no result string may carry.
FORBIDDEN_PHRASES = ("certified random", "certified quantum", "instant message", "instantly", "faster than light",
                     "unhackable", "quantum advantage", "transmits the secret")


def plain(value, path="result"):
    """Recursively convert to JSON-safe plain Python, raising on anything that is not."""
    if value is None or type(value) is str:
        return value
    if isinstance(value, (bool, np.bool_)):
        return bool(value)
    if isinstance(value, (int, np.integer)):
        return int(value)
    if isinstance(value, (float, np.floating)):
        f = float(value)
        if not math.isfinite(f):
            raise ValueError(f"{path}: non-finite float {f}")
        f = round(f, DECIMALS)
        return 0.0 if f == 0 else f  # no -0.0 on screen
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            if type(k) is not str:
                raise TypeError(f"{path}: key {k!r} is not a str")
            out[k] = plain(v, f"{path}.{k}")
        return out
    if isinstance(value, (list, tuple, np.ndarray)):
        return [plain(v, f"{path}[{i}]") for i, v in enumerate(list(value))]
    raise TypeError(f"{path}: {type(value).__name__} is not JSON-safe")


def experiment_result(*, experiment, engine, circuit_description, qubits, parameters, facts,
                      probabilities=None, counts=None, key_qubits=None, fidelity=None, observables=None,
                      measurement_bits=None, created_at=None):
    """Build one ExperimentResult in the platform contract's shape (echo/CONTRACTS.md, vision §8.4).

    `key_qubits` names the qubit behind each character of a probabilities/counts key, left to right
    (Qiskit keys are little-endian, so a full 2-qubit register is [1, 0]). `observables` holds exact
    derived numbers (purities, Bloch components, branch probabilities); verdicts go in `facts`."""
    if experiment not in EXPERIMENTS:
        raise ValueError(f"experiment {experiment!r} not in {EXPERIMENTS}")
    if engine not in ENGINES:
        raise ValueError(f"engine {engine!r} not in {ENGINES}")
    if not facts or not all(type(f) is str and f.strip() for f in facts):
        raise ValueError("facts must be non-empty strings explaining the result to the player")
    qubits = int(qubits)
    if qubits < 1:
        raise ValueError(f"qubits must be >= 1, got {qubits}")
    # Exact probabilities and sampled shot counts are different kinds of evidence; never both.
    if probabilities is not None and counts is not None:
        raise ValueError("a result carries exact probabilities OR shot counts, never both")
    if counts is not None and engine == "exact_qiskit_local":
        raise ValueError("exact_qiskit_local results carry probabilities, not counts")
    if probabilities is not None and engine == "qollab_selected_backend":
        raise ValueError("selected-backend results carry counts, not probabilities")
    if counts is None and engine == "qollab_selected_backend":
        raise ValueError("selected-backend results must carry counts")

    params = plain(parameters, "parameters")
    for k, v in params.items():
        if type(v) not in (str, int, float, bool):
            raise TypeError(f"parameters.{k} must be a flat str/number/bool, got {type(v).__name__}")
    result = {
        "experiment": experiment,
        "engine": engine,
        "circuitDescription": str(circuit_description),
        "qubits": qubits,
        "parameters": params,
        "facts": list(facts),
    }
    tables = []
    if probabilities is not None:
        p = plain(probabilities, "probabilities")
        if any(type(v) is not float or v < 0 or v > 1 for v in p.values()) or abs(sum(p.values()) - 1) > PROBABILITY_TOLERANCE:
            raise ValueError(f"probabilities must lie in [0,1] and sum to 1: {p}")
        result["probabilities"] = p
        tables.append(("probabilities", p))
    if counts is not None:
        c = {}
        for k, v in counts.items():
            if not isinstance(v, (int, np.integer)) or isinstance(v, (bool, np.bool_)) or v < 0:
                raise TypeError(f"counts[{k!r}] must be a non-negative integer, got {v!r}")
            c[k] = v
        result["counts"] = plain(c, "counts")
        tables.append(("counts", result["counts"]))
    if tables:
        kq = plain(key_qubits, "keyQubits")
        if (type(kq) is not list or not kq or len(set(kq)) != len(kq)
                or any(type(q) is not int or not 0 <= q < qubits for q in kq)):
            raise ValueError(f"keyQubits must list distinct qubit indices in [0, {qubits}), got {kq!r}")
        for field, table in tables:
            for key in table:
                if len(key) != len(kq) or set(key) - {"0", "1"}:
                    raise ValueError(f"{field} key {key!r} must be {len(kq)} character(s) of 0/1, one per keyQubits entry")
        result["keyQubits"] = kq
    elif key_qubits is not None:
        raise ValueError("keyQubits given without probabilities or counts")
    if fidelity is not None:
        f = plain(fidelity, "fidelity")
        if type(f) is not float or not 0 <= f <= 1 + PROBABILITY_TOLERANCE:
            raise ValueError(f"fidelity must be a number in [0, 1], got {f!r}")
        result["fidelity"] = f
    if observables is not None:
        obs = plain(observables, "observables")
        for k, v in obs.items():
            if type(v) not in (int, float):
                raise TypeError(f"observables.{k} must be a finite number, got {type(v).__name__}")
        result["observables"] = obs
    if measurement_bits is not None:
        bits = plain(measurement_bits, "measurementBits")
        if set(bits) != {"m0", "m1"} or any(b not in (0, 1) or type(b) is not int for b in bits.values()):
            raise ValueError(f"measurementBits must be {{m0: 0|1, m1: 0|1}}, got {bits}")
        result["measurementBits"] = bits
    if created_at is not None:
        result["createdAt"] = str(created_at)

    for path, s in _strings(result):
        low = s.lower()
        for phrase in FORBIDDEN_PHRASES:
            if phrase in low:
                raise ValueError(f"{path}: forbidden claim {phrase!r}")
    return result


def _strings(v, path="result"):
    if isinstance(v, str):
        yield path, v
    elif isinstance(v, dict):
        for k, x in v.items():
            yield from _strings(x, f"{path}.{k}")
    elif isinstance(v, list):
        for i, x in enumerate(v):
            yield from _strings(x, f"{path}[{i}]")
