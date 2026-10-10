=== PLAN ===
**Lane gameplay: plan as of consult 2 (2026-10-09 ~23:30 ET).** G2 is due Sat 2026-10-10 17:00 ET. If we miss it, we cut to the one-room version (vision §13).

**Goal (plan row 5):** a playable graybox in a desktop browser:
- A third-person follow camera, WASD + mouse + Shift + E + Esc, and pointer lock.
- Collision and bounds.
- The three connected spaces: Alley + booth, Relay Chamber and Rooftop.
- Interaction detection.
- The §9 quest machine: idempotent, no invalid skips, `resetGame()`.
- §9.3 world reactions.
- A fake adapter against `ExperimentResult`, and primitive geometry only.

**Done:**
- `gameplay-quest-core` (tip 934b8c2) has been judged and is being MERGED.
- I re-ran its tests myself in a scratch worktree: `node --test 'dev/gameplay/tests/*.test.mjs'` gave 36 pass, exit 0.
- I looked at the screenshots:
  - The harness walks BOOT→…→TELEPORT_COMMITTED.
  - Spam-E is refused: ×5 gives false ×5.
  - Wrong corrections on m0=1, m1=0 give fidelity 0 and no progress. That is physically right: X applied to Z|+⟩ is still orthogonal to |+⟩.
  - Reset mid-call discards the stale result.
- What it delivered:
  - In `echo/game/`: `state.js`, `eventBus.js`, `missionRules.js` and `objectives.js`.
  - Under `dev/gameplay/`: the fake quantum adapter, the dev terminal and the harness.
  - The contract note `vault/Reports/quest-state-machine-contract.md`.

**Running:**
- `gameplay-world-controller`: the scene, the three spaces, the controller/camera/collision, interactions, `app.js` `startGame` and world reactions. It should now rebase onto integration and subscribe to `quest:enter:*` / `quest:reset`.

**Dispatching now:**
- `gameplay-quest-review`: an adversarial reviewer on the merged quest core. It checks the physics truth of the fake adapter and `missionRules` against §7. It also checks state-table fidelity to §9, the ownership seams, and that nothing dev-only leaks into `echo/`. Read-only.

**Next:**
1. When world-controller reports, judge it by screenshots and video of walking alley→relay→rooftop and pressing E through the quest. Then merge.
2. Run an integration playthrough worker: one recorded title→credits run in the 3D harness on its own port, with 3 consecutive runs and reset between them.
3. Contract migration. The owner ruled that shared contracts (quest states, transitions, event names, interactable ids) live in platform's `echo/contracts.js`. When platform lands it, a gameplay worker makes `state.js` import QUEST_STATES/TRANSITIONS from it and deletes our copies (no-bloat). Our table is the proposal we hand platform.
4. Swap in the real quantum adapter when the quantum lane ships, and delete `dev/gameplay/tests/schema.mjs` once platform's validator exists.

**Seams to raise (via report and overseer):**
- Platform needs to adopt our result field names and probability key format.
- Quantum's adapter needs:
  - `fidelity`
  - `parameters.reducedPurity`
  - the receiver marginal
  - a bits-before-corrections step
  - the commit path

**Risks:**
- World-controller's size against its 2 h budget. Its checkpoint is due about 1 h in.
- The duplication between `contracts.js` and `state.js` until migration.
- Pointer lock in headless capture. The owner verifies it by looking.
=== END PLAN ===

=== MERGE branch=lane/gameplay/gameplay-quest-core ===

=== AGENT name=gameplay-quest-review model=opus base=lane/gameplay/integration ===
You are an adversarial REVIEWER (read-only on product files; you write only your report and, if useful, `vault/Reports/` findings). One task: try to break the quest core that was just merged into `lane/gameplay/integration`.

**GOAL:** A first-time player can never reach a state that the physics or the story forbids. They cannot skip a mission, commit twice, get credit for a wrong correction, or see a fake result presented as Qiskit. The quest machine must also be safe for the 3D world-controller to drive with spammed key presses and resets.

**VISION:** ECHO: ONE OF ONE teaches no-cloning, no-signalling and teleportation through play. Judges reward truthful physics (vision §2.4, §7.5) and a complete, reliable quest loop (§9, §12.5).

**WHAT WE ARE BUILDING:** In `echo/game/`:
- `state.js` holds the §9.1/§9.2 FSM. `createQuestMachine(bus)` returns `{state, send, can, reset}`. It emits `quest:transition` and `quest:enter:<STATE>`, and `commitIsOneShot()` is checked at load.
- `eventBus.js`.
- `missionRules.js` maps an `eventForResult(result)` from an ExperimentResult to a quest event.
- `objectives.js`.

Under `dev/gameplay/` there are three dev-only pieces: `fakeQuantum.js` (labelled `documented_preview`), `devTerminal.js` and `harness.html`. Read `vault/Reports/quest-state-machine-contract.md` and the worker report `/Users/udsy/agent-org/lanes/gameplay/reports/0001-gameplay-quest-core.md` (including its sabotage table, `evidence/gameplay-quest-core/03-sabotage.md`).

