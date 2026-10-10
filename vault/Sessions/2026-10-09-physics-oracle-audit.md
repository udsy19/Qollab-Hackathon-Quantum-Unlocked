---
type: session
date: 2026-10-09
line: lane/red-team/physics-oracle-audit
model: claude-opus-5-5
outcome: done
---

# 2026-10-09 — physics-oracle-audit

## Goal
Build independent physics ground truth so the red-team can rule on ECHO's quantum puzzles within an hour of the quantum lane's code landing, and audit the spec's physics claims. This serves the "quantum tests pass" bar of [[Missions/echo-hackathon-submission]].

## Vault check
Read [[AGENTS]], [[Index]], [[Missions/echo-hackathon-submission]], [[Research/qollab-platform-and-submission]] and [[Design/gate-independence-cases]] (laws 3, 4, 5, 15). Nothing on quantum physics was known yet. Reused from the research note: the one-job rule and BasicSimulator as Qollab's built-in backend. Nothing stale.

## What changed
- `d12606a`: the oracle library, its tests, the sabotage harness, the `backend.run` scanner and the `out/` tables, under `evidence/red-team/physics-oracle/`.
- `8c2da3b`: the vision doc's §10.3–10.5 reference code, executed against hand-derived values.
- This commit: [[Reports/physics-oracle-audit]] and this note.

## Verified
- `python -m pytest -q evidence/red-team/physics-oracle -p no:cacheprovider`: 523 passed, exit 0.
- `python evidence/red-team/physics-oracle/sabotage.py`: exit 0. The control is green and all 19 sabotages are red. One null on the first round was fixed; see the report.

## Decisions taken / proposed
- Proposed for the owner: P1–P6 in [[Reports/physics-oracle-audit]]. Wording and contract only; the audit found no FALSE physics.

## Open questions for the owner
- See the report's questions (m1 label, the order of correction and bits in the dry run, rotation order, the receiver panel being exact or sampled).

## Next
- When `echo/quantum` lands: run checklist C0–C9 in [[Reports/physics-oracle-audit]].
