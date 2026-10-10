The ionq-sim-rehearsal worker has finished, and I have judged its work. On a disposable detached worktree I re-ran the 4 synthetic replays (all exit 0) and the sabotage round: every row came out as predicted, 6 red and 4 named nulls. `merge-tree` against integration is clean, and the branch touches nothing under `echo/`. Its result is only partial, because the owner's key file is missing on this host (I checked: `test -f` returns 1). The owner's ruling covers that case: skip the IonQ step, and don't ask for the key.

quantum-hardening's branch already exposes the final API: `bell_measurement` returns theta/phi, `live_commit` has a latch, and `reset_story_token` exists. So the free slot goes to the bridge rewire, based on hardening's tip. That work touches only `bridge.js` and evidence, so it does not collide with the `.py` work.

=== PLAN ===
**Lane goal (G1, due Sat 2026-10-10 04:00 ET, plan row 4; now Sat 00:12 ET, about 3 h 48 min left).**
- Build `echo/quantum/{__init__,cloning,entanglement,teleportation,formats,qollab_job}.py` plus the quantum-owned `echo/quantum/bridge.js`.
- Every result is JSON-safe and passes platform's `validateExperimentResult` under contracts v2 (main 80d685f).
- Tests go in `echo/tests/`, per vision §7 and §10.3–10.7.
- Everything is proven in Pyodide through the local runner, and on Qollab by the overseer.

**Done**
- backend-job (c2), quantum-core (c3), physics-review (c4) and contract-conformance (c5).
- pyodide-bridge (c6): 61/61 in the local runner.
- **ionq-sim-rehearsal (c8), merged.** It is evidence only, a keyless replay harness plus `run-live.sh`.
  - No IonQ job ran, because `~/.config/echo/ionq.env` is absent.
  - Its replays and sabotage round re-ran clean (6 red, 4 predicted nulls).
  - Only the asymmetric control can catch an endianness bug; the Bell run cannot.

**Running**
- **quantum-hardening.** Its tip is 10925be, with a 42-mutation sabotage round and evidence; the final report is pending. It is the only `.py` worker.
- **main-sync.** It merges main (contracts v2, `tools/contract-check`, `tools/qollab-caps`) into integration, regenerates the hubs, runs both gates, and reports the gap list.
- **bridge-rewire (dispatched now), based on `lane/quantum/quantum-hardening`.** It moves `bridge.js` onto hardening's API, re-runs the Pyodide runner round, and must show `verifySelectedBackendOnce` resolving as a valid `backend_verification`. That run is the G1 proof.

**Next**
1. When hardening reports: re-run pytest and its sabotage round on a detached worktree. Merge it after main-sync, then re-run `tools/contract-check`.
2. Merge bridge-rewire right after hardening; check that its base matches hardening's final tip.
3. Clean the caps-gate fixture strings in `echo/tests` (`ionq_simulator`, `api_key`) plus whatever main-sync's caps run lists. This happens after hardening merges.
4. Get `contract-check` and `qollab-caps` green on integration, then propose row 4 done.
5. Run a reviewer pass on the hardened engine and the bridge.
6. Live IonQ simulator rehearsal: only if the owner creates the env file. It is not a G1 blocker, because the overseer's Qollab run is the real proof.

**Risks**
- bridge-rewire is built on a branch that may still move. Mitigation: it merges hardening's final tip before reporting, and touches no `.py`.
- Platform requests still pending: a Python-side `backend.run` counter in the runner, and the caps exemption for `qollab_job.py`.
- Cutoffs: if hardening runs past 02:30 ET, merge what is green. The bridge-rewire cutoff is 03:30 ET.
- The 0.80 noisy-Bell floor in the rehearsal is uncalibrated; that is noted for whenever a live run happens.
=== END PLAN ===

=== MERGE branch=lane/quantum/ionq-sim-rehearsal ===

=== AGENT name=bridge-rewire model=opus base=lane/quantum/quantum-hardening ===
**GOAL:** In the game, every quantum terminal calls `echo/quantum/bridge.js`, and today the bridge talks to the *pre-hardening* Python API. After this task, a player in the browser (Pyodide) gets the hardened behaviour through the bridge:
- the rooftop dry run draws a **fresh random generic calibration state**; bits come first, X/Z second;
- the final commit teleports the **hidden fixed story token** exactly once;
- RESTART can re-arm the token;
- the one selected-backend verification **resolves** as a valid `ExperimentResult` with `experiment: "backend_verification"`. Today it rejects, because the old name `bell_verification` is not in the contract.

The run that shows this is the G1 proof.

**VISION:** ECHO_MASTER_VISION §8.4 sets the `QuantumEngine` adapter contract, §7.4 says the token is consumed once, and §10.6–10.7 cover the two-phase dry run and the one backend job. The CLAUDE.md rule: "at most one backend.run per run; all puzzle feedback from local Qiskit".

**WHAT WE ARE BUILDING:** the Qollab-native `echo/` project. `bridge.js` (quantum-owned) is the only place JS calls Python, and the only guarded `backend.run` site, reached via `qollab_job.run_bell_verification_once` and `callPromising(backend)`. Platform's `main.js` imports it, and gameplay swaps `dev/gameplay/fakeQuantum.js` for it.

