"""Computes, INSIDE Pyodide, the same engine calls derive.py makes on the host."""
import json, sys
import qiskit
from quantum import teleportation as T, cloning as Cl, entanglement as En


def platform():
    return {"python": sys.version.split()[0], "sysPlatform": sys.platform, "qiskit": qiskit.__version__}


def engine_outputs(states_json):
    states = json.loads(states_json)["states"]
    return {"tele": [[T.teleport_branch("calibration", m0, m1, x, z, theta=th, phi=ph) for (m0, m1) in ((0, 0), (0, 1), (1, 0), (1, 1)) for x in (False, True) for z in (False, True)] for th, ph in states],
            "withheld": [T.corrections_withheld("calibration", theta=th, phi=ph) for th, ph in states],
            "deferred": [[T.verify_deferred("calibration", a, b, theta=th, phi=ph) for a in (True, False) for b in (True, False)] for th, ph in states],
            "clone": {s: Cl.run_calibration(s) for s in ("plus", "phase", "minus", "zero", "bloch_a")},
            "relay": {g: En.bell_signalling(g) for g in ("I", "X", "Z")}}
