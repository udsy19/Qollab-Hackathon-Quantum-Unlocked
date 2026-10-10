## TL;DR
- **DONE in the local runner (not Qollab, not IonQ).** `echo/quantum/bridge.js` is rewired to the hardened API, on `lane/quantum/bridge-rewire` at **2bfc51e**. The engine is hardening tip **4db9aba**, merged; `echo/quantum/*.py` is byte-identical to it.
- Final `round.sh`: **final-1/2/3 exit 0 (81/81 each)**. The `fault` control is green (33/33): the bridge refuses a lying engine loudly. **Head controls are red:** the old bridge scores 48/73 and the pre-hardening Python 37/69. **8 of 9 sabotages are red.** The one null, `bare-toJs`, was predicted. Separately, 3 more greens ran (final-4/5/6, 81/81 each; logs not kept).
- Red-before (law 3): the new checks against the old bridge gave 47/72 (commit 3ed9478, `evidence/quantum/pyodide-bridge/red-before/`).
- `verifySelectedBackendOnce` now **resolves** to a validator-accepted `experiment: "backend_verification"`: 256 shots, keys 00 and 11 only, with exactly 1 Python `backend.run` across verify ×2, RESTART and verify again.
- Screenshot: `renders/bridge-rewire/bridge-rewire-final-3-backend-verification-resolved.png` and `…-fault-engine-lies-refused.png`.
- Evidence: `evidence/quantum/pyodide-bridge/out/SUMMARY.md` and `out/<tag>-{dump,results}.json|log|runner-page.png`. Vault: `vault/Reports/bridge-rewire.md`.
- **Platform must act:** wire `main.js` to the new signatures and call `resetStoryToken()` on RESTART (see the end of this report).

## Vault check
- **Read:** `vault/AGENTS.md`, `vault/Index.md` (no prior bridge-rewire entry; the hits for `resetStoryToken` from `where.mjs --branches` were only my own), `vault/Reports/pyodide-bridge.md`, `echo/CONTRACTS.md` v2 (on `lane/platform/integration`: the two-phase dry run and `backend_verification`), `echo/contracts.js` (validators), `lanes/quantum/context.md`, `lanes/quantum/rulings.md`, `evidence/quantum/pyodide-bridge/{README.md,round.sh,run.sh,assemble.sh,drive.cjs,sabotage.mjs,project/*}`, hardening's `teleportation.py` and `qollab_job.py`, vision §8.4, and gameplay's `dev/gameplay/fakeQuantum.js` (on `gameplay-real-engine-seam`).
- **Already known and reused:** the whole pyodide-bridge harness, extended in place rather than forked; the toJs null; the runner counter's blindness to Python-side jobs; the spy approach.
- **Wrong or stale:**
  - The brief and the base contract name `qollab_job.run_bell_verification_once`. Hardening renamed it **`run_backend_verification_once`**. That rename is why the old bridge rejected: it reached `undefined.callPromising`, not a contract failure on the result.
  - `pyodide-bridge.md` finding 3 is marked superseded.
  - The base branch had no `bridge.js` or harness. I merged `lane/quantum/integration` (bfcfbc3), then hardening.
  - `run.sh`'s busy-port check used `lsof`, which is not on PATH here, so it silently never fired. Replaced with a `/dev/tcp` probe.

## What I changed (commits on lane/quantum/bridge-rewire)
- 3ed9478: harness checks first, plus red-before against the old bridge.
- de3a66c: **the bridge rewire.**
  - `calibrationMeasurement()` calls `bell_measurement("calibration")` and is validated with `validateTeleportBitsResult` (genericity, no fidelity).
  - `teleportDryRun(calibrationResult, X, Z)` builds the request with the contract's `makeCorrectionRequest`. That request carries θ/φ and the bits from the measurement. It calls `teleport_branch("calibration", m0, m1, X, Z, θ, φ)` and validates with `validateTeleportCorrectionResult`, which cross-checks F against the physics.
  - `commitTransfer()` calls `live_commit()` behind the JS latch.
  - New `resetStoryToken()`: it waits for any in-flight commit, calls Python's `reset_story_token`, then clears the JS latch. It does **not** touch the backend memo.
  - `verifySelectedBackendOnce()` calls `run_backend_verification_once` through the same `callEngine`, so there is one validation path, not two.
- cba4fd6, 58c4367, 2bfc51e: harness fixes, the round evidence and the vault report.
  - Fault mode became an assembly flag, because the runner forwards only `?backend=` to the frame. My first round's `fault` row was red for exactly that reason; the spy reported `fault:false`.
  - The spy now tolerates a pre-hardening engine.

## Evidence (final round, `out/SUMMARY.md`)
Runner and contracts: `lane/platform/integration@f08dd0b`. Python: HEAD@173ea46. Old bridge: `lane/quantum/integration@c6558fb`.

