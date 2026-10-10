"""Owner rulings for the quantum lane (lanes/quantum/rulings.md, 2026-10-10), each pinned here:
random generic dry-run states passed explicitly (1), the hidden story token (2), bits first and
corrections second (4), the m1 label (5), the backend experiment value (6), the EXACT relay panel (7)
and the once-only atomic commit (8). Every expected number is derived in this file from hand-written
2x2 matrices, never read back from the engine."""
import math
import random
import re

import numpy as np
import pytest

import quantum
from conftest import bridge_calls
from quantum import cloning, entanglement, qollab_job, teleportation

X = np.array([[0, 1], [1, 0]], dtype=complex)
Y = np.array([[0, -1j], [1j, 0]], dtype=complex)
Z = np.array([[1, 0], [0, -1]], dtype=complex)
I2 = np.eye(2, dtype=complex)
BRANCHES = [(0, 0), (0, 1), (1, 0), (1, 1)]
CHOICES = [(False, False), (False, True), (True, False), (True, True)]
# The generic margin, restated here, not imported: a wrong choice scores r_P^2, and platform's contract
# (contracts-v2 GENERIC_MAX_WRONG_FIDELITY) caps that at 0.9 for every state the game may send.
MAX_WRONG = 0.9


def ket(theta, phi):
    # RY(theta) then RZ(phi) on |0>.
    return np.array([math.cos(theta / 2) * np.exp(-0.5j * phi), math.sin(theta / 2) * np.exp(0.5j * phi)])


def bloch_of(v):
    rho = np.outer(v, v.conj())
    return [float(np.real(np.trace(rho @ P))) for P in (X, Y, Z)]


def hand_receiver(psi, m0, m1, ax, az):
    """Bob's branch state is X^m1 Z^m0 |psi> (checked against a full simulation in test_teleportation);
    the player then applies X if ax, then Z if az."""
    bob = np.linalg.matrix_power(X, m1) @ np.linalg.matrix_power(Z, m0) @ psi
    return (Z if az else I2) @ (X if ax else I2) @ bob


def angles(r):
    return r["parameters"]["theta"], r["parameters"]["phi"]


@pytest.fixture(autouse=True)
def fresh_token():
    teleportation.reset_story_token()
    yield
    teleportation.reset_story_token()


# ------------------------------------------------------------------ ruling 1: random generic dry runs
def test_every_calibration_draw_is_generic_and_fresh():
    seen = set()
    octants = set()
    for seed in range(400):
        theta, phi = angles(teleportation.bell_measurement("calibration", seed=seed))
        r = bloch_of(ket(theta, phi))
        assert max(c * c for c in r) <= MAX_WRONG, (seed, r)
        seen.add((theta, phi))
        octants.add(tuple(c > 0 for c in r))
    assert len(seen) == 400  # a fresh point every time, never a fixed catalogue state
    assert len(octants) == 8  # the draw covers the whole sphere, not one patch of it


def test_unseeded_dry_runs_draw_different_states():
    a = angles(teleportation.bell_measurement("calibration"))
    b = angles(teleportation.bell_measurement("calibration"))
    assert a != b


@pytest.mark.parametrize("seed", range(40))
def test_every_wrong_choice_visibly_fails_on_a_calibration_state(seed):
    bits = teleportation.bell_measurement("calibration", seed=seed)
    theta, phi = angles(bits)
    psi = ket(theta, phi)
    r_in = bloch_of(psi)
    for m0, m1 in BRANCHES:
        for ax, az in CHOICES:
            r = teleportation.teleport_branch("calibration", m0, m1, ax, az, theta=theta, phi=phi)
            out = hand_receiver(psi, m0, m1, ax, az)
            expected = abs(np.vdot(psi, out)) ** 2
            assert r["fidelity"] == pytest.approx(expected, abs=1e-9)
            right = (ax == (m1 == 1)) and (az == (m0 == 1))
            if right:
                assert r["fidelity"] >= 0.999999
            else:
                assert r["fidelity"] <= MAX_WRONG + 1e-9  # the generic margin, every wrong choice
            # The receiver's Bloch arrow (physics review F1) and the input arrow it is compared with.
            obs = r["observables"]
            assert [obs["receiverBlochX"], obs["receiverBlochY"], obs["receiverBlochZ"]] == pytest.approx(bloch_of(out), abs=1e-9)
            assert [obs["inputBlochX"], obs["inputBlochY"], obs["inputBlochZ"]] == pytest.approx(r_in, abs=1e-9)
            assert "does not show" not in " ".join(r["facts"])  # the optional fact never fires on a generic state


