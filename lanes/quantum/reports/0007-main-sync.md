## TL;DR
- **Merged.** `lane/quantum/main-sync` @ ab2ea6f merges `main` 99dfc54, which carries contracts v2 80d685f, `tools/contract-check/` and `tools/qollab-caps/`. The two hub conflicts were resolved by regenerating them, not by picking a side. Evidence and report are in 7c72712.
- **contract-check: GREEN** 1087/1087, exit 0. **It grades `echo/contracts.js` only and never runs the engine or bridge.js.** So I measured the engine with contracts.js's own validators instead.
- **qollab-caps: RED**, 6 findings, exit 1. A disposable copy with exactly those 6 removed goes GREEN, so that is the complete red set.
- **Gap table: 11 rows** (below). quantum-hardening (0893403, and the branch is now at 2ac6c6c) fixes rows 6 and 8: `bell_verification`→`backend_verification`, and the v2 `{theta, phi}` dry run, 35/35 accepted. **It does not fix** row 3 (python `backend.run`), rows 4–5 (test lines), row 7 (shots ≠ 256) or anything in bridge.js (rows 9–11).
- **pytest: 452 passed, 1 failed, both before and after the merge.** It is the same test (`test_contract_conformance`) for the same `bell_verification` reason, so the merge broke nothing. Gap row 6 fixes it.
- Positive controls went red for both gates and for both of my harnesses. I found no gate that cannot go red. contract-check's own sabotage declares 6 nulls (below).
- Evidence: `evidence/quantum/main-sync/` (its README names each file). Vault: `vault/Reports/quantum-vs-contracts-v2.md`.
- **Recommend:** merge hardening next. Then the bridge rewire must cover rows 3, 7, 9, 10 and 11 together.

## Vault check
- **Read:** `vault/AGENTS.md` (delivered by the hook), `/Users/udsy/agent-org/lanes/quantum/context.md`, `vault/Reports/contract-conformance.md`, `vault/Reports/qollab-caps-gate.md` (rule table), `vault/Research/qollab-backend-from-js-projects.md` (callPromising / backend.run), `echo/CONTRACTS.md` (main), `owner-answers.md` (the one-guarded-`backend.run`-site ruling).
- **Already known:** contract-conformance measured 3/181 rejections for `bell_verification`, against platform/integration 6378677. That is re-confirmed here against main's v2: still 3/181, with the same cause.
- **Reused:** `evidence/quantum/contract-conformance/{dump_results.py,validate.mjs}` unchanged. The new harnesses are only for what those two cannot grade (the two-phase dry-run validators and shots).
- **Stale:** CONTRACTS.md:116 names `entanglement.receiver_statistics`, but the engine's function is `bell_signalling`. That is doc only, and I filed no gate failure for it. `vault/Reports/contract-conformance.md` row "the 3 left … add `bell_verification`" is superseded: platform chose `backend_verification` instead. I did not mark it, because the note is another session's; the supervisor may set `status: outdated`.
- I did not view `vault/Index.md` or `vault/Reports/contracts-v2.md` in full. The brief's facts were enough, and I graded against the code rather than the note.

## Gap table (merged tree ab2ea6f)

