=== PLAN ===
**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`) that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`, with a local runner in `tools/` and `QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Sat 00:30. G1 Sat 04:00 · G2 Sat 17:00 (else the one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- shared-contracts, echo-caps-gate, g0-runner-smoke, contracts-v2 (landed), contracts-pin-thresholds, contracts-fidelity-band, integration-shell, readme-and-video-draft.
- G0 on real Qollab (overseer, built-in sim): steps 1–5 PASS.
- **c11 `contracts-moments-and-land`: MERGE, and LAND `contracts-land`.** My own checks:
  - `git diff --stat main...lane/platform/contracts-land` lists only `echo/contracts.js`, `echo/CONTRACTS.md`, `tools/contract-check/{check.mjs,sabotage.py}`;
  - merge-tree is clean both ways;
  - my own `git archive` extract: GREEN 1206/1206;
  - setting `FIDELITY_PASS` to 0.9 on the extract goes RED (exit 1);
  - commit 88cd09b carries `MOMENT_EVENTS` and `countdownRemaining`.

**In flight:**
- `g0-input-diagnostic`: `diag.js`, auto-send, keep-alive. It is the only worker editing `main.js` and must rebase onto integration before merge.
- `release-upload-manifest`: an upload-mode assembler, caps checked on the upload tree, and a cross-lane blocker table.
- `contracts-commit-result` (new): the story-commit result validator plus the commit parameter names. This is red-team fix (a), the last platform contract blocker.

**Decision (autonomous, recorded in LEARN): ONE `backend.run` site.** It is the JS call inside quantum's `echo/quantum/bridge.js` `verifySelectedBackendOnce(backend)`. Python only builds the circuit and interprets counts; it never calls `backend.run`. `main.js` calls `bridge.js` and holds no `backend.run` of its own. The overseer relays this to quantum.

**Next:**
1. Judge `g0-input-diagnostic` once rebased. Then the overseer re-runs G0 steps 6–7.
2. Judge `contracts-commit-result`. Then refresh a contracts-only landing branch from main and LAND it.
3. Caps fixes (red-team item 10), once a slot is free:
   - the false positives on test files that assert absence (moot once `tests/` is excluded from the upload, but fix the rule anyway);
   - the destructured / aliased / `getattr` `backend.run` nulls.
4. After quantum's `bridge.js` and the gameplay field rename land: assemble, run the runner check, run caps on the upload tree.
5. G2 wiring of gameplay's scene and controller and story-ui's OPENING into `main.js`, by one `main.js` worker after the diagnostic merges.
6. Final README pass: fix "drag to look", the dangling placeholders, and re-audit the claims.

**Risks:**
- Iframe keyboard focus is unproven.
- The `Done.` lifecycle is not yet on integration.
- `main.js` serialisation.
- Cross-lane convergence for G2 (real-output quest walk stalls ×4).
- The quantum story-token state is still missing (quantum's lane).
=== END PLAN ===

=== MERGE branch=lane/platform/contracts-moments-and-land ===
=== LAND branch=lane/platform/contracts-land ===

=== AGENT name=contracts-commit-result model=opus base=lane/platform/integration ===
**GOAL.** The final COMMIT result must have a contract. Today a story commit with fidelity 0.9, or with m0/m1 swapped, counts as "valid". That is because `echo/contracts.js` validates the two dry-run phases but has nothing for the one story commit. Gameplay and quantum also disagree on how the commit names its state: gameplay expects `parameters.stateId == 'story_token'`, quantum emits `parameters.state`. The real-output quest walk therefore stalls at the last step, and the token ends `measured_refused`. A player who does everything right must reach the ending. A forged or wrong commit must never be accepted.

**VISION.** Vision §7.4 sets the rules for the commit:
- the story token is consumed exactly once;
- the bits are m0 (source readout) and m1 (local Bell-half readout);
- the receiver applies X iff m1=1 and Z iff m0=1;
- fidelity ≥ 0.999999.

There are also two owner rulings:
- 2026-10-10 gameplay consult 3: the commit is one atomic local exact call; the token is marked consumed only on success; it is latched once the result is recorded.
- The red-team physics-code-audit relay: ONE ExperimentResult shape, owned by platform.

**WHAT WE ARE BUILDING.** In `echo/contracts.js` and `echo/CONTRACTS.md` only, plus `tools/contract-check/`:
- a `validateCommitResult(res)` (name it after the existing `validateTeleport*` style). It checks:
  - the ExperimentResult shape;
  - `experiment: 'teleportation'`;
  - an explicit story-token marker. Pick one name, `parameters.stateId === 'story_token'`, and export the id as a constant;
  - `measurementBits` m0/m1 in {0,1};
  - the applied corrections equal `expectedCorrections(m0, m1)`;
  - fidelity is a number with `≥ FIDELITY_PASS − FIDELITY_EPSILON` for a success;
  - no counts on an exact result.
- a `commitVerdict` if that helps gameplay, reusing `dryRunVerdict`'s logic rather than copying it. Note that no-bloat applies: search `dryRunVerdict`, `validateTeleportCorrectionResult` and `expectedCorrections`, and extend them. Do not fork.
- a Migration row in CONTRACTS.md naming exactly what gameplay and quantum must change.

Then cut a fresh contracts-only branch `lane/platform/contracts-land-2` from `main`. Main now carries contracts-land, or cut it from `lane/platform/contracts-land` if that has not landed yet. Put the same contract and gate commits on it, so it can LAND.

**WHAT HAS NOT WORKED.**
- `contract-check` was GREEN 1087/1087 while never seeing engine output (red-team 0005 §11).
- A pinned constant with a redundant guard hid a loosened value (my consult 5).
- A guard equal to its band refused the band's edge (law 12, fidelity-band).
- Gameplay tests passed only on a fake adapter.

Grade with real engine output. Red-team's fixtures are under `evidence/red-team/` on `lane/red-team/integration`; the commit JSON is `out/teleport_v2_*.json`. Quantum's `dump_results.py` output may also be on `lane/quantum/integration`. Read them with `git show`. Do not edit other lanes' files.

**Vault notes to read:**
- `vault/Reports/contracts-v2.md`, `contracts-fidelity-band.md`, `contracts-moments-and-land.md`;
- `lanes/red-team/reports/0005-cross-lane-recheck.md` (items 5 and 10, and the sabotage rows `fidelity_0_9_commit` and `m0m1_swapped_commit`);
- `.claude/rules/gate-independence.md`, laws 3, 5, 12 and 15;
- `lanes/platform/rulings.md`.

**Where to start.** Write the gate cases first and watch them go RED on today's contracts:
- a valid commit passes;
- fidelity 0.9 fails;
- m0/m1 swapped with rule-inconsistent corrections fails;
- a missing story-token marker fails;
- an exact result carrying counts fails.

Then implement. Add sabotage.py cases for each guard: drop the fidelity check, drop the correction check, drop the marker check. Report the nulls.

**Deliver:**
- commits on `lane/platform/contracts-commit-result`;
- `lane/platform/contracts-land-2`, where `git diff --stat main...` shows contract/gate files only;
- evidence in `evidence/platform/contracts-commit/` (commands, exit codes, logs);
- `vault/Reports/contracts-commit-result.md`.

**How I will judge.**
- My own `git archive` extract of both branches: GREEN.
- My hand-mutated copies go RED: commit fidelity 0.9, swapped bits, the marker removed.
- `merge-tree` clean.
- Real engine commit output validates, or the exact field mismatch is named as a cross-lane request.

**Report** to `lanes/platform/reports/`. It opens with a Vault check, then a checkpoint within 1 h. Include the nulls, decisions inferred from the docs (with citations), and cross-lane requests for gameplay and quantum. Do not touch `main.js`: another worker owns it. No port needed.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 11: I merged `contracts-moments-and-land` and landed `contracts-land` (5a90cdf). My own checks:
- `main...` diff covers only the contract and gate files;
- extract GREEN 1206/1206;
- `FIDELITY_PASS` 0.9 is RED;
- merge-tree clean.

Note: `diff --stat integration...moments` in the consult digest did not show `echo/contracts.js`, but commit 88cd09b does carry it (`git grep MOMENT_EVENTS`). Verify file content with `git grep` and not only the stat digest.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 11: I decided the ONE `backend.run` site under autonomous mode (red-team 0005 item 7: the lanes hold opposite designs). The site is the JS `backend.run` inside `echo/quantum/bridge.js` `verifySelectedBackendOnce(backend)`, with its guard claimed before the first await. Python builds the circuit and `interpret_counts` only. `qollab_job.py`'s Python `backend.run` (`run_bell_verification_once`) is deleted. `main.js` calls bridge.js.

Grounds:
- the owner ruling "exactly one guarded backend.run site (echo/quantum/bridge.js)";
- QOLLAB_DEPLOYMENT one-job rule plus the measured fact that a plain Python call on IonQ fails with an XHR error;
- JS-side job accounting is visible to the runner and to the caps rule `backend-run-python`.

The overseer must relay this to quantum. Caps still needs to catch the destructured, aliased and `getattr` forms (red-team item 10).
=== END LEARN ===
