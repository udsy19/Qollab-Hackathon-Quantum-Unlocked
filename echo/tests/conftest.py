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
FAKE_COUNTS = {"00": 120, "11": 130, "01": 3, "10": 3}  # 256 shots of a noisy Bell pair, written by hand


class FakeSelectedBackend:
    """Stands in for Qollab's injected backend: fixed counts, never a real device."""
    name = "fake_backend_for_conformance"

    def run(self, circuit, shots):
        counts = dict(FAKE_COUNTS)

        class Result:
            def get_counts(self):
                return counts

        class Job:
            def result(self):
                return Result()

        return Job()


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
        yield f"teleportation.live_commit({s!r}, seed=11)", lambda s=s: teleportation.live_commit(s, seed=11)
    yield ("qollab_job.interpret_counts(FAKE_COUNTS, shots_requested=256)",
           lambda: qollab_job.interpret_counts(dict(FAKE_COUNTS), FakeSelectedBackend.name, shots_requested=256))
    yield ("qollab_job.interpret_counts(FAKE_COUNTS, shots_requested=300)",  # total drifts from the request
           lambda: qollab_job.interpret_counts(dict(FAKE_COUNTS), FakeSelectedBackend.name, shots_requested=300))

    def once():
        qollab_job._job_submitted = False  # a fresh run: the one job is still available
        return qollab_job.run_bell_verification_once(FakeSelectedBackend())

    yield "qollab_job.run_bell_verification_once(FakeSelectedBackend())", once


BRIDGE_CALL_COUNT = 7 + 3 + 7 * (2 + 16 + 4 + 1 + 1) + 3  # derived by hand from the loops above