**WHAT HAS NOT WORKED (org-wide):**
- Optimising against tests instead of the product.
- Judging the wrong artifact.
- Gates whose ground truth came from the code under test.

The worker claims its tests parse the ground truth from `ECHO_MASTER_VISION.md` bytes. Verify that claim independently.

**Vault notes to read first:**
- `vault/AGENTS.md`, `vault/Index.md`
- `vault/Reports/quest-state-machine-contract.md`
- `vault/Research/qollab-platform-and-submission.md`
- `.claude/rules/gate-independence.md` and `vault/Design/gate-independence-cases.md`
- Vision §7 (physics), §8.4 (ExperimentResult), §9 (quest states, reactions, reset) and §13.

**What to check (derive your own checks; these are starting points, not a test list):**
1. **The state table vs §9.1/§9.2, read by you from the doc.** Look for any edge the doc does not license, any state that cannot be reached, and any dead end. Check that RESTART/reset leaves no residue: listeners, pending results, or a committed flag.
2. **Physics truth in `fakeQuantum.js` + `missionRules.js` vs §7.** Check the following:
   - m0 = source readout and m1 = Bell half.
   - X iff m1 = 1 and Z iff m0 = 1.
   - Fidelity is 1 only for correct corrections, and the result is independent of which basis state.
   - Note the worker's open question: cycling basis states can give "fidelity 1 with wrong Z". Construct a case and say whether the rule handles it.
   - The no-signalling marginal is 0.5/0.5 regardless of the sender gate.
   - The cloning failure is real: reduced purity < 1 / fidelity < 1 for superposition, and 1 for basis states.
   - The story token cannot be measured or reused before commit.
3. **Honesty labelling.** Nothing in `echo/` imports anything from `dev/`. The fake can never be mistaken for Qiskit output: check its engine label and wording.
4. **Robustness for a 3D driver.** Check these cases:
   - a send during a `quest:enter` handler
   - an exception thrown in a listener
   - a stale async result after reset
   - 1000 random event sequences with no invalid state reached

   Write a throwaway fuzz script under `/tmp`, not in the repo.
5. **Qollab runtime fit (`.claude/rules/qollab-runtime.md`).** Check for:
   - only relative ES-module imports
   - no Node APIs, storage, POST, workers or bare specifiers inside `echo/game/`
6. **Lane ownership and no-bloat.** Note anything that duplicates what platform's `echo/contracts.js` will own (owner ruling 2026-10-10). Do not fix it; describe the migration.

**Falsify against a disposable copy** (law 10): run in a `/tmp` worktree of `lane/gameplay/integration`, never by editing the lane checkout. Serve any browser check on your OWN port (pick 86xx, not 8611).

**Deliver:** a report at `/Users/udsy/agent-org/lanes/gameplay/reports/` (next number, `-gameplay-quest-review.md`). It must contain:
- a TL;DR
- `## Vault check`
- the findings ranked by severity, each with: a reproduction (command plus output, or file:line), the expected vs actual result, and the fix you recommend and which lane owns it
- the nulls: what you tried that did NOT break
- `## Questions for the owner`

For a durable finding, also add a short `vault/Reports/` note linked from its hub (`node scripts/vault-hubs.mjs`), and commit it on your branch.

**How I will judge it:** reproductions I can re-run. A finding without a repro is discarded. "No defects found" is acceptable only with the list of attacks attempted and their outputs. Checkpoint within 1 h. Budget 1.5 h.
=== END AGENT ===

=== ASK_OWNER ===
Gameplay lane has three small questions. They come from the quest-core worker and the vision docs do not settle them. The build continues with the current behaviour in the meantime.

1. **Teleport dry-run retry.** When the player picks the wrong X/Z corrections, the retry uses a newly prepared calibration state. As built, it cycles through 6 calibration states. Should a retry use the **same** calibration state with fresh measurement bits instead? Or keep cycling?
2. **ENDING → restart.** Should the ending screen offer RESTART directly? Right now restart is only reachable via Declassified → Credits.
3. **Acknowledgement steps** ("I read the explanation", "view receiver marginal"). Is a button press enough to advance? Or must the player first have had the result panel on screen? As built, a press is enough.

Evidence of the current flow:
- [dry run, wrong corrections](renders/gameplay-quest-core/04-dry-run-wrong-corrections.png)
- [committed](renders/gameplay-quest-core/05-committed.png)
=== END ASK ===

=== LEARN ===
2026-10-10 consult 2: I merged gameplay-quest-core after re-running its suite myself in a scratch worktree off the branch tip 934b8c2 (36 pass, exit 0) and looking at all its screenshots. The physics check on the wrong-correction screenshot was right. With m0=1, m1=0 the receiver holds Z|+⟩. Applying X gives fidelity 0, and the rule gave no progress. Judging habit: use a `/tmp` worktree for re-runs, then remove it.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 2: The quest table (QUEST_STATES/TRANSITIONS) now lives in `echo/game/state.js`. The owner has ruled that shared contracts live in platform's `echo/contracts.js`. Once platform lands it, `state.js` must import from contracts.js and delete its own copy in the same change (no-bloat). Our table is the proposal we hand to platform; it is not a second source of truth.
=== END LEARN ===
