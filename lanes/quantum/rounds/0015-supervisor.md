=== PLAN ===
**Lane goal:** G1, plan row 4, due Sat 2026-10-10 04:00 ET. It is now Sat 00:56 ET, so about 3 h remain.
- The engine in `echo/quantum/*.py` plus `echo/quantum/bridge.js` must return contract-v2-valid results that the real game can consume.
- Tests go in `echo/tests/`. Proof comes from the local runner (Pyodide), then from Qollab through the overseer.

**Done (integration 807cc39, plus backend-site-research merged this consult)**
- Merged so far: backend-job, quantum-core, physics-review, contract-conformance, pyodide-bridge, ionq-sim-rehearsal, main-sync, integration-catchup, quantum-hardening, tests-caps-clean and bridge-rewire.
- Consult 13 measurements: round.sh 81/81 ×3, pytest 595, contract-check 1087/1087, caps RED 3 (entry-index and entry-main belong to platform; backend-run-python is row 3).
- backend-site-research is merged (evidence and the vault note `vault/Research/backend-run-site.md` only; `merge-tree` was clean and no `echo/` file changed). It recommends Option A: JS submits the job, and Qollab's real one-job guard is the frame's `fetch` override.
- engine-bridge-review (final) found the physics correct: 715 numbers against an independent numpy derivation, worst difference 4.98e-11, on host and in Pyodide. It also found two seam BLOCKERS, and I confirmed both against main's contracts.js:
  - **B1:** `live_commit` emits `parameters {"state":"token"}`. `validateCommitResult` (contracts.js:520–535) needs `{stateId:"story_token", applyX, applyZ}`. Screenshot `renders/engine-bridge-review/01-…png` shows the rejection after the token is already consumed.
  - **B2:** cloning results have no top-level `fidelity`. Contracts allow it (contracts.js:197, 320), and gameplay's Mission 1 rules need it.

**Running**
- **backend-site-move** (row 3, Option A). Checkpoint on cb4ab4c: 90/90; separate spies read JS=1 and Python=0; runner counter 1; caps RED only on entry-index and entry-main; pytest 595. It is now in its sabotage round. My concern about the spy label is answered by the separate spies; I still verify them on merge.
- **engine-bridge-review**: final report written. It may still be committing its vault note; no action needed.
- **commit-seam-fix** (new): B1, B2 and S1 first, then S5, then S3 and S4. Its gate is the reviewer's `seam.mjs`, which must go from 7/13 to 13/13.

**Next**
1. Judge backend-site-move on a disposable merged copy (`commit-tree` + `worktree add --detach`). I need to see:
   - caps RED only on entry-index and entry-main;
   - JS spy = 1 and Python spy = 0 across verify ×2, RESTART and verify again;
   - the X-on-q0 control decoding q0 = 1;
   - round.sh green, the fault control green and the sabotages red;
   - pytest and contract-check green.
   I also check that a low-agreement control result does not read as "correlation confirmed": `status` may only mean "the job completed", with the agreement in the facts.
2. Judge commit-seam-fix the same way, plus seam 13/13. It must also merge whichever of the two lands second, and re-run on the combined tree.
3. Propose row 4 DONE with the runner evidence. Then ask the overseer for a Built-in smoke run of the merged build on Qollab.
4. **Cross-lane relay, through the overseer:**
   - main.js imports bridge.js and uses its signatures.
   - RESTART calls `resetStoryToken()`.
   - main.js has no `backend.run` of its own, and drops `build_bell_verification_circuit`.
   - The upload strips `__pycache__`.
   - gameplay's `fakeQuantum.js` and `missionRules.js` follow the bridge and contract fields: commit `stateId/applyX/applyZ` and cloning `fidelity`. Gameplay's `integration` branch still reads `correctionX/Z`.
   - The runner's counter cannot see Python-side runs (moot after Option A).

