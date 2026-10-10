"""Execute the reference Python in ECHO_MASTER_VISION.md §10.3–10.5 verbatim and grade it against
hand-derived values (law 5: a prescribed implementation is a hypothesis). The quantum lane is
likely to start from these blocks, so a defect here would propagate."""
from __future__ import annotations

import math
import os
import pathlib
import re

import pytest

VISION = pathlib.Path(os.environ.get("ECHO_VISION_PATH", pathlib.Path(__file__).resolve().parents[3] / "ECHO_MASTER_VISION.md"))


def _block(marker: str) -> dict:
    text = VISION.read_text()
    blocks = [b for b in re.findall(r"```python\n(.*?)```", text, re.S) if marker in b]
    assert len(blocks) == 1, f"{marker}: found {len(blocks)} python blocks in {VISION}"
    ns: dict = {}
    exec(compile(blocks[0], f"{VISION.name}:{marker}", "exec"), ns)  # noqa: S102 — owner's own doc
    return ns


def test_vision_doc_present():
    assert VISION.is_file(), VISION


@pytest.mark.parametrize("state,purity", [("zero", 1.0), ("one", 1.0), ("plus", 0.5), ("phase", 0.5)])
def test_spec_cloning_reference(state, purity):
    r = _block("# quantum/cloning.py")["run_calibration"](state)
    assert abs(r["outputPurity0"] - purity) < 1e-8 and abs(r["outputPurity1"] - purity) < 1e-8, r
    assert r["isIndependentCloning"] == (state in ("zero", "one"))


@pytest.mark.parametrize("gate", ["I", "X", "Z"])
def test_spec_no_signal_reference(gate):
    r = _block("# quantum/entanglement.py")["receiver_statistics"](gate)
    assert abs(r["receiverMarginal"]["0"] - 0.5) < 1e-12 and abs(r["receiverMarginal"]["1"] - 0.5) < 1e-12


@pytest.mark.parametrize("theta,phi", [(1.137, 0.44), (0.0, 0.0), (math.pi, 0.0), (math.pi / 2, math.pi / 2), (2.2, -1.3)])
def test_spec_teleport_reference(theta, phi):
    r = _block("# quantum/teleportation.py")["verify_teleportation"](theta, phi)
    assert r["fidelity"] > 0.999999, r["fidelity"]
