=== PLAN ===
**Lane goal:** platform. G0 comes first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`) that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`. It ships with a local Qollab-like runner in `tools/` and `echo/QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Sat 00:05. G1 Sat 04:00 · G2 Sat 17:00 (else the one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- `shared-contracts` (c2), `echo-caps-gate` (c3), `g0-runner-smoke` (c4).
- `contracts-v2` (c5), merged and landed on main as 80d685f. Grounds: 1087/1087 on my own extract, merge-tree clean, screenshot 04 showing the two-phase dry run.
- G0 on real Qollab (overseer run, built-in sim): steps 1–5 PASS. Steps 6–7 (Verify click) NOT CONFIRMED, cause unknown. `g0-input-diagnostic` covers it.

**In flight:**
- `integration-shell` (adopted after the loop restart at 04:05). Checkpoint 1: the assembler works, and it is RED on the `main.css` and `quantum/smoke.py` ownership conflicts, as predicted. It is now building the real `main.js`/`index.html` on contracts v2.
- `g0-input-diagnostic` (adopted). Build `10c` adds on-page input counters, an auto-send countdown for the one job through the same guard, and iframe sandbox/allow facts from Qollab's runtime source.
- **`contracts-pin-thresholds` (dispatched now).** I decided it in consult 5, but it never started: there is no branch and no lane.log start line. The consult-5 dispatch was lost at the 04:05 restart, or before it. It pins the owner-ruled constants so that changing any of them turns the gate red.

**Relay (overseer → lanes):** the contracts-v2 migration table in `reports/0003-contracts-v2.md`:
- quantum first: `bell_verification` → `backend_verification`, and `{theta, phi}` two-phase entry points;
- gameplay: `marginalProbabilities` / `dryRunVerdict`; delete its local constants;
- story-ui: `captionStyle`, `QUALITY_LEVELS`, `BIT_LABELS`, the two-phase terminal.

**Next:**
1. The overseer re-runs G0 with build `10c`. That closes steps 6–7 or names the input cause, and it decides the controls design (pointer lock or click-to-focus/drag).
2. Judge `integration-shell` on runner screenshots plus my own caps and contract runs. Once merged, run assemble + caps + contract check after every lane landing.
3. Merge `contracts-pin-thresholds` after my own sabotage: `FIDELITY_PASS` 0.999999 → 0.9 must go red.
4. Integrated product code waits on red-team's `cross_lane_check`.
5. First playthrough once gameplay has a controller and scene. Then the README/project page, the video script, and 3 consecutive full runs (row 8).

**Risks:**
- **Iframe input on Qollab** (top G2 risk).
- Lane restarts drop dispatches: verify every new AGENT block shows a "start" line in lane.log at the next consult.
- Contract churn while lanes migrate.
- `echo/tests/` counts toward the 100-file cap.
- The puppeteer dependency is borrowed from the MCP install.
=== END PLAN ===

=== AGENT name=contracts-pin-thresholds model=opus base=lane/platform/integration ===
**GOAL:** A change to any owner-ruled constant in `echo/contracts.js` must turn the contract gate RED, with a FAIL line naming the constant and the ruling. Today, changing `FIDELITY_PASS` from 0.999999 to 0.9 on a copy leaves `node tools/contract-check/check.mjs` GREEN; the supervisor reproduced this in consult 5. Other guards in the gate are redundant with it, and that hides a loosened threshold. A judge-facing teleport puzzle that passes at F = 0.9 is false physics with a green board.

**VISION:** The owner's mandate is truthful quantum (vision §7.4, §7.5; CLAUDE.md "Truthful quantum"). The owner ruled these values on 2026-10-10. A gate that cannot see them drift does not protect the ruling. See `.claude/rules/gate-independence.md` laws 4a, 5, 11 and 15.

**WHAT WE ARE BUILDING:** the shared contract gate `tools/contract-check/` (platform-owned), which guards `echo/contracts.js`. Every lane imports `echo/contracts.js`.

**WHAT HAS NOT WORKED:**
- In `contracts-v2`, `sabotage.py` listed the `FIDELITY_PASS` loosening as a *declared null* (lines ~93–99). A declared null on an owner-ruled VALUE is not acceptable.
- Gameplay had the same class of null: red-team found that `FIDELITY_OK` 0.999999 → 0.9 kept its tests green.
- Do not derive the expected values from `contracts.js` itself. That is calibrating against the population under test (law 4).

**Expected values come from the ruling text.** Source: `/Users/udsy/agent-org/lanes/platform/rulings.md` and `owner-answers.md`, plus vision §7.4 and §10.5. Hard-code them in the gate with a citation comment each:

| constant | ruled value | source |
|---|---|---|
| `FIDELITY_PASS` | 0.999999 | §7.4; gameplay ruling "≥0.999999" |
| `BACKEND_SHOTS` | 256 | 13 questions #9 |
| `TELEPORT_TEST_STATE` | theta 1.137, phi 0.44, circuit order ry then rz | red-team physics ambiguities (3) |
| `BIT_LABELS.m1` | "LOCAL BELL-HALF READOUT m1" | ruling (1) |
| `BIT_LABELS.m0` | as ruled or documented | if the ruled text is absent, say so; do not invent it |
| correction rule | X iff m1=1, Z iff m0=1 | |
| backend job experiment id | "backend_verification" | |
| `GENERIC_MAX_WRONG_FIDELITY` | 0.9 | not an owner ruling; it is a v2 design value. Pin it, cite its origin honestly, and check it with the Qiskit oracle: the worst wrong choice measured 0.674. |

Also pin two semantic properties:
- the verdict both requires the right correction AND requires fidelity ≥ the pinned value;
- equality at the threshold passes, and below it fails.

**Vault and notes to read:**
- `vault/AGENTS.md`, `vault/Index.md`, `vault/Reports/contracts-v2.md`;
- `lanes/platform/reports/0003-contracts-v2.md` (its nulls section);
- `.claude/rules/gate-independence.md` and `vault/Design/gate-independence-cases.md` (laws 4, 11, 15).

**Where to start:**
1. Read `tools/contract-check/check.mjs` and `sabotage.py`.
2. Write the pin checks FIRST.
3. Run them against a copy of `contracts.js` with `FIDELITY_PASS = 0.9`. Watch them go red, and save that log.
4. Then run them against the real file and get green.

**Deliver** (branch `lane/platform/contracts-pin-thresholds`):
- the pins in `check.mjs`, or in a pinned section it imports;
- in `sabotage.py`, every former value-null converted to an expected RED case, with new cases for each pinned constant (shots 256 → 1024, label swap, test state phi 0.44 → 0.4, experiment id, threshold 0.999999 → 0.99999).

Evidence goes under `evidence/platform/contracts-pin/`:
- red-first log;
- green log;
- sabotage log with counts.

**Report the remaining nulls honestly.** Do NOT edit `echo/contracts.js` unless a pin exposes a value that contradicts the ruling. If one does, stop and report it; do not change it silently. Don't touch other lanes' files. Use no browser port. This is gate-only work.

**How I will judge it:**
- I copy `contracts.js`, set `FIDELITY_PASS` to 0.9, and run `check.mjs --contracts <copy>`. It must go RED with a line naming `FIDELITY_PASS` and its ruling.
- I repeat the same for shots and the m1 label.
- The real file must be GREEN.
- `git diff --stat lane/platform/integration...` must touch only `tools/contract-check/`, `evidence/` and `vault/`.

**Report:** `lanes/platform/reports/0005-contracts-pin-thresholds.md`.
- Open with a Vault check, then a TL;DR, commands with exit codes, nulls, and what is not done.
- Write a checkpoint within 1 h. This task should be FINAL within 1 h.
- Write the measured finding to `vault/Reports/contracts-pin-thresholds.md`.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 6: The `contracts-pin-thresholds` worker I decided in consult 5 never started. `lane.log` has no start line and there is no branch. The 04:05 loop restart adopted only the two running workers.

Lesson: an AGENT block is not a dispatch. At every consult, check `lane.log` for "agent <name> start" for each worker I dispatched last time, and re-emit any that is missing. I re-dispatched it in consult 6.
=== END LEARN ===
