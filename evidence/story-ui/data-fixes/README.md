# data-fixes evidence (lane story-ui, consult 4)

What this proves: the teleportation failure lines are true on all 16 (m0, m1) × (X, Z) cases, checked against the real protocol in local Qiskit. The credits, bit labels, dry-run rig, 00:00 hold, COMMIT rule, pronoun, teach-back and caption rulings are gated.

| file | what |
|---|---|
| `branch_truth.py` | independent ground truth: runs teleportation in Qiskit for all 16 cases on ry(1.137)·rz(0.44). Never reads echo/data. |
| `01-red-on-current-data.txt` | the extended gate on the consult-3 data: exit 1, 28 failures |
| `02-red-branch-truth-old-text.txt` | case map added, old failure text kept: red in the 4 both-wrong cases (8 false claims) |
| `03-green.txt` | the gate after the fixes: exit 0 |
| `04-sabotage.md` | 48 mutations on temp copies: 43 red, 4 nulls (the old phrase-gate nulls), 1 refused by the gate (python missing → exit 2) |
| `05-diff.md` | every changed line in echo/data, old and new |
| `branch-truth.md` / `render-branch-truth.mjs` | the 16-case table, with the lines each case shows |

Re-run: `node evidence/story-ui/story-data/check.mjs; node evidence/story-ui/story-data/sabotage.mjs; node evidence/story-ui/data-fixes/render-branch-truth.mjs > evidence/story-ui/data-fixes/branch-truth.md`. Set `ECHO_PYTHON` if the repo venv is not at the main checkout path.
