"""One complete player path through the quantum engine, exactly as the bridge would call it:
relay EXACT panel -> rooftop dry run (bits -> wrong X/Z -> fail -> fresh state -> right X/Z -> pass on
non-00 bits) -> COMMIT -> second COMMIT refused -> reset_story_token (RESTART) -> COMMIT again.
Every result is printed in full (JSON) under its summary line, so any field can be audited.
usage: python transcript.py <path/to/echo>   (local venv; not Pyodide, not Qollab)"""
import json
import sys

sys.path.insert(0, sys.argv[1])
from quantum import entanglement, teleportation  # noqa: E402

PASS = 0.999999  # vision §7.4; the UI's dryRunVerdict uses the same line (contracts-v2 FIDELITY_PASS)


def show(title, r):
    print(f"\n### {title}")
    for f in r["facts"]:
        print(f"  fact: {f}")
    print("  json: " + json.dumps(r, ensure_ascii=False))


def verdict(r):
    b, p = r["measurementBits"], r["parameters"]
    rule = teleportation.expected_corrections(b["m0"], b["m1"])
    follows = rule == {"applyX": p["applyX"], "applyZ": p["applyZ"]}
    passed = follows and r["fidelity"] >= PASS
    return f"choice X={'ON' if p['applyX'] else 'OFF'} Z={'ON' if p['applyZ'] else 'OFF'}; fidelity {r['fidelity']:.6f}; " \
           f"{'PASS' if passed else 'FAIL'}{' (unlocks COMMIT: bits are not 00)' if passed and (b['m0'] or b['m1']) else ''}"


print("== Mission 2: relay, receiver panel (EXACT partial-trace probabilities, no counts)")
for g in ("I", "X", "Z"):
    r = entanglement.bell_signalling(g)
    print(f"sender {g}: receiver P = {r['probabilities']}  counts present: {'counts' in r}")
    show(f"bell_signalling({g!r})", r)

print("\n== Mission 3: rooftop dry run")
seed = 1
bits = teleportation.bell_measurement("calibration", seed=seed)
b, p = bits["measurementBits"], bits["parameters"]
print(f"bits call 1: fresh state theta={p['theta']}, phi={p['phi']}; m0={b['m0']}, m1={b['m1']}; fidelity present: {'fidelity' in bits}")
show(f"bell_measurement('calibration', seed={seed})", bits)
rule = teleportation.expected_corrections(b["m0"], b["m1"])
wrong_x, wrong_z = (not rule["applyX"]), rule["applyZ"]  # a wrong choice: X flipped from the rule
r = teleportation.teleport_branch("calibration", b["m0"], b["m1"], wrong_x, wrong_z, theta=p["theta"], phi=p["phi"])
print(f"corrections call 1 (player picks wrong): {verdict(r)}")
show("teleport_branch(... wrong ...)", r)

# Gameplay ruling: a wrong dry run retries on a FRESH calibration state; keep drawing until the bits
# are not 00 so the passing run really applies X and/or Z (overseer ruling, gameplay consult 3 #2).
seed = 2
while True:
    bits2 = teleportation.bell_measurement("calibration", seed=seed)
    if bits2["measurementBits"] != {"m0": 0, "m1": 0}:
        break
    seed += 1
b2, p2 = bits2["measurementBits"], bits2["parameters"]
print(f"\nbits call 2 (fresh state, seed {seed}): theta={p2['theta']}, phi={p2['phi']}; m0={b2['m0']}, m1={b2['m1']}")
assert (p2["theta"], p2["phi"]) != (p["theta"], p["phi"])
show(f"bell_measurement('calibration', seed={seed})", bits2)
rule2 = teleportation.expected_corrections(b2["m0"], b2["m1"])
r2 = teleportation.teleport_branch("calibration", b2["m0"], b2["m1"], rule2["applyX"], rule2["applyZ"],
                                   theta=p2["theta"], phi=p2["phi"])
print(f"corrections call 2 (player follows the rule): {verdict(r2)}")
show("teleport_branch(... right ...)", r2)

print("\n== COMMIT")
c1 = teleportation.live_commit()
print(f"live_commit(): bits m0={c1['measurementBits']['m0']}, m1={c1['measurementBits']['m1']}; fidelity {c1['fidelity']:.6f}; "
      f"parameters {c1['parameters']}; observables {c1['observables']}")
show("live_commit()", c1)
try:
    teleportation.live_commit()
    print("SECOND COMMIT WAS ALLOWED (defect)")
except teleportation.TokenAlreadyConsumed as e:
    print(f"\nsecond live_commit() refused: {type(e).__name__}: {e}")
teleportation.reset_story_token()
print("reset_story_token()  (gameplay RESTART)")
c2 = teleportation.live_commit()
print(f"live_commit() after reset: bits m0={c2['measurementBits']['m0']}, m1={c2['measurementBits']['m1']}; fidelity {c2['fidelity']:.6f}")
show("live_commit() after reset", c2)
