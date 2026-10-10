"""Real quantum-engine ExperimentResults for the quest-state regrade (input to run.mjs --results).

    ECHO_ROOT=<quantum export>/echo python -I dump_regrade.py > results.json

`happy` is physics-code-audit/dump_results.py's own output, run unchanged (not forked). The extra
tables give the harness every teleport branch and choice, every clone input and one live commit per
seed, so no check needs a hand-typed result. Every number here is the engine's.
"""
import contextlib
import io
import json
import os
import runpy
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.environ["ECHO_ROOT"])
from quantum import STATES, cloning, entanglement, teleportation  # noqa: E402

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    runpy.run_path(os.path.join(HERE, "..", "physics-code-audit", "dump_results.py"), run_name="__main__")
happy = json.loads(buf.getvalue())

branches = []
for name in sorted(STATES):
    for m0, m1 in teleportation.BRANCHES:
        for x in (False, True):
            for z in (False, True):
                try:
                    branches.append(teleportation.teleport_branch(name, m0, m1, x, z))
                except ValueError:  # a branch of probability 0 for a basis state
                    pass
out = {
    "happy": happy,
    "branches": branches,
    "clones": {name: cloning.run_calibration(name) for name in sorted(STATES)},
    "bell": {g: entanglement.bell_signalling(g) for g in ("I", "X", "Z")},
    "commits": [teleportation.live_commit("bloch_b", seed=s) for s in range(16)],
}
print(json.dumps(out, allow_nan=False))
