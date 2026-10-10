---
type: report
status: current
date: 2026-10-09
updated: 2026-10-09
---

# Shared contracts: echo/contracts.js, measured

`echo/contracts.js` (platform lane, branch `lane/platform/shared-contracts`) is the single definition
of quest states/transitions, bus and world-change names, interactable bindings, and the
ExperimentResult validator. `echo/CONTRACTS.md` is the guide every lane reads. Measured on commit
9de1c10 plus the docs commit that follows it.

## What was measured

| check | command | result |
|---|---|---|
| red before the module existed | `node tools/contract-check/check.mjs` | exit 1, module absent |
| red against the vision's own §9.2 sample | `node tools/contract-check/check.mjs --contracts <stub>` | exit 1, 125 FAILs (BOOT unreachable, no loud names, no validator) |
| green | `node tools/contract-check/check.mjs` | exit 0, 604/604 |
| sabotage | `python3 tools/contract-check/sabotage.py` | exit 0: 21 mutations, 18 red, 3 declared nulls |
| browser load | headless Chrome 155 on `tools/contract-check/browser.html` | happy path BOOT→CREDITS printed; served sha256 `8052cf29…` equals `shasum` of the file |
| real Qiskit outputs shaped only from CONTRACTS.md | qiskit 2.5 venv → JSON → validator | cloning/bell/teleport all `[]`; float noise (sum 0.9999999999999998) within 1e-9 |

## Findings worth keeping

- §9.2 has **20 edges in 18 rows**, not 19. The check's parser guard refused on the wrong hand count
  before anything ran, so the guard bites.
- §9.2's sample cannot reach BOOT and never leaves DECLASSIFIED. Two edges were added from §3.4.
- §8.4 has no place for reduced-state purity (§7.2 wants it shown) and no bit-order field (§7.1
  forbids unlabeled bitstrings). `observables` and `keyQubits` were added. Both are owner questions.
- Qollab docs confirm `main.js` "can import your other JavaScript files with `./` paths"
  (https://qollab.xyz/learn/docs/js-qiskit-projects). They do not say how `toJs()` converts a dict.
  Pyodide's default gives a Map, and the validator rejects it by name.
- Known nulls (blind spots of the check): renaming a §9.3 world-change id; rebinding the added
  `teleport_terminal` to another valid pair; removing the Map-specific hint text.

Evidence: `/Users/udsy/agent-org/lanes/platform/renders/shared-contracts/` (logs 01–05, PNG) and the
worker report `/Users/udsy/agent-org/lanes/platform/reports/0001-shared-contracts.md`.
