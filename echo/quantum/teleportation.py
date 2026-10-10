"""Mission 3, ONE OF ONE (vision §7.4, §10.5): teleportation of a prepared state.

Registers: q0 = source, q1 = Alice's Bell half, q2 = Bob.
Protocol: H(q1); CX(q1,q2)  [Bell pair]   CX(q0,q1); H(q0)  [Bell-basis transform], then measure
q0 -> m0 (source readout) and q1 -> m1 (Alice's Bell-half readout). Bob is left with X^m1 Z^m0 |psi>,
so the correction rule is: X on q2 iff m1 = 1, Z on q2 iff m0 = 1.

Four entry points the game uses:
- `bell_measurement`: one sampled (m0, m1) for a calibration run (a sample, never proof);
- `teleport_branch`: the branch model — project the Bell measurement onto given bits, apply the
  player's X/Z to Bob's conditional state, and return the Qiskit-computed fidelity (wrong choices
  get their true, lower value);
- `live_commit`: the single story-token transfer — one sampled branch, the calibrated rule applied;
- `corrections_withheld` / `verify_deferred`: the two checks behind the Declassified panel.
"""
import random

import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity

from . import STATES, bloch_vector, prepare, target_state
from .formats import experiment_result

BRANCHES = ((0, 0), (0, 1), (1, 0), (1, 1))  # (m0, m1), the order the sampler walks
PROTOCOL = "q0 = source, q1 = Alice's Bell half, q2 = Bob; H(q1); CX(q1,q2); CX(q0,q1); H(q0)"


def expected_corrections(m0, m1):
    """The rule, for UI messaging. Fidelities are never derived from this; Qiskit computes them."""
    _check_bits(m0, m1)
    return {"applyX": m1 == 1, "applyZ": m0 == 1}


def _check_bits(m0, m1):
    if m0 not in (0, 1) or m1 not in (0, 1) or isinstance(m0, bool) or isinstance(m1, bool):
        raise ValueError(f"m0 and m1 must be 0 or 1, got {m0!r}, {m1!r}")


def _protocol(state_name):
    qc = QuantumCircuit(3)
    prepare(qc, state_name, 0)
    qc.h(1)
    qc.cx(1, 2)
    qc.cx(0, 1)
    qc.h(0)
    return qc


def _branch_probabilities(state):
    # probabilities([0, 1]) indexes outcomes as q0 + 2*q1, i.e. m0 + 2*m1.
    p = state.probabilities([0, 1])
    return {f"m0={m0},m1={m1}": float(p[m0 + 2 * m1]) for m0, m1 in BRANCHES}


def _branch(state_name, m0, m1, apply_x, apply_z):
    """Project onto (m0, m1), correct Bob, compare with |psi>. Returns the measured quantities."""
    _check_bits(m0, m1)
    state = Statevector.from_instruction(_protocol(state_name))
    index = np.arange(8)
    keep = ((index & 1) == m0) & (((index >> 1) & 1) == m1)
    projected = state.data * keep
    probability = float(np.sum(np.abs(projected) ** 2))
    if probability < 1e-12:
        raise ValueError(f"branch m0={m0}, m1={m1} has probability 0 for {state_name}")
    post = Statevector(projected / np.sqrt(probability))

    bob = partial_trace(post, [0, 1])  # trace OUT source and Alice's half, keep Bob (q2)
    fix = QuantumCircuit(1)
    if apply_x:
        fix.x(0)
    if apply_z:
        fix.z(0)
    bob = bob.evolve(fix)
    psi = target_state(state_name)
    source_left = partial_trace(post, [1, 2])  # the source qubit after its readout: |m0><m0|
    return {
        "state": state,
        "branchProbability": probability,
        "fidelity": float(state_fidelity(bob, psi)),
        "bobBlochVector": bloch_vector(bob),
        "sourceFidelityAfterMeasurement": float(state_fidelity(source_left, psi)),
    }


