---
type: session
date: 2026-10-10
line: lane/quantum/quantum-hardening
model: claude-opus-5-5
outcome: done
---

# 2026-10-10 — quantum-hardening

## Goal
Make every number the quantum terminals show trustworthy: owner rulings 1–8 (random generic dry runs, hidden story token, once-only atomic commit, m1 label, backend_verification, EXACT relay panel) and physics-review findings F1, F3–F7.

## Vault check
Read `vault/AGENTS.md`, [[Reports/quantum-physics-review]], [[Reports/contract-conformance]], lane context/rulings/owner-answers, vision §7.4, §8.4, §10.5–10.7, platform contracts-v2. Stale: `evidence/physics-review/{sabotage,derive}.py` target retired fields; the brief's pending-gap filter became dead when platform merged contracts-v2 (f98e117).

## What changed
- `4d57f0e` tests first for F3–F7, red-before captured.
- `f8e335b` engine: calibration states, token, commit latch, rulings 1–8, F3/F4 wording.
- `0893403` conform to contracts-v2 (0.9 margin, unrounded echoed angles, filter removed).
- `f1d5b23` reviewer follow-ups (m1 label in circuitDescription, integer seeds, boolean X/Z).
- evidence commits; `03bd9a4` [[Reports/quantum-hardening]].

## Verified
- `pytest echo/tests`: 595 passed, exit 0 (`evidence/quantum/hardening/pytest-full.txt`); also 595 on a disposable merge with `lane/quantum/integration` f7efb92.
- Platform validator v2: 0/233 rejected (`validate.txt`); pre-v2: 3/233, all `backend_verification`.
- Sabotage: 42 mutations, 38 red, 4 nulls named (`sabotage.md`); derive.py 2034 numbers, worst 4.97e-11.
- Local only; not Pyodide, not Qollab.

## Decisions taken / proposed
- Taken: generic margin = platform's GENERIC_MAX_WRONG_FIDELITY 0.9; live_commit exposes no token-revealing field; renamed `*_bell_verification_*` functions.
- Proposed: none.

## Open questions for the owner
- None.

## Next
- Re-wire `echo/quantum/bridge.js` (`live_commit()`, `run_backend_verification_once`, theta/phi, `reset_story_token` on RESTART) in the same landing.
