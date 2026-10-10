"""Teleportation (vision §7.1, §7.4, §10.5). q0 = source, q1 = Alice's Bell half, q2 = Bob.
m0 = source readout, m1 = Alice's Bell-half readout; rule: X iff m1 = 1, Z iff m0 = 1.

Expected values come from an independent numpy simulation written here (explicit 2x2 matrices on a
psi[q0, q1, q2] tensor) and from the textbook branch formula X^m1 Z^m0 |psi>; the two are checked
against each other before either is used to judge quantum.teleportation."""
import itertools
import math

import numpy as np
import pytest

from quantum import teleportation

R = 1 / math.sqrt(2)
I2 = np.eye(2, dtype=complex)
X = np.array([[0, 1], [1, 0]], dtype=complex)
Z = np.array([[1, 0], [0, -1]], dtype=complex)
Y = np.array([[0, -1j], [1j, 0]], dtype=complex)
H = np.array([[1, 1], [1, -1]], dtype=complex) * R


def bloch(theta, phi):
    # RY(theta) then RZ(phi) on |0>.
    return np.array([math.cos(theta / 2) * np.exp(-0.5j * phi), math.sin(theta / 2) * np.exp(0.5j * phi)])


STATES = {
    "zero": np.array([1, 0], dtype=complex),
    "one": np.array([0, 1], dtype=complex),
    "plus": np.array([R, R], dtype=complex),
    "minus": np.array([R, -R], dtype=complex),
    "phase": np.array([R, 1j * R], dtype=complex),
    "bloch_a": bloch(1.137, 0.44),
    "bloch_b": bloch(2.3, -1.9),
}
# Not an eigenstate of X, Y or Z: every wrong correction measurably lowers fidelity.
GENERIC = ["bloch_a", "bloch_b"]
BRANCHES = [(0, 0), (0, 1), (1, 0), (1, 1)]  # (m0, m1)
CHOICES = list(itertools.product([False, True], repeat=2))  # (applyX, applyZ)


def apply1(t, g, q):
    return np.einsum({0: "ab,bjk->ajk", 1: "ab,ibk->iak", 2: "ab,ijb->ija"}[q], g, t)


def cnot(t, c, tg):
    out = t.copy()
    idx = [slice(None)] * 3
    idx[c] = 1
    sub = t[tuple(idx)]
    # target axis index shifts by one after removing the control axis when the target comes after it
    ax = tg if tg < c else tg - 1
    out[tuple(idx)] = np.flip(sub, axis=ax)
    return out


def cz(t, a, b):
    out = t.copy()
    idx = [slice(None)] * 3
    idx[a] = 1
    idx[b] = 1
    out[tuple(idx)] *= -1
    return out


def hand_protocol(psi):
    """psi[q0,q1,q2] after H(q1); CX(q1,q2); CX(q0,q1); H(q0)."""
    t = np.einsum("a,b,c->abc", psi, [1, 0], [1, 0]).astype(complex)
    t = apply1(t, H, 1)
    t = cnot(t, 1, 2)
    t = cnot(t, 0, 1)
    t = apply1(t, H, 0)
    return t


def hand_branch(psi, m0, m1):
    t = hand_protocol(psi)
    bob = t[m0, m1, :]
    p = float(np.vdot(bob, bob).real)
    return p, bob / math.sqrt(p)


def hand_fidelity(psi, m0, m1, ax, az):
    _, bob = hand_branch(psi, m0, m1)
    if ax:
        bob = X @ bob
    if az:
        bob = Z @ bob
    return abs(np.vdot(psi, bob)) ** 2


def test_hand_simulation_agrees_with_textbook_branch_formula():
    for psi in STATES.values():
        for m0, m1 in BRANCHES:
            p, bob = hand_branch(psi, m0, m1)
            textbook = np.linalg.matrix_power(X, m1) @ np.linalg.matrix_power(Z, m0) @ psi
            assert p == pytest.approx(0.25, abs=1e-12)
            assert abs(np.vdot(textbook, bob)) ** 2 == pytest.approx(1.0, abs=1e-12)


def test_rule_table():
    # §6.5: (m0,m1)=(1,0) -> Z only; (0,1) -> X only; (1,1) -> X+Z; (0,0) -> none.
    table = {(0, 0): (False, False), (0, 1): (True, False), (1, 0): (False, True), (1, 1): (True, True)}
    for (m0, m1), (x, z) in table.items():
        assert teleportation.expected_corrections(m0, m1) == {"applyX": x, "applyZ": z}


