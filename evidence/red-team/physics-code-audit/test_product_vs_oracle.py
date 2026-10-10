"""The physics oracle graded against the quantum lane's REAL code (checklist C1, C2, C3, C5).

The product is NOT imported from this repo: set ECHO_ROOT to an exported, disposable copy of the
`echo/` tree (`git archive <sha> echo | tar -x -C $TMP`). A missing ECHO_ROOT is a failure, never a
skip. Ground truth is the oracle in ../physics-oracle (law 4): the product is never asked what the
right answer is. Run:

    ECHO_ROOT=/tmp/pca/q/echo python -m pytest -q evidence/red-team/physics-code-audit -p no:cacheprovider
"""
from __future__ import annotations

import ast
import importlib
import json
import math
import os
import pathlib
import sys

import numpy as np
import pytest
from qiskit.providers.basic_provider import BasicSimulator
from qiskit.quantum_info import Statevector, partial_trace

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "physics-oracle"))
import physics_oracle as po  # noqa: E402
from backend_run_audit import CountingBackend  # noqa: E402
from test_physics_oracle import TEXTBOOK_RULE  # noqa: E402  hand-written table, not computed

ECHO_ROOT = os.environ.get("ECHO_ROOT")
if not ECHO_ROOT or not (pathlib.Path(ECHO_ROOT) / "quantum" / "teleportation.py").is_file():
    raise RuntimeError(f"ECHO_ROOT must point at an exported echo/ tree with quantum/; got {ECHO_ROOT!r}")
sys.path.insert(0, ECHO_ROOT)

import quantum  # noqa: E402
from quantum import cloning, entanglement, qollab_job, teleportation  # noqa: E402

EXACT = 1e-6
# The product's named states as the oracle's (theta, phi): what the product CLAIMS to prepare.
# test_product_states_are_what_they_claim checks the claim.
PRODUCT_NAMED = {
    "zero": (0.0, 0.0), "one": (math.pi, 0.0), "plus": (math.pi / 2, 0.0), "minus": (math.pi / 2, math.pi),
    "phase": (math.pi / 2, math.pi / 2), "bloch_a": (1.137, 0.44), "bloch_b": (2.3, -1.9),
}
HAAR = po.random_states(5)
ALL = list(PRODUCT_NAMED.items()) + [(n, (th, ph)) for n, th, ph in HAAR]
IDS = [a for a, _ in ALL]


@pytest.fixture(autouse=True)
def haar_states(monkeypatch):
    # Haar states go through the product's OWN preparation (RY then RZ), the way its own test injects
    # states. U(theta, phi) == RZ(phi) RY(theta) up to a global phase.
    for name, th, ph in HAAR:
        monkeypatch.setitem(quantum.STATES, name, ((("ry", th), ("rz", ph)), name))


def _fid_pure(a, b):
    return abs(np.vdot(a, b)) ** 2


def _expect(rho, psi):
    return float(np.real(np.conj(psi) @ rho @ psi))


# Contract v2 (echo/contracts.js on main 80d685f): outcome keys carry `keyQubits`, the qubit behind
# each key character left to right. The gate builds the key from the ORACLE's bits through that
# mapping and then checks the probability against the oracle, so a wrong keyQubits goes red here
# (metadata the gate validates, not metadata it trusts).
def _key(r, bits_by_qubit):
    return "".join(str(bits_by_qubit[q]) for q in r["keyQubits"])


def _bloch(r, prefix="receiver"):
    o = r["observables"]
    return [o[f"{prefix}BlochX"], o[f"{prefix}BlochY"], o[f"{prefix}BlochZ"]]


def _ket_bloch(psi):
    rho = np.outer(psi, np.conj(psi))
    return [float(np.real(rho[0, 1] + rho[1, 0])), float(np.real(1j * (rho[0, 1] - rho[1, 0]))),
            float(np.real(rho[0, 0] - rho[1, 1]))]


# ------------------------------------------------------------------- C1 correction rule
def test_c1_rule_matches_textbook():
    for (m0, m1), (x, z) in TEXTBOOK_RULE.items():
        assert teleportation.expected_corrections(m0, m1) == {"applyX": x, "applyZ": z}, (m0, m1)


# ------------------------------------------------------------------- C2 states are what they claim
@pytest.mark.parametrize("name,thph", ALL, ids=IDS)
def test_product_states_are_what_they_claim(name, thph):
    assert _fid_pure(quantum.target_state(name).data, po.ket(*thph)) > 1 - 1e-12


