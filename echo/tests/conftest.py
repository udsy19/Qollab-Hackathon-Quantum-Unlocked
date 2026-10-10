# Makes `import quantum.<module>` resolve the way Qollab's dotted imports do: `echo/` is the project root.
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))


# ---------------------------------------------------------------- every bridge call, one enumeration
# The full input space of every public function the game calls, enumerated HERE rather than asked of
# the modules (gate-independence law 8). Used by test_formats' plainness sweep, by
# test_contract_conformance and by evidence/quantum/contract-conformance/dump_results.py.
STATES = ["zero", "one", "plus", "minus", "phase", "bloch_a", "bloch_b"]
SENDER_GATES = ["I", "X", "Z"]
BITS = [(0, 0), (0, 1), (1, 0), (1, 1)]
ON_OFF = [(False, False), (False, True), (True, False), (True, True)]
CALIBRATION_SEEDS = [1, 2, 3]  # three fresh dry-run states, drawn by the engine from these seeds


def calibration_angles(seed):
    """The angles the bits call reports for `seed`: the spec the corrections call is handed back."""
    from quantum import teleportation

    p = teleportation.bell_measurement("calibration", seed=seed)["parameters"]
    return p["theta"], p["phi"]


FAKE_COUNTS = {"00": 120, "11": 130, "01": 3, "10": 3}  # 256 shots of a noisy Bell pair, written by hand
# IonQ's noisy path rounds probability x shots, so the total can fall short of the 256 requested.
DRIFTED_COUNTS = {"00": 121, "11": 125, "01": 2, "10": 2}  # 250 counts for 256 requested, written by hand


class FakeSelectedBackend:
    """Stands in for Qollab's injected backend as bridge.js hands it to interpret_counts: a name only.
    Nothing in Python submits to it (the one backend.run is bridge.js's)."""
    name = "fake_backend_for_conformance"


def bridge_calls():
    """(label, thunk) for every bridge call. Imports lazily so a broken engine fails tests, not collection."""
    from quantum import cloning, entanglement, qollab_job, teleportation

    for s in STATES:
        yield f"cloning.run_calibration({s!r})", lambda s=s: cloning.run_calibration(s)
    for g in SENDER_GATES:
        yield f"entanglement.bell_signalling({g!r})", lambda g=g: entanglement.bell_signalling(g)
    for s in STATES:
        yield f"teleportation.bell_measurement({s!r}, seed=7)", lambda s=s: teleportation.bell_measurement(s, seed=7)
        yield f"teleportation.bell_measurement({s!r})", lambda s=s: teleportation.bell_measurement(s)
        for m0, m1 in BITS:
            for x, z in ON_OFF:
                yield (f"teleportation.teleport_branch({s!r}, {m0}, {m1}, {x}, {z})",
                       lambda s=s, m0=m0, m1=m1, x=x, z=z: teleportation.teleport_branch(s, m0, m1, x, z))
        for cx, cz in ON_OFF:
            yield (f"teleportation.verify_deferred({s!r}, {cx}, {cz})",
                   lambda s=s, cx=cx, cz=cz: teleportation.verify_deferred(s, cx, cz))
        yield f"teleportation.corrections_withheld({s!r})", lambda s=s: teleportation.corrections_withheld(s)
    for seed in CALIBRATION_SEEDS:
        yield (f"teleportation.bell_measurement('calibration', seed={seed})",
               lambda seed=seed: teleportation.bell_measurement("calibration", seed=seed))
        theta, phi = calibration_angles(seed)
        for m0, m1 in BITS:
            for x, z in ON_OFF:
                yield (f"teleportation.teleport_branch('calibration', {m0}, {m1}, {x}, {z}, theta={theta}, phi={phi})",
                       lambda theta=theta, phi=phi, m0=m0, m1=m1, x=x, z=z:
                       teleportation.teleport_branch("calibration", m0, m1, x, z, theta=theta, phi=phi))
        yield (f"teleportation.corrections_withheld('calibration', theta={theta}, phi={phi})",
               lambda theta=theta, phi=phi: teleportation.corrections_withheld("calibration", theta=theta, phi=phi))
        yield (f"teleportation.verify_deferred('calibration', True, True, theta={theta}, phi={phi})",
               lambda theta=theta, phi=phi: teleportation.verify_deferred("calibration", True, True, theta=theta, phi=phi))

    def commit(seed):
        teleportation.reset_story_token()  # a fresh run: the token is still unmeasured
        try:
            return teleportation.live_commit(seed=seed)
        finally:
            teleportation.reset_story_token()

    for seed in (11, 12):
        yield f"teleportation.live_commit(seed={seed})", lambda seed=seed: commit(seed)
    yield ("qollab_job.interpret_counts(FAKE_COUNTS, shots_requested=256)",
           lambda: qollab_job.interpret_counts(dict(FAKE_COUNTS), FakeSelectedBackend.name, shots_requested=256))
    yield ("qollab_job.interpret_counts(DRIFTED_COUNTS, shots_requested=256)",  # total drifts from the request
           lambda: qollab_job.interpret_counts(dict(DRIFTED_COUNTS), FakeSelectedBackend.name, shots_requested=256))

    # bridge.js's call: the counts JS read from its one backend.run, the injected backend itself, 256.
    yield ("qollab_job.interpret_counts(FAKE_COUNTS, FakeSelectedBackend(), shots_requested=256)",
           lambda: qollab_job.interpret_counts(dict(FAKE_COUNTS), FakeSelectedBackend(), shots_requested=256))


BRIDGE_CALL_COUNT = 7 + 3 + 7 * (2 + 16 + 4 + 1) + 3 * (1 + 16 + 1 + 1) + 2 + 3  # by hand from the loops above
