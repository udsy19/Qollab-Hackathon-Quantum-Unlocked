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
    d = r["observables"]
    assert r["experiment"] == "bell_signalling" and r["engine"] == "exact_qiskit_local"
    # The probability table is the receiver-only view: keyQubits [1] = the receiver's qubit alone.
    assert r["keyQubits"] == [1]
    assert r["probabilities"] == {"0": pytest.approx(rho[0, 0].real, abs=1e-9), "1": pytest.approx(rho[1, 1].real, abs=1e-9)}
    assert d["receiverPurity"] == pytest.approx(0.5, abs=1e-9)
    assert [d["receiverBlochX"], d["receiverBlochY"], d["receiverBlochZ"]] == pytest.approx([0, 0, 0], abs=1e-9)


@pytest.mark.parametrize("gate", ["I", "X", "Z"])
def test_joint_z_record_matches_hand(gate):
    # The joint record is not in the receiver's table; it reaches the result only as the agreement a
    # classical comparison of both logs would find.
    psi = hand_joint(gate)
    r = entanglement.bell_signalling(gate)
    agree = abs(psi[0, 0]) ** 2 + abs(psi[1, 1]) ** 2
    assert r["observables"]["zBasisAgreement"] == pytest.approx(agree, abs=1e-9)
    assert "counts" not in r


def test_i_versus_x_differs_only_in_the_joint_record():
    i, x = entanglement.bell_signalling("I"), entanglement.bell_signalling("X")
    # Receiver-only view identical...
    assert i["probabilities"] == x["probabilities"]
    # ...but comparing both logs: I gives always-equal Z bits, X always-different (hand: Φ+ vs Ψ+).
    assert i["observables"]["zBasisAgreement"] == pytest.approx(1.0, abs=1e-9)
    assert x["observables"]["zBasisAgreement"] == pytest.approx(0.0, abs=1e-9)


def test_z_shows_up_only_in_x_basis_comparison():
    # Z on Φ+ gives Φ-: same Z correlations, opposite X correlations. Hand: X-basis agreement of Φ- is 0.
    psi = hand_joint("Z")
    psi_x = H @ psi @ H.T  # H on both qubits
    agree = abs(psi_x[0, 0]) ** 2 + abs(psi_x[1, 1]) ** 2
    assert agree == pytest.approx(0.0, abs=1e-12)
    z = entanglement.bell_signalling("Z")["observables"]
    assert z["zBasisAgreement"] == pytest.approx(1.0, abs=1e-9)
    assert z["xBasisAgreement"] == pytest.approx(agree, abs=1e-9)
    assert entanglement.bell_signalling("I")["observables"]["xBasisAgreement"] == pytest.approx(1.0, abs=1e-9)


def test_receiver_is_q1_and_the_gate_acts_on_q0(monkeypatch):
    # On the Bell pair the two halves are indistinguishable: both marginals are I/2, and X on either
    # half gives the same state ((X⊗I)Φ+ = (I⊗X)Φ+). A positive control breaks the symmetry: with the
    # entangling CNOT disabled the state is |+> (q0, sender) ⊗ |0> (q1, receiver). Hand: sender X leaves
    # |+> unchanged and the receiver reads 0 with certainty; X on the receiver, or the sender's marginal,
    # would read 1/2 or 1.
    class NoEntangler(entanglement.QuantumCircuit):
        def cx(self, *args, **kwargs):
            return None

    monkeypatch.setattr(entanglement, "QuantumCircuit", NoEntangler)
    r = entanglement.bell_signalling("X")
    assert r["probabilities"] == {"0": pytest.approx(1.0, abs=1e-9), "1": pytest.approx(0.0, abs=1e-9)}
    assert r["observables"]["receiverBlochZ"] == pytest.approx(1.0, abs=1e-9)


def test_bad_gate_rejected():
    with pytest.raises(ValueError):
        entanglement.bell_signalling("Y!")
