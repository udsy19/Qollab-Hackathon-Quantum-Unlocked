=== PLAN ===
**Lane gameplay: plan as of consult 3 (2026-10-09 ~23:40 ET).** G2 is due Sat 2026-10-10 17:00 ET. If we miss it, we cut to the one-room version (vision §13).

**Goal (plan row 5):** a playable graybox:
- Third-person follow camera, WASD + mouse + Shift + E + Esc, pointer lock.
- Collision and bounds.
- Alley + booth, Relay Chamber, Rooftop.
- Interaction detection.
- The §9 quest machine: idempotent, no invalid skips, `resetGame()`.
- §9.3 world reactions.
- A fake adapter against `ExperimentResult`. Primitive geometry only.

**Done:**
- `gameplay-quest-core` is merged (d5ec620). It holds the FSM, bus, missionRules, objectives and the dev fake, terminal and harness, with 36 tests green on my re-run.
- `gameplay-quest-review` is done. I read the report and it is being MERGED. It adds evidence and a vault report only, no product files.
- Its findings:
  - **F1 (HIGH):** two quest tables. Platform's `echo/contracts.js` on `lane/platform/integration` @ 6378677 uses BOOT_COMPLETE, `QUEST_STATE_CHANGED {from,to,event}`, `BUS_EVENTS`, `WORLD_CHANGES`, `INTERACTABLE_IDS` and `validateExperimentResult`.
  - **F2:** reentrant send/reset delivers events out of order.
  - **F3:** the stale-result guard is ABA-blind.
  - **F4:** a failed or refused commit leaves COMMIT live.
  - **F5:** 20 of the 80 wrong corrections show fidelity 1 on the dev's Pauli-eigenstate calibration states.
  - **F6–F8:** malformed input throws, contradictory Bell probabilities are accepted, and spec.mjs silently drops a row.

**Settled by the owner since consult 2 (the 13 answers):**
- Gameplay imports from `contracts.js` and defines no table of its own.
- Wrong dry run → retry on a fresh calibration state, and dry runs use random generic states. This settles F5 and review Q2.
- RESTART is offered directly on ENDING (review Q2 of quest-core).
- Acknowledgements advance only after the result panel was shown.
- Gameplay world triggers fire `OPEN_ROOFTOP` and `EXIT_BOOTH`; story-ui fires the acknowledgements.

**Running:**
- `gameplay-world-controller`, started about 23:19 ET. It has no commits yet. Its checkpoint is due about 00:20 ET.
- Before I merge it, it must rebase onto the post-migration integration branch and subscribe to `QUEST_STATE_CHANGED`/`WORLD_CHANGES` from contracts.js, not `quest:enter:*`.

**Dispatching now:**
- `gameplay-contracts-migration`. It does three things:
  - Moves the gameplay quest core onto platform's `contracts.js`: merge `lane/platform/integration`, delete our table and bus vocabulary.
  - Fixes F2, F3, F6, F7, F8 and the gameplay half of F4 (a commit latch).
  - Applies owner rulings 11, 12 and 13 in the fake, the harness and the rules.
- Every fix has a red-first check, and it is proved in the headless harness.

**Next:**
1. Judge the migration and merge it.
2. Judge world-controller after its rebase: screenshots and video of walking alley→relay→rooftop and pressing E through the quest. Then merge.
3. Integration playthrough worker: 3 consecutive title→credits runs with reset, on its own port, recorded.
4. Swap in the real quantum adapter (`lane/quantum/*`) when it lands. Delete `dev/gameplay/tests/schema.mjs` in favour of `validateExperimentResult`.

**Seams with platform (sent through the report and overseer):**
- contracts.js still lacks the owner-accepted edge DECLASSIFIED→ENDING.
- The RESTART-from-ENDING semantics: is it `resetGame()` or an edge?
- The fields missionRules reads.
- The probability key format.

**Seams with quantum:**
- The F4 latch: `storyTokenConsumed` is set before the commit circuit.
- fidelity / reducedPurity / receiver marginal.
- Showing the bits before the corrections.

**Risks:**
- World-controller is coding against the old bus vocabulary, so expect a rebase cost.
- `contracts.js` is not on main. Merging platform's integration branch couples us to its history. That is acceptable because the commits are identical once both land.
- Two owner questions are open: what a failed commit shows, and how many calibrations unlock COMMIT. The build proceeds with conservative defaults behind the single rules function.
=== END PLAN ===

=== MERGE branch=lane/gameplay/gameplay-quest-review ===

