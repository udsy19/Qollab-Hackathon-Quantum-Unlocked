I re-ran physics-review's derivation myself on a disposable worktree and it reproduced: 81 checks OK, worst difference 4.99e-11, exit 0, and the merge into integration is clean. contract-conformance is still running, so I am merging physics-review and sending one new worker into the free slot.

=== PLAN ===
**Lane goal (G1, due Sat 2026-10-10 04:00 ET, plan row 4).** Build `echo/quantum/{__init__,cloning,entanglement,teleportation,formats,qollab_job}.py` plus `echo/quantum/bridge.js`, the JS adapter (owner ruling 10). Each returns JSON-safe results that pass platform's `validateExperimentResult`. Tests in `echo/tests/` follow vision §7 and §10.3–10.7. Everything must be proven running in Pyodide through the local runner, and on Qollab by the overseer.

**Done**
- **backend-job** (consult 2): `qollab_job.py`, 32 tests, and the research note on reaching `backend` from JS.
- **quantum-core** (consult 3): the engine, 363 tests passing, and sabotage 16/19 red.
- **physics-review** (judged this consult, MERGE): evidence plus `vault/Reports/quantum-physics-review.md`.
  - I re-ran `derive.py` myself: 81 OK, worst 4.99e-11, exit 0. Merge-tree is clean, and the branch touches only `evidence/physics-review/` and `vault/Reports/`.
  - All 3 nulls from quantum-core are proven to be physics.
  - It found 4 real test gaps and two wording defects (its findings 1–6).
- **Owner rulings now in force** for this lane:
  - dry runs use random generic Bloch states;
  - the story token is a fixed, hidden generic point;
  - the generic state is `ry(1.137)` then `rz(0.44)`;
  - 256 shots;
  - the selected-backend job is `experiment: "backend_verification"`;
  - m1 is labelled "LOCAL BELL-HALF READOUT m1";
  - the dry run produces the bits first and takes the corrections second;
  - Mission 2 shows exact `partial_trace` probabilities only;
  - `bridge.js` is quantum-owned.
- On Qollab: Pyodide py3.14.2 with Qiskit 2.5.2 works for every API we use, and the interpreter is fresh on each Run.

**Running**
1. **contract-conformance**: at checkpoint, 171 of 174 results are accepted by platform's real validator. The 3 rejected are `bell_verification`, and the owner has since ruled `backend_verification`. Its final report and commit are pending.
2. **pyodide-bridge** (dispatched now): builds `echo/quantum/bridge.js` (`verifySelectedBackendOnce` and the Python call adapters). It must prove in platform's local Pyodide runner that every bridge call returns a validated ExperimentResult. It touches no `.py` files, to avoid conflicts with contract-conformance.

**Next (once contract-conformance lands)**
- Dispatch **quantum-hardening**, a builder working test-first, each fix watched red against its mutation in `evidence/physics-review/sabotage.py`:
  - physics-review findings 1, 3, 4, 5, 6;
  - finding 2 (my decision below: `live_commit` refuses a second commit in the same run);
  - the owner rulings: a random generic calibration state per dry run; a fixed hidden `token` state; the `ry(1.137)`/`rz(0.44)` generic state; the bits-first dry-run API; the m1 label in facts; `backend_verification`; Mission 2 EXACT probabilities only.
- Then propose row 4 done, with the conformance, Pyodide-runner and review evidence.

**Decision (autonomous, cited):** the engine enforces "consumed once". `live_commit` gets a module guard, the same pattern as `run_bell_verification_once`, and refuses a second call within one interpreter run. The quest state machine also calls it once.
- **Basis:** CLAUDE.md says "The story token is consumed ONCE at final commit" and vision §7.4/§7.5 forbid reusing the measured unknown state. Defence in depth costs one flag.
- **Why per-run is safe:** the interpreter is fresh on every Run (owner-answers, 2026-10-10), so the guard resets exactly when the story does.
- **RESTART inside a run:** gameplay's RESTART on the ending screen happens within the same run. The engine therefore exposes `reset_story_token()`, which only the RESTART path calls. That path re-prepares a new story run; it never reuses the consumed token.

