## TL;DR
- DONE (local, dev harness): one frozen quest FSM (`echo/game/state.js`) + event bus + `missionRules.js` (result→event) + `objectives.js`; dev-only fake QuantumEngine, DOM terminal, harness and a headless playthrough under `dev/gameplay/`.
- `node --test 'dev/gameplay/tests/*.test.mjs'` → **36 pass, exit 0** (tip 934b8c2). Red before the code existed: exit 1 (`evidence/gameplay-quest-core/01-red-before-impl.txt`).
- Ground truth is parsed from `ECHO_MASTER_VISION.md` §9.1/§9.2 bytes plus the brief's 5 extra edges, never from `TRANSITIONS`. The illegal-pair sweep covers 21 states × 28 probes (22 events + 6 junk) − 25 legal = 563 pairs, and the count is computed by the test.
- Sabotage: 27 sabotages, 24 went red. 3 nulls, all explained: one real gap (fixed, now red), one sabotage I applied wrongly (redone, red), one is the physics (a local gate on either Bell half looks the same). `evidence/gameplay-quest-core/03-sabotage.md`.
- A second COMMIT_TRANSFER cannot happen, and that is proved from the table's structure. `commitIsOneShot()` runs when the module loads, so a table with a re-commit loop refuses to import (sabotage S4 went red).
- Headless Chrome played title→credits→restart through the harness on :8611. It covered spam-E, an injected bridge failure, wrong corrections, a direct re-commit and a reset mid-call, with 0 page errors. PNGs are in `renders/gameplay-quest-core/`. This is a **local dev harness, not Qollab**.
- Recommend: merge into `lane/gameplay/integration`; world-controller codes against `quest:enter:*` and `eventForResult`. The 4 seams below need platform and quantum to decide.

