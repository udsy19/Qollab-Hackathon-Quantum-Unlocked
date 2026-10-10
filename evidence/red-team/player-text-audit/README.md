# Player-text audit (red-team, consult 6)

Audits every player-visible string in story-ui's `echo/data` + `echo/ui` + `echo/main.css` against an
expected set derived **only** from the owner docs and rulings. The text is graded by this lane's own checker, never by story-ui's tests.

| file | what |
|---|---|
| `expected.mjs` | the expected set: required strings (a), forbidden claims with paraphrases (b), rule-swap and endianness checks (c), teach-back truths (d), byte census classes. Every entry cites `V:<line>` (ECHO_MASTER_VISION.md) or `OA:<line>` (lanes/red-team/owner-answers.md) |
| `check.mjs` | tokenizer (string literals with line numbers, comments skipped), byte census of every non-ASCII code point (law 13a), the graded checks. Exit 0 green · 1 red · 2 refused |
| `sabotage.mjs` | 58 cases on disposable copies: inject each forbidden claim and its paraphrases, delete each required string, swap m0/m1, add lookalike characters, repair each baseline-red check, and break the enabling inputs |
| `branch_truth.py` | independent Qiskit check of the 16 (m0,m1)×(X,Z) failure-line cases: it projects the real protocol and identifies the residual Pauli by fidelity. The correction rule is not used |
| `fixtures/good`, `fixtures/bad` | positive and negative controls |
| `out/baseline-320613e/` | findings.md/json, census.tsv, strings.tsv (every graded literal), negated_ok.tsv |
| `out/sabotage.md`, `out/branch_truth*.md`, `out/known_nulls.md` | sabotage table, branch truth plus its sabotage, demonstrated blind spots |

Run: `bash reproduce.sh [ref]` (default `320613e`).

Expected output: good fixture 0 findings, bad fixture 37, baseline 9 (HIGH 3, MED 4, LOW 2), sabotage 58/58, branch truth 16/16.

Provenance:
- `expected.mjs` was written before any story-ui string was read.
- After that read, three checks were tightened because the first sabotage pass showed them weak (see the report).
- Four paraphrase patterns were added after reading story-ui's own 4 null strings. Those 4 rows in `sabotage.md` are therefore not independent evidence.
