---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---

# The bridge on the hardened engine (local runner)

Measured: `echo/quantum/bridge.js`, rewired to the quantum-hardening API, driven by the pyodide-bridge harness in platform's **local Qollab-like runner** (`lane/platform/integration` f08dd0b, Pyodide 314.0.7, Python 3.14.2, Qiskit 2.5.2 wasm, headless Chrome). Python came from `lane/quantum/bridge-rewire` 173ea46, which is hardening tip 4db9aba merged in; its `echo/quantum/*.py` is byte-identical to that tip. **Local runner, not Qollab or IonQ.** Evidence: `evidence/quantum/pyodide-bridge/out/SUMMARY.md`.

## What the bridge now does (and the check that proves each)

| behaviour | check (drive.cjs, re-derived in Node) | sabotage that turns it red |
|---|---|---|
| `calibrationMeasurement()`: Python draws a fresh generic state each time | the draws differ; max Bloch component² ≤ 0.9, re-derived from θ, φ | none needed (the head-old-python control is red) |
| `teleportDryRun(calibration, X, Z)` carries θ/φ and the bits from the measurement result into `teleport_branch` | the θ/φ round-trip is exact; the spy sees Python receive them; F matches the closed form ±1e-6 | `no-theta-passthrough` (Python raises, red 60/77) |
| a wrong X/Z on a non-00 branch | F < 0.999999 (observed 0.055 to 0.68) | `fault` with `swallow-validator`: the lie is delivered, red |
| the bridge refuses an engine that claims F = 1 on a wrong choice | `fault` scenario: ScientificModuleError, "disagrees with the physics" | `swallow-validator` |
| `commitTransfer()` teleports the hidden token once | 2nd and 3rd calls return the same recorded object; Python's own 2nd `live_commit` raises TokenAlreadyConsumed | `no-latch` (Python refuses; commit#2 rejects) |
| `resetStoryToken()` (RESTART) re-arms the token | commit#4 succeeds as a new result; the spy counts 2 commits and 1 reset | `restart-no-python` |
| one backend job per run, RESTART included | 1 Python `backend.run`; verify ×2 and after RESTART return the same promise | `no-memo`, `restart-resets-memo`, `plain-call` |
| `verifySelectedBackendOnce` **resolves** | `experiment "backend_verification"`, re-validated in Node, 256 shots, keys 00 and 11 only | `fault` (the old name `bell_verification` is rejected loudly) |

## Findings

1. **The selected-backend job now resolves.** Its function was renamed `run_bell_verification_once` → `run_backend_verification_once` in hardening. The old bridge reached for the old name, got `undefined`, and rejected with "Cannot read properties of undefined (reading 'callPromising')". That is a loud rejection, but it never verified anything.
2. **Python's guards are a second wall.** With the JS memo removed (`no-memo`, `restart-resets-memo`), the spy still counts only **1** `backend.run`: `qollab_job` refuses the 2nd and 3rd entries. Likewise, with the JS commit latch removed, Python refuses the second commit. Both sabotages are still red, because the bridge then rejects calls that the game expects to resolve.
3. **The runner forwards only `?backend=` to the project frame.** A harness flag in the page URL never reaches Python, so `fault` mode is set when the copy is assembled (`assemble.sh --fault`). The spy reports the mode, and the drive checks it against the scenario.
4. **Null, predicted:** `bare-toJs` stays green on Pyodide 314.0.7, as [[pyodide-bridge]] finding 1 measured.
5. The runner's JS-side `backend.run calls` counter still reads 0, because the job is submitted from Python ([[pyodide-bridge]] finding 2). Only `pb_spy.py` sees it.

## Related
- [[pyodide-bridge]], [[quantum-hardening]], [[contract-conformance]], [[qollab-backend-from-js-projects]]