## Vault check
- Read: `vault/AGENTS.md`, `vault/Index.md` (19 notes, nothing on quest/FSM), `vault/Plan.md` rows 3–5, `vault/Research/qollab-platform-and-submission.md` (runtime: relative JS imports from main.js, no storage, `<script>` doesn't run), `/Users/udsy/agent-org/lanes/gameplay/context.md`, `.claude/rules/lane-ownership.md`; vision §3, §7, §8.2, §8.4–8.7, §9, §10.6.
- `where.mjs --branches` for createEventBus, createQuestMachine, QUEST_STATES, fakeQuantum, expectedCorrections, eventForResult, objectives: nothing found on main or on any lane branch, except vision-doc text. No lane branch carried any commit beyond main.
- Reused: §9.2 table verbatim, §10.6 `expectedCorrections` verbatim.
- Stale/wrong: `vault/Index.md` doesn't know any code yet (expected). Plan row 5 still says `open`.

## What I found
1. **Judging corrections by fidelity alone is wrong.** For |0>, a spurious Z is only a global phase, so fidelity is 1 with the wrong choice. The same holds for |1>, and X does the same on |+>. `eventForResult` requires corrections == rule(m0,m1) **and** fidelity ≥ 0.999999. The real terminal must do the same, or calibrate only on generic states.
2. **The browser run caught a skip path in my own harness.** A "press 5×" button sent the *next legal* event bare, which skipped the clone experiment. Any dev control that sends quest events directly is a skip edge. It now only repeats the last accepted event. The 5 repeats returned `ok:false` 5×, as `04-playthrough.txt` shows.
3. **Stale async results.** If the quest moves (reset) while a quantum call is in flight, the result must be dropped. devTerminal checks this, and the playthrough step "reset during in-flight clone → TITLE, result discarded" covers it. Real terminals need the same guard.
4. **§8.4 interface gaps:**
   - There is no call that returns Bell bits *before* the player picks corrections.
   - There is no commit call.
   - The fake adds `sampleBellBits()` and commits via `teleportDryRun('story_token', X, Z, liveBits)`, with X/Z taken from `expectedCorrections(liveBits)`.
   - Bell outcomes are uniform at 1/4 for any input, so sampling them without the state is honest.

## What I changed (branch `lane/gameplay/gameplay-quest-core`)
| commit | what |
|---|---|
| bd32530 | `echo/game/{eventBus,state,missionRules,objectives}.js`, `dev/gameplay/fakeQuantum.js`, tests |
| 2e0bfe8 | sabotage table and a subscribe-during-emit check (S12 gap) |
| 6b65694 | `dev/gameplay/{devTerminal.js,harness.html,playthrough.mjs}` and playthrough evidence |
| 326de76, 934b8c2 | `vault/Reports/quest-state-machine-contract.md` (hubs not regenerated, per brief) |

Frozen API, as briefed:
- `createEventBus()` returns `{on→off, emit}`.
- `createQuestMachine(bus)` returns `{state, send→{ok,state,reason}, can, reset}`.
- Also exported: `QUEST_STATES`, `TRANSITIONS` (deep-frozen) and `commitIsOneShot(table)`.
- Emits `quest:transition` and `quest:enter:<S>` with payload `{from,to,event}`.
- `reset()` emits only `quest:reset {from,to:'TITLE'}`.

Fake physics comes from a tiny exact statevector in JS, **not Qiskit**, and is labelled `documented_preview`:

| case | result |
|---|---|
| clone \|0>, \|1> | fidelity 1, purity 1 |
| clone \|+> | fidelity 0.5, purity 0.5 |
| clone phase | fidelity 0.25, purity 0.5 |
| Bell, receiver marginal | 0.5/0.5 for I, X and Z |
| Bell, Z-agreement | I = 1, X = 0, Z = 1 |
| teleport, 6 states × 4 branches × 4 choices | fidelity 1 whenever X==m1 and Z==m0; every wrong choice on the generic Bloch state is < 0.99 |

Other fake behaviour:
- `verifySelectedBackendOnce` returns no counts, says "no backend job was run", and refuses a second call.
- `failNext()` rejects exactly one call.

## Commands + exit codes
- `node --test 'dev/gameplay/tests/*.test.mjs'` → exit 1 before the code existed; exit 0 with 36/36 at the tip.
- `bash /tmp/gq-sab/run.sh …` × 27, each on a disposable copy, with bytes-changed checked before running (table below).
- `python3 -m http.server 8611` + `node dev/gameplay/playthrough.mjs 8611 evidence/gameplay-quest-core` → exit 0, 0 page errors.
- Forbidden-API grep over `echo/` (localStorage, sessionStorage, indexedDB, cookie, POST/PUT/DELETE, WebSocket, Worker, backend.run, dev/, fakeQuantum, documented_preview) → exit 1: no matches. `echo/` holds 4 files.

## Sabotage table (full detail: `evidence/gameplay-quest-core/03-sabotage.md`)
| # | sabotage | red? | which check |
|---|---|---|---|
| S1 | remove `RELAY_SEND_FAILED.VIEW_RECEIVER_MARGINAL` | RED (8) | spec-equality, legal walk, legal pairs, reset/replay, … |
| S2 | skip edge with a new event `FREE_ROAM_ALLEY.SKIP_TO_ROOF→ROOFTOP_UNLOCKED` | RED (1) | spec-equality only. A check derived only from TRANSITIONS could not see this, which is why truth comes from the doc |
| S3 | skip edge with an existing event `FREE_ROAM_ALLEY.OPEN_ROOFTOP→ROOFTOP_UNLOCKED` | RED (2) | spec-equality, illegal-pair sweep |
| S4 | re-commit loop `ENDING.RETRY→TELEPORT_DRY_RUN` | RED | module refuses to import |
| S5 | disable the one-shot proof | RED | commitIsOneShot check |
| S6 | `can` uses `in` | RED | illegal sweep (`__proto__` / `constructor` probes) |
| S7 | emit before setting state | RED | re-entrant send check |
| S8, S9 | silent reset; reset to BOOT | RED | reset checks |
| S10 | rows not frozen | RED | immutability |
| S11 | bus without try/catch | RED | throwing-listener check |
| **S12** | bus iterates the live Set | **NULL** → added check → S12b RED | real gap (subscribe-during-emit) |
| **S13** | rule ignores corrections | **NULL**: my sabotage was wrong (`false && A \|\| B` kept the Z half) → S13b RED | — |
| S14–S16 | story token allowed in calibration; X/Z rule swapped; `I` counted as a signal attempt | RED | missionRules checks |
| S17, S18, S20, S21 | fake: m0/m1 swapped; no CX; backend twice; sticky failure | RED | fake physics/contract checks |
| **S19** | fake applies the sender gate to the receiver half | **NULL, correct physics** (same marginal and Z-agreement); real signalling bug S19b RED | — |
| S22, S23 | drop a §9.2 line / a §9.1 state in the *doc copy* | RED (7 / 3) | proves the doc is consulted |
| S24 | objective missing for one state | RED | objectives check |

## Seams / requests for other lanes
- **platform (shared contracts):**
  - Probability key format: I used explicit labels (`'q0q1=01'`, `'receiver=0'`).
  - Result field names that `missionRules` reads: `parameters.state`, `parameters.senderGate`, `parameters.stateId`, `parameters.correctionX/Z`, `measurementBits`, `fidelity`.
  - Please adopt or replace these. The test-only schema guard `dev/gameplay/tests/schema.mjs` should be deleted when platform's guard lands.
- **quantum:** the real adapter must report `fidelity` and `parameters.reducedPurity` (cloning), and the receiver marginal (Bell). It also needs a way to show bits before corrections and a commit path (finding 4).
- **story-ui:** objective *text* keyed by the `obj.*` ids in `echo/game/objectives.js`. If you build `echo/data/objectives.js`, tell me and I'll delete my map in favour of yours. Terminals must call `eventForResult` and drop stale results.
- **gameplay-world-controller:** subscribe to `quest:enter:<STATE>` for the §9.3 world changes and to `quest:reset` to restore the world. Send `OPEN_CLONE_BOOTH` / `REACH_RELAY` / `REPAIR_CLASSICAL_LINK` on E. Repeats are safe because they are refused and emit nothing.

## What I did NOT do / could not verify
- Nothing ran on Qollab. Relative imports between `echo/game/*.js` files are **unverified on Qollab**; platform's G0 should confirm them.
- I did not wire into `echo/main.js` (platform owns it) or any 3D scene.
- The fake is not Qiskit. Its numbers match §7 but it does not replace G1.
- Hubs, Map and Index were not regenerated, per the brief.

## Questions for the owner
1. When the player picks wrong X/Z in the dry run, the vision allows retry on a "new prepared state". Should the retry use the **same** calibration state with fresh bits, or cycle states? I cycle through 6. Cycling basis states makes "fidelity 1 with wrong Z" possible, which my rule refuses.
2. Should ENDING also offer RESTART directly, or only via DECLASSIFIED/CREDITS (as built, per the brief)?
3. Should the acknowledgement steps (`EXPLANATION_READ`, `VIEW_RECEIVER_MARGINAL`) require the player to have seen the result panel, or is a button press enough? As built, a press is enough because these are not experiments.

## What the supervisor should do next
1. Re-run `node --test 'dev/gameplay/tests/*.test.mjs'` and the playthrough on your own port. Then merge `lane/gameplay/gameplay-quest-core` → `lane/gameplay/integration`.
2. Tell world-controller the event names above, and have it subscribe rather than poll.
3. Raise the §8.4 gaps (bits-before-corrections, commit call, result field names) with platform and quantum through the owner-answers channel before quantum ships its adapter.
4. Put the 3 owner questions to the owner. The build does not wait on them.
