# Quantum engine: smoke plan

## 1. Local (any machine with the venv)

```
.venv/bin/python -m pytest echo/tests -q                      # expect: all passed, exit 0
.venv/bin/python evidence/quantum-core/sabotage_round.py      # expect: exit 0, sabotage.md rewritten
.venv/bin/python evidence/quantum-core/transcript.py          # expect: transcript.txt rewritten
```

The tests take their expected values from hand derivations in the test files: explicit amplitudes,
and an independent numpy simulation of the teleportation circuit. They do not take them from
`echo/quantum`.

## 2. On Qollab (owner only; the outcome goes in `owner-answers.md`)

The local venv runs CPython 3.13. Qollab runs Pyodide with Python 3.14. Nothing in steps 2.1 to 2.5
has been run on Qollab yet.

1. **Import.** `import * as cloning from 'quantum.cloning'` resolves, and so do `quantum.entanglement`
   and `quantum.teleportation`. The modules use package-relative imports (`from . import`,
   `from .formats import`), so `echo/quantum/__init__.py` must be uploaded too.
2. **Call.** `await cloning.run_calibration.callPromising('plus')` returns a proxy with no error.
3. **Convert.** `.toJs({dict_converter: Object.fromEntries})` gives a plain object.
   `observables.purityQ0 === 0.5`, `keyQubits` is an Array `[1, 0]` and `facts` is an Array. A bare `.toJs()` gives a JS `Map` for
   every dict (that is Pyodide's default), so `result.observables` would be undefined. The platform
   adapter must pass `dict_converter`.
4. **Teleportation.** `teleport_branch.callPromising('bloch_a', 1, 0, false, true)` gives
   `fidelity === 1`. With `(…, 1, 0, false, false)` it gives `fidelity` 0.176668.
   Two-phase dry run with keyword arguments (Pyodide passes them with `callKwargs`):
   `bell_measurement.callKwargs('calibration', {theta: 1.137, phi: 0.44})` returns `measurementBits`
   and no `fidelity`; `teleport_branch.callKwargs('calibration', m0, m1, x, z, {theta: 1.137, phi: 0.44})`
   returns the fidelity for those bits. `live_commit()` works once; a second call raises
   `TokenAlreadyConsumed`; `reset_story_token()` re-arms it.
5. **Timing.** Record the first-call latency (Qiskit import plus the first Statevector) and the
   latency of a warm call. The game must show CALIBRATING while the first call runs.
6. **No backend.** None of these calls touches `backend`. The single `backend.run` belongs to
   `quantum/qollab_job.py` (another worker).

## 3. Science checks a player can see

- Booth: `|+>` gives two outputs with purity 0.5 each, an entangled pair, not two copies. `|0>` and
  `|1>` copy, because they are known basis values.
- Relay: the receiver sees P(0) = P(1) = 0.5 for I, X and Z. Only comparing both logs shows I and X
  differ (Z-basis agreement 1 against 0). Z shows up only in the X-basis comparison.
- Rooftop: the fidelity table in `evidence/quantum-core/transcript.txt`. The rule's choice gives 1;
  on generic states every other choice is lower.