=== AGENT name=gameplay-contracts-migration model=opus base=lane/gameplay/integration ===
**GOAL.** The player's quest can never jam, skip, double-fire or rewind. There must be exactly ONE quest table in ECHO, and it is platform's `echo/contracts.js`. Gameplay's quest core imports it and keeps no copy. The robustness defects an adversarial review found are fixed and shown fixed through the real harness.

**VISION.** ECHO: ONE OF ONE (vision §9 quest states, §7.4 the token is consumed once, §8.7 bus). A judge plays title→credits on Qollab. The quest machine is the spine that every terminal, world reaction and ending hangs from. Two diverging tables mean a world that sticks at BOOT (review F1).

**WHAT WE ARE BUILDING.** The gameplay lane's `echo/game/` quest core: `state.js`, `eventBus.js`, `missionRules.js` and `objectives.js`. It also includes the dev-only fake, terminal and harness under `dev/gameplay/`, which ship nothing into `echo/`. The 3D world is being built in parallel by `gameplay-world-controller`. Do NOT touch `echo/scene/` or `app.js`.

**WHAT HAS NOT WORKED.**
- Gameplay wrote its own QUEST_STATES/TRANSITIONS and the `quest:enter:*` vocabulary before platform's contracts existed. The two diverged:
  - BOOTED vs BOOT_COMPLETE.
  - RESTART vs `resetGame()`.
  - An array vs a strict proxy table.
  - `quest:transition` vs `QUEST_STATE_CHANGED`.
- A guard that compares state names is ABA-blind (F3).
- A test parser that silently skips a row it cannot parse went green with an edge missing (F8).
- Pauli-eigenstate calibration states let a wrong correction show fidelity 1 (F5). The owner has ruled that dry runs use fresh random generic Bloch states.

**Read first (vault + rules):**
- `vault/AGENTS.md` and `vault/Index.md`.
- `vault/Reports/quest-state-machine-contract.md`.
- `vault/Reports/quest-core-adversarial-review.md`, together with `evidence/gameplay-quest-review/README.md` and its `a1`–`a5` scripts. These are merged into your base.
- `/Users/udsy/agent-org/lanes/gameplay/rulings.md` and `owner-answers.md`, especially the entry "13 lane design questions".
- `.claude/rules/gate-independence.md`, `no-bloat.md` and `lane-ownership.md`.
- On `lane/platform/integration`: `echo/contracts.js` and `echo/CONTRACTS.md`.

**Do:**
1. **Bring in contracts.** Run `git merge lane/platform/integration` into your branch. Do not edit any platform-owned file (`echo/contracts.js`, `echo/CONTRACTS.md`, `echo/main.js`, `echo/index.html`). If contracts.js is missing something gameplay needs, the gap goes in your report as a platform request. Known gaps:
   - The owner-accepted edge `DECLASSIFIED → ENDING`.
   - How RESTART on ENDING is expressed. The owner ruled that ENDING offers RESTART. contracts.js says restart = `resetGame()`. Implement it as `resetGame()` unless contracts says otherwise.
2. **Migrate.** `state.js`:
   - imports `QUEST_STATES`, `TRANSITIONS`, `transition`, `INITIAL_STATE` and `BUS_EVENTS` from `../contracts.js`;
   - deletes its own table, `BOOTED` and `RESTART`;
   - emits `QUEST_STATE_CHANGED {from,to,event}`.

   Keep `commitIsOneShot()` as an import-time assertion against the imported table. Map world reactions to `WORLD_CHANGES`. Delete `quest:enter:*`/`quest:transition` everywhere, including in the tests and the harness. Grep afterwards and report zero references. Replace `dev/gameplay/tests/schema.mjs` with `validateExperimentResult`, and delete schema.mjs.
3. **Fix with red-first checks**, each written and run red before the code changes:
   - **F2:** a run-to-completion queue, so a send or reset inside a listener delivers in order.
   - **F3:** an `epoch` or session token in `createQuestMachine` that every in-flight result carries. A result from before `resetGame()` is dropped.
   - **F4, gameplay half:** a commit latch. Once COMMIT_TRANSFER has been requested, no second commit request can leave gameplay, even if the first one fails or is refused. A failed commit lands in a defined "awaiting owner ruling" state that is visible in the harness. It must NOT re-enable COMMIT. The owner question is pending.
   - **F6:** `eventForResult` returns a refusal, never a throw, on malformed input.
   - **F7:** contradictory Bell probabilities are refused.
   - **F8:** `spec.mjs` fails loudly on any §9.2 row it cannot parse.
