# 0011 contracts-commit-result — FINAL

## TL;DR
- DONE. The story commit now has a contract: `validateCommitResult(res)` + `STORY_TOKEN_ID = 'story_token'` in `parameters.stateId` (`echo/contracts.js`, `echo/CONTRACTS.md` § The one story commit + Migration row).
- Gate written first: 55/1264 FAIL on the old module (`check_red_before_impl.txt`), GREEN 1264/1264 after; sabotage 101 cases, 0 mismatches, 10 declared nulls.
- Branches: `lane/platform/contracts-commit-result` d6939d5 (contracts) + 595c3c3 (evidence/vault). `lane/platform/contracts-land-2` ae39421 = main 19072fb + the one contract commit; `diff --stat main...` = 5 contract/gate files; merge-tree clean; archive extracts of both branches GREEN.
- Real engine (quantum c3adf0a `live_commit`, 4 bit branches): **0/4 valid**. The exact mismatch is `parameters {state:'token'}`; it should be `{stateId:'story_token', applyX, applyZ}`. With that 2-line change applied to a disposable copy: **4/4 valid**. With the engine's rule swapped: refused (F=0.2065).
- Hand-mutated copies of valid engine output: fidelity 0.9 RED, bits swapped RED, marker removed RED (`handmut.txt`).
- Recommend: LAND `contracts-land-2`, then send the quantum and gameplay requests below.

## Vault check
- **Read:**
  - `lanes/platform/context.md`
  - `vault/Reports/contracts-fidelity-band.md`
  - `lanes/red-team/reports/0005-cross-lane-recheck.md` (§3, §5, §9, sabotage rows)
  - `echo/CONTRACTS.md`, `tools/contract-check/{check.mjs,sabotage.py,fixtures.json}`
  - quantum `teleportation.py` / `__init__.py` on `lane/quantum/integration` c3adf0a
  - gameplay `missionRules.js` / `state.js` on `lane/gameplay/integration` 7c4741b
- **Already known:**
  - no commit validator (red-team §5);
  - the marker names disagree;
  - `fixtures.json` used `stateId/correctionX` (red-team §9).
- **Reused:**
  - `expectedCorrections`;
  - `checkDryRunResult`, generalised to `checkTeleportResult`;
  - the dry-run verdict's rule and band, extracted into one `judgeCorrections` that `dryRunVerdict` and the commit both call;
  - the Qiskit oracle rows in `teleport-fixtures.json` as ground truth;
  - `FIDELITY_PASS` / `FIDELITY_EPSILON`.
- **Stale:**
  - red-team's `teleport_v2*.json` commit dumps predate `live_commit()` (they show `ValueError: unknown prepared state 'story_token'`), so I dumped the current engine myself;
  - `contracts-land` has already landed (main 512b54a), so land-2 was cut from main.

## What I found
- Quantum's `live_commit` now exists and is correct physics: F = 1.0 on all 4 branches, and a second call raises `TokenAlreadyConsumed`. But it does not satisfy the new contract:
  - it names the state `parameters.state = 'token'`;
  - it reports the applied corrections only in `facts` text, not in `parameters`.
- Gameplay keeps its own `STORY_TOKEN_ID` and `expectedCorrections` (a fork) and reads `parameters.correctionX/Z`.

## What I changed
- `d6939d5`, contracts and gate:
  - **New exports:** `STORY_TOKEN_ID` and `validateCommitResult`.
  - **Renames (internal):** `checkDryRunResult` → `checkTeleportResult(req|null)`, with 0 refs left to the old name. New internal `judgeCorrections`.
  - **New refusal:** a dry-run result carrying the token marker.
  - **`check.mjs`:** 58 new checks:
    - 16 rule-following Qiskit commits accepted;
    - 12 wrong corrections refused at F=1;
    - 15 named mutations;
    - 5 junk inputs;
    - 6 floor probes;
    - 2 dry-run marker refusals;
    - export list updated.
  - **`sabotage.py`:** dry-run anchors re-pointed to the judge, plus 14 new cases.
  - **`fixtures.json`:** `stateId/correctionX/Z` → `state/applyX/applyZ`.
- `595c3c3`: `evidence/platform/contracts-commit/` (README tables each command and its exit code) and `vault/Reports/contracts-commit-result.md`.

## Evidence
All in `evidence/platform/contracts-commit/`:
- `check_red_before_impl.txt`, `check_green.txt`
- `sabotage.txt`
- `archive_check.txt`, `land2_mergetree.txt`
- `engine_commit_c3adf0a*.json` and `validate_engine_*.txt`
- `proposed_quantum_patch.diff`
- `handmut*.json`, `handmut.txt`

