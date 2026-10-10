=== PLAN ===
**Lane goal (G1, due Sat 2026-10-10 04:00 ET, plan row 4; it is now Sat 00:05 ET, so about 4 h left).** Build `echo/quantum/{__init__,cloning,entanglement,teleportation,formats,qollab_job}.py` plus the quantum-owned `echo/quantum/bridge.js`. Every result is JSON-safe and passes platform's `validateExperimentResult`. Tests go in `echo/tests/`, per vision §7 and §10.3–10.7. Everything has to be proven in Pyodide through the local runner, and on Qollab by the overseer.

**Done**
- **backend-job** (consult 2): `qollab_job.py`, plus the research note on reaching `backend` from JS.
- **quantum-core** (consult 3): the engine.
- **physics-review** (consult 4): independent re-derivation, 81 OK. Findings 1–7 went to quantum-hardening.
- **contract-conformance** (consult 5): 453 passed. Only the backend job's `experiment` value is still rejected.
- **pyodide-bridge** (MERGE this consult): `echo/quantum/bridge.js`. I re-ran it myself on disposable worktree `/tmp/q6pb`, port 5193, with Python from `lane/quantum/integration`:
  - green run: 61/61, exit 0;
  - `no-memo` sabotage: 58/61, exit 1, so it bites;
  - merge-tree clean;
  - the screenshot shows every adapter call "valid", and the dry-run fidelities match the closed form r_P² (0.149373 / 0.176668 / 0.673960 / 1).
- **Platform has now added `backend_verification`** to `EXPERIMENTS` (`lane/platform/integration` 43be7d9, `contracts.js:151`). The validator message in my re-run lists it. The only remaining rejection is our own `"bell_verification"` string, which quantum-hardening renames.

**Running**
- **quantum-hardening** (the only `.py` worker). It covers:
  - physics-review findings 1–6;
  - the consumed-once guard and `reset_story_token()`;
  - random generic calibration states and the hidden `token`;
  - the `backend_verification` rename;
  - the m1 label.

  Checkpoint received 00:05 ET.

**Dispatched now**
- **ionq-sim-rehearsal**: rehearses the one Bell verification job locally against IonQ's simulator, labelled "local IonQ simulator (off Qollab)". It edits no `echo/` files, so it can run in parallel with hardening.

**Next**
1. Judge quantum-hardening. I re-run pytest and the sabotage on a detached worktree, then merge.
2. Then dispatch **bridge-rewire**. It updates `bridge.js` to hardening's API: `bell_measurement("calibration")` returns theta/phi, `teleport_branch(…, theta, phi)`, `live_commit()` on the hidden token, and the `reset_story_token` hook for RESTART. Then it re-runs `round.sh` and expects `verifySelectedBackendOnce` to **resolve** as valid `backend_verification`. That is the G1 proof screenshot.
3. Use the validator to show 0 of N rejected against platform 43be7d9.
4. Propose row 4 done.
5. A reviewer pass on the hardened engine.

**Risks**
- The bridge needs a re-wire after hardening because it was built on the pre-hardening API.
- Platform-runner requests are pending: wrapping the Python `backend.run` counter, and the caps-gate `backend-run-python` exemption for `qollab_job.py`. Both go through the overseer.
- The `echo/tests` fixture strings (`ionq_simulator`, `api_key`) trip platform's caps gate. Fix them after hardening, because they touch `echo/tests`.
- G1 deadline: if hardening runs past 02:30 ET, merge what is green and leave the bridge re-wire as the last G1 item, with a cutoff at 03:30.
=== END PLAN ===

=== MERGE branch=lane/quantum/pyodide-bridge ===

=== AGENT name=ionq-sim-rehearsal model=opus base=lane/quantum/integration ===
**GOAL.** Before the overseer spends ECHO's one selected-backend job on Qollab, we need to know that our Bell verification circuit and count parsing behave correctly on IonQ's real simulator stack, both ideal and noisy. The finale's "VERIFIED ON SELECTED SIMULATOR" panel should then show honest, correctly parsed counts the first time it runs.

**VISION.** The vision asks for one selected-backend Bell verification (§7.5, §10.7). It must be honest, correctly labelled, and never presented as teleportation. Its backend provenance must be documented clearly (CLAUDE.md). That job is ECHO's one IonQ moment for the judges.

