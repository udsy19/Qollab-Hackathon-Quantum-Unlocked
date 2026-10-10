"""Call EVERY public bridge function of echo/quantum across its full input space and dump each
returned dict as one JSON line: {"call": ..., "result": ...} or {"call": ..., "error": ...}.

The enumeration is `bridge_calls()` in echo/tests/conftest.py (one list, shared with the pytest).
Usage: python3 dump_results.py [path/to/echo] > results.jsonl
"""
import json
import pathlib
import sys

ECHO = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parents[3] / "echo")
sys.path[:0] = [str(ECHO), str(ECHO / "tests")]

from conftest import bridge_calls  # noqa: E402


def main():
    n = 0
    for name, fn in bridge_calls():
        try:
            text = json.dumps({"call": name, "result": fn()}, allow_nan=False)  # non-plain is a contract failure
        except Exception as e:  # noqa: BLE001 — every failure is recorded, none skipped
            text = json.dumps({"call": name, "error": f"{type(e).__name__}: {e}"})
        print(text)
        n += 1
    print(f"{n} calls", file=sys.stderr)


if __name__ == "__main__":
    main()
