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
     "  DECLASSIFIED: { OPEN_CREDITS: 'CREDITS', CLOSE_SCIENCE: 'ENDING' },", "  DECLASSIFIED: { CLOSE_SCIENCE: 'ENDING' },", "RED"),
    ("allow commit twice (TELEPORT_COMMITTED --COMMIT_TRANSFER-->)",
     "  TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING' },", "  TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING', COMMIT_TRANSFER: 'TELEPORT_COMMITTED' },", "RED"),
    ("allow counts under exact_qiskit_local and documented_preview",
     "  if (hasC && obj.engine !== 'qollab_selected_backend') err(", "  if (false) err(", "RED"),
    ("allow counts under documented_preview only (v1 rule)",
     "  if (hasC && obj.engine !== 'qollab_selected_backend') err(", "  if (hasC && obj.engine === 'exact_qiskit_local') err(", "RED"),
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
    # v2: transitions, event sources, results, the two-phase dry run, settings.
    ("delete the ENDING --RESTART--> TITLE edge", ", RESTART: 'TITLE' },", " },", "RED"),
    ("RESET_STATE drifts to BOOT", "export const RESET_STATE = 'TITLE'", "export const RESET_STATE = 'BOOT'", "RED"),
    ("OPEN_ROOFTOP fired by story-ui instead of a gameplay world trigger",
     "  OPEN_ROOFTOP: SOURCE('gameplay', 'world_trigger'),", "  OPEN_ROOFTOP: SOURCE('story-ui', 'world_trigger'),", "RED"),
    ("Mission 2 allowed as a documented preview",
     "    if (obj.engine !== 'exact_qiskit_local') err(`experiment bell_signalling", "    if (false) err(`experiment bell_signalling", "RED"),
    ("Mission 2 receiver q1 not required in keyQubits",
     "!obj.keyQubits.includes(BELL_RECEIVER_QUBIT)) {", "false) {", "RED"),
    ("backend_verification shots not pinned to 256",
     "if (obj.parameters?.shots !== BACKEND_SHOTS) err(", "if (false) err(", "RED"),
    ("measurementBits allowed on any experiment",
     "if (obj.measurementBits !== undefined && obj.experiment !== 'teleportation') {", "if (false) {", "RED"),
    ("marginal reads the key from the wrong end", "out[key[pos]] += p", "out[key[key.length - 1 - pos]] += p", "RED"),
    ("allow X when m1=0 (expectedCorrections)", "return { applyX: m1 === 1, applyZ: m0 === 1 }",
     "return { applyX: m1 === 1 || m0 === 1, applyZ: m0 === 1 }", "RED"),
    ("swap the correction rule (X iff m0, Z iff m1)", "return { applyX: m1 === 1, applyZ: m0 === 1 }",
     "return { applyX: m0 === 1, applyZ: m1 === 1 }", "RED"),
    ("fidelity cross-check removed (a forged success is accepted)",
     "  if (Math.abs(res.fidelity - want) > FIDELITY_CROSSCHECK_TOLERANCE) {", "  if (false) {", "RED"),
    ("physics cross-check swaps x and z", "return ex && ez ? b.y ** 2 : ex ? b.x ** 2 : ez ? b.z ** 2 : 1",
     "return ex && ez ? b.y ** 2 : ex ? b.z ** 2 : ez ? b.x ** 2 : 1", "RED"),
    ("phase 1 may report fidelity before the choice",
     "    if (res.fidelity !== undefined) err('phase-1 result must not report fidelity", "    if (false) err('phase-1 result must not report fidelity", "RED"),
    ("phase 2 bits not compared with the request",
     "  if (mb.m0 !== req.m0 || mb.m1 !== req.m1) err(", "  if (false) err(", "RED"),
    ("makeCorrectionRequest swaps m0 and m1", "  const { m0, m1 } = bitsResult.measurementBits", "  const { m0: m1, m1: m0 } = bitsResult.measurementBits", "RED"),
    ("a 00 pass unlocks COMMIT", "unlocksCommit: passed && (req.m0 === 1 || req.m1 === 1)", "unlocksCommit: passed", "RED"),
    ("non-generic states accepted (|0>, |+>)", "export const GENERIC_MAX_WRONG_FIDELITY = 0.9", "export const GENERIC_MAX_WRONG_FIDELITY = 1", "RED"),
    ("a captions on/off setting accepted",
     "    if (!SETTING_KEYS.includes(k)) err(", "    if (!SETTING_KEYS.includes(k) && k !== 'subtitles') err(", "RED"),
    ("textScale may reach 250", "s.textScale <= 200", "s.textScale <= 250", "RED"),
    # The verdict's two guards (rule AND fidelity) are redundant by design: each null below, both RED.
    ("verdict ignores the rule AND passes at fidelity 0.5",
     [("expected.applyX === req.applyX && expected.applyZ === req.applyZ && res.fidelity >= FIDELITY_PASS", "res.fidelity >= FIDELITY_PASS"),
      ("export const FIDELITY_PASS = 0.999999", "export const FIDELITY_PASS = 0.5")], None, "RED"),
    # Known blind spots — reported as nulls, not hidden.
    ("verdict ignores the rule (Qiskit fidelity alone gates the pass)",
     "expected.applyX === req.applyX && expected.applyZ === req.applyZ && res.fidelity >= FIDELITY_PASS", "res.fidelity >= FIDELITY_PASS", "NULL"),
    ("verdict pass threshold loosened to 0.5 (the rule alone gates the pass)",
     "export const FIDELITY_PASS = 0.999999", "export const FIDELITY_PASS = 0.5", "NULL"),
    ("ANIMATION_END moved to story-ui (an inferred source, not owner-ruled)",
     "  ANIMATION_END: SOURCE('gameplay', 'cinematic'),", "  ANIMATION_END: SOURCE('story-ui', 'cinematic'),", "NULL"),
    ("default volume 80 -> 50 (defaults are not pinned, only validated)",
     "textScale: 100, quality: 'med', volume: 80 })", "textScale: 100, quality: 'med', volume: 50 })", "NULL"),
    ("rename a §9.3 world-change id", "'corridor_door_opens'", "'door_opens'", "NULL"),
    # v1 null, closed in v2: CORRECT_CALIBRATION's EVENT_SOURCES entry is experiment_result, not interactable.
    ("rebind teleport_terminal to another VALID state/event pair (not in §9.4)",
     "teleport_terminal: { requiredQuest: 'LINK_REPAIRED', action: 'RUN_DRY_TEST' }",
     "teleport_terminal: { requiredQuest: 'TELEPORT_DRY_RUN', action: 'CORRECT_CALIBRATION' }", "RED"),
    ("drop the Map-specific hint from describe()",
     "  if (v instanceof Map) return 'a Map (Pyodide toJs() without { dict_converter: Object.fromEntries })'\n", "", "NULL"),
]

