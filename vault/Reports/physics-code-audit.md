---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: red-team
---

# Physics code audit: the oracle graded against ECHO's real quantum code

**Headline:** the physics in `echo/quantum/` is right. The oracle agrees with it on every branch, correction and state, including 5 Haar states the product had never seen. Its own suite catches the X/Z, m0/m1, bit-order, drop-X and drop-Z defects. **The integration is broken.** Every real quantum result fails the platform contract. Gameplay's mission rules are tested only against a fake engine whose field names differ from the real one, so the real results stall the quest at Mission 1. The two lanes' `backend.run` sites (in `main.js` and `qollab_job.py`) have separate guards, so together they allow two jobs in one run.

Audited (pinned SHAs): `lane/quantum/integration` **a9edce2**, `lane/platform/g0-runner-smoke` **e2f0ab6**, `lane/platform/integration` **6378677**, `lane/gameplay/integration` **31a60f2**. Python 3.13.0, qiskit 2.5.2, numpy 2.5.3, node 26.7.0. Audit branch `lane/red-team/physics-code-audit`. Evidence is in `evidence/red-team/physics-code-audit/` (logs in `out/`). Nothing was run in Pyodide, on Qollab or on IonQ.

## How to reproduce

```bash
T=/tmp/pca; mkdir -p $T/q && git archive a9edce2 echo | tar -x -C $T/q          # disposable export (law 10)
ECHO_ROOT=$T/q/echo python -m pytest -q evidence/red-team/physics-code-audit -p no:cacheprovider   # 86 passed, exit 0
python -m pytest -q evidence/red-team/physics-code-audit -p no:cacheprovider                         # exit 2: no ECHO_ROOT = refusal, not skip
python evidence/red-team/physics-code-audit/sabotage_product.py $T/q/echo                            # exit 0; table → out/sabotage_product.md
bash evidence/red-team/physics-code-audit/sabotage_gameplay.sh lane/gameplay/integration             # exit 0; table → out/sabotage_gameplay.md
ECHO_ROOT=$T/q/echo python evidence/red-team/physics-code-audit/dump_results.py > r.json
node evidence/red-team/physics-code-audit/cross_lane_check.mjs r.json <contracts.js> <missionRules.js>   # exit 1, 12/13 fail
python evidence/red-team/physics-oracle/backend_run_audit.py <tree>                                  # q:1 site, p:1, merged:2 (exit 1)
ECHO_ROOT=$T/q/echo python evidence/red-team/physics-code-audit/c4_token_probe.py                   # exit 1
```

## Checklist C0–C9 (from [[Reports/physics-oracle-audit]])

