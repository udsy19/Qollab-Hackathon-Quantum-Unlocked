"""Harness-only spy (never shipped in echo/): counts every selected-backend job, every entry into
qollab_job.run_backend_verification_once and every story-token commit, from BELOW the bridge.

It wraps BasicSimulator.run at class level, so it sees a job whichever way it is submitted: from
Python (our path: JS -> callPromising -> qollab_job -> backend.run) or from JS (the runner's
wrapBackend Proxy, which is the only path the runner's own `backend.run calls` counter can see).

Under the runner's `ionq-mock` backend it also stands in for the IonQ client's network round trip:
Qollab's docs say a plain (non-callPromising) call that reaches an IonQ backend stops with an XHR
ConnectionError, because the HTTP request can only be awaited on a stack entered through
callPromising. `run_sync` has the same requirement (JSPI stack switching), so a plain call fails
here for the same structural reason. It is an emulation of the mechanism, not of IonQ.

With `pb_fault=1` in the URL it also plays a FAULTY engine, so the bridge's validators have something
to refuse: a dry-run branch reports fidelity 1.0 for a wrong X/Z choice (the success-on-a-wrong-choice
lie the contract's cross-check exists for), and the backend job comes back under the pre-ruling name
"bell_verification". The physics underneath is unchanged.
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
FAULT = "pb_fault=1" in str(js.location.search)
COUNTS = {"backendRunAttempts": 0, "backendRunCompleted": 0, "verificationCalls": 0, "commitCalls": 0,
          "commitsCompleted": 0, "resetCalls": 0, "branchCalls": 0}
BRANCH_ARGS = []  # what teleport_branch actually received, so a dropped angle is visible below the bridge
EVENTS = []

_original_run = BasicSimulator.run
_original_verify = qollab_job.run_backend_verification_once
_original_commit = teleportation.live_commit
_original_reset = teleportation.reset_story_token
_original_branch = teleportation.teleport_branch


def _spied_run(self, *args, **kwargs):
    COUNTS["backendRunAttempts"] += 1
    EVENTS.append(f"backend.run attempt #{COUNTS['backendRunAttempts']}")
    if NETWORK_MOCK:
        run_sync(js.Promise.resolve(0))  # raises unless the stack was entered via callPromising
    job = _original_run(self, *args, **kwargs)
    COUNTS["backendRunCompleted"] += 1
    EVENTS.append(f"backend.run completed #{COUNTS['backendRunCompleted']}")
    return job


def _spied_verify(*args, **kwargs):
    COUNTS["verificationCalls"] += 1
    EVENTS.append(f"run_backend_verification_once call #{COUNTS['verificationCalls']}")
    result = _original_verify(*args, **kwargs)
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
qollab_job.run_backend_verification_once = _spied_verify
teleportation.live_commit = _spied_commit
teleportation.reset_story_token = _spied_reset
teleportation.teleport_branch = _spied_branch


def snapshot():
    args = [{k: (v if isinstance(v, (bool, int, float, str)) or v is None else repr(v)) for k, v in a.items()}
            for a in BRANCH_ARGS]
    return {"counts": dict(COUNTS), "events": list(EVENTS), "networkMock": NETWORK_MOCK, "fault": FAULT,
            "branchArgs": args}


def direct_second_commit():
    """Python's own latch, seen past the bridge's JS latch: call the ORIGINAL live_commit once more."""
    try:
        _original_commit()
    except teleportation.TokenAlreadyConsumed as e:
        return {"refused": True, "error": type(e).__name__}
    return {"refused": False, "error": None}


def platform():
    import pyodide
    return {"sysPlatform": sys.platform, "python": sys.version.split()[0], "qiskit": qiskit.__version__,
            "pyodide": pyodide.__version__, "coldImportSeconds": round(IMPORT_SECONDS, 3)}


def nested_probe():
    """A dict holding a dict and a list: what a bare toJs() makes of it is measured in main.js."""
    return {"outer": {"inner": 1.0}, "list": [1, 2], "n": 1}
