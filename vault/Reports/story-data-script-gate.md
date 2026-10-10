---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: story-ui / story-data, data-fixes
---

# Story data and its gate: what the phrase-based physics check can and cannot see

ECHO's whole script, hints and teach-back now live as data in `echo/data/{story,objectives,teachback}.js` (branch `lane/story-ui/story-data`). They are gated by `evidence/story-ui/story-data/check.mjs`.

**Measured** (2026-10-10, local Node 26, on this branch):
- The gate is red on the bad fixture (exit 1, 43 failures) and green on the data (exit 0).
- Sabotage on temp copies: 20 mutations, 16 red, **4 nulls**.

**The 4 nulls**, which are what a phrase gate cannot see:
- signalling verbs outside the list;
- a claim excused by an unrelated "no";
- a clone claim with no trigger word;
- a randomness claim in other words.

A human physics read stays necessary.

**Lessons that bite here:**
- `\bno\b` treats "No-cloning" as a negation. That excused "No-cloning prevents storing classical data" until the name was stripped first.
- A new pattern can flag a correct counterfactual in the baseline: "(a true copy of |+> would have purity 1)". When that happens, every later sabotage reads red for the wrong reason. `sabotage.mjs` now refuses unless the baseline is green.
- A `src` tag (verbatim from the vision) is checked against the vision's bytes. That check incidentally caught a 75/25 marginal edited into a verbatim line. A separate §7.3 rule now catches any non-50/50 receiver split in new text too.

Evidence: `evidence/story-ui/story-data/` (README, `01-red-on-bad-fixture.txt`, `02-green.txt`, `03-sabotage.md`, `script.md`).

## Consult 4 (data-fixes): a phrase gate cannot see a branch-dependent falsehood; a Qiskit table can

The supervisor's physics read found `extra_X`/`extra_Z` ("damaged a state that was already right") false whenever the other bit was 1. The phrase gate was green on it.

**Measured** (branch `lane/story-ui/data-fixes`):
- `evidence/story-ui/data-fixes/branch_truth.py` runs the real protocol in local Qiskit for all 16 (m0, m1) × (X, Z) cases on ry(1.137)·rz(0.44). The correction rule appears nowhere in it.
- With the 16-case map added and the old text kept, the gate went red in exactly the 4 both-wrong cases (00:11, 01:01, 10:10, 11:00), with 8 false claims.
- **A second defect the read missed:** `missing_X`/`missing_Z` ("left bit-flipped") were also false in those cases. The receiver held XZ·state.
- The fix is a wording rule: each line speaks only about its own switch, and a plan with both wrong shows two lines. The receiver holds X^(x⊕m1) Z^(z⊕m0)·state, so a per-switch claim is true whatever the other switch is.
- Sabotage: 48 cases, 43 red, the same 4 phrase nulls, 1 refused by the gate (Python missing → exit 2). Two cases break the PHYSICS script (m0/m1 swapped in the projection; Z applied where X belongs), and the real data goes red under both.

**Lesson:** a line that is true "for the example you thought of" needs every branch that selects it enumerated from physics. The selection table must be data (`TELEPORT_FAILURE_CASES`) so a gate can join it against the physics.

**A weak check caught in review, before it shipped:** "the zero-countdown beat says held" was satisfied by Mica's unrelated "Backup is still holding". It now requires the word to be about the isolation, and a sabotage proves it.

Evidence: `evidence/story-ui/data-fixes/` (README, `01`–`05`, `branch-truth.md`).