| run | expected | exit | checks |
|---|---|---|---|
| final-1/2/3 | 0 | 0/0/0 | 81/81 each |
| fault (lying engine) | 0 | 0 | 33/33 |
| head-old-bridge | 1 | 1 | 48/73 |
| head-old-python | 1 | 1 | 37/69 (every failure a loud ScientificModuleError) |
| sab-no-theta-passthrough | 1 | 1 | Python raises on the missing angles |
| sab-no-latch | 1 | 1 | commit#2 is refused by Python's TokenAlreadyConsumed |
| sab-restart-no-python | 1 | 1 | commit#4 after RESTART is refused |
| sab-no-memo | 1 | 1 | 3 verification entries |
| sab-restart-resets-memo | 1 | 1 | a new promise after RESTART, 2 verification entries |
| sab-plain-call | 1 | 1 | backend.run never completes |
| sab-no-toJs | 1 | 1 | a PyProxy is rejected |
| sab-swallow-validator (on fault) | 1 | 1 | F=1 lies and `bell_verification` are delivered |
| **sab-bare-toJs** | 1 | **0: NULL** | predicted: Pyodide 314.0.7's bare `toJs()` already returns plain Objects |

**Timings** (final-1/2/3): main.js body at 4.8, 7.6 and 7.5 s; median adapter call 1.7 to 5.1 ms; verify 5.5 to 11.3 ms. Every run needed 2 calibration draws. Check counts differ by run (81 or 83) because a third draw adds one re-validation check.

The repo's Python tests: `pytest echo/tests`, 595 passed.

## Nulls and what was NOT verified
- **Null:** `bare-toJs`, as above.
- `swallow-validator` on the *conformant* path would also be a null, because every result is valid there. That is why it runs on `fault`.
- With the JS memo or latch removed, the **backend.run count stays 1** and the token is never re-teleported: Python's guards hold. The sabotages are red because calls reject; the guards themselves never let a second job or commit through. That is defence in depth, not a gap.
- **`tools/contract-check/check.mjs` cannot grade engine dumps.** It grades `echo/contracts.js` against vision §9 and has no input for results. Instead, every delivered result is re-validated in Node from the contract bytes, and the physics is re-derived from closed forms in `drive.cjs`.
- Not run on Qollab or IonQ. No real IonQ network path; `ionq-mock` is BasicSimulator plus a JSPI-stack requirement.
- Not tested through `main.js` or the game. The harness replaces `main.js` in a disposable copy.
- The two-calls-in-flight case of `resetStoryToken` during a pending commit is coded (it awaits the commit) but not exercised by a check.

## Decisions inferred from the docs
- **Python draws the calibration state, not JS** (brief; hardening's `bell_measurement` draws when no angles are given). CONTRACTS.md's table says "JS sends {theta, phi}" from `randomGenericState()`. The bridge takes the angles from the phase-1 result and validates that result with the contract's own `validateTeleportBitsResult`, including genericity. So the contract's checks all still apply, but the bits validator's angle-equality check is trivially true. Platform may want CONTRACTS.md to say "phase-1 request = the angles the engine reports".
- **`teleportDryRun(calibrationResult, correctionX, correctionZ)`** takes the phase-1 result itself, not a state id and bits (CONTRACTS.md: "Never type the bits in by hand"; `makeCorrectionRequest`). This departs from vision §8.4's `teleportDryRun(stateId, X, Z)`, which predates the two-phase ruling.
- **"The second commitTransfer is refused"** is implemented as: the second call returns the same recorded result (owner ruling: "latched once recorded"), and Python itself refuses a second `live_commit`. It is not implemented as a JS rejection.
- **The RESTART hook is named `resetStoryToken()`**, after Python's `reset_story_token`. It resets the token only, never the backend job (vision §10.7; brief).

## Requests for platform (and gameplay)
1. **`echo/main.js` wiring:**
   - Import `echo/quantum/bridge.js`.
   - Call `calibrationMeasurement()` with no arguments.
   - Pass its *result* to `teleportDryRun(result, X, Z)`.
   - Call `commitTransfer()` with no arguments.
   - Call `await resetStoryToken()` from the ending screen's RESTART (`UI_HOOKS.onRestart`).
   - Grade with `dryRunVerdict(makeCorrectionRequest({theta, phi} of the result, result, choice), dryRunResult)`.
2. **Gameplay's `fakeQuantum.js` (gameplay-real-engine-seam) has diverged.** It uses `teleportDryRun(X, Z, bits, angles)` and `commitStoryToken()`, and has no phase-1 call. The swap to the real bridge needs either gameplay to adopt these names or a platform adapter. That decision belongs to platform.
3. **The runner's `backend.run calls` counter cannot see Python-side jobs** (it reads 0; the spy shows 1). The runner also forwards no URL flags to the frame. Platform could count below the Proxy, for example by patching `BasicSimulator.run` in the runtime preamble.

## Next for the supervisor
Re-run `PB_PORT=<free port> bash evidence/quantum/pyodide-bridge/round.sh` on a detached worktree of 2bfc51e. Expect final-1/2/3 at exit 0, fault at 0, heads at 1, sabotages at 1, and bare-toJs as a NULL. Then merge `lane/quantum/bridge-rewire` into `lane/quantum/integration` and relay requests 1–3 to platform and gameplay.
