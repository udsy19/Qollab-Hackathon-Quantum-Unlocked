"""Mission 3, ONE OF ONE (vision §7.4, §10.5): teleportation of a prepared state.

Registers: q0 = source, q1 = Alice's Bell half, q2 = Bob.
Protocol: H(q1); CX(q1,q2)  [Bell pair]   CX(q0,q1); H(q0)  [Bell-basis transform], then measure
q0 -> m0 (source readout) and q1 -> m1 (Alice's Bell-half readout). Bob is left with X^m1 Z^m0 |psi>,
so the correction rule is: X on q2 iff m1 = 1, Z on q2 iff m0 = 1.

The rooftop dry run is two calls, bits first and corrections second (owner ruling 2026-10-10):
- `bell_measurement("calibration")`: draws a FRESH random generic Bloch point, returns its angles in
  `parameters` and one sampled (m0, m1) (a sample, never proof);
- `teleport_branch("calibration", m0, m1, applyX, applyZ, theta=, phi=)`: the branch model for THOSE
  bits and THAT state, passed back explicitly. It projects onto (m0, m1), applies the player's X/Z to
  Bob's conditional state and returns the Qiskit-computed fidelity; on a generic state every wrong
  choice scores <= 0.9 (GENERIC_MAX_WRONG_FIDELITY).
Then the story:
- `live_commit()`: the single story-token transfer, one atomic exact call (fresh live bits, the rule
  applied, fidelity). The token is latched as consumed only when the call succeeds;
  `reset_story_token()` re-arms it for the game's RESTART.
- `corrections_withheld` / `verify_deferred`: the two checks behind the Declassified panel.
"""
import math
import random

import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import DensityMatrix, Statevector, partial_trace, state_fidelity

from . import (CALIBRATION, GENERIC_MAX_WRONG_FIDELITY, TOKEN, bloch_vector, prepare, probability_table, state_gates,
               target_state)
from .formats import experiment_result

BRANCHES = ((0, 0), (0, 1), (1, 0), (1, 1))  # (m0, m1), the order the sampler walks
PROTOCOL = "q0 = source, q1 = Alice's Bell half, q2 = Bob; H(q1); CX(q1,q2); CX(q0,q1); H(q0)"
BRANCH_KEY_QUBITS = [1, 0]
M0_LABEL = "SOURCE READOUT m0"
M1_LABEL = "LOCAL BELL-HALF READOUT m1"  # the owner's exact wording (ruling 2026-10-10)

# One story token per interpreter run. Qollab starts a fresh interpreter on every Run
# (owner-answers 2026-10-10), so this flag cannot outlive the run it guards.
_token_consumed = False


class TokenAlreadyConsumed(RuntimeError):
    """Raised by a second live_commit in the same run: re-teleporting a measured token would copy it."""


def expected_corrections(m0, m1):
    """The rule, for UI messaging. Fidelities are never derived from this; Qiskit computes them."""
    _check_bits(m0, m1)
    return {"applyX": m1 == 1, "applyZ": m0 == 1}


def _check_bits(m0, m1):
    if m0 not in (0, 1) or m1 not in (0, 1) or isinstance(m0, bool) or isinstance(m1, bool):
        raise ValueError(f"m0 and m1 must be 0 or 1, got {m0!r}, {m1!r}")


def _check_seed(seed):
    # The seed is echoed in `parameters`, so it must be exactly the value that seeded the generator.
    if seed is not None and (isinstance(seed, bool) or not isinstance(seed, int)):
        raise ValueError(f"seed must be an integer or None, got {seed!r}")
    return seed


def _check_choice(apply_x, apply_z):
    for name, v in (("applyX", apply_x), ("applyZ", apply_z)):
        if not isinstance(v, bool):
            raise ValueError(f"{name} must be true or false, got {v!r}")


def _bits_text(m0, m1):
    return f"{M0_LABEL} = {m0}, {M1_LABEL} = {m1}"


def _on(flag):
    return "ON" if flag else "OFF"


def _draw_calibration_angles(rng):
    """A fresh generic point: uniform on the Bloch sphere, rejected until every |r_P| is inside the
    generic margin (about 85% of draws pass). Rounded to the 10 decimals the result carries, so the
    angles the bits call reports are exactly the angles the corrections call will be handed back."""
    while True:
        z = rng.uniform(-1.0, 1.0)
        phi = rng.uniform(-math.pi, math.pi)
        s = math.sqrt(1.0 - z * z)
        x, y = s * math.cos(phi), s * math.sin(phi)
        if max(x * x, y * y, z * z) <= GENERIC_MAX_WRONG_FIDELITY - 1e-9:
            return round(math.acos(z), 10), round(phi, 10)


