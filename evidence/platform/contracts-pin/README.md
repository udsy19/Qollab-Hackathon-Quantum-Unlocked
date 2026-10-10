# contracts-pin-thresholds evidence (platform, 2026-10-10)

Measured on branch `lane/platform/contracts-pin-thresholds`, base 43be7d9. Every log below was produced by the command shown in its first lines or in the report `lanes/platform/reports/0006-contracts-pin-thresholds.md`.

| file | what | exit |
|---|---|---|
| `0-before-pins-fidelity-0.9.log` | OLD gate on a copy with `FIDELITY_PASS = 0.9` — the defect: GREEN 1087/1087 | 0 |
| `1-red-first-fidelity-0.9.log` | NEW gate, same copy — RED, `PIN FIDELITY_PASS must be 0.999999 (vision §7.4 …)` | 1 |
| `2-green-real.log` | NEW gate on the real `echo/contracts.js` — GREEN 1117/1117 | 0 |
| `3-sabotage.log` | `python3 tools/contract-check/sabotage.py` — 61 cases, 55 red, 6 declared nulls, 0 mismatches | 0 |
| `4-supervisor-judging-repro.log` | the supervisor's three judging copies (fidelity 0.9, shots 1024, m1 label) + the real file | 1,1,1,0 |
| `5-equality-and-enabling-step.log` | equality at F = 0.999999 is refused by the 1e-6 cross-check (finding); pin() sabotaged → GREEN on the 0.9 copy (the pin is the enabling step) | — |