**WHAT WE ARE BUILDING.** `echo/quantum/qollab_job.py` builds the Bell circuit (H, CX, measure), reads counts through an explicit clbit←qubit map, and is guarded to run once per run. `echo/quantum/bridge.js` `verifySelectedBackendOnce()` calls it through `.callPromising(backend)`. You are rehearsing the Python side **off Qollab**.

**WHAT HAS NOT WORKED / KNOWN**
- So far it has run only on BasicSimulator and the runner's mock.
- Count keys put clbit 0 on the right. This was checked in qiskit-ionq 1.1.1's `_build_counts` source, but never against a live IonQ response.
- A plain (non-`callPromising`) call on Qollab fails with an XHR error. That is Qollab-only and out of your scope.
- **Do not edit `echo/`.** Another worker (quantum-hardening) is editing `echo/quantum/*.py` right now, and will rename `experiment` to `"backend_verification"`. Use the circuit and count-reading functions as they are.

**Owner ruling, binding, verbatim in effect.** The IonQ key is in `~/.config/echo/ionq.env`.
- Load it only inside the one command that needs it: `set -a; . ~/.config/echo/ionq.env; set +a; python …`.
- NEVER print, log, echo, copy or commit the key or that file. Never use the `qpu` backend: only `IonQProvider().get_backend("simulator")`, optionally with `noise_model` `aria-1` or `forte-1`.
- Never use the key from anything under `echo/`.
- If the file is missing, or qiskit-ionq is not installable in the venv, stop the IonQ step and say so. Do not ask for the key.
- Label every result **"local IonQ simulator (off Qollab)"**.
- Grep your evidence for the key's prefix and length before committing, and report that you checked.

**Vault notes to read first:**
- `vault/AGENTS.md`
- `vault/Research/qollab-backend-from-js-projects.md`
- `vault/Reports/pyodide-bridge.md`
- `vault/Reports/quantum-physics-review.md` §endianness
- `evidence/quantum/backend-job/README.md`

**Where to start**
- Read `echo/quantum/qollab_job.py`.
- Write `evidence/quantum/ionq-sim-rehearsal/rehearse.py`. It calls the module's own entry point (the same function the bridge uses) with an IonQ simulator backend, 256 shots (owner ruling).
- Run it three times: ideal, `aria-1` noise, and `forte-1` noise.
- Also run an **asymmetric control**: X on qubit 0 only, then measure. You must see a single dominant key whose position proves clbit 0 is on the right. If our parser put it on the wrong side, this control is what would show it. Watch it fail first by deliberately reversing the key order on a disposable copy, never in `echo/`.

**Deliver** (on your branch, evidence and vault only)
- `evidence/quantum/ionq-sim-rehearsal/` with the script, raw count JSON per run, the parsed result dict per run, and a README.
- Check each result against platform's validator (`evidence/quantum/contract-conformance/validate.mjs`, with contracts.js from `lane/platform/integration`). Expect a reject only on the not-yet-renamed `"bell_verification"`. Show that the result validates with that field patched to `backend_verification` on a copy.
- Record the latency per job.
- Write `vault/Reports/ionq-sim-rehearsal.md` and link it from the Reports hub.

**How I judge it**
- I re-run the asymmetric control and the parser check without the key: you will supply a saved IonQ response fixture.
- Noisy correlated fraction should be plausibly <1 and ideal ≈1.
- Nothing leaks: I grep for the key myself.
- Every label says "local IonQ simulator (off Qollab)".

**Report.** Write `reports/<n>-ionq-sim-rehearsal.md` with a checkpoint within 1 h. Open with a **Vault check**. Then: TL;DR, a table of the runs, sabotage and nulls, what is not verified, and requests (the key goes nowhere).
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 6: I merged pyodide-bridge after re-running it myself on disposable worktree `/tmp/q6pb`, port 5193 (set `PB_PORT`/`PB_OUT` so it never collides), with `run.sh <tag> conformant --python-from lane/quantum/integration`. The green run was 61/61, exit 0, and the `no-memo` sabotage was 58/61, exit 1. Platform added `backend_verification` to `EXPERIMENTS` at `lane/platform/integration` 43be7d9 (`contracts.js:151`), so the only remaining rejection is our own `"bell_verification"` string, which quantum-hardening renames. The bridge is wired to the pre-hardening Python API, so a bridge-rewire worker must follow the hardening merge before G1 can be shown with a resolving `verifySelectedBackendOnce`.
=== END LEARN ===