def _protocol(gates):
    qc = QuantumCircuit(3)
    prepare(qc, gates, 0)
    qc.h(1)
    qc.cx(1, 2)
    qc.cx(0, 1)
    qc.h(0)
    return qc


def _branch_probabilities(state):
    """Exact Bell-measurement branch table over (q0, q1), keyed with keyQubits [1, 0]: key "m1m0"."""
    return probability_table(state, [0, 1])


def _key(m0, m1):
    return f"{m1}{m0}"  # keyQubits [1, 0]: q1 (m1) is the left character, q0 (m0) the right


def _bloch(prefix, rho):
    x, y, z = bloch_vector(rho)
    return {f"{prefix}BlochX": x, f"{prefix}BlochY": y, f"{prefix}BlochZ": z}


def _branch(gates, m0, m1, apply_x, apply_z):
    """Project onto (m0, m1), correct Bob, compare with |psi>. Returns the computed quantities."""
    _check_bits(m0, m1)
    state = Statevector.from_instruction(_protocol(gates))
    index = np.arange(8)
    keep = ((index & 1) == m0) & (((index >> 1) & 1) == m1)
    projected = state.data * keep
    probability = float(np.sum(np.abs(projected) ** 2))
    if probability < 1e-12:
        raise ValueError(f"branch m0={m0}, m1={m1} has probability 0")
    post = Statevector(projected / np.sqrt(probability))

    bob = partial_trace(post, [0, 1])  # trace OUT source and Alice's half, keep Bob (q2)
    fix = QuantumCircuit(1)
    if apply_x:
        fix.x(0)
    if apply_z:
        fix.z(0)
    bob = bob.evolve(fix)
    psi = target_state(gates)
    source_left = partial_trace(post, [1, 2])  # the source qubit after its readout: |m0><m0|
    return {
        "state": state,
        "branchProbability": probability,
        "fidelity": float(state_fidelity(bob, psi)),
        "bob": bob,
        "psi": psi,
        "sourceFidelityAfterMeasurement": float(state_fidelity(source_left, psi)),
    }


def _sample(gates, rng):
    """One branch drawn from the exact Qiskit branch probabilities with Python's PRNG."""
    probs, _ = _branch_probabilities(Statevector.from_instruction(_protocol(gates)))
    u = rng.random()
    cumulative = 0.0
    for m0, m1 in BRANCHES:
        cumulative += probs[_key(m0, m1)]
        if u < cumulative:
            return probs, m0, m1
    return probs, BRANCHES[-1][0], BRANCHES[-1][1]  # u within rounding of 1.0


def _fidelity_fact(what, fidelity):
    # Physics review F4: one copy of an unknown state has no measurable fidelity; this number exists
    # only because the simulator prepared the state and knows it.
    return (f"Receiver fidelity with the {what}: {fidelity:.6f}, computed exactly by local Qiskit from the state "
            "it prepared; the fidelity of a single unknown qubit cannot be measured.")


def _source_fact(m0, source_fidelity):
    # Physics review F3: after H(q0), m0 is 50/50 for EVERY input, so a basis state matching the
    # leftover |m0> is a coincidence of the readout, never a reason the source kept the state.
    if source_fidelity < 1 - 1e-9:
        return (f"The source qubit was read out as m0 = {m0} and left in |{m0}>; the readout was random (50/50), "
                "so the source no longer holds the state: the only copy is at the receiver.")
    return (f"The source qubit was read out as m0 = {m0} and left in |{m0}>; "
            "the readout was random (50/50) and happened to match this basis state. The source does not keep the state.")


def _parameters(state, theta, phi, **extra):
    p = {"state": state}
    if state == CALIBRATION:
        p.update(theta=float(theta), phi=float(phi))
    p.update({k: v for k, v in extra.items() if v is not None})
    return p


SAMPLE_FACT = ("One sample, drawn by Python's pseudo-random generator from the exact Qiskit branch "
               "probabilities. One sample proves nothing about accuracy; the branch table does.")
CALIBRATION_FACT = ("The calibration state lies away from every axis of the Bloch sphere, so any wrong X/Z "
                    "choice visibly lowers the receiver's fidelity.")


