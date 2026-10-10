## Vault check
Read: `vault/AGENTS.md`, `vault/Research/qollab-platform-and-submission.md` §1 (limits, `<script>` rule, one-job guard, network rules), `QOLLAB_DEPLOYMENT.md`, `.claude/rules/*`. `where.mjs caps --branches` and `git grep "100 files"`: no existing caps check, only prose. Reused: the exit-code convention and refuse() shape of `tools/contract-check/check.mjs`. Stale/wrong: nothing found. I did not open `gate-independence-cases.md` in full.

## TL;DR
- DONE, commit on `lane/platform/echo-caps-gate`: `node tools/qollab-caps/check.mjs [--root dir]` → exit 0/1/2, prints `file:line rule-id message`. 16 rule ids cover your items 1–9.
- Fixtures: 14 red + clean + limitations + generated count/size/refusal cases, `run-fixtures.mjs` exit 0, exact `file:line rule` pairs asserted (`evidence/qollab-caps/fixtures.log`).
- Sabotage on a disposable copy: 37 mutations, 37 caught, 0 nulls (1 declared equivalent mutant). `evidence/qollab-caps/sabotage.log`.
- Real `echo/` on this branch: **RED exit 1**, `entry-index` and `entry-main` only, because the G0 files are not merged here. Overlay of `echo/` from 5 lane branches (incl. g0-runner-smoke): **GREEN exit 0**, 26 files, one `backend.run` at `echo/main.js:114`.
- Recommend: add to the post-merge routine; owner runs it before upload. Not wired into `org-board.sh` (not my file).

## Commands, exit codes, logs (all in `evidence/qollab-caps/`)
| command | exit | log |
|---|---|---|
| `run-fixtures.mjs` | 0 | `fixtures.log` |
| `sabotage.mjs` | 0 | `sabotage.log` |
| `check.mjs` (real echo/) | 1 | `real-echo.log` |
| `check.mjs --root <overlay of 5 lane branches' echo/>` | 0 | `overlay-all-lane-branches.log` |
| `check.mjs --root fixtures/{storage,backend-run-count,hardcoded-backend,html-script}` | 1 each | `red-*.log` |

## What I found (honest)
- **Real false positive, fixed:** quantum-core's `echo/tests/test_formats.py:113` `engine="ionq_magic"` fired `hardcoded-backend`. Pattern narrowed to known id shapes; now a trap in the clean fixture. Evidence: the overlay log is green after the fix.
- **My own gate lied once:** a typo crashed the checker with exit 1 (reads as red) and the first sabotage run said "0 nulls". Fixes: internal error → exit 2; the sabotage script refuses a mutant that crashes on the clean tree and prints which fixture caught each mutation. 5 nulls from the first honest run (triple-quote docstrings, `${}` expressions, `backend['run']`, the string-literal tag, non-literal fetch method) were closed with fixture content.
- **Order caveat:** the checker was written before its fixtures, not after-failing-first. The first fixture run was the first time any rule went red; the sabotage round is what proves the fixtures pin the logic.
- `echo/tests/` ships inside `echo/`, so quantum's pytest files count toward the 100-file cap.

## Nulls (what did NOT go red)
- Only one: removing `refuse()` on a tokenizer failure stays exit 2 via the crash handler (two layers). Declared in `sabotage.mjs`; removing both is caught.
- Not sabotaged: `html-stylesheet`'s regex variants, symlink handling, the `info` lines other than fetch/alias.

## LIMITATIONS (also printed on every run)
`backend.run` counted per call site, not per execution (loop/alias invisible; the runtime guard is the real proof); f-string `{expr}` and string-built property access unscanned; regex-vs-division heuristic refuses on a misread; only .js/.mjs/.cjs/.py/.html scanned for content; says nothing about a real Qollab run. A string literal containing e.g. `localStorage` is red (tagged), so prose in strings must be reworded.

## Not done
Did not touch `echo/`. Did not commit regenerated hubs (per brief rules; `vault-hubs --check` reports Map.md and Reports/README.md STALE until the loop regenerates them after merge, so the vault report is not yet linked).

## Questions for the owner
1. "2 MB": 2,000,000 bytes (what I enforce) or 2 MiB (2,097,152)? A file between the two is red here.
2. Count `.DS_Store`/`.git` toward 100? I count everything (strict) and print an info line; Qollab's uploader drops them.
3. Two rules beyond your list: `html-stylesheet` (research: `main.css` is the only stylesheet loaded) and `import-unresolved` (relative import to a file not in the upload). Keep?
4. Any `XMLHttpRequest` is red (runtime doc says XHR is blocked), stricter than "XHR open with POST".

## Next for the supervisor
Merge the branch; have each lane run `node tools/qollab-caps/check.mjs` after merges; ask the owner the 4 questions; consider adding the check to `org-board.sh`.
