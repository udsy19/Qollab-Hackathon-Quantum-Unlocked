## TL;DR
- **DONE.** Commit `504666f` on `lane/platform/contracts-fidelity-band`.
- **What changed:** `echo/contracts.js` gains `FIDELITY_EPSILON = 1e-12`. The cross-check now refuses `|F − analytic| > 1e-6 + ε`, and the verdict passes at `F ≥ 0.999999 − ε`. No existing value moved.
- **Player-facing result:** a correct choice at exactly F = 0.999999, or at 0.999999 − 1e-15, now passes. F = 0.999999 − 1e-9, 0.99999 and 0.9 still fail.
- **Your judging, re-run on my own `git archive` extract:**
  - real contracts: GREEN 1132/1132, exit 0;
  - tolerance 1e-1: RED (10 FAIL lines); tolerance 1e-2: RED (7); `FIDELITY_PASS` 0.9: RED. All exit 1;
  - sabotage.py: 72 cases, 65 red, 7 declared nulls, **0 mismatches**, exit 0;
  - qollab-caps: GREEN, exit 0.
- **The 1e-1 and 1e-2 copies go red on behaviour, not only on the PIN.** Nine new forged-fidelity probes, at gaps 1e-5, 1e-3 and 0.05, must be refused by the cross-check itself. With the PIN disarmed, both copies are still RED.
- **I did not tighten the tolerance to ≤1e-9.** That would refuse a correct F = 0.999999, which is your probe 1. The cross-check must accept what the §7.4 band accepts (reasoning under Decisions).
- **Evidence:** `evidence/platform/contracts-fidelity-band/` (README table). Vault note: `vault/Reports/contracts-fidelity-band.md`.
- **Recommend:** merge. Then ask gameplay to drop its own `FIDELITY_OK` (see Next).

## Vault check
- **Read:**
  - `vault/AGENTS.md`, delivered by the hook;
  - report `lanes/platform/reports/0006-contracts-pin-thresholds.md`, in full;
  - `vault/Reports/contracts-v2.md` (for the 4.7e-13 agreement) and `vault/Reports/contracts-pin-thresholds.md` (head);
  - `.claude/rules/gate-independence.md`;
  - the law 12 and law 15 cases in `vault/Design/gate-independence-cases.md`. Both have no project case yet.
- **Already known:** 0006 measured the equality defect (2.9e-17) and predicted the 0.1 null. You confirmed that prediction.
- **Reused:**
  - check.mjs's `pin`, `ok`, `errs`, `call`, `dryRes`, `orderReq`/`orderRes`, `xRow` and the oracle `T`;
  - the case format in sabotage.py.
- **Searched before writing:** `where.mjs FIDELITY_EPSILON --branches` found nothing anywhere (exit 1).
- **Stale:** the comment on 0006's verdict nulls in sabotage.py still says "1e-6 physics cross-check". It is still accurate as the tolerance; I left it.

## What I found
- **4.67e-13 is re-derived, not copied.** The max |hand-analytic − Qiskit| over the 4 oracle states (64 rows) is 4.665e-13. The gate now computes it on every run.
- **The old gate had no forged probe with a gap in (1e-6, 0.149).** That is why tolerances of 1e-1 and 1e-2 stayed GREEN (`0-before-old-gate-tol-*.log`, exit 0).

## Commands and exit codes

| # | command | result | exit |
|---|---|---|---|
| 0 | OLD gate on copies with tolerance 1e-1 / 1e-2 | GREEN 1117/1117 (the defect) | 0 / 0 |
| 1 | NEW probes, OLD contracts (red first) | RED 1129/1132: F=0.999999 refused, F=0.999999−1e-15 refused, ε missing | 1 |
| 1b | NEW probes on the 1e-1 / 1e-2 copies | RED | 1 / 1 |
| 2 | `node tools/contract-check/check.mjs` (fixed) | GREEN 1132/1132 | 0 |
| 3 | your judging copies: tolerance 1e-1, 1e-2, `FIDELITY_PASS` 0.9 | RED (10, 7, 1 FAIL lines) | 1, 1, 1 |
| 4 | `python3 tools/contract-check/sabotage.py` | 72 cases, 65 red, 7 nulls, 0 mismatches | 0 |
| 5 | enabling step on gate copies: PIN disarmed / forged probes disarmed / both disarmed | RED, RED, GREEN | 1, 1, 0 |
| 6 | `node tools/qollab-caps/check.mjs --root echo` | GREEN. The branch has the entry files; scanned 8 files | 0 |
| 7 | extra mutations you did not list (`7-extra-mutations.log`) | all RED | 1 ×6 |

