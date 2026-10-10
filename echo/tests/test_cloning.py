"""No-cloning (vision §7.2). Every expected value here is derived by hand from the amplitudes below,
never read back from quantum.cloning."""
import math

import numpy as np
import pytest

from quantum import cloning

R = 1 / math.sqrt(2)


def bloch(theta, phi):
    # RY(theta) then RZ(phi) on |0>: RZ(phi) = diag(e^{-i phi/2}, e^{+i phi/2}).
    return np.array([math.cos(theta / 2) * np.exp(-0.5j * phi), math.sin(theta / 2) * np.exp(0.5j * phi)])


# Hand-written single-qubit inputs (alpha, beta).
INPUTS = {
    "zero": np.array([1, 0], dtype=complex),
    "one": np.array([0, 1], dtype=complex),
    "plus": np.array([R, R], dtype=complex),
    "minus": np.array([R, -R], dtype=complex),
    "phase": np.array([R, 1j * R], dtype=complex),
    "bloch_a": bloch(1.137, 0.44),
    "bloch_b": bloch(2.3, -1.9),
}


def hand_clone(psi):
    """CNOT(source -> blank |0>) maps a|0>+b|1> to a|00>+b|11>. Returns (joint, rho_source, rho_copy)."""
    a, b = psi
    joint = {(0, 0): a, (1, 1): b, (0, 1): 0, (1, 0): 0}  # keys: (source bit, copy bit)
    # Each output alone: diag(|a|^2, |b|^2) — the off-diagonal a*conj(b) needs <0|1> on the other qubit = 0.
    rho = np.diag([abs(a) ** 2, abs(b) ** 2]).astype(complex)
    return joint, rho, rho


def purity(rho):
    return float(np.real(np.trace(rho @ rho)))


def fid(psi, rho):
    return float(np.real(np.conj(psi) @ rho @ psi))


@pytest.mark.parametrize("name", list(INPUTS))
def test_clone_matches_hand_derivation(name):
    psi = INPUTS[name]
    joint, rho_s, rho_c = hand_clone(psi)
    r = cloning.run_calibration(name)
    d = r["details"]
    assert r["experiment"] == "cloning" and r["engine"] == "exact_qiskit_local" and r["qubits"] == 2
    assert d["sourcePurity"] == pytest.approx(purity(rho_s), abs=1e-9)
    assert d["copyPurity"] == pytest.approx(purity(rho_c), abs=1e-9)
    assert d["sourceFidelity"] == pytest.approx(fid(psi, rho_s), abs=1e-9)
    assert d["copyFidelity"] == pytest.approx(fid(psi, rho_c), abs=1e-9)
    # Exact Z-basis probabilities with explicit labels (no raw Qiskit bitstrings).
    for (s, c), amp in joint.items():
        assert r["probabilities"][f"source={s},copy={c}"] == pytest.approx(abs(amp) ** 2, abs=1e-9)
    assert "counts" not in r
    product = np.kron(psi, psi)  # psi ⊗ psi, ordering irrelevant for identical factors
    hand_joint = np.array([joint[(0, 0)], joint[(0, 1)], joint[(1, 0)], joint[(1, 1)]])  # index = 2*s + c
    overlap = abs(np.vdot(product, hand_joint)) ** 2
    assert d["jointFidelityWithTwoCopies"] == pytest.approx(overlap, abs=1e-9)
    assert d["isTwoIndependentCopies"] is bool(overlap > 1 - 1e-9)


def test_basis_states_copy_and_superpositions_do_not():
    # The deceptive beginning (§7.2): only the two Z-basis states come out as two copies.
    copied = {n for n in INPUTS if cloning.run_calibration(n)["details"]["isTwoIndependentCopies"]}
    assert copied == {"zero", "one"}


def test_copy_verdict_is_derived_from_the_state_not_its_name(monkeypatch):
    # The test supplies its own preparations under names the code has never seen: a disguised basis
    # state must be reported as copied, a disguised superposition as not.
    import quantum

    monkeypatch.setitem(quantum.STATES, "test_basis", ((("x",), ("z",)), "test"))  # -|1>: a basis state
    monkeypatch.setitem(quantum.STATES, "test_zero_alias", ((("ry", 0.0),), "test"))  # |0>
    monkeypatch.setitem(quantum.STATES, "test_tilted", ((("ry", 0.3),), "test"))  # not a basis state
    assert cloning.run_calibration("test_basis")["details"]["isTwoIndependentCopies"] is True
    assert cloning.run_calibration("test_zero_alias")["details"]["isTwoIndependentCopies"] is True
    assert cloning.run_calibration("test_tilted")["details"]["isTwoIndependentCopies"] is False


@pytest.mark.parametrize("name", ["plus", "minus", "phase"])
def test_equal_superpositions_give_maximally_mixed_outputs(name):
    d = cloning.run_calibration(name)["details"]
    assert d["sourcePurity"] == pytest.approx(0.5, abs=1e-9)
    assert d["copyPurity"] == pytest.approx(0.5, abs=1e-9)
    assert d["isEntangled"] is True
    # plus/minus/phase: overlap with psi⊗psi is |a|^4+|b|^4 + 2Re(...)... hand value for |+>: |<++|Φ+>|^2 = 1/2
    if name == "plus":
        assert d["jointFidelityWithTwoCopies"] == pytest.approx(0.5, abs=1e-9)


def test_plus_amplitudes_are_bell_pair():
    # (|00>+|11>)/√2, amplitudes as [re, im] pairs keyed by explicit register names.
    amps = cloning.run_calibration("plus")["details"]["amplitudes"]
    assert amps["source=0,copy=0"] == pytest.approx([R, 0], abs=1e-9)
    assert amps["source=1,copy=1"] == pytest.approx([R, 0], abs=1e-9)
    assert amps["source=0,copy=1"] == pytest.approx([0, 0], abs=1e-9)
    assert amps["source=1,copy=0"] == pytest.approx([0, 0], abs=1e-9)


def test_phase_amplitudes_keep_the_i():
    amps = cloning.run_calibration("phase")["details"]["amplitudes"]
    assert amps["source=1,copy=1"] == pytest.approx([0, R], abs=1e-9)


def test_unknown_state_rejected():
    with pytest.raises(ValueError):
        cloning.run_calibration("psi_of_my_choosing")
