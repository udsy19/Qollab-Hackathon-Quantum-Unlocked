=== PLAN ===
**Lane gameplay: plan as of consult 6 (2026-10-10 ~00:05 ET, 04:05 UTC).** G2 is due Sat 2026-10-10 17:00 ET. If we miss it, we cut to the one-room version (vision §13).

**Goal (plan row 5):** the playable graybox:
- Third-person follow camera, WASD + mouse + Shift + E + Esc, pointer lock.
- Collision and bounds.
- Alley + booth, Relay Chamber, Rooftop.
- Interaction detection.
- The §9 quest machine (idempotent, no invalid skips, `resetGame()`) and the §9.3 world reactions.
- A fake adapter against `ExperimentResult`. Primitive geometry only.

**State I measured this consult (git, not reports):**
- `lane/gameplay/integration` is at c49a922. It carries quest-core, the review and the contracts migration (contracts v1, platform-integration era). It does NOT contain `main`, so it lacks contracts v2 (80d685f/2133d8a) and `tools/contract-check/` + `tools/qollab-caps/`.
- `lane/gameplay/gameplay-world-controller` is at 1a89bfb and FINISHED (final report 0001). It was not rebased. It does NOT contain integration and still has `quest:enter` in `echo/game/eventBus.js` and `state.js`, so it carries the OLD quest core. I can't merge it as it stands (my consult-3 merge rule). Its evidence is strong: 36/36 checks with real keyboard and mouse, served-token provenance, collider sabotage flips, walk.mp4.
- `gameplay-commit-fault-exit` is still running and has no commits beyond integration. It is based on pre-v2 integration.
- Contracts v2 on main has RESTART, EVENT_SOURCES, the two-phase dry run (bits first) and engine/experiment rules. It does NOT yet have the 4 story-ui MOMENT events or a countdown.
- `lane/quantum/integration` d9b42d0 has the pyodide-bridge merged.

**Done:** quest-core, quest-review and contracts-migration are merged (consults 2–4).

**Dispatching now:**
1. `gameplay-world-v2-port`, based on the world-controller tip. It merges `main` (v2) and `lane/gameplay/integration`, and ports the 3D world onto the contracts quest core: `QUEST_STATE_CHANGED`, `WORLD_CHANGES` ids, `EVENT_SOURCES`, the two-phase dry run. It deletes the old core copies, re-runs the world playthrough with provenance and sabotage, and runs `tools/contract-check` + `tools/qollab-caps`. This branch becomes the next integration tip.
2. `gameplay-real-engine-seam`. This one is read-mostly: it edits no product files and records evidence only. It drives gameplay's `missionRules`/quest machine with v2 contract fixtures and with real output from `lane/quantum/integration` (pyodide-bridge / `dump_results.py`). It also checks the fidelity threshold ≥ 0.999999. It produces the exact delta list the port and adapter swap need. Running it in parallel avoids file conflicts.

**Next:**
1. Judge the v2 port: walk video and PNGs through the real input path, plus my own re-run in a `/tmp` worktree. Then MERGE.
2. Commit-fault-exit: when it finishes, it must merge the new integration tip, which brings v2 and the world. If the conflict is non-trivial, a short rebase worker.
3. Integration playthrough: 3 consecutive title→credits runs with reset, through the 3D world, on its own port, recorded, plus a headed FPS reading.
4. Real adapter swap, using the seam report, once red-team's cross_lane_check passes.
5. MOMENT events + countdown, after platform adds them to contracts.js (not in v2 yet).

**Risks:**
- Port conflict size: world-controller diverged from the contracts migration in `state.js`, `eventBus.js` and the harness.
- Headless FPS is 12–46 (M4 Pro); there is no headed reading yet.
- Nothing lands on main until cross_lane_check passes.
- G2 deadline in ~17 h. The one-room cut is the fallback.
=== END PLAN ===

=== AGENT name=gameplay-world-v2-port model=opus base=lane/gameplay/gameplay-world-controller ===
# Brief: port the 3D graybox world onto contracts v2 and the migrated quest core

## GOAL
A judge clicks PLAY and walks Rin in third person: rain alley → booth → connector → relay chamber → rooftop → commit → city lights → ending → RESTART. Every quest step is driven by the ONE quest table and bus vocabulary in platform's `echo/contracts.js` **v2**, not by gameplay's own copy. After your change, one branch holds both the 3D world AND the migrated, hardened quest core, and it is mergeable into `lane/gameplay/integration`.

## VISION
ECHO: ONE OF ONE (`ECHO_MASTER_VISION.md`): §3.1 controls, §5.1 spaces, §9.1–9.5 quest states, transitions, world reactions and reset, §8.4 adapter contract. G2, the playable graybox, is due Sat 17:00 ET.

## WHAT WE ARE BUILDING
The Qollab project root `echo/`. This lane owns `echo/game/` (except `audio.js`) and `echo/scene/` (except lighting/rain/props/buildings/effects). The dev harness lives under `dev/gameplay/`, outside echo/. Primitive geometry only.

