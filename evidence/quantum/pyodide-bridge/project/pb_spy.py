"""Harness-only spy (never shipped in echo/): counts every selected-backend job and every entry
into qollab_job.run_bell_verification_once, from BELOW the bridge.

It wraps BasicSimulator.run at class level, so it sees a job whichever way it is submitted: from
Python (our path: JS -> callPromising -> qollab_job -> backend.run) or from JS (the runner's
wrapBackend Proxy, which is the only path the runner's own `backend.run calls` counter can see).

Under the runner's `ionq-mock` backend it also stands in for the IonQ client's network round trip:
Qollab's docs say a plain (non-callPromising) call that reaches an IonQ backend stops with an XHR
ConnectionError, because the HTTP request can only be awaited on a stack entered through
callPromising. `run_sync` has the same requirement (JSPI stack switching), so a plain call fails
here for the same structural reason. It is an emulation of the mechanism, not of IonQ.
"""
import sys
import time

_T0 = time.perf_counter()
import js
import qiskit
from pyodide.ffi import run_sync
from qiskit.providers.basic_provider import BasicSimulator

import quantum.qollab_job as qollab_job

# Imported before bridge.js (hoisted import order), so this is the cold Qiskit + engine import cost.
IMPORT_SECONDS = time.perf_counter() - _T0

NETWORK_MOCK = "backend=ionq-mock" in str(js.location.search)
COUNTS = {"backendRunAttempts": 0, "backendRunCompleted": 0, "verificationCalls": 0}
EVENTS = []

_original_run = BasicSimulator.run
_original_verify = qollab_job.run_bell_verification_once


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
    EVENTS.append(f"run_bell_verification_once call #{COUNTS['verificationCalls']}")
    return _original_verify(*args, **kwargs)


BasicSimulator.run = _spied_run
qollab_job.run_bell_verification_once = _spied_verify


def snapshot():
    return {"counts": dict(COUNTS), "events": list(EVENTS), "networkMock": NETWORK_MOCK}


def platform():
    import pyodide
    return {"sysPlatform": sys.platform, "python": sys.version.split()[0], "qiskit": qiskit.__version__,
            "pyodide": pyodide.__version__, "coldImportSeconds": round(IMPORT_SECONDS, 3)}


def nested_probe():
    """A dict holding a dict and a list: what a bare toJs() makes of it is measured in main.js."""
    return {"outer": {"inner": 1.0}, "list": [1, 2], "n": 1}