# ------------------------------------------------------------------- C2 teleport branch model
@pytest.mark.parametrize("name,thph", ALL, ids=IDS)
def test_c2_branch_fidelity_equals_oracle_all_branches_all_corrections(name, thph):
    th, ph = thph
    psi = po.ket(th, ph)
    for (m0, m1), (p, bob, q0rho, _) in po.qk_branches(th, ph).items():
        for ax, az in po.CORRECTIONS:
            r = teleportation.teleport_branch(name, m0, m1, ax, az)
            assert r["fidelity"] == pytest.approx(po.corrected_fidelity(bob, ax, az, th, ph), abs=EXACT), \
                (name, m0, m1, ax, az)
            assert r["measurementBits"] == {"m0": m0, "m1": m1}
            assert r["probabilities"][_key(r, {0: m0, 1: m1})] == pytest.approx(p, abs=EXACT)
            assert r["observables"]["sourceFidelityAfterMeasurement"] == pytest.approx(_expect(q0rho.data, psi), abs=EXACT)
            assert (r["parameters"]["applyX"], r["parameters"]["applyZ"]) == (ax, az)  # reports the choice it graded


@pytest.mark.parametrize("name,thph", ALL, ids=IDS)
def test_c2_live_commit_applies_textbook_rule_to_its_own_bits(name, thph):
    seen = set()
    for seed in range(40):
        r = teleportation.live_commit(name, seed=seed)
        bits = (r["measurementBits"]["m0"], r["measurementBits"]["m1"])
        seen.add(bits)
        # v2 dropped details.appliedCorrections; the corrections are proven by the physics instead:
        # the receiver's Bloch vector must be the ORACLE's |psi>, which on a generic (Haar) state no
        # wrong correction can produce.
        assert r["fidelity"] >= 0.999999
        assert _bloch(r) == pytest.approx(_ket_bloch(po.ket(*thph)), abs=EXACT), bits
    assert seen == set(TEXTBOOK_RULE)  # all four branches reached


@pytest.mark.parametrize("name,thph", ALL, ids=IDS)
def test_c2_deferred_and_withheld_equal_oracle(name, thph):
    th, ph = thph
    bob = partial_trace(Statevector.from_instruction(po.deferred_measurement_circuit(th, ph)), [0, 1])
    assert teleportation.verify_deferred(name)["fidelity"] == pytest.approx(_expect(bob.data, po.ket(th, ph)), abs=EXACT)
    w = teleportation.corrections_withheld(name)
    assert w["fidelity"] == pytest.approx(0.5, abs=EXACT)
    assert _bloch(w) == pytest.approx([0, 0, 0], abs=EXACT)


# ------------------------------------------------------------------- C5 endianness on REAL sampled counts
@pytest.mark.parametrize("state,basis", [("zero", "Z"), ("plus", "X")])
def test_c5_product_branch_labels_match_real_sampled_shots(state, basis):
    """Sample the measured protocol on BasicSimulator, parse each key with the ORACLE's parser, and
    check the product's projection for those (m0, m1) predicts Bob's sampled bit on every shot.
    A product that swapped m0/m1 in its projection predicts Bob from the wrong bit and goes red."""
    counts = po.sample_counts(po.measured_teleport_probe(basis), shots=512, seed=11)
    branches = set()
    for key, n in counts.items():
        m0, m1 = po.bits_from_counts_key(key)
        bob_bit = int(key.replace(" ", "")[0])  # c2, the highest clbit, prints first
        branches.add((m0, m1))
        bv = _bloch(teleportation.teleport_branch(state, m0, m1, False, False))
        comp = bv[2] if basis == "Z" else bv[0]
        assert abs(abs(comp) - 1) < 1e-9, (key, bv)  # Bob is a definite eigenstate in this basis
        assert (0 if comp > 0 else 1) == bob_bit, (key, n, bv)
    assert branches == set(TEXTBOOK_RULE)


@pytest.mark.parametrize("m0,m1", sorted(TEXTBOOK_RULE))
def test_c5_backend_parser_on_real_sampled_keys(m0, m1):
    # q0 -> c0, q1 -> c1, exactly as qollab_job's Bell circuit maps them.
    raw = po.sample_counts(po.endianness_fixture(m0, m1), shots=64)
    s = qollab_job.interpret_counts(raw, backend_name="local BasicSimulator", shots_requested=64)
    ones = {f"q{q}": sum(n for k, n in s["counts"].items() if k[s["keyQubits"].index(q)] == "1") for q in (0, 1)}
    assert ones == {"q0": 64 * m0, "q1": 64 * m1}


