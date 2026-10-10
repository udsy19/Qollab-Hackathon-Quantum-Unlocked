# 0005 cross-lane-recheck — FINAL

## TL;DR
- **GATE: RED.** On the pinned SHAs, a real quantum result does NOT flow through the contract into the quest. `cross_lane_check` → **5 of 13 fail, exit 1** (was 12/13 at 0002). The real-output quest walk stalls at **CLONE_INTRO** (exit 1). Bridged past each stall, it hits **4 stalls**: CLONE_INTRO, CLONE_BASIS_PASSED, TELEPORT_DRY_RUN, and the commit. The commit then ends in `measured_refused`: the token is spent and the session is stuck. The control walk on gameplay's fake reaches CREDITS (exit 0), so the walker can pass.
- **The physics is still right:** the oracle driver vs quantum d9b42d0 passes **86/86, exit 0**, after porting it to the v2 shape. Under contracts v2's own teleport validators, 22/22 as-shipped checks fail (exit 1), only because the engine never reports `theta/phi`. With only that renamed, the engine agrees with the contract's physics cross-check **20/20**.
- **C3 still FAIL:** 2 `backend.run` sites (`main.js:114`, `quantum/qollab_job.py:168`), audit exit 1. `bridge.js` now exists and its memo holds at runtime (3 presses → 1 Python call). But it spends the one job and then **rejects the result** (`bell_verification` ≠ `backend_verification`). On Qollab that would waste the single IonQ job.
- **C4 PARTIAL:** commit latching is now real in `bridge.js` and gameplay's `state.js` (probes PASS). Still OPEN: no story-token state (`live_commit('story_token')` → ValueError), and no random generic dry-run states in quantum (probe exit 1).
- **Platform's tools:** `contract-check` GREEN 1087/1087, but it never sees engine output. `qollab-caps` is RED (4 findings, 2 of them false positives). Sabotage found **9 nulls**. The worst: **the story-commit result has no contract validator**, so a commit with fidelity 0.9, or with m0/m1 swapped, is "valid".
- **The gameplay null is NOT closed:** with FIDELITY_OK→0.9 and with the fidelity check removed, all 55/55 tests stay green.
- **Newer tips** (quantum f7efb92, gameplay 7c4741b, platform e22cc7e) give the same verdicts. They add one new gameplay null (`token_guard_removed`), and platform's new shell still has its own `backend.run` (`out/tips/`).
- **Recommend: do not land.** Three fixes unblock it. Gameplay reads the contract's field names. Quantum takes `{theta, phi}`, adds a hidden story token, and renames to `backend_verification`. Platform adds a commit-result validator and picks ONE `backend.run` site.

## Vault check
- **Read:** `vault/AGENTS.md`; `vault/Index.md` (line 24: "lane tests green on a fake adapter hid a total integration break"); `vault/Reports/physics-code-audit.md`; `vault/Reports/physics-oracle-audit.md`; `lanes/red-team/reports/0002-physics-code-audit.md`; `lanes/red-team/rulings.md`; `lanes/red-team/context.md`; `echo/CONTRACTS.md` v2 and `tools/contract-check`, `tools/qollab-caps` on main.
- **Already known:** the 0002 findings (contract shape, 2 backend sites, no token state, gameplay field names, gameplay nulls, 3 physics-identical nulls).
- **Reused, not rebuilt:**
  - `test_product_vs_oracle.py` (ported in place to v2), `sabotage_product.py` (1 row re-anchored, 1 added), `sabotage_gameplay.sh`, `dump_results.py`, `cross_lane_check.mjs`, `c4_token_probe.py` and `backend_run_audit.py`, all unchanged in logic.
  - `where.mjs` found no prior compose script, quest walker, bridge probe or platform-tools sabotage (exit 1 = nothing found), so those are new.
- **Wrong or stale:**
  - `vault/Reports/physics-code-audit.md` describes the pre-v2 shape (`details`, `kind`). Its cross-lane numbers (12/13) are superseded by this report. I did not edit it; the supervisor may mark it outdated.
  - The comment in platform's tip `main.js:186` ("replace with verifySelectedBackendOnce from quantum/bridge.js once it exists") is stale: `bridge.js` exists on quantum since d9b42d0.

