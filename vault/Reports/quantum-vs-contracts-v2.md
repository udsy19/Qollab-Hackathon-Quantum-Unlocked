---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---

# Quantum engine and bridge.js vs contracts v2 and the platform gates

The merged tree is `lane/quantum/main-sync` @ ab2ea6f, which is `main` 99dfc54 (contracts v2 80d685f) merged
into `lane/quantum/integration`. Everything ran locally (Python 3.13, qiskit 2.5.2, Node). **Not run in
Pyodide or on Qollab.** Evidence: `evidence/quantum/main-sync/` (README names each file).

## What the two gates can and cannot see

- `tools/contract-check/check.mjs` grades **echo/contracts.js only**, against the vision. It never
  runs the engine or bridge.js. It is GREEN (1087/1087) on this tree, and it goes RED on a planted X/Z
  swap. **It measures nothing about quantum's output.** Engine conformance was therefore measured by running engine output
  through contracts.js's own validators (`validateExperimentResult`, `validateTeleportBitsResult`,
  `validateTeleportCorrectionResult`).
- `tools/qollab-caps/check.mjs` is RED with 6 findings. A disposable copy with exactly those 6 removed goes
  GREEN, so the list below is the full red set on this tree.

## Gap table (merged tree ab2ea6f)

| # | where | rule broken | owner | fixed on quantum-hardening (0893403 / 2ac6c6c)? |
|---|---|---|---|---|
| 1 | `echo/index.html` (absent) | qollab-caps `entry-index` | platform (main.js/index.html not on main) | no — not quantum's |
| 2 | `echo/main.js` (absent) | qollab-caps `entry-main` | platform | no |
| 3 | `echo/quantum/qollab_job.py:168` | qollab-caps `backend-run-python`; owner ruling: one guarded `backend.run` site, in bridge.js | bridge rewire (bridge.js + quantum .py) | no — still at `qollab_job.py:169` |
| 4 | `echo/tests/test_qollab_job.py:91` | qollab-caps `hardcoded-backend` (`qiskit_ionq.ionq_job` import) | quantum tests | no |
| 5 | `echo/tests/test_qollab_job.py:207` | qollab-caps `hardcoded-backend` + `hardcoded-secret` (forbidden-pattern list `"ionq_simulator"`, `"api_key\|token"`) | quantum tests | no |
| 6 | `qollab_job.py:131` `experiment="bell_verification"` (3 of 181 bridge calls) | `validateExperimentResult`: experiment union and engine rule | quantum .py | **yes** (`backend_verification`, 0/233 rejected) |
| 7 | `qollab_job.py` `interpret_counts(..., shots_requested=None or ≠256)` | v2 `parameters.shots must be 256` | quantum .py (or the bridge always passes 256) | **no** — hardening dropped the 300 case from its enumeration; the engine still emits 255 or 300 |
| 8 | `teleportation.py:125/141`: no `{theta, phi}` entry point; `parameters` carry `state` and not `theta/phi` (35/35 dry-run results rejected) | v2 `validateTeleportBitsResult` / `validateTeleportCorrectionResult` | quantum .py | **yes** (35/35 accepted). With theta/phi injected, the merged engine's fidelities already pass v2's cross-check. |
| 9 | `bridge.js:68` `calibrationMeasurement(stateId)`, `:71` `teleportDryRun(stateId, X, Z, bits)` | CONTRACTS.md § two phases: JS sends `{theta, phi}`, builds phase 2 with `makeCorrectionRequest`, and grades each phase with its own validator; the bridge only calls `validateExperimentResult` | bridge.js | no — hardening has no bridge.js |
| 10 | `bridge.js:105` calls `qollabJob.run_bell_verification_once` | renamed on hardening → `run_backend_verification_once`; the call would be undefined after that merge | bridge.js | the rename is there; bridge.js must follow it |
| 11 | `bridge.js:83` `teleportation.live_commit(stateId)` | hardening's `live_commit(seed=None, rng=None)`: stateId would land in `seed` | bridge.js | the signature changes there; bridge.js must follow it |

Rows 10–11 come from reading the signatures (`git show 2ac6c6c:…`). They were not executed.

## Nulls and limits

- contract-check's own sabotage reports 6 declared nulls. Two of them are on the dry-run verdict
  (rule-only and threshold-only sabotage are not caught).
- The 181/233-call sweeps enumerate inputs from each branch's own `conftest.bridge_calls()`. That is a
  producer-chosen list (gate-independence law 8), and row 7 is exactly what it hid. The probes in
  `probe_shots.py` and `dump_teleport_v2.py` exist to cover that gap.
- `echo/` on disk gains `__pycache__/` after pytest runs (31 files vs 17 in git). The cap is 100, but
  the upload must exclude them.
