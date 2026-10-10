# 0006 gameplay-world-v2-port — CHECKPOINT 1 (2026-10-10, ~T+25 min)

## TL;DR
- PARTIAL. Merged `lane/gameplay/integration` (c49a922) — no conflicts — then `main` (6cc19a6+99dfc54): only the generated hubs `vault/Map.md`, `vault/Reports/README.md` conflicted (took main's; the loop regenerates). Tip `6c0f721`.
- After the merge 3 tests are red, all caused by v2: (1) spec ground truth lacks v2's `DECLASSIFIED -CLOSE_SCIENCE→ ENDING` and `ENDING -RESTART→ TITLE`; (2,3) v2 validator refuses `documented_preview` for `bell_signalling`, so the JS fake can no longer drive Mission 2 or the dry run (dryRunVerdict needs `exact_qiskit_local`).
- Plan: dev-only Python engine server (real Qiskit 2.5.2 in the venv, reusing platform's `tools/contract-check/teleport_oracle.py` for both dry-run phases) replaces the JS statevector fake; `send(event, via)` enforces EVENT_SOURCES; world reactions keyed by WORLD_CHANGES ids; app.js onto QUEST_STATE_CHANGED/OPEN_TERMINAL/CLOSE_TERMINAL/resetGame.

## Vault check
Read so far: lanes/gameplay/context.md, rulings.md, plan.md, reports 0001 (world-controller) and 0003 (contracts migration), echo/CONTRACTS.md (v2), echo/contracts.js.

## CHECKPOINT 2 (~T+70 min)
- Commit afcaf17: missionRules dry run → contracts `dryRunVerdict(request, result)`; local `expectedCorrections`/`FIDELITY_OK` deleted (contracts' used); `send(event, via)` refuses a via other than `EVENT_SOURCES[event].via`; `RESTART` (ENDING) is a new session like resetGame(); JS fake deleted → `dev/gameplay/dev_engine.py` (real Qiskit, local CPython) + `devEngine.js` client. Unit suite 55/55.
- In progress (uncommitted): app.js/interactions on BUS_EVENTS + QUEST_STATE_CHANGED; district/alley/relay/rooftop keyed by WORLD_CHANGES ids through `changeId` (throws on an unknown id); world.html + devTerminal two-phase dry run; world-playthrough rewritten (2 full runs, wrong dry run, copy-based sabotage with controls).