## Pins
main **6cc19a6** (contracts v2 80d685f; tip moved to 99dfc54, an org-only change) · quantum **d9b42d0** · gameplay **c49a922** · platform **43be7d9**. Merged tree: `compose.sh`, provenance in `out/merged_provenance.tsv`.
- main supplied `contracts.js` and `CONTRACTS.md`.
- quantum supplied `quantum/` and `tests/`.
- gameplay supplied `game/`.
- platform supplied `main.js`, `index.html`, `main.css`, `requirements.txt` and `quantum/smoke.py`.

Newer tips seen during the run: quantum f7efb92, gameplay 7c4741b, platform e22cc7e. A supplementary run on them is in `out/tips/`.

## Findings for owning lanes

### quantum (d9b42d0)
1. **The backend job's `experiment` is still `"bell_verification"`** (`qollab_job.py:131`, `formats.py` EXPERIMENTS). Contracts v2 and the owner ruling say `backend_verification`. Consequences:
   - `cross_lane_check` BACKEND_VERIFICATION is INVALID.
   - Your own suite is red on the merged tree: 1 failed, `test_contract_conformance.py::test_every_bridge_result_passes_the_platform_validator` (`out/quantum_own_suite_merged.txt`).
   - At runtime, `verifySelectedBackendOnce` calls Python once (the job is spent) and then rejects with "unavailable" (`out/bridge_probe.txt`, exit 1).
2. **The dry run is not the v2 two-phase API.**
   - `bell_measurement`/`teleport_branch` take a state NAME and report `parameters.state`.
   - v2 sends `{theta, phi}` and requires `parameters.theta/phi` in the result.
   - All 4 phase-1 and 16 phase-2 real results are rejected (`out/teleport_v2_check.txt`, exit 1).
   - The physics itself agrees 20/20 with the contract's independent cross-check, so this is naming plus an input shape, not math.
   - The contract's `randomGenericState()` cannot be passed to the engine, so "random generic dry-run states" is unmet (`c4_token_probe` exit 1).
