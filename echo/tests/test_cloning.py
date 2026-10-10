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


def verdict(r):
    """The copy verdict as the player reads it: from the facts, the only place the contract carries it."""
    text = " ".join(r["facts"])
    copied, not_copied = "Two matching basis values" in text, "Not two independent copies" in text
    assert copied != not_copied, f"exactly one verdict expected: {r['facts']}"
    return copied


@pytest.mark.parametrize("name", list(INPUTS))
def test_clone_matches_hand_derivation(name):
    psi = INPUTS[name]
    joint, rho_s, rho_c = hand_clone(psi)
    r = cloning.run_calibration(name)
    d = r["observables"]
    assert r["experiment"] == "cloning" and r["engine"] == "exact_qiskit_local" and r["qubits"] == 2
    assert d["purityQ0"] == pytest.approx(purity(rho_s), abs=1e-9)  # q0 = source
    assert d["purityQ1"] == pytest.approx(purity(rho_c), abs=1e-9)  # q1 = copy
    assert d["fidelityQ0WithInput"] == pytest.approx(fid(psi, rho_s), abs=1e-9)
    assert d["fidelityQ1WithInput"] == pytest.approx(fid(psi, rho_c), abs=1e-9)
    # Exact Z-basis probabilities, every outcome listed; keyQubits [1, 0] says key = (copy bit, source bit).
    assert r["keyQubits"] == [1, 0]
    assert set(r["probabilities"]) == {"00", "01", "10", "11"}
    for (s, c), amp in joint.items():
        assert r["probabilities"][f"{c}{s}"] == pytest.approx(abs(amp) ** 2, abs=1e-9)
    assert "counts" not in r
    product = np.kron(psi, psi)  # psi ⊗ psi, ordering irrelevant for identical factors
    hand_joint = np.array([joint[(0, 0)], joint[(0, 1)], joint[(1, 0)], joint[(1, 1)]])  # index = 2*s + c
    overlap = abs(np.vdot(product, hand_joint)) ** 2
    assert d["jointFidelityWithTwoCopies"] == pytest.approx(overlap, abs=1e-9)
    assert verdict(r) is bool(overlap > 1 - 1e-9)


def test_basis_states_copy_and_superpositions_do_not():
    # The deceptive beginning (§7.2): only the two Z-basis states come out as two copies.
    copied = {n for n in INPUTS if verdict(cloning.run_calibration(n))}
    assert copied == {"zero", "one"}


def test_copy_verdict_is_derived_from_the_state_not_its_name(monkeypatch):
    # The test supplies its own preparations under names the code has never seen: a disguised basis
    # state must be reported as copied, a disguised superposition as not.
    import quantum

    monkeypatch.setitem(quantum.STATES, "test_basis", ((("x",), ("z",)), "test"))  # -|1>: a basis state
    monkeypatch.setitem(quantum.STATES, "test_zero_alias", ((("ry", 0.0),), "test"))  # |0>
    monkeypatch.setitem(quantum.STATES, "test_tilted", ((("ry", 0.3),), "test"))  # not a basis state
    assert verdict(cloning.run_calibration("test_basis")) is True
    assert verdict(cloning.run_calibration("test_zero_alias")) is True
    assert verdict(cloning.run_calibration("test_tilted")) is False


@pytest.mark.parametrize("name", ["plus", "minus", "phase"])
def test_equal_superpositions_give_maximally_mixed_outputs(name):
    r = cloning.run_calibration(name)
    d = r["observables"]
    assert d["purityQ0"] == pytest.approx(0.5, abs=1e-9)
    assert d["purityQ1"] == pytest.approx(0.5, abs=1e-9)
    assert "entangled with each other" in " ".join(r["facts"])
    # plus/minus/phase: overlap with psi⊗psi is |a|^4+|b|^4 + 2Re(...)... hand value for |+>: |<++|Φ+>|^2 = 1/2
    if name == "plus":
        assert d["jointFidelityWithTwoCopies"] == pytest.approx(0.5, abs=1e-9)


def test_plus_output_is_the_bell_pair_distribution():
    # (|00>+|11>)/√2: only matching outcomes, the zeros listed explicitly so the UI can show "never 01".
    assert cloning.run_calibration("plus")["probabilities"] == pytest.approx(
        {"00": 0.5, "01": 0.0, "10": 0.0, "11": 0.5}, abs=1e-9)


def test_relative_phase_reaches_the_result():
    # plus, minus and phase have identical probabilities and purities; only the relative phase differs.
    # Hand: |<ψ⊗ψ | a|00> + b|11>>|² = |conj(a)²·a + conj(b)²·b|²: plus 1/2, minus 0, phase 1/4.
    # A lost "i" (phase prepared as plus) would read 0.5 here.
    for name, expected in (("plus", 0.5), ("minus", 0.0), ("phase", 0.25)):
        a, b = INPUTS[name]
        hand = abs(np.conj(a) ** 2 * a + np.conj(b) ** 2 * b) ** 2
        assert hand == pytest.approx(expected, abs=1e-12)
        got = cloning.run_calibration(name)["observables"]["jointFidelityWithTwoCopies"]
        assert got == pytest.approx(expected, abs=1e-9)


def test_source_and_copy_are_labelled_by_qubit(monkeypatch):
    # On the real circuit the two outputs are identical (a|00>+b|11> is symmetric under swapping the
    # qubits), so no output can tell source from copy: tracing out the wrong qubit is invisible there.
    # A positive control breaks the symmetry: with the duplicator CNOT disabled the joint state is
    # psi (q0) ⊗ |0> (q1), so the source still holds psi and the blank copy does not.
    class NoCopyCircuit(cloning.QuantumCircuit):
        def cx(self, *args, **kwargs):
            return None

    monkeypatch.setattr(cloning, "QuantumCircuit", NoCopyCircuit)
    psi = INPUTS["bloch_a"]
    d = cloning.run_calibration("bloch_a")["observables"]
    assert d["fidelityQ0WithInput"] == pytest.approx(1.0, abs=1e-9)
    assert d["fidelityQ1WithInput"] == pytest.approx(abs(psi[0]) ** 2, abs=1e-9)  # <psi|0><0|psi>
    assert d["fidelityQ1WithInput"] < 0.9


def test_unknown_state_rejected():
    with pytest.raises(ValueError):
        cloning.run_calibration("psi_of_my_choosing")
