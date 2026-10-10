# backend-job — report (FINAL, 2026-10-09)

## TL;DR
- **Built** (`lane/quantum/backend-job`, commits `2ba55f1`, `9a09400`): `echo/quantum/qollab_job.py` builds and describes the Bell circuit, reads counts through an explicit clbit←qubit map, and runs the job at most once per run. `echo/tests/test_qollab_job.py` has **32 tests, all passing** (exit 0, `evidence/quantum/backend-job/pytest.log`). All of this is local venv only; **nothing ran on Qollab or IonQ.**
- **Sabotage:** 14 rows, each on a disposable copy. Reversing the bit order turns 6 tests red, swapping the register map 9, removing the guard 2, hardcoding a backend 4. **One null:** S5 (dropping the empty-dict check) stays green because the zero-shot check still catches `{}`; S5+S6 together turn 2 red. Table: `evidence/quantum/backend-job/sabotage-table.txt`.
- **Q1 settled by the docs:** in a JS project `backend` is a **JS global**. Python reaches it only when `main.js` passes it in with **`.callPromising(backend)`**; a plain call on IonQ fails with an XHR `ConnectionError`.
- **Q2 settled:** count keys put clbit 0 on the right. Measured on local BasicSimulator, read in the qiskit-ionq 1.1.1 source, and exercised through its `_build_counts`. **Risk:** Pyodide's `.toJs()` turns a dict into a `Map`, so use `toJs({dict_converter: Object.fromEntries})`.
- **Q3 not settleable off Qollab:** no wasm Qiskit wheel exists on PyPI or in Pyodide. The owner needs to run a ~10 s probe (in the research note).
- **Recommend:** platform adds the memoised `verifySelectedBackendOnce` call site below; the owner runs the probe; the supervisor rules on the two contract additions (`experiment: 'bell_verification'`, `summary`).

## Vault check
- **Read:** `vault/AGENTS.md` (in full, also delivered by the hook), `vault/Index.md`, `vault/Research/qollab-platform-and-submission.md` (§1, §2, §7), `vault/CLAUDE.md`, `lanes/quantum/context.md`, vision §7.5, §8.4–8.6, §10.7, `QOLLAB_DEPLOYMENT.md` (backend lines), the earlier org's `lanes/unlocked/reports/0001-ionq-sim-spike.md`.
- **Already known:** one job per run on IonQ; `backend` is injected; a plain Python call on IonQ fails with XHR (all from the ported platform note). `where.mjs` exits 1 for `interpret_counts`, `run_bell_verification_once`, `build_bell_verification_circuit` and `BackendJobAlreadyUsed`. `qollab_job` appears only in the vision tree.
- **Reused:** the platform note's sources. The spike's conclusion that Qollab supplies the IonQ backend is now confirmed by the docs (python-qiskit-projects § The pre-created backend).
- **Stale or wrong:**
  - The brief points at branch `lane/unlocked/ionq-sim-spike` in `/Users/udsy/PycharmProjects/Qollab-Hackathon`. **That branch no longer exists** there (local or origin, `git branch -a`); I read its report instead.
  - The platform note says the IonQ simulators were labelled "Credits apply" signed out. The compute-backends doc fetched today still says "Free", and its image caption says "Every row is marked Free". The owner question stands.
  - The spike note calls the host Python 3.13. The lane venv is 3.13.0; Qollab is 3.14.

