"""Dump the quantum engine's REAL two-phase teleport results on the contract's TELEPORT_TEST_STATE
(ry(1.137) then rz(0.44), which the engine names `bloch_a`) for every branch and every X/Z choice,
plus what the engine does when asked to commit the story token. Input to teleport_v2_check.mjs.

    ECHO_ROOT=/tmp/clr-merged/echo python evidence/red-team/cross-lane-recheck/dump_teleport_v2.py > out.json
"""
import json
import os
import sys

sys.path.insert(0, os.environ["ECHO_ROOT"])
from quantum import teleportation  # noqa: E402

phase1 = {}
for seed in range(200):  # phase 1: the engine's own sampled bits, until all four branches appear
    r = teleportation.bell_measurement("bloch_a", seed=seed)
    b = r["measurementBits"]
    phase1.setdefault(f"{b['m0']}{b['m1']}", r)
    if len(phase1) == 4:
        break
phase2 = [teleportation.teleport_branch("bloch_a", m0, m1, x, z)
          for m0 in (0, 1) for m1 in (0, 1) for x in (False, True) for z in (False, True)]
commit = {}
for name in ("story_token", "token"):
    try:
        commit[name] = {"result": teleportation.live_commit(name)}
    except Exception as e:  # the engine has no story-token state
        commit[name] = {"error": f"{type(e).__name__}: {e}"}
print(json.dumps({"state": {"theta": 1.137, "phi": 0.44, "engineName": "bloch_a"},
                  "phase1": phase1, "phase2": phase2, "commit": commit}, allow_nan=False))