Mutations in row 7:
- one-sided cross-check, both signs;
- tolerance × 1e4 relative to `want`;
- tolerance = `1 − FIDELITY_PASS`;
- ε = 1e-13;
- tolerance = 1.5e-6.

New sabotage cases, all RED:
- tolerance → 1e-1, 1e-2, 1e-5, 2e-6, and 1e-9 (tightened);
- the cross-check drops ε (the 0006 defect);
- the verdict drops ε;
- ε → 1e-9 and ε → 0;
- the verdict's ε sign flipped.

## Nulls
- **Declared null: verdict `>=` → `>`.** It is equivalent. The two differ only at F = 0.999999 − 1e-12 to the last bit, which neither Qiskit (1 ± 1e-15 on a right choice) nor any probe produces.
- **Caught by the PIN line only, with no behavioural witness:**
  - tolerance 2e-6 and 1.5e-6: no forged probe sits in the gap (1e-6, 1e-5);
  - tolerance = `1 − FIDELITY_PASS`: it is 1e-6 + 2.9e-17, behaviourally equivalent, and the strict pin rejects it;
  - ε 1e-9 and ε 1e-13: no floor probe sits in (1e-12, 1e-9), and rounding still clears at 1e-13.

  They are RED, but only through the pin. I could add a forged probe at a gap of 2e-6, but it would sit just 2× above the band. I kept the pins as the detector for small drift.
- **Unchanged from 0006:** "verdict ignores the rule", "verdict literal 0.9", `ANIMATION_END` source, default volume, the §9.3 id rename, the Map hint.

## What changed
`504666f` touches:
- `echo/contracts.js`: +ε, used in both comparisons, with a comment giving the derivation;
- `echo/CONTRACTS.md`: the two bullets whose behaviour changed, plus a one-row **Migration** note (new export `FIDELITY_EPSILON`; no value moved);
- `tools/contract-check/check.mjs`: pins, the oracle-gap check, the forged probes and the floor probes;
- `tools/contract-check/sabotage.py`;
- the evidence and the vault note.

The `lane/platform/integration...HEAD` diff touches only the allowed paths.

## Not done
- No browser run and no port: this is contract and gate work only.
- No Qollab claims.
- I did not re-run `teleport_oracle.py` under Qiskit. I used the committed fixtures, which the gate already grades.
- I did not edit `vault/Design/gate-independence-cases.md`. A law 12 project case is a candidate; that file is not in my diff allowance.

## Decisions inferred from the docs
- **The tolerance stays equal to the band width (1e-6), and ε resolves the edge; I did not tighten to ≤1e-9.**
  - Source: vision §7.4 "≥0.999999" and the brief's probe 1.
  - With tolerance ≤1e-9, a correct F = 0.999999 is refused as unphysical, and `FIDELITY_PASS` becomes decorative.
  - Real players are unaffected either way, since Qiskit gives 1 ± 1e-15.
- **ε = 1e-12.**
  - It is above the measured 4.67e-13 oracle disagreement and the 2.9e-17 double rounding.
  - It is 1e6 below the band.
- **The verdict also takes ε.** Source: your probe 1b (0.999999 − 1e-15 must pass).

## What the supervisor should do next
1. Merge `lane/platform/contracts-fidelity-band` into integration. Tell the lanes, in `owner-answers.md`, about the new export `FIDELITY_EPSILON`. No value moved.
2. **Gameplay request:** `echo/game/missionRules.js` (on 5 gameplay branches) keeps its own `FIDELITY_OK = 0.999999` and compares `r.fidelity >= FIDELITY_OK` with no ε. That is the same edge, on the clone basis demo. It should import `FIDELITY_PASS`/`FIDELITY_EPSILON` from `echo/contracts.js`, or use `dryRunVerdict` for the teleport.
3. Optional: add this law 12 case to `vault/Design/gate-independence-cases.md`: a guard equal to its band, with no slack, refused the band's own edge.
