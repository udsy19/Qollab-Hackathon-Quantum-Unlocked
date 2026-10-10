"""Sabotage round on a DISPOSABLE copy of the quantum lane's echo/ (law 10: never the branch).

For each mutation: copy SRC (an exported echo/ tree) to a fresh temp dir, apply exact string edits
(each must match EXACTLY once, else the row is REFUSED, never counted), then run
  (a) the product's OWN suite  echo/tests          -> does THEIR suite go red?
  (b) this lane's oracle driver test_product_vs_oracle.py with ECHO_ROOT=<copy>
and record both verdicts. A mutation their suite misses is a NULL, the main product of this round.

    python evidence/red-team/physics-code-audit/sabotage_product.py /tmp/pca/q/echo [out.md]

Exit 0 = both controls green and no row refused; 1 = a control red or a row refused; 2 = bad input.
"""
from __future__ import annotations

import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
DRIVER = HERE / "test_product_vs_oracle.py"
TP, QJ, INIT, ENT, CL = "quantum/teleportation.py", "quantum/qollab_job.py", "quantum/__init__.py", \
    "quantum/entanglement.py", "quantum/cloning.py"
T_TELE = "tests/test_teleportation.py"

# (id, what it simulates, [(file, old, new), ...])
SABOTAGES = [
    ("control", "no edit", []),
    ("swap_xz_rule", "rule: X iff m0, Z iff m1", [(TP, 'return {"applyX": m1 == 1, "applyZ": m0 == 1}',
                                                  'return {"applyX": m0 == 1, "applyZ": m1 == 1}')]),
    ("swap_m0_m1_projection", "branch model projects q1 as m0, q0 as m1",
     [(TP, "keep = ((index & 1) == m0) & (((index >> 1) & 1) == m1)",
       "keep = ((index & 1) == m1) & (((index >> 1) & 1) == m0)")]),
    # Re-anchored for quantum d9b42d0 (contract v2): branch labels are built by `_key` with keyQubits [1, 0].
    ("swap_m0_m1_branch_probs", "branch-probability key built as m0m1 instead of m1m0 (keyQubits [1, 0])",
     [(TP, 'return f"{m1}{m0}"  # keyQubits [1, 0]', 'return f"{m0}{m1}"  # keyQubits [1, 0]')]),
    ("branch_key_qubits_lie", "teleport results claim keyQubits [0, 1] while keys are m1m0",
     [(TP, "BRANCH_KEY_QUBITS = [1, 0]", "BRANCH_KEY_QUBITS = [0, 1]")]),
    ("reverse_bitstring", "backend counts key read left-to-right",
     [(QJ, "int(key[-1 - clbit])", "int(key[clbit])")]),
    ("drop_x", "Bob's X correction never applied", [(TP, "    if apply_x:\n        fix.x(0)", "    if apply_x:\n        pass")]),
    ("drop_z", "Bob's Z correction never applied", [(TP, "    if apply_z:\n        fix.z(0)", "    if apply_z:\n        pass")]),
    ("x_applies_z", "the X button applies Z and vice versa",
     [(TP, "    if apply_x:\n        fix.x(0)\n    if apply_z:\n        fix.z(0)",
       "    if apply_x:\n        fix.z(0)\n    if apply_z:\n        fix.x(0)")]),
    ("live_commit_swapped_bits", "story commit applies the rule to (m1, m0)",
     [(TP, "    rule = expected_corrections(m0, m1)\n    b = _branch(", "    rule = expected_corrections(m1, m0)\n    b = _branch(")]),
    ("bell_measure_cx_hits_bob", "Bell measurement CX(q0,q1) lands on Bob: CX(q0,q2)",
     [(TP, "    qc.cx(0, 1)\n    qc.h(0)\n    return qc", "    qc.cx(0, 2)\n    qc.h(0)\n    return qc")]),
    ("phase_prep_s_to_z", "'phase' state prepared with Z instead of S (+i becomes minus)",
     [(INIT, '"phase": ((("h",), ("s",)),', '"phase": ((("h",), ("z",)),')]),
    ("bloch_a_operator_order", "bloch_a applies RZ before RY (report 0001 P3 trap)",
     [(INIT, '"bloch_a": ((("ry", 1.137), ("rz", 0.44)),', '"bloch_a": ((("rz", 0.44), ("ry", 1.137)),')]),
    ("product_threshold_loosened", "product's 'mistake does not show' fact fires at F > 0.9, not 0.999999",
     [(TP, 'if not follows and b["fidelity"] > 0.999999:', 'if not follows and b["fidelity"] > 0.9:')]),
    ("tests_threshold_loosened_plus_drop_z", "THEIR test threshold 0.99 -> 1.0 and >=0.999999 -> >=0.9, plus Z dropped",
     [(TP, "    if apply_z:\n        fix.z(0)", "    if apply_z:\n        pass"),
      (T_TELE, 'assert r["fidelity"] < 0.99  # a wrong choice', 'assert r["fidelity"] <= 1.0  # a wrong choice'),
      (T_TELE, "    if follows_rule:\n        assert r[\"fidelity\"] >= 0.999999",
       "    if follows_rule:\n        assert r[\"fidelity\"] >= 0.9")]),
    ("second_backend_job_guard_removed", "once-guard check disabled: a second backend.run goes through",
     [(QJ, "    if _job_submitted:\n        raise", "    if False:\n        raise")]),
    ("guard_set_after_run", "guard spent only after a successful job (retry after failure allowed)",
     [(QJ, "    _job_submitted = True\n    job = backend.run(build_bell_verification_circuit(), shots=shots)\n",
       "    job = backend.run(build_bell_verification_circuit(), shots=shots)\n    _job_submitted = True\n")]),
    ("numpy_count_leak", "backend counts kept as provider ints (np.int64 leaks to JS)",
     [(QJ, "counts[canonical] = counts.get(canonical, 0) + int(count)", "counts[canonical] = counts.get(canonical, 0) + count")]),
    ("receiver_marginal_keys_swapped", "relay marginal P(0)/P(1) entries swapped",
     [(ENT, 'marginal = {"0": float(receiver.data[0, 0].real), "1": float(receiver.data[1, 1].real)}',
       'marginal = {"0": float(receiver.data[1, 1].real), "1": float(receiver.data[0, 0].real)}')]),
    ("sender_gate_on_receiver", "relay: sender's X lands on the receiver's half",
     [(ENT, '    if sender_gate == "X":\n        qc.x(0)', '    if sender_gate == "X":\n        qc.x(1)')]),
    ("clone_reports_source_twice", "cloning: copy marginal is the source's",
     [(CL, "copy = partial_trace(joint, [0])", "copy = partial_trace(joint, [1])")]),
    ("withheld_leaks_branch", "corrections_withheld shows Bob's (0,0) branch (= psi), not the average I/2",
     [(TP, "    bob = partial_trace(state, [0, 1])\n    psi = target_state(state_name)\n    fid",
       "    bob = partial_trace(Statevector(np.where((np.arange(8) & 3) == 0, state.data, 0) * 2), [0, 1])\n    psi = target_state(state_name)\n    fid")]),
]