| # | verdict | command → exit | evidence / file:line |
|---|---|---|---|
| C0 baseline | **PASS** | oracle pytest → 0 (523 passed); oracle `sabotage.py` → 0 | `out/c0_baseline.txt` |
| C1 rule | **PASS** | driver `test_c1_rule_matches_textbook` → 0 | `teleportation.py:29-32`, `missionRules.js:15-18` (both = textbook) |
| C2 teleport | **PASS** | driver: fidelity = oracle within 1e-6 for 12 states (7 named + 5 Haar), all 4 branches × 4 corrections; `live_commit` applies the textbook rule to its own bits over 40 seeds × 12 states, all 4 branches reached; deferred and withheld = oracle | `teleportation.py:56-83`, `out/driver_a9edce2.txt` |
| C2 cloning | **PASS** | purities, copy fidelities and joint overlap = oracle; `parameters.state` is reported; \|+⟩/\|−⟩/\|+i⟩ tell apart by amplitudes and joint overlap (0.5/0/0.25) | `cloning.py:55-74` |
| C2 relay | **PASS** (math) / **UNTESTABLE** (UI label) | receiver marginal 0.5 from `partial_trace` (not shots), engine `exact_qiskit_local`; no UI exists to show "EXACT" | `entanglement.py:35-36` |
| C3 one job | **FAIL** (integration) | each tree has 1 site (exit 0); merged tree has **2 sites, exit 1** | `main.js:114` (guard `backendJobUsed`, main.js:97) + `qollab_job.py:168` (guard `_job_submitted`, :25). `bridge.js` / `verifySelectedBackendOnce` (owner ruling) exists on **no** lane branch |
| C3 Python guard | **PASS** | `CountingBackend`: 2nd call refused, 1 job, `shots=256` | `qollab_job.py:155-170` |
| C4 token once | **FAIL** (quantum + integration); gameplay edge PASS | `c4_token_probe.py` → 1: `live_commit` re-measures on every call (6/6); no story-token state; no random generic calibration state | `teleportation.py:160`, `__init__.py:15-23`; gameplay's `commitIsOneShot` (`state.js:64`) proves one COMMIT edge |
| C5 endianness | **PASS** | driver: 512 real BasicSimulator shots parsed by the ORACLE parser; the product's projection predicts Bob's sampled bit on every shot (\|0⟩ Z-basis, \|+⟩ X-basis), all 4 branches; `interpret_counts` on real sampled keys for all 4 (m0,m1) | `teleportation.py:61`, `qollab_job.py:76` |
| C6 labels | **PASS** for quantum strings / **UNTESTABLE** for UI | grep over story-ui, gameplay, platform, art, quantum branches: no "RELAY READOUT", "certified", "instant", and no "copied" except "only copied a known classical value" (`cloning.py:43`, accurate); the deferred facts say "Mathematical verification… not a physical" with no "measured" | label grep in [[#Label audit]] |
| C7 on-screen duplication | **UNTESTABLE** | no booth or rooftop scene on any branch yet | — |
| C8 m1 wording | **PASS** | quantum facts say "local Bell-half readout" (`teleportation.py:121,131`); "RELAY READOUT" appears on no branch | — |
| C9 their tests | **PASS** with nulls | 395 passed, exit 0. States include generic + Z-type + X-type (T1 safe); thresholds are 0.999999 and <0.99 (T2 safe). Sabotage below | `out/product_suite.txt` |
| Pyodide | **PASS** (static) | every module imports only `qiskit`, `qiskit.quantum_info`, `numpy`, `math`, `random`, `numbers`; no `qiskit_aer`; every returned value is exact plain types | driver `test_imports_are_pyodide_safe_in_every_module`, `test_every_*_is_plain` |

## Sabotage round: the product's own suite, on a disposable copy

`out/sabotage_product.md` (20 mutations, every edit matched exactly once). THEIR = `echo/tests` (395). OURS = the oracle driver (86).

| mutation | THEIR | OURS |
|---|---|---|
| swap X/Z rule | RED 30 | RED 25 |
| swap m0/m1 in projection | RED 52 | RED 24 |
| reverse bitstring (backend parser) | RED 6 | RED 2 |
| drop X / drop Z / X-button-applies-Z | RED 44 / 44 / 53 | RED 20 / 20 / 22 |
| live commit applies rule to (m1,m0) | RED 1 | RED 12 |
| \|+i⟩ prepared with Z; bloch_a RZ-before-RY | RED 11 / 10 | RED 4 / 3 |
| test thresholds loosened + Z dropped | RED 44 | RED 20 |
| 2nd backend job: guard check removed | RED 2 | RED 1 |
| guard spent only after success | RED 1 | GREEN |
| withheld bits leak Bob's (0,0) branch | RED 7 | RED 12 |
| **Bell-measurement CX lands on Bob (CX(q0,q2))** | **GREEN — NULL** | RED 1 (locality test) |
| **sender's X lands on receiver** | **GREEN — NULL** | RED 1 (locality test) |
| **"mistake does not show" fact fires at F>0.9** | **GREEN — NULL** | RED 1 |
| **backend counts keep provider np.int64** | **GREEN — NULL** | RED 1 |
| branch-prob labels 2·m0+m1 | GREEN — NULL | GREEN — NULL |
| relay P(0)/P(1) swapped | GREEN — NULL | GREEN — NULL |
| cloning reports source twice | GREEN — NULL | GREEN — NULL |

**The nulls:**
1. **CX(q0,q2) instead of CX(q0,q1)** gives a 3-qubit state *identical* to the real protocol (`Statevector.equiv` = True on bloch_a and bloch_b), because X on either half of Φ+ is the same. No physics output can see it, yet it is Alice touching Bob's qubit, a locality violation. Their suite and my first driver both stayed green. Closed in OUR driver with a structural check on the circuit (`test_locality_alice_never_touches_bob_after_the_bell_pair`). The same holds for the relay's sender gate (`test_locality_sender_gate_acts_on_sender_only`), which matches the quantum lane's own recorded null.
2. **The product's threshold for the "this mistake does not show" fact** (`teleportation.py:134`, 0.999999) is untested. Loosened to 0.9, it would tell a player that a wrong correction scoring 0.913 (near-\|0⟩ state) is harmless. Their named states never land in (0.9, 1). Closed in OUR driver, with a positive control that the band is exercised.
3. **np.int64 counts** leak through `interpret_counts` (`qollab_job.py:97`) unconverted. Their fixtures use Python ints only. OURS is red.
4. **Three nulls are physics-identical and harmless:** every branch probability is 1/4, both relay marginals are 0.5, and source and copy have the same reduced state. A wrong label cannot show a wrong number.

## Sabotage round: gameplay's own tests (`out/sabotage_gameplay.md`)

Control: 36 pass. Swapping the rule → RED 3. Removing the rule check → RED 1. Removing the token guard → RED 1. **`FIDELITY_OK` 0.999999→0.9: GREEN (NULL). Removing the fidelity check entirely: GREEN (NULL).** No gameplay test feeds a result that follows the rule but has fidelity below 1. So the fidelity half of `correctTeleport` (`missionRules.js:31`), the defence against a broken engine, is unguarded.

## Cross-lane: real quantum results vs the platform contract and gameplay

`out/cross_lane_check.txt`, exit 1, **12 of 13 checks fail.** The same result holds against platform `shared-contracts` cf15e81, `echo-caps-gate` faf6be8 and gameplay `contracts-migration` c25cfd5.

- **Contract (`contracts.js`):** all 7 real results are INVALID. Unknown fields `kind`, `details`, `circuitText`, and `summary` on the backend result. `keyQubits` is missing. The backend result's `experiment` is `"bell_verification"`, which is not in `EXPERIMENTS`, and the owner ruled `"backend_verification"`. Per CONTRACTS.md, the UI shows the §12.3 "scientific module error" on every result.
- **Gameplay (`missionRules.js:6-8`, 36-57):** the rules read `fidelity` on cloning, `probabilities['receiver=0']`, `parameters.stateId`, and `parameters.correctionX/Z`. The real engine emits `details.jointFidelityWithTwoCopies`, keys `sender=s,receiver=r` with `details.receiverMarginal`, `parameters.state`, and `parameters.applyX/applyZ`. Only `RELAY_INTRO` advances. The quest stalls at **CLONE_INTRO**. Gameplay's 36 tests are green because they run against `dev/gameplay/fakeQuantum.js`, a fake that emits the shape the rules expect (law 4: a fixture drawn from the consumer, not the producer).

## Label audit

`git grep -i "relay readout|certified|instant|copied|measured|true random|faster|unhackable|IonQ verified|hardware"` over `echo/` on story-ui (cabef98, 680608e, 4739c38), gameplay (31a60f2, 934b8c2, c25cfd5), platform (6378677, e2f0ab6), art (163ca42) and quantum (808ccbb). Every hit is a code comment, a test's forbidden-list, or an accurate fact: `cloning.py:43` "only copied a known classical value", `teleportation.py:100` "source qubit was measured" (branch model, true), `qollab_job.py:111` "noise or hardware can add 01 and 10". There are no player-facing mission UI or data strings on any branch yet, so this verdict covers only the strings that exist.

## What this does not verify

No Pyodide, no Qollab and no IonQ run. Python 3.13 here, 3.14 on Qollab. The Python→JsProxy `backend.run(circuit, shots=…)` kwargs path is not exercised. No screenshots (C7), because no mission scene exists. The JS one-job guard was read, not executed. A merged runtime check needs the integrated build.

## Related

[[Reports/physics-oracle-audit]] (the oracle and checklist) · [[Design/gate-independence-cases]] (laws 3, 4, 10, 15) · [[Research/qollab-platform-and-submission]]
