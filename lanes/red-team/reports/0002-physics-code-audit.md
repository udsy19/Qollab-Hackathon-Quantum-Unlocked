# 0002 physics-code-audit: FINAL

## TL;DR
- **The physics is right.** On `lane/quantum/integration` **a9edce2**, the oracle agrees with the real code on all 12 states (7 named + 5 Haar) × 4 branches × 4 corrections, to 1e-6. It also agrees on cloning, the relay marginal (exact, from `partial_trace`), the deferred check, the withheld bits, and endianness on 512 real sampled shots. Driver: 86 passed, exit 0.
- **Their suite catches the core defects:** swapped X/Z, swapped m0/m1, reversed bitstring, dropped X, dropped Z, a 2nd backend job, a loosened threshold plus dropped Z. They are red in 20 mutations. **Their nulls:** Alice's Bell CX landing on Bob, the sender gate landing on the receiver (both physics-identical, caught only by my new locality tests), the "mistake does not show" fact threshold, and np.int64 counts leaking. Table: `evidence/red-team/physics-code-audit/out/sabotage_product.md`.
- **BLOCKER, integration:** 12 of 13 checks fail (`out/cross_lane_check.txt`, exit 1). Every real quantum result is INVALID under `contracts.js`. Gameplay's `missionRules.js` reads field names the engine never emits, so the quest stalls at CLONE_INTRO. Gameplay's 36 tests are green only because they run on `fakeQuantum.js`.
- **C3 FAIL:** each tree has one `backend.run`. Merged, there are 2 sites with 2 independent guards (`main.js:114`, `qollab_job.py:168`). The ruled `bridge.js`/`verifySelectedBackendOnce` exists on no branch.
- **C4 FAIL:** `live_commit` re-measures the "token" on every call (6/6). There is no story-token state and no random generic dry-run state. Both conflict with owner rulings.
- **Gameplay nulls:** `FIDELITY_OK` 0.999999→0.9, or removing the fidelity check, leaves gameplay's tests green.
- **Recommend:** platform rules on ONE result shape now (contract vs quantum's `kind/details` proposal). Quantum adds a token state, random generic states and `bridge.js`. Gameplay tests against `dump_results.py` output, not the fake. No Qollab or IonQ run is claimed.

## Vault check
- **Read:** `vault/AGENTS.md`, `vault/Index.md` (no prior code audit; laws 3/4/10/15 rows), `vault/Reports/physics-oracle-audit.md` (checklist C0–C9, traps T1–T3, nulls), `lanes/red-team/context.md`, `lanes/red-team/rulings.md`. From the quantum branch: `vault/Reports/quantum-engine-g1.md`, `evidence/quantum-core/sabotage.md` (their 19-mutation round, 3 physics nulls).
- **Already known:** the oracle and its traps. The quantum lane's own nulls (the sender gate on the receiver, the trace of the wrong cloning qubit, the receiver marginal).
- **Reused:** `evidence/red-team/physics-oracle/` unchanged (`physics_oracle.py`, `TEXTBOOK_RULE`, `CountingBackend`, `backend_run_audit.py`). `where.mjs test_product_vs_oracle --branches` returned nothing, so the driver is new.
- **Wrong or stale:** `physics-oracle-audit.md` says "There is no product code to audit yet". That is now superseded by `vault/Reports/physics-code-audit.md`, which I did not edit; the supervisor may mark it. The `lane/quantum/integration` SHA in my brief is still current; `physics-review` 808ccbb adds no `echo/` change.

## What I found (per checklist item)
Full table with file:line: `vault/Reports/physics-code-audit.md`.

| # | verdict | command → exit |
|---|---|---|
| C0 | PASS | oracle pytest → 0 (523); oracle sabotage → 0 |
| C1 rule | PASS | driver → 0; `teleportation.py:29-32`, `missionRules.js:15-18` |
| C2 teleport/cloning/relay | PASS (math); relay "EXACT" UI label UNTESTABLE (no UI) | driver → 0 |
| C3 one job | **FAIL** merged (2 sites, audit exit 1); Python guard PASS | `out/backend_run_audit.txt` |
| C4 token once | **FAIL** quantum (`c4_token_probe.py` exit 1); gameplay one-edge proof PASS | `out/c4_token_probe.txt` |
| C5 endianness | PASS on real sampled counts (oracle parser) | driver |
| C6 labels | PASS for every string that exists; UI UNTESTABLE | grep over 11 branch tips |
| C7 duplication on screen | UNTESTABLE: no scene exists | — |
| C8 m1 wording | PASS: "local Bell-half readout"; no "RELAY READOUT" anywhere | — |
| C9 their tests | PASS (395, exit 0; T1, T2 safe), 7 nulls (4 real) | `out/sabotage_product.md` |
| Pyodide | PASS static: no `qiskit_aer`; all values exact plain types | driver |

### Findings by owning lane

**platform** (contracts)
1. `contracts.js` (6378677, also cf15e81 and faf6be8) rejects every real quantum result.
   - Unknown keys: `kind`, `details`, `circuitText`, `summary`.
   - `keyQubits` is missing.
   - The backend `experiment` is not in `EXPERIMENTS`. The owner ruled `backend_verification` + `keyQubits`, but the contract still lists only 3 experiments (`contracts.js:114`).
   - Input: `out/quantum_results_a9edce2.json`. Expected: `[]` errors. Observed: 3–4 errors each.
2. Two `backend.run` sites exist once merged: `main.js:114` (G0 smoke) and `qollab_job.py:168`. Their guards are independent (`main.js:97` `backendJobUsed`, `qollab_job.py:25` `_job_submitted`). Pressing the G0 verify button and then the game's verify gives 2 jobs, and IonQ stops the run. Before merging, one of them must go, or both must route through one guard.

**quantum**
3. The result shape follows `vault/Design/experiment-result-contract.md` (the quantum lane's own proposal), not `contracts.js`. See 1 for who must reconcile.
4. `teleportation.live_commit` (`:160`) has no once-guard. 6 calls gave 6 fresh measurements: (1,0),(1,1),(0,0),(0,1),(0,1),(0,0). There is no story-token state in `STATES` (`__init__.py:15-23`), against the owner ruling "story token fixed + hidden". `parameters` reports `state`, while gameplay requires `stateId == 'story_token'`.
5. There is no random generic calibration-state generator (owner ruling "random generic dry-run states"). Only the fixed `bloch_a` and `bloch_b` exist.
6. `echo/quantum/bridge.js` with `verifySelectedBackendOnce` (owner ruling) is absent on every branch.
7. The backend `experiment` is `"bell_verification"` (`qollab_job.py:126`); the ruling is `"backend_verification"`.
8. Test gaps:
   - The threshold on the "mistake does not show" fact (`teleportation.py:134`) is untested. At 0.9 it would call a wrong correction scoring 0.913 harmless.
   - The current `int(count)` cast at `qollab_job.py:97` is correct, but no test guards it: removing the cast leaks np.int64 to JS and their suite stays green.
   - Alice's gates are never checked for locality, so CX(q0,q2) is invisible.
   - Fix: copy my three tests in `test_product_vs_oracle.py` (locality ×2, fact band).

**gameplay**
9. `missionRules.js:6-8, 36-57` read `fidelity` (cloning), `probabilities['receiver=0']`, `parameters.stateId`, and `parameters.correctionX/Z`. The real engine emits `details.jointFidelityWithTwoCopies`, `sender=s,receiver=r` keys with `details.receiverMarginal`, `parameters.state`, and `applyX/applyZ`. Observed: CLONE_INTRO → null ("need a basis-state copy that succeeded"). Only RELAY_INTRO advances.
10. Their tests use `dev/gameplay/fakeQuantum.js` (law 4: the fixture comes from the consumer, not the producer). With `FIDELITY_OK` set to 0.9, or the fidelity check removed (`missionRules.js:31`), they stay green.

**story-ui:** no findings. No mission strings exist yet to audit.

## What I changed (commits on `lane/red-team/physics-code-audit`)
- `059d392`: driver, product and gameplay sabotage harnesses, cross-lane check, outputs.
- Final commit: locality and fact-band tests, `c4_token_probe.py`, `vault/Reports/physics-code-audit.md`, this report.
- No product files touched. Every mutation ran on a `mktemp`/`TemporaryDirectory` copy.

## Evidence paths
All are under `evidence/red-team/physics-code-audit/`:
- Scripts: `test_product_vs_oracle.py`, `sabotage_product.py`, `sabotage_gameplay.sh`, `dump_results.py`, `cross_lane_check.mjs`, `c4_token_probe.py`.
- Outputs in `out/`: `c0_baseline.txt`, `product_suite.txt`, `driver_a9edce2.txt`, `driver_no_echo_root.txt` (exit 2 = refusal), `sabotage_product.md`, `sabotage_gameplay.md`, `cross_lane_check.txt`, `quantum_results_a9edce2.json`, `backend_run_audit.txt`, `c4_token_probe.txt`.

## What I did NOT do or could not verify
- No Pyodide, Qollab or IonQ run. Local CPython 3.13 only.
- No runtime JS one-job check: there is no merged playable build, and I did not run the Proxy shim.
- No screenshots (C7): there is no scene.
- The Python→JsProxy kwargs form of `backend.run(..., shots=)` is unverified.
- The 3 remaining nulls are physics-identical, so no output check can catch them, and I did not add structural tests for them.
- I did not sabotage the platform `main.js` guard.

## Questions for the owner
1. Which ExperimentResult shape is law: platform's `contracts.js` (keyQubits, no `details`/`kind`) or quantum's proposal (`kind`, `details`, `circuitText`)? Three lanes currently assume three different shapes.
2. Should the quantum engine itself refuse a second `live_commit` per run (defence in depth), or is the quest edge in gameplay the single owner of "consumed once"?
3. Should the G0 smoke's `backend.run` in `main.js` be deleted once `bridge.js` lands, so only one site ships?

## What the supervisor should do next
1. Send finding 1/9 to platform + quantum + gameplay as ONE contract decision (owner Q1). Until it is settled, nothing passes end to end. The acceptance check is `cross_lane_check.mjs` exit 0 on the real `dump_results.py` output.
2. Quantum: add a story-token state, random generic states, `bridge.js`/`verifySelectedBackendOnce` with the single guard, `experiment: backend_verification`, and the 3 missing tests (findings 4–8).
3. Platform: remove or route the second `backend.run` before the G0 smoke and the game merge. Rerun `backend_run_audit.py` on the merged tree (it must exit 0).
4. Gameplay: replace `fakeQuantum.js` fixtures with real `dump_results.py` output, and add a test where the rule is followed but fidelity < 1.
5. Red-team next: rerun this driver plus `cross_lane_check.mjs` on the integrated `echo/` once it exists, and do C3 runtime and C7 screenshots on our own port.