def bell_measurement(state=CALIBRATION, theta=None, phi=None, seed=None, rng=None):
    """Dry run, step 1 (bits first): Bell measurement on a prepared state, one sampled (m0, m1).
    With state "calibration" and no angles, a fresh generic point is drawn and its angles are
    returned in `parameters`; hand them back to `teleport_branch` unchanged."""
    rng = rng or random.Random(_check_seed(seed))
    if state == CALIBRATION and theta is None and phi is None:
        theta, phi = _draw_calibration_angles(rng)
    gates, label = state_gates(state, theta, phi)
    probs, m0, m1 = _sample(gates, rng)
    facts = [f"{_bits_text(m0, m1)}. Choose the receiver's X and Z for these two bits.", SAMPLE_FACT]
    if state == CALIBRATION:
        facts.insert(1, CALIBRATION_FACT)
    return experiment_result(
        experiment="teleportation",
        engine="exact_qiskit_local",
        circuit_description=f"prepare {label} on q0; {PROTOCOL}; measure q0 -> {M0_LABEL}, q1 -> {M1_LABEL}",
        qubits=3,
        parameters=_parameters(state, theta, phi, seed=seed),
        probabilities=probs,
        key_qubits=BRANCH_KEY_QUBITS,
        measurement_bits={"m0": m0, "m1": m1},
        facts=facts,
        observables=_bloch("input", DensityMatrix(target_state(gates))),
    )


def teleport_branch(state, m0, m1, apply_x, apply_z, theta=None, phi=None):
    """Dry run, step 2 (corrections second): Bob's state for Bell outcome (m0, m1) after the
    player's X/Z choice, on the state named by (state, theta, phi)."""
    _check_choice(apply_x, apply_z)
    gates, label = state_gates(state, theta, phi)
    b = _branch(gates, m0, m1, apply_x, apply_z)
    rule = expected_corrections(m0, m1)
    follows = rule == {"applyX": bool(apply_x), "applyZ": bool(apply_z)}
    facts = [f"{_bits_text(m0, m1)}: the rule asks for X {_on(rule['applyX'])}, Z {_on(rule['applyZ'])}.",
             _fidelity_fact("test state", b["fidelity"])]
    if not follows and b["fidelity"] > 0.999999:
        # Optional fact (owner ruling): only a named axis state can hide a mistake; calibration states cannot.
        facts.append("This mistake does not show on this state: it is unchanged by the wrong correction. "
                     "On a general state it would.")
    facts.append(_source_fact(m0, b["sourceFidelityAfterMeasurement"]))
    fix = " then ".join(g for g, on in (("X", apply_x), ("Z", apply_z)) if on) or "no correction"
    return experiment_result(
        experiment="teleportation",
        engine="exact_qiskit_local",
        circuit_description=f"prepare {label} on q0; {PROTOCOL}; project onto {_bits_text(m0, m1)}; Bob applies {fix}",
        qubits=3,
        parameters=_parameters(state, theta, phi, m0=m0, m1=m1, applyX=bool(apply_x), applyZ=bool(apply_z)),
        probabilities=_branch_probabilities(b["state"])[0],
        key_qubits=BRANCH_KEY_QUBITS,
        measurement_bits={"m0": m0, "m1": m1},
        fidelity=b["fidelity"],
        facts=facts,
        # Whether the choice follows the rule is not a quantum output: the UI compares the choice with
        # the rule itself (vision §10.6 correctionsMatch); the fact above states the rule.
        observables={
            "branchProbability": b["branchProbability"],
            "sourceFidelityAfterMeasurement": b["sourceFidelityAfterMeasurement"],
            **_bloch("receiver", b["bob"]),
            **_bloch("input", DensityMatrix(b["psi"])),
        },
    )


def _commit_parameters(seed):
    return {"state": TOKEN} if seed is None else {"state": TOKEN, "seed": seed}