def run(cmd, env, cwd):
    p = subprocess.run(cmd, env=env, cwd=cwd, capture_output=True, text=True, timeout=600)
    tail = [l for l in p.stdout.strip().splitlines() if re.search(r"passed|failed|error", l)]
    return p.returncode, (tail[-1] if tail else (p.stdout + p.stderr).strip().splitlines()[-1][:160])


def main(argv):
    if len(argv) < 2 or not (pathlib.Path(argv[1]) / "quantum" / "teleportation.py").is_file():
        print("usage: sabotage_product.py <exported echo/ dir> [out.md]")
        return 2
    src = pathlib.Path(argv[1]).resolve()
    out = pathlib.Path(argv[2]) if len(argv) > 2 else HERE / "out" / "sabotage_product.md"
    rows, bad = [], 0
    for sid, what, edits in SABOTAGES:
        with tempfile.TemporaryDirectory(prefix=f"pca-{sid}-") as tmp:
            dst = pathlib.Path(tmp) / "echo"
            shutil.copytree(src, dst)
            refused = None
            for f, old, new in edits:
                text = (dst / f).read_text()
                n = text.count(old)
                if n != 1:
                    refused = f"{f}: pattern matched {n}x"
                    break
                (dst / f).write_text(text.replace(old, new))
            if refused:
                rows.append((sid, what, "REFUSED", refused, "REFUSED", ""))
                bad += 1
                continue
            env = dict(os.environ, ECHO_ROOT=str(dst), PYTHONDONTWRITEBYTECODE="1")
            theirs = run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", "tests"], env, dst)
            ours = run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", str(DRIVER)], env, dst)
            v = lambda rc: "GREEN" if rc == 0 else f"RED (exit {rc})"  # noqa: E731
            rows.append((sid, what, v(theirs[0]), theirs[1], v(ours[0]), ours[1]))
            if sid == "control" and (theirs[0] or ours[0]):
                bad += 1
    lines = [f"# Sabotage round on a disposable copy of `{src}`", "",
             f"python {sys.version.split()[0]}. THEIR = the product's own `echo/tests`; OURS = "
             "`test_product_vs_oracle.py`. A mutation THEIR suite leaves GREEN is a **NULL**.", "",
             "| mutation | simulates | THEIR suite | their summary | OUR driver | our summary |", "|---|---|---|---|---|---|"]
    for sid, what, tv, ts, ov, os_ in rows:
        mark = " **NULL**" if sid != "control" and tv == "GREEN" else ""
        lines.append(f"| `{sid}` | {what} | {tv}{mark} | {ts} | {ov} | {os_} |")
    nulls = [r[0] for r in rows[1:] if r[2] == "GREEN"]
    both = [r[0] for r in rows[1:] if r[2] == "GREEN" and r[4] == "GREEN"]
    lines += ["", f"{len(rows) - 1} mutations. Their-suite nulls ({len(nulls)}): {', '.join(nulls) or 'none'}.",
              f"Nulls for BOTH suites ({len(both)}): {', '.join(both) or 'none'}."]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