## WHAT HAS NOT WORKED / the state you inherit
- Your base, `lane/gameplay/gameplay-world-controller` @ 1a89bfb, is the 3D world (see report `lanes/gameplay/reports/0001-gameplay-world-controller.md`). It is built on the OLD quest core: `quest:enter:*`, `quest:transition`, and gameplay's own `TRANSITIONS`. `git grep quest:enter` hits `echo/game/eventBus.js` and `echo/game/state.js`.
- `lane/gameplay/integration` @ c49a922 has since migrated the core: `state.js` imports `TRANSITIONS`/`QUEST_STATES`/`BUS_EVENTS`/`WORLD_CHANGES` from `echo/contracts.js`, plus a run-to-completion queue, epoch tickets, the commit latch, the ack gate and refusal-only mission rules. The fake now uses random generic calibration states and `schema.mjs` is deleted. Read `lanes/gameplay/reports/0003-gameplay-contracts-migration.md` and `vault/Reports/quest-state-machine-contract.md`.
- `main` @ 6cc19a6 carries **contracts v2**: RESTART, EVENT_SOURCES, engine/experiment rules, and the two-phase teleport dry run (bits first, corrections second). It also carries `tools/contract-check/` and `tools/qollab-caps/`. Neither gameplay branch has v2.
- Lesson: two quest tables diverged once already (`vault/Reports/quest-core-adversarial-review.md` F1). Never keep a second copy of anything contracts.js defines.
- Headless FPS read 12–46. That is not a laptop measurement. Do not claim the ≥30 FPS bar.

## Vault notes to read first
`vault/AGENTS.md`, `vault/Index.md`, `vault/Map-code.md`, `vault/Reports/quest-state-machine-contract.md`, `vault/Reports/quest-core-adversarial-review.md`, `vault/Research/qollab-platform-and-submission.md`, `echo/CONTRACTS.md` (v2, from main), `lanes/gameplay/rulings.md`.

## Where to start
1. `git merge lane/gameplay/integration`, then `git merge main`. In every conflict, contracts.js/v2 semantics win over the old world-controller core. The integration branch's `state.js`/`eventBus.js`/`missionRules.js`/fake win over world-controller's copies. Keep world-controller's scene, controller, collision, interaction and world-reaction code.
2. Re-point the world reactions to `QUEST_STATE_CHANGED` and the snake_case `WORLD_CHANGES` ids from contracts.js (e.g. `corridor_door_opens`, `rooftop_access_unlocked`). Movement events (`OPEN_ROOFTOP`, `EXIT_BOOTH`) come from gameplay world triggers, as `EVENT_SOURCES` says. Rooftop console id `teleport_terminal`.
3. Conform the dev terminal and fake to the v2 two-phase dry run: the player sees m0, m1 first, then picks X/Z from all four choices. COMMIT unlocks only after a correct dry run with bits ≠ 00, on fresh random generic states. A wrong dry run retries on a fresh state.
4. Delete every superseded copy in the same change. Afterwards: `git grep -nE "quest:enter|quest:transition|BOOTED"` over `echo/` and `dev/` returns zero, and you name any remaining hit with its reason.

## Deliver
- The branch, merged and green: `node --test 'dev/gameplay/tests/*.test.mjs'`, `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs`, each with its exit code saved under `evidence/gameplay/world-v2-port/`.
- `world-playthrough.mjs --falsify --publish` on YOUR OWN port (not 8611/8612; pick 86xx unused), with real keyboard and mouse input. Re-derive the served-build token (change it, read it back from the served page, abort on mismatch). It must cover: title → three missions → commit → city lit → ending → RESTART → title, then a second full run after reset. Include one wrong dry run that visibly fails on a generic state.
- Sabotage (write the checks first and watch them fail): a collider off; a WORLD_CHANGES id renamed in your subscriber (must go red); the RESTART handler removed; `EVENT_SOURCES` violated (a movement event sent from a terminal must be refused). Report the nulls.
- PNGs to `renders/gameplay-world-v2-port/` (≤12, the key moments) and `walk.mp4` in evidence.

## How I will judge
I re-run the tests and the playthrough in a `/tmp` worktree at your tip. I look at the PNGs and the video; a report claim without a picture counts for nothing. I grep for the old vocabulary. `git diff --stat lane/gameplay/integration...<tip>` must show only gameplay-owned files, `dev/`, `evidence/`, `renders/` and `vault/Reports/`. Edits to `echo/contracts.js`, `main.js`, `ui/` or `data/` are refused; put those in Requests.

## Report
`lanes/gameplay/reports/0004-gameplay-world-v2-port.md`. Write a CHECKPOINT within 1 h, with what has merged and the conflicts resolved. The final report opens with TL;DR, then a **Vault check**, then evidence (command + exit code + path), sabotage including the nulls, Requests for platform and story-ui, and what was NOT verified (nothing ran on Qollab, so say "local runner"). Write durable findings to `vault/Reports/` and run `node scripts/vault-hubs.mjs`.
=== END AGENT ===

