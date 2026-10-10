**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`) that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`, with a local runner in `tools/` and `QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Sat 00:25. G1 Sat 04:00 · G2 Sat 17:00 (else the one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- shared-contracts, echo-caps-gate, g0-runner-smoke, contracts-v2 (landed), contracts-pin-thresholds, contracts-fidelity-band, integration-shell.
- G0 on real Qollab (overseer, built-in sim): steps 1–5 PASS.
- **c10 `readme-and-video-draft`: MERGE.** My checks:
  - merge-tree clean;
  - `echo/` diff is `README.md` only;
  - my own caps run on a `git archive` extract: GREEN, exit 0, 9 files;
  - the rendered PNG has no Qollab-run, IonQ-run or publish claim; the IonQ simulator row says "Untested" and hardware "Not used";
  - credits, theme, licence and the attribution line match the rulings.

  Defects carried forward to the final README pass (not blocking a draft):
  - (a) the Controls row "Mouse (click to capture, or drag)" implies pointer lock. The Qollab iframe is `allow-scripts` only, so it must read "drag to look";
  - (b) placeholder comments leave a dangling "The full game:" and an empty "Checks actually run so far:" list;
  - (c) the gameplay claims must be re-audited on the integrated build.

**In flight:**
- `g0-input-diagnostic`: `diag.js`, auto-send, keep-alive. It must be rebased onto integration before merge, because it is the only `main.js` editor.
- `contracts-moments-and-land`: MOMENT events, countdown hold, and a contracts-only landing branch from main.
- `release-upload-manifest` (new): the assembler gets a release mode that excludes `echo/tests/` and `QOLLAB_SMOKE_TEST.md` (consult 9 decision). It reports caps on the upload tree and a cross-lane blocker table measured on the current lane refs. It does not touch `main.js`.

**Next:**
1. Judge `g0-input-diagnostic` (rebased). Then the overseer re-runs G0 steps 6–7 on Qollab.
2. After `bridge.js` and the gameplay contract drop land: assemble, run the runner check (22/22), run caps on the upload tree.
3. G2 wiring of gameplay's scene and controller and story-ui's OPENING into `main.js`, by one `main.js` worker after the diagnostic merges.
4. LAND contracts-only.
5. The final README pass fixes (a)–(c) and fills the placeholders from recorded evidence.

**Risks:**
- Iframe keyboard focus on Qollab is unproven.
- The `Done.` lifecycle is not yet on integration.
- `main.js` serialisation.
- Contract churn.
- G2 at 17:00 depends on three other lanes converging.