def live_commit(seed=None, rng=None):
    """The story transfer (vision §7.4): ONE atomic local exact call. A fresh live Bell measurement
    on the hidden token, the calibrated rule applied to THOSE bits, and the fidelity. The token is
    latched as consumed only after the whole computation has returned: if anything raises, nothing
    was measured and the commit may be retried. A second call in the same run is refused.

    The result carries no angle, Bloch component or source overlap of the token (each would reveal
    it); its branch table is 1/4 everywhere for every input, so it reveals nothing."""
    global _token_consumed
    if _token_consumed:
        raise TokenAlreadyConsumed("The story token was already measured by the final commit in this run. "
                                   "Teleporting it again would mean a second copy existed; restart to play again.")
    rng = rng or random.Random(_check_seed(seed))
    gates, _ = state_gates(TOKEN, story_token=True)
    probs, m0, m1 = _sample(gates, rng)
    rule = expected_corrections(m0, m1)
    b = _branch(gates, m0, m1, rule["applyX"], rule["applyZ"])
    result = experiment_result(
        experiment="teleportation",
        engine="exact_qiskit_local",
        circuit_description=(f"prepare the story token on q0; {PROTOCOL}; measure {M0_LABEL}, {M1_LABEL}; "
                             f"Bob applies X iff {M1_LABEL} = 1, Z iff {M0_LABEL} = 1"),
        qubits=3,
        parameters=_commit_parameters(seed),
        probabilities=probs,
        key_qubits=BRANCH_KEY_QUBITS,
        measurement_bits={"m0": m0, "m1": m1},
        fidelity=b["fidelity"],
        facts=[f"Live bits {_bits_text(m0, m1)} travelled over the classical link; the receiver applied "
               f"X {_on(rule['applyX'])}, Z {_on(rule['applyZ'])}.",
               _fidelity_fact("token", b["fidelity"]),
               _source_fact(m0, b["sourceFidelityAfterMeasurement"]),
               "The token has been consumed: this commit cannot be repeated in this run.",
               SAMPLE_FACT],
        observables={"branchProbability": b["branchProbability"]},
    )
    _token_consumed = True
    return result


def reset_story_token():
    """Re-arm the story token for the game's RESTART (a new story, a new token)."""
    global _token_consumed
    _token_consumed = False


def corrections_withheld(state, theta=None, phi=None):
    """Bob's state when he never receives the two bits: the branch average, which is I/2 for every input."""
    gates, label = state_gates(state, theta, phi)
    state_vec = Statevector.from_instruction(_protocol(gates))
    # Measuring q0, q1 and forgetting the result leaves Bob's reduced state unchanged, so tracing out
    # q0 and q1 of the pre-measurement state IS the average over the four branches.
    bob = partial_trace(state_vec, [0, 1])
    psi = target_state(gates)
    fid = float(state_fidelity(bob, psi))
    return experiment_result(
        experiment="teleportation",
        engine="exact_qiskit_local",
        circuit_description=f"prepare {label} on q0; {PROTOCOL}; bits withheld from Bob",
        qubits=3,
        parameters=_parameters(state, theta, phi),
        fidelity=fid,
        facts=["Without the two classical bits, Bob's qubit is an even mix (I/2) whatever the source was.",
               f"Its overlap with the source state is {fid:.6f}, the same as a blind guess.",
               "The quantum half of the link carries no message on its own."],
        # A one-qubit density matrix is fully fixed by its Bloch vector: (I + xX + yY + zZ) / 2.
        observables={"receiverPurity": float(bob.purity().real), **_bloch("receiver", bob)},
    )


def verify_deferred(state="bloch_a", controlled_x=True, controlled_z=True, theta=None, phi=None):
    """Deferred-measurement verification: coherent CX(q1,q2); CZ(q0,q2) replace measure + classical
    feed-forward. A mathematical equivalence for checking the ideal protocol, NOT a physical link.
    Dropping either controlled correction (Declassified "what if") shows the true, lower fidelity."""
    gates, label = state_gates(state, theta, phi)
    qc = _protocol(gates)
    if controlled_x:
        qc.cx(1, 2)  # stands in for "X if m1 = 1"
    if controlled_z:
        qc.cz(0, 2)  # stands in for "Z if m0 = 1"
    bob = partial_trace(Statevector.from_instruction(qc), [0, 1])
    fid = float(state_fidelity(bob, target_state(gates)))
    return experiment_result(
        experiment="teleportation",
        engine="exact_qiskit_local",
        circuit_description=(f"prepare {label} on q0; {PROTOCOL}"
                             + ("; CX(q1,q2)" if controlled_x else "") + ("; CZ(q0,q2)" if controlled_z else "")),
        qubits=3,
        parameters=_parameters(state, theta, phi, controlledX=bool(controlled_x), controlledZ=bool(controlled_z)),
        fidelity=fid,
        facts=["Mathematical verification by the deferred-measurement principle: the measurements and classical "
               "corrections are replaced by equivalent controlled gates.",
               "This is not a physical teleportation link; in the story the corrections travel as two classical bits.",
               f"Bob's reduced state matches the source with fidelity {fid:.6f}."],
        observables=_bloch("receiver", bob),
    )