def test_calibration_state_is_the_one_passed_in_not_hidden_module_state():
    a = teleportation.bell_measurement("calibration", seed=101)
    b = teleportation.bell_measurement("calibration", seed=202)  # a later draw must not displace a
    ta, pa = angles(a)
    assert angles(b) != (ta, pa)
    r = teleportation.teleport_branch("calibration", 1, 1, False, False, theta=ta, phi=pa)
    assert (r["parameters"]["theta"], r["parameters"]["phi"]) == (ta, pa)
    psi = ket(ta, pa)
    assert r["fidelity"] == pytest.approx(abs(np.vdot(psi, hand_receiver(psi, 1, 1, False, False))) ** 2, abs=1e-9)
    obs = r["observables"]
    assert [obs["inputBlochX"], obs["inputBlochY"], obs["inputBlochZ"]] == pytest.approx(bloch_of(psi), abs=1e-9)
    # The bits call also reports the input arrow for the same angles.
    ob = a["observables"]
    assert [ob["inputBlochX"], ob["inputBlochY"], ob["inputBlochZ"]] == pytest.approx(bloch_of(psi), abs=1e-9)


@pytest.mark.parametrize("theta,phi", [
    (0.1, 0.0),                     # near |0>: r_z ~ 0.995
    (math.pi / 2, 0.0),             # |+>: r_x = 1
    (math.pi / 2, math.pi / 2),     # |+i>: r_y = 1
    (math.pi, 1.0),                 # |1> up to phase
    (2 * math.acos(math.sqrt((1 + 0.96) / 2)), 0.3),  # r_z = 0.96: a wrong Z would score 0.9216
])
def test_non_generic_calibration_angles_are_refused(theta, phi):
    with pytest.raises(ValueError, match="not generic"):
        teleportation.teleport_branch("calibration", 0, 1, True, False, theta=theta, phi=phi)
    with pytest.raises(ValueError, match="not generic"):
        teleportation.bell_measurement("calibration", theta=theta, phi=phi)


def test_a_state_just_inside_the_margin_is_accepted_with_its_angles_unrounded():
    # r_z^2 = 0.89 <= 0.9: the contract would send it, so the engine must take it, and echo the exact
    # angles back (the game checks them to 1e-12; JS angles carry ~16 significant digits).
    theta, phi = 2 * math.acos(math.sqrt((1 + math.sqrt(0.89)) / 2)), 0.123456789012345
    r = teleportation.teleport_branch("calibration", 0, 1, False, False, theta=theta, phi=phi)
    assert r["parameters"]["theta"] == theta and r["parameters"]["phi"] == phi
    assert r["fidelity"] == pytest.approx(abs(np.vdot(ket(theta, phi), hand_receiver(ket(theta, phi), 0, 1, False, False))) ** 2, abs=1e-9)
    b = teleportation.bell_measurement("calibration", theta=theta, phi=phi, seed=1)
    assert b["parameters"]["theta"] == theta and b["parameters"]["phi"] == phi


@pytest.mark.parametrize("theta,phi", [(None, 0.4), (1.2, None), (float("nan"), 0.4), (True, 0.4), ("1.2", 0.4)])
def test_malformed_calibration_angles_are_refused(theta, phi):
    with pytest.raises(ValueError):
        teleportation.teleport_branch("calibration", 0, 1, True, False, theta=theta, phi=phi)


def test_angles_are_refused_for_a_named_state():
    with pytest.raises(ValueError, match="only accepted"):
        teleportation.teleport_branch("plus", 0, 0, False, False, theta=1.0, phi=0.5)


def test_named_state_blind_spot_is_still_available_as_an_optional_fact():
    # |0> is a Z eigenstate: a wrong Z changes nothing, and the engine says so instead of faking a failure.
    r = teleportation.teleport_branch("zero", 0, 0, False, True)
    assert r["fidelity"] == pytest.approx(1.0, abs=1e-9)
    assert "This mistake does not show on this state" in " ".join(r["facts"])


# ------------------------------------------------------------------ ruling 4: bits first, corrections second
def test_bits_call_has_no_correction_and_no_fidelity():
    bits = teleportation.bell_measurement("calibration", seed=5)
    assert set(bits["measurementBits"]) == {"m0", "m1"}
    assert "fidelity" not in bits
    assert not {"applyX", "applyZ"} & set(bits["parameters"])
    m0, m1 = bits["measurementBits"]["m0"], bits["measurementBits"]["m1"]
    r = teleportation.teleport_branch("calibration", m0, m1, m1 == 1, m0 == 1, *(), theta=bits["parameters"]["theta"],
                                      phi=bits["parameters"]["phi"])
    assert r["measurementBits"] == bits["measurementBits"] and r["fidelity"] >= 0.999999


