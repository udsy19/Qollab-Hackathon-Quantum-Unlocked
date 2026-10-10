"""Physics oracle tests. Run:  python -m pytest -q evidence/red-team/physics-oracle -s

Every expected value in this file is written from the textbook, by hand, NOT computed by
physics_oracle.py — so a broken library cannot grade itself (gate-independence law 4).
"""
from __future__ import annotations

import ast
import math
import os
import pathlib
import sys

import numpy as np
import pytest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import physics_oracle as po  # noqa: E402

OUT = pathlib.Path(os.environ.get("PHYSICS_ORACLE_OUT", HERE / "out"))
EXACT = 1e-12
STATES = po.random_states(50) + po.named_states()

# Hand-written textbook table (Nielsen & Chuang §1.3.7): Bob holds X^m1 Z^m0 |psi>, so he
# undoes it with X iff m1 = 1, then Z iff m0 = 1.  (m0, m1) -> (applyX, applyZ)
TEXTBOOK_RULE = {(0, 0): (False, False), (0, 1): (True, False), (1, 0): (False, True), (1, 1): (True, True)}
# Bob's pre-correction state up to global phase, as a Pauli applied to psi.
TEXTBOOK_BOB = {(0, 0): po.I2, (0, 1): po.X, (1, 0): po.Z, (1, 1): po.X @ po.Z}