# ------------------------------------------------------------------- C2 cloning
@pytest.mark.parametrize("name,thph", ALL, ids=IDS)
def test_c2_cloning_equals_oracle_and_reports_its_input(name, thph):
    th, ph = thph
    sv = po.naive_cnot_clone(th, ph)
    psi = po.ket(th, ph)
    f_src, f_copy = po.copy_fidelities(sv, psi)
    r = cloning.run_calibration(name)
    d = r["observables"]
    assert d["fidelityQ0WithInput"] == pytest.approx(f_src, abs=EXACT)
    assert d["fidelityQ1WithInput"] == pytest.approx(f_copy, abs=EXACT)
    assert d["purityQ0"] == pytest.approx(float(np.real(partial_trace(sv, [1]).purity())), abs=EXACT)
    assert d["purityQ1"] == pytest.approx(float(np.real(partial_trace(sv, [0]).purity())), abs=EXACT)
    assert d["jointFidelityWithTwoCopies"] == pytest.approx(_fid_pure(sv.data, np.kron(psi, psi)), abs=EXACT)
    probs = sv.probabilities()  # oracle statevector, index = q0 + 2*q1
    for i, pr in enumerate(probs):
        assert r["probabilities"][_key(r, {0: i & 1, 1: i >> 1})] == pytest.approx(float(pr), abs=EXACT)
    assert r["parameters"]["state"] == name  # report 0001 null 3: the input identity is reported


def test_c2_cloning_results_distinguish_equal_purity_states():
    # |+>, |->, |+i> all give purity 0.5; the result must still tell them apart (report 0001 null 3).
    rs = {n: cloning.run_calibration(n) for n in ("plus", "minus", "phase")}
    # v2 carries no amplitudes and the three share one probability table, so what tells them apart is
    # the reported input and the joint fidelity (0.5 / 0 / 0.25).
    assert len({r["observables"]["purityQ0"] for r in rs.values()}) == 1
    assert len({json.dumps(r["probabilities"], sort_keys=True) for r in rs.values()}) == 1
    assert {n: r["parameters"]["state"] for n, r in rs.items()} == {n: n for n in rs}
    assert rs["plus"]["observables"]["jointFidelityWithTwoCopies"] == pytest.approx(0.5, abs=EXACT)
    assert rs["minus"]["observables"]["jointFidelityWithTwoCopies"] == pytest.approx(0.0, abs=EXACT)
    assert rs["phase"]["observables"]["jointFidelityWithTwoCopies"] == pytest.approx(0.25, abs=EXACT)


# ------------------------------------------------------------------- C2 no-signalling (exact, not sampled)
@pytest.mark.parametrize("gate", ["I", "X", "Z"])
def test_c2_receiver_marginal_is_exact_half(gate):
    r = entanglement.bell_signalling(gate)
    assert r["engine"] == "exact_qiskit_local" and "counts" not in r
    want = po.bob_rho(po.alice_acts(po.bell_pair(), gate, [0]), 1)
    assert r["keyQubits"] == [1]  # the receiver-only view
    assert r["probabilities"]["0"] == pytest.approx(float(np.real(want[0, 0])), abs=1e-9)
    assert r["probabilities"]["1"] == pytest.approx(float(np.real(want[1, 1])), abs=1e-9)
    assert r["observables"]["zBasisAgreement"] == pytest.approx(po.joint_same_probability(gate, "Z"), abs=1e-9)
    assert r["observables"]["xBasisAgreement"] == pytest.approx(po.joint_same_probability(gate, "X"), abs=1e-9)


def test_c2_receiver_marginal_is_computed_by_partial_trace_not_shots():
    src = (pathlib.Path(ECHO_ROOT) / "quantum" / "entanglement.py").read_text()
    code = "\n".join(line.split("#", 1)[0] for line in src.splitlines())
    assert "partial_trace(" in code
    for bad in ("shots", "get_counts", "BasicSimulator", ".run("):
        assert bad not in code, bad


# ------------------------------------------------------------------- C3 one backend job (Python side)
def test_c3_python_guard_refuses_second_job():
    job = importlib.reload(qollab_job)
    b = CountingBackend(BasicSimulator())
    job.run_bell_verification_once(b, shots=256)
    with pytest.raises(job.BackendJobAlreadyUsed):
        job.run_bell_verification_once(b, shots=256)
    assert len(b.calls) == 1
    assert b.calls[0][1] == {"shots": 256}


# ------------------------------------------------------------------- Pyodide safety and plain types
# `sys` is a builtin module compiled into every CPython, Pyodide included (platform smoke.py uses it).
PYODIDE_OK = {"qiskit", "qiskit.quantum_info", "numpy", "math", "random", "numbers", "__future__", "sys"}