def _sample(state_name, seed, rng):
    """One branch drawn from the exact Qiskit branch probabilities with Python's PRNG."""
    probs = _branch_probabilities(Statevector.from_instruction(_protocol(state_name)))
    u = (rng or random.Random(seed)).random()
    cumulative = 0.0
    for m0, m1 in BRANCHES:
        cumulative += probs[f"m0={m0},m1={m1}"]
        if u < cumulative:
            return probs, m0, m1
    return probs, BRANCHES[-1][0], BRANCHES[-1][1]  # u within rounding of 1.0


def _source_fact(m0, source_fidelity):
    if source_fidelity < 1 - 1e-9:
        return f"The source qubit was measured and left in |{m0}>: it no longer holds the state, so there is one copy, at the receiver."
    return (f"The source qubit was measured and left in |{m0}>, which equals this basis calibration state only "
            "because it was already a known Z value; an unknown state would be destroyed by the readout.")


SAMPLE_FACT = ("One sample, drawn by Python's pseudo-random generator from the exact Qiskit branch "
               "probabilities. One sample proves nothing about accuracy; the branch table does.")


def bell_measurement(state_name="plus", seed=None, rng=None):
    """Calibration Bell measurement on a fresh prepared state: one sampled (m0, m1)."""
    probs, m0, m1 = _sample(state_name, seed, rng)
    return experiment_result(
        experiment="teleportation",
        engine="exact_qiskit_local",
        kind="bell_measurement_sample",
        circuit_description=f"prepare {STATES[state_name][1]} on q0; {PROTOCOL}; measure q0 -> m0, q1 -> m1",
        qubits=3,
        parameters={"state": state_name},
        probabilities=probs,
        measurement_bits={"m0": m0, "m1": m1},
        facts=[f"m0 = {m0} (source readout), m1 = {m1} (local Bell-half readout).", SAMPLE_FACT],
        details={"shots": 1, "seed": seed},
    )


def teleport_branch(state_name, m0, m1, apply_x, apply_z):
    """Branch model: Bob's state for Bell outcome (m0, m1) after the player's X/Z choice."""
    b = _branch(state_name, m0, m1, bool(apply_x), bool(apply_z))
    rule = expected_corrections(m0, m1)
    follows = rule == {"applyX": bool(apply_x), "applyZ": bool(apply_z)}
    facts = [f"m0 = {m0} (source readout), m1 = {m1} (local Bell-half readout): the rule asks for "
             f"X {'ON' if rule['applyX'] else 'OFF'}, Z {'ON' if rule['applyZ'] else 'OFF'}.",
             f"Receiver test fidelity: {b['fidelity']:.6f}."]
    if not follows and b["fidelity"] > 0.999999:
        facts.append("This calibration state is unchanged by the wrong correction, so the mistake does not "
                     "show here; on a general state it would.")
    facts.append(_source_fact(m0, b["sourceFidelityAfterMeasurement"]))
    fix = " then ".join(g for g, on in (("X", apply_x), ("Z", apply_z)) if on) or "no correction"
    return experiment_result(
        experiment="teleportation",
        engine="exact_qiskit_local",
        kind="branch_model",
        circuit_description=f"prepare {STATES[state_name][1]} on q0; {PROTOCOL}; project onto m0={m0}, m1={m1}; Bob applies {fix}",
        qubits=3,
        parameters={"state": state_name, "m0": m0, "m1": m1, "applyX": bool(apply_x), "applyZ": bool(apply_z)},
        probabilities=_branch_probabilities(b["state"]),
        measurement_bits={"m0": m0, "m1": m1},
        fidelity=b["fidelity"],
        facts=facts,
        details={
            "branchProbability": b["branchProbability"],
            "expectedCorrections": rule,
            "choiceFollowsRule": follows,
            "receiverBlochVector": b["bobBlochVector"],
            "sourceFidelityAfterMeasurement": b["sourceFidelityAfterMeasurement"],
        },
    )


