## TL;DR
- DONE. The 3 caps findings in `echo/tests/test_qollab_job.py` are gone. Caps now shows only `entry-index`, `entry-main` and `backend-run-python` (exit 1, as expected).
- pytest `echo/tests`: 595 passed before, 595 passed after. No test was deleted or skipped.
- The tests got stronger. Sabotage on the UNEDITED test found 2 nulls: `"ionq-simulator"` and `apikey` written into `qollab_job.py` passed undetected. After the edit, all 9 sabotage cases are OK with 0 nulls (`sabotage.sh` exit 0).
- Commits on `lane/quantum/tests-caps-clean`: `ce65a30` (test edit + evidence), `08bf8c2` (vault report).
- Evidence: `evidence/quantum/tests-caps-clean/` (caps-before/after, pytest-before/after, sabotage.sh, sabotage-before-edit.txt, sabotage-after-edit.txt, README.md).
- Recommend: merge into `lane/quantum/integration`. Ask platform to strip `__pycache__` from the upload (side finding below).

## Vault check
- Read: `vault/AGENTS.md` (via hook), `vault/Index.md` (caps row), `vault/Reports/quantum-vs-contracts-v2.md` (gap rows 4–5), `vault/Reports/quantum-hardening.md` (format), `vault/CLAUDE.md`, `tools/qollab-caps/check.mjs` (rule regexes, lines 185–237), lane `context.md`.
- Already known: gap rows 4–5 named exactly these 3 findings. The caps rule table is in `vault/Reports/qollab-caps-gate.md`.
- Reused: the existing tests, `conftest.py` (unchanged) and the existing `importlib` import.
- Stale: once this lands, gap rows 4–5 in `quantum-vs-contracts-v2.md` are closed. I did not edit that report; the supervisor should mark it.

## What each flagged test protects, and what changed
| finding | test | protects | change |
|---|---|---|---|
| `:91 hardcoded-backend ionq_job` | `test_ionq_histogram_mapping_reads_the_flipped_qubit` | how we read qiskit-ionq's histogram→counts key order | `from qiskit_ionq.ionq_job import _build_counts` → `importlib.import_module("qiskit_ionq.ionq_job")._build_counts`. Caps DOES scan this string and classes it as a non-id (an info line). This does not use the f-string/string-built blind spot. |
| `:207 hardcoded-backend "ionq_simulator"` | `test_module_never_creates_or_names_a_backend` | `qollab_job.py` never names a backend | `r"ionq_simulator"` → `r"ionq[_.\-]?simulator"`. Also catches the `ionq-simulator`, `ionq.simulator` and `ionqsimulator` spellings. |
| `:207 hardcoded-secret api_key` | same test | `qollab_job.py` never reads a key | `r"api_key\|token"` → `r"api[_-]?key\|token"`. Also catches `apikey` and `api-key`. |

## Commands (worktree, commit ce65a30; PY = /Users/udsy/PycharmProjects/Qollab-Hackathon-Quantum-Unlocked/.venv/bin/python)
- `node tools/qollab-caps/check.mjs` before: exit 1, 6 findings → `caps-before.txt`
- `node tools/qollab-caps/check.mjs` after: exit 1, 3 findings (entry-index, entry-main, backend-run-python) → `caps-after.txt`
- `$PY -m pytest echo/tests -q -p no:cacheprovider`: 595 passed before and after (exit 0)
- `bash evidence/quantum/tests-caps-clean/sabotage.sh $PY`: before the edit, exit 1 with 2 NULLs; after the edit, exit 0
- `node scripts/vault-hubs.mjs --check` exit 0; `python3 scripts/gen-subject-index.py --check` exit 0 (after regenerating. Per the worker rules the generated files were NOT committed; the loop regenerates them on merge.)
- `git merge lane/quantum/integration`: "Already up to date" (integration = c6558fb = my base). quantum-hardening was already an ancestor.

## Sabotage (disposable copy of echo/ in mktemp; the worktree is never mutated)
After the edit: both controls green; `"ionq_simulator"`, `"ionq-simulator"`, `os.environ.get("IONQ_API_KEY")` into `API_KEY`, `apikey`, `auth_token` and an import of `BasicSimulator` all turn T1 RED; reversing the key order in `interpret_counts` turns T2 RED. The script also fails on a skipped test, so a missing qiskit_ionq cannot count as a pass.
**Nulls:** none after the edit. Before the edit there were 2 (hyphen spelling and `apikey`), and both are now closed.

## Side finding (platform)
pytest writes gitignored `__pycache__/` into `echo/quantum` and `echo/tests`. Caps then scanned 34 files instead of 19, and those files would count toward Qollab's 100-file cap if `echo/` were uploaded from a working tree. Release packaging should strip them, or pytest should run with `PYTHONDONTWRITEBYTECODE=1`.

## Did NOT do
- Did not touch `tools/qollab-caps/`, `echo/quantum/*.py`, `bridge.js` or `conftest.py`.
- Nothing was run on Qollab or in Pyodide; this is local runner only.
- Did not edit `quantum-vs-contracts-v2.md` to close rows 4–5.

## Decisions inferred from the docs
- I chose broader regex classes over moving the patterns to a fixture outside `echo/`. `echo/` must stay self-contained (qollab-runtime.md: "Nothing outside echo/ may be required"), and the broader patterns proved stronger in the sabotage round.
- I used `importlib.import_module` with a module-path string rather than splitting the string. Caps classifies the full string as a non-backend-id by design (BACKEND_ID_STRING, check.mjs:191), so the test stays scannable and honest.

## Next (supervisor)
1. Re-run on a detached worktree: `node tools/qollab-caps/check.mjs`; `$PY -m pytest echo/tests -q`; `bash evidence/quantum/tests-caps-clean/sabotage.sh $PY` (expect exit 0).
2. Merge `lane/quantum/tests-caps-clean` into `lane/quantum/integration`, then mark gap rows 4–5 closed.
3. Tell platform about `__pycache__` in the upload.