**Risks**
- `backend_verification` is not yet in platform's `EXPERIMENTS` (checked on `lane/platform/integration` @ 6378677). Platform must add it, as the owner ruled.
- Platform's local runner is on `lane/platform/g0-runner-smoke` and not yet merged into platform integration.
- Nothing quantum has run in the JS-project path on Qollab yet: `.callPromising` and `toJs` are unverified.
- contract-conformance and quantum-hardening touch the same files, so they must run one after the other.
- G1 is due at 04:00 ET. Lane memory records "2026-10-10", so check how far past 04:00 ET we are against the real clock.
=== END PLAN ===

=== MERGE branch=lane/quantum/physics-review ===

=== AGENT name=pyodide-bridge model=opus base=lane/quantum/integration ===
**GOAL.** When the game calls quantum physics, it gets a real, validated answer computed by our Qiskit code running in Pyodide in the browser. The one selected-backend Bell verification happens at most once per run. Today our engine has only ever run under CPython 3.13 in pytest. Nobody has watched it run in a browser.

**VISION.** ECHO is a Qollab-native Three.js game, and every puzzle is driven by real local Qiskit (CLAUDE.md "Truthful quantum"; vision §7, §8.4–8.6, §10.7). Judges run it in their own browser on Qollab: Pyodide Python 3.14 with Qiskit 2.5.2, confirmed by the overseer's probe.

**WHAT WE ARE BUILDING.** `echo/quantum/bridge.js`. The owner ruled that it is owned by the quantum lane and imported by platform's `main.js` (owner-answers 2026-10-10, "13 lane design questions" item 10). It holds:
1. `verifySelectedBackendOnce(...)`:
   - a memoised promise;
   - Python reached through `.callPromising(backend)`, because a plain call fails on IonQ with an XHR ConnectionError;
   - results converted with `.toJs({dict_converter: Object.fromEntries})`, because a bare `toJs` gives a Map;
   - the proxy destroyed afterwards;
   - an honest fallback message on rejection.

   Start from the sketch in `reports/0001-backend-job.md` and `vault/Research/qollab-backend-from-js-projects.md`.
2. Thin, named JS adapters, one per engine entry point the game needs: cloning test, relay/no-signalling, teleport dry run, live commit and calibration. Each returns a plain object and runs it through platform's `validateExperimentResult` (`echo/contracts.js`) before handing it on. A rejected result is a loud error, never silently passed through.

**First check whether platform's `main.js` already wraps any of these** (`node scripts/where.mjs <name> --branches`, and `git grep` on `lane/platform/*`). Reuse what exists; do not fork it.

**Constraints:**
- Edit only `echo/quantum/bridge.js`, plus quantum tests and evidence. **Do not edit any `.py` file**: the contract-conformance worker is changing them right now.
- Do not edit platform's files (`main.js`, `contracts.js`, `tools/`). Anything you need from platform goes in your report as a request.
- No Node APIs or bundler inside `echo/`.
- Never call a real `backend.run` against anything except the local runner's simulator.
- Never claim anything ran on Qollab.

**WHAT HAS NOT WORKED / KNOWN TRAPS.**
- How Python modules get loaded from JS is unknown. JS cannot read project files; Python reads them by plain string-literal paths (`vault/Research/qollab-platform-and-submission.md`).
- `probabilities_dict()` returns `np.str_`/`np.float64`, which must be cast. Check that our outputs are already plain types once they arrive in JS.
- The selected-backend result currently says `experiment: "bell_verification"`. The owner ruled `"backend_verification"`, and platform's `EXPERIMENTS` does not have it yet. Report the validator's verdict on it as a platform request; do not fudge it.
- Python state is fresh per Run on Qollab, but **within** one page load the memo must hold. Prove that a second call returns the same promise and causes no second `backend.run`. Count the runs with a spy on the runner's backend.

