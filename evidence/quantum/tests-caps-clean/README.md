# tests-caps-clean — evidence

Goal: `node tools/qollab-caps/check.mjs` stops flagging `echo/tests/test_qollab_job.py` without weakening any test.

| file | what | how produced |
|---|---|---|
| caps-before.txt | 6 findings incl. :91 hardcoded-backend, :207 hardcoded-backend + hardcoded-secret | `node tools/qollab-caps/check.mjs` on c6558fb (exit 1) |
| caps-after.txt | 3 findings: entry-index, entry-main, backend-run-python only | same command after the edit (exit 1, expected — those 3 are platform/bridge-rewire) |
| pytest-before.txt / pytest-after.txt | 595 passed / 595 passed | `python -m pytest echo/tests -q -p no:cacheprovider` |
| sabotage.sh | 9-case sabotage on a DISPOSABLE copy of echo/ (law 10) | `bash sabotage.sh <python>`; exit 0 = every sabotage red and both controls green |
| sabotage-before-edit.txt | run against the UNEDITED test: 2 NULLs (`"ionq-simulator"`, `apikey` pass undetected) | same script, before the edit |
| sabotage-after-edit.txt | run after the edit: 9/9 OK, 0 nulls | same script, after the edit |

The scan-count rise (19 -> 34 files) between before/after is gitignored `__pycache__/` written by pytest
inside `echo/`; caps counts it. Strip `__pycache__` before any upload.
