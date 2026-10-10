## TL;DR
- **Done.** `node tools/assemble-echo/assemble.mjs --release --out <dir>` writes the Qollab upload folder. It omits `echo/tests/**` and `echo/QOLLAB_SMOKE_TEST.md` (the list is declared once, `RELEASE_EXCLUDE` in assemble.mjs), writes a sha256 manifest from the walked tree (beside the folder, never inside it), runs caps and passes caps' verdict through, and prints `BLOCKER <lane> <kind> echo/<file>:<line>` plus a per-lane table.
- **Real run on pinned refs:** 30 files (41 without `--release`). RELEASE **RED**, 9 blockers:
  - quantum, gameplay, story-ui and art each carry a drifted `contracts.js` and `CONTRACTS.md` (8);
  - quantum `qollab_job.py:169` calls `backend.run` from Python (1; also the only caps red).
- **Independent check:** a `find` + `shasum` listing (no node) matches the manifest exactly (30 lines). `tests/`: 0, smoke doc: 0, README.md present.
- **Fixtures:** 13/13 green; the 5 release fixtures were RED before (evidence 01). **Sabotage 14/14 caught, 0 nulls.** The three you named are all caught.
- **Not checked by anything:** `LICENSE` is missing from the upload (`QOLLAB_DEPLOYMENT.md:28` lists it). `CONTRACTS.md` still ships.
- Commits `ddcd3d6`, `4822ed5`, `1225f8d` on `lane/platform/release-upload-manifest`. Evidence: `evidence/platform/release-manifest/` (README has commands and exit codes).

## Vault check
- **Read:** `vault/AGENTS.md`, `vault/Index.md` (no release or manifest entry), `vault/Reports/integration-shell.md`, `lanes/platform/lane-memory.md` (consults 4, 9 and 10), `vault/Research/qollab-platform-and-submission.md` (requirements.txt and README rows), `QOLLAB_DEPLOYMENT.md:28`, the headers of `tools/assemble-echo/*` and `tools/qollab-caps/*`. `where.mjs manifest --branches` found no implementation on main or on any of the 44 unlanded branches.
- **Already known:** the assembler and its fixtures; caps and its sabotage harness; the consult 9 decision (tests stay in the repo and are not uploaded); the consult 4 decision (the smoke doc is excluded).
- **Reused:**
  - extended `assemble.mjs` instead of writing a second tool;
  - extended `run-fixtures.mjs`;
  - modelled `sabotage.mjs` on `qollab-caps/sabotage.mjs`;
  - caps is called, not re-implemented. `backend.run` sites come from caps' own info line, which I widened to list every site.
- **Stale:** in `vault/Reports/integration-shell.md`, the "Quantum `tests/test_qollab_job.py:91,207` trips caps" defect no longer holds. Caps on the full 41-file assembly now reds only `qollab_job.py:169` (evidence 06). The `bell_verification` and `backend.run`-in-Python items there are still open; the second one is measured here.

## What I found
- On pinned refs, the release removes 11 of 41 files: the 10 `tests/` files and the smoke doc.
- Every remaining red is a lane carrying its own copy of a platform file. Quantum, story-ui and art share the same old contracts copy (`fcbcd50`, first diff at line 75). Gameplay's copy is older still (`f5d9633`, diff from line 2). Platform's copy is kept. The fix is for each lane to delete its copy or merge platform's integration. No code changes are needed.
- The refs move while agents work. Two runs 30 minutes apart gave 29 and then 30 files (story-ui added `ui/opening.js`). So the evidence run is pinned with `--ref lane=<sha>` (`pinned-refs.txt`).

