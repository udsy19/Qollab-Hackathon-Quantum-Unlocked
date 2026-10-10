# contract-conformance evidence (quantum lane, consult 3)

Does every dict echo/quantum returns pass the platform's REAL `validateExperimentResult`?

| file | produced by | what |
|---|---|---|
| `dump_results.py` | — | calls every bridge function over its full input space (`bridge_calls()` in `echo/tests/conftest.py`, 181 calls), one JSON line each |
| `validate.mjs` | — | `node validate.mjs <contracts.js> <results.jsonl>`: runs each line through platform's validator; exit 0 all valid · 1 any rejected · 2 could not grade |
| `before.jsonl`, `before.txt` | `dump_results.py /tmp/cc-conf/old/echo` (HEAD a9edce2's echo/quantum) + `validate.mjs` | 181/181 rejected |
| `after.jsonl`, `after.txt` | same, on this branch | 3/181 rejected, all `experiment "bell_verification"` (the contract gap) |
| `after-with-request.txt` | `validate.mjs` on a disposable contracts.js with only `'bell_verification'` added to EXPERIMENTS | 0/181 rejected: the request is the whole gap |
| `red-on-old-code.txt` | `echo/tests/test_contract_conformance.py` run on the HEAD a9edce2 tree | 6 failed: the regression test fails first |
| `sabotage_round.py`, `sabotage.md` | reuses `evidence/quantum-core/sabotage_round.py`'s harness (disposable copies) | 28 mutations (quantum-core's 19 + 8 contract + 1 gate), 0 nulls |
| `pytest-after.txt` | `python3 -m pytest -q echo/tests` | 453 passed |

Reproduce: `git show lane/platform/integration:echo/contracts.js > /tmp/cc-conf/contracts.js`, then
`python3 dump_results.py > r.jsonl && node validate.mjs /tmp/cc-conf/contracts.js r.jsonl`.
Platform's contracts.js was read at `lane/platform/integration` 6378677.
