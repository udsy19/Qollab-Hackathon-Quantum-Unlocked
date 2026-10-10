## TL;DR
DONE. All 8 rulings and F1, F3–F7 are implemented on `lane/quantum/quantum-hardening` (11 commits, 4d57f0e..346abb7). The evidence is in `evidence/quantum/hardening/`; it was measured locally and has not run in Pyodide or on Qollab.
- **Tests:** `pytest echo/tests` gives 595 passed, exit 0 (`pytest-full.txt`). A disposable merge with today's `lane/quantum/integration` (f7efb92) also gives 595 passed.
- **Platform validator:** all 233 bridge results pass validation against `lane/platform/integration` @ 43be7d9 (contracts-v2 is now merged there) (`validate.txt`). Against the pre-v2 contract, the only rejections are the 3 expected `backend_verification` ones.
- **Two-phase dry run:** results pass platform's own `validateTeleportBitsResult`, `validateTeleportCorrectionResult` and `dryRunVerdict`. That covers 24 requests (12 from platform's `randomGenericState`) × 4 choices. Exactly the rule's choice passes.
- **Sabotage:** 42 mutations, 38 red, 4 nulls (3 true physics, 1 control), 0 refused (`sabotage.md`). An independent kron re-derivation of 2034 numbers has worst error 4.97e-11.
- **Player-path transcript:** `transcript.txt`.
- **Merge blocker:** two calls in `bridge.js` on `lane/quantum/integration` break against this branch, `live_commit(stateId)` and `run_bell_verification_once`. bridge.js must be re-wired in the same landing (§ API changes).

## Vault check
- **Read:** `vault/AGENTS.md`; `vault/Reports/quantum-physics-review.md`; `vault/Reports/contract-conformance.md`; lane `context.md`, `rulings.md` and `owner-answers.md`; vision §7.4, §8.4, §10.5–10.7; platform `echo/CONTRACTS.md` and `contracts.js` (contracts-v2).
- **Already known:**
  - closed form F = r_P² (review §1);
  - the three physics nulls (review §2);
  - findings F1–F7;
  - `bridge.js` is quantum-owned.
- **Reused:**
  - `bell_measurement` and `teleport_branch` were extended, not forked;
  - `formats.experiment_result`;
  - `conftest.bridge_calls()`;
  - `contract-conformance/{dump_results.py,validate.mjs}`;
  - the review's mutation ids.
- **Stale:**
  - `evidence/physics-review/{sabotage,derive}.py` target retired fields (`details`, labelled keys), so their needles no longer match. Re-targeted copies are in `evidence/quantum/hardening/`.
  - **The brief's pending-gap filter premise is outdated.** Platform merged contracts-v2 (f98e117) during this run, and it accepts `backend_verification`. The filter would never match again, so I deleted it as dead code; I did not narrow it.
  - **contracts-v2 also defines the two-phase dry-run shapes and the 0.9 generic margin.** The engine conforms to both.

## What I found
1. **F1 and F7 were already closed by contract-conformance.** Their mutations go red on the pre-fix code without the new tests. F5 and F6 go red only with the new tests. F3 and F4 tests are red on the pre-fix code. Files: `red-before/F1-F5-F6-F7-mutations-on-pre-fix-code.txt` and `red-before/F3-F4-new-tests-on-pre-fix-code.txt`.
2. **Generic margin = platform's `GENERIC_MAX_WRONG_FIDELITY` 0.9.**
   - Every wrong choice scores r_P² ≤ 0.9, and the receiver's arrow moves ≥ 36.9°.
   - I first used |r| ≤ 0.9. That would have refused **17%** of the states the game's own `randomGenericState` sends (200k-draw Monte Carlo, this session).
3. **`formats.plain` rounded echoed angles to 10 decimals.** The contract checks `parameters.theta` to 1e-12, so every JS-drawn dry run would have been rejected. Parameters are now echoed exactly, and the mutation `parameters-rounded` goes red.
4. **Reviewer sub-agent (read-only), 4 low findings, all fixed test-first** (`red-before/review-followups-before-fix.txt`):
   - bare "m1" in `circuitDescription`;
   - a non-integer seed echoed as a different seed;
   - `bool("false")` applied X;
   - a stale docstring.

   It found no token leak and no way to bypass the latch.

## What I changed (commits)
- `4d57f0e` tests first for F3–F7 and the red-before capture
- `f8e335b` engine: calibration states, token, latch, rulings 1–8, F3/F4 wording
- `0893403` conform to contracts-v2: 0.9 margin, unrounded parameters, filter removed, drift fixture at shots = 256
- `2ac6c6c`, `732b7a4`, `4a49b74`, `10925be` evidence
- `f1d5b23` review follow-ups
- `03bd9a4`, `346abb7` vault report

## Evidence paths (`evidence/quantum/hardening/`)
- **red-before:** `red-before/*.txt` plus `red-before/redbefore.py`.
- **tests:** `pytest-full.txt`.
- **validator:**
  - `results.jsonl` + `validate.txt` (v2, 0/233 rejected);
  - `validate-against-pre-v2-4e1b2ed.txt` (3/233, all `backend_verification`).
