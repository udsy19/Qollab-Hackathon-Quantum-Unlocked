---
type: report
status: current
date: 2026-10-09
updated: 2026-10-09
---

# Qollab static-caps gate: `tools/qollab-caps/check.mjs`

One command tells the owner whether `echo/` would break Qollab's static rules, with `file:line rule-id message` per failure.
Measured on base commit 6378677 plus the commit that adds this tool. Rules come from `QOLLAB_DEPLOYMENT.md`, `.claude/rules/qollab-runtime.md` and [[Research/qollab-platform-and-submission]] §1.

```
node tools/qollab-caps/check.mjs [--root <dir>]     # exit 0 green · 1 red · 2 refused
node tools/qollab-caps/run-fixtures.mjs              # every rule red on its fixture, clean tree green
node tools/qollab-caps/sabotage.mjs                  # mutates a disposable copy of the checker
```

## Rules (ids as printed)

| id | rule |
|---|---|
| `file-count` | more than 100 files under the root, hidden included (also: symlinks) |
| `file-size` | a file over 2,000,000 bytes (strict reading; 2 MiB is an owner question) |
| `html-document-tag`, `html-script`, `html-stylesheet` | `index.html` has `<html>/<head>/<body>`, `<script>`, or `<link rel=stylesheet>` |
| `entry-main`, `entry-index` | `main.js` / `index.html` missing |
| `storage` | `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `cookieStore` |
| `network-write` | `method: POST/PUT/DELETE/PATCH`, XHR `.open('POST'…)`, `sendBeacon`, `requests.post…` |
| `network-api` | `XMLHttpRequest` (any), `WebSocket`, `EventSource`, `new Worker`, `SharedWorker`, `serviceWorker`, `importScripts` |
| `import-specifier` | a bare/URL import that is not `three`, `three/addons/*`, `postprocessing`, an `https://` URL, or `echo/<dotted>.py` |
| `import-unresolved` | a relative import whose target is not in the upload (not asked for; one line of code, catches a real upload failure) |
| `backend-run-count` | more than one `backend.run` call site in `echo/**/*.js` |
| `backend-run-python` | a `.py` file calls `backend.run` |
| `hardcoded-backend` | `IonQ…` outside strings, or a string shaped like a backend id (`ionq`, `ionq_simulator`, `qpu.*`) |
| `hardcoded-secret` | `api_key`, `?token=`, `token = "…"` |

Design choices the supervisor should know: comments never fire (JS and Python tokenizer, regex literals and nested templates handled); a word **inside a string literal fires** and is tagged `(inside a string literal)`, because `window['localStorage']` must not slip through; prose strings that merely mention IonQ (UI/provenance text) are printed as `info`, not failures; HTML is not checked for IonQ prose. `token=` is narrowed to query strings and string values so the story-token concept does not fire.

## Evidence (all under `evidence/qollab-caps/`)

| what | file | result |
|---|---|---|
| 14 red fixtures + clean + limitations + generated count/size/refusal cases | `fixtures.log` | exit 0, every fixture produced exactly the expected `file:line rule` pairs |
| sabotage, 37 mutations on a disposable copy | `sabotage.log` | 37/37 caught, 0 nulls (1 declared equivalent mutant) |
| real `echo/` on this branch | `real-echo.log` | exit 1: `entry-index`, `entry-main` (G0 files not merged yet) |
| overlay of `echo/` from five lane branches (g0-runner-smoke, quantum-core, gameplay-quest-core, ui-shell, shared-contracts) | `overlay-all-lane-branches.log` | exit 0, 26 files, 1 `backend.run` site at `echo/main.js:114` |
| sample red logs | `red-*.log` | exit 1 |

## What the work found

- **Real over-fire, fixed.** The first run on `lane/quantum/quantum-core` flagged `echo/tests/test_formats.py:113` (`engine="ionq_magic"`, a deliberately invalid value). The backend-id pattern was too broad; it is now known shapes only, and `ionq_magic` is a trap in the clean fixture.
- **A sabotage harness that counted a crash as "caught".** A typo in my own edit crashed the checker (exit 1, which reads as red) and the first sabotage run reported 0 nulls. Fixed twice: the checker now turns any internal error into exit 2, and `sabotage.mjs` refuses a mutant that crashes on the clean tree and prints *which* fixture caught each mutation.
- Nulls found and closed by adding fixture content: triple-quoted Python docstrings, `${…}` template expressions, `backend['run']`, the string-literal tag, non-literal `fetch` method. One remaining mutant is declared equivalent: removing `refuse()` on a tokenizer failure still exits 2 through the crash handler; removing both is caught.
- `echo/tests/` is inside `echo/`, so the quantum lane's pytest files count toward the 100-file cap and are uploaded. That is the quantum lane's call; the gate counts them.

## LIMITATIONS (printed on every run)

`backend.run` is a call-site count, not a job count (a loop or an alias is invisible; the runtime guard is the only proof). String-built or f-string-expression access is not scanned. Regex-vs-division is a heuristic that refuses on a misread. Only `.js .mjs .cjs .py .html` are scanned for content. Static only: it says nothing about an actual Qollab run.

## Not done

Not wired into `scripts/gates/org-board.sh` (platform owns `tools/`, not the board; a request is in the report). The gate was written after the checker, not before: the first fixture run was the first time any rule went red; sabotage then showed which rules the fixtures did not pin.
