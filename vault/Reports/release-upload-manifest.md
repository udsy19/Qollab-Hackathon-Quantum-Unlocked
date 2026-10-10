---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
owner: platform (release-upload-manifest)
tags:
  - release
  - qollab
  - integration
---

# Release upload manifest: one command builds the Qollab upload folder

Local tooling only, never run on Qollab. Branch `lane/platform/release-upload-manifest`. Builds on
[[Reports/integration-shell]] (the assembler) and [[Reports/qollab-caps-gate]] (the caps gate).

## What exists
`node tools/assemble-echo/assemble.mjs --release --out <dir> [--manifest <file>]` does four things.
- It writes the upload folder from the five `lane/*/integration` refs by lane ownership, as before.
- It omits `RELEASE_EXCLUDE` (`echo/tests/**`, `echo/QOLLAB_SMOKE_TEST.md`; consult 9 and consult 4). That list is declared once, in `assemble.mjs`. Excluded paths are printed as `EXCLUDED` and are not graded, because they never ship.
- It writes `sha256<TAB>bytes<TAB>path` for every file found by walking the output after the write. The default location is `<out>.manifest.tsv`. The manifest is refused if it would land inside the upload.
- It runs `tools/qollab-caps/check.mjs` on the output and prints `BLOCKER <lane> <kind> echo/<file>:<line>` for each blocker. Each blocker is attributed to the lane whose bytes were written; a conflict is attributed to each drifted copy's lane, at the first line that differs. It also prints `SITE` for every `backend.run` site and a per-lane count table.

Exit codes: 0 only when assembly and caps are both green, 1 when either is red, 2 when caps could not grade.

`check.mjs` now lists every `backend.run` site in its info line. Before, it listed the site only when there was exactly one.

## Measured (2026-10-10, refs pinned in `evidence/platform/release-manifest/pinned-refs.txt`)
| fact | value |
|---|---|
| upload files, counted with `find` | **30** (41 without `--release`; 11 excluded: 10 `tests/` files and the smoke doc) |
| total bytes / largest file | 263,453 / 35,660 (`contracts.js`) |
| manifest compared with an independent `shasum` listing | identical, 30 lines |
| caps on the upload | RED, 1 finding: `quantum/qollab_job.py:169 backend-run-python` |
| blockers | 9: four lanes each carry a drifted `contracts.js` and `CONTRACTS.md` (8); quantum also has the Python `backend.run` (1) |
| `backend.run` sites | `main.js:199` (platform) and `quantum/qollab_job.py:169` (quantum) |

## Sabotage (`tools/assemble-echo/sabotage.mjs`, disposable copies): 14 of 14 caught, 0 nulls
- Exclusion: four variants were caught: exclusion removed; exclusion and the leak re-check both removed; each list entry dropped. The fixture runner types the forbidden paths itself, so it catches a shortened list even though the assembler's own leak check shares that list.
- Manifest: omitting a file, adding a phantom file and an off-by-one byte count were all caught.
- Caps: a stub caps exiting 1 makes the release exit 1. A stub exiting 2, or a crash with no site list, makes it exit 2. An assembler that ignores the caps exit code was caught.
- Attribution: blaming everything on platform, blaming a conflict on the kept lane, and an off-by-one conflict line were all caught.

## Not covered (named, not passed)
- No check that `LICENSE` is in the upload, although `QOLLAB_DEPLOYMENT.md:28` lists it. The tree has none today.
- `CONTRACTS.md` (20 KB, a dev contract doc) still ships. It is not on the consult 9 list.
- The lane refs move while agents work: two runs 30 minutes apart gave 29 and then 30 files. Pin refs with `--ref lane=<sha>` for any evidence.
