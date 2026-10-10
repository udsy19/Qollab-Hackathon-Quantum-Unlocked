#!/usr/bin/env python3
"""Dump the quantum lane's REAL story-commit output (teleportation.live_commit) as JSON, unadapted.

    git archive <quantum-branch> echo/quantum | tar -x -C <dir>
    python3 -I dump_engine_commit.py <dir> > engine_commit.json

Seeds are walked until all four (m0, m1) branches have one commit each; the token latch is re-armed
with reset_story_token() between seeds (the game's RESTART). A second call without a reset must raise.
"""
import json
import sys

sys.path.insert(0, sys.argv[1])
from echo.quantum import teleportation as t  # noqa: E402

out, seen = [], set()
for seed in range(200):
    t.reset_story_token()
    r = t.live_commit(seed=seed)
    bits = (r["measurementBits"]["m0"], r["measurementBits"]["m1"])
    if bits not in seen:
        seen.add(bits)
        out.append({"seed": seed, "result": r})
    if len(seen) == 4:
        break
try:
    t.live_commit(seed=0)
    second = "ACCEPTED (latch missing)"
except Exception as e:  # noqa: BLE001
    second = f"{type(e).__name__}: {e}"
print(json.dumps({"engine": "echo/quantum/teleportation.py live_commit", "commits": out,
                  "secondCallWithoutReset": second}, indent=1, default=str))
