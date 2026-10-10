"""Sabotage round after the contract-conformance change (gate-independence laws 2, 10, 15).

Reuses the quantum-core harness (`evidence/quantum-core/sabotage_round.py`: each mutation on a
DISPOSABLE copy of echo/, never the real tree) and re-runs its 19 mutations against the new code,
plus the mutations below, which target the contract fields and the new conformance test.

The disposable copy is not a git checkout, so contracts.js comes from $ECHO_CONTRACTS_JS
(default /tmp/cc-conf/contracts.js, extracted with
`git show lane/platform/integration:echo/contracts.js`).

Run: python3 evidence/quantum/contract-conformance/sabotage_round.py  -> sabotage.md next to it
"""
import os
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / "evidence" / "quantum-core"))
import sabotage_round as core  # noqa: E402

os.environ.setdefault("ECHO_CONTRACTS_JS", "/tmp/cc-conf/contracts.js")
STUB = HERE / "stub-contracts-accepts-everything.js"

MINE = [
    ("builder-readds-kind", "quantum/formats.py",
     '        "engine": engine,\n', '        "engine": engine,\n        "kind": "x",\n',
     "builder emits a field the contract does not know"),
    ("cloning-keyqubits-reversed", "quantum/cloning.py",
     "        key_qubits=key_qubits,", "        key_qubits=list(reversed(key_qubits)),",
     "cloning declares keyQubits [0, 1] (valid shape, wrong qubit order)"),
    ("teleport-keyqubits-reversed", "quantum/teleportation.py",
     "BRANCH_KEY_QUBITS = [1, 0]", "BRANCH_KEY_QUBITS = [0, 1]",
     "branch table declares m0 on the left (valid shape, wrong qubit order)"),
    ("relay-shows-joint-table", "quantum/entanglement.py",
     "        probabilities=marginal,\n        key_qubits=[1],",
     "        probabilities={f'{i:02b}': float(p) for i, p in enumerate(state.probabilities())},\n        key_qubits=[1, 0],",
     "relay shows the joint table (which changes with X) instead of the receiver-only view"),
    ("job-bypasses-builder-summary", "quantum/qollab_job.py",
     "    return experiment_result(\n        experiment=\"bell_verification\",",
     "    return {'summary': {'shots': shots}} | experiment_result(\n        experiment=\"bell_verification\",",
     "selected-backend result re-grows the retired summary field"),
    ("observable-allows-bool", "quantum/formats.py",
     "            if type(v) not in (int, float):\n                raise TypeError(f\"observables.",
     "            if False:\n                raise TypeError(f\"observables.",
     "builder lets a boolean verdict into observables (paired with the next mutation's use)"),
    ("verdict-as-observable", "quantum/cloning.py",
     '            "jointFidelityWithTwoCopies": joint_fid,\n        },',
     '            "jointFidelityWithTwoCopies": joint_fid,\n            "isTwoIndependentCopies": independent,\n        },',
     "cloning puts a boolean verdict in observables"),
    ("withheld-drops-bloch", "quantum/teleportation.py",
     'observables={"receiverPurity": float(bob.purity().real), **_bloch("receiver", bob)},',
     'observables={"receiverPurity": float(bob.purity().real)},',
     "corrections-withheld drops the Bloch vector that fixes Bob's state"),
]


def run_with_stub():
    """Sabotage the GATE: the validator is replaced by one that accepts everything."""
    STUB.write_text("export function validateExperimentResult() { return [] }\n")
    try:
        p = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider",
                            str(core.ECHO / "tests" / "test_contract_conformance.py")],
                           capture_output=True, text=True, env={**os.environ, "ECHO_CONTRACTS_JS": str(STUB)})
    finally:
        STUB.unlink()
    return p.returncode, p.stdout.strip().splitlines()[-1]


def main():
    base = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", str(core.ECHO / "tests")],
                          capture_output=True, text=True)
    if base.returncode != 0:
        print("REFUSED: unmutated suite is not green\n" + base.stdout[-2000:])
        return 2
    lines = ["# Sabotage round — after contract conformance", "",
             f"Produced by `evidence/quantum/contract-conformance/sabotage_round.py` (python {sys.version.split()[0]}), "
             f"contracts.js = `{os.environ['ECHO_CONTRACTS_JS']}`.",
             f"Unmutated suite: exit {base.returncode} — `{base.stdout.strip().splitlines()[-1]}`", "",
             "| set | mutation | breaks | pytest exit | verdict | summary |", "|---|---|---|---|---|---|"]
    nulls = 0
    rows = [("quantum-core", m) for m in core.MUTATIONS] + [("contract", m) for m in MINE]
    for group, (mid, rel, old, new, what) in rows:
        if mid == "verdict-as-observable":
            code, tail = run_pair(rows, mid)
        else:
            code, tail = core.run(mid, rel, old, new)
        verdict = "RED (caught)" if code == 1 else ("**NULL — stayed green**" if code == 0 else "REFUSED")
        nulls += code == 0
        lines.append(f"| {group} | `{mid}` | {what} | {code} | {verdict} | {re.sub(r'[|]', '/', tail)} |")
        print(group, mid, code, tail)
    code, tail = run_with_stub()
    verdict = "RED (caught)" if code == 1 else ("**NULL — stayed green**" if code == 0 else "REFUSED")
    nulls += code == 0
    lines.append(f"| gate | `validator-accepts-everything` | contracts.js replaced by a stub returning [] | {code} | {verdict} | {tail} |")
    print("gate validator-accepts-everything", code, tail)
    lines += ["", f"{len(rows) + 1} mutations, {nulls} null(s)."]
    (HERE / "sabotage.md").write_text("\n".join(lines) + "\n")
    return 0


def run_pair(rows, mid):
    """verdict-as-observable needs observable-allows-bool too (the builder would refuse it alone)."""
    import shutil
    import tempfile
    pair = {m[0]: m for _, m in rows}
    with tempfile.TemporaryDirectory() as tmp:
        copy = pathlib.Path(tmp) / "echo"
        shutil.copytree(core.ECHO, copy, ignore=shutil.ignore_patterns("__pycache__", ".pytest_cache"))
        for key in ("observable-allows-bool", mid):
            _, rel, old, new, _ = pair[key]
            target = copy / rel
            src = target.read_text()
            if src.count(old) != 1:
                return 2, f"REFUSED: anchor for {key} found {src.count(old)} times"
            target.write_text(src.replace(old, new))
        p = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", str(copy / "tests")],
                           capture_output=True, text=True, timeout=600)
        return p.returncode, p.stdout.strip().splitlines()[-1]


if __name__ == "__main__":
    sys.exit(main())
