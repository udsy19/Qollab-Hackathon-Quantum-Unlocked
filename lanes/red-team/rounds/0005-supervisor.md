=== PLAN ===
**Lane:** red-team. We write reports only and make no product edits. Plan row 7.

**Goal:** Run three independent checks on ECHO: ONE OF ONE and report each, with evidence, to the lane that owns the fix.
1. **Physics audit.** Check Prompt 6 and vision §7 against the real code and tests: every claim, the four (m0,m1) pairs, endianness, the one-`backend.run` limit, and misleading labels.
2. **Blind playtests.** Newcomers play the newest integrated build in the local runner. We record where they get stuck and whether they can answer the teach-back questions.
3. **Rubric score.** Score each of the four traits with evidence. The weights are unknown, so there is no weighted total.

**Approach:** Ground truth comes from the independent oracle, never from a lane's own code (law 4). The spec is a hypothesis (law 5). All sabotage runs on disposable `git archive` exports (law 10). Every audit is pinned to named SHAs. Results are labelled "local runner"; nothing is claimed for Qollab unless `owner-answers.md` records it.

**Done:**
- `physics-oracle-audit` (0001): MERGED in consult 2. 523 passed, sabotage exit 0.
- `rubric-research` (0001): MERGED in consult 3. The rubric is four trait names with no weights, and the novelty bar can zero two traits.
- `physics-code-audit` (0002): MERGED in consult 4.
  - The physics is correct.
  - BLOCKER: the contract shape is broken across lanes (12/13 checks fail).
  - C3: there are 2 `backend.run` sites.
  - C4: the token is re-measured on every call.
  - Gameplay's fidelity check is a null.

**Branch state at consult 5 (git, 04:05 UTC):**
- main 6cc19a6 carries contracts v2 (80d685f) plus `tools/contract-check` and `tools/qollab-caps`.
- quantum d9b42d0 (pyodide-bridge merged).
- gameplay c49a922 (gameplay-contracts-migration merged).
- platform 43be7d9.
- story-ui 842da9f (story-data).
- art: empty.
- `echo/` on main is still only `contracts.js` and `CONTRACTS.md`. There is no playable game on any branch yet.

**Running:**
- `quest-state-audit` (checkpoint 1 is in). It is a PARTIAL: it has the expected table and the suspected gaps, and the harness is next. I'll judge it on the final report.
- `cross-lane-recheck` (dispatched now). It re-runs the 0002 harness and contract v2's own `tools/contract-check` at the pinned tips above. It says which of the 0002 findings are closed or open, and it runs a sabotage round on the v2 checker itself (law 6: the board is a system under test).

**Queued (red-team cap is 2):**
- `player-text-audit` against story-ui 842da9f: the m1 label, EXACT receiver panel, no FTL/cloning/"certified random"/matter-teleport wording, the attribution line, and credits. Dispatch when a slot frees up.

**Playtest gate:** I dispatch 1–2 `blind-playtest` workers, each on its own port, when a branch has `echo/main.js` with the quest state machine wired to a scene and terminals. If only a partial slice exists by Sat ~12:00 ET, I playtest it anyway and label it PARTIAL.

**Next:**
- `rubric-score` after the first playtest, scored per trait.
- Re-run the physics audit when `echo/quantum` changes materially.
- Re-run the playtests after G3 and before the Sun 14:00 freeze.
- Route the page-copy gaps to platform: run steps, the verbatim attribution line, MIT, the novelty claim and the browser list.
- Merge main into lane/red-team/integration so contracts v2 and the tools are on our base. Until then, workers merge main into their own branch first.

**Risks:**
- The graybox is late; G2 is Sat 17:00, otherwise the one-room cut.
- Impact needs measured teach-back outcomes.
- A lane could self-certify conformance with a v2 checker that has its own nulls.
- Re-audits could churn while lanes move fast; pinned SHAs handle that.
=== END PLAN ===

=== AGENT name=cross-lane-recheck model=opus base=lane/red-team/integration ===
## GOAL
Tell every lane, with exit codes, whether a real quantum result now flows through platform's contract into gameplay's quest without stalling. Say which of the 0002 physics-code-audit findings are CLOSED and which are still OPEN, at pinned SHAs. Nothing integrated lands on main until red-team's cross_lane_check passes (owner ruling 2026-10-10), so this report is the gate the whole org is waiting on.

## VISION
A judge presses Run on Qollab and plays ECHO end to end. Every puzzle is fed by real local Qiskit (vision §7, §8.4). One result shape, one guarded `backend.run`, and a story token consumed once.

## WHAT WE ARE BUILDING
`echo/`, the Qollab-native game. The quantum engine (`echo/quantum/`) emits ExperimentResults. Platform's `echo/contracts.js` v2 (landed on main 80d685f) validates them. Gameplay's `echo/game/missionRules.js` and `state.js` consume them.

