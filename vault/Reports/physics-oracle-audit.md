---
type: report
status: current
date: 2026-10-09
updated: 2026-10-09
owner: red-team
---

# Physics oracle and spec audit — ground truth for ECHO's quantum puzzles

An independent, runnable oracle now exists at `evidence/red-team/physics-oracle/`: 523 pytest checks, exit 0, about 1 s. It covers teleportation, endianness, consumption, no-cloning and no-signalling, built from the textbook and Qiskit only. A 20-row sabotage round turns every mutation red. The spec audit found **no FALSE physics claim** in vision §7, §2.4 or Prompt 6. It found **seven AMBIGUOUS wordings** and **three test-design traps** that would let a wrong implementation pass. They are below as proposals for the owner.

Measured on branch `lane/red-team/physics-oracle-audit` (commits `d12606a`, `8c2da3b` and this one), venv Python 3.13.0, qiskit 2.5.2, numpy 2.5.3, no `qiskit_aer` installed.

## How to run it

```bash
python -m pytest -q evidence/red-team/physics-oracle -p no:cacheprovider   # 523 passed, exit 0
python evidence/red-team/physics-oracle/sabotage.py                         # exit 0 = control green, all 19 sabotages red
python evidence/red-team/physics-oracle/backend_run_audit.py echo/          # 0 ≤1 site · 1 >1 · 2 refused (today: 2, echo/ absent)
```

Citation shorthand: `tpo:N` = `evidence/red-team/physics-oracle/test_physics_oracle.py` line N;
`tsr:N` = `test_spec_reference_code.py`; `V:N` = `ECHO_MASTER_VISION.md` line N; tables are in
`evidence/red-team/physics-oracle/out/`.

## Ground truth established

| property | result | where |
|---|---|---|
| Branch probabilities | P(m0,m1) = 1/4 exactly, for each of 56 states (50 Haar, seed 20261011, plus 6 named) | tpo:45 |
| Bob before correction | X^m1 Z^m0 \|ψ⟩. The numpy tensor model (no bit order) and Qiskit agree to 1e-12 | tpo:51, tpo:64 |
| Correction rule | (m0,m1) → (X,Z): 00→none, 01→X, 10→Z, 11→X+Z. Matches the hand table AND a search over all four corrections that never consults the rule | tpo:73 |
| Fidelity after the right correction | 1 (>1−1e-9) on all 56 states × 4 branches | tpo:83 |
| Wrong corrections, Haar-50 | mean 0.28–0.38, min ≤0.008, **max 0.957**, never >0.999 | tpo:89, `out/wrong_corrections_haar50.txt` |
| Named-state table, 6 states × 4 branches × 4 corrections | printed | `out/fidelity_table_named_states.txt` |
| Deferred-measurement circuit, CX(q1,q2) CZ(q0,q2) | F = 1 on all 56 states | tpo:133 |
| X·Z vs Z·X | differ only by the sign −1 (a global phase) | tpo:139 |
| Endianness | the key `'01'` means c1=0, c0=1, i.e. **m0=1, m1=0, so Z only**. With two registers the key is `'m1 m0'`, last-added register first | tpo:171, `out/endianness_table.txt` |
| Endianness from real sampling | measured protocol on BasicSimulator, 512 shots, all 4 branches seen: Bob's Z bit = m1 every shot for \|0⟩, and Bob's X bit = m0 every shot for \|+⟩ | tpo:192 |
| Consumption | after the Bell measurement Alice holds exactly \|m0⟩\|m1⟩ for every ψ. Her source's average fidelity to ψ is exactly 1/2 (a coin flip). The deferred circuit also leaves Alice ψ-independent | tpo:147, tpo:162 |
| Naive CNOT "cloner" | per-copy F = \|α\|⁴+\|β\|⁴. \|0⟩,\|1⟩: 1. \|+⟩,\|−⟩,\|+i⟩: 0.5, purity 0.5. Haar average exactly 2/3. Overlap with ψ⊗ψ: 0.5 for \|+⟩, **0 for \|−⟩**, 0.25 for \|+i⟩ | tpo:236, tpo:243, tpo:261 |
| Optimal universal cloner (Bužek–Hillery) | per-copy F = 5/6 for every one of 56 states. The 5/6 upper bound itself is Gisin & Massar, PRL 79, 2153 (1997), cited and not computed here | tpo:273 |
| No-cloning by linearity | 20 random unitaries that clone \|0⟩ and \|1⟩ perfectly ALL send \|+⟩\|0⟩ to the Bell state | tpo:281 |
| No-signalling | Bob's ρ = I/2 to 1e-12 under I, X, Y, Z, H, S, T, Z- and X-measurement, and 10 random unitaries on a Bell half. Same on the teleport register under the Bell measurement and random 2-qubit unitaries. Unchanged on 25 random 3-qubit states whose Bob marginal is not I/2 | tpo:300, tpo:309, tpo:318 |
| Correlations exist only in the joint log | P(same Z bit): I = 1, X = 0. Z leaves it at 1 and flips the X-basis agreement to 0 | tpo:331 |
| Positive control | once Bob is told the bits, his state depends on ψ (difference 1.0) | tpo:339 |
| Built-in simulator feed-forward | `BasicSimulator` refuses `if_test`: `TranspilerError: The control-flow construct 'if_else' is not supported by the backend.` | tpo:206, `out/dynamic_feedforward.txt` |
| Vision §10.3–10.5 reference code, run verbatim from the doc | correct: purities 1/1/0.5/0.5, marginals 0.5, teleport F > 0.999999 on 5 states | tsr:30, tsr:37, tsr:43 |
| Pyodide-safe imports | `numpy`, `qiskit` (`QuantumCircuit`, `transpile`, `circuit`, `quantum_info`, `providers.basic_provider`), stdlib. `qiskit_aer` is never imported | tpo:352, `out/imports.txt` |

