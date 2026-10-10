"""Dump the engine's teleport dry-run results for two generic states, one JSON line each.
Tries contracts-v2's {theta, phi} entry point first (bell_measurement(theta=, phi=),
teleport_branch("calibration", ..., theta=, phi=)); if the engine has none, records that as a probe
failure and falls back to the catalogue names bloch_a / bloch_b, which prepare the same two states.
Usage: python3 -I dump_teleport_v2.py <path/to/echo> > teleport.jsonl"""
import json, sys
sys.path.insert(0, sys.argv[1])
from quantum import teleportation as T

STATES = {"bloch_a": (1.137, 0.44), "bloch_b": (2.3, -1.9)}
try:
    T.bell_measurement(theta=1.137, phi=0.44, seed=7)
    v2 = True
    print(json.dumps({"probe": "bell_measurement(theta=, phi=)", "ok": True}))
except TypeError as e:
    v2 = False
    print(json.dumps({"probe": "bell_measurement(theta=, phi=)", "error": f"TypeError: {e}"}))


def phase1(name):
    t, p = STATES[name]
    return T.bell_measurement(theta=t, phi=p, seed=7) if v2 else T.bell_measurement(name, seed=7)


def phase2(name, m0, m1, x, z):
    t, p = STATES[name]
    return T.teleport_branch("calibration", m0, m1, x, z, theta=t, phi=p) if v2 else T.teleport_branch(name, m0, m1, x, z)


for name in STATES:
    print(json.dumps({"state": name, "phase": 1, "result": phase1(name)}))
    for m0 in (0, 1):
        for m1 in (0, 1):
            for x in (False, True):
                for z in (False, True):
                    print(json.dumps({"state": name, "phase": 2, "m0": m0, "m1": m1, "applyX": x, "applyZ": z,
                                      "result": phase2(name, m0, m1, x, z)}))
