"""Bell pair / no-signalling (vision §7.3). Expected values derived by hand: sender = q0, receiver = q1,
Bell pair (|00>+|11>)/√2, then a sender-only gate."""
import math

import numpy as np
import pytest

from quantum import entanglement

R = 1 / math.sqrt(2)
I2 = np.eye(2)
X = np.array([[0, 1], [1, 0]], dtype=complex)
Z = np.array([[1, 0], [0, -1]], dtype=complex)
H = np.array([[1, 1], [1, -1]], dtype=complex) * R
GATES = {"I": I2, "X": X, "Z": Z}


def hand_joint(gate):
    """Joint amplitudes as a 2x2 array psi[s, r] (s = sender bit, r = receiver bit)."""
    bell = np.array([[R, 0], [0, R]], dtype=complex)
    return GATES[gate] @ bell  # a sender-only gate acts on the first index


def hand_receiver_rho(psi):
    return psi.T @ psi.conj()  # rho_r[r, r'] = sum_s psi[s,r] conj(psi[s,r'])


@pytest.mark.parametrize("gate", ["I", "X", "Z"])
def test_receiver_alone_sees_maximally_mixed_state(gate):
    rho = hand_receiver_rho(hand_joint(gate))
    assert np.allclose(rho, I2 / 2)  # the hand derivation itself says I/2
    r = entanglement.bell_signalling(gate)
    d = r["details"]
    assert r["experiment"] == "bell_signalling" and r["engine"] == "exact_qiskit_local"
    assert d["receiverMarginal"] == {"0": pytest.approx(0.5, abs=1e-9), "1": pytest.approx(0.5, abs=1e-9)}
    assert d["receiverPurity"] == pytest.approx(0.5, abs=1e-9)
    assert d["receiverBlochVector"] == pytest.approx([0, 0, 0], abs=1e-9)


@pytest.mark.parametrize("gate", ["I", "X", "Z"])
def test_joint_z_probabilities_match_hand(gate):
    psi = hand_joint(gate)
    r = entanglement.bell_signalling(gate)
    for s in (0, 1):
        for rb in (0, 1):
            assert r["probabilities"][f"sender={s},receiver={rb}"] == pytest.approx(abs(psi[s, rb]) ** 2, abs=1e-9)
    assert "counts" not in r


def test_i_versus_x_differs_only_in_the_joint_record():
    i, x = entanglement.bell_signalling("I"), entanglement.bell_signalling("X")
    # Receiver-only view identical...
    assert i["details"]["receiverMarginal"] == x["details"]["receiverMarginal"]
    # ...but comparing both logs: I gives always-equal Z bits, X always-different (hand: Φ+ vs Ψ+).
    assert i["details"]["zBasisAgreement"] == pytest.approx(1.0, abs=1e-9)
    assert x["details"]["zBasisAgreement"] == pytest.approx(0.0, abs=1e-9)


def test_z_shows_up_only_in_x_basis_comparison():
    # Z on Φ+ gives Φ-: same Z correlations, opposite X correlations. Hand: X-basis agreement of Φ- is 0.
    psi = hand_joint("Z")
    psi_x = H @ psi @ H.T  # H on both qubits
    agree = abs(psi_x[0, 0]) ** 2 + abs(psi_x[1, 1]) ** 2
    assert agree == pytest.approx(0.0, abs=1e-12)
    z = entanglement.bell_signalling("Z")["details"]
    assert z["zBasisAgreement"] == pytest.approx(1.0, abs=1e-9)
    assert z["xBasisAgreement"] == pytest.approx(agree, abs=1e-9)
    assert entanglement.bell_signalling("I")["details"]["xBasisAgreement"] == pytest.approx(1.0, abs=1e-9)


def test_bad_gate_rejected():
    with pytest.raises(ValueError):
        entanglement.bell_signalling("Y!")