=== AGENT name=gameplay-real-engine-seam model=opus base=lane/gameplay/integration ===
# Brief: measure the seam between gameplay's quest rules and the REAL quantum engine (evidence only)

## GOAL
When the fake adapter is swapped for the real Qiskit engine, the player must still progress through all three missions. Wrong answers must still fail, and the token must still be consumed once. Today we don't know that it will. Red-team found that gameplay `missionRules.js` read field names the engine never emits, so the quest stalled at CLONE_INTRO, and that gameplay tests pass only on the fake. Produce the measured list of exactly what breaks, so the swap is a short, known change.

## VISION
§7 normative physics, §8.4 quantum adapter contract, §12.3 honest errors. Owner rulings: ONE ExperimentResult shape in `echo/contracts.js`; gameplay tests run on real engine output; fidelity threshold ≥ 0.999999; random generic dry-run states; story token fixed and hidden, consumed once.

## WHAT WE ARE BUILDING
Gameplay's quest core (`echo/game/state.js`, `missionRules.js`), which consumes `ExperimentResult`s produced by quantum's engine (`echo/quantum/` on `lane/quantum/integration` @ d9b42d0, pyodide-bridge merged).

## WHAT HAS NOT WORKED
- Red-team `cross_lane_check`: 12/13 failed (`lanes/red-team/reports/*physics-code-audit*`, `evidence/red-team/physics-code-audit/out/` on `lane/red-team/integration`).
- Gameplay test nulls: changing FIDELITY_OK from 0.999999 to 0.9, or removing the fidelity check, left the tests green.
- Contracts have since moved to v2 on main (two-phase dry run). Gameplay integration is still on v1.

## You edit NO product files
No `echo/` edits on any branch. Write only `evidence/gameplay/real-engine-seam/` (scripts, fixtures, outputs, README) and `vault/Reports/gameplay-real-engine-seam.md`. Do your work in disposable `/tmp` worktrees: one for `main`, one for `lane/quantum/integration`, one for `lane/gameplay/integration`.

## Do
1. Generate real engine results. Use quantum's `dump_results.py`, or call its Python entrypoints with the venv's qiskit for each experiment: cloning attempts, the relay/Bell receiver marginal, teleport dry runs with all 4 bit branches × 4 corrections on random generic states, and the commit. Also validate them with main's `node tools/contract-check/check.mjs`/fixtures. Record which are VALID under v2 contracts.
2. Feed those results, and v2's own fixtures, into gameplay integration's `missionRules`/quest machine. Write a table (law 14) with one row per experiment × branch: the event produced, the quest state reached, whether it is refused, the expected answer derived from the vision §7/§9 doc (not from gameplay code), and the verdict.
3. Fidelity guard: show that a real wrong-correction result (fidelity ≈ 0 or 0.5) is refused, and that one perturbed to 0.9999 is refused at the ≥ 0.999999 threshold. Sabotage the threshold and confirm your check goes red. Report the nulls.
4. List every field-name, phase or shape mismatch: gameplay vs v2 vs engine. Name the owning lane for each fix.

## Vault notes
`vault/AGENTS.md`, `vault/Index.md`, `vault/Reports/quest-state-machine-contract.md`, `vault/Reports/quest-core-adversarial-review.md`, `echo/CONTRACTS.md` (main), the quantum lane's pyodide-bridge vault report, `lanes/gameplay/rulings.md`.

## How I will judge
I judge on the table and the reproducible scripts. I re-run one of them myself. Expected answers must come from the doc, not from the code under test (gate-independence law 4). A missing field counts as a FAILURE, never a skip.

## Report
`lanes/gameplay/reports/0004-gameplay-real-engine-seam.md`. Write a checkpoint within 1 h. The report opens with TL;DR and a **Vault check**, and ends with "Requests" grouped by lane (gameplay, quantum, platform). Run `node scripts/vault-hubs.mjs` after adding the vault report.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 6: World-controller finished at 1a89bfb without rebasing onto integration. It still carries `quest:enter` in eventBus.js and state.js, and `merge-base --is-ancestor` shows it lacks integration. I refused the merge per the consult-3 rule and dispatched `gameplay-world-v2-port`, based on its tip, to merge integration + main (v2) and port the world onto contracts. Lesson: a running worker briefed before a contract change rarely rebases on its own. When the contract moves, plan the port as its own task instead of hoping.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 6: Contracts v2 landed on main (2133d8a/80d685f), but `lane/gameplay/integration` did not yet contain main (checked with `git merge-base --is-ancestor main lane/gameplay/integration`, which was false). v2 has RESTART and EVENT_SOURCES and the two-phase dry run, but does NOT yet have story-ui's 4 MOMENT events or a countdown (grep of main:echo/contracts.js). The moment-event work stays blocked on platform. Bring main in through the port worker's branch rather than a separate merge, to avoid two conflicting resolutions of state.js.
=== END LEARN ===
