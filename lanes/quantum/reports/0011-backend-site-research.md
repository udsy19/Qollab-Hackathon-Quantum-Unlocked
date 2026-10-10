# 0011 backend-site-research: where the ONE `backend.run` lives (final, 00:55 ET)

## TL;DR
- **Recommend Option A: JS submits the job in `bridge.js`.** Python only builds the circuit (`build_backend_verification_circuit`) and reads the counts (new `interpret_backend_counts`). This meets the ruling literally ("exactly one guarded backend.run site (echo/quantum/bridge.js)"; owner-answers line 84 (e) "delete the Python-side backend.run site"), so no exemption is needed.
- (a) **Yes, JS can submit a circuit built in Python, as a PyProxy `QuantumCircuit`.** It is the same type `import { QuantumCircuit } from 'qiskit'` gives in JS. Qollab's runtime `ft()` forwards `backend.run(c, {shots})` as `run.callPromisingKwargs(c, {shots})`. QASM is not needed. `job.result()` → `.get_counts()` returns a PyProxy dict, which goes straight back into Python.
- (b) **Yes, the runner mock supports it.** Its `wrapBackend` mirrors `ft()`, and its counter sees only the JS route.
- **Qollab's real one-job check is NOT on the JS proxy.** It sits in the frame's `fetch` override (`rewriteIonqRequest`), which refuses a second `POST jobs`. So on IonQ it counts a job from either language. Option B therefore gains nothing on Qollab, and it keeps the job invisible to our gate.
- **Local runner proof (ionq-mock, not Qollab or IonQ), `evidence/quantum/backend-site-research/out/SUMMARY.md`:**
  - A ×3: runner JS counter **1**, Python spy **1**, 14/14 checks each.
  - X-on-q0 control: raw `{"01":256}` (clbit 0 on the right); delivered counts decode to q0=1, q1=0.
  - Today's route (B): counter **0** and spy 1.
  - 3 sabotages red, 1 predicted null.
- **Caps gate:** HEAD is red only on `backend-run-python`; the proposed tree is **GREEN** (`out/caps.log`). pytest: proposed tests 594 passed; the sabotage is red (`out/pytest.log`).
- **Images:** `renders/backend-site-research/1-today-python-route-runner-counter-0.png`, `2-optionA-js-submits-counter-1.png`, `3-optionA-control-x-q0-decodes-q0-1.png`.
- **Next:** bridge-rewire (or whoever owns bridge.js) applies the 4 diffs below, and platform deletes its inline `backend.run` in `main.js:199` and calls `verifySelectedBackendOnce()`. Until it does, caps reports `backend-run-count` 2 of 2.

## Vault check
- **Read:**
  - `vault/AGENTS.md`, `vault/Index.md`
  - `vault/Research/qollab-backend-from-js-projects.md`, `vault/Research/qollab-platform-and-submission.md` (via lane context)
  - `vault/Reports/pyodide-bridge.md`, `vault/Reports/ionq-sim-rehearsal.md`, `vault/Reports/qollab-caps-gate.md`
  - platform's `vault/Research/qollab-js-runtime-internals.md` (`lane/platform/integration`)
  - `evidence/qollab/README.md` and the G0 verify screenshot
  - `lanes/quantum/owner-answers.md`
- **Already known:**
  - The runner's counter reads 0 for a job submitted from Python (pyodide-bridge finding 2).
  - `ft()` maps `run` to `callPromisingKwargs`, and the IonQ one-job refusal is in `rewriteIonqRequest` (runtime-internals, 2026-10-09).
  - The owner/overseer ruling already says to delete the Python-side site.
- **Reused:**
  - the pyodide-bridge harness pattern (`git archive` disposable copy, build token, spy below the bridge);
  - platform's runner (`lane/platform/integration` f08dd0b);
  - the existing `interpret_counts` and `_backend_label`, unchanged.
- **Wrong or stale:**
  - [[qollab-backend-from-js-projects]] "What this settles", first bullet. Marked outdated with a callout, not rewritten.
  - Platform's `echo/main.js:183` comment says "Qollab's job accounting … sit[s] on the JS backend proxy". The shipped runtime shows it sits on `fetch`.
  - Platform's `main.js:198` calls `qollabJob.build_bell_verification_circuit`, which no longer exists after the rename. Its Verify button would fail.
  - `echo/quantum/bridge.js` on c6558fb called `run_bell_verification_once`, which does not exist. That is already fixed by bridge-rewire, merged into integration in consult 13.

