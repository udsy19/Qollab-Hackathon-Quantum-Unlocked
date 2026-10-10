## TL;DR
- **Merged, clean.** `lane/quantum/integration-catchup` @ bdb6261 = integration (bfcfbc3) + `lane/quantum/main-sync`. Only `vault/Map.md` and `vault/Reports/README.md` conflicted, and I regenerated both.
- `git merge-tree --write-tree lane/quantum/integration HEAD`: exit 0 (clean).
- `vault-hubs.mjs --check`: exit 0. `gen-subject-index.py --check` was STALE after the merge; I regenerated `vault/Index.md`, and the check now exits 0.
- **contract-check: GREEN** 1087/1087, exit 0. **qollab-caps: RED**, 6 failures, exit 1 (entry-index, entry-main, backend-run-python, hardcoded-backend, hardcoded-secret). **pytest: 452 passed, 1 failed**, exit 1 (`test_contract_conformance`, 9 `bell_verification` hits in the log). All three match the expected numbers; no deviation.
- `git diff lane/quantum/main-sync HEAD -- echo/` is **empty**. `integration` vs `main-sync` in `echo/` differs only by `echo/contracts.js` and `echo/CONTRACTS.md`, so the main-sync tree already held integration's echo work.
- Evidence: `evidence/quantum/integration-catchup/` (README + 3 logs). Recommend: merge hardening next.

## Vault check
- Read: `vault/AGENTS.md` (hook), `lanes/quantum/reports/0007-main-sync.md`. I did not open `vault/Reports/quantum-vs-contracts-v2.md` in full; I compared the gate counts to 0007's TL;DR and gap rows 1–6, which cite it.
- Already known: the 6 caps findings (gap rows 1–5) and the single `bell_verification` pytest failure (row 6). Both reproduced exactly.
- Reused: main-sync's merged tree and its evidence. I wrote no new code.
- Stale: nothing found.

## Commands and exit codes
- `git merge lane/quantum/main-sync`: conflicts in `vault/Map.md` and `vault/Reports/README.md` only.
- Resolution: I ran `git checkout --theirs` on those two files only as a starting point to remove conflict markers, then `node scripts/vault-hubs.mjs` (exit 0, 2 files updated). No conflict markers remain (grep count 0). `--check` then exits 0, so the committed hubs are the generated output.
- `python3 scripts/gen-subject-index.py --check`: STALE. After `gen-subject-index.py` rewrote `vault/Index.md`, the check exits 0.
- The three gates ran from the worktree root: contract-check exit 0, qollab-caps exit 1, pytest exit 1.
- `git diff --stat lane/quantum/integration...HEAD`: 115 files changed. It includes `echo/contracts.js`, `echo/CONTRACTS.md`, `tools/contract-check/`, `tools/qollab-caps/` with its fixtures, the `evidence/quantum/main-sync/` files and the contracts-v2 reports.
- The vault-hubs and gen-subject-index exits above were read from `$?` or the tool's own message, not saved as log files. The three gate logs are saved.

## Evidence
`evidence/quantum/integration-catchup/{README.md,contract-check.log,qollab-caps.log,pytest.log}`. These are local-runner results, not Qollab.

## Not done / not verified
- I did not enumerate the 6 caps findings line by line against `vault/Reports/quantum-vs-contracts-v2.md`. I matched the rule names, the count and the "RED: 6 failures across 5 rules" line.
- I did not sabotage anything. This was a merge only, and the gates' own sabotage is in main-sync's evidence.
- `__pycache__` appears under `echo/` after pytest. It is untracked; the merge commit's `git add -A` did not pick it up (`echo/` tracks 17 files).

## Decisions inferred from the docs
- Regenerating the hubs and `vault/Index.md` in the merge commit follows the brief steps 2–3. Committing the Index in this branch contradicts the worker rule "never commit generated files", but the brief explicitly orders regeneration. The supervisor can drop that file if the loop owns it.

## Next
Merge `lane/quantum/integration-catchup` into integration. Then merge hardening (fixes gap rows 6 and 8), then the bridge rewire (rows 3, 7, 9, 10, 11).
