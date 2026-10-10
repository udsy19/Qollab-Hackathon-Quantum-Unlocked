#!/usr/bin/env python3
"""tools/contract-check/sabotage.py — break echo/contracts.js on a disposable copy, one way at a
time, and record whether check.mjs goes red. Expected nulls are listed as such; an unexpected
null or an unexpected red is a finding. Never touches the real file (gate-independence law 10).

    python3 tools/contract-check/sabotage.py      # exit 0 when every outcome matches its expectation
"""
import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
SRC = (HERE / "../../echo/contracts.js").resolve()
CHECK = HERE / "check.mjs"

# (name, old, new, expected verdict): 'RED' = the check must catch it; 'NULL' = known blind spot.
CASES = [
    ("delete a transition (LINK_REPAIRED → RUN_DRY_TEST)",
     "  LINK_REPAIRED: { RUN_DRY_TEST: 'TELEPORT_DRY_RUN' },\n", "  LINK_REPAIRED: {},\n", "RED"),
    ("misspell a state in QUEST_STATE_LIST", "'CLONE_SUPERPOSITION_FAILED', 'CLONE_UNDERSTOOD',",
     "'CLONE_SUPERPOSITION_FAILED', 'CLONE_UNDERSTOD',", "RED"),
    ("loosen probability tolerance to 1e-6", "PROBABILITY_TOLERANCE = 1e-9", "PROBABILITY_TOLERANCE = 1e-6", "RED"),
    ("tighten probability tolerance to 1e-12", "PROBABILITY_TOLERANCE = 1e-9", "PROBABILITY_TOLERANCE = 1e-12", "RED"),
    ("strict tables stop throwing on a misspelt name",
     "      throw new TypeError(`${name}.${prop} does not exist", "      return undefined; throw new TypeError(`${name}.${prop} does not exist", "RED"),
    ("transition() stops throwing on an unknown event",
     "    throw new TypeError(`transition: unknown quest event", "    return { ok: false, state, reason: 'x' }; throw new TypeError(`transition: unknown quest event", "RED"),
    ("refused transition resets state instead of keeping it",
     "return { ok: false, state, reason:", "return { ok: false, state: INITIAL_STATE, reason:", "RED"),
    ("add an unexplained edge TITLE --SKIP--> CREDITS",
     "  TITLE: { START: 'OPENING' },", "  TITLE: { START: 'OPENING', SKIP: 'CREDITS' },", "RED"),
    ("delete the DECLASSIFIED → CREDITS addition",
     "  DECLASSIFIED: { OPEN_CREDITS: 'CREDITS' },", "  DECLASSIFIED: {},", "RED"),
    ("allow commit twice (TELEPORT_COMMITTED --COMMIT_TRANSFER-->)",
     "  TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING' },", "  TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING', COMMIT_TRANSFER: 'TELEPORT_COMMITTED' },", "RED"),
    ("allow counts under exact_qiskit_local",
     "  if (obj.engine === 'exact_qiskit_local' && hasC) err(", "  if (false) err(", "RED"),
    ("allow probabilities under qollab_selected_backend",
     "  if (obj.engine === 'qollab_selected_backend' && hasP) err(", "  if (false) err(", "RED"),
    ("measurementBits accept anything",
     "if (mb[bit] !== 0 && mb[bit] !== 1) err(", "if (false) err(", "RED"),
    ("unknown result fields accepted", "if (!RESULT_FIELDS.has(k)) err(", "if (false) err(", "RED"),
    ("probability keys not checked against keyQubits",
     "          if (!/^[01]+$/.test(key) || key.length !== kq.length) {", "          if (false) {", "RED"),
    ("fidelity upper bound removed", "&& obj.fidelity <= 1 + PROBABILITY_TOLERANCE", "", "RED"),
    ("empty facts accepted", "!Array.isArray(obj.facts) || obj.facts.length === 0", "!Array.isArray(obj.facts)", "RED"),
    ("rebind copy_booth to the wrong state/event",
     "copy_booth: { requiredQuest: 'FREE_ROAM_ALLEY', action: 'OPEN_CLONE_BOOTH' }",
     "copy_booth: { requiredQuest: 'RELAY_UNLOCKED', action: 'REACH_RELAY' }", "RED"),
    # Known blind spots — reported as nulls, not hidden.
    ("rename a §9.3 world-change id", "'corridor_door_opens'", "'door_opens'", "NULL"),
    ("rebind teleport_terminal to another VALID state/event pair (not in §9.4)",
     "teleport_terminal: { requiredQuest: 'LINK_REPAIRED', action: 'RUN_DRY_TEST' }",
     "teleport_terminal: { requiredQuest: 'TELEPORT_DRY_RUN', action: 'CORRECT_CALIBRATION' }", "NULL"),
    ("drop the Map-specific hint from describe()",
     "  if (v instanceof Map) return 'a Map (Pyodide toJs() without { dict_converter: Object.fromEntries })'\n", "", "NULL"),
]

src = SRC.read_text()
mismatches = 0
with tempfile.TemporaryDirectory() as tmp:
    for name, old, new, expect in CASES:
        if src.count(old) != 1:
            print(f"REFUSED  {name}: anchor found {src.count(old)} times (needs exactly 1)")
            mismatches += 1
            continue
        copy = pathlib.Path(tmp) / "contracts.js"
        copy.write_text(src.replace(old, new))
        r = subprocess.run(["node", str(CHECK), "--contracts", str(copy)], capture_output=True, text=True)
        got = {0: "NULL", 1: "RED"}.get(r.returncode, f"exit{r.returncode}")
        fails = sum(1 for line in r.stdout.splitlines() if line.startswith("  FAIL"))
        flag = "ok " if got == expect else "MISMATCH"
        mismatches += got != expect
        print(f"{flag}  {got:4}  (expected {expect:4}, {fails:3} FAIL lines)  {name}")
print(f"sabotage: {len(CASES)} cases, {mismatches} mismatch(es)")
sys.exit(1 if mismatches else 0)
