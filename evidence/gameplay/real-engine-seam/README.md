# Real-engine seam: gameplay quest rules × the real Qiskit engine × v2 contracts

What happens when gameplay's quest machine is fed the REAL quantum engine's results instead of the fake.
Measured 2026-10-10 on: quantum `lane/quantum/integration` @ d9b42d0 · gameplay `lane/gameplay/integration` @ c49a922 ·
contracts v2 `main` @ 99dfc54. Qiskit 2.5.2 (venv), Node v26.7.0. Vault: `vault/Reports/gameplay-real-engine-seam.md`.

## Re-run (≈10 s)

```bash
git worktree add --detach /tmp/seam-main main
git worktree add --detach /tmp/seam-quantum d9b42d0
git worktree add --detach /tmp/seam-gameplay c49a922
cd evidence/gameplay/real-engine-seam
python3 gen_results.py /tmp/seam-quantum/echo > out/results.jsonl   # 226 real engine results
node seam.mjs        # exit 1: the table, out/table.md + table.jsonl + summary.json + playthroughs.json
node fixtures.mjs    # exit 1: v2's own fixtures through gameplay, out/fixtures.md
node guard.mjs       # exit 0: fidelity guard holds (452 checks)
node guard.mjs --round   # baseline + 6 sabotages, each in a fresh process → out/guard-round.txt
python3 render_matrix.py # out/matrix.png
```

Exit codes: 0 every graded row matches the docs · 1 at least one does not · 2 could not run (missing/empty
results, unknown sabotage: all measured to give 2).

## Files

| file | what it is |
|---|---|
| `gen_results.py` | Calls the engine's own entrypoints. Random generic states (seed 20261010, 6 states, worst wrong-choice F ≤ 0.9 by brute force) are **registered in the engine's `STATES` table**, because the engine has no (theta, phi) input; that is the only intervention. Every teleport row carries `oracleFidelity` from an independent numpy simulation (q0 leftmost, opposite of Qiskit). |
| `expected.mjs` | Expected quest event per row, from vision §7/§9.2 and owner rulings only; reads the row's INPUTS, never the result or gameplay code. `undefined` = docs do not settle it (reported UNSETTLED, never graded). |
| `lib.mjs` | Copies gameplay `echo/game` beside a chosen `contracts.js` in a temp dir (sabotage edits apply to that copy only and throw if the target text is missing); the names-only `rename` shim; drives a fresh machine along the §9.2 path. |
| `seam.mjs` | The law-14 table: every row × quest state, three configurations (as built on v1, on v2, on v2 + names-only shim), v2 validity, a BOOT→CREDITS playthrough per configuration. |
| `fixtures.mjs` | v2's own `fixtures.json` good/bad + `teleport-fixtures.json` worked example through gameplay on v2. |
| `guard.mjs` | Fidelity guard on real results, plus `--round` sabotage. |
| `render_matrix.py` | Per-step matrix PNG from `out/table.jsonl`. |

The shim column is a DIAGNOSTIC (what is left once names agree), not a proposed adapter.