# ------------------------------------------------------------------ ruling 2: the hidden story token
TOKEN_GATES = quantum.STATES[quantum.STORY_TOKEN_ID][0]


def test_token_is_a_generic_bloch_point_prepared_ry_then_rz():
    assert [g[0] for g in TOKEN_GATES] == ["ry", "rz"]
    theta, phi = TOKEN_GATES[0][1], TOKEN_GATES[1][1]
    assert max(c * c for c in bloch_of(ket(theta, phi))) <= MAX_WRONG
    assert not re.search(r"\d", quantum.STATES[quantum.STORY_TOKEN_ID][1])  # its label carries no number


@pytest.mark.parametrize("call", [
    lambda: cloning.run_calibration(quantum.STORY_TOKEN_ID),
    lambda: teleportation.bell_measurement(quantum.STORY_TOKEN_ID, seed=1),
    lambda: teleportation.teleport_branch(quantum.STORY_TOKEN_ID, 0, 0, False, False),
    lambda: teleportation.corrections_withheld(quantum.STORY_TOKEN_ID),
    lambda: teleportation.verify_deferred(quantum.STORY_TOKEN_ID),
])
def test_token_is_never_a_calibration_state(call):
    with pytest.raises(ValueError, match="story token"):
        call()


def _leak_values():
    theta, phi = TOKEN_GATES[0][1], TOKEN_GATES[1][1]
    psi = ket(theta, phi)
    vals = [theta, phi, theta / 2, phi / 2, abs(psi[0]) ** 2, abs(psi[1]) ** 2]  # angles, half-angles, overlaps
    vals += bloch_of(psi)
    return [v for v in vals] + [-v for v in vals]


def _numbers(v, path="result"):
    if isinstance(v, bool):
        return
    if isinstance(v, (int, float)):
        yield path, float(v), 1e-8
    elif isinstance(v, str):
        # A printed number matches a leak to its printed precision. Below 4 decimals that precision is too
        # coarse to mean anything (bloch_a's own "RZ(0.44)" is within 0.005 of the token's -r_z), so a
        # short number must match a leak exactly: that still catches a printed angle such as "2.03".
        for m in re.finditer(r"-?\d+\.\d+", v):
            decimals = len(m.group().split(".")[1])
            yield path, float(m.group()), (0.5 * 10 ** -decimals + 1e-12) if decimals >= 4 else 1e-9
    elif isinstance(v, dict):
        for k, x in v.items():
            yield from _numbers(x, f"{path}.{k}")
    elif isinstance(v, list):
        for i, x in enumerate(v):
            yield from _numbers(x, f"{path}[{i}]")


def test_no_result_field_reveals_the_token():
    leaks = _leak_values()
    results = [(label, fn()) for label, fn in bridge_calls()]
    for seed in range(8):
        teleportation.reset_story_token()
        results.append((f"live_commit(seed={seed})", teleportation.live_commit(seed=seed)))
    assert sum("live_commit" in label for label, _ in results) >= 8
    found = []
    for label, result in results:
        for path, value, tol in _numbers(result):
            if any(abs(value - leak) <= tol for leak in leaks):
                found.append((label, path, value))
    assert not found, found[:10]


def test_leak_scan_bites_on_a_planted_leak():
    # Positive control: the scan must catch the token's Bloch component in an observable and its angle in text.
    theta = TOKEN_GATES[0][1]
    rx = bloch_of(ket(theta, TOKEN_GATES[1][1]))[0]
    leaks = _leak_values()
    planted = {"observables": {"receiverBlochX": round(rx, 10)}, "facts": [f"angle {theta:.6f}"]}
    hits = [p for p, v, tol in _numbers(planted) if any(abs(v - leak) <= tol for leak in leaks)]
    assert hits == ["result.observables.receiverBlochX", "result.facts[0]"]


# ------------------------------------------------------------------ ruling 8: the atomic, once-only commit
def _token_psi():
    return ket(TOKEN_GATES[0][1], TOKEN_GATES[1][1])