## What I found (citations)
Full table: `vault/Research/backend-run-site.md`.

| claim | source |
|---|---|
| "In JavaScript … `await backend.run(circuit, { shots })` returns a job, and `await job.result()` gives the result." | DOC runtime-environment § The backend variable |
| JS circuits are Python objects: "Import from `qiskit` … `const circuit = QuantumCircuit(2, 2)`" | DOC js-qiskit-projects |
| `ft=function(e){return new Proxy(e,{get(…){… t==='run' ? async function(...e){let t=await r.callPromisingKwargs(...e); …}` | RT `jsworker-C6a5_czr.js` (still served 2026-10-10, sha256 `9c0cf281…`) |
| `self.fetch=async function(e,t){… jt(n,r,i) …}`. On a second `POST jobs`: `throw Error('The code has already filed one circuit execution job; only one job is allowed per code run')` | RT `rewriteIonqRequest` |
| A plain Python call on IonQ fails with an XHR `ConnectionError` | DOC js-qiskit-projects. Option A never makes a plain call: every Python entry is `callPromising`, and the run itself enters through `callPromisingKwargs` |

## Runner round (merged HEAD dd289c4, runner `lane/platform/integration` f08dd0b, harnessDirty false ×10)

| tag | predicted | exit | runner JS counter | Python spy | failing checks |
|---|---|---|---|---|---|
| A-1, A-2, A-3 | green | 0 | 1 | 1 | none |
| A-control (X on q0) | green | 0 | 1 | 1 | none |
| B-baseline, B-baseline-control | red | 1 | **0** | 1 | runner counter only (the job is invisible to it) |
| sab-no-memo | red | 1 | 2 (1 refused) | 1 | counter, refusal, same-promise |
| sab-python-also-runs | red | 1 | 1 | **2** | Python spy. The runner alone would have passed it |
| sab-parse-left-control | red | 1 | 1 | 1 | decode q0=1 |
| **sab-parse-left-bell** | **null** | 0 | 1 | 1 | **none (predicted: 00/11 are symmetric; only the asymmetric control catches a bit-order reversal)** |

The independence of the inputs:
- The job count comes from two places that do not trust each other: the runner's own `window.__runner.jobs`, which the project cannot write, and a Python wrapper on `BasicSimulator.run`.
- Bit order is decoded in Node from the raw key strings the spy captured before `qollab_job` touched them, and separately from the delivered `keyQubits`.

## The exact diffs proposed (not committed to `echo/`)
Files: `evidence/quantum/backend-site-research/{bridge,qollab_job,test_qollab_job,conftest}.diff`. Full files: `proposed/`. The bases are integration's current bridge.js, qollab_job.py and tests, all byte-identical to HEAD after the merge.

**bridge.js** (replaces the `verifySelectedBackendOnce` block):
```js
const UNAVAILABLE = 'Quantum backend verification unavailable; educational circuit validated locally';
let verification = null;
export function verifySelectedBackendOnce() {
  if (!verification) verification = submitOnce();
  return verification;
}

async function submitOnce() {
  const shots = qollabJob.DEFAULT_SHOTS;
  let counts;
  try {
    const circuit = await qollabJob.build_backend_verification_circuit.callPromising();
    const job = await backend.run(circuit, { shots });
    circuit.destroy();
    const result = await job.result();
    counts = result.get_counts();
    result.destroy();
  } catch (err) {
    throw new ScientificModuleError(UNAVAILABLE, [lastLine(err)], err);
  }
  try {
    return await callEngine(UNAVAILABLE, qollabJob.interpret_backend_counts, [counts, backend, shots]);
  } finally {
    counts.destroy();
  }
}
```
It also adds a header comment naming this as the only `backend.run`, and noting that Qollab's real check is network-level.

**qollab_job.py:**
- Delete `_job_submitted`, `BackendJobAlreadyUsed` and `run_backend_verification_once`. That removes the `backend.run` at line 169.
- Add:
  ```python
  def interpret_backend_counts(raw_counts, backend, shots_requested=DEFAULT_SHOTS):
      """Counts of the job bridge.js submitted -> ExperimentResult. Reads the backend's name; never runs it."""
      return interpret_counts(raw_counts, _backend_label(backend), shots_requested=shots_requested)
  ```
