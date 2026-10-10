# contracts-fidelity-band evidence (platform, 2026-10-10)

Branch `lane/platform/contracts-fidelity-band`, base bc0e927. Report: `lanes/platform/reports/0007-contracts-fidelity-band.md`.
Copies are made with `sed` into a `mktemp -d` dir (law 10: the real file is never mutated).

| file | what | exit |
|---|---|---|
| `0-before-old-gate-real.log` | OLD gate, real contracts — GREEN 1117/1117 | 0 |
| `0-before-old-gate-tol-1e-1.log` / `-1e-2.log` | OLD gate, tolerance loosened to 1e-1 / 1e-2 — **GREEN 1117/1117** (the defect) | 0 / 0 |
| `1-red-first-real.log` | NEW probes, OLD contracts — RED 1129/1132: F=0.999999 and F=0.999999−1e-15 refused, `FIDELITY_EPSILON` missing | 1 |
| `1-red-first-tol-1e-1.log` / `-1e-2.log` | NEW probes on the loosened copies — RED (forged-fidelity probes + PIN) | 1 / 1 |
| `2-green-real.log` | NEW gate, fixed contracts — GREEN 1132/1132 | 0 |
| `3-judging-tol-1e-1.log`, `3-judging-tol-1e-2.log`, `3-judging-pass-0.9.log` | the supervisor's judging copies on the fixed contracts — RED (10, 7, 1 FAIL lines) | 1, 1, 1 |
| `4-sabotage.log` | `python3 tools/contract-check/sabotage.py` — 72 cases, 65 red, 7 declared nulls, 0 mismatches | 0 |
| `5-enabling-step.log` | gate copies: PIN disarmed → still RED on 1e-1 and 1e-2 (forged probes alone); forged probes disarmed → RED (PIN alone); both disarmed → GREEN (these two are the only detectors) | 1,1,1,0 |
| `6-qollab-caps.log` | `node tools/qollab-caps/check.mjs --root echo` — GREEN | 0 |
| `7-extra-mutations.log` | unlisted mutations: one-sided cross-check (both signs), relative tolerance, tol = 1 − FIDELITY_PASS, epsilon 1e-13, tol 1.5e-6 — all RED | 1 ×6 |