src = SRC.read_text()
mismatches = 0
with tempfile.TemporaryDirectory() as tmp:
    for name, old, new, expect in CASES:
        pairs = old if isinstance(old, list) else [(old, new)]  # a list sabotages several anchors at once
        bad = [o for o, _ in pairs if src.count(o) != 1]
        if bad:
            print(f"REFUSED  {name}: anchor {bad[0][:50]!r} found {src.count(bad[0])} times (needs exactly 1)")
            mismatches += 1
            continue
        mutated = src
        for o, n in pairs:
            mutated = mutated.replace(o, n)
        copy = pathlib.Path(tmp) / "contracts.js"
        copy.write_text(mutated)
        r = subprocess.run(["node", str(CHECK), "--contracts", str(copy)], capture_output=True, text=True)
        got = {0: "NULL", 1: "RED"}.get(r.returncode, f"exit{r.returncode}")
        fails = sum(1 for line in r.stdout.splitlines() if line.startswith("  FAIL"))
        flag = "ok " if got == expect else "MISMATCH"
        mismatches += got != expect
        print(f"{flag}  {got:4}  (expected {expect:4}, {fails:3} FAIL lines)  {name}")
print(f"sabotage: {len(CASES)} cases, {mismatches} mismatch(es)")
sys.exit(1 if mismatches else 0)
