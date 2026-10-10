**Lane gameplay: plan as of consult 4 (2026-10-10 ~00:05 ET).** G2 is due Sat 2026-10-10 17:00 ET. If we miss it, we cut to the one-room version (vision §13).

**Goal (plan row 5):** a playable graybox:
- Third-person follow camera, WASD + mouse + Shift + E + Esc, pointer lock.
- Collision and bounds.
- Alley + booth, Relay Chamber, Rooftop.
- Interaction detection.
- The §9 quest machine: idempotent, no invalid skips, `resetGame()`.
- §9.3 world reactions.
- A fake adapter against `ExperimentResult`. Primitive geometry only.

**Done:**
- `gameplay-quest-core` merged (consult 2).
- `gameplay-quest-review` merged (consult 3).
- **`gameplay-contracts-migration` is being MERGED now.** I re-ran it on tip 78a9c9a in `/tmp/sv4`:
  - `node --test` gives 55 pass, exit 0.
  - `state.js` imports `TRANSITIONS`/`QUEST_STATES`/`BUS_EVENTS`/`WORLD_CHANGES` from `echo/contracts.js`.
  - `quest:enter` and `BOOTED` are gone from echo/.
  - `schema.mjs` is deleted in favour of contracts validation.
  - The review ports flipped:
    - A/B: order is correct.
    - D: the epoch drops a previous-session result.
    - E: malformed input is refused, not thrown.
    - F: fuzz found 0 violations.
    - a2: 0 of 1500 wrong corrections show fidelity 1 on random generic states, and the positive control still shows 20/60.
  - Sabotage S8–S12 all go red.
  - I looked at 13 harness PNGs. The worker died before writing its final report. The safety-net commit only touches the sabotage output.

**Defect found while judging (fix dispatched):**
- Today a commit result that comes back but is refused latches as `measured_refused_awaiting_ruling`. The quest then stays in TELEPORT_DRY_RUN_PASSED with COMMIT disabled and nothing else to do. That is a soft-lock (PNG 11).
- My ruling, from the docs:
  - §7.4 l.507: at commit the calibrated receiver applies X/Z from the live bits. So a refusal can only be an engine fault after measurement. It cannot be a player mistake.
  - §12.3: no fabricated success.
  - §7.4: the token is never re-measured.
  - Therefore: show the honest scientific-module error, say the token was consumed, and offer RESTART (`resetGame()`, §9.5) as the only way forward.
  - Rename the latch status to drop "awaiting_ruling".
- Worker: `gameplay-commit-fault-exit`.

**Running:**
- `gameplay-world-controller` (checkpoint 1 at 2b1f131, plus 45cfe3c which merged the OLD quest-core). The graybox walks alley→relay→rooftop→commit→city lights→restart (PNGs 02–16).
- Merge condition: rebase or merge onto the new `lane/gameplay/integration`, which carries contracts.js. Use the `QUEST_STATE_CHANGED`/`WORLD_CHANGES` names from contracts.js. `grep quest:enter` must return zero. Use the contract world-change ids that the bus log now emits (e.g. `corridor_door_opens`, `rooftop_access_unlocked`).
- If it finishes without doing this, I dispatch a short rebase worker.

**Next:**
1. Judge world-controller after its rebase: walk video plus PNGs through the real input path, then merge.
2. Merge commit-fault-exit.
3. Integration playthrough worker: 3 consecutive title→credits runs with reset, through the 3D world, on its own port, recorded. Include an FPS reading in a non-headless browser.
4. Swap in the real quantum adapter when `lane/quantum` conforms to contracts.js and red-team's cross_lane_check passes. Gameplay tests then run on real-engine fixtures (`dump_results.py`). Fidelity threshold ≥ 0.999999.
5. Story-ui seams: the 4 MOMENT events (`clone_increase_voltage`, `relay_bay_cable`, `teleport_commit_locked`, `teleport_dry_run_failed`) and a countdown that holds at 00:00. These wait on platform adding them to contracts.js. Then a gameplay worker fires them from world triggers and terminals.

**Risks:**
- Headless FPS reads 15–24 in the world-controller PNGs. That is not a laptop measurement, but it needs a real reading before G3.
- World-controller rebase cost.
- The quantum contract is not settled yet (red-team blocker), so we cannot judge the real-adapter swap before platform and quantum conform.
- Nothing lands on main until cross_lane_check passes (owner ruling).