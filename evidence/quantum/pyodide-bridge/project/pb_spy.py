"""Harness-only spy (never shipped in echo/): counts every selected-backend job, every call of
qollab_job.interpret_counts and every story-token commit, from BELOW the bridge.

It wraps BasicSimulator.run at class level, so it sees a job whichever way it is submitted, and
attributes each one from the Python call stack, not from anything the bridge says: a job with a
frame from a project `quantum/` module on the stack was submitted by Python; one with none came
straight from JS (the runner's wrapBackend Proxy, the only path the runner's own counter can see).
The one allowed route is JS (owner ruling 2026-10-10: one guarded backend.run site, bridge.js).

Under the runner's `ionq-mock` backend it also stands in for the IonQ client's network round trip:
Qollab's docs say a plain (non-callPromising) call that reaches an IonQ backend stops with an XHR
ConnectionError, because the HTTP request can only be awaited on a stack entered through
callPromising. `run_sync` has the same requirement (JSPI stack switching), so a plain call fails
here for the same structural reason. It is an emulation of the mechanism, not of IonQ.

Assembled with `--fault` (assemble.sh rewrites FAULT below; the runner forwards no URL flag to
the frame) it also plays a FAULTY engine, so the bridge's validators have something
to refuse: a dry-run branch reports fidelity 1.0 for a wrong X/Z choice (the success-on-a-wrong-choice
lie the contract's cross-check exists for), and interpret_counts names the backend job with the
pre-ruling name "bell_verification". The physics underneath is unchanged.
"""
import sys
import time

_T0 = time.perf_counter()
import js
import qiskit
from pyodide.ffi import run_sync
from qiskit.providers.basic_provider import BasicSimulator

import quantum.qollab_job as qollab_job
import quantum.teleportation as teleportation

# Imported before bridge.js (hoisted import order), so this is the cold Qiskit + engine import cost.
IMPORT_SECONDS = time.perf_counter() - _T0

NETWORK_MOCK = "backend=ionq-mock" in str(js.location.search)
FAULT = False  # assemble.sh --fault sets this True in the disposable copy
COUNTS = {"backendRunAttempts": 0, "backendRunCompleted": 0, "backendRunFromJs": 0, "backendRunFromPython": 0,
          "interpretCalls": 0, "commitCalls": 0,
          "commitsCompleted": 0, "resetCalls": 0, "branchCalls": 0}
BRANCH_ARGS = []  # what teleport_branch actually received, so a dropped angle is visible below the bridge
EVENTS = []

_original_run = BasicSimulator.run
# getattr: a pre-hardening engine (the head-old-python control) lacks some of these; the spy must
# not be the thing that fails, so a missing function is simply not wrapped (and counts stay 0).
_original_interpret = getattr(qollab_job, "interpret_counts", None)
_original_commit = getattr(teleportation, "live_commit", None)
_original_reset = getattr(teleportation, "reset_story_token", None)
_original_branch = getattr(teleportation, "teleport_branch", None)


def _submitted_by_python():
    """True if a frame from a project `quantum/` module is on the stack below this backend.run."""
    frame = sys._getframe(2)
    while frame is not None:
        if "/quantum/" in frame.f_code.co_filename.replace("\\", "/"):
            return True
        frame = frame.f_back
    return False


def _spied_run(self, *args, **kwargs):
    COUNTS["backendRunAttempts"] += 1
    route = "Python" if _submitted_by_python() else "Js"
    COUNTS[f"backendRunFrom{route}"] += 1
    EVENTS.append(f"backend.run attempt #{COUNTS['backendRunAttempts']} from {route}")
    if NETWORK_MOCK:
        run_sync(js.Promise.resolve(0))  # raises unless the stack was entered via callPromising
    job = _original_run(self, *args, **kwargs)
    COUNTS["backendRunCompleted"] += 1
    EVENTS.append(f"backend.run completed #{COUNTS['backendRunCompleted']}")
    return job


def _spied_interpret(*args, **kwargs):
    COUNTS["interpretCalls"] += 1
    EVENTS.append(f"interpret_counts call #{COUNTS['interpretCalls']}")
    result = _original_interpret(*args, **kwargs)
    if FAULT:
        result["experiment"] = "bell_verification"
    return result


def _spied_commit(*args, **kwargs):
    COUNTS["commitCalls"] += 1
    EVENTS.append(f"live_commit call #{COUNTS['commitCalls']}")
    result = _original_commit(*args, **kwargs)
    COUNTS["commitsCompleted"] += 1
    return result


def _spied_reset(*args, **kwargs):
    COUNTS["resetCalls"] += 1
    EVENTS.append(f"reset_story_token call #{COUNTS['resetCalls']}")
    return _original_reset(*args, **kwargs)


def _spied_branch(*args, **kwargs):
    COUNTS["branchCalls"] += 1
    names = ("state", "m0", "m1", "applyX", "applyZ", "theta", "phi")
    BRANCH_ARGS.append({**{n: v for n, v in zip(names, args)}, **kwargs})
    result = _original_branch(*args, **kwargs)
    if FAULT:
        p = result["parameters"]
        if (p["applyX"], p["applyZ"]) != (p["m1"] == 1, p["m0"] == 1):
            result["fidelity"] = 1.0
    return result


BasicSimulator.run = _spied_run
for _module, _name, _original, _spied in ((qollab_job, "interpret_counts", _original_interpret, _spied_interpret),
                                          (teleportation, "live_commit", _original_commit, _spied_commit),
                                          (teleportation, "reset_story_token", _original_reset, _spied_reset),
                                          (teleportation, "teleport_branch", _original_branch, _spied_branch)):
    if _original is not None:
        setattr(_module, _name, _spied)


def snapshot():
    args = [{k: (v if isinstance(v, (bool, int, float, str)) or v is None else repr(v)) for k, v in a.items()}
            for a in BRANCH_ARGS]
    return {"counts": dict(COUNTS), "events": list(EVENTS), "networkMock": NETWORK_MOCK, "fault": FAULT,
            "branchArgs": args}


def direct_second_commit():
    """Python's own latch, seen past the bridge's JS latch: call the ORIGINAL live_commit once more."""
    try:
        _original_commit()
    except Exception as e:  # only TokenAlreadyConsumed counts as Python's latch; anything else is reported
        return {"refused": type(e).__name__ == "TokenAlreadyConsumed", "error": f"{type(e).__name__}: {e}"}
    return {"refused": False, "error": None}


def platform():
    import pyodide
    return {"sysPlatform": sys.platform, "python": sys.version.split()[0], "qiskit": qiskit.__version__,
            "pyodide": pyodide.__version__, "coldImportSeconds": round(IMPORT_SECONDS, 3)}


def nested_probe():
    """A dict holding a dict and a list: what a bare toJs() makes of it is measured in main.js."""
    return {"outer": {"inner": 1.0}, "list": [1, 2], "n": 1}