@pytest.mark.parametrize("name", list(STATES))
@pytest.mark.parametrize("m0,m1", BRANCHES)
@pytest.mark.parametrize("ax,az", CHOICES)
def test_branch_model_fidelity_is_the_true_value(name, m0, m1, ax, az):
    psi = STATES[name]
    r = teleportation.teleport_branch(name, m0, m1, ax, az)
    expected = hand_fidelity(psi, m0, m1, ax, az)
    follows_rule = (ax == (m1 == 1)) and (az == (m0 == 1))
    assert r["experiment"] == "teleportation" and r["engine"] == "exact_qiskit_local"
    assert r["parameters"] == {"state": name, "m0": m0, "m1": m1, "applyX": ax, "applyZ": az}
    assert r["measurementBits"] == {"m0": m0, "m1": m1}
    assert r["fidelity"] == pytest.approx(expected, abs=1e-9)
    if follows_rule:
        assert r["fidelity"] >= 0.999999
    elif name in GENERIC:
        assert r["fidelity"] < 0.99  # a wrong choice is visibly wrong on a generic state
    obs = r["observables"]
    assert obs["branchProbability"] == pytest.approx(0.25, abs=1e-9)
    # The rule the player is told comes from (m0, m1) by hand: X iff m1 = 1, Z iff m0 = 1.
    rule = f"X {'ON' if m1 else 'OFF'}, Z {'ON' if m0 else 'OFF'}"
    assert f"the rule asks for {rule}." in r["facts"][0]
    hidden = "This mistake does not show on this state" in " ".join(r["facts"])
    assert hidden is bool(not follows_rule and expected > 0.999999)
    # Bob's corrected state, as a Bloch vector, against the hand-corrected vector.
    _, bob = hand_branch(psi, m0, m1)
    bob = (Z if az else I2) @ (X if ax else I2) @ bob
    rho = np.outer(bob, bob.conj())
    hand_bloch = [float(np.real(np.trace(rho @ P))) for P in (X, Y, Z)]
    assert [obs["receiverBlochX"], obs["receiverBlochY"], obs["receiverBlochZ"]] == pytest.approx(hand_bloch, abs=1e-9)
    # The original is consumed: q0 is left in |m0>, so it overlaps psi only by |<m0|psi>|^2.
    assert obs["sourceFidelityAfterMeasurement"] == pytest.approx(abs(psi[m0]) ** 2, abs=1e-9)
    # Branch table keyed with keyQubits [1, 0]: key "m1 m0".
    assert r["keyQubits"] == [1, 0]
    assert r["probabilities"] == {f"{b1}{b0}": pytest.approx(0.25, abs=1e-9) for b0, b1 in BRANCHES}


@pytest.mark.parametrize("name", GENERIC + ["plus", "phase"])
def test_no_second_copy_survives(name):
    # Bob ends with psi (fidelity 1) while the source qubit, now |m0>, is not psi.
    for m0, m1 in BRANCHES:
        r = teleportation.teleport_branch(name, m0, m1, m1 == 1, m0 == 1)
        assert r["fidelity"] >= 0.999999
        assert r["observables"]["sourceFidelityAfterMeasurement"] < 0.999


def test_wrong_choice_on_basis_state_is_honestly_harmless():
    # |0> is a Z eigenstate: a wrongly applied Z changes nothing physical. The engine must report 1, not fake a failure.
    r = teleportation.teleport_branch("zero", 0, 0, False, True)
    assert r["fidelity"] == pytest.approx(1.0, abs=1e-9)
    assert "the rule asks for X OFF, Z OFF." in r["facts"][0]  # the player chose Z: not the rule
    assert "This mistake does not show on this state" in " ".join(r["facts"])


@pytest.mark.parametrize("name", list(STATES))
def test_corrections_withheld_bob_sees_i_over_2(name):
    # Averaging Bob's branch states (each prob 1/4) without corrections: hand value is I/2 for every psi.
    rho = sum(0.25 * np.outer(b, b.conj()) for b in (hand_branch(STATES[name], *br)[1] for br in BRANCHES))
    assert np.allclose(rho, I2 / 2)
    r = teleportation.corrections_withheld(name)
    d = r["observables"]
    assert r["parameters"] == {"state": name} and "probabilities" not in r
    # A one-qubit state is fixed by its Bloch vector, so (0, 0, 0) with purity 1/2 IS I/2.
    assert [d["receiverBlochX"], d["receiverBlochY"], d["receiverBlochZ"]] == pytest.approx([0, 0, 0], abs=1e-9)
    assert d["receiverPurity"] == pytest.approx(0.5, abs=1e-9)
    assert r["fidelity"] == pytest.approx(0.5, abs=1e-9)  # <psi| I/2 |psi> = 1/2 for any pure psi


