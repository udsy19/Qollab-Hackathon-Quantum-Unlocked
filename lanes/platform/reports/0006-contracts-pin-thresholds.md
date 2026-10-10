## TL;DR
- **DONE.** The contract gate now pins every owner-ruled constant. When a value is wrong, the gate prints a FAIL line that names the constant and the ruling. Commits 49b26d6 and a72f7ed, on `lane/platform/contracts-pin-thresholds`.
- Your three judging copies all go RED (exit 1):
  - `FIDELITY_PASS = 0.9` prints `FAIL  PIN FIDELITY_PASS must be 0.999999 (vision §7.4 …; owner-answers § overseer relay …); got 0.9`.
  - shots 1024 prints `PIN BACKEND_SHOTS`.
  - m1 `RELAY READOUT m1` prints `PIN BIT_LABELS.m1`.
- The real `echo/contracts.js` is **GREEN 1117/1117** (exit 0). Before this change the 0.9 copy was GREEN 1087/1087.
- `sabotage.py` passes (exit 0) with **61 cases: 55 expected red, 6 declared nulls, 0 mismatches**. The v2 value-null (`FIDELITY_PASS`) is now RED, and every new case you listed is RED.
- **Finding (not fixed, needs `echo/contracts.js`):** a correct choice at F = 0.999999 **does not pass**. The 1e-6 cross-check refuses it by 2.9e-17 of rounding. This is law 12: the guard is the same size as the band it defends.
- The remaining verdict nulls are *equivalent mutants*: no valid input changes the verdict. The reason is under Nulls.
- Diff vs `lane/platform/integration...` touches only `tools/contract-check/`, `evidence/platform/contracts-pin/` and `vault/Reports/`.
- **Recommend:** merge this branch. Then decide the equality fix in a separate contracts change (see Next).

## Vault check
- **Read:**
  - `vault/AGENTS.md` (delivered by the hook)
  - `vault/Index.md` (no prior entry on pinning contract values)
  - `vault/Reports/contracts-v2.md`
  - `.claude/rules/gate-independence.md`, and the headings of `vault/Design/gate-independence-cases.md`, laws 4, 11, 12 and 15
  - `lanes/platform/rulings.md`, `owner-answers.md` and `context.md`
- **Already known:** contracts-v2 recorded "removing either guard alone is a null … defence in depth, not a gap". That is true for verdicts. It is false for the exported VALUE, which other lanes import (`echo/CONTRACTS.md` documents `FIDELITY_PASS` and `BIT_LABELS` for UI and gameplay).
- **Reused:**
  - check.mjs's `ok`, `get`, `call`, `errs`, `RULE` (§7.1, parsed from the vision) and `teleport-fixtures.json` (Qiskit oracle).
  - sabotage.py's case format.
  - New symbols: `pin` and `RULED_RULE`. `where.mjs RULED_RULE --branches` found nothing.
- **Stale:** `vault/Reports/contracts-v2.md` "Remaining nulls" still lists the verdict guards one at a time as nulls. The value half is now closed. I did not edit that note (it belongs to the other report). Its successor note is `vault/Reports/contracts-pin-thresholds.md`.

## What I found
1. **Why the gate stayed green.** A result reaches `dryRunVerdict` only after two guards: `validateTeleportCorrectionResult`'s physics cross-check (|F − expected| ≤ 1e-6) and the generic-state guard (every wrong choice ≤ `GENERIC_MAX_WRONG_FIDELITY`). So on every valid input a right choice scores ≥ 1 − 1e-6 and a wrong one scores ≤ 0.9. Inside the verdict, any threshold in (0.9, 0.999999] gives the same verdicts. No behavioural probe can see the export drift. Only a pin on the value can (law 4a/11 in spirit: a one-sided check propped up by another guard).
2. **Equality at the threshold.** These measurements come from `evidence/platform/contracts-pin/5-equality-and-enabling-step.log`, using the real module at 43be7d9:

   | F (correct choice) | passed |
   |---|---|
   | 1 | true |
   | 0.9999995 | true |
   | **0.999999** | **false** — error "disagrees with the physics … expected 1.000000000" |
   | 0.9999990000001 | true |

   The cause is `1 - 0.999999 = 1.0000000000287557e-06`, which is greater than `FIDELITY_CROSSCHECK_TOLERANCE = 1e-6`. Qiskit gives 1 ± 1e-15 on a correct choice, so no player can hit this. It still contradicts "≥ 0.999999". Per the brief I **stopped and did not change `echo/contracts.js`**. The gate therefore does NOT probe exact equality: the probe would be red on the real file. The gate does probe the floor at 0.9999995 (pass) and at 0.99999 and 0.9 (no pass).
3. **`BIT_LABELS.m0` has no owner ruling.** Ruling (1) renamed only m1. The m0 label is pinned to the vision's own text (§7.4 Beat 2: "labeled `SOURCE READOUT m0`"). The gate exits 2 (refuses) if that text disappears from the vision. It does not invent a value.
4. **`GENERIC_MAX_WRONG_FIDELITY` = 0.9 is a v2 design value, not an owner ruling.** It is pinned with that origin stated, and checked against the Qiskit oracle: the worst wrong choice over the 4 fixture states measured **0.673960** (max over the 48 wrong rows of `teleport-fixtures.json`), which is ≤ 0.9.