- Update the docstring: "builds the one circuit … reads its counts; it never submits".

**Tests (quantum-owned):**
- `test_qollab_job.py`: the 3 once-guard tests and the `job_module` fixture go. Two tests come in: `test_python_never_submits_a_job`, an AST scan finding no `.run(` call in qollab_job.py, and `test_counts_of_the_submitted_circuit_name_the_backend_and_follow_the_contract`. The `FakeBackend.run` now raises.
- `conftest.py`: the `once` case becomes `interpret_backend_counts(<FakeSelectedBackend job counts>)`, so `BRIDGE_CALL_COUNT` is unchanged.
- Measured: proposed 594 passed. A Python `backend.run` sabotage makes 2 FAILED. HEAD's own tests against the proposed module give 246 failed, which is expected: they call the removed guard.

## Evidence paths
- `evidence/quantum/backend-site-research/out/SUMMARY.md`, plus `*-dump.json`, `*-runner-page.png`, `*-assembly.json` and `*.log` per run
- `evidence/quantum/backend-site-research/out/caps.log`, `out/pytest.log`
- `vault/Research/backend-run-site.md`
- renders: `/Users/udsy/agent-org/lanes/quantum/renders/backend-site-research/{1,2,3}-*.png`

## What I did NOT do or could not verify
- **No Qollab or IonQ run.** The network-level guard comes from reading shipped JS. I did not observe it firing. I could not confirm that the live site still loads `jsworker-C6a5_czr.js`: the page is a client-rendered shell. The chunk still serves 200 with the same function names.
- The runner's ionq-mock is a BasicSimulator with a counter. The `run_sync` check in the spy emulates the callPromising requirement. It is not qiskit-ionq HTTP.
- Unresolved for both routes: whether a click that comes after `Done.` reaches Python on Qollab (`evidence/qollab/g0-builtin-verify-no-response-2026-10-10.jpg`).
- I did not commit any `echo/` change (bridge-rewire owns bridge.js). I regenerated hubs and the Index to check linkage: `vault-reachability` PASSES with the note linked. I did not commit the generated files, per the worker rules: the loop regenerates them after MERGE.
- In the control run, `circuitDescription` and facts still say "Bell pair", because `interpret_counts` hardcodes them. This is a harness-only swap and not a product issue.

## Decisions inferred from the docs
- **Shots come from `qollab_job.DEFAULT_SHOTS` (256), not `contracts.js` `BACKEND_SHOTS`.** Both are 256 (owner ruling #9). DEFAULT_SHOTS is what the quantum tests pin. One of the two should eventually go (no-bloat): supervisor's call.
- **The guard is a single JS memo; Python keeps no once-flag.** Source: owner-answers line 80 ("delete the Python-side once-guard … the ONE guarded site is echo/quantum/bridge.js").
- **`backend` is still passed into Python, read-only, for `_backend_label`** (name plus noise model). CLAUDE.md: use the injected backend, never name one. The caps rule targets `backend.run` in `.py`, not reading attributes.

## What the supervisor should do next
1. Rule A, citing `vault/Research/backend-run-site.md`. Have the bridge.js owner apply `evidence/quantum/backend-site-research/{bridge,qollab_job,test_qollab_job,conftest}.diff`. The proposed files are byte-ready in `proposed/`. Then re-run `bash evidence/quantum/backend-site-research/round.sh`, which expects counter 1, spy 1 and the control decoding to q0=1.
2. **Request to platform**, through `owner-answers.md`:
   - In `echo/main.js`, replace the inline `verifyOnBackend` job (lines ~187–215: `build_bell_verification_circuit`, which is already broken, plus its own `backend.run`) with `await verifySelectedBackendOnce()` from `./quantum/bridge.js`. Otherwise caps reports `backend-run-count` 2 of 2 (`out/caps.log`, last block).
   - Correct the `main.js:183` comment: Qollab's IonQ job check is on `fetch` (`rewriteIonqRequest`), not on the JS proxy.
   - No caps exemption is needed.
3. Optional: ask the overseer for one Built-in run of the merged build, and later one free IonQ-simulator run. That would confirm the JS route end to end on Qollab (screenshot plus console, recorded in owner-answers).