3. **No story-token state.** `live_commit('story_token')` → `ValueError: unknown prepared state` (`out/teleport_v2_d9b42d0.json`, `out/bridge_probe.txt`). Python `live_commit` re-measures on each call (6/6). The JS latch in `bridge.js` now covers that (PASS). The ruling "token fixed + hidden" is still unmet.
4. **Test gaps** (`out/sabotage_product_merged.md`; their control has 1 failure, so a row counts as caught only with >1 failed):
   - Still NULL in your suite: `bell_measure_cx_hits_bob` (Alice's CX lands on Bob), `product_threshold_loosened` (the "mistake does not show" fact at F>0.9) and `swap_m0_m1_branch_probs` (physics-identical, also null in ours).
   - Now caught: `sender_gate_on_receiver`, `receiver_marginal_keys_swapped` (`test_receiver_is_q1_and_the_gate_acts_on_q0`), `clone_reports_source_twice` (`test_source_and_copy_are_labelled_by_qubit`). See `out/their_suite_catches_physics_identical.txt`.
   - `numpy_count_leak` is no longer a defect: `formats.plain` casts every numpy scalar, so the mutation is harmless.

### platform (43be7d9; contracts on main 6cc19a6)
5. **There is no commit-result contract.** v2 validates dry-run phases 1 and 2 but has nothing for the single story commit. On a real commit result:
   - fidelity 0.9 with "PASS" facts → `validateExperimentResult` says valid;
   - m0/m1 swapped → valid (`out/platform_tools_sabotage.md`, rows `fidelity_0_9_commit`, `m0m1_swapped_commit`).
   - The contract also names no commit parameters. Gameplay expects `parameters.stateId == 'story_token'`; quantum emits `parameters.state`. That is the stall at the last step.
6. **Cloning has no named verdict field.** CONTRACTS.md §"Where the §10.x reference outputs go" gives cloning `observables {purityQ0, purityQ1}` and no `fidelity`. Gameplay reads top-level `fidelity`; quantum puts `jointFidelityWithTwoCopies` in observables. Name the field that decides "copy succeeded / failed".
7. **Two `backend.run` sites, two guards** (`out/backend_run_audit_merged.txt`, exit 1): `main.js:114` (`backendJobUsed`) and `qollab_job.py:168` (`_job_submitted`). The tip `main.js:199` is still a JS site. `qollab-caps` rule `backend-run-python` forbids the Python site that quantum's `bridge.js` design relies on. **The two lanes hold opposite designs:** one site must be chosen (supervisor or overseer; ruling "ONE site in bridge.js").
8. **`main.js` does not import `bridge.js` or `game/`** at 43be7d9 (the G0 smoke only), so nothing in the merged tree plays. The tip imports `game/` and `ui/*` (ui not in the tree → `import-unresolved` ×4) but calls `quantum.*` directly, bypassing `bridge.js`.
9. **contract-check never grades engine output.** Its "good" teleport fixture uses `{stateId, correctionX, correctionZ}`, the names CONTRACTS.md's phase-2 table does not use (`tools/contract-check/fixtures.json`). This is a producer fixture contradicting its own spec (law 4).
10. **qollab-caps:**
    - Nulls: `const b = backend; b.run()` (declared limitation), `const { run } = backend; run()` and Python `getattr(backend, "run")()` (both undeclared). Our `backend_run_audit.py` catches all three (`out/backend_run_audit_on_caps_nulls.txt`).
    - False positives: `hardcoded-secret` and `hardcoded-backend` fire on `echo/tests/test_qollab_job.py:207`, a test that asserts their ABSENCE.
    - Note: `echo/tests/` would ship inside the upload and counts toward the 100-file cap.
11. **Platform's own sabotage rounds pass** (contract-check 49 cases, 0 mismatches; qollab-caps 37 mutations, 0 null): `out/platform_own_sabotage.txt`. They are sound for what they test. The nulls above are outside their scope.

### gameplay (c49a922)
12. **`missionRules.js` reads fields neither the contract nor the engine provides** (`out/cross_lane_check.txt`, `out/quest_walk_real_bridged.txt`):
    - CLONE_INTRO and CLONE_BASIS_PASSED read top-level `fidelity`. Real cloning results have none (see 6) → "need a basis-state copy that succeeded".
    - TELEPORT_DRY_RUN reads `parameters.correctionX/correctionZ`. The contract and engine say `applyX/applyZ` → "corrections do not match m0=1, m1=0".
    - The commit needs `parameters.stateId == 'story_token'` → "need the story-token transfer", then `measured_refused`.
    - The relay steps now advance on real output (2/2). That is the improvement since 0002.
13. **You do not use contracts v2's dry-run API** (`validateTeleport*`, `dryRunVerdict`, `randomGenericState`). Your fake keeps its own copy of `randomGenericState` (duplication).
14. **Your fake is invalid under v2.** It labels `bell_signalling` as `documented_preview`, and v2 requires `exact_qiskit_local`. Unpatched, the fake walk stalls at RELAY_INTRO (`out/quest_walk_fake_unpatched.txt`, exit 1).
15. **Nulls not closed** (`out/sabotage_gameplay_c49a922.md`):
    - `threshold_0_9` and `fidelity_check_removed` → 55/55 green.
    - At tip 7c4741b, also `token_guard_removed` → 56/56 green (`out/tips/sabotage_gameplay.txt`). The calibration-may-not-use-the-story-token guard has no test.
    - The fidelity check is the ONLY guard on the commit (see 5).

## Per-check table (pinned SHAs)
| # | check | command | exit | file |
|---|---|---|---|---|
| C0 | oracle baseline | `pytest evidence/red-team/physics-oracle` + `sabotage.py` | 0 / 0 (523 passed) | `out/c0_baseline.txt` |
| 1 | oracle driver vs quantum | `ECHO_ROOT=<q>/echo pytest evidence/red-team/physics-code-audit` | **0** (86 passed) | `out/driver_d9b42d0.txt`, `out/driver_merged.txt` |
| 1r | driver refuses with no ECHO_ROOT | same, no env | 2 | `out/driver_no_echo_root.txt` |
| 2a | cross_lane_check (real dump) | `node cross_lane_check.mjs` | **1** (5/13 fail) | `out/cross_lane_check.txt` |
| 2b | quest walk, real | `node quest_walk.mjs <e> real` | **1** (stall CLONE_INTRO) | `out/quest_walk_real.txt` |
| 2c | quest walk, real, stalls bridged | `… real <json> <fake>` | **1** (4 stalls; commit measured_refused) | `out/quest_walk_real_bridged.txt` |
| 2d | quest walk, control (fake) | `… fake` | 0 (CREDITS, 19 transitions) | `out/quest_walk_fake_control.txt` |
| 2e | v2 two-phase validators on real output | `node teleport_v2_check.mjs` | **1** (22/22 fail; renamed 20/20 agree) | `out/teleport_v2_check.txt` |
| 3 | backend_run_audit, merged | `backend_run_audit.py <e>` | **1** (2 sites) | `out/backend_run_audit_merged.txt` |
| 3b | bridge.js runtime (Node + recorded real output; NOT Pyodide) | `node bridge_probe.mjs` | **1** (2/5 fail) | `out/bridge_probe.txt` |
| 4 | C4 token probe (Python) | `c4_token_probe.py` | **1** | `out/c4_token_probe_python.txt` |
| 5a | platform contract-check | `node tools/contract-check/check.mjs --contracts <e>/contracts.js` | 0 (1087/1087) | `out/platform_contract_check.txt` |
| 5b | platform qollab-caps | `node tools/qollab-caps/check.mjs --root <e>` | **1** (4 findings) | `out/platform_qollab_caps.txt` |
| 5c | sabotage on platform tools | `node platform_tools_sabotage.mjs` | 0 (ran; **9 nulls**) | `out/platform_tools_sabotage.md` |
| 5d | platform's own sabotage | `sabotage.py`, `sabotage.mjs` | 0 / 0 | `out/platform_own_sabotage.txt` |
| 6 | gameplay sabotage | `sabotage_gameplay.sh c49a922` | 0 (ran; 2 nulls) | `out/sabotage_gameplay_c49a922.md` |
| 7 | product sabotage (merged) | `sabotage_product.py <e>` | 1 (their control red: 1 failure) | `out/sabotage_product_merged.md` |
| 8 | self-sabotage of this round's probes | `sabotage_probes.sh` | 0 (7/7 flip) | `out/sabotage_probes.md` |

## Closure table (0002 findings)
| 0002 finding | status | evidence (exit) |
|---|---|---|
| BLOCKER: every real result INVALID; quest stalls | **CHANGED, still OPEN.** 6/7 results valid; backend result invalid; gameplay stalls at 4 points | `cross_lane_check.txt` (1), `quest_walk_real_bridged.txt` (1) |
| 1 contracts.js rejects real results | **CLOSED** for cloning/bell/teleport (v2 + quantum migration); **OPEN** for backend (`bell_verification`) | `cross_lane_check.txt` (1) |
| 2 / C3: two `backend.run` sites | **OPEN** (`main.js:114` + `qollab_job.py:168`; tip `main.js:199`) | `backend_run_audit_merged.txt` (1) |
| 6 `bridge.js`/`verifySelectedBackendOnce` absent | **CLOSED** (exists; memo 3→1 at runtime). New defect: it rejects its own result | `bridge_probe.txt` (1) |
| 7 experiment `backend_verification` | **OPEN** | `quantum_own_suite_merged.txt` (1) |
| C4: `live_commit` re-measures, no once-guard | **CHANGED.** JS latch in `bridge.js` and gameplay `state.js` PASS; Python unguarded (6/6) | `bridge_probe.txt`, `c4_token_probe_python.txt` (1), `sabotage_probes.md` (0) |
| C4: no story-token state | **OPEN** (`live_commit('story_token')` → ValueError) | `teleport_v2_check.txt` (1) |
| C4: no random generic dry-run states | **OPEN** in quantum (v2 has the JS generator; the engine cannot accept `{theta, phi}`) | `c4_token_probe_python.txt` (1) |
| 9 gameplay field names | **CHANGED.** Relay CLOSED; cloning, dry-run and commit OPEN | `cross_lane_check.txt` (1) |
| 10 gameplay nulls (0.9 / check removed) | **OPEN** (55/55 green; tip adds `token_guard_removed` null) | `sabotage_gameplay_c49a922.md` (0 = ran) |
| 8 quantum test gaps: locality (Alice CX→Bob) | **OPEN** in their suite (ours catches) | `sabotage_product_merged.md` |
| 8 fact-band threshold | **OPEN** in their suite (ours catches) | same |
| 8 np.int64 leak | **CHANGED → not a defect** (`formats.plain` casts) | same |
| physics-identical null: `swap_m0_m1_branch_probs` | **OPEN** in both suites. The branch table is 1/4 everywhere, so it cannot be seen by output | same |
| physics-identical null: `receiver_marginal_keys_swapped` | **CLOSED** (their structural test) | `their_suite_catches_physics_identical.txt` |
| physics-identical null: `clone_reports_source_twice` | **CLOSED** (their structural test) | same |

## What I changed (commits on `lane/red-team/cross-lane-recheck`)
- `d77e85d`: merge of main 6cc19a6. Generated hub conflicts were resolved by taking main's version.
- `0094e5f` (checkpoint), `4a69861`, `e8f8abd`, `4e2d51e` (vault copy and evidence README).
- **The driver was ported to contracts v2** (`physics-code-audit/test_product_vs_oracle.py`):
  - `details.*` → `observables.*`;
  - probability keys are built from the ORACLE's bits through the result's `keyQubits`, then checked against the oracle;
  - `choiceFollowsRule` (gone) → the oracle's `TEXTBOOK_RULE` and `parameters.applyX/applyZ`;
  - `appliedCorrections` (gone) → the receiver Bloch vector must equal the oracle's |psi> (generic Haar states make a wrong correction visible);
  - cloning amplitudes (gone) → `parameters.state` and the joint fidelities 0.5 / 0 / 0.25;
  - backend `summary.qubitOnes` → recomputed from `counts` through `keyQubits`;
  - the Pyodide import allow-list gains `sys`, a builtin module in every CPython, Pyodide included. The only hit was platform's `smoke.py`.
- `sabotage_product.py`: `swap_m0_m1_branch_probs` re-anchored to `_key` (the code moved). Added `branch_key_qubits_lie`. Fixed a row description that broke the markdown table.
- **New, in `evidence/red-team/cross-lane-recheck/`:** `compose.sh`, `quest_walk.mjs`, `dump_teleport_v2.py`, `teleport_v2_check.mjs`, `bridge_probe.mjs`, `platform_tools_sabotage.mjs`, `sabotage_probes.sh`.
- No product files were touched. Every mutation ran on a `mktemp` copy.

## Nulls (what did NOT go red)
- **Platform tools (9):** `m0m1_swapped_commit`, `fidelity_0_9_commit`, `fidelity_0_9_cloning_basis`, `preview_with_counts_in_observables`, `aliased_js_site`, `destructured_js_site`, `python_getattr_site`, `branch_keyqubits_reversed` and `cloning_keyqubits_reversed`. The last two are physics-identical (symmetric tables), so no shape validator can see them.
- **Platform tools, a caught that is weaker than it looks:** `loop_one_site` was caught only because it is a second site. One site inside a loop is a declared limitation.
- **Gameplay:** `threshold_0_9`, `fidelity_check_removed`, and `token_guard_removed` at the tip.
- **Quantum suite:** `bell_measure_cx_hits_bob`, `product_threshold_loosened`, `swap_m0_m1_branch_probs`, and `numpy_count_leak` (harmless now).
- **Our driver:** `guard_set_after_run` (not tested by us; their suite catches it), `receiver_marginal_keys_swapped`, `clone_reports_source_twice`, `swap_m0_m1_branch_probs` and `branch_key_qubits_lie` (all physics-identical). Also `numpy_count_leak`.
- **Our own probe, first version:** `commit_latch_removed` went GREEN. After a successful commit, the arming check refuses anyway, so the latch only matters after a REFUSED result. I fixed this by always probing a second commit and adding a faulted-commit control. All 7 rows now flip.

## What I did NOT do or could not verify
- No Qollab, IonQ or Pyodide run. The bridge probe is Node with stubs replaying recorded real CPython output ("local runner"-class evidence at best). The Python→JsProxy `callPromising` path is unverified.
- No screenshots (C7). Nothing in the merged tree plays: `main.js` at 43be7d9 is the G0 smoke and imports neither `bridge.js` nor `game/`. No PNG in `renders/`.
- The tips run (`out/tips/`) covers the core gates only. I did not run product sabotage, platform-tools sabotage or self-sabotage there. Platform's tip `contracts.js` differs from main's (it adds `FIDELITY_EPSILON`); the tips run used main's, per the brief.
- I did not decide between the JS-site and Python-site designs for `backend.run`.

## Decisions inferred from the docs
- **Merged-tree composition** follows the brief's own composition. `quantum/smoke.py` (platform) was added because quantum has no file of that name; recorded in provenance. Source: brief § WHERE TO START 3.
- **Their-suite verdicts against a red control** count as "caught" only when the failures exceed the control's 1. Source: gate-independence law 3 (a gate must be able to fail on the thing it checks).
- **`sys` added to the Pyodide allow-list.** It is a builtin module, and Qiskit on Pyodide (owner ruling, Pyodide probe) runs CPython's stdlib. Source: `rulings.md`, Pyodide Qiskit probe.
- **The platform-tools sabotage baseline** re-keys a real phase-2 result to `theta/phi`, so each sabotage is measured against a passing control. Without that, every row would be "caught" by the naming defect alone. Source: law 15 (sabotage must be measured against a green control).

## What the supervisor should do next
1. **Hold the landing.** The gate is red (exit 1 on `cross_lane_check`, `quest_walk_real`, `teleport_v2_check`, `backend_run_audit`, `bridge_probe`). Re-run with `bash evidence/red-team/cross-lane-recheck/compose.sh <dir>` plus the commands in the per-check table. Override pins with `QUANTUM_SHA=… GAMEPLAY_SHA=… PLATFORM_SHA=…`.
2. **Quantum (smallest unblock first):**
   - rename to `backend_verification`;
   - accept `{theta, phi}` for `bell_measurement`/`teleport_branch` and report them in `parameters`;
   - add a fixed hidden story-token commit entry point;
   - copy the locality and fact-band tests from `test_product_vs_oracle.py`.
3. **Platform:**
   - add `validateCommitResult` to the contract (rule-applied corrections, `fidelity >= FIDELITY_PASS`, `stateId` or an explicit token marker);
   - name the cloning verdict field;
   - fix the `fixtures.json` teleport naming;
   - extend `qollab-caps` to destructuring and `getattr`;
   - stop flagging negative tests.
4. **Gameplay:**
   - switch `missionRules` to the contract's names (`applyX/applyZ`, the cloning observable from 3, the commit marker from 3);
   - use `dryRunVerdict`/`randomGenericState` from `contracts.js` and drop the fake's copy;
   - add tests that turn red for FIDELITY_OK = 0.9, a removed fidelity check and a removed token guard;
   - run the suite on `out/quantum_results_d9b42d0.json`, not the fake.
5. **Overseer or supervisor ruling needed:** ONE `backend.run` site. Platform's shell and caps rule require a JS site; quantum's `bridge.js` delegates to a Python site. Pick one, delete the other in the same change, and re-run `backend_run_audit.py` (must exit 0).
6. **Red-team next:** re-run this round on the fixed tips. Once `main.js` wires `bridge.js` and `game/`, do the C7 screenshots and a runtime one-job check on our own port.