**VAULT NOTES TO READ:**
- `vault/AGENTS.md` and `vault/Index.md`
- `vault/Research/qollab-platform-and-submission.md`
- `vault/Research/qollab-backend-from-js-projects.md`
- `vault/Design/experiment-result-contract.md`
- `vault/Reports/quantum-engine-g1.md`
- `vault/Reports/quantum-physics-review.md` (§5, the Pyodide API census)
- `echo/tests/smoke_plan.md`
- platform's `echo/CONTRACTS.md` on `lane/platform/integration`
- the owner answers in `/Users/udsy/agent-org/lanes/quantum/owner-answers.md`

**WHERE TO START.** Platform's local Qollab-like runner is on `lane/platform/g0-runner-smoke` (`tools/qollab-runner/`, with `echo/main.js` and `echo/quantum/smoke.py`). Do this in a **disposable** detached worktree: combine our `echo/quantum/` with that runner and platform's `contracts.js`, and serve it on your OWN port (pick one in the 51xx range, not shared). Read the runner's README or `check.cjs` to learn how it loads Pyodide and Qiskit. If the runner cannot load Qiskit, report exactly why with its output; do not stub Qiskit.

**DELIVER:**
- `echo/quantum/bridge.js` on your branch;
- a harness under `evidence/quantum/pyodide-bridge/` (outside `echo/`) that drives every adapter in the runner;
- a JSON dump of every returned object with the validator's verdict;
- spy evidence of exactly one `backend.run` across two `verifySelectedBackendOnce` calls;
- timings (first-call latency, per-call latency);
- a screenshot of the runner page showing results, with provenance: reload unconditionally and read a token you just changed, out of the served build (gate-independence law 16).

Write the check first and watch it fail before `bridge.js` exists.

**SABOTAGE (report the nulls):**
- a bare `toJs()`;
- removing the memo;
- a plain call instead of `callPromising`;
- swallowing validator errors.

Each one must go red.

**HOW I WILL JUDGE IT.** I re-run your harness myself on a disposable worktree. I look at the screenshot and the JSON dump, not your summary. Work that only passes in Node and was never loaded by the runner's Pyodide is PARTIAL.

**REPORT:** `/Users/udsy/agent-org/lanes/quantum/reports/0004-pyodide-bridge.md`. It opens with a TL;DR, then a **Vault check**. It ends with: evidence paths, what was not verified (scoped), requests for platform, and questions. Post a checkpoint within 1 h. Write durable findings to `vault/Reports/` (for example, which Qiskit calls worked in the runner's Pyodide and how long they took).
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 4: I merged physics-review after re-running `evidence/physics-review/derive.py` myself: 81 OK, worst 4.99e-11, exit 0. **Gotcha:** the script needs the echo path as `argv[1]` (`python -I derive.py <worktree>/echo`). Run without it, it exits 1 with an IndexError. That is a usage error, not a physics failure.
=== END LEARN ===

=== LEARN ===
Decision (autonomous mode, CLAUDE.md "story token is consumed ONCE at final commit" and vision §7.4/§7.5): the engine itself refuses a second `live_commit` within one interpreter run. It uses a module guard, the same pattern as `run_bell_verification_once`. Gameplay's in-run RESTART must call an explicit `reset_story_token()`. This is safe because the interpreter is fresh on every Run (owner-answers 2026-10-10). It closes physics-review finding 2, and goes to the quantum-hardening brief.
=== END LEARN ===

=== LEARN ===
Sequencing: contract-conformance and the upcoming quantum-hardening worker both edit `echo/quantum/*.py`, so they must run one after the other, never in parallel. While a `.py` worker is running, use the parallel slot for non-`.py` work (`bridge.js`, Pyodide-runner proof). Platform's local runner lives on `lane/platform/g0-runner-smoke` (`tools/qollab-runner/`), not yet on platform integration. As of 6378677, `backend_verification` is NOT in platform's `EXPERIMENTS`, so platform has to add it.
=== END LEARN ===
