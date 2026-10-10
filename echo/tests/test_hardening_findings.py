"""Physics-review findings F3-F7 (vault/Reports/quantum-physics-review.md §4), each pinned by a test
that was written before its fix and watched red (evidence/quantum/hardening/red-before/)."""
import math
import random

import numpy as np
import pytest

import quantum
from quantum import cloning, qollab_job, teleportation


# ------------------------------------------------------------------------------------------- F3
@pytest.mark.parametrize("name,m0", [("zero", 0), ("one", 1)])
def test_basis_source_fact_names_the_random_readout_not_a_false_cause(name, m0):
    # After H(q0) the readout m0 is 50/50 for EVERY input: a match with a basis state is a coincidence
    # of that random readout, not "because it was already a known Z value".
    m1 = 0
    facts = " ".join(teleportation.teleport_branch(name, m0, m1, m1 == 1, m0 == 1)["facts"])
    assert "because it was already" not in facts
    assert "random (50/50)" in facts and "happened to match" in facts
    assert "does not keep the state" in facts


# ------------------------------------------------------------------------------------------- F4
def test_fidelity_text_says_computed_exactly_not_measured():
    r = teleportation.teleport_branch("bloch_a", 1, 0, False, True)
    text = " ".join(r["facts"])
    assert f"{r['fidelity']:.6f}" in text
    assert "computed exactly by local Qiskit" in text
    assert "cannot be measured" in text  # one copy of an unknown state has no measurable fidelity


# ------------------------------------------------------------------------------------------- F5
def chi2_sf_df3(x):
    """Survival function of chi-square with 3 degrees of freedom, closed form (no scipy in Pyodide or here):
    P(X > x) = erfc(sqrt(x/2)) + sqrt(2x/pi) * exp(-x/2)."""
    return math.erfc(math.sqrt(x / 2)) + math.sqrt(2 * x / math.pi) * math.exp(-x / 2)


def chi2(tally, expected_p, n):
    return sum((tally[k] - n * p) ** 2 / (n * p) for k, p in expected_p.items())


def test_chi2_closed_form_matches_known_quantiles():
    # Published df=3 quantiles: 7.815 at alpha 0.05, 11.345 at 0.01, 16.266 at 0.001.
    for x, alpha in ((7.815, 0.05), (11.345, 0.01), (16.266, 0.001)):
        assert chi2_sf_df3(x) == pytest.approx(alpha, rel=2e-3)


def test_sampler_follows_the_qiskit_branch_table_not_a_hardcoded_quarter(monkeypatch):
    # The real branch table is uniform for every input (a theorem), so a sampler that ignored Qiskit
    # and used 1/4 would be invisible. Feed the sampler a skewed table and check it follows THAT.
    # False-alarm rate: the honest sampler fails this test with probability ALPHA (chi-square, df 3);
    # the seed is fixed, so the outcome is deterministic and was checked green once.
    ALPHA = 1e-6
    skew = {"00": 0.55, "01": 0.05, "10": 0.30, "11": 0.10}  # keys "m1m0", keyQubits [1, 0]
    monkeypatch.setattr(teleportation, "_branch_probabilities", lambda state: (dict(skew), [1, 0]))
    rng = random.Random(20261010)
    n = 4000
    tally = {k: 0 for k in skew}
    for _ in range(n):
        bits = teleportation.bell_measurement("plus", rng=rng)["measurementBits"]
        tally[f"{bits['m1']}{bits['m0']}"] += 1
    assert chi2_sf_df3(chi2(tally, skew, n)) > ALPHA, tally
    # Power: the same tally must reject a uniform sampler at the same alpha.
    assert chi2_sf_df3(chi2(tally, {k: 0.25 for k in skew}, n)) < ALPHA, tally


# ------------------------------------------------------------------------------------------- F6
def _hand_joint_fidelity(theta, phi, extra_phase):
    a = math.cos(theta / 2) * np.exp(-0.5j * phi) * np.exp(1j * extra_phase)
    b = math.sin(theta / 2) * np.exp(0.5j * phi) * np.exp(1j * extra_phase)
    out = np.array([a, 0, 0, b])          # CX|psi>|0> = a|00> + b|11>
    two = np.kron([a, b], [a, b])         # psi (x) psi; identical factors, so ordering is irrelevant
    return abs(np.vdot(two, out)) ** 2


def test_copy_verdict_tracks_the_state_for_random_preparations_under_random_names(monkeypatch):
    # Names the engine has never seen, drawn here, so no name list can pass: random generic states,
    # plus basis states reached by unusual routes (RY(0), RY(pi), with a random RZ and a global X/Z dance).
    rng = random.Random(4242)
    cases = []
    for i in range(24):
        name = "s" + "".join(rng.choice("abcdefghjkmnpqrstuvwxyz") for _ in range(10))
        if i % 3 == 0:
            theta = rng.choice((0.0, math.pi))
        else:
            theta = rng.uniform(0.05, math.pi - 0.05)
        phi = rng.uniform(-math.pi, math.pi)
        monkeypatch.setitem(quantum.STATES, name, ((("ry", theta), ("rz", phi)), "test-only"))
        cases.append((name, theta, phi))
    for name, theta, phi in cases:
        text = " ".join(cloning.run_calibration(name)["facts"])
        copied = "Two matching basis values" in text
        assert copied is bool(_hand_joint_fidelity(theta, phi, 0.0) > 1 - 1e-9), (name, theta, phi)
    assert sum(1 for _, t, _ in cases if t in (0.0, math.pi)) == 8  # both verdicts are exercised


# ------------------------------------------------------------------------------------------- F7
def test_backend_result_goes_through_the_guarded_builder(monkeypatch):
    # The builder holds the forbidden-phrase and shape guards; a hand-built dict would skip them.
    seen = []
    real = qollab_job.experiment_result

    def spy(**kwargs):
        seen.append(kwargs["experiment"])
        return real(**kwargs)

    monkeypatch.setattr(qollab_job, "experiment_result", spy)
    r = qollab_job.interpret_counts({"00": 120, "11": 136}, "fake", shots_requested=256)
    assert seen == [r["experiment"]]
