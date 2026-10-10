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