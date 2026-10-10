import re
import pathlib

ECHO_ROOT = pathlib.Path(__file__).parent.parent


def test_module_never_creates_or_names_a_backend():
    code = (ECHO_ROOT / "q" / "job.py").read_text()
    for pattern in (r"BasicSimulator", r"IonQProvider", r"get_backend", r"\bAer\b", r"\bforte", r"\baria\b",
                    r"ionq_simulator", r"api_key|token"):
        assert not re.search(pattern, code, re.IGNORECASE), pattern


def test_main_never_calls_backend_run_or_stores():
    js = (ECHO_ROOT / "main.js").read_text()
    assert "backend.run" not in js and "localStorage" not in js and "new WebSocket(" not in js