## What I found (each with its source)
Full table: `vault/Research/qollab-backend-from-js-projects.md` (DOC / SOURCE / MEASURED / UNKNOWN).
1. **Where `backend` lives.**
   - It is a JS global in `main.js` and every JS file `main.js` imports. In Python it is a global only in `main.py`, which "pass[es] it as an argument" (https://qollab.xyz/learn/docs/runtime-environment § The backend variable).
   - The documented JS→Python pattern is `bell.run_bell.callPromising(backend, 1000)`, and a plain call on IonQ fails with XHR (https://qollab.xyz/learn/docs/js-qiskit-projects).
   - `backend` is the provider's real object: `BasicSimulator` for the built-in simulator, `IonQProvider`'s backend for IonQ (https://qollab.xyz/learn/docs/python-qiskit-projects).
2. **Counts.**
   - `{bitstring: int}` with the rightmost bit = clbit 0 (MEASURED, `test_basic_simulator_output_reads_the_flipped_qubit`).
   - qiskit-ionq maps IonQ's integer histogram the same way (`qiskit_ionq/ionq_job.py:58-146`, v1.1.1). On IonQ simulators the counts are built on the client from probabilities (sampled, or rounded), **so the total can differ from the shots requested**; the module states that as a fact when it happens.
   - `.toJs()` gives a `Map` by default (https://pyodide.org/en/stable/usage/api/js-api.html, `dict_converter`).
3. **Pyodide Qiskit.**
   - Text drawing works without Visualizations (python-qiskit-projects § Visualizations).
   - `Statevector`, `DensityMatrix`, `partial_trace`, `state_fidelity` and `BasicSimulator` on Qollab are **UNKNOWN**. PyPI qiskit 2.5.2 has no wasm wheel, and the Pyodide 314.0.7 lockfile has no qiskit (measured by `curl`, 2026-10-09), so Qollab ships its own build.

## What I built
- **`echo/quantum/qollab_job.py`**
  - `build_bell_verification_circuit()`: H q0, CX q0→q1, measure q0→c0, q1→c1.
  - `describe_bell_verification_circuit()`: JSON-safe ops and a text drawing, derived from the same circuit.
  - `interpret_counts(raw, backend_name, shots_requested)`: returns an ExperimentResult (`experiment`, `engine='qollab_selected_backend'`, `circuitDescription`, `qubits`, `parameters`, `counts`, `facts`, plus `summary` = shots, correlated, correlatedFraction, qubitOnes). It accepts bitstring or hex keys and a JsProxy. Anything malformed or empty raises `ValueError`.
  - `run_bell_verification_once(backend, shots=256)`: spends the allowance **before** submitting, so a failed job is not retried. A second call raises `BackendJobAlreadyUsed` ("…Restart the run to verify again.").
  - The backend label is whatever the backend reports (`name`, plus `options.noise_model` if it reports one); nothing is hardcoded.
- **Facts (§7.5):**
  - names the backend as it reported itself;
  - "This is a Bell-pair correlation check, not teleportation…";
  - "The agreement carries no message…";
  - "If the selected backend is a simulator, these counts are a simulation…";
  - no "certified random", "instant message" or similar phrases (a test enforces this).
- **`echo/tests/test_qollab_job.py`**, 32 tests:
  - hand-written endianness fixtures, including hex keys;
  - BasicSimulator X(q0) and X(q1);
  - the qiskit-ionq mapping;
  - Bell correlation on BasicSimulator;
  - the hand-expected description;
  - 15 malformed inputs;
  - the guard (second call refused, backend called once; failed first job still spends the allowance);
  - contract fields, honesty, and a grep that the module's code names no backend.
- I did not create `echo/quantum/__init__.py` (a namespace package imports fine), `formats.py` or a conftest, to avoid colliding with the parallel worker.

## Commands and exit codes
- `python -m pytest echo/tests/test_qollab_job.py -q`, **before** the module existed → exit 2 (collection error: module missing). This was the red-first run.
- The same command after → exit 0, 32 passed (`evidence/quantum/backend-job/pytest.log`).
- `zsh evidence/quantum/backend-job/sabotage.sh` → exit 0 (`sabotage-table.txt`).
- `node scripts/vault-hubs.mjs --check` → Research hub and Map STALE (expected; the loop regenerates them, per the worker rules I did not commit hubs).

## Sabotage table (each on a fresh copy of `echo/`; the worktree was never edited)
| # | sabotage | result |
|---|---|---|
| S0 | control, no-op edit | 32 passed (green, as it should be) |
| S1 | read bit order left-to-right (q0 leftmost) | **6 failed**: 3 hand fixtures, both BasicSimulator, IonQ mapping |
| S2 | swap the register map | **9 failed** |
| S3 | remove the once-only guard | **2 failed** |
| S4 | spend the allowance only after success | **1 failed** (failed-job test) |
| S5 | drop the empty-dict check | **NULL, 32 passed.** `{}` still raises at the zero-shot check. S5+S6 together → 2 failed |
| S6 | drop the zero-shot check | **1 failed** (`{"00":0}`) |
| S7 | accept negative, float, bool or str counts | **4 failed** |
| S8 | hex keys with reversed bits | **3 failed** |
| S9 | output keys reversed | **1 failed** |
| S10 | facts claim "Teleportation executed on the selected backend" | **1 failed** |
| S11 | hardcode a BasicSimulator in the runner | **4 failed** (source grep + 3 runner tests) |
| S12 | drop the shots-mismatch fact | **1 failed** |
| S13 | drop the backend name from the facts | **1 failed** |

## Proposal for the platform lane: the exact call site (platform owns `main.js`; I did not edit it)
It could also sit in a quantum-lane JS adapter (`echo/quantum/*.js`), since `backend` is visible in every JS file `main.js` imports. That is for the supervisor to decide with the parallel worker.
```js
import * as qollabJob from 'quantum.qollab_job';

// One job per run on IonQ. Memoise the PROMISE so a second caller gets the same result or
// rejection, never a second backend.run. The Python guard backs this up.
let backendVerification = null;
export function verifySelectedBackendOnce() {
  if (!backendVerification) {
    backendVerification = qollabJob.run_bell_verification_once
      .callPromising(backend)                       // plain call fails on IonQ (XHR), per the docs
      .then((proxy) => {
        const result = proxy.toJs({ dict_converter: Object.fromEntries }); // default is a Map
        proxy.destroy?.();
        return result;
      });
  }
  return backendVerification;
}
```
- Call it **once**, at the final verification step (§8.6 step 3), with "VERIFYING ON SELECTED SIMULATOR" shown while it is pending.
- On rejection, show "Quantum backend verification unavailable; educational circuit validated locally. Restart the run to verify again." Never reach `backend.run` from any other code path; the Python guard cannot see a `backend.run` made directly from JS.

## Not done or not verified
- **Nothing ran on Qollab or IonQ.** I cannot do that; only the owner can.
- Q3 (Pyodide Qiskit API support) is UNKNOWN; the probe is in the research note.
- Not verified:
  - whether `backend` passed from JS arrives in Python as the provider object or as a JsProxy wrapper;
  - whether a failed IonQ job spends the allowance;
  - **whether Python module state survives Stop → Run.** If it does, the once-only flag would wrongly refuse the next run's job. This one matters most; the note says how to test it;
  - which qiskit-ionq version Qollab uses;
  - whether Qollab overrides Pyodide's `toJs` Map default.
- No browser run or screenshot exists: there is no `echo/` app or local runner yet to drive.

## Questions for the owner
1. **Run the probe** in `vault/Research/qollab-backend-from-js-projects.md` § The probe, in a scratch Python project on the Built-in simulator, and paste the console output into `owner-answers.md`. It settles Q3, the backend's reported `name`, and the key format.
2. Once ECHO's verification step exists: on the Built-in simulator, **verify, Stop, Run, verify again**. Is the second run refused? That tells us whether Python state survives Stop.
3. Signed in, do the IonQ remote simulators show "Free" or "Credits apply"? (Carried over from the earlier org; the docs say Free.)
4. Shots for the one job: §10.7 uses 256, which is the module default. Keep 256, or use Qollab's default of 1024? (On IonQ noisy simulators, more shots means a slower job, per compute-backends.)

## What the supervisor should do next
1. **Contract ruling (platform lane):** §8.4's `experiment` union has no value for this job. I used `'bell_verification'` and added a `summary` field (shots, correlated, correlatedFraction, qubitOnes). Either extend the contract, or tell me which existing fields to fold these into. Reconcile onto `formats.py` at merge.
2. **Send the `main.js` proposal above to platform.** The key points are the memoised promise, `.callPromising(backend)` and `dict_converter`.
3. **Forward Questions 1–2 to the owner.** Q2 (state across Stop → Run) can change the guard's design.
4. Merge `lane/quantum/backend-job`. It touches only `echo/quantum/qollab_job.py`, `echo/tests/test_qollab_job.py`, `vault/Research/qollab-backend-from-js-projects.md` and `evidence/quantum/backend-job/`. The Research hub needs regenerating after the merge.