def test_commit_delivers_the_token_on_every_live_branch():
    seen = set()
    for seed in range(40):
        teleportation.reset_story_token()
        r = teleportation.live_commit(seed=seed)
        b = r["measurementBits"]
        seen.add((b["m0"], b["m1"]))
        # Independent check that the live rule fixes THIS branch: the hand receiver with the rule's choice.
        psi = _token_psi()
        out = hand_receiver(psi, b["m0"], b["m1"], b["m1"] == 1, b["m0"] == 1)
        assert r["fidelity"] == pytest.approx(abs(np.vdot(psi, out)) ** 2, abs=1e-9)
        assert r["fidelity"] >= 0.999999
        assert "computed exactly by local Qiskit" in " ".join(r["facts"])
    assert seen == set(BRANCHES)


def test_second_commit_in_the_same_run_is_refused_honestly():
    teleportation.live_commit(seed=3)
    with pytest.raises(teleportation.TokenAlreadyConsumed, match="already measured"):
        teleportation.live_commit(seed=4)
    with pytest.raises(teleportation.TokenAlreadyConsumed):
        teleportation.live_commit()


def test_reset_story_token_re_arms_the_commit_for_restart():
    first = teleportation.live_commit(seed=3)
    teleportation.reset_story_token()
    again = teleportation.live_commit(seed=3)
    assert again == first


@pytest.mark.parametrize("where", ["_branch", "experiment_result", "_sample"])
def test_a_commit_that_raises_does_not_consume_the_token(monkeypatch, where):
    def boom(*args, **kwargs):
        raise RuntimeError("scientific module error (injected by the test)")

    monkeypatch.setattr(teleportation, where, boom)
    with pytest.raises(RuntimeError, match="injected"):
        teleportation.live_commit(seed=9)
    monkeypatch.undo()
    r = teleportation.live_commit(seed=9)  # nothing was measured: the retry is the first commit
    assert r["fidelity"] >= 0.999999
    with pytest.raises(teleportation.TokenAlreadyConsumed):
        teleportation.live_commit(seed=9)


# ------------------------------------------------------------------ ruling 6: backend experiment value
def test_selected_backend_job_is_labelled_backend_verification():
    r = qollab_job.interpret_counts({"00": 128, "11": 128}, "fake", shots_requested=256)
    assert r["experiment"] == "backend_verification"
    assert not [label for label, fn in bridge_calls() if "bell_verification" in str(fn().get("experiment"))]


# ------------------------------------------------------------------ ruling 7: EXACT relay receiver panel
@pytest.mark.parametrize("gate,G", [("I", I2), ("X", X), ("Z", Z)])
def test_relay_receiver_panel_is_exact_and_labelled_exact(gate, G):
    phi_plus = np.array([1, 0, 0, 1], dtype=complex) / math.sqrt(2)  # index = sender + 2*receiver
    state = np.kron(I2, G) @ phi_plus  # the sender's gate acts on q0, the rightmost kron factor
    t = state.reshape(2, 2)  # [receiver, sender]
    rho_receiver = t @ t.conj().T
    r = entanglement.bell_signalling(gate)
    assert "counts" not in r and r["engine"] == "exact_qiskit_local"
    assert r["keyQubits"] == [1]
    assert r["probabilities"] == pytest.approx({"0": rho_receiver[0, 0].real, "1": rho_receiver[1, 1].real}, abs=1e-12)
    receiver_fact = next(f for f in r["facts"] if f.startswith("Receiver alone"))
    assert "EXACT" in receiver_fact and "not sampled" in receiver_fact


# ------------------------------------------------------------------ review follow-ups
def test_every_string_naming_m1_uses_the_owner_label_including_circuit_descriptions():
    # Ruling 5: wherever m1 is named on screen (facts and circuitDescription), it is the owner's label.
    named = 0
    for _, fn in bridge_calls():
        r = fn()
        for text in [r["circuitDescription"], *r["facts"]]:
            bare = len(re.findall(r"\bm1\b", text))
            named += bare
            assert bare == text.count("LOCAL BELL-HALF READOUT m1"), text
            assert "local bell-half readout)" not in text.lower()
    assert named > 100  # checked on the strings that actually carry m1, not on none


@pytest.mark.parametrize("bad", [1.5, True, "7"])
def test_a_seed_that_is_not_an_integer_is_refused_before_anything_is_measured(bad):
    with pytest.raises(ValueError, match="seed"):
        teleportation.live_commit(seed=bad)
    with pytest.raises(ValueError, match="seed"):
        teleportation.bell_measurement("calibration", seed=bad)
    assert teleportation.live_commit(seed=1)["fidelity"] >= 0.999999  # the refusal consumed nothing


@pytest.mark.parametrize("bad", ["false", 1, None])
def test_correction_flags_must_be_booleans(bad):
    with pytest.raises(ValueError, match="applyX"):
        teleportation.teleport_branch("bloch_a", 0, 1, bad, False)
