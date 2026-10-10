---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: quantum (ionq-sim-rehearsal)
tags:
  - ionq
  - backend
  - qiskit-ionq
---

# IonQ simulator rehearsal of the one selected-backend job (off Qollab)

**No IonQ job ran.** The owner's key file `~/.config/echo/ionq.env` is absent on this host, so the IonQ step stopped
under the owner's ruling. What exists is a harness that runs the live rehearsal in one command once the file is
there, and a keyless replay of qiskit-ionq's real client path that was exercised on **SYNTHETIC** histograms.
Evidence: `evidence/quantum/ionq-sim-rehearsal/` (README has every command and its exit code). qiskit-ionq 1.1.1,
qiskit 2.5.2, Python 3.13.0. `echo/quantum/qollab_job.py` was used unedited (d9b42d0).

## What the replay proves, and what it does not

The replay patches only qiskit-ionq's three HTTP methods. Everything between the wire and the game runs for real:
the `meas_mapped` header that qiskit-ionq serialises and IonQ echoes back, `_format_result`, `_build_counts`,
`get_counts`, `run_bell_verification_once` and `interpret_counts`.

| check (synthetic histograms) | result |
|---|---|
| control X(q0), histogram `{"1":1.0}` → raw key `01` → parsed key `01` with keyQubits `[1,0]` → decodes to q0=1, q1=0 | pass |
| Bell ideal `{"0":.5,"3":.5}` → 256 counts, 256/256 correlated | pass |
| Bell "aria-1" `{"0":.49,"3":.47,"1":.02,"2":.02}` → **255 counts for 256 requested**, 245/255 = 0.961 | pass; drift reported as a fact; platform validator still accepts (`parameters.shots` is the request) |
| second verification in the same run | refused, 0 new submits |

**Not proved:** that IonQ's server puts qubit *i* at bit *i* of its histogram index. The synthetic fixture encodes that
assumption. Sabotage S5 shows the control catches the opposite convention (`{"2":1.0}` → red on both control checks),
so the first live control run settles it.

## Sabotage (disposable copies), 6 red, 4 predicted nulls
- Red: parser reads clbit 0 from the left (S1); clbit←qubit map swapped (S2); once-flag never set (S4, 2 FAIL);
  MSB-first server histogram (S5); noisy run with no 01/10 (S6); ideal run leaking into 01 (S7).
- **Nulls:** S1b: the key reversal on the **Bell** run is invisible, because 00/11 are symmetric. Only the asymmetric
  control sees it. S3: `KEY_QUBITS` flipped is self-consistent, because the result declares it. S8: a missing
  `qiskit_header` falls back to the identity map, which is this circuit's map. S0: no-op control.

## Findings for other notes
1. On noisy IonQ simulators, qiskit-ionq 1.1.1 builds counts as `round(p × shots)`, so the total can be 255 or 257.
   The game panel must show the returned total, not assume 256. `interpret_counts` already adds a fact.
2. On the ideal simulator, counts are re-sampled client-side with seed `None`. A replay therefore reproduces the
   probabilities, not the counts.
3. `_backend_label` reads `ionq_simulator (noise model ideal)` on qiskit-ionq 1.1.1, because `noise_model` defaults to
   `"ideal"` in the options. The name Qollab's IonQ backend reports is still unknown
   ([[qollab-backend-from-js-projects]]).
4. Validator (platform `lane/platform/integration` 43be7d9): all 4 results are rejected **only** on
   `experiment "bell_verification"`. With that field patched to `backend_verification` on a copy, 0/4 are rejected. The
   rename quantum-hardening is doing is the whole gap ([[pyodide-bridge]] finding 3).

## Related
[[qollab-backend-from-js-projects]] · [[pyodide-bridge]] · [[quantum-physics-review]] · [[contract-conformance]]
