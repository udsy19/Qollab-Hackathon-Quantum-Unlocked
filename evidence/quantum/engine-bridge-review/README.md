# engine-bridge-review evidence (lane quantum, consult 13)

Adversarial review of `echo/quantum/` + `bridge.js` at d76271c's parent 2bfc51e (engine unchanged by this branch).
**Host Python 3.13 / qiskit 2.5.2 and the LOCAL Qollab-like runner (Pyodide 314.0.7, Python 3.14.2, Qiskit 2.5.2 wasm). Not Qollab, not IonQ.**

| file | what | how to re-run | result |
|---|---|---|---|
| `engine_dump.py` + `seam.mjs` → `seam.out` | real engine output fed to main's `contracts.js` (`validateCommitResult`) and gameplay `world-v2-port`'s `missionRules.eventForResult` | `python engine_dump.py echo > dump.json; node seam.mjs <dir with contracts.js + game/missionRules.js> dump.json` | 13 checks, **6 FAIL**, exit 1 |
| `derive.py` → `derive-host.out`, `derive-pyodide.out` | own numpy/kron (no qiskit, no echo code): 8 random generic states × 4 branches × 4 corrections, withheld bits, deferred check, cloning, relay | `python derive.py echo` (host) · `python derive.py echo pyodide/out/engine.json` | 715 numbers each, worst 4.98e-11, 0 mismatches, exit 0 |
| `pyodide/` (`run.sh`, `main.js`, `ebr_probe.py`, `drive.cjs`) → `pyodide/out/` | the same engine calls inside Pyodide + the bridge's dry run, commit, RESTART; JS-side type census | `PB_PORT=5231 bash pyodide/run.sh` | census 0 non-plain leaves; commit rejected by `validateCommitResult`; Python retry → TokenAlreadyConsumed |
| `sabotage.py` → `sabotage.out` | 6 mutations + unmutated control on disposable `git archive` copies; full `echo/tests` + `derive.py` each | `python sabotage.py` | control 595 pass; 4 red; **2 null** (hyphenated FTL fact, swapped m0/m1 labels) |
| `strings-scan.out` | every distinct string the engine returned, watch-word filter | inline script in the report | 70 strings, 22 flagged for reading |

`states.json` holds the 8 random states (numpy seed 20261010, uniform on the sphere, kept if max r_P² ≤ 0.9).
