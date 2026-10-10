# 0013 backend-site-move — FINAL

## TL;DR
- **DONE, local runner (not Qollab).** `verifySelectedBackendOnce` in `echo/quantum/bridge.js` is now the only `backend.run`. Python builds the circuit (`build_backend_verification_circuit`) and reads the counts (`interpret_counts(counts, backend, 256)`). `run_backend_verification_once`, `BackendJobAlreadyUsed`, `_job_submitted` and `DEFAULT_SHOTS` are deleted, and grep finds no remaining references in `echo/` or `tools/`.
- **Refutation probe did NOT refute it.** A Python-built circuit passed to the runner's JS `backend.run` works on `builtin` and on `ionq-mock` (`evidence/quantum/backend-site-move/probe/probe.log`).
- **Spy:** JS `backend.run` = 1, Python = 0, runner counter 1, over verify ×2 → RESTART → verify. The result is accepted as `backend_verification` with shots 256 (`evidence/quantum/pyodide-bridge/out/final-1-dump.json`). Screenshot: `renders/backend-site-move/runner-spy-js1-python0-final-1.png`.
- **caps** is RED only on `entry-index` and `entry-main`. **pytest** 595 passed. **contract-check** GREEN 1087/1087. **Rehearsal replays** 4/4 green (2/4 were red before).
- **round.sh** on 8146589: 3 green, fault green, 3 heads red, 10/12 sabotages red. The 2 nulls (`bare-toJs`, `plain-call`) were named before the run.
- **Blocker for platform:** `main.js` on `lane/platform/integration` still has its own `backend.run` at line 199, and it calls the stale `build_bell_verification_circuit`. Merged with this branch, caps gives `backend-run-count` 2 sites. main.js must call `verifySelectedBackendOnce()` instead.

## Vault check
- **Read:** `vault/AGENTS.md` (delivered by the hook); `vault/Index.md` (backend rows); `vault/Research/qollab-backend-from-js-projects.md`; `vault/Reports/quantum-vs-contracts-v2.md` (gap rows 3 and 7); `vault/Reports/qollab-caps-gate.md` (rule `backend-run-python`); `vault/Reports/bridge-rewire.md`; `evidence/quantum/pyodide-bridge/README.md`; `evidence/quantum/ionq-sim-rehearsal/README.md`; report 0011 (checkpoint); `vault/Research/backend-run-site.md` (landed mid-session via integration: Option A); `vault/Reports/engine-bridge-review.md` (skimmed).
- **Already known:** Python reaches `backend` only through callPromising. The runner's counter is JS-only. Count keys put clbit 0 on the right. The X-on-q0 control is local-only.
- **Reused:** the pyodide-bridge harness (assemble, run, round, drive, spy), extended rather than forked. Also the rehearsal's `rehearse.py` and `sabotage.sh`, and contracts.js `BACKEND_SHOTS` (not redefined).
- **Stale:**
  - `evidence/quantum/ionq-sim-rehearsal/rehearse.py` called `run_bell_verification_once` and `build_bell_verification_circuit`, which no longer existed, so its Bell replays were red on 807cc39. Fixed here.
  - `evidence/quantum/backend-job/sabotage.sh` is historical. It references removed symbols and was not touched.

## Commands and exit codes (on this branch)

| command | exit | artifact |
|---|---|---|
| `PB_PORT=5223 probe/probe.sh` (builtin + ionq-mock) | 0 | `evidence/quantum/backend-site-move/probe/probe.log` |
| `run.sh red-before-tip conformant` on 807cc39 (checks first) | 1: JS 0 / Python 1, runner 0 | `evidence/quantum/backend-site-move/red-before/` |
| `PB_PORT=5223 round.sh` (Python HEAD@8146589) | see table | `evidence/quantum/pyodide-bridge/out/SUMMARY.md` |
| `node tools/qollab-caps/check.mjs` | 1: entry-index, entry-main only | `evidence/quantum/backend-site-move/caps-after.txt` (before: `caps-before-807cc39.txt`, 3 rules) |
| caps `--root` on a copy with platform's main.js + index.html | 1: `backend-run-count` main.js:199 + bridge.js:141 (`import-unresolved` only because other lanes' files are absent) | `caps-with-platform-main.txt` |
| `PYTHONDONTWRITEBYTECODE=1 pytest -q echo/tests` | 0, 595 passed | — |
| `node tools/contract-check/check.mjs` | 0, 1087/1087 | — |
| `rehearse.py replay fixtures/*` ×4 | 0,0,0,0 | `evidence/quantum/backend-site-move/rehearsal/replay-*.txt` |
| `zsh ionq-sim-rehearsal/sabotage.sh` | all rows as expected (S4 is now "Python submits a second job": red) | `rehearsal/sabotage-table.txt` |
| `vault-hubs.mjs --check`, `gen-subject-index.py --check` | 0, 0 | — |

Round on 8146589:

| run | expected | got |
|---|---|---|
| final-1/2/3 | 0 | 0 (88/88, 84/84, 84/84) |
| fault | 0 | 0 (33/33) |
| head-old-bridge (bridge-rewire bridge) | 1 | 1: no job at all (calls a deleted function) |
| head-old-python (contract-conformance) | 1 | 1 |
| head-pre-move-python (bridge-rewire Python) | 1 | 1, **only** on the backend-name check (see nulls) |
| sab-no-memo (memo dropped) | 1 | 1: runner 3 jobs, 2 refused |
| sab-restart-resets-memo | 1 | 1: runner 2 jobs, 1 refused |
| sab-second-js-run (NEW) | 1 | 1: runner 2 jobs, verify rejected with IonQ one-job message |
| sab-py-python-runs-again (NEW) | 1 | 1: spy JS 1 / Python 1 (the runner counter alone would NOT see this) |
| sab-no-toJs, no-theta-passthrough, no-latch, restart-no-python, swallow-validator | 1 | 1 |
| sab-bare-toJs | 1 | **0 — NULL, predicted** |
| sab-plain-call | 1 | **0 — NULL, predicted** |