## What I changed (commits)
- `49b26d6` changes `tools/contract-check/check.mjs`. It adds a new section, "owner-ruled values, pinned from the ruling text", with:
  - pins for `FIDELITY_PASS`, `BACKEND_SHOTS`, `TELEPORT_TEST_STATE`, `BIT_LABELS.m0/.m1/keys`, the correction rule (×4) and `EXPERIMENTS.backend_verification`, each with its citation;
  - a pin for `GENERIC_MAX_WRONG_FIDELITY` plus the oracle check;
  - a **circuit-order** probe: Qiskit's ry→rz X-error F = 0.673960 is accepted, and the hand-derived rz→ry F = sin²θ = 0.823332 is refused;
  - a **verdict floor** probe (4 fidelities);
  - a **rule** probe (12 wrong choices at F = 1 do not pass).

  The same commit changes `sabotage.py`: the two v2 nulls on the value become RED, with new cases, and the totals line now reports counts. It also adds the evidence logs.
- `a72f7ed`: `vault/Reports/contracts-pin-thresholds.md`. I did not commit hubs; `--check` reports Reports/README and Map as stale, as expected, for the loop to regenerate.

## Commands and exit codes

| # | command | result | exit |
|---|---|---|---|
| 0 | `node tools/contract-check/check.mjs --contracts <copy FIDELITY_PASS=0.9>`, OLD gate | GREEN 1087/1087 (the defect) | 0 |
| 1 | same copy, NEW gate (red-first) | RED 1116/1117, one PIN FIDELITY_PASS FAIL | 1 |
| 2 | `node tools/contract-check/check.mjs` | GREEN 1117/1117 | 0 |
| 3 | `python3 tools/contract-check/sabotage.py` | 61 cases, 55 red, 6 nulls, 0 mismatches | 0 |
| 4 | your judging copies: fidelity 0.9, shots 1024, m1 label, then the real file | RED, RED, RED, GREEN | 1, 1, 1, 0 |
| 5 | `pin()` sabotaged to `ok(true \|\| …)`, graded on the 0.9 copy | GREEN 1117/1117: the pin is the only detector (enabling step) | 0 |

New sabotage cases, all RED:
- `FIDELITY_PASS` → 0.5, 0.9, 0.99999 and 1
- shots → 1024
- m0/m1 labels swapped
- m1 → "RELAY READOUT m1"
- phi 0.44 → 0.4
- Bloch in rz-then-ry order
- `backend_verification` → `backend_check`
- `GENERIC_MAX_WRONG_FIDELITY` → 0.95
- verdict literal 0.9 combined with cross-check tolerance 0.2

## Evidence paths
`evidence/platform/contracts-pin/` contains a `README.md` table and these logs: `0-before-pins-fidelity-0.9.log`, `1-red-first-fidelity-0.9.log`, `2-green-real.log`, `3-sabotage.log`, `4-supervisor-judging-repro.log`, `5-equality-and-enabling-step.log`.

## Nulls (reported, not hidden)
- **Two verdict mutants are equivalent and stay NULL.** They are "verdict ignores the rule" and "verdict uses a literal 0.9 instead of `FIDELITY_PASS`". Neither changes the verdict on any input that passes validation (Finding 1). Both are undetectable by behaviour, and both are harmless while the cross-check and the genericity guard stand. Those two guards are covered: the cross-check is RED when loosened to 0.2 together with the literal, and `GENERIC_MAX_WRONG_FIDELITY` is pinned.
- **Unchanged from v2:** `ANIMATION_END` source, default volume, a §9.3 world-change id rename, and the Map hint text.
- **`FIDELITY_CROSSCHECK_TOLERANCE` (1e-6) is not pinned.** It is not owner-ruled. I measured loosening it alone to 0.2 by hand (it is not a sabotage.py case): the gate goes RED, but only through the circuit-order probe (gap 0.149). The forged-fidelity checks (gaps of 0.33 and more) do not catch it. A loosening to 0.1 would probably be NULL; I did not run it. Pinning the tolerance belongs with the equality fix (Next 2).

## What I did NOT do or could not verify
- I did not edit `echo/contracts.js`. The equality defect is open.
- No browser run and no port: this is gate-only work.
- No Qollab claims.
- I did not re-run `teleport_oracle.py` with Qiskit. I used the committed fixtures, which the v2 gate already grades.

## Decisions inferred from the docs
- **m0 label = "SOURCE READOUT m0".** Source: vision §7.4 Beat 2. Owner ruling (1) supersedes only the m1 half of that sentence.
- **Exact equality at 0.999999 is not probed in the gate.** Reason: the brief says to stop and report when a pin contradicts the ruling, rather than ship a red gate or change the contract silently (CLAUDE.md "Truthful quantum"; gate-independence law 5: a prescribed fix is a hypothesis).
- **The rz→ry wrong-order value is derived by hand in the gate** (Bloch (sin θ, 0, cos θ)), not taken from the module. Source: gate-independence law 4.

## What the supervisor should do next
1. Merge `lane/platform/contracts-pin-thresholds` into `lane/platform/integration`. The diff touches only tools, evidence and vault.
2. Commission a small platform change to `echo/contracts.js` for the equality defect. Make the cross-check tolerance strictly exceed the pass band (law 12): for example, set `FIDELITY_CROSSCHECK_TOLERANCE = 1e-7` and keep the floor as the verdict's job, or compare with `>= FIDELITY_PASS - 1e-12`. Then add an equality probe (F = 0.999999 passes) to check.mjs. That probe is red today, so write it first.
3. Tell gameplay (via `owner-answers.md`) to import `FIDELITY_PASS` from `echo/contracts.js` instead of keeping its own `FIDELITY_OK`. A pin here protects only consumers that import the value.
