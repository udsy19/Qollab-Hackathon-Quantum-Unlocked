## TL;DR
- **DONE and verified.** A commit result that comes back and is refused no longer strands the player. The latch is now `measured_refused`, and COMMIT never re-arms (the token was measured, §7.4). `machine.commitFault` exposes `{ tokenConsumed: true, verified: false, reason, result, restartOffered: true }`. The dev terminal shows an honest SCIENTIFIC MODULE ERROR with RESTART (`resetGame()`, §9.5). The next session commits and reaches ENDING. Commit `323bb8d` on `lane/gameplay/gameplay-commit-fault-exit`.
- Red first: `evidence/gameplay-commit-fault-exit/red-before.txt` (2 unit fails on c49a922) and `red-before-playthrough.txt` (new playthrough on c49a922: exit 1).
- Green: `node --test 'dev/gameplay/tests/*.test.mjs'` gives 56 pass, exit 0 (`green-after.txt`). The harness playthrough on private port 27798 exits 0 (`playthrough.txt`).
- Engine commit calls per session, counted at the quantum adapter (outside the machine): `{"0":2,"2":1,"3":1}`. Session 0 is one errored call plus its retry; fault session 2 makes 1 call; the RESTART session 3 makes 1.
- PNGs: `renders/gameplay-commit-fault-exit/1-commit-measured-refused-honest-error-restart-offered.png` and `2-after-fault-restart-next-session-reaches-ending.png`.
- Sabotage (disposable /tmp copies): removing the RESTART offer (machine or terminal) and re-arming COMMIT (machine or terminal) each turn the playthrough red. An unmutated control is green; a no-op control is refused.
- `grep awaiting_ruling` finds 0 hits in `echo/`, `dev/`, `vault/`. The remaining hits are historical evidence output from the old tip (see Nulls).
- No contract change was needed. Next: story-ui renders `commitFault` in the real teleport terminal (request below).

## Vault check
- **Read:** `lanes/gameplay/context.md`, `lanes/gameplay/rulings.md` (consult-3 commit ruling: "latched once recorded"), `vault/Reports/quest-state-machine-contract.md`, `vault/AGENTS.md` (delivered by hook), Home NOW.
- **Not found:** `evidence/gameplay-contracts-migration/README.md` does not exist on this tip; the folder holds only txt/PNGs. I did not open `quest-core-adversarial-review.md` or `shared-contracts.md` because the brief's ruling settled the design and no contract change was needed.
- **Searched:** `node scripts/where.mjs commitFault --branches`. The only other hits are `fakeQuantum.js`'s local dev-fault flag `commitFault` (different thing: the harness "engine fault on next commit" switch). There is no prior machine-level fault exposure.
- **Already known:** the commit latch, the epoch tickets, the "errored = retryable" rule, `resetGame()` as §9.5 RESTART and the one-shot proof (`commitIsOneShot`).
- **Reused:**
  - `resetGame()`, unchanged, for the way out.
  - The existing RESTART button in devTerminal, now also offered when `commitFault.restartOffered`.
  - The existing "engine fault on next commit" harness hook.
- **Stale:** the vault contract report's header still says "36 pass @ 6b65694" and describes the table as living in state.js (it moved to contracts.js). My addendum records current numbers; I did not rewrite the old body.

## What changed (323bb8d)
- `echo/game/state.js`:
  - `MEASURED_REFUSED: 'measured_refused'`.
  - New `commitFault` (frozen; set only on a measured refusal; cleared by the reset job alongside the epoch bump and the IDLE latch).
  - New getter `machine.commitFault`.
  - Unchanged: errored path, stale-after-reset path, one-shot proof.
- `dev/gameplay/devTerminal.js`: `faultPanel()` (role=alert) shows that the token was measured and consumed, that verification failed, the refusal reason, and that RESTART starts a fresh token. The RESTART button now also shows when `machine.commitFault?.restartOffered`.
- `dev/gameplay/harness.html`: `.dt-fault` style.
- `dev/gameplay/tests/state.test.mjs`:
  - Replaced the old latch test with "spends the token, says why, offers RESTART, and the next session commits". It uses literal status names so a rename is caught, and checks 1 engine call per session.
  - Added "no fault on a clean or errored commit".
- `dev/gameplay/playthrough.mjs`:
  - Independent per-epoch counter wrapped around `quantum.commitStoryToken`.
  - Fault-panel text assertions; RESTART must be enabled.
  - Session 2 now begins with RESTART from the fault and is screenshotted at ENDING.
  - Exact call-count map asserted.
- `vault/Reports/quest-state-machine-contract.md`: addendum.
- `evidence/gameplay-commit-fault-exit/`: README, red/green, playthrough, sabotage.

## Evidence
`evidence/gameplay-commit-fault-exit/README.md` indexes all of it. The sabotage table (`sabotage/summary.txt`, script `sabotage/run.sh`):

| mutation | unit | playthrough |
|---|---|---|
| 0 control, unmutated | green | green |
| 1a machine `restartOffered: false` | RED | RED ("stranded the player: no RESTART offered") |
| 1b terminal drops the fault RESTART button | green (null) | RED |
| 2a machine lets commit re-arm after `measured_refused` | RED | RED ("a second commit request reached the engine") |
| 2b terminal re-enables the COMMIT button | green (null) | RED ("a latched commit is still offered") |
| 3 no-op mutation | refused, not graded | refused, not graded |

## Nulls / not verified
- Unit tests cannot see devTerminal sabotages 1b and 2b (no DOM); only the playthrough catches them. This is expected, but it means the dev terminal's RESTART is guarded only by the browser run.
- My first sabotage pass gave false unit reds: the scratch copy lacked `ECHO_MASTER_VISION.md`, which `spec.mjs` reads. I fixed that and added the unmutated control. Only the corrected run is in `summary.txt`.
- The red-first playthrough on c49a922 stops at the latch-name assertion, before the RESTART assertion. The RESTART check's own red comes from sabotages 1a and 1b.
- `awaiting_ruling` still appears in `evidence/gameplay-contracts-migration/{playthrough.txt,review-port/out-a4_token.txt}` (previous worker's evidence) and in my `red-before*.txt`, which record the old tip's output. I did not rewrite historical evidence.
- Fake quantum only (`documented_preview`). Nothing here was run on the real engine, Qollab or IonQ. The real story-ui terminal does not render `commitFault` yet.

## Decisions inferred from the docs
- RESTART after a measured refusal is `resetGame()` (§9.5), not a new table edge: the supervisor's ruling, plus contracts.js being platform-owned.
- `commitFault.restartOffered` is a machine-level field, so any UI (dev stub or story-ui) offers RESTART from the same source. It also lets a unit test catch a machine that stops offering it.
- Error copy says "measured and consumed" and "verification failed" and quotes the engine's refusal reason. Nothing is shown as success (§12.3, §7.4 l.507).

## Requests for other lanes
- **story-ui** (teleport terminal): when `machine.commitFault` is non-null, show the scientific-module error (token measured and consumed, verification failed, `commitFault.reason`), keep COMMIT disabled, and offer RESTART, which calls `machine.resetGame()`. Reference stub: `dev/gameplay/devTerminal.js` `faultPanel()`.
- **platform:** no contract change requested.

## What the supervisor should do next
1. Re-run `node --test 'dev/gameplay/tests/*.test.mjs'` in a scratch worktree at `323bb8d` (expect 56 pass), and look at the two PNGs in `renders/gameplay-commit-fault-exit/`.
2. Merge `lane/gameplay/gameplay-commit-fault-exit` into lane integration.
3. Relay the story-ui request above so the real terminal renders `commitFault` and RESTART.
