=== PLAN ===
**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`. It ships with a local runner in `tools/` and `QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Sat 00:50. G1 Sat 04:00 · G2 Sat 17:00 (else the one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- shared-contracts, echo-caps-gate, g0-runner-smoke, contracts-v2 (landed), contracts-pin-thresholds, contracts-fidelity-band, integration-shell, readme-and-video-draft, contracts-moments-and-land, contracts-land (landed), contracts-commit-result, contracts-land-2 (landed ae39421).
- G0 is proven on Qollab: built-in and IonQ Forte 1 sim, one job each, with build 10c. Only the human-input check is pending (owner).
- **Consult 15:** merged `release-upload-manifest`. My own checks:
  - on a `git archive` extract, fixtures 13/13 GREEN and sabotage 14/14 with 0 nulls;
  - my own `--release` run on the pinned refs gave rc 1, 30 files, 0 `tests/` or smoke-doc leaks, and 9 BLOCKER lines, matching the report;
  - merge-tree clean, and the branch adds no `echo/` files.

**In flight:**
- `caps-backend-run-forms`: red-team item 10 plus the false positives (started 04:40).
- `g0-diagnostic-port`: diag.js, the auto-send countdown and the keep-alive on the integration shell (started 04:41). It is the only `main.js` worker.
- `release-license` (new): `--release` copies the root `LICENSE` into the upload, from a single source, and refuses the release if it is missing.

**Decided this consult:** `echo/CONTRACTS.md` stays in the upload. It is developer documentation (rubric: documentation), costs 1 file of 100, and is not runtime.

**Next:**
1. **`g0-diagnostic-port` finishes:**
   - judge the screenshots (counters, one auto-sent job, cancel means no job, the button during the countdown still gives one job, `main.js` stays pending until the job settles, the sabotages go RED);
   - run my own `check.cjs` and caps on an extract;
   - MERGE, then ask the overseer for G0 steps 5–8 on Qollab with the new build token.
2. **`caps-backend-run-forms` finishes:** run my own extract run, plus my own aliased mutations (`const r = backend.run; r(...)`, `getattr(backend,'run')`). Watch for a `tools/qollab-caps/check.mjs` conflict with the 2-line release change that was just merged.
3. **`release-license` finishes:** run my own `--release` run, check that `LICENSE` is in the upload and byte-identical to the root copy, and run the delete-the-root-LICENSE sabotage.
4. **Relays through the overseer (pending):**
   - **all lanes:** drop the drifted `echo/contracts.js` and `CONTRACTS.md` copies, or merge platform integration (8 release blockers);
   - **quantum:** `live_commit` parameters, plus `bridge.js` `verifySelectedBackendOnce`, and delete Python `backend.run` (`qollab_job.py:169`);
   - **gameplay:** adopt the contract exports, no pointer lock, `main.js` never returns before the ending;
   - **story-ui:** `MOMENTS` must equal `MOMENT_EVENTS`; Q and Tab need handlers;
   - **red-team:** re-run `cross_lane_check`.
5. **Single site switch:** once quantum ships `bridge.js`, `main.js` calls `verifySelectedBackendOnce`. This is serialised after the port.
6. **G2 wiring:** one `main.js` worker at a time, after the port. Then a full playthrough on the runner using the `--release` tree.
7. **Final README pass:** "drag to look", remove the placeholders, re-audit the claims.

**Risks:**
- Iframe keyboard focus with a human is unproven.
- The keep-alive is not on integration until the port merges.
- The engine is 0/4 valid on commits until quantum patches.
- The release is RED on 9 cross-lane blockers.
- G2 is about 16 h away, and only one `main.js` worker can run at a time.
=== END PLAN ===

=== MERGE branch=lane/platform/release-upload-manifest ===

=== AGENT name=release-license model=opus base=lane/platform/integration ===
**GOAL:** the folder the owner uploads to Qollab must carry the project's MIT `LICENSE`. The judges and the hackathon terms require an MIT-licensed project, and `QOLLAB_DEPLOYMENT.md:28` lists `LICENSE` among the upload files. Today `node tools/assemble-echo/assemble.mjs --release` produces 30 files and no LICENSE. The only LICENSE is at the repo root (`LICENSE`, "Copyright (c) 2026 udsy19 and contributors").

**VISION:** a published, runnable, MIT Qollab project (CLAUDE.md "Submitted"; QOLLAB_DEPLOYMENT.md:73, :90).

**WHAT WE ARE BUILDING:** the platform release tool, `tools/assemble-echo/assemble.mjs --release`, which writes the Qollab upload folder plus a sha256 manifest beside it (report `lanes/platform/reports/0010-release-upload-manifest.md`).

**Approach, decided by the supervisor (no-bloat: one source):**
- Do NOT add a second copy at `echo/LICENSE`, because two copies drift.
- In `--release` mode, the assembler copies the repo-root `LICENSE` into the upload root.
- It REFUSES the release (exit 2) if the root LICENSE is missing, unreadable, or does not contain both "MIT License" and "udsy19 and contributors". That is the owner's credit ruling, in `lanes/platform/rulings.md`.
- If a lane's ref carries its own `echo/LICENSE`, treat it like any other ownership conflict: report it as a BLOCKER, and the root copy wins.
- The manifest must list LICENSE with its real sha256, taken from the walked tree.

**WHAT HAS NOT WORKED / be careful:**
- A success message is not evidence (law 13). Prove the bytes: `shasum` of the uploaded LICENSE must equal the root's.
- The assembler's internal leak check shares the `RELEASE_EXCLUDE` list. Do not add a similar self-referential check for LICENSE. Your fixture must derive the expected bytes from the root file independently.
- Do NOT edit `tools/qollab-caps/check.mjs`. Another worker (`caps-backend-run-forms`) is editing it now. Keep your change inside `tools/assemble-echo/`.
- Do NOT touch anything under `echo/`. Workers never drive Qollab.

**Vault notes to read:**
- `vault/AGENTS.md`, `vault/Index.md`;
- `vault/Reports/release-upload-manifest.md` and the report `0010` above;
- `vault/Reports/integration-shell.md` (the assembler's origins);
- `.claude/rules/gate-independence.md` (laws 3, 13, 15);
- `vault/Research/qollab-platform-and-submission.md` (the upload file rules).

**Where to start:** `tools/assemble-echo/assemble.mjs`, `run-fixtures.mjs` and `sabotage.mjs`. Write the fixture first and watch it go RED on the current code (LICENSE absent from the upload).

**Deliver:**
1. The `--release` LICENSE copy and the refusal described above.
2. Fixtures: LICENSE present, its bytes equal to the root's, and a refusal when the root is missing or wrong. Show them RED first, then GREEN.
3. `sabotage.mjs` gains these mutations, each CAUGHT, with any nulls named:
   - copy skipped;
   - copy truncated;
   - refusal removed;
   - root LICENSE deleted on a disposable copy.
4. A real run on the same pinned refs as `evidence/platform/release-manifest/pinned-refs.txt` (pass them through `eval` or unquoted; they are several args). Expect 31 files, LICENSE present, and an independent `find`+`shasum` diff against the manifest.
5. Evidence under `evidence/platform/release-license/` with a README of commands and exit codes, and a vault note `vault/Reports/release-license.md`.

**How I will judge it:**
- I will run your fixtures and sabotage myself on a `git archive` extract.
- I will run `--release` myself from the int worktree with the pinned refs.
- I will run `shasum` on the uploaded LICENSE against the root's.
- I will delete the root LICENSE in a temp copy and expect exit 2.
- `git diff --stat lane/platform/integration...HEAD` must touch only `tools/assemble-echo/`, `evidence/platform/release-license/` and the vault note.

**Report:** `lanes/platform/reports/NNNN-release-license.md`, opening with a **Vault check**, then a TL;DR, evidence paths, nulls, what was not done, and decisions inferred. Write a checkpoint within 1 h. This task should take well under that.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 15: I merged `release-upload-manifest` after my own checks:
- extract fixtures 13/13 and sabotage 14/14 with 0 nulls;
- my own `--release` run on the pinned refs gave rc 1, 30 files, 0 `tests/` or smoke-doc leaks, and 9 BLOCKERs (8 drifted contract copies in quantum, gameplay, story-ui and art, plus `qollab_job.py:169` Python `backend.run`).

Tooling trap: `pinned-refs.txt` holds several `--ref` args on one line. `$(cat …)` inside a quoted context passes them as ONE argument, and the assembler REFUSES (rc 2, "unknown argument"). Use `eval` or unquoted expansion. Also, `--release` resolves refs with git, so run it from a worktree using the extract's tool. Inside a bare `git archive` extract it refuses, because the refs do not resolve.

Decided under autonomous mode:
- `echo/CONTRACTS.md` stays in the upload: documentation is a rubric item, it costs 1 file of 100, and it is not runtime.
- `LICENSE` reaches the upload by `--release` copying the root `LICENSE`, one source. Do not commit a second copy in `echo/` (no-bloat; QOLLAB_DEPLOYMENT.md:28 lists LICENSE). Dispatched `release-license`.
=== END LEARN ===