- **re-derivation:** `derive.py`, `derive.out`.
- **sabotage:** `sabotage.py`, `sabotage.md`.
- **transcript:** `transcript.py`, `transcript.txt`. The path it walks:
  1. relay I/X/Z: EXACT 0.5/0.5, no counts;
  2. bits on a fresh state: m0=1, m1=1;
  3. wrong X/Z: F = 0.153641, FAIL;
  4. fresh state: m0=0, m1=1, right X/Z, F = 1.000000, PASS, unlocks COMMIT;
  5. commit: F = 1;
  6. second commit refused (`TokenAlreadyConsumed`);
  7. `reset_story_token()`, then commit again: F = 1.

  Every result is dumped in full as JSON for a token-leak audit.
- **vault:** `vault/Reports/quantum-hardening.md`.

## The nulls (sabotage round, scoped to `sabotage.md`'s 42 mutations)
- `correction-order-ZX`: ZX = −XZ, a global phase. True null (review §2).
- `correction-as-Y`: Y = iXZ. True null.
- `relay-sender-Z-on-receiver`: (Z⊗I)Φ+ = (I⊗Z)Φ+. True null; only a structural test on `qc.data` could see it.
- `clone-by-purity`: correct physics by another route. A control, not a defect.

Every ruling mutation went red:
- token angles or Bloch in a result;
- token accepted for calibration;
- digits in the token label;
- second commit allowed;
- consumed-on-error;
- reset does nothing;
- a non-generic draw;
- the generic check off;
- hidden module state;
- a fixed calibration state;
- the old m1 label;
- the old experiment value;
- the EXACT label dropped;
- relay counts;
- F3/F4 wording.

## API changes for the bridge (bridge.js on `lane/quantum/integration` @ f7efb92 must be re-wired)
| Python | before | after | bridge.js today |
|---|---|---|---|
| `teleportation.bell_measurement` | `(state_name="plus", seed=None, rng=None)` | `(state="calibration", theta=None, phi=None, seed=None, rng=None)` | `calibrationMeasurement(stateId)` still works. For contracts-v2 call `bell_measurement("calibration", theta, phi)` with the `randomGenericState()` request (positional is fine). |
| `teleportation.teleport_branch` | `(state_name, m0, m1, apply_x, apply_z)` | `(state, m0, m1, apply_x, apply_z, theta=None, phi=None)`; `apply_x`/`apply_z` must be real booleans | add `theta, phi` as the 6th/7th args for "calibration" |
| `teleportation.live_commit` | `(state_name, seed=None, rng=None)` | `(seed=None, rng=None)`. The token is internal. A second call raises `TokenAlreadyConsumed`. | **BREAKS:** `commitTransfer(stateId)` passes stateId as seed and gets a ValueError. Call `live_commit()` with no args. |
| `teleportation.reset_story_token` | — | `()` NEW | call on RESTART, and clear bridge's `commit` latch at the same time |
| `teleportation.TokenAlreadyConsumed` | — | NEW exception (RuntimeError) | show an honest error |
| `teleportation.corrections_withheld`, `verify_deferred` | `(state_name)`, `(state_name, cx, cz)` | optional `theta=, phi=` added | unchanged |
| `qollab_job.run_bell_verification_once` | — | renamed **`run_backend_verification_once`**; also `build_/describe_backend_verification_circuit` | **BREAKS:** bridge.js line 105 |
| result `experiment` | `"bell_verification"` | `"backend_verification"` | contract accepts it now |
| `quantum.prepare`, `quantum.target_state` | took a state name | take a gate sequence from the new `quantum.state_gates(state, theta, phi)` | internal only |
| New constants | — | `quantum.TOKEN`, `CALIBRATION`, `GENERIC_MAX_WRONG_FIDELITY`; `teleportation.M0_LABEL`, `M1_LABEL` | — |
| Result fields | — | teleport results add `observables.inputBlochX/Y/Z` (the source arrow). `live_commit` observables are only `branchProbability` (no receiver Bloch or source fidelity: they would reveal the token). | — |

## Not verified
- Nothing ran in Pyodide or on Qollab.
- The `callKwargs` lines added to `echo/tests/smoke_plan.md` are untested (positional args work too).
- bridge.js is untouched (not mine to edit in this brief) and was not exercised against this branch.
- The token's angles are hidden from results only; they are readable in `echo/quantum/__init__.py`, which ships with the project.
- No images: this is engine-only work with no screen to render.

## Decisions inferred from the docs
- **Margin 0.9 on F:** chosen to match platform's contract (single source of truth; rule no-bloat), justified by F = r_P² (review §1).
- **`live_commit` exposes no receiver Bloch or source overlap:** ruling 2 says the token is "never shown", and each would reveal it.
- **The engine refuses the token in every calibration path:** vision §7.4, "corrections and retries on calibration/test qubits".
- **The engine can draw the state OR accept JS angles:** ruling 1 says "angles or a spec the engine validates"; contracts-v2 has JS draw.
- **Renamed the `*_bell_verification_*` functions too:** ruling 6 says "everywhere".
- **Deleted the pending filter:** it is dead now that v2 is merged.

## Questions for the owner
None.

## What the supervisor should do next
1. Land this branch together with a bridge.js re-wire (pyodide-bridge or a short follow-up):
   - `live_commit()` with no args;
   - `run_backend_verification_once`;
   - pass `theta, phi` from `randomGenericState()` into `bell_measurement` and `teleport_branch`;
   - on RESTART call `reset_story_token()` and clear `commit`.
2. Re-run `ECHO_CONTRACTS_JS=<v2 contracts.js> python evidence/quantum/hardening/sabotage.py echo` on a disposable detached worktree.
3. Ask the overseer for one Pyodide smoke run of the two-phase calls and the commit latch (`smoke_plan.md` §2.4).