## What I changed
- `tools/assemble-echo/assemble.mjs`: adds `--release` and `--manifest`; the header comment documents usage. Disk-versus-plan is now compared by path set (it was a count). A leak re-check runs on the walked tree.
- `tools/assemble-echo/run-fixtures.mjs`: adds 5 release fixtures: clean, smoke doc on quantum, caps red via two `backend.run`, unresolved import, conflict line. They walk and hash the output themselves and hand-type the paths that must be absent.
- `tools/assemble-echo/sabotage.mjs` (new): 14 mutations on disposable copies, with a control run first.
- `tools/qollab-caps/check.mjs`: the info line now lists all `backend.run` sites. Caps fixtures are still green.
- `evidence/platform/release-manifest/` and `vault/Reports/release-upload-manifest.md`.

## Sabotage (the three asked, plus 11 more), from `04-sabotage.txt`
| mutation | result |
|---|---|
| exclusion removed | CAUGHT (all 5 release fixtures: LEAKED) |
| exclusion and the assembler's own leak re-check removed | CAUGHT (the fixture runner's hand-typed paths) |
| `echo/tests/**` dropped from the list / smoke doc dropped | CAUGHT / CAUGHT |
| manifest omits one file / phantom file / bytes +1 | CAUGHT ×3 |
| caps stub exits 1 while assembly is green | CAUGHT: release exits 1 |
| caps exits 2 / crashes with no site list | CAUGHT: release exits 2 (refused, never green) |
| assembler ignores the caps exit code | CAUGHT (release-caps-red, release-unresolved-import) |
| caps blockers all blamed on platform / conflict blamed on the kept lane / conflict line off by one | CAUGHT ×3 |

**Nulls: none.** One dependency to note: the assembler's internal leak check uses the same `RELEASE_EXCLUDE` list. So a shortened list is caught only by the fixtures, not by the assembler at release time.

## Evidence paths
`evidence/platform/release-manifest/`: 01 fixtures red before · 02 real run · 03 independent `find`/`shasum` check · 04 sabotage · 05 fixtures green · 06 caps without `--release` · `upload.manifest.tsv` · `pinned-refs.txt` · README.

## What I did NOT do, or could not verify
- Nothing ran on Qollab or the local runner. This is static assembly plus caps only.
- I did not touch `echo/main.js` or any other `echo/` file.
- There is no `LICENSE` check, and no LICENSE exists in the upload.
- No PNG: the deliverable is a folder plus text tables.
- I did not regenerate the hubs (they are STALE by design; the loop regenerates them).

## Decisions inferred from the docs
- **Flag name `--release`; the manifest goes beside the folder (`<out>.manifest.tsv`).** Anything inside `echo/` is uploaded and counts against the 100-file cap (QOLLAB_DEPLOYMENT.md, caps).
- **Excluded paths are not graded for conflict or ownership.** They never ship, so they cannot block the upload (brief: "what still blocks a clean assembled build"). They are still printed as `EXCLUDED` with their carrying lane.
- **A conflict belongs to the drifted copy's lane, not the owner's.** Lane ownership says the owner's copy wins (`.claude/rules/lane-ownership.md`; consult 4).
- **Kept the exclusion list to the two consult 9 entries.** `CONTRACTS.md` is not in the doc's upload list (`QOLLAB_DEPLOYMENT.md:28`), but excluding it is a supervisor call, so I left it in.

## What the supervisor should do next
1. Re-run on a `git archive` extract of `1225f8d`: `node tools/assemble-echo/run-fixtures.mjs` (13/13), `node tools/assemble-echo/sabotage.mjs` (14, 0 nulls), then the pinned command in the evidence README (30 files, exit 1).
2. Relay these to the lanes:
   - quantum, story-ui, art and gameplay: drop the local `echo/contracts.js` and `echo/CONTRACTS.md` copies, or merge `lane/platform/integration`;
   - quantum: move `backend.run` out of `qollab_job.py:169` into JS, or get an owner ruling.
3. Decide two things:
   - (a) add `echo/LICENSE` (MIT, platform release file) plus a caps or assembler presence check;
   - (b) whether to add `echo/CONTRACTS.md` to `RELEASE_EXCLUDE`. It is one line in `assemble.mjs`; I can do both in a follow-up.