**Risks**
- G1 margin: if row 3 and B1/B2 have not merged by 03:45 ET, report G1 PARTIAL and name the open rows.
- commit-seam-fix and backend-site-move both edit `bridge.js`, in different functions, and different `.py` files. Conflict risk is low but real, so whichever lands second merges and re-runs.
- The hubs and the Index keep conflicting on merge. Regenerate them; never pick a side.
=== END PLAN ===

=== MERGE branch=lane/quantum/backend-site-research ===

=== AGENT name=commit-seam-fix model=opus base=lane/quantum/integration ===
**GOAL.** A player who finishes the rooftop puzzle on the real engine sees the story commit accepted and the city restored, and a player at the replication booth can pass Mission 1. Today both fail on real engine output, even though every physics number is right.

**VISION.** ECHO teaches no-cloning, no-signalling and teleportation through real Qiskit (vision §7, §10.3–10.7). The story token is consumed ONCE, at the final commit (CLAUDE.md). A wrong correction must never be described as a successful delivery (§2.4, §7.5).

**WHAT WE ARE BUILDING.** `echo/quantum/*.py` (the engine) and `echo/quantum/bridge.js` (the one JS↔Python seam), consumed by platform's `main.js` and gameplay's quest rules. They are validated by the platform-owned `echo/contracts.js` v2 on `main`.

**WHAT HAS NOT WORKED.**
- Lane tests went green on our own field names while the contract wanted different ones. The conformance tests used `validateExperimentResult` and never `validateCommitResult`, so B1 shipped.
- Earlier, gameplay tests passed on a fake adapter while 12 of 13 real-output checks failed (vault/Index promoted lessons).
- Do not "fix" this by editing contracts.js or gameplay; they are not ours.

**The defects** (engine-bridge-review, `lanes/quantum/reports/0013-engine-bridge-review.md`; read it in full):
- **B1:** `live_commit` emits `parameters {"state":"token"}`. contracts.js `validateCommitResult` (main, lines 520–535) requires `parameters.stateId === STORY_TOKEN_ID ("story_token")` plus boolean `applyX` and `applyZ`, the corrections the receiver actually applied by the rule. It also requires a finite `fidelity` ≥ FIDELITY_PASS. The commit result must pass `validateCommitResult` as well as `validateExperimentResult`.
- **B2:** cloning results carry the joint fidelity only as `observables.jointFidelityWithTwoCopies`. Add a top-level `fidelity` equal to that value; contracts.js:197 and 320 allow it. Derive it from the computed state, never from the state name.
- **S1:** `bridge.js` `commitTransfer` un-latches after Python has already consumed the token. Validate with `validateCommitResult`. A rejection after Python ran must be reported honestly as "token consumed" and must not offer a retry; only a failure before Python consumed the token may be retried (owner ruling: "token marked consumed only on success; on error, honest error + retry; latched once recorded").
- **S5:** "the only copy is at the receiver" is printed even after a wrong correction. The wording must depend on the computed fidelity.
- **S3/S4** (second priority): the FTL guard misses "faster-than-light" (normalise hyphens and spaces before matching), and add a test that pins the m0/m1 label text to contracts' `BIT_LABELS` and the ruled "LOCAL BELL-HALF READOUT m1".

**Scope fence.** Another worker (backend-site-move) is editing `qollab_job.py`, `test_qollab_job.py` and `bridge.js` `verifySelectedBackendOnce`. Do NOT touch those. You own `cloning.py`, `teleportation.py`, `formats.py` if needed, `bridge.js` `commitTransfer` and the token code, and the matching tests.

**Vault notes to read first:** `vault/AGENTS.md`, `vault/Index.md`, `vault/Reports/quantum-hardening.md`, `vault/Reports/bridge-rewire.md`, `vault/Reports/contracts-v2.md`, `echo/CONTRACTS.md` § "The one story commit" (on main), and `lanes/quantum/rulings.md`. Your report opens with a **Vault check**.

