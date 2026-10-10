"""The engine/bridge seam on REAL engine output, judged by platform's REAL contracts.js (report 0013).

B1 the story commit must pass `validateCommitResult`, not only `validateExperimentResult`.
B2 a cloning result must carry a top-level `fidelity`: Mission 1's rules read nothing else.
S3 the overclaim guard must not be beaten by a hyphen or a line break.
S4 the m0/m1 label text is pinned to contracts' BIT_LABELS, the owner's wording.
S5 a wrong correction is never described as a delivery.
(S1, the bridge's commit latch, is test_bridge_commit.py.)

Every expected value here comes from contracts.js (run in Node) or from this file's own numpy, never
from the engine's account of itself (gate-independence). A missing Node is a failure, not a skip.
"""
import json
import re
import shutil
import subprocess

import numpy as np
import pytest

import quantum
from conftest import CALIBRATION_SEEDS, STATES, calibration_angles
from quantum import cloning, teleportation
from quantum.formats import experiment_result
from test_contract_conformance import contracts_js

CONTRACT = """
const [contracts, path] = process.argv.slice(1)
const c = await import(contracts)
const { readFileSync } = await import('node:fs')
const results = JSON.parse(readFileSync(path, 'utf8'))
console.log(JSON.stringify({
  FIDELITY_PASS: c.FIDELITY_PASS, FIDELITY_EPSILON: c.FIDELITY_EPSILON, STORY_TOKEN_ID: c.STORY_TOKEN_ID,
  BIT_LABELS: c.BIT_LABELS,
  verdicts: results.map(r => ({ experiment: c.validateExperimentResult(r), commit: c.validateCommitResult(r) })),
}))
"""


def _contract(tmp_path, results=()):
    node = shutil.which("node")
    assert node, "node is required: these checks run platform's own contracts.js"
    data = tmp_path / "commit-results.json"
    data.write_text(json.dumps(list(results), allow_nan=False))
    run = subprocess.run([node, "--input-type=module", "-e", CONTRACT, contracts_js(tmp_path).as_uri(), str(data)],
                         capture_output=True, text=True, timeout=60)
    assert run.returncode == 0, run.stderr
    out = json.loads(run.stdout)
    assert len(out["verdicts"]) == len(results)
    return out


def _commit(seed):
    teleportation.reset_story_token()
    try:
        return teleportation.live_commit(seed=seed)
    finally:
        teleportation.reset_story_token()


def _commits_covering_every_branch():
    """Seeded commits until all four (m0, m1) branches have occurred: the rule differs per branch."""
    seen = {}
    for seed in range(200):
        r = _commit(seed)
        seen.setdefault((r["measurementBits"]["m0"], r["measurementBits"]["m1"]), r)
        if len(seen) == 4:
            return list(seen.values())
    raise AssertionError(f"200 seeds reached only branches {sorted(seen)}")


# ------------------------------------------------------------------ B1: the one story commit
def test_the_story_commit_passes_validate_commit_result_on_every_branch(tmp_path):
    commits = _commits_covering_every_branch()
    c = _contract(tmp_path, commits)
    for r, v in zip(commits, c["verdicts"]):
        assert v == {"experiment": [], "commit": []}, (r["measurementBits"], r["parameters"], v)
        m0, m1 = r["measurementBits"]["m0"], r["measurementBits"]["m1"]
        p = r["parameters"]
        assert p["stateId"] == c["STORY_TOKEN_ID"]
        assert (p["applyX"], p["applyZ"]) == (m1 == 1, m0 == 1)  # X iff m1, Z iff m0, re-stated here
        assert "state" not in p  # the retired marker, refused by name in CONTRACTS.md


def test_the_commit_validator_bites_on_real_output(tmp_path):
    # Positive control: the same pipeline refuses the old marker, a rule-breaking correction, a low F.
    good = _commit(3)
    old_marker = dict(good, parameters={"state": "token", "seed": 3})
    flipped = dict(good, parameters=dict(good["parameters"], applyX=not good["parameters"]["applyX"]))
    low = dict(good, fidelity=0.5)
    v = _contract(tmp_path, [good, old_marker, flipped, low])["verdicts"]
    assert v[0]["commit"] == []
    assert all(x["commit"] for x in v[1:]), v


def test_the_python_story_token_id_is_the_contracts_constant(tmp_path):
    assert quantum.STORY_TOKEN_ID == _contract(tmp_path)["STORY_TOKEN_ID"]


# ------------------------------------------------------------------ B2: cloning fidelity
def _ket(gates):
    """|psi> = gates|0>, by this file's own matrices (Qiskit's X/H/S/RY/RZ definitions)."""
    v = np.array([1, 0], dtype=complex)
    for g, *a in gates:
        if g == "x":
            m = np.array([[0, 1], [1, 0]])
        elif g == "h":
            m = np.array([[1, 1], [1, -1]]) / np.sqrt(2)
        elif g == "s":
            m = np.diag([1, 1j])
        elif g == "ry":
            c, s = np.cos(a[0] / 2), np.sin(a[0] / 2)
            m = np.array([[c, -s], [s, c]])
        elif g == "rz":
            m = np.diag([np.exp(-1j * a[0] / 2), np.exp(1j * a[0] / 2)])
        else:
            raise AssertionError(f"unknown gate {g}")
        v = m @ v
    return v


