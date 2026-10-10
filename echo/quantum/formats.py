"""Guarded builder for the vision §8.4 ExperimentResult.

Everything returned to JS crosses Pyodide's `.toJs()`, so a result may hold only dict / list / str /
int / float / bool. numpy scalars are converted; complex numbers, NaN/inf and arbitrary objects raise
instead of leaking a proxy or an unserialisable value into the game.
"""
import math

import numpy as np

ENGINES = ("exact_qiskit_local", "qollab_selected_backend", "documented_preview")
EXPERIMENTS = ("cloning", "bell_signalling", "teleportation")
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


def complex_pair(z):
    """A complex amplitude as [re, im] — complex numbers do not survive .toJs()."""
    z = complex(z)
    return [z.real, z.imag]


def experiment_result(*, experiment, engine, kind, circuit_description, qubits, parameters, facts,
                      probabilities=None, counts=None, fidelity=None, measurement_bits=None,
                      circuit_text=None, details=None, created_at=None):
    """Build one ExperimentResult. Vision field names are used verbatim; `kind`, `circuitText` and
    `details` are the proposed additions (vault/Design/experiment-result-contract.md)."""
    if experiment not in EXPERIMENTS:
        raise ValueError(f"experiment {experiment!r} not in {EXPERIMENTS}")
    if engine not in ENGINES:
        raise ValueError(f"engine {engine!r} not in {ENGINES}")
    if not facts:
        raise ValueError("facts must explain the result to the player")
    # Exact probabilities and sampled shot counts are different kinds of evidence; never both.
    if probabilities is not None and counts is not None:
        raise ValueError("a result carries exact probabilities OR shot counts, never both")
    if counts is not None and engine == "exact_qiskit_local":
        raise ValueError("exact_qiskit_local results carry probabilities, not counts")
    if probabilities is not None and engine == "qollab_selected_backend":
        raise ValueError("selected-backend results carry counts, not probabilities")

    result = {
        "experiment": experiment,
        "engine": engine,
        "kind": str(kind),
        "circuitDescription": str(circuit_description),
        "qubits": int(qubits),
        "parameters": plain(parameters, "parameters"),
        "facts": [str(f) for f in facts],
    }
    if probabilities is not None:
        p = plain(probabilities, "probabilities")
        if any(v < 0 or v > 1 for v in p.values()) or abs(sum(p.values()) - 1) > 1e-6:
            raise ValueError(f"probabilities must lie in [0,1] and sum to 1: {p}")
        result["probabilities"] = p
    if counts is not None:
        c = {}
        for k, v in counts.items():
            if not isinstance(v, (int, np.integer)) or isinstance(v, (bool, np.bool_)) or v < 0:
                raise TypeError(f"counts[{k!r}] must be a non-negative integer, got {v!r}")
            c[k] = v
        result["counts"] = plain(c, "counts")
    if fidelity is not None:
        result["fidelity"] = plain(fidelity, "fidelity")
    if measurement_bits is not None:
        bits = plain(measurement_bits, "measurementBits")
        if set(bits) != {"m0", "m1"} or any(b not in (0, 1) or type(b) is not int for b in bits.values()):
            raise ValueError(f"measurementBits must be {{m0: 0|1, m1: 0|1}}, got {bits}")
        result["measurementBits"] = bits
    if circuit_text is not None:
        result["circuitText"] = str(circuit_text)
    if details is not None:
        result["details"] = plain(details, "details")
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
