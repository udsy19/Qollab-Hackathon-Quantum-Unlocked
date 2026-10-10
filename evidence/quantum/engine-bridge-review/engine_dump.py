"""Dump real engine output (host Python) for the seam check. Usage: python engine_dump.py <echo-root> > dump.json"""
import json, random, sys
sys.path.insert(0, sys.argv[1])
from quantum import cloning, entanglement, teleportation as t

out = {"cloning": {s: cloning.run_calibration(s) for s in ("zero", "one", "plus", "phase")},
       "relay": {g: entanglement.bell_signalling(g) for g in ("I", "X", "Z")}}
rng = random.Random(7)
while True:  # a non-00 dry run, as the game needs
    bits = t.bell_measurement("calibration", rng=rng)
    if bits["measurementBits"] != {"m0": 0, "m1": 0}:
        break
p, b = bits["parameters"], bits["measurementBits"]
out["dryBits"] = bits
out["dry"] = [dict(request={"theta": p["theta"], "phi": p["phi"], "m0": b["m0"], "m1": b["m1"], "applyX": x, "applyZ": z},
                   result=t.teleport_branch("calibration", b["m0"], b["m1"], x, z, theta=p["theta"], phi=p["phi"]))
              for x in (False, True) for z in (False, True)]
t.reset_story_token()
out["commit"] = t.live_commit(seed=11)
json.dump(out, sys.stdout, indent=1)
