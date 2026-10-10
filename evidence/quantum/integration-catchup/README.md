# integration-catchup gate logs (merged tree: integration + main-sync)
- contract-check.log — `node tools/contract-check/check.mjs`, exit 0, GREEN 1087/1087 (grades echo/contracts.js only, not the engine)
- qollab-caps.log — `node tools/qollab-caps/check.mjs`, exit 1, RED 6 failures (entry-index, entry-main, backend-run-python, hardcoded-backend x2 lines + hardcoded-secret)
- pytest.log — `python -m pytest -q echo/tests`, exit 1, 452 passed / 1 failed (test_contract_conformance, bell_verification)
These match vault/Reports/quantum-vs-contracts-v2.md rows 1-5 and 6. Local runner, not Qollab.
