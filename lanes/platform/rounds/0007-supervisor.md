=== PLAN ===
**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`) that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`. It comes with a local runner in `tools/` and `echo/QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Sat 00:15. G1 Sat 04:00 · G2 Sat 17:00 (else one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- `shared-contracts` (c2), `echo-caps-gate` (c3), `g0-runner-smoke` (c4).
- `contracts-v2` (c5): merged and landed on main as 80d685f.
- G0 on real Qollab (overseer, built-in sim): steps 1–5 PASS. Steps 6–7 are not confirmed yet; `g0-input-diagnostic` covers them.
- **`contracts-pin-thresholds` (c7): MERGE now.** I checked it myself on a `git archive` extract:
  - the real contracts are GREEN 1117/1117;
  - with `FIDELITY_PASS` set to 0.9 the gate goes RED and names the pinned constant and the ruling;
  - `merge-tree` is clean;
  - the diff touches only tools, evidence and vault.

**Open defect found by c7 and confirmed by me:**
- A correct choice at exactly F = 0.999999 is refused. The 1e-6 cross-check equals the pass band (law 12).
- `FIDELITY_CROSSCHECK_TOLERANCE` loosened to 1e-1 stays GREEN 1117/1117. I measured that on `/tmp/ctol.js`.
- `contracts-fidelity-band` is dispatched to fix both. It is the last free slot of 3.

**In flight:**
- `integration-shell`. Checkpoint 1: the assembler is RED on the `main.css` and `smoke.py` ownership conflicts, as predicted. Next it builds the real `main.js`/`index.html` on contracts v2.
- `g0-input-diagnostic`. Checkpoint 1 found:
  - the Qollab iframe has `sandbox="allow-scripts"` only, so there is **no pointer lock** and no initial focus;
  - **after `Done.`, Qollab drops console output and switches off the IonQ fetch proxy.** So `main.js` must stay pending until the one job settles. This binds the integration shell's `main.js` as well.
- `contracts-fidelity-band` (new).

**Relay (overseer → lanes):**
- The contracts-v2 migration table, `reports/0003`. Quantum's `backend_verification` comes first.
- Gameplay imports `FIDELITY_PASS` and deletes `FIDELITY_OK`.
- **NEW for gameplay controls:** design without pointer lock: click-to-focus plus drag-to-orbit, with an on-screen prompt "click to focus". `main.js` must not resolve before the backend job settles.

**Next:**
1. The overseer re-runs G0 with the diagnostic build. That closes steps 6–7 or names the cause.
2. Judge `integration-shell`: runner screenshots, plus my own caps, contract and assemble runs. It must keep `main.js` alive until the job settles, and import `contracts.js` under the CJS transform.
3. Judge `contracts-fidelity-band`: F = 0.999999 passes, tolerance 1e-1 goes RED, and my own sabotage. Then land the contract files on main (allowed early by ruling).
4. Integrated product code waits on red-team's `cross_lane_check`.
5. First playthrough once gameplay has a controller and a scene. Then the README/project page, the video script, and 3 consecutive full runs (row 8).

**Risks:**
- Iframe input on Qollab: no pointer lock is now a fact; whether keyboard focus works is still unknown.
- The `Done.` lifecycle silently kills logs and the IonQ proxy.
- Lane restarts drop dispatches: check lane.log start lines every consult. c7: `contracts-pin-thresholds` started 04:06, confirmed.
- Contract churn while lanes migrate.
- `echo/tests/` counts toward the 100-file cap.
- The puppeteer dependency is borrowed from the MCP install.
=== END PLAN ===

=== MERGE branch=lane/platform/contracts-pin-thresholds ===

=== AGENT name=contracts-fidelity-band model=opus base=lane/platform/integration ===
**GOAL:** a player who picks the correct X/Z corrections always passes the teleport dry run. A forged or loosened fidelity check can never pass silently. Today both fail at the edges:
- (a) a correct result at exactly F = 0.999999 is refused, because the 1e-6 cross-check in `validateTeleportCorrectionResult` is the same size as the pass band it defends (gate-independence law 12);
- (b) `FIDELITY_CROSSCHECK_TOLERANCE` loosened to 1e-1 leaves `node tools/contract-check/check.mjs` GREEN 1117/1117. The supervisor measured this on 2026-10-10 by editing `1e-6` to `1e-1` in a copy and running it with `--contracts`.

**VISION:** vision §7.4 (receiver fidelity ≥ 0.999999, conditional X iff m1=1, Z iff m0=1); CLAUDE.md "Truthful quantum"; owner-answers § overseer relay from red-team ("fidelity threshold is ≥0.999999"). The rooftop puzzle is the climax. A false refusal there is a broken game, and a loose check is a physics lie.

**WHAT WE ARE BUILDING:** `echo/contracts.js` + `echo/CONTRACTS.md` (platform-owned; every lane imports them) and their gate `tools/contract-check/` (check.mjs, sabotage.py, teleport_oracle.py).

**WHAT HAS NOT WORKED:**
- contracts-v2 declared verdict nulls as "defence in depth", which hid a loosened owner-ruled constant.
- contracts-pin-thresholds (report `lanes/platform/reports/0006-contracts-pin-thresholds.md`, read it in full) pinned the ruled values. It found the equality defect and left the tolerance unpinned. It predicted a 0.1 loosening would be a null, and the supervisor confirmed that.

**Vault notes to read:**
- `vault/Reports/contracts-v2.md` and `vault/Reports/contracts-pin-thresholds.md`
- `.claude/rules/gate-independence.md`: laws 3, 11, 12, 15; and their cases in `vault/Design/gate-independence-cases.md`

**Where to start:** write the failing probes FIRST and watch them go red on the current contracts.
1. A correct dry-run result whose fidelity is exactly `0.999999` (and one at `FIDELITY_PASS` minus rounding noise of order 1e-15) must pass.
2. A copy with the tolerance loosened to 1e-1, and another to 1e-2, must go RED. Use a forged fidelity that lies inside the loosened band but differs from the Qiskit/analytic value by more than the real tolerance.
3. The pass verdict must still refuse F = 0.99999.

Then fix `echo/contracts.js`, for example by making the cross-check tolerance strictly smaller than the band (≤1e-9 is justified by the measured 4.7e-13 analytic/Qiskit agreement in contracts-v2), or by comparing with a documented epsilon. You choose; justify the choice with numbers. Pin the tolerance in check.mjs with its derivation, and add the cases to sabotage.py. Update CONTRACTS.md only where the behaviour changed, and add a one-row migration note if any consumer-visible value moved.

**Deliver:** commits on `lane/platform/contracts-fidelity-band`. The diff `lane/platform/integration...branch` touches only `echo/contracts.js`, `echo/CONTRACTS.md`, `tools/contract-check/`, `evidence/platform/contracts-fidelity-band/` (with README) and `vault/Reports/`.

**How I will judge it:** I re-run, on my own `git archive` extract:
- check.mjs: GREEN on real, RED on the tolerance at 1e-1 and 1e-2, RED on `FIDELITY_PASS` 0.9;
- sabotage.py: 0 mismatches;
- `node tools/qollab-caps/check.mjs --root echo` (expect red only on missing entry files if this branch lacks them; report what it says).

I will also try my own mutation that you did not list. Every null must be reported, with the reason it is equivalent. Do not weaken any existing check.

**Report:** `lanes/platform/reports/0007-contracts-fidelity-band.md`. Open with the Vault check, then the TL;DR, the commands with their exit codes, Nulls, and Not done. Checkpoint within 1 h. Expect about 45 min total.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 7: I merged `contracts-pin-thresholds` after re-running it on a `git archive` extract:
- real contracts GREEN 1117/1117;
- `FIDELITY_PASS` 0.9 RED, with a FAIL line naming the pin and the ruling;
- merge-tree clean.

My own extra mutation found the null the worker had predicted: `FIDELITY_CROSSCHECK_TOLERANCE` 1e-6 → 1e-1 stays GREEN 1117/1117. The equality defect is also real: F = 0.999999 exactly is refused, because the guard equals the band (law 12).

Lesson: pinning ruled values is not enough. Every tolerance that guards a ruled value needs its own pin, derived from a measured number (analytic/Qiskit agreement 4.7e-13). I dispatched `contracts-fidelity-band`.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 7: Qollab runtime facts, read by `g0-input-diagnostic` from Qollab's shipped JS (chunk `/_nuxt/BWPMdZ7B.js`, class `Ol`). Still to be verified in its final report:
- the preview iframe is `sandbox="allow-scripts"` only: no pointer lock, no modals, opaque origin, and nothing focuses it;
- once `main.js` resolves (`Done.`), the parent drops console output, and the IonQ fetch proxy in the worker is switched off.

Design consequences, decided from QOLLAB_DEPLOYMENT.md and vision §8:
- (1) Controls must not use pointer lock. Use click-to-focus plus drag-to-orbit, with a visible focus prompt.
- (2) `main.js` must stay pending until the one `backend.run` has settled. Otherwise an IonQ job after `Done.` cannot reach Qollab's proxy.

Both bind the integration shell and must be relayed to gameplay.
=== END LEARN ===
