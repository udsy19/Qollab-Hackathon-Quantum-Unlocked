---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
supersedes: "[[Reports/shared-contracts]]"
---

# Contracts v2: owner rulings folded into echo/contracts.js, measured

v2 extends the platform-owned `echo/contracts.js` and `echo/CONTRACTS.md` (v1: [[Reports/shared-contracts]]).
It folds in the owner's 2026-10-10 rulings, which are listed in the platform lane's `owner-answers.md`
under "13 lane design questions", "red-team physics ambiguities + captions", "overseer relay from story-ui" and "gameplay
consult 3". Branch `lane/platform/contracts-v2`. Measured on commit 340f45d.

## What was measured

| check | command | result |
|---|---|---|
| Qiskit ground truth | `python3 tools/contract-check/teleport_oracle.py --check` (Qiskit 2.5.2) | exit 0. On the test state ry(1.137) rz(0.44) and 3 random generic states, F = 1 on exactly 4/16 (m0, m1, X, Z) combinations, the §7.1 rule. Max wrong F is 0.674 / 0.576 / 0.478 / 0.415. Every branch has probability 1/4 |
| red first | v1 module (`git show 4e1b2ed:echo/contracts.js`) against the v2 gate | exit 1, 478 FAILs (609/1087 pass): dry run 359, event sources 33, refusal grid 41, settings 20, validator 12, marginal 4, edges 5, happy path 2, strict tables 2 |
| green | `node tools/contract-check/check.mjs` | exit 0, 1087/1087 |
| sabotage | `python3 tools/contract-check/sabotage.py` | exit 0: 49 cases, 43 red, 6 declared nulls, 0 mismatches |
| browser | headless Chrome 155 on `tools/contract-check/browser.html` (own port 8763) | two-phase dry run rendered from Qiskit rows; served sha256 `4dd92ff3…` equals `shasum` of the file |
| Qollab caps | `node tools/qollab-caps/check.mjs --root echo` | exit 1, only `entry-index` and `entry-main` (the G0 files are not on this branch) |

## Findings worth keeping

- **The verdict has two redundant guards.** `dryRunVerdict` passes only if the choice follows the rule AND the
  Qiskit fidelity is at least 0.999999. Removing either guard alone is a null: on generic states each guard implies the other.
  Removing both goes red. This is defence in depth, not a gap.
- **Fidelity can be cross-checked without Qiskit.** After the player's choice the receiver holds
  `X^(m1 xor applyX) Z^(m0 xor applyZ)|psi>`, so F is 1, x², z² or y² of the Bloch vector. The validator uses this
  only to refuse an engine's forged number, and Qiskit's value stays the one on screen (§10.6). The oracle's 64 rows
  agree with it to 1e-12.
- **"Generic" needs a number.** A state is generic iff max(x², y², z²) ≤ 0.9. On |0>, |+> or |+i> one wrong choice
  scores exactly 1, so the lesson is fake there. The validator refuses those requests.
- **A v1 null is closed.** Rebinding `teleport_terminal` to `TELEPORT_DRY_RUN`/`CORRECT_CALIBRATION` is now red,
  because `EVENT_SOURCES` says CORRECT_CALIBRATION comes from an experiment result, not from E.
- **`in` on a frozen table accepts inherited names.** In v1, `engine: "constructor"` and `experiment: "toString"`
  validated, and `transition(s, "constructor")` was refused instead of thrown. An adversarial review found this, and
  `Object.hasOwn` fixes it. The gate was red first (5 FAILs, `06-red-review-findings.log`).
- **Remaining nulls (blind spots):** the verdict guards one at a time (above); `EVENT_SOURCES` entries that are
  inferred rather than owner-ruled (e.g. ANIMATION_END); default setting values (validated, not pinned); renaming
  a §9.3 world-change id; the Map-specific hint text.
- **Some consumers are out of date** (branches read 2026-10-10):
  - quantum `qollab_job.py` sends `experiment: "bell_verification"`;
  - story-ui `accessibility.js` has a `subtitles` on/off field;
  - gameplay `missionRules.js` reads `probabilities['receiver=0']` and `parameters.correctionX`.

  The migration table is in the worker report `/Users/udsy/agent-org/lanes/platform/reports/0003-contracts-v2.md`.

Evidence: `/Users/udsy/agent-org/lanes/platform/renders/contracts-v2/` (00 oracle, 01 red, 02 green, 03 sabotage,
04 browser PNG + DOM + provenance, 05 caps).
