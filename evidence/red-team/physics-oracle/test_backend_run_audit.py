"""Positive controls for backend_run_audit.py: every call shape it claims to see, seen."""
from __future__ import annotations

import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import backend_run_audit as bra  # noqa: E402

SHAPES = {
    "direct.js": "const job = await backend.run(qc, { shots: 256 });",
    "member.js": "await this.backend.run(qc);",
    "named.js": "selectedBackend.run(qc)",
    "bracket.js": "backend['run'](qc)",
    "alias.js": "const b = backend;\nfunction go(){ return b.run(qc); }",
    "global_alias.js": "let be = globalThis.backend;\nbe.run(qc);",
    "destruct.js": "const { run } = backend;\nawait run(qc);",
    "destruct_rename.js": "const { run: fire } = backend;\nfire(qc);",
    "py_direct.py": "job = backend.run([qc], shots=1024)",
    "py_getattr.py": "f = getattr(backend, 'run')\nf(qc)",
}


@pytest.mark.parametrize("fname,src", SHAPES.items())
def test_each_call_shape_is_one_site(tmp_path, fname, src):
    (tmp_path / fname).write_text(src)
    r = bra.scan(tmp_path)
    assert len(r["sites"]) == 1, (fname, r)


def test_comments_and_lookalikes_are_not_counted(tmp_path):
    (tmp_path / "a.js").write_text("// backend.run(qc) is called once, in verify.js\n"
                                   "runner.run(qc);\nif (backend == null) {}\nconst rerun = backend_ready;\n")
    (tmp_path / "b.py").write_text("# backend.run(qc)\nsimulator.run(qc)\n")
    r = bra.scan(tmp_path)
    assert r["sites"] == [] and len(r["comments"]) == 2, r


def test_cli_exit_codes(tmp_path, capsys):
    assert bra.main(["x", str(tmp_path / "missing")]) == 2
    assert bra.main(["x", str(tmp_path)]) == 2            # no files: refusal, not a pass
    (tmp_path / "one.js").write_text("backend.run(qc)")
    assert bra.main(["x", str(tmp_path)]) == 0
    (tmp_path / "two.py").write_text("backend.run(qc)")
    assert bra.main(["x", str(tmp_path)]) == 1


def test_counting_backend_refuses_second_job():
    from qiskit import QuantumCircuit
    from qiskit.providers.basic_provider import BasicSimulator
    qc = QuantumCircuit(1, 1)
    qc.measure(0, 0)
    cb = bra.CountingBackend(BasicSimulator())
    assert cb.run(qc, shots=8).result().get_counts() == {"0": 8}
    with pytest.raises(RuntimeError, match="one job per run"):
        cb.run(qc, shots=8)