def _two_copy_fidelity(psi):
    # CNOT(source -> blank) sends a|0>+b|1> to a|00>+b|11>; its overlap with |psi>|psi> is conj(a)^2 a + conj(b)^2 b.
    a, b = psi
    return abs(np.conj(a) ** 2 * a + np.conj(b) ** 2 * b) ** 2


@pytest.mark.parametrize("name", STATES)
def test_cloning_reports_the_two_copy_fidelity_at_top_level(name):
    r = cloning.run_calibration(name)
    assert isinstance(r.get("fidelity"), float), sorted(r)
    assert r["fidelity"] == pytest.approx(_two_copy_fidelity(_ket(quantum.STATES[name][0])), abs=1e-9)
    assert r["fidelity"] == r["observables"]["jointFidelityWithTwoCopies"]  # one number, two places


def test_cloning_fidelity_drives_mission_one_through_the_contract_band(tmp_path):
    c = _contract(tmp_path)
    for name in ("zero", "one"):  # basis states: the CNOT only copies a known classical value
        assert cloning.run_calibration(name)["fidelity"] >= c["FIDELITY_PASS"] - c["FIDELITY_EPSILON"], name
    for name in ("plus", "phase"):  # superpositions: entangled outputs, not two copies
        assert cloning.run_calibration(name)["fidelity"] < c["FIDELITY_PASS"], name


# ------------------------------------------------------------------ S5: no delivery claim after a wrong X/Z
# Written before the fix, from the reviewer's wording of the defect (0013 S5), not from the fix's words.
DELIVERY_CLAIM = re.compile(r"only copy|only (?:at|on|with) the receiver|receiver now (?:holds|has) the state|"
                            r"\bdelivered\b|\barrived\b|transfer (?:is )?complete", re.I)


def _dry_runs():
    for seed in CALIBRATION_SEEDS:
        theta, phi = calibration_angles(seed)
        for m0 in (0, 1):
            for m1 in (0, 1):
                for x in (False, True):
                    for z in (False, True):
                        yield (x, z) == (m1 == 1, m0 == 1), teleportation.teleport_branch(
                            "calibration", m0, m1, x, z, theta=theta, phi=phi)


def test_a_wrong_correction_never_claims_delivery():
    wrong = 0
    for right, r in _dry_runs():
        if right:
            continue
        wrong += 1
        assert r["fidelity"] < 0.9
        for text in [r["circuitDescription"], *r["facts"]]:
            assert not DELIVERY_CLAIM.search(text), text
    assert wrong == len(CALIBRATION_SEEDS) * 12


def test_a_correct_correction_says_where_the_state_now_is():
    # The other side of S5: the wording follows the computed fidelity; it is not simply deleted.
    right = 0
    for ok, r in _dry_runs():
        if ok:
            right += 1
            assert r["fidelity"] >= 0.999999
            assert any(DELIVERY_CLAIM.search(f) for f in r["facts"]), r["facts"]
    assert right == len(CALIBRATION_SEEDS) * 4
    for r in _commits_covering_every_branch():
        assert any(DELIVERY_CLAIM.search(f) for f in r["facts"]), r["facts"]


# ------------------------------------------------------------------ S3: the overclaim guard normalises
@pytest.mark.parametrize("claim", [
    "travelled faster-than-light over the entangled link",
    "Faster  Than\nLight",
    "FASTER_THAN_LIGHT",
    "sent an instant-message",
    "an FTL link",
    "Rin teleports matter",
    "certified-random bits",
    "certified randomness",  # a phrase still matches as a word prefix, as the old substring match did
])
def test_the_overclaim_guard_survives_hyphens_spacing_and_case(claim):
    with pytest.raises(ValueError, match="forbidden claim"):
        experiment_result(experiment="cloning", engine="exact_qiskit_local", circuit_description="x",
                          qubits=1, parameters={"state": "zero"}, facts=[claim])


def test_the_overclaim_guard_still_passes_honest_text():
    for text in ["The classical bits travel no faster than any signal can.", "Lights return to the city.",
                 "Two classical bits travelled over the classical link.", "a draftless softly lit room"]:
        experiment_result(experiment="cloning", engine="exact_qiskit_local", circuit_description="x",
                          qubits=1, parameters={"state": "zero"}, facts=[text])


# ------------------------------------------------------------------ S4: the bit labels are the contract's
def test_bit_labels_are_contracts_bit_labels_and_the_owners_wording(tmp_path):
    labels = _contract(tmp_path)["BIT_LABELS"]
    assert labels == {"m0": "SOURCE READOUT m0", "m1": "LOCAL BELL-HALF READOUT m1"}  # owner ruling 2026-10-10
    assert (teleportation.M0_LABEL, teleportation.M1_LABEL) == (labels["m0"], labels["m1"])


def test_each_bit_value_is_printed_next_to_its_own_label(tmp_path):
    labels = _contract(tmp_path)["BIT_LABELS"]
    theta, phi = calibration_angles(CALIBRATION_SEEDS[0])
    r = teleportation.teleport_branch("calibration", 1, 0, False, True, theta=theta, phi=phi)
    text = " ".join(r["facts"])
    assert f"{labels['m0']} = 1" in text and f"{labels['m1']} = 0" in text, text