## WHAT HAS NOT WORKED
- Each lane's suite was green while the whole was broken. Gameplay's tests ran on `fakeQuantum.js`, and every real result was INVALID under contracts.js. Gameplay's fidelity threshold could drop to 0.9 and its tests stayed green.
- A lane's own conformance report is not evidence. Platform has now shipped its own `tools/contract-check/` (fixtures plus a teleport oracle). Those fixtures were written by the contract's author, so treat them as producer metadata (law 4). Your harness must use REAL engine output from `dump_results.py`.
- Never check out another lane's branch or commit to it. Export it with `git archive <sha> echo | tar -x -C $(mktemp -d)`.

## PINNED SHAs (record them in every output file)
- main 6cc19a6 (contracts v2 at 80d685f)
- lane/quantum/integration d9b42d0
- lane/gameplay/integration c49a922
- lane/platform/integration 43be7d9

If a tip moves while you work, finish on these SHAs and note the newer tip.

## VAULT / READ FIRST
- `vault/Reports/physics-code-audit.md`, `vault/Reports/physics-oracle-audit.md` (checklist C0–C9)
- `lanes/red-team/reports/0002-physics-code-audit.md`
- `evidence/red-team/physics-code-audit/` (your harness: `test_product_vs_oracle.py`, `dump_results.py`, `cross_lane_check.mjs`, `sabotage_product.py`, `sabotage_gameplay.sh`, `c4_token_probe.py`)
- `evidence/red-team/physics-oracle/backend_run_audit.py`
- On main: `echo/CONTRACTS.md` v2 and `tools/contract-check/`
- Owner rulings in `lanes/red-team/rulings.md`, especially: two-phase dry run (bits first, corrections second); token fixed, hidden and consumed once; random generic dry-run states; `bridge.js`/`verifySelectedBackendOnce` as the ONE `backend.run` site; `experiment:"backend_verification"`; 256 shots; previews carry no counts.

## WHERE TO START
1. Merge `main` into your branch first, so contracts v2 and the tools are present. Don't touch product files.
2. Run the C0 baseline: `python -m pytest -q evidence/red-team/physics-oracle && python evidence/red-team/physics-oracle/sabotage.py`. It must still be 523 passed and exit 0.
3. Compose a merged `echo/` tree in a temp dir: main's contracts, plus quantum `echo/quantum`, plus gameplay `echo/game`, plus platform `main.js` and `index.html`. Write down which lane each file came from.

## DELIVER
1. **Oracle driver vs quantum d9b42d0.** Report the physics agreement (12 states × 4 branches × 4 corrections, ≤1e-6), with its exit code. Update the driver if the API moved to two-phase bits-then-corrections, and say exactly what changed.
2. **cross_lane_check against contracts v2.** Run it on the REAL `dump_results.py` output from d9b42d0. Give a per-check table and an exit code. Then drive gameplay's real `missionRules`/`state` with those real results through the whole quest (BOOT→…→TELEPORT_COMMITTED→ENDING/CREDITS). Say whether it stalls, and where.
3. **`backend_run_audit` on the merged tree.** It must find exactly 1 site, inside `echo/quantum/bridge.js`. Report every site with file:line.
4. **C4 token probe.** Is the token fixed and hidden, measured only on commit, and latched after one successful commit? Are dry-run states random and generic?
5. **Run platform's own `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs`** on the merged tree. Then run a **sabotage round on them**, on a disposable copy. Try at least these: wrong m0/m1 order in a result, a `documented_preview` carrying counts, a missing keyQubits, a fidelity of 0.9 labelled pass, and a second `backend.run`. Report which ones their checker MISSES (nulls).
6. **Re-run gameplay sabotage** (FIDELITY_OK→0.9, fidelity check removed). Did the null close?
7. **Closure table:** each 0002 finding (BLOCKER contract, C3, C4, gameplay null, the 3 physics-identical nulls) → CLOSED / OPEN / CHANGED, with the evidence path and the exit code.

## HOW I WILL JUDGE
- I re-run your scripts on a `git archive` export.
- Every claim needs a command, an exit code and a file under `evidence/red-team/cross-lane-recheck/out/`.
- Nulls must be reported.
- A check that did not run is reported as REFUSED (exit 2), never as a pass.
- No Qollab, IonQ or Pyodide claims. If you test the Pyodide bridge, label it "local runner".

## REPORT
- Write `lanes/red-team/reports/0003-cross-lane-recheck.md`. Open it with **Vault check**, then a TL;DR, then a **Findings for owning lanes** section split by lane: quantum, platform, gameplay.
- Write a checkpoint within 1 h, labelled PARTIAL.
- Durable copy: `vault/Reports/cross-lane-recheck.md`. Do NOT regenerate hubs, Map or Index.
- Commit to `lane/red-team/cross-lane-recheck`.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 5: Platform shipped its own `tools/contract-check/`, with fixtures and a teleport oracle written by the contract's author. Its pass verdict is producer metadata (law 4/6). It counts as a cross-lane gate only after red-team sabotages it on a disposable copy and drives it with real `dump_results.py` engine output. Every recheck brief must include that sabotage round.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 5: At 04:05 UTC `echo/` on main holds only `contracts.js` and `CONTRACTS.md`, and no branch has a scene wired to the quest. The playtest trigger is still unmet. The red-team cap is 2 (quest-state-audit plus cross-lane-recheck), so player-text-audit waits for the next free slot. Gating integration (cross-lane) outranks text review.
=== END LEARN ===