def test_imports_are_pyodide_safe_in_every_module():
    files = sorted((pathlib.Path(ECHO_ROOT) / "quantum").glob("*.py"))
    assert files
    for f in files:
        for node in ast.walk(ast.parse(f.read_text())):
            if isinstance(node, ast.Import):
                mods = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom) and not node.level:
                mods = [node.module]
            else:
                continue
            for m in mods:
                assert "aer" not in m.lower(), (f.name, m)
                assert m in PYODIDE_OK, (f.name, m)


PLAIN = (dict, list, str, int, float, bool, type(None))


def _census(v, path="$"):
    assert type(v) in PLAIN, f"{path}: {type(v).__module__}.{type(v).__name__}"
    if isinstance(v, dict):
        for k, x in v.items():
            assert type(k) is str
            _census(x, f"{path}.{k}")
    elif isinstance(v, list):
        for i, x in enumerate(v):
            _census(x, f"{path}[{i}]")


def test_backend_result_is_plain_even_with_numpy_counts():
    raw = {"00": np.int64(120), "11": np.int64(136)}  # what a numpy-backed provider can hand back
    _census(qollab_job.interpret_counts(raw, backend_name="x", shots_requested=256))


@pytest.mark.parametrize("name,thph", ALL[:7], ids=IDS[:7])
def test_every_teleport_and_clone_result_is_plain(name, thph):
    for r in (cloning.run_calibration(name), teleportation.live_commit(name, seed=1),
              teleportation.verify_deferred(name), teleportation.corrections_withheld(name),
              teleportation.bell_measurement(name, seed=3), teleportation.teleport_branch(name, 1, 1, True, False)):
        _census(r)


# ------------------------------------------------------------------- nulls the physics cannot see
# Round 1 of sabotage_product.py: an Alice/sender gate moved onto Bob/receiver leaves every output
# IDENTICAL ((I⊗X)Φ+ = (X⊗I)Φ+), so no physics assertion can catch it. Locality is a property of the
# circuit, so it is checked on the circuit the product actually builds.
def test_locality_alice_never_touches_bob_after_the_bell_pair():
    for name in PRODUCT_NAMED:
        qc = teleportation._protocol(name)
        ops = [(i.operation.name, [qc.find_bit(q).index for q in i.qubits]) for i in qc.data]
        bell = ops.index(("cx", [1, 2]))  # the pre-shared pair; the only gate allowed to span Alice-Bob
        assert ops[bell - 1] == ("h", [1])
        for gate, qubits in ops[bell + 1:]:
            assert set(qubits) <= {0, 1}, f"{name}: Alice's {gate}{qubits} touches Bob after the Bell pair"


@pytest.mark.parametrize("gate", ["X", "Z"])
def test_locality_sender_gate_acts_on_sender_only(monkeypatch, gate):
    built = []
    real = entanglement.Statevector

    class Spy:
        @staticmethod
        def from_instruction(qc):
            built.append(qc)
            return real.from_instruction(qc)

    monkeypatch.setattr(entanglement, "Statevector", Spy)
    entanglement.bell_signalling(gate)
    qc = built[0]
    ops = [(i.operation.name, [qc.find_bit(q).index for q in i.qubits]) for i in qc.data]
    assert ops[:2] == [("h", [0]), ("cx", [0, 1])]
    assert ops[2:] == [(gate.lower(), [0])], ops


# Round 1 null `product_threshold_loosened`: on a near-|0> state a wrong correction scores 0.913.
# The "mistake does not show here" fact must appear only when the wrong choice really scores 1.
def test_mistake_does_not_show_fact_only_when_fidelity_is_one(monkeypatch):
    monkeypatch.setitem(quantum.STATES, "near_zero", ((("ry", 0.3), ("rz", 0.7)), "near_zero"))
    seen_high_wrong = False
    for name in list(PRODUCT_NAMED) + ["near_zero"] + [n for n, _, _ in HAAR]:
        for (m0, m1) in TEXTBOOK_RULE:
            for ax, az in po.CORRECTIONS:
                r = teleportation.teleport_branch(name, m0, m1, ax, az)
                says_hidden = any("does not show" in f for f in r["facts"])
                if 0.9 < r["fidelity"] < 0.999999:
                    seen_high_wrong = True
                follows = (ax, az) == TEXTBOOK_RULE[(m0, m1)]  # the oracle's table, not the product's flag
                assert says_hidden == (not follows and r["fidelity"] > 0.999999), \
                    (name, m0, m1, ax, az, r["fidelity"])
    assert seen_high_wrong  # positive control: the dangerous band was actually exercised