| # | file:line | rule broken | owner | fixed on hardening 0893403 / 2ac6c6c? |
|---|---|---|---|---|
| 1 | `echo/index.html` (absent) | qollab-caps `entry-index` | platform | no (not quantum's) |
| 2 | `echo/main.js` (absent) | qollab-caps `entry-main` | platform | no |
| 3 | `echo/quantum/qollab_job.py:168` | `backend-run-python`; owner ruling: exactly one guarded site, in bridge.js | **bridge rewire** (bridge.js runs the job, and .py builds the circuit and interprets the counts) | **no** (it moves to `:169`) |
| 4 | `echo/tests/test_qollab_job.py:91` | `hardcoded-backend` (`from qiskit_ionq.ionq_job import …`) | quantum tests | **no** |
| 5 | `echo/tests/test_qollab_job.py:207` | `hardcoded-backend` + `hardcoded-secret` (the forbidden-pattern list `"ionq_simulator"`, `"api_key\|token"`) | quantum tests | **no** |
| 6 | `qollab_job.py:131` `experiment="bell_verification"` (3/181 calls) | `validateExperimentResult`: the experiment union and the engine rule | quantum .py | **yes** (0/233 rejected on both heads) |
| 7 | `qollab_job.py` `interpret_counts(shots_requested=None or ≠256)` | v2: `backend_verification parameters.shots must be 256` (IonQ drift of 255 gets rejected) | quantum .py: always report `BACKEND_SHOTS` requested. Or the bridge always passes 256. | **no** (probe rejected on 2ac6c6c). Hardening changed its conftest from 300 to 256, so its 0/233 hides this. |
| 8 | `teleportation.py:125` `bell_measurement(state_name)`, `:141` `teleport_branch(state_name,…)` | v2 two-phase validators: no `{theta, phi}` entry point, and `parameters` lack theta/phi. **35/35 rejected.** | quantum .py | **yes** (35/35 accepted on both heads). With theta/phi injected, the merged engine's fidelities already pass v2's cross-check. |
| 9 | `bridge.js:68` `calibrationMeasurement(stateId)`, `:71` `teleportDryRun(stateId,X,Z,bits)` | CONTRACTS.md § two phases: JS sends `randomGenericState()`, builds phase 2 with `makeCorrectionRequest`, and grades each phase with `validateTeleportBitsResult` / `validateTeleportCorrectionResult`. The bridge only calls `validateExperimentResult`. | bridge.js | no (hardening has no bridge.js) |
| 10 | `bridge.js:105` `qollabJob.run_bell_verification_once` | renamed to `run_backend_verification_once` on hardening, so the call is undefined after that merge | bridge.js | the rename is on hardening; bridge must follow it |
| 11 | `bridge.js:83` `teleportation.live_commit(stateId)` | hardening's signature is `live_commit(seed=None, rng=None)`, so stateId would land in `seed` | bridge.js | the signature changes on hardening; bridge must follow it |

Rows 1–5 are from `qollab-caps.log`. Rows 6–8 come from running engine output through main's contracts.js validators (`validate-v2-*.log`, `validate-teleport-v2-*.log`, `validate-shots-*.log`). Rows 9–11 come from reading code (`git show 2ac6c6c:…`) and **were not executed**.

## What I found beyond the table
- **contract-check cannot see quantum at all.** Its input is contracts.js plus the vision. A supervisor reading "contract-check GREEN" as "the engine conforms" would be wrong. Engine conformance needs the dump+validate harnesses, which are under `evidence/` rather than `tools/`.
- **The conftest-enumerated sweeps are producer-chosen** (gate-independence law 8). Row 7 is what that hid: hardening's 0/233 is true for its own list, but a direct probe still rejects.
- After pytest, `echo/` on disk holds `__pycache__/` (31 files vs 17 in git). qollab-caps counts them. That is under the cap, but upload packaging must exclude them, and the gate's file count depends on run order.

## Positive controls and nulls
| gate / harness | plant (disposable copy) | result |
|---|---|---|
| contract-check | X/Z rule swapped in `expectedCorrections` | RED, 18 FAIL, exit 1 (`pc-contract-check.log`) |
| contract-check (platform's `sabotage.py`) | 49 mutations | 0 mismatches. **Declared nulls (6):** verdict ignores the rule; pass threshold loosened to 0.5; ANIMATION_END moved to story-ui; default volume changed; a §9.3 world-change id renamed; the Map hint dropped. Two of those are on the dry-run verdict. |
| qollab-caps | `localStorage` appended to bridge.js | new `storage` finding at bridge.js:118, exit 1 (`pc-qollab-caps-plant.log`) |
| qollab-caps (completeness) | only the 6 findings removed | GREEN, exit 0, so the 6 are the whole red set (`pc-qollab-caps-green.log`) |
| `validate_teleport_v2.mjs` | forged fidelity 0.5 on a correct choice, plus phase-1 theta swapped | both rejected, exit 1 (`pc-teleport-validator.log`) |
| `validate.mjs` (rename control) | only `bell_verification` renamed | 1 rejection left, shots=300, which revealed row 7 (`pc-rename-control.log`) |

Scoped null: within qollab-caps, a JS `backend.run` plus the Python one does not fire `backend-run-count`, because the count rule counts JS sites only. Overall it is still red, because `backend-run-python` fires on the Python site. So for this tree the null is not exploitable.

## What I changed (commits)
- `ab2ea6f`: merge of main. Conflicts in `vault/Map.md` and `vault/Reports/README.md` were resolved with `node scripts/vault-hubs.mjs` (`--check` was current at the merge).
- `7c72712`: `evidence/quantum/main-sync/` (logs, two small harnesses, README) and `vault/Reports/quantum-vs-contracts-v2.md`. Hubs are now STALE for that one new note. Per the brief I left them for the loop to regenerate.
- No `echo/quantum/*.py`, `echo/tests/*`, bridge.js or platform file was edited.
- `git diff --stat main...HEAD`: 151 files, all under `echo/quantum/`, `echo/tests/`, `evidence/` or `vault/`. Of these, `evidence/physics-review/` and `evidence/quantum-core/` are earlier quantum-lane evidence that was already on integration.

## What I did NOT do or could not verify
- Nothing ran in Pyodide or on Qollab.
- bridge.js was not executed in a browser this round, so rows 9–11 are from reading code.
- Hardening was graded from `git archive` copies, with main's contracts.js dropped in. I did not merge it.
- The brief names hardening head 0893403, but the branch is now at 2ac6c6c (evidence plus wording). I graded both, and the results are identical.

## Decisions inferred from the docs
- I judged engine conformance with contracts.js's exported validators rather than with contract-check. Brief, "what has not worked": measure against platform's real validator.
- I put bridge.js gaps under "bridge.js", not platform. The source is the lane-ownership note in bridge.js's header ("quantum-owned, imported by platform's main.js").
- I did not commit hub regeneration for my new note. The source is the worker rules: "Never edit or commit the generated files".

## Questions for the owner
None.

## What the supervisor should do next
1. Merge `lane/quantum/quantum-hardening` (2ac6c6c) into this branch. That closes rows 6 and 8 and turns `test_contract_conformance` green. Re-run `validate.mjs` and `validate_teleport_v2.mjs` after the merge.
2. In the same hardening follow-up, fix row 7: pin `parameters.shots` to `BACKEND_SHOTS` requested and keep the drift in `facts`. Rows 4–5 also need fixing. Either the test file stops spelling `ionq_*`/`api_key` literally, or the supervisor rules that host-only tests do not ship in `echo/`. Moving them is a lane-ownership question.
3. Brief the bridge rewire on rows 3, 9, 10 and 11 together: one JS `backend.run` in bridge.js, the two-phase `{theta, phi}` API graded by v2's phase validators, and hardening's renamed or re-signed functions.
4. Rows 1–2 are platform's (main.js and index.html are not on main). qollab-caps cannot go GREEN on any quantum branch until they land.
