I've merged the migration and dispatched one small fix for a soft-lock. World-controller is still running and has to rebase before I'll merge it.

=== PLAN ===
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
=== END PLAN ===

=== MERGE branch=lane/gameplay/gameplay-contracts-migration ===

=== AGENT name=gameplay-commit-fault-exit model=opus base=lane/gameplay/integration ===
**GOAL.** A player whose final COMMIT comes back from the engine but is refused must never be stranded. Today `commitTransfer()` latches `measured_refused_awaiting_ruling`. The quest then sits in TELEPORT_DRY_RUN_PASSED with COMMIT disabled and nothing to do. That is a soft-lock: see `evidence/gameplay-contracts-migration/playthrough/11-commit-measured-but-refused-latched.png`. Fix it as the supervisor ruled below.

**VISION.** ECHO is judged by first-time players. A soft-lock at the climax is the worst possible failure. The physics must still stay honest:
- The story token is measured once (§7.4 l.507).
- There is no fabricated success (§12.3).

**WHAT WE ARE BUILDING.** The gameplay quest core lives in `echo/game/state.js`, with the commit latch in `COMMIT_STATUS`. The dev harness is `dev/gameplay/{harness.html,devTerminal.js,playthrough.mjs,fakeQuantum.js}`. Primitive dev UI only; story-ui owns the real terminal.

**THE RULING (supervisor, from the docs; autonomous mode):**
- §7.4 l.507: at commit, the calibrated receiver applies X/Z conditioned on the live bits. The player picks nothing, so a refused recorded commit can only mean an engine fault after measurement.
- The token is consumed. It may NEVER be re-measured, so COMMIT stays latched.
- The session must offer an honest way out:
  1. Set the latch status to a plain name, e.g. `measured_refused`. Drop "awaiting_ruling" everywhere: code, harness, tests, playthrough.
  2. Expose enough for UI to show an honest scientific-module error stating that the story token was measured and consumed, and that verification failed, together with the refusal reason.
  3. RESTART (`resetGame()`, §9.5) is the way forward and is offered from that state. A new session gets a fresh story token, a fresh epoch and an IDLE latch.
- Keep everything else as it is:
  - An ERRORED call (nothing measured) stays retryable.
  - A result that arrives after a reset is dropped.
  - The one-shot proof stays.
- If contracts.js would need a new edge or event for this, do NOT edit it (platform owns it). Use `resetGame()`, which already exists, and put any contract request in your report.

**WHAT HAS NOT WORKED.** The previous worker latched correctly but left a dead end, and labelled it as waiting for an owner ruling. Autonomous mode means design choices are decided from the docs. Do not raise this as an owner question.

**Vault notes to read:**
- `vault/Reports/quest-state-machine-contract.md`
- `vault/Reports/quest-core-adversarial-review.md` (F4)
- `vault/Reports/shared-contracts.md`
- `lanes/gameplay/rulings.md` (the consult-3 commit ruling)
- `evidence/gameplay-contracts-migration/README.md`

**Where to start.** `echo/game/state.js` lines ~39–170 (`commitTransfer`), `dev/gameplay/playthrough.mjs` ~l.149–160, and `dev/gameplay/devTerminal.js`.

**Deliver:**
- A red-first check: an engine-faulted commit leaves the player with an offered RESTART, and after RESTART a full second session can commit. Show it red on the current tip before your change.
- The fix.
- A sabotage pair, each of which must go red:
  - remove the RESTART offer;
  - let COMMIT re-arm after a measured refusal.
- The harness playthrough on your OWN port, showing:
  - a PNG of the honest error with RESTART offered;
  - a PNG of the next session reaching ENDING.
- Evidence under `evidence/gameplay-commit-fault-exit/` with a README.
- A short addendum to `vault/Reports/quest-state-machine-contract.md`.
- Grep for "awaiting_ruling" returns zero.

**How I will judge it.** I re-run `node --test 'dev/gameplay/tests/*.test.mjs'` in a scratch worktree and look at your PNGs. I check that the token is still never re-measured: the engine commit-call count stays at 1 per session.

**Report:** `lanes/gameplay/reports/0004-gameplay-commit-fault-exit.md`. Open with a Vault check, then TL;DR, evidence paths, nulls, and requests for other lanes. Checkpoint within 1 h; this should take well under that.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 4: I merged gameplay-contracts-migration even though its worker died before writing a final report (only a checkpoint and a safety-net commit). Judging is on artifacts, not the report: I re-ran 55/55 at 78a9c9a in `/tmp/sv4`, read the review-port outputs (they flipped), checked that sabotage S8–S12 went red, and looked at 13 PNGs. A worker with no final report can still be merged when its artifacts carry the proof.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 4, decided from the docs. §7.4 l.507 says the final commit applies X/Z from the LIVE bits through the calibrated rule, so the player picks no corrections at commit. A measured-but-refused commit is therefore an engine fault. The token is consumed and COMMIT stays latched forever. The player sees an honest error (§12.3) and RESTART (`resetGame()`, §9.5) as the way forward. A latch with no exit is a soft-lock. Evidence: `evidence/gameplay-contracts-migration/playthrough/11-commit-measured-but-refused-latched.png`.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 4: The world-controller PNGs show headless FPS of 15–24 on ANGLE Metal. That is not a laptop measurement, but it is under the ≥30 FPS bar (§17). The integration playthrough worker must take a headed FPS reading before G3, so the bar is not discovered missing at freeze.
=== END LEARN ===