@pytest.mark.parametrize("name", list(STATES))
def test_deferred_measurement_verification(name):
    r = teleportation.verify_deferred(name)
    assert r["parameters"] == {"state": name, "controlledX": True, "controlledZ": True}
    assert r["fidelity"] >= 0.999999
    text = " ".join(r["facts"]).lower()
    assert "mathematical verification" in text and "not a physical" in text
    assert "cz" in r["circuitDescription"].lower()


@pytest.mark.parametrize("name", list(STATES))
@pytest.mark.parametrize("cx_on,cz_on", CHOICES)
def test_deferred_fidelity_is_computed_not_assumed(name, cx_on, cz_on):
    # Hand: run the coherent corrections (or not) on the numpy tensor, trace out q0 and q1, overlap with psi.
    psi = STATES[name]
    t = hand_protocol(psi)
    if cx_on:
        t = cnot(t, 1, 2)
    if cz_on:
        t = cz(t, 0, 2)
    rho = np.einsum("abc,abd->cd", t, t.conj())
    expected = float(np.real(np.conj(psi) @ rho @ psi))
    r = teleportation.verify_deferred(name, controlled_x=cx_on, controlled_z=cz_on)
    assert r["fidelity"] == pytest.approx(expected, abs=1e-9)
    if name in GENERIC and not (cx_on and cz_on):
        assert r["fidelity"] < 0.99


def test_live_commit_is_one_seeded_sample_with_rule_corrections():
    teleportation.reset_story_token()
    a = teleportation.live_commit(seed=7)
    teleportation.reset_story_token()
    b = teleportation.live_commit(seed=7)
    teleportation.reset_story_token()
    assert a == b
    bits = a["measurementBits"]
    assert bits["m0"] in (0, 1) and bits["m1"] in (0, 1)
    # platform's commit contract: the token's one name and the corrections the receiver applied
    assert a["parameters"] == {"stateId": "story_token", "applyX": bits["m1"] == 1, "applyZ": bits["m0"] == 1, "seed": 7}
    rule = f"X {'ON' if bits['m1'] else 'OFF'}, Z {'ON' if bits['m0'] else 'OFF'}"
    assert f"the receiver applied {rule}." in a["facts"][0]
    # The token is generic (test_rulings.py): every wrong correction scores < 0.99, so fidelity 1
    # proves the rule was applied to the live bits.
    assert a["fidelity"] >= 0.999999
    assert a["probabilities"] == {f"{b1}{b0}": pytest.approx(0.25, abs=1e-9) for b0, b1 in BRANCHES}
    assert "counts" not in a
    assert "one sample" in " ".join(a["facts"]).lower()


class FixedRng:
    def __init__(self, u):
        self.u = u

    def random(self):
        return self.u


@pytest.mark.parametrize("u,bits", [(0.1, (0, 0)), (0.3, (0, 1)), (0.6, (1, 0)), (0.9, (1, 1))])
def test_sampler_maps_draw_to_labelled_branch(u, bits):
    # Branch order is (m0,m1) = 00, 01, 10, 11, each with exact probability 1/4.
    r = teleportation.bell_measurement("plus", rng=FixedRng(u))
    assert (r["measurementBits"]["m0"], r["measurementBits"]["m1"]) == bits
    assert r["parameters"] == {"state": "plus"}  # unseeded: no seed parameter is invented


def test_sampler_is_roughly_uniform():
    tally = {b: 0 for b in BRANCHES}
    for seed in range(2000):
        m = teleportation.bell_measurement("bloch_b", seed=seed)["measurementBits"]
        tally[(m["m0"], m["m1"])] += 1
    for n in tally.values():
        assert 400 < n < 600  # 500 ± ~4.5 sigma


def test_qiskit_endianness_fixture():
    # Independent fixture for the convention our labels rely on: qubit 0 is the RIGHTMOST label character.
    from qiskit.quantum_info import Statevector

    sv = Statevector.from_label("001")
    assert np.argmax(np.abs(sv.data)) == 1  # index 1 = q0 set