4. **Owner rulings 11 and 13:**
   - The fake dry run draws a fresh random generic Bloch state on each attempt, and a wrong X/Z must visibly fail. Re-run `a2_physics.py` against the new fake through Qiskit.
   - `EXPLANATION_READ`/`VIEW_RECEIVER_MARGINAL` advance only after the result panel was shown. Gameplay exposes the gate; story-ui owns the panel, so stub it in the harness.

**Prove it through the product:**
- Re-run `evidence/gameplay-quest-review/*` on your tip. Parts A, B, D and E of a3, and a5, must flip, and a2 must show 0 wrong-correction fidelity-1 cases.
- A headless harness playthrough on YOUR OWN port (not 8611). It goes title→credits→RESTART from ENDING and also covers:
  - reset mid-call with a stale result dropped;
  - a failed commit that stays latched;
  - a wrong dry run that retries on a new state.
- Take PNGs of each moment.
- A sabotage round: revert each fix and remove the epoch, latch and queue one at a time. Report the nulls.

**Deliver** on branch `lane/gameplay/gameplay-contracts-migration`:
- commits;
- `evidence/gameplay-contracts-migration/` with a README;
- an update to `vault/Reports/quest-state-machine-contract.md`. Mark what is superseded instead of silently rewriting it.

**How I will judge:**
- I re-run your tests and the review scripts in a scratch worktree.
- I look at every PNG.
- `git grep` must show no quest table outside contracts.js.
- The diff must touch no platform file.
- If the report and a screenshot disagree, the screenshot wins.

**Report:** `/Users/udsy/agent-org/lanes/gameplay/reports/0003-gameplay-contracts-migration.md`.
- It opens with a **Vault check**, then a TL;DR.
- It includes commands with their exit codes, the evidence paths, the nulls, the platform/quantum requests, what you did NOT verify, and `## Questions for the owner`.
- Write a checkpoint report within 1 h, even if it is partial.
=== END AGENT ===

=== ASK_OWNER ===
Two quest choices that the vision docs do not settle. They come from the gameplay adversarial review (`vault/Reports/quest-core-adversarial-review.md`). Building continues meanwhile.

1. **What happens if the final COMMIT fails after the story token was measured?** Possible causes are a bridge error or a rejected result. §7.4 forbids measuring the token again, so a plain retry would break the physics. Options:
   - (a) **Recommended:** an honest "transfer lost — the original was consumed" screen that offers RESTART (`resetGame()`).
   - (b) A scripted recovery with no second measurement.
   - (c) Something else.

   Until you answer, gameplay latches the commit so it can never fire twice.
2. **What unlocks COMMIT in the rooftop dry run?** Today, one correct calibration is enough, and if the random bits come out 00 the passing answer is "change nothing". `CLAUDE.md` says the player should "make all four conditional correction choices". Options:
   - (a) **Recommended:** at least one correct pass where the bits are not 00, so the player must actually apply X and/or Z.
   - (b) All four bit outcomes corrected correctly.
   - (c) One correct pass of any kind, as built.
=== END ASK ===

=== LEARN ===
2026-10-10 consult 3: The quest-core review found that platform's `echo/contracts.js` (lane/platform/integration @ 6378677) and gameplay's `state.js` defined two diverging quest tables:
- BOOT_COMPLETE vs BOOTED
- `QUEST_STATE_CHANGED` vs `quest:enter:*`
- `resetGame()` vs a RESTART edge

Lesson: once the owner has ruled that a contract is shared and platform-owned, do not let gameplay build further on its own copy. Migrate at the first chance by merging lane/platform/integration and deleting the copy. Every gameplay worker codes against contracts.js names. Evidence: `evidence/gameplay-quest-review/out-a1_table.txt`, `vault/Reports/quest-core-adversarial-review.md`.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 3: The dev fake's calibration states included Pauli eigenstates (|0>, |+>, …). On those, 20 of 80 wrong corrections still show fidelity 1, which contradicts the vision's promise that wrong corrections visibly fail. The owner then ruled that dry runs use fresh random generic Bloch states. Never use named basis states for any check whose job is to expose a wrong correction. Evidence: `evidence/gameplay-quest-review/out-a2_physics.txt`.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 3: World-controller was briefed before the contracts migration, so it subscribes to `quest:enter:*`. Merge rule: it must rebase onto the post-migration integration branch and use `QUEST_STATE_CHANGED`/`WORLD_CHANGES` from contracts.js before I merge it. Grep for `quest:enter` must return zero.
=== END LEARN ===