## Nulls (both written into the checkpoint report before the round ran)
- `bare-toJs`: Pyodide 314.0.7's bare `toJs()` already returns plain Objects. This null carries over from bridge-rewire.
- `plain-call` (new): `callPromising` is no longer load-bearing for any bridge→Python call. The one JSPI-needing call was Python's own `backend.run`, which is gone. The JS `backend.run` enters Python through the runner's `callPromisingKwargs` (Qollab's ft() does the same, per report 0011).
- Weak red: `head-pre-move-python`. With the new bridge, the old Python's leftover `backend.run` is never called, so the runtime harness cannot see it. It goes red only because old `interpret_counts` labels the result with the backend's repr. The static caps rule `backend-run-python` is the real guard for this case, and it was red on 807cc39.

## What I changed (commits on `lane/quantum/backend-site-move`)
- `c781959`: refutation probe; spy attributes each job to JS or Python from the Python stack; new drive.cjs checks (JS=1, Python=0, runner counter=1, interpret_counts=1, `parameters.backend` = the backend's own name); red-before on 807cc39.
- `cb4ab4c`: the split.
  - `bridge.js`: `submitVerificationJob` with memo, `BACKEND_SHOTS` imported from contracts.js, proxies destroyed.
  - `qollab_job.py`: submitter and guard deleted; `interpret_counts` accepts the backend object.
  - Tests: three run_backend tests replaced by a bridge-path test, a drift-is-said test and a no-submitter test; conftest's bridge call is now `interpret_counts(..., FakeSelectedBackend(), 256)`, so the count stays 595.
- `ffa5c8b`: round.sh head controls moved to bridge-rewire; new sabotages `second-js-run` and `py:python-runs-again` (sabotage.mjs can target qollab_job.py).
- `8146589`: rehearse.py follows the split; rehearsal S4 is now a Python second-submit sabotage.
- `d08a013`: round evidence and harness READMEs. `490f3b1`: merge of `lane/quantum/integration` (24e0ba7). `71a768e`: vault report and regenerated hubs and Index.

## Evidence paths
`evidence/quantum/backend-site-move/{probe,red-before,rehearsal,caps-*.txt}` · `evidence/quantum/pyodide-bridge/out/{SUMMARY.md,final-*-dump.json,*.log}` · `renders/backend-site-move/runner-spy-js1-python0-final-1.png` · `vault/Reports/backend-site-move.md`

## Not done / not verified
- Nothing ran on Qollab or IonQ. Every result here is "local runner".
- I did not edit platform's `main.js`; it is outside this lane.
- The round ran before the merge of 24e0ba7. That merge changed no file under `echo/` or `tools/`, and pytest, caps and contract-check were re-run after it. round.sh was not re-run after it.
- The commit-shape blockers in `vault/Reports/engine-bridge-review.md` are out of this brief.

## Decisions inferred from the docs
- **Shots come from contracts.js `BACKEND_SHOTS`, imported by bridge.js. Python's `DEFAULT_SHOTS` is deleted.** Source: no-bloat (one source); contracts.js:153 is the owner's value.
- **`interpret_counts` accepts the injected backend and labels the result with the name the backend reports.** It does not use a name supplied by JS. Source: CLAUDE.md "do not hardcode a backend… document backend provenance"; same behaviour as the old `_backend_label`.
- **The memo also caches a failure.** Source: the existing comment and the earlier owner ruling ("IonQ may already have counted it"); runtime-environment one-job-per-run.
- **Committed the regenerated `vault/Index.md`, `Map.md` and `Reports/README.md`.** The brief's item 7 and `vault/CLAUDE.md` ("commit the hub edit beside it") ask for it. The worker preamble says never to. If you want the preamble followed, drop `71a768e`'s generated files on merge.

## Requests for platform (main.js)
1. Delete the inline submit at `echo/main.js:181-199` (lane/platform/integration). It calls the non-existent `qollabJob.build_bell_verification_circuit` and its own `backend.run`.
2. Replace it with `import { verifySelectedBackendOnce } from './quantum/bridge.js'` and `const r = await verifySelectedBackendOnce()`.
   - On success, `r` is a validated `backend_verification` ExperimentResult with 256 shots.
   - On failure it rejects with `ScientificModuleError` and the §8.6 wording.
   - Call it as often as you like: the second and later calls return the same promise, including after RESTART.
3. Without this, merging both branches makes caps `backend-run-count` red (2 sites; `caps-with-platform-main.txt`).

## What the supervisor should do next
1. Re-run on a disposable worktree of `71a768e`:
   - `PB_PORT=<yours> bash evidence/quantum/pyodide-bridge/round.sh` (expect the table above, nulls `sab-bare-toJs` and `sab-plain-call` only);
   - `node tools/qollab-caps/check.mjs` (expect RED only on entry-index and entry-main);
   - `PYTHONDONTWRITEBYTECODE=1 pytest -q echo/tests` (expect 595);
   - the 4 rehearsal replays.
2. Merge into `lane/quantum/integration`.
3. Relay the platform request above. It is the one thing that stands between this change and a single backend.run site in the shipped game.
