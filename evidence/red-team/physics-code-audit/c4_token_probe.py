"""C4: is the story token consumed once by the QUANTUM side, or only by the quest edge?

    ECHO_ROOT=/tmp/pca/q/echo python evidence/red-team/physics-code-audit/c4_token_probe.py
Exit 1 if live_commit can be called again after a commit (no once-guard), or no story-token state exists.
"""
import os
import sys

sys.path.insert(0, os.environ["ECHO_ROOT"])
import quantum  # noqa: E402
from quantum import teleportation  # noqa: E402

fails = 0
bits = []
for i in range(6):
    try:
        r = teleportation.live_commit("bloch_a")  # seed=None: a fresh 'live' measurement each call
        bits.append((r["measurementBits"]["m0"], r["measurementBits"]["m1"]))
    except Exception as e:  # a guard would raise here on call #2
        print(f"call {i + 1}: refused ({type(e).__name__}: {e})")
        break
print(f"live_commit calls that measured the same token: {len(bits)}; bits per call: {bits}")
if len(bits) > 1:
    print("FAIL: no once-guard in quantum.teleportation.live_commit; the token is re-measured on every call")
    fails += 1
token_names = [n for n in quantum.STATES if "token" in n.lower()]
print(f"STATES names: {sorted(quantum.STATES)}; story-token entries: {token_names}")
if not token_names:
    print("FAIL: no fixed hidden story-token state (owner ruling: 'story token fixed + hidden'); "
          "live_commit accepts any calibration name, so calibration and commit share one namespace")
    fails += 1
r = teleportation.live_commit("bloch_a", seed=1)
print(f"live_commit parameters: {r['parameters']}  (gameplay reads parameters.stateId == 'story_token')")
generic = [n for n, (gates, _) in quantum.STATES.items() if any(g[0] in ('ry', 'rz') for g in gates)]
print(f"generic dry-run states available: {generic} (fixed angles; owner ruling asks for RANDOM generic dry-run states)")
if not any(callable(getattr(teleportation, n, None)) for n in dir(teleportation) if "random" in n.lower()):
    print("FAIL: no random generic calibration-state generator in quantum.teleportation")
    fails += 1
sys.exit(1 if fails else 0)
