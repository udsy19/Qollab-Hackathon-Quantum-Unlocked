# evidence/platform/shell: integration shell on the local runner (NOT Qollab)

Tree: assembled by `node tools/assemble-echo/assemble.mjs --out /tmp/echo-shell-asm-3/echo --ref platform=HEAD`
(platform = lane/platform/integration-shell @ cb20a32, other lanes at their `lane/*/integration` tips, see
`assemble-default-refs.log`). Served by `node tools/qollab-runner/server.mjs --port 4890 --project <tree>`.
Build token `shell-2026-10-10c`, read back from the served page (`--expect-build`).

| command | exit | artifact |
|---|---|---|
| `assemble.mjs` (default refs, platform=HEAD) | 1: CONFLICT contracts.js / CONTRACTS.md (gameplay carries a stale v1 copy; platform v2 taken) | `assemble-default-refs.log` |
| `run-fixtures.mjs` | 0 (8/8) | `assemble-fixtures.log` |
| `check.cjs --backend builtin` | 1 (21/22): first-press result breaks the contract, quantum `bell_verification` vs v2 `backend_verification` | `check-builtin.log`, `builtin-*.png`, `builtin-results.json` |
| `check.cjs --backend ionq-mock` | 1 (21/22), same single failure | `check-ionq-mock.log`, `ionq-mock-*.png` |
| `qollab-caps/check.mjs --root <tree>` | 1: 4 lines, all in quantum files | `caps-assembled.log` |
| `contract-check/check.mjs --contracts <tree>/contracts.js` | 0 (1087/1087) | `contract-check-assembled.log` |
| `retyped-names.mjs --only main.js` / all modules | 0 / 1 (70 hits in data/ and game/objectives.js) | `retyped-names-*.log` |
| `sabotage.sh 4891 … <tree>` (before the first-press check was added) | see summary | `sabotage/sabotage-summary.txt` |