## Sabotage round (law 3 / law 15)

`out/sabotage_results.md` holds the full table. Every mutation is applied to a temp copy, and a mutation that does not match exactly once is REFUSED rather than counted. The control is GREEN (all tests pass). These went RED: swapping the X/Z rule (56 failures); swapping the m0/m1 projection in the Qiskit model (169) and in the numpy model (55); reading the bitstring the wrong way round (2: the endianness table and the sampled protocol); dropping Z (57); dropping X (57); removing the Bell-pair CX (363); a big-endian index convention (112); removing the CNOT cloner (57); a Bužek–Hillery cloner that overclaims (56); a selective-measurement leak (18); Alice's gate landing on Bob (1); swapping the test's own textbook table (3, the enabling step); a swapped rule plus tolerance loosened to 1.0 (56); dropping Z with only |0⟩/|1⟩ inputs (3); the scanner missing aliases (2), counting comments (1) or missing `selectedBackend.run` (1); and `CountingBackend` allowing two jobs (1).

**The nulls, which are the most useful lines here:**
1. `alice_gate_lands_on_bob` was **GREEN** on the first run. A unitary on Bob leaves I/2 unchanged, and no test applied *named* gates to a state whose Bob marginal is not I/2. Fixed by running every named action on random 3-qubit states, with a positive control that they are not already I/2 (tpo:318). It is now RED.
2. My first sabotage idea, "only Pauli-eigenstate inputs plus a swapped rule", went RED. The swapped rule is caught because the eigenstate set contains both Z-type and X-type states. This narrowed finding T1 below to its true form.
3. On the vision doc itself, using a disposable copy: replacing the §10.3 `phase` prep S with Z (|+i⟩ → |−⟩) **stayed GREEN**. The §10.3 cloning result reports only purity, which is 0.5 for every equatorial state, so it cannot tell which state was prepared. Swapping the deferred CX or CZ controls and removing the §10.4 Bell CX all went RED (5, 3 and 3 failures).
4. The scanner sabotage `scanner_misses_member_calls` fails on 1 shape only. `this.backend.run` is still matched by the plain `\bbackend` pattern, so only `selectedBackend.run` relies on the widened regex.

Not sabotaged: the imports test, the rotation-order test and the BasicSimulator feed-forward probe. These pin facts and do not guard logic.

