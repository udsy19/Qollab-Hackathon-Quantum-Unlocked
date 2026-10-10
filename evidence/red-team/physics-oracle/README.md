# Physics oracle — independent ground truth for ECHO's quantum puzzles

Red-team evidence, not product code. Nothing here reads or imports `echo/`. It is built from the
textbook and Qiskit only (gate-independence law 4), so it can grade the quantum lane's code without
borrowing its answers.

## Run it

```bash
# venv with qiskit 2.5.x + pytest (no qiskit_aer needed or installed)
python -m pytest -q evidence/red-team/physics-oracle -p no:cacheprovider        # 510 tests, ~1 s, exit 0
python evidence/red-team/physics-oracle/sabotage.py                              # law-3 round, exit 0 = every sabotage red
python evidence/red-team/physics-oracle/backend_run_audit.py echo/               # 0 ≤1 site · 1 >1 site · 2 refused
python evidence/red-team/physics-oracle/physics_oracle.py                        # prints the named-state fidelity table
```

The tests write their tables to `out/`. Set `PHYSICS_ORACLE_OUT` to send them elsewhere; the sabotage
round does this so that its mutated copies never overwrite the record.

## Files

| file | what it is |
|---|---|
| `physics_oracle.py` | The library. There are two independent models: a numpy tensor model with one array axis per qubit (so it has no endianness), and Qiskit `Statevector`/`DensityMatrix`/`partial_trace`/`state_fidelity`. Teleport branches, the correction rule, a search that derives the rule without consulting it, the deferred-measurement circuit, the counts-key parser, the naive CNOT cloner, the Bužek–Hillery optimal cloner, and the no-signalling actions. |
| `test_physics_oracle.py` | The tests. Every expected value is hand-written from the textbook (`TEXTBOOK_RULE`, `TEXTBOOK_BOB`, 1/2, 5/6, 2/3, I/2), never computed by the library. |
| `sabotage.py` | Copies all four .py files to a temp dir, applies one exact-match mutation, runs pytest and records RED, GREEN or REFUSED. Writes `out/sabotage_results.md`. |
| `backend_run_audit.py` | A static counter for `backend.run` call sites in a Qollab tree, plus `CountingBackend`, a fake that raises on the second job. |
| `test_backend_run_audit.py` | Positive controls: every call shape the scanner claims to see. |
| `out/` | The tables of record: fidelity, endianness, cloning, eigenstate blind spots, sabotage results, imports. |

## Conventions the oracle fixes (vision §7.1)

q0 = source, q1 = Alice's local Bell half, q2 = Bob. Bell pair: H(q1) CX(q1,q2). Bell measurement:
CX(q0,q1) H(q0). m0 = q0's readout, m1 = q1's readout. Bob applies X iff m1=1 and Z iff m0=1. A
Qiskit counts key prints the **highest clbit first**: `'01'` means c1=0, c0=1, i.e. m0=1, m1=0, so the
correct correction is **Z only**.

## Using it against the product (for the physics-code-audit worker)

- **Correction rule:** call the product's rule for all four `(m0, m1)` and compare with
  `TEXTBOOK_RULE` in the test file.
- **Dry-run fidelity:** for each named state and five Haar states (`po.random_states`), compare
  the product's reported fidelity with `po.corrected_fidelity(...)` for the same branch and
  correction, to within 1e-6.
- **Counts parsing:** feed the product's parser every key in `out/endianness_table.txt`.
- **Runtime one-job check (Python):** pass `CountingBackend(BasicSimulator())` in place of `backend`.
- **Runtime one-job check (JS, local runner only):** before `main.js` runs, wrap the injected
  global:

  ```js
  const real = globalThis.backend; let n = 0;
  globalThis.backend = new Proxy(real, { get(t, k) { if (k === 'run') return (...a) => { if (++n > 1) throw new Error('2nd backend.run'); return t.run(...a); }; return t[k]; } });
  ```

  Then play title → credits twice, without reloading.

## What this cannot verify

- It does not run inside Pyodide. No local Pyodide with Qollab's Qiskit build exists on this
  machine. The imports are pure `numpy` plus `qiskit` core (`QuantumCircuit`, `transpile`,
  `quantum_info`, and `providers.basic_provider.BasicSimulator`). `qiskit_aer` is not installed in
  the venv, and a test asserts that it is never imported. The venv runs Python 3.13 and Qollab runs
  3.14.
- It proves that Bužek–Hillery *reaches* 5/6. That nothing does better is the published bound
  (Gisin & Massar 1997), not something it computes.