**WHAT HAS NOT WORKED / KNOWN TRAPS:**
- The bridge on integration (95b0394) is wired to the old API: `teleport_branch(stateId, …)` with no theta/phi, and `live_commit(stateId)`.
- `verifySelectedBackendOnce` currently rejects, which is a contract failure, not a physics failure.
- The runner's own `backend.run` counter cannot see Python-side calls, so use `pb_spy.py`'s Python spy, as pyodide-bridge did.
- A bare `toJs()` already returns plain Objects on Pyodide 314.0.7. Keep `dict_converter` anyway as a guard.
- Never claim a Qollab or IonQ run. Results are "local runner".

**Hardening's API, on your base branch** (read the code, not this summary):
- `bell_measurement("calibration", seed=?)` draws theta/phi and returns them in `parameters`.
- `teleport_branch("calibration", m0, m1, applyX, applyZ, theta=, phi=)`.
- `live_commit(seed=?)`, with no state id: it uses the hidden token, latches on success, and refuses a second call.
- `reset_story_token()`.
- `qollab_job` now emits `backend_verification`.

The bridge must carry theta/phi from the measurement result into the branch call, so the player's correction is graded on the state that was actually measured. Add an explicit RESTART hook on the bridge that calls `reset_story_token()` and clears the JS commit latch. **Do not** reset the backend-job memo: that stays at one job per run.

**FILES:** edit only `echo/quantum/bridge.js` and `evidence/quantum/pyodide-bridge/` (harness, `pb_spy.py`, `round.sh`; extend these, do not fork new copies; no-bloat). Write your report and a vault report under `vault/Reports/`. **Do not edit any `echo/quantum/*.py`**: hardening is still finalising them. Before your final run, `git merge lane/quantum/quantum-hardening` to pick up its latest tip, and record the hardening SHA you ran against. Do not touch `echo/main.js` (platform's). List that wiring as a request.

**VAULT NOTES TO READ FIRST:** `vault/AGENTS.md`, `vault/Index.md`, `vault/Reports/pyodide-bridge.md`, `vault/Reports/contract-conformance.md`, `vault/Research/qollab-backend-from-js-projects.md`, `evidence/quantum/hardening/README.md` on your base, `evidence/quantum/pyodide-bridge/README` and `round.sh`, the `echo/CONTRACTS.md` v2 sections on the two-phase teleport dry run and `backend_verification` (on `main`), and `/Users/udsy/agent-org/lanes/quantum/rulings.md`.

**WHERE TO START:**
1. Read the hardening API.
2. Write the harness checks for the new behaviour first, and capture them red against the current bridge (law 3). The checks to add:
   - a dry run's theta/phi round-trips into the branch result;
   - two calibration draws differ;
   - every wrong X/Z on a non-00 branch scores F < 0.999999;
   - the second `commitTransfer` is refused;
   - after RESTART, a commit succeeds again;
   - two `verifySelectedBackendOnce` calls give one Python `backend.run` and **resolve** to a validator-accepted `backend_verification`.
3. Then rewire.
4. Run `round.sh` on your OWN port (`PB_PORT`, not 5147/5193), with the runner from `lane/platform/integration`, as pyodide-bridge did. Use `--python-from` your branch.

**DELIVER:**
- Three consecutive green runs in the local runner, plus the head control (old bridge = red).
- Sabotages: no-theta-passthrough, latch removed, RESTART not resetting the Python token, no-memo, swallow-validator. Each must go red; report every null.
- A runner screenshot under `renders/bridge-rewire/` showing the resolved `backend_verification` result.
- `node tools/contract-check/check.mjs` run against your bridge output if it accepts engine dumps; say so if it cannot.

**HOW I WILL JUDGE IT:** I re-run `round.sh` myself on a disposable detached worktree and need exit 0 ×3 and red sabotages, and I look at the screenshot. A report that opens without a **Vault check**, or that claims anything ran on Qollab or IonQ, is rejected.

**REPORT:** `lanes/quantum/reports/NNNN-bridge-rewire.md`, with TL;DR, Vault check, evidence paths, nulls, what was not verified, requests for platform (the `main.js` import, the runner's Python counter), and decisions inferred from the docs. **Checkpoint within 1 h. Hard cutoff 03:30 ET:** report whatever is green by then.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 8: Merged ionq-sim-rehearsal after re-running its keyless replays (4/4 exit 0) and its `sabotage.sh` (6 red, 4 predicted nulls) on the disposable worktree `/tmp/q8ir`. `merge-tree` was clean.
- `~/.config/echo/ionq.env` is absent on this host. Per the owner's ruling, skip the step and do not ask for the key; the live IonQ simulator rehearsal stays optional and is not a G1 blocker.
- Durable physics/test fact: a Bell (00/11) run cannot detect a bit-order bug, because the outcomes are symmetric. Only an asymmetric control (X on q0) can. So the one Qollab job proves only that the backend works; endianness is proven locally.
- qiskit-ionq rounds p×shots on noisy sims (255 of 256 counts were seen), so validators must not demand sum == shots for noisy runs.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 8: To save G1 time, I based bridge-rewire on `lane/quantum/quantum-hardening` (tip 10925be) rather than on integration. Its API was already final per the code: `bell_measurement` returns theta/phi, plus `live_commit(seed)` and `reset_story_token`. This is safe because bridge-rewire edits only `bridge.js` and evidence, never `.py`, and must merge hardening's final tip before its last run. Merge order: main-sync → hardening → bridge-rewire.
=== END LEARN ===