## Nulls (sabotage that did NOT go red, all declared)
- Commit: dropping the applyX/applyZ boolean check, or the fidelity-present check. Both are equivalent mutants: the rule and floor checks below them still refuse.
- Dry-run verdict ignoring the rule, or ignoring the fidelity. Equivalent, because the 1e-6 cross-check sits in front.
- Judge `>=` → `>`. Equivalent.
- Hand-swap of m0/m1 on bits 00/11 is the identity, so 2/4 of `handmut_bits_swapped` stay valid. This is physics, not a gap.
- **Closed:**
  - the two old dry-run nulls ("verdict ignores the rule", "literal 0.9") are now RED, through the shared judge on the commit;
  - red-team rows `fidelity_0_9_commit` and `m0m1_swapped_commit` are now covered by probes and by sabotage rows 'commit drops the fidelity/correction check'.
- **Still null:** the 5 pre-existing declared nulls outside my scope (ANIMATION_END source, default volume, world-change rename, Map hint, countdown comment) are unchanged.

## What I did NOT do or could not verify
- I did not run red-team's own harness (`teleport_v2_check.mjs`, quest walk) against the new contract. The quest walk needs gameplay's and quantum's migrations first.
- `tools/contract-check/browser.html` does not show the commit yet. Its existing API still works.
- I did not touch `main.js` or any other lane's files.
- The engine patch was only applied to a `/tmp` copy.
- I did not regenerate the vault hubs. `vault-hubs --check` reports Map.md STALE, as expected; the loop does that.
- `merge-tree main` vs the WORK branch conflicts:
  - on the contract files, because main carries them as squash 5a90cdf;
  - on the vault hubs, which already conflicted at base 32838bc.
  The work branch merges cleanly into `lane/platform/integration` (exit 0). `contracts-land-2` is the landing vehicle.

## Decisions inferred from the docs
- **No `commitVerdict`.** With the rule enforced, F = 1 for every state (§7.1/§7.4 algebra), so there is no "valid but failed" commit. A verdict would be `errors.length === 0` under a second name (no-bloat). Gameplay reads `validateCommitResult(r).length === 0`.
- **F < band is a contract error, not a failed attempt.** §12.3 forbids fabricated success; the owner ruling (consult 3) says the token is consumed only on success. Gameplay's existing `measured_refused` path handles it.
- **The commit must report `applyX/applyZ` in `parameters`.** §7.1 requires the corrections to be checked; facts text is not machine-readable, and the brief requires that "applied corrections equal expectedCorrections".
- **Token angles forbidden on a commit.** Owner ruling "token fixed + hidden" (red-team 0005 §3); the quantum docstring says the same.
- **`seed` allowed.** Parameters are free-form in §8.4, and a seed reveals nothing about the token.

## Cross-lane requests
- **quantum** (`echo/quantum/teleportation.py`): in `live_commit`, use `parameters={"stateId": "story_token", "applyX": rule["applyX"], "applyZ": rule["applyZ"], (+"seed")}` instead of `{"state": "token"}`. The exact diff is `evidence/platform/contracts-commit/proposed_quantum_patch.diff`, and it makes 4/4 real commits validate. Ideally import nothing from JS; the value `'story_token'` is the contract.
- **gameplay** (`echo/game/missionRules.js`):
  - import `STORY_TOKEN_ID` and `expectedCorrections` from `../contracts.js`, and delete the local copies;
  - `TELEPORT_DRY_RUN_PASSED` → `validateCommitResult(r).length === 0 ? COMMIT_TRANSFER : none(errors)`;
  - read `parameters.applyX/applyZ`, not `correctionX/Z`;
  - the dry-run rule should use `dryRunVerdict(req, r).unlocksCommit`.

## What the supervisor should do next
1. Judge `lane/platform/contracts-land-2` (ae39421): `git archive` → `node tools/contract-check/check.mjs` and `python3 tools/contract-check/sabotage.py` (both exit 0 here). Then LAND it. It is clean on main 19072fb.
2. MERGE `lane/platform/contracts-commit-result` (d6939d5 + 595c3c3) into `lane/platform/integration` (merge-tree exit 0).
3. Relay the two cross-lane requests above to quantum and gameplay via their `owner-answers.md`. After both migrate, ask red-team to re-run the real-output quest walk: the commit step should now pass.