**Where to start.**
1. Re-run the reviewer's seam check from `lane/quantum/engine-bridge-review` (`evidence/quantum/engine-bridge-review/seam.*`, see its README). It must be RED (7/13) on your base. Save that output as red-before.
2. Write your own checks first, and watch them fail:
   - commit result passes `validateCommitResult` using the real contracts.js from `main`;
   - cloning |0>/|1> give `fidelity` ≥ FIDELITY_PASS, and |+> and the phase state give `fidelity` < FIDELITY_PASS;
   - after Python consumes the token and validation then fails, the JS bridge stays latched as consumed;
   - a wrong-correction fact never claims delivery.
3. Fix the defects. Delete `{"state":"token"}` and every reader of it (no-bloat).

**Deliver.**
- Commits on `lane/quantum/commit-seam-fix`.
- seam check 13/13.
- pytest `echo/tests` green with `PYTHONDONTWRITEBYTECODE=1`, and no test weakened or deleted.
- `node tools/contract-check/check.mjs` green.
- `node tools/qollab-caps/check.mjs` no worse than base: entry-index, entry-main, plus backend-run-python unless row 3 has landed.
- The full Pyodide runner round (`PB_PORT=<your own free port> bash evidence/quantum/pyodide-bridge/round.sh`), green, with the fault control green.
- A runner screenshot of the commit *accepted* by `validateCommitResult`, with "LOCAL RUNNER" visible.
- A sabotage round on a disposable copy: revert each fix one at a time and show each check going red. Report the nulls.
- Evidence goes in `evidence/quantum/commit-seam-fix/` with a README. The vault report goes in `vault/Reports/commit-seam-fix.md`.
- Before the final report: `git merge lane/quantum/integration` (it may then contain backend-site-move), regenerate the hubs and the Index (`node scripts/vault-hubs.mjs`, `python3 scripts/gen-subject-index.py`, both with `--check` exit 0), and re-run every gate on the merged tree.

**How I will judge it.** I re-run all of the above on a disposable merged copy. Claims without artifacts are rejected. A seam that is green only on your fixtures, and not on the reviewer's script and the real contracts.js, is rejected.

**Report.** `lanes/quantum/reports/<n>-commit-seam-fix.md`: TL;DR, Vault check, commands with exit codes, evidence paths, nulls, what was not done, and decisions inferred from the docs. Write a **checkpoint within 1 h**; the final is due by 03:15 ET at the latest. Label everything "local runner", never Qollab.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 15: B1 (commit `parameters {"state":"token"}` against the contract's `{stateId:"story_token", applyX, applyZ}`) got through 595 tests and 1087/1087 contract-check. The reason: our conformance tests only ever called `validateExperimentResult`, and contracts v2 has per-phase validators (`validateTeleportBitsResult`, `validateTeleportCorrectionResult`, `validateCommitResult`). Every emitter must be checked with the most specific validator for its phase. A generic-shape pass is not conformance. Evidence: `renders/engine-bridge-review/01-pyodide-probe-commit-rejected-by-contract.png`, `evidence/quantum/engine-bridge-review/seam.out` (7/13).
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 15: I relaxed the ".py workers run one at a time" rule for commit-seam-fix alongside backend-site-move. The reason is the G1 clock (3 h left), and their files do not overlap: the fix owns cloning.py, teleportation.py and commitTransfer; the move owns qollab_job.py, test_qollab_job.py and verifySelectedBackendOnce. Both touch bridge.js, but in different functions. Mitigation: whichever lands second merges integration and re-runs the full round. If merge-tree conflicts in bridge.js, a short catch-up worker resolves it. I never resolve it by picking a side.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 15: I merged backend-site-research without a re-run. That was safe because it is evidence and vault only: `git diff integration...branch -- echo/` was empty and merge-tree exited 0. Its conclusion stands as research, not proof: Qollab's one-job guard is the frame's `fetch` override (`rewriteIonqRequest`), found by reading shipped JS and never observed firing. Option A needs no caps exemption. My earlier "spy reads 1 under Option A" worry was a single combined spy. backend-site-move's checkpoint uses separate spies (JS=1, Python=0), which is the measurement row 3 is judged on.
=== END LEARN ===