def _write(name: str, text: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(text + "\n")
    print(f"\n--- {name} ---\n{text}")


def _overlap(a: np.ndarray, b: np.ndarray) -> float:
    return abs(np.vdot(a, b)) ** 2


# ======================================================================= teleportation

@pytest.mark.parametrize("name,th,ph", STATES, ids=[s[0] for s in STATES])
def test_branch_probabilities_are_quarter_and_independent_of_psi(name, th, ph):
    for bits, (p, *_rest) in po.qk_branches(th, ph).items():
        assert abs(p - 0.25) < EXACT, (name, bits, p)


@pytest.mark.parametrize("name,th,ph", STATES, ids=[s[0] for s in STATES])
def test_bob_pre_correction_state_matches_textbook_on_both_paths(name, th, ph):
    psi = po.ket(th, ph)
    npb = po.np_branches(psi)
    qkb = po.qk_branches(th, ph)
    for bits in po.BITS:
        expected = TEXTBOOK_BOB[bits] @ psi
        _, bob_np = npb[bits]
        assert _overlap(bob_np, expected) > 1 - EXACT, ("numpy path", name, bits)
        bob_qk = qkb[bits][1]
        assert float(np.real(np.vdot(expected, bob_qk.data @ expected))) > 1 - EXACT, ("qiskit path", name, bits)


@pytest.mark.parametrize("name,th,ph", STATES, ids=[s[0] for s in STATES])
def test_numpy_tensor_path_and_qiskit_path_agree_bit_for_bit(name, th, ph):
    """The tensor model has no endianness; the Qiskit model does. Agreement means the Qiskit
    projector on qarg 0 really is m0 and on qarg 1 really is m1."""
    psi = po.ket(th, ph)
    full_np = po.tensor_to_qiskit(po.np_teleport_pre_measurement(psi))
    full_qk = po.Statevector.from_instruction(po.teleport_circuit(th, ph))
    assert abs(abs(np.vdot(full_np.data, full_qk.data)) - 1) < EXACT


def test_correction_rule_matches_textbook_and_independent_search():
    for bits, expected in TEXTBOOK_RULE.items():
        assert po.correction_rule(*bits) == expected, bits
    for name, th, ph in po.random_states(50):
        found = po.derive_rule_by_search(th, ph)
        for bits, expected in TEXTBOOK_RULE.items():
            assert found[bits] == [expected], (name, bits, found[bits])


@pytest.mark.parametrize("name,th,ph", STATES, ids=[s[0] for s in STATES])
def test_correct_correction_gives_fidelity_one(name, th, ph):
    for bits, (_, bob, _, _) in po.qk_branches(th, ph).items():
        f = po.corrected_fidelity(bob, *po.correction_rule(*bits), th, ph)
        assert f > 1 - 1e-9, (name, bits, f)


def test_every_wrong_correction_fails_on_generic_states():
    """For each branch, each of the 3 wrong corrections must fall clearly below 1 on Haar-random
    states. Haar average of |<psi|P|psi>|^2 for a non-identity Pauli residual is 1/3."""
    rows = po.fidelity_table(po.random_states(50))
    lines = []
    for bits, right in TEXTBOOK_RULE.items():
        for wrong in po.CORRECTIONS:
            if wrong == right:
                continue
            key = f"X{int(wrong[0])}Z{int(wrong[1])}"
            fs = np.array([r[key] for r in rows if (r["m0"], r["m1"]) == bits])
            lines.append(f"m0={bits[0]} m1={bits[1]} right=X{int(right[0])}Z{int(right[1])} "
                         f"wrong={key}  mean={fs.mean():.4f} min={fs.min():.4f} max={fs.max():.4f} "
                         f"n(F>0.999)={(fs > 0.999).sum()}/50")
            assert fs.mean() < 0.5, (bits, wrong, fs.mean())
            assert fs.min() < 0.05, (bits, wrong, fs.min())
            assert (fs > 0.999).sum() == 0, (bits, wrong)
    _write("wrong_corrections_haar50.txt", "\n".join(lines))
    _write("fidelity_table_named_states.txt", po.format_fidelity_table(po.fidelity_table(po.named_states())))


def test_pauli_eigenstates_cannot_discriminate_corrections():
    """Finding, pinned: every Pauli eigenstate passes TWO of the four corrections per branch.
    Z eigenstates (|0>,|1>) see only the X part of a correction, X eigenstates (|+>,|->) only
    the Z part, |+i> only whether both parts are right or both wrong. So a suite on |0>,|1>
    alone cannot catch a dropped or misrouted Z; one on |+>,|-> alone cannot catch X. A Z- AND
    an X-eigenstate together, or one generic state, discriminate all four."""
    keys = ("X0Z0", "X1Z0", "X0Z1", "X1Z1")
    sees = {"|0>": "x", "|1>": "x", "|+>": "z", "|->": "z", "|+i>": "x==z"}
    blind = []
    for name, th, ph in po.named_states()[:5]:
        for r in po.fidelity_table([(name, th, ph)]):
            rx, rz = TEXTBOOK_RULE[(r["m0"], r["m1"])]
            passing = [k for k in keys if r[k] > 0.999]
            predicted = [k for k in keys if {"x": (k[1] == "1") == rx, "z": (k[3] == "1") == rz,
                                             "x==z": ((k[1] == "1") == rx) == ((k[3] == "1") == rz)}[sees[name]]]
            assert passing == predicted, (name, r)
            blind.append(f"{name:<5} m0={r['m0']} m1={r['m1']} passes {passing}  (sees only: {sees[name]})")
    for r in po.fidelity_table([po.named_states()[5]]):
        assert sum(r[k] > 0.999 for k in keys) == 1
    _write("eigenstate_blind_spots.txt", "\n".join(blind))


@pytest.mark.parametrize("name,th,ph", STATES, ids=[s[0] for s in STATES])
def test_deferred_measurement_circuit_teleports(name, th, ph):
    sv = po.Statevector.from_instruction(po.deferred_measurement_circuit(th, ph))
    bob = po.partial_trace(sv, [0, 1])
    assert po.state_fidelity(bob, po.Statevector(po.ket(th, ph))) > 1 - 1e-9


def test_x_then_z_vs_z_then_x_is_only_a_global_phase():
    xz, zx = po.X @ po.Z, po.Z @ po.X
    assert np.allclose(xz, -zx)


# ======================================================================= consumption

@pytest.mark.parametrize("name,th,ph", STATES, ids=[s[0] for s in STATES])
def test_source_is_consumed_after_bell_measurement(name, th, ph):
    """After the Bell measurement Alice holds |m0>|m1>: identical for every psi, so no copy of
    psi remains with her. Averaged over the (uniform) outcomes her source fidelity is exactly
    1/2 — that of a coin flip — while Bob's corrected fidelity is 1."""
    psi = po.ket(th, ph)
    target = np.outer(psi, psi.conj())
    fsrc = []
    for (m0, m1), (p, bob, q0, q1) in po.qk_branches(th, ph).items():
        assert np.allclose(q0.data, po.P[m0], atol=EXACT), (name, m0)
        assert np.allclose(q1.data, po.P[m1], atol=EXACT), (name, m1)
        fsrc.append(p * float(np.real(np.trace(q0.data @ target))))
    assert abs(sum(fsrc) - 0.5) < EXACT, (name, sum(fsrc))


@pytest.mark.parametrize("name,th,ph", STATES[:10] + po.named_states(), ids=[s[0] for s in STATES[:10] + po.named_states()])
def test_deferred_circuit_also_leaves_alice_psi_independent(name, th, ph):
    sv = po.Statevector.from_instruction(po.deferred_measurement_circuit(th, ph))
    alice = po.partial_trace(sv, [2]).data
    ref = po.partial_trace(po.Statevector.from_instruction(po.deferred_measurement_circuit(0.0, 0.0)), [2]).data
    assert np.allclose(alice, ref, atol=EXACT)


# ======================================================================= endianness

def test_counts_key_endianness_table():
    lines = ["circuit: q0 -> c0 (m0), q1 -> c1 (m1); key printed by Qiskit BasicSimulator",
             "m0 m1 | counts key | key[0] key[1] | bits_from_counts_key"]
    for m0, m1 in po.BITS:
        counts = po.sample_counts(po.endianness_fixture(m0, m1), shots=64)
        assert len(counts) == 1
        key = next(iter(counts))
        assert key == f"{m1}{m0}", (m0, m1, key)  # c1 printed first
        assert po.bits_from_counts_key(key) == (m0, m1)
        lines.append(f" {m0}  {m1} |    '{key}'    |   {key[0]}      {key[1]}    | {po.bits_from_counts_key(key)}")
    lines.append("TRAP: key '01' means c1=0, c0=1, i.e. m0=1, m1=0 -> apply Z only (NOT X).")
    two = po.sample_counts(po.two_register_fixture(), shots=16)
    assert list(two) == ["0 1"], two  # registers m0 then m1, printed 'm1 m0'
    lines.append(f"two registers m0,m1 (m0=1,m1=0): key {list(two)} -> last-added register printed FIRST")
    sv_label = po.Statevector.from_instruction(po.endianness_fixture(1, 0).remove_final_measurements(inplace=False))
    assert sv_label.probabilities_dict() == {"01": 1.0}
    lines.append("Statevector.probabilities_dict() uses the same order: X on q0 -> {'01': 1.0}")
    _write("endianness_table.txt", "\n".join(lines))


@pytest.mark.parametrize("basis,bob_tracks", [("Z", "m1"), ("X", "m0")])
def test_sampled_protocol_ties_each_clbit_to_its_physics(basis, bob_tracks):
    """Real sampled runs, no correction applied: with source |0> Bob's Z bit equals m1 every
    shot; with source |+> Bob's X bit equals m0 every shot. A parser that swaps m0/m1 or reads
    the key left-to-right fails this on real counts."""
    counts = po.sample_counts(po.measured_teleport_probe(basis), shots=512, seed=11)
    seen = set()
    for key, n in counts.items():
        m0, m1 = po.bits_from_counts_key(key)
        bob = int(key[-1 - 2])
        assert bob == (m1 if bob_tracks == "m1" else m0), (basis, key)
        seen.add((m0, m1))
    assert seen == set(po.BITS), seen  # all four branches actually occurred


def test_basic_simulator_has_no_dynamic_feedforward():
    """Finding for the quantum lane: the local BasicSimulator refuses if_test, so the measured
    classical-feedforward story must be a branch model (or deferred measurement), not a
    dynamic circuit on the built-in backend."""
    ok, msg = po.dynamic_feedforward_supported_by_basic_simulator()
    _write("dynamic_feedforward.txt", f"BasicSimulator if_test supported: {ok}\n{msg}")
    assert not ok


def test_spec_rotation_order_ambiguity():
    """Vision §7.4 says 'RY(1.137) RZ(0.44) in the correct order'. Circuit order (ry then rz,
    as §10.5 codes it) gives a state with a nonzero Bloch y-component. Read as an operator
    product (RZ applied first) it collapses to a real-amplitude state with y = 0 — the
    'nontrivial point' would lose its complex phase."""
    circuit_order = po.ket(1.137, 0.44)
    operator_order = po.ket(1.137, 0.0)  # RZ on |0> is a global phase
    by = po.bloch(circuit_order)[1]
    assert abs(by) > 0.3
    assert abs(po.bloch(operator_order)[1]) < EXACT
    qc = po.QuantumCircuit(1)
    qc.ry(1.137, 0)
    qc.rz(0.44, 0)
    assert _overlap(po.Statevector.from_instruction(qc).data, circuit_order) > 1 - EXACT
    _write("rotation_order.txt", f"ry(1.137) then rz(0.44): bloch={tuple(round(v, 6) for v in po.bloch(circuit_order))}\n"
                                 f"rz(0.44) then ry(1.137): bloch={tuple(round(v, 6) for v in po.bloch(operator_order))}")


# ======================================================================= no-cloning

@pytest.mark.parametrize("name,th,ph", STATES, ids=[s[0] for s in STATES])
def test_naive_cnot_clone_per_copy_fidelity_is_alpha4_plus_beta4(name, th, ph):
    psi = po.ket(th, ph)
    expected = abs(psi[0]) ** 4 + abs(psi[1]) ** 4
    fa, fb = po.copy_fidelities(po.naive_cnot_clone(th, ph), psi)
    assert abs(fa - expected) < EXACT and abs(fb - expected) < EXACT


def test_naive_cnot_clone_named_cases():
    lines = ["state   F(copyA)  F(copyB)  purity(copyA)  F(output, psi(x)psi)"]
    for name, th, ph in po.named_states():
        psi = po.ket(th, ph)
        sv = po.naive_cnot_clone(th, ph)
        fa, fb = po.copy_fidelities(sv, psi)
        pur = float(po.partial_trace(sv, [1]).purity().real)
        joint = _overlap(sv.data, np.kron(psi, psi))
        lines.append(f"{name:<10} {fa:.6f}  {fb:.6f}  {pur:.6f}       {joint:.6f}")
        if name in ("|0>", "|1>"):
            assert fa > 1 - EXACT and joint > 1 - EXACT
        if name in ("|+>", "|->", "|+i>"):
            assert abs(fa - 0.5) < EXACT and abs(pur - 0.5) < EXACT
            # |<psi psi|out>|^2 = |a^2 conj(a)... |: hand-computed 1/2, 0, 1/4 — never 1.
            assert abs(joint - {"|+>": 0.5, "|->": 0.0, "|+i>": 0.25}[name]) < EXACT, (name, joint)
    _write("naive_cnot_clone.txt", "\n".join(lines))


def test_naive_cnot_haar_average_is_two_thirds():
    """Exact Bloch-sphere average via Gauss-Legendre in cos(theta): F = (1 + cos^2)/2 -> 2/3."""
    x, w = np.polynomial.legendre.leggauss(16)
    vals = []
    for xi in x:
        th = math.acos(xi)
        vals.append(po.copy_fidelities(po.naive_cnot_clone(th, 0.3), po.ket(th, 0.3))[0])
    avg = float(np.dot(w, vals) / 2)
    assert abs(avg - 2 / 3) < 1e-12, avg


@pytest.mark.parametrize("name,th,ph", STATES, ids=[s[0] for s in STATES])
def test_buzek_hillery_cloner_gives_five_sixths_for_every_state(name, th, ph):
    psi = po.ket(th, ph)
    sv = po.buzek_hillery_clone(psi)
    assert abs(np.vdot(sv.data, sv.data) - 1) < EXACT  # isometry
    fa, fb = po.copy_fidelities(sv, psi)
    assert abs(fa - 5 / 6) < EXACT and abs(fb - 5 / 6) < EXACT, (name, fa, fb)


def test_any_unitary_that_clones_basis_states_entangles_plus():
    """The no-cloning theorem by linearity: whatever the rest of U is, if U clones |0> and |1>,
    then U|+>|0> = (|00>+|11>)/sqrt2, never |+>|+>."""
    rng = np.random.default_rng(5)
    bell = np.array([1, 0, 0, 1]) / math.sqrt(2)
    plus0 = np.kron([1, 0], [1, 1]) / math.sqrt(2)  # Qiskit order: q0 = |+> is the LOW index
    for _ in range(20):
        u = po.basis_cloning_unitary(rng)
        assert np.allclose(u.conj().T @ u, np.eye(4), atol=1e-12)
        out = u @ plus0
        assert _overlap(out, bell) > 1 - EXACT
        assert abs(_overlap(out, np.kron([1, 1], [1, 1]) / 2) - 0.5) < EXACT


# ======================================================================= no-signalling

ALICE_ACTIONS = ["I", "X", "Y", "Z", "H", "S", "T", "measZ", "measX"]


def test_bell_pair_receiver_marginal_never_moves():
    rng = np.random.default_rng(3)
    actions = ALICE_ACTIONS + [po.random_unitary(2, rng) for _ in range(10)]
    for a in actions:
        rho = po.bob_rho(po.alice_acts(po.bell_pair(), a, [0]), bob=1)
        assert np.abs(rho - np.eye(2) / 2).max() < EXACT, a


@pytest.mark.parametrize("name,th,ph", STATES[:10] + po.named_states(), ids=[s[0] for s in STATES[:10] + po.named_states()])
def test_teleport_receiver_is_maximally_mixed_before_bits_arrive(name, th, ph):
    """Whatever psi is and whatever Alice does on (q0, q1) — nothing, Bell measurement, random
    two-qubit unitaries — Bob's state is I/2 until the classical bits arrive."""
    rng = np.random.default_rng(int(th * 1e6) % 2**32)
    rho = po.DensityMatrix.from_instruction(po.teleport_circuit(th, ph))
    for a in ["I", "measZ", "measX", "bell_measure", po.random_unitary(4, rng), po.random_unitary(4, rng)]:
        assert np.abs(po.bob_rho(po.alice_acts(rho, a, [0, 1]), bob=2) - np.eye(2) / 2).max() < EXACT


def test_no_signalling_holds_for_arbitrary_entangled_states():
    """Random 3-qubit states, whose Bob marginal is NOT I/2 — so an action that leaked onto
    Bob's qubit would show here even if it is invisible on a Bell pair (sabotage null #1)."""
    rng = np.random.default_rng(9)
    for _ in range(25):
        v = po.random_unitary(8, rng)[:, 0]
        rho = po.DensityMatrix(po.Statevector(v))
        before = po.bob_rho(rho, bob=2)
        assert np.abs(before - np.eye(2) / 2).max() > 1e-3  # positive control: not already I/2
        for a in ALICE_ACTIONS + ["bell_measure", po.random_unitary(4, rng)]:
            assert np.abs(po.bob_rho(po.alice_acts(rho, a, [0, 1]), bob=2) - before).max() < EXACT


def test_correlations_change_only_in_the_joint_log():
    """Vision §7.3: I vs X flips the Z-basis agreement 1 -> 0; Z flips the X-basis agreement."""
    assert abs(po.joint_same_probability("I") - 1) < EXACT
    assert abs(po.joint_same_probability("X")) < EXACT
    assert abs(po.joint_same_probability("Z") - 1) < EXACT
    assert abs(po.joint_same_probability("Z", basis="X")) < EXACT


def test_conditioned_on_bits_bob_does_depend_on_psi():
    """Positive control for the no-signalling tests: once Bob is told (m0, m1) his state does
    carry psi — so I/2 above is a real result, not a tolerance that cannot fail."""
    a = po.qk_branches(0.0, 0.0)[(0, 0)][1].data
    b = po.qk_branches(math.pi, 0.0)[(0, 0)][1].data
    assert np.abs(a - b).max() > 0.9


# ======================================================================= Pyodide compatibility

PYODIDE_SAFE_ROOTS = {"__future__", "itertools", "math", "numpy", "qiskit", "os", "pathlib", "sys", "ast", "pytest"}


def test_imports_are_pyodide_safe_and_aer_is_absent():
    tree = ast.parse((HERE / "physics_oracle.py").read_text())
    mods = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            mods |= {a.name for a in node.names}
        elif isinstance(node, ast.ImportFrom):
            mods.add(node.module)
    assert {m.split(".")[0] for m in mods} <= PYODIDE_SAFE_ROOTS, mods
    assert "qiskit_aer" not in sys.modules
    assert not any(m.startswith("qiskit_aer") for m in sys.modules)
    _write("imports.txt", "\n".join(sorted(mods)))