## Test-design traps — what lets a wrong product pass

- **T1, eigenstate blind spots.** In every branch, each Pauli eigenstate passes TWO of the four corrections (tpo:110, `out/eigenstate_blind_spots.txt`). |0⟩ and |1⟩ see only the X part of a correction. |+⟩ and |−⟩ see only the Z part. |+i⟩ sees only whether both parts are right or both wrong. A suite on |0⟩/|1⟩ alone ships a dropped Z green, and a suite on |+⟩/|−⟩ alone ships a dropped X green. The vision's six-state set is safe as a whole. **Do not cut the generic state, or either the Z-type or the X-type pair.** The calibration states the player sees obey the same rule: a dry run on |0⟩ "proves" a correction plan that is wrong on Z.
- **T2, thresholds.** A wrong correction reaches F = 0.957 on a Haar state, and 0.674 on the spec's own `ry_then_rz` state. Any pass threshold below about 0.99 (for example a "fidelity > 0.9 = success" UI rule) accepts wrong corrections. The vision's 0.999999 (V:487) is right; keep it in the product's success check too.
- **T3, symmetric showcase.** The Bell showcase circuit (V:1013) can only give the keys `'00'` and `'11'`, so it cannot reveal an endianness bug. That is fine for its purpose, but it is no evidence that the parser is correct.

## Spec audit

TRUE = the oracle confirms it. AMBIGUOUS = true under one reading but misreadable. UNTESTABLE-AS-WRITTEN = not a physics claim, so it goes to the code-audit checklist. No row is FALSE.

