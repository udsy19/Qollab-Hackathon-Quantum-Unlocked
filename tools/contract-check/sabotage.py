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
     "  if (Math.abs(res.fidelity - want) > FIDELITY_CROSSCHECK_TOLERANCE + FIDELITY_EPSILON) {", "  if (false) {", "RED"),
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
    ("engine enum checked with `in` (inherited names pass)",
     "Object.hasOwn(ENGINE_KINDS, obj.engine)", "obj.engine in ENGINE_KINDS", "RED"),
    ("transition() event checked with `in` (inherited names refused, not thrown)",
     "!Object.hasOwn(QUEST_EVENTS, event)", "!(event in QUEST_EVENTS)", "RED"),
    ("dry-run parameters.m0/m1 may contradict measurementBits",
     "    if (k in p && p[k] !== res.measurementBits[k]) err(", "    if (false) err(", "RED"),
    # The verdict's two guards (rule AND fidelity) are redundant by design: each null below, both RED.
    ("verdict ignores the rule AND passes at fidelity 0.5",
     [("expected.applyX === req.applyX && expected.applyZ === req.applyZ && res.fidelity >= FIDELITY_PASS", "res.fidelity >= FIDELITY_PASS"),
      ("export const FIDELITY_PASS = 0.999999", "export const FIDELITY_PASS = 0.5")], None, "RED"),
    # Owner-ruled values (contracts-pin-thresholds): each drift must go red on its PIN line, which
    # names the constant and the ruling. The first was a declared null in contracts-v2.
    ("FIDELITY_PASS 0.999999 -> 0.5 (was a v2 null)",
     "export const FIDELITY_PASS = 0.999999", "export const FIDELITY_PASS = 0.5", "RED"),
    ("FIDELITY_PASS 0.999999 -> 0.9 (consult 5 reproduction)",
     "export const FIDELITY_PASS = 0.999999", "export const FIDELITY_PASS = 0.9", "RED"),
    ("FIDELITY_PASS 0.999999 -> 0.99999",
     "export const FIDELITY_PASS = 0.999999", "export const FIDELITY_PASS = 0.99999", "RED"),
    ("FIDELITY_PASS tightened to 1 (no Qiskit run reaches exactly 1 reliably)",
     "export const FIDELITY_PASS = 0.999999", "export const FIDELITY_PASS = 1", "RED"),
    ("BACKEND_SHOTS 256 -> 1024", "export const BACKEND_SHOTS = 256", "export const BACKEND_SHOTS = 1024", "RED"),
    ("BIT_LABELS m0/m1 swapped", "BIT_LABELS = Object.freeze({ m0: 'SOURCE READOUT m0', m1: 'LOCAL BELL-HALF READOUT m1' })",
     "BIT_LABELS = Object.freeze({ m0: 'LOCAL BELL-HALF READOUT m1', m1: 'SOURCE READOUT m0' })", "RED"),
    ("BIT_LABELS.m1 back to the superseded 'RELAY READOUT m1'", "m1: 'LOCAL BELL-HALF READOUT m1' })", "m1: 'RELAY READOUT m1' })", "RED"),
    ("TELEPORT_TEST_STATE phi 0.44 -> 0.4", "Object.freeze({ theta: 1.137, phi: 0.44 })", "Object.freeze({ theta: 1.137, phi: 0.4 })", "RED"),
    ("test-state circuit order rz then ry (Bloch loses phi)",
     "return { x: Math.sin(theta) * Math.cos(phi), y: Math.sin(theta) * Math.sin(phi), z: Math.cos(theta) }",
     "return { x: Math.sin(theta), y: 0 * phi, z: Math.cos(theta) }", "RED"),
    ("backend job experiment id renamed", "'teleportation', 'backend_verification'])", "'teleportation', 'backend_check'])", "RED"),
    ("GENERIC_MAX_WRONG_FIDELITY 0.9 -> 0.95 (design value, pinned)",
     "export const GENERIC_MAX_WRONG_FIDELITY = 0.9", "export const GENERIC_MAX_WRONG_FIDELITY = 0.95", "RED"),
    ("verdict literal 0.9 AND cross-check tolerance 0.2 (export untouched)",
     [("&& res.fidelity >= FIDELITY_PASS", "&& res.fidelity >= 0.9"),
      ("export const FIDELITY_CROSSCHECK_TOLERANCE = 1e-6", "export const FIDELITY_CROSSCHECK_TOLERANCE = 0.2")], None, "RED"),
    # Cross-check tolerance and rounding epsilon (contracts-fidelity-band). The tolerance loosenings
    # must go red on the forged-fidelity probes, not only on the PIN line.
    ("cross-check tolerance 1e-6 -> 1e-1 (supervisor's consult-6 null)",
     "export const FIDELITY_CROSSCHECK_TOLERANCE = 1e-6", "export const FIDELITY_CROSSCHECK_TOLERANCE = 1e-1", "RED"),
    ("cross-check tolerance 1e-6 -> 1e-2",
     "export const FIDELITY_CROSSCHECK_TOLERANCE = 1e-6", "export const FIDELITY_CROSSCHECK_TOLERANCE = 1e-2", "RED"),
    ("cross-check tolerance 1e-6 -> 1e-5",
     "export const FIDELITY_CROSSCHECK_TOLERANCE = 1e-6", "export const FIDELITY_CROSSCHECK_TOLERANCE = 1e-5", "RED"),
    ("cross-check tolerance 1e-6 -> 2e-6 (PIN only: no forged probe sits between 2e-6 and 1e-5)",
     "export const FIDELITY_CROSSCHECK_TOLERANCE = 1e-6", "export const FIDELITY_CROSSCHECK_TOLERANCE = 2e-6", "RED"),
    ("cross-check tolerance tightened 1e-6 -> 1e-9 (refuses a correct F = 0.999999)",
     "export const FIDELITY_CROSSCHECK_TOLERANCE = 1e-6", "export const FIDELITY_CROSSCHECK_TOLERANCE = 1e-9", "RED"),
    ("cross-check drops the epsilon (the reports/0006 equality defect)",
     "> FIDELITY_CROSSCHECK_TOLERANCE + FIDELITY_EPSILON) {", "> FIDELITY_CROSSCHECK_TOLERANCE) {", "RED"),
    ("verdict drops the epsilon (F = 0.999999 - 1e-15 refused)",
     "&& res.fidelity >= FIDELITY_PASS - FIDELITY_EPSILON\n", "&& res.fidelity >= FIDELITY_PASS\n", "RED"),
    ("FIDELITY_EPSILON 1e-12 -> 1e-9", "export const FIDELITY_EPSILON = 1e-12", "export const FIDELITY_EPSILON = 1e-9", "RED"),
    ("FIDELITY_EPSILON 1e-12 -> 0", "export const FIDELITY_EPSILON = 1e-12", "export const FIDELITY_EPSILON = 0", "RED"),
    ("verdict epsilon sign flipped (+ instead of -)",
     "&& res.fidelity >= FIDELITY_PASS - FIDELITY_EPSILON\n", "&& res.fidelity >= FIDELITY_PASS + FIDELITY_EPSILON\n", "RED"),
    # Known blind spots — reported as nulls, not hidden. Both are EQUIVALENT mutants: a result reaches
    # the verdict only after the 1e-6 physics cross-check and the generic-state guard, so on every
    # valid input a wrong choice already scores <= 0.9 and a right one >= 1 - 1e-6. The verdict's own
    # rule term and its own threshold literal are therefore unobservable; the exported VALUES are pinned.
    ("verdict ignores the rule (Qiskit fidelity alone gates the pass)",
     "expected.applyX === req.applyX && expected.applyZ === req.applyZ && res.fidelity >= FIDELITY_PASS", "res.fidelity >= FIDELITY_PASS", "NULL"),
    ("verdict uses a literal 0.9 instead of FIDELITY_PASS (export still 0.999999)",
     "&& res.fidelity >= FIDELITY_PASS", "&& res.fidelity >= 0.9", "NULL"),
    # Equivalent: >= vs > differ only at F exactly 0.999999 - 1e-12 to the last bit, which neither
    # Qiskit (1 ± 1e-15 on a right choice) nor any probe value produces.
    ("verdict floor >= becomes > (strict)",
     "&& res.fidelity >= FIDELITY_PASS - FIDELITY_EPSILON\n", "&& res.fidelity > FIDELITY_PASS - FIDELITY_EPSILON\n", "NULL"),
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
reds = sum(1 for c in CASES if c[3] == "RED")
print(f"sabotage: {len(CASES)} cases ({reds} expected red, {len(CASES) - reds} declared nulls), {mismatches} mismatch(es)")
sys.exit(1 if mismatches else 0)