def live_commit(state_name, seed=None, rng=None):
    """The story transfer: a fresh live Bell measurement, then the calibrated rule on THOSE bits.
    The game must call this once per story token; the token is consumed by the measurement."""
    probs, m0, m1 = _sample(state_name, seed, rng)
    rule = expected_corrections(m0, m1)
    b = _branch(state_name, m0, m1, rule["applyX"], rule["applyZ"])
    return experiment_result(
        experiment="teleportation",
        engine="exact_qiskit_local",
        kind="live_commit",
        circuit_description=f"prepare token on q0; {PROTOCOL}; measure m0, m1; Bob applies X iff m1=1, Z iff m0=1",
        qubits=3,
        parameters={"state": state_name},
        probabilities=probs,
        measurement_bits={"m0": m0, "m1": m1},
        fidelity=b["fidelity"],
        facts=[f"Live bits m0 = {m0}, m1 = {m1} travelled over the classical link; the receiver applied "
               f"X {'ON' if rule['applyX'] else 'OFF'}, Z {'ON' if rule['applyZ'] else 'OFF'}.",
               f"Receiver fidelity with the token: {b['fidelity']:.6f}.",
               _source_fact(m0, b["sourceFidelityAfterMeasurement"]),
               SAMPLE_FACT],
        details={
            "shots": 1,
            "seed": seed,
            "appliedCorrections": rule,
            "branchProbability": b["branchProbability"],
            "sourceFidelityAfterMeasurement": b["sourceFidelityAfterMeasurement"],
        },
    )


def corrections_withheld(state_name):
    """Bob's state when he never receives the two bits: the branch average, which is I/2 for every input."""
    state = Statevector.from_instruction(_protocol(state_name))
    # Measuring q0, q1 and forgetting the result leaves Bob's reduced state unchanged, so tracing out
    # q0 and q1 of the pre-measurement state IS the average over the four branches.
    bob = partial_trace(state, [0, 1])
    psi = target_state(state_name)
    fid = float(state_fidelity(bob, psi))
    return experiment_result(
        experiment="teleportation",
        engine="exact_qiskit_local",
        kind="corrections_withheld",
        circuit_description=f"prepare {STATES[state_name][1]} on q0; {PROTOCOL}; bits withheld from Bob",
        qubits=3,
        parameters={"state": state_name},
        fidelity=fid,
        facts=["Without the two classical bits, Bob's qubit is an even mix (I/2) whatever the source was.",
               f"Its overlap with the source state is {fid:.6f}, the same as a blind guess.",
               "The quantum half of the link carries no message on its own."],
        details={
            "receiverAverageState": {"re": np.real(bob.data), "im": np.imag(bob.data)},
            "receiverBlochVector": bloch_vector(bob),
            "receiverPurity": float(bob.purity().real),
        },
    )


def verify_deferred(state_name="bloch_a"):
    """Deferred-measurement verification: coherent CX(q1,q2); CZ(q0,q2) replace measure + classical
    feed-forward. A mathematical equivalence for checking the ideal protocol, NOT a physical link."""
    qc = _protocol(state_name)
    qc.cx(1, 2)  # stands in for "X if m1 = 1"
    qc.cz(0, 2)  # stands in for "Z if m0 = 1"
    bob = partial_trace(Statevector.from_instruction(qc), [0, 1])
    fid = float(state_fidelity(bob, target_state(state_name)))
    return experiment_result(
        experiment="teleportation",
        engine="exact_qiskit_local",
        kind="deferred_measurement_verification",
        circuit_description=f"prepare {STATES[state_name][1]} on q0; {PROTOCOL}; CX(q1,q2); CZ(q0,q2)",
        qubits=3,
        parameters={"state": state_name},
        fidelity=fid,
        facts=["Mathematical verification by the deferred-measurement principle: the measurements and classical "
               "corrections are replaced by equivalent controlled gates.",
               "This is not a physical teleportation link; in the story the corrections travel as two classical bits.",
               f"Bob's reduced state matches the source with fidelity {fid:.6f}."],
        circuit_text=qc.draw(output="text"),
        details={"receiverBlochVector": bloch_vector(bob)},
    )
