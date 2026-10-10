---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: story-ui / story-data
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