| # | claim (where) | verdict | settled by |
|---|---|---|---|
| 1 | ψ = α\|0⟩+β\|1⟩ normalized (V:449) | TRUE | definitional; `po.ket` |
| 2 | q0 source, q1 Alice's Bell half, q2 Bob (V:450) | TRUE (convention) | tpo:51, tpo:64 |
| 3 | Bell pair H(q1) CX(q1,q2) (V:451) | TRUE | tpo:83; `no_bell_pair` sabotage RED |
| 4 | Bell measurement CX(q0,q1) H(q0); m0←q0, m1←q1 (V:452) | TRUE | tpo:51, tpo:192 |
| 5 | X iff m1=1, Z iff m0=1 (V:453; CLAUDE.md; context.md) | TRUE | tpo:73, tpo:83 |
| 6 | X-then-Z vs Z-then-X differ only by a global phase (V:453) | TRUE | tpo:139 |
| 7 | "Qiskit string output **can be** little-endian" (V:454) | **AMBIGUOUS** | tpo:171: it is *always* highest-clbit-first. "Can be" invites guessing. **Proposal P1** |
| 8 | CNOT gives α\|00⟩+β\|11⟩, not ψ⊗ψ in general; basis states are the exception (V:458) | TRUE | tpo:236, tpo:243 |
| 9 | Table: \|0⟩→\|00⟩, \|1⟩→\|11⟩, \|+⟩→Bell, (\|0⟩+i\|1⟩)→(\|00⟩+i\|11⟩)/√2 (V:460–467) | TRUE | tpo:243 |
| 10 | \|+⟩ reduced output maximally mixed, purity 1/2 (V:469) | TRUE | tpo:243 |
| 11 | Tests: output "not \|+⟩⊗\|+⟩"; "test several non-basis preparations" (V:471) | TRUE, with a trap | tpo:243: overlap with ψ⊗ψ is 0.5, 0 and 0.25 for \|+⟩, \|−⟩, \|+i⟩. A test that hard-codes 0.5 for all of them is wrong (this oracle's first draft did exactly that and failed) |
| 12 | A local sender action cannot change Bob's marginal (V:475) | TRUE | tpo:300, tpo:318 |
| 13 | I vs X changes the Z-basis correlations; Z gives no decodable signal (V:475) | TRUE | tpo:331 |
| 14 | Receiver panel "always shows P(0)=P(1)=0.5" (V:477) | **AMBIGUOUS** | TRUE for exact `partial_trace` (tpo:300). If the panel is fed by sampled shots, 256 shots scatter by ±0.031 (1σ), and a player toggling X may read 0.53 → 0.47 as a signal. **Proposal P2** |
| 15 | `partial_trace` gives I/2; "display probabilities within tolerance" (V:479) | TRUE / **AMBIGUOUS** | tpo:300 at 1e-12. No tolerance number is given. **P2** |
| 16 | Ideal protocol transfers arbitrary states without two copies (V:483, V:65) | TRUE | tpo:83, tpo:147 |
| 17 | Six+ states, including "`RY(1.137) RZ(0.44)` in the correct order" (V:486) | **AMBIGUOUS** | tpo:215: in circuit order (as §10.5 codes it) the Bloch vector is (0.821, 0.386, 0.420). Read as an operator product, RZ acts first on \|0⟩ and does nothing, giving (0.907, 0, 0.420), a real-amplitude state that loses the phase test. **Proposal P3** |
| 18 | Per-branch **or** deferred-measurement verification, F ≥ 0.999999 (V:487) | TRUE / **AMBIGUOUS** | tpo:83, tpo:133. Deferred-only never exercises m0/m1 labels, the parser or the player's correction choice. §10.5 (V:977) already says to also build the branch model. **Proposal P4**: "and" for the shipped build. The threshold is right (T2) |
| 19 | Withheld bits mean Bob's average state is independent of ψ (V:488) | TRUE | tpo:309 |
| 20 | One shot is not proof; distinguish exact, sampled and hardware (V:489–490) | UNTESTABLE-AS-WRITTEN | labelling. Checklist C6 |
| 21 | Deferred circuit CX(q1,q2) CZ(q0,q2) reproduces ψ at Bob (V:494–503) | TRUE | tpo:133, tsr:43 |
| 22 | The deferred circuit is not a physically separated link (V:503) | TRUE (wording) | — |
| 23 | Story token consumed once; no re-teleport after measurement (V:507) | physics TRUE; once-only UNTESTABLE-AS-WRITTEN | tpo:147: after measurement Alice holds \|m0 m1⟩ regardless of ψ. The once-only rule is a state-machine property. Checklist C4 |
| 24 | The dry run proves a rule, not the live bits (V:507) | TRUE | tpo:45: P(m) = 1/4 for every ψ, so the live bits cannot be predicted |
| 25 | Simulators are not proof of advantage, entropy or intercity transfer (V:511) | TRUE (wording) | — |
| 26 | Two classical bits required (V:521) | TRUE | tpo:309: with no bits Bob is I/2. tpo:89: every correction that ignores a bit fails |
| 27 | "Original consumed — source register measured" (V:523) | TRUE / minor AMBIGUOUS | tpo:147 for the branch model. In the deferred circuit nothing is *measured*, yet Alice is still ψ-independent (tpo:162). Declassified must not caption the deferred circuit "measured" |
| 28 | m1 shown as "**RELAY READOUT** m1" (V:261) vs "local Bell-half readout" (V:417) and "Alice local Bell half" (V:450) | **AMBIGUOUS** | "Relay" is the name of Mission 2's QUANTUM RELAY and reads as the remote station, so a player can think m1 comes from Bob's side. **Proposal P5** |
| 29 | m0=1,m1=0 → Z only; 0,1 → X; 1,1 → X+Z; 0,0 → none (V:428) | TRUE | tpo:73 |
| 30 | "Receiver test fidelity: 1.000000" (V:424) | TRUE for an exact sim | it would be false if computed from shots. Checklist C6 |
| 31 | "TWO COPIES IN Z BASIS: YES" (V:397–398) | AMBIGUOUS, already flagged by the doc (V:404) | endorse V:404's "two basis values matched" |
| 32 | "I sent it" / "You transferred it" / "COMMIT ONE-WAY TRANSFER" (V:265, V:273, V:279) | TRUE (wording) | the quantum state is transferred and the bits go by the amber link |
| 33 | `teleportDryRun(stateId, correctionX, correctionZ)` (V:661) | **AMBIGUOUS** | physically, the correction is chosen *after* the bits are seen. If X/Z must be committed before m0,m1 exist, success becomes a 1-in-4 lottery, not a rule. **Proposal P6** (a contract question for the platform lane and the owner) |
| 34 | A specific IonQ configuration may reject dynamic circuits (V:676) | TRUE, and stronger | tpo:206: the local BasicSimulator rejects `if_test` too. The research note says Qollab's built-in simulator *is* BasicSimulator, so feed-forward must be a branch model or deferred everywhere |
| 35 | The Bell-only showcase is not "teleportation on IonQ" (V:1017) | TRUE (wording) | T3: the showcase keys are symmetric |
| 36 | §2.4 (V:135): no "entanglement transmits instantly", no second copy of an unknown state, no "certified randomness", no measurement-as-an-eye, no matter teleportation; no-cloning does not stop classical copying | TRUE (all six are correct prohibitions) | tpo:300 (no FTL), tpo:281 (no copy) |
| 37 | Prompt 6: "a CNOT copying basis values is not universal cloning" | TRUE | tpo:236, tpo:281 |
| 38 | Prompt 6: "remote Bell marginals cannot transmit a chosen message" | TRUE | tpo:300 |
| 39 | Prompt 6: "teleportation requires shared entanglement + Bell measurement + 2 classical bits + receiver X/Z" | TRUE | tpo:83, tpo:309; `no_bell_pair` RED |
| 40 | Prompt 6: "the original source is consumed" | TRUE | tpo:147 |
| 41 | Prompt 6: "check little-endian bit labeling and each of four classical bit pairs" | TRUE | tpo:171, tpo:192 |
| 42 | Prompt 6: backend runs within one-job-per-run; simulator not labelled as hardware or randomness; no duplicated quantum information on screen | UNTESTABLE-AS-WRITTEN by physics | checklist C3, C6, C7; `backend_run_audit.py` |
| 43 | Prompt 6: "Run tests, report real failures **and fix issues**" | AMBIGUOUS for this org | the red-team edits no product files (lane-ownership). Fixes go to the quantum, story-ui and gameplay lanes as findings |
| 44 | §10.3 code `float(one_output.purity())` | TRUE, cosmetic | it raises `ComplexWarning` (purity is complex-typed). Use `.real` (tsr:30 output) |

### Wording a player could misread

None of the listed wording asserts faster-than-light signalling, cloning, certified randomness or matter teleportation. Three risks remain:
- "RELAY READOUT m1" (row 28) puts m1 at the remote end.
- A sampled receiver panel (row 14) can *look* like a signal.
- "SEND" with entanglement only (V:239) is intended to fail. The fail screen must say that nothing arrived, as V:433 does ("the classical channel is still missing").

## Proposed changes for the owner (not edits; the vision docs are owner-only)

- **P1, V:454.** "Qiskit counts keys always print the highest classical bit first: `'01'` means c1=0, c0=1, i.e. m0=1, m1=0. With several registers, the last-added register prints first, separated by a space."
- **P2, V:477 and V:479.** "The receiver panel shows exact probabilities from `partial_trace` (labelled EXACT). If sampled counts are also shown, label them with N and the expected ±1/(2√N) scatter. Tolerance for exact values: 1e-9."
- **P3, V:486.** "…such as the circuit `ry(1.137, q0); rz(0.44, q0)` (Bloch ≈ (0.821, 0.386, 0.420))."
- **P4, V:487.** "Simulate each Bell-measurement outcome branch **and** the deferred-measurement circuit."
- **P5, V:261.** "LOCAL BELL-HALF READOUT m1", matching V:417.
- **P6, V:661.** Split the dry run into `teleportMeasure(stateId) → {m0, m1}` and then `teleportCorrect(stateId, bits, correctionX, correctionZ) → fidelity`, so that the player chooses the corrections after seeing the bits. Platform lane, shared contract.

## Code-audit checklist (for the later `physics-code-audit` worker)

Run from a worktree with the quantum lane's code merged. Every step names its command and its verdict rule.

- **C0, baseline.** Run `python -m pytest -q evidence/red-team/physics-oracle` (exit 0) and `python evidence/red-team/physics-oracle/sabotage.py` (exit 0). If either is red, the oracle is broken; stop.
- **C1, correction rule.** Import the product's rule (Python, or call the JS `expectedCorrections` via node on a copy) for all four (m0,m1). Compare with `TEXTBOOK_RULE` (tpo:40). Any mismatch is RED.
- **C2, the product's quantum functions against the oracle.** Load `echo/quantum/*.py` in CPython, with a `CountingBackend(BasicSimulator())` injected where `backend` is expected, and call each exported function:
  - cloning: zero/one/plus/phase purities 1/1/0.5/0.5, plus the input state's identity (null 3 above);
  - Bell marginals for I/X/Z: 0.5 ± 1e-9 and from `partial_trace`, not from shots;
  - teleport dry run: for the 6 named states and `po.random_states(5)`, and every branch and correction, the product's fidelity equals `po.corrected_fidelity` within 1e-6.
  Grep that each returned `engine` value is one of the three in V:642.
- **C3, one `backend.run`.** Run `python evidence/red-team/physics-oracle/backend_run_audit.py echo/`. More than one site is RED. Then, for each site, read the enclosing function and trace every caller back to a user event (`grep -rn "<fn name>" echo/`). Any site reachable from a repeatable event (an E-press, a terminal button or a retry) without a module-level once-guard is RED. Runtime: on your OWN local-runner port, install the JS Proxy shim from `evidence/red-team/physics-oracle/README.md`, then play title → credits, press RETRY and VERIFY repeatedly, and restart from the pause menu without reloading. More than one call is RED. Report it as "local runner", never as Qollab.
- **C4, story token once.** In the quest machine (`echo/game/`), find the transition into `TELEPORT_COMMITTED`. Assert that the live token's measurement happens only on that transition, that calling it twice is a no-op (V:787 idempotence), and that no path re-measures the story token after a failed dry run. Dry runs must use *fresh* calibration states.
- **C5, endianness in the product.** `grep -rn "get_counts\|counts\[\|split('')\|\[0\]\|\[1\]" echo/`. Every counts-key parse must name its clbit mapping. Feed each parser the four keys in `out/endianness_table.txt`, and `'0 1'` if it uses two registers.
- **C6, labels.** `grep -rniE "certified|true random|quantum random|instant|faster|hardware|IonQ verified|unhackable|teleport(ed|ing)? (matter|body|object)" echo/ui echo/data echo/README.md`. Each hit must be a negation or an accurate label. Every displayed number carries an `engine` of exact, sampled or selected backend, and "fidelity 1.000000" comes only from `exact_qiskit_local`.
- **C7, no duplication on screen.** Screenshot the booth after the |+⟩ test and the rooftop after commit (own port). There must be no two-identical-capsule state for an unknown state, and the source must read MEASURED / CONSUMED after commit.
- **C8, m1 wording.** `grep -rn "RELAY READOUT\|m1" echo/ui echo/data`, then apply P5 if the owner rules on it.
- **C9, the product's own tests.** Run `echo/tests` with pytest. Check that its teleport states include a generic state AND both a Z-type and an X-type eigenstate (T1), and that its pass threshold is ≥ 0.999 (T2). Then sabotage it on a disposable copy, swapping the product's X/Z rule. If that stays green, it is a finding.

## What this does not verify

- It was not run inside Pyodide (none on this machine). Python 3.13 here vs 3.14 on Qollab.
- It does not compute the 5/6 optimality bound (literature).
- Nothing about Qollab or IonQ behaviour was observed. "BasicSimulator = Qollab's built-in simulator" comes from [[Research/qollab-platform-and-submission]], not from a Qollab run.
- There is no product code to audit yet. `echo/` does not exist on this branch.

## Related

- [[Design/gate-independence-cases]]: laws 3, 4, 5, 10, 13 and 15 applied here.
- [[Research/qollab-platform-and-submission]]: the one-job rule and BasicSimulator as the built-in backend.
- [[Missions/echo-hackathon-submission]]
