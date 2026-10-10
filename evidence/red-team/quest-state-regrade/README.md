# quest-state-regrade: can the player's quest still be broken the consult-6 ways?

Red-team re-grade of the quest machine at **gameplay `7c4741b`** (`echo/game/`) composed with **platform
`f08dd0b`** (`echo/contracts.js`), fed **real quantum `f7efb92`** results. It compares against the 0003
baseline, d5ec620 + 6378677, on the same harness. The report is `vault/Reports/quest-state-regrade.md`.
Everything here is **local Node module-level**: no browser, no local runner, no Qollab.

## Run it

```bash
bash evidence/red-team/quest-state-regrade/reproduce.sh [--repo <clone>] [--regen] [--no-sabotage]
# --regen needs PY=<python with qiskit>; refs overridable: GP PF QU OLD_GP OLD_PF
```

It works from a `git archive` export of this branch. The product trees always come from `--repo`. It
exits 0 when every check matches the committed baseline check by check, the sabotage round is 27/27 as
expected, coverage is 34/34, and the audited export is byte-identical afterwards. It exits 1 on any
mismatch, and 2 when it refused.

## Files

| file | what it is |
|---|---|
| `../quest-state-audit/expected.mjs` | The expected table. It is **unchanged** since ebed844, written from V§9 and the rulings before any code was read. |
| `../quest-state-audit/oracle.mjs` | The JS statevector oracle (vs Qiskit: `crosscheck.py`). It is not forked. Here it re-derives every fed fidelity (`ENGINE-ORACLE`). |
| `../quest-state-audit/run.mjs` | The harness. Its adapter now walks both APIs: old sync `send()`, and the migrated `experiment()`, `commitTransfer()`, `resultPanelShown()`, tickets and `resetGame()`. `commitTransfer()` is the only route to COMMIT on the migrated API. There are 13 new checks (34 in all). |
| `../quest-state-audit/sabotage.mjs` | The disposable-copy runner. It now takes `--scenarios`, `--results` and `--out`, and reports per-check coverage. |
| `dump_regrade.py` | Real engine results. It runs `physics-code-audit/dump_results.py` unchanged, plus every teleport branch and choice, the clones, Bell results, 16 live commits and 48 phase-1 bit samples. |
| `scenarios-7c4741b.mjs` | 19 breaks (2 of them null probes), 7 minimal fixes, F-ALL, and 7 leave-one-out. |
| `probe_contract_seam.mjs` | A one-off probe, not a gate. It asks whether the contract's two-phase validators accept the raw engine results. |
| `out/baseline-*.txt/json` | 7c4741b+f08dd0b: 27/7 · d5ec620+6378677: 15/19 · 7c4741b with its own contracts copy: 25/9. |
| `out/sabotage.txt/json` | 27/27 as expected; every check went red at least once. |
| `out/real-results-f7efb92.json` | The engine output that was fed in. A re-dump matches except the unseeded 256-shot backend counts, which no check reads. |
| `out/audited-export.sha256` | Hashes of the audited composition. They match the git blobs of 7c4741b and f08dd0b. |

## Independence

- **Expected transitions** come from `expected.mjs` only. The tables are read only to widen the set of probed events.
- **Results are the engine's.** `seam()` is names-only. It adds `stateId`, `correctionX/Z` (copied from
  `applyX/Z`, or from the rule for `live_commit`, which applies the rule inside the call) and the clone's
  top-level `fidelity` (copied from `observables.jointFidelityWithTwoCopies`), and creates no number.
  `PLAYTHROUGH-RAW` feeds the results unaliased.
- **The one trusted seam:** the field names in `missionRules.js`'s header.
- **Machine-side counting:** the harness counts how often the machine invoked the `run` closure it was
  handed. On the old API, the terminal measures before the FSM judges, so every attempt counts.

## Nulls

- **N-EPOCH-TICKET:** dropping only the epoch compare in `isCurrent()` turns nothing red. `seq` is
  monotonic across sessions, so stale tickets stay stale. The epoch compare is redundant there; it bites
  only in `commitTransfer()` (B-EPOCH → COMMIT-STALE).
- **N-FID-TELE:** removing the teleport fidelity gate turns nothing red. The rule also matches corrections
  to bits (the same as 0003 S13n).
- **First-pass nulls, fixed before the graded round:**
  - The GAME BFS could not see table-only events once `state.js` stopped exporting `TRANSITIONS`
    (B-CHEAT stayed green on the GAME side).
  - CONTRACT-BITS passed because `{}` threw on destructuring, not on validation.
  - Two of my own minimal fixes were wrong: RESTART reset from any state, and FRESH counted bits-only
    results as failures. The gate falsified them (law 5).
