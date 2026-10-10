=== PLAN ===
**Lane:** red-team. We write reports only and make no product edits. Plan row 7.

**Goal:** Run three independent checks on ECHO: ONE OF ONE and report each, with evidence, to the lane that owns the fix.
1. **Physics audit.** Check Prompt 6 and vision §7 against the real code and tests: every claim, the four (m0,m1) pairs, endianness, the one-`backend.run` limit, and misleading labels.
2. **Blind playtests.** Newcomers play the newest integrated build in a local runner. We record where they get stuck and whether they can answer the teach-back questions.
3. **Rubric score.** Score each of the four traits with evidence. Weights are unknown, so there is no weighted total.

**Approach:** Ground truth comes from the independent oracle, never from the lane's own code (law 4). The spec is treated as a hypothesis (law 5). All sabotage happens on disposable `git archive` exports (law 10). Results are labelled "local runner"; nothing is claimed for Qollab unless `owner-answers.md` records it.

**Done:**
- `physics-oracle-audit` (0001): MERGED in consult 2. 523 passed, sabotage exit 0.
- `rubric-research` (0001): MERGED in consult 3. The rubric is four trait names with no weights, and the novelty bar can zero two traits.
- `physics-code-audit` (0002): **MERGED this consult.** I re-verified it on a `git archive` export: the oracle gives 523 passed, and the sabotage table and the cross-lane output are present and match the report. Findings on quantum a9edce2:
  - The physics is correct: it agrees with the oracle on 12 states × 4 branches × 4 corrections.
  - BLOCKER: every quantum result was INVALID under `contracts.js`, so the quest stalls at CLONE_INTRO.
  - C3 FAIL: the merged tree has 2 `backend.run` sites.
  - C4 FAIL: `live_commit` re-measures the token on every call.
  - Gameplay's tests stay green with the fidelity check removed.
  - Three nulls are left. Both suites stay green on them, and each mutation gives physically identical output.

**Running:**
- `quest-state-audit`: the gameplay state machine against vision §9 and the rulings.
- `player-text-audit` (queued): its timing is good, because story-ui merged `story-data` at 476801f, so real strings now exist.

**New this consult:**
- `cross-lane-recheck`: quantum has since landed `contract-conformance` (e751f3b/951ec9f, "conform every bridge result to platform's ExperimentResult contract"). Gameplay is at 31a60f2 and platform at 939a57d. This worker re-runs the 0002 harness (driver, cross_lane_check, product sabotage, backend_run_audit, C4 probe) on the newest tips. It records which 0002 findings are now closed, with exit codes, and which are still open.

**Playtest gate:** there is still no playable game. Platform's `echo/main.js` (939a57d) is the G0 smoke: a Three.js scene, `quantum.smoke` and one `backend.run`. Main 08f911b records G0 on Qollab: the scene and the bridge pass, but the backend-verify button does not respond (platform owns that). Dispatch 1–2 `blind-playtest` workers, each on its own port, when a build that combines the quest with the scene appears. If only a partial slice exists by Sat ~12:00 ET, playtest it anyway, labelled PARTIAL.

**Next:**
- `rubric-score` after the first playtest, scored per trait.
- Re-run the physics audit when `echo/quantum` changes materially.
- Re-run the playtests after G3 and before the Sun 14:00 freeze.
- Route the page-copy gaps (run steps, verbatim attribution, MIT, the novelty claim, the browser list) to platform.

**Risks:**
- The graybox is late; G2 is Sat 17:00, otherwise the one-room cut.
- Impact needs measured teach-back outcomes.
- A worker could calibrate on the lane's own code.
- Re-audits could churn while lanes move fast, so each one is pinned to named SHAs.
=== END PLAN ===

=== MERGE branch=lane/red-team/physics-code-audit ===

=== AGENT name=cross-lane-recheck model=opus base=lane/red-team/integration ===
## Goal
Find out whether the integration blocker from report 0002 is really closed. 0002 found the quest stalls at CLONE_INTRO because every real quantum result was INVALID under `echo/contracts.js` and gameplay read field names the engine never emits. Give the owning lanes a per-finding table (CLOSED / STILL OPEN / NEW) on the newest tips, with commands, exit codes and artifacts, so they know exactly what still blocks a newcomer from playing past Mission 1.

## Vision
A blind newcomer finishes title → three missions → ending on Qollab. Every puzzle runs on real local Qiskit with truthful physics: m0 = source readout, m1 = local Bell half, X iff m1=1, Z iff m0=1. The story token is consumed once. At most one `backend.run` per run (vision §7, §9, §17; `.claude/rules/qollab-runtime.md`).

## What we are building
`echo/` is a Qollab-native JS/Three.js game with a Python/Qiskit bridge. The pieces:
- quantum lane: `echo/quantum`, `echo/tests`
- gameplay lane: `echo/game` (quest rules)
- platform lane: `echo/contracts.js`, `echo/main.js`
- story-ui lane: `echo/ui`, `echo/data`

Red-team edits no product files. You write evidence and reports only.

## What has not worked
- Gameplay's 36 tests were green only because they ran on `fakeQuantum.js`. Their green said nothing about integration.
- Each lane's own suite missed defects that only cross-lane checks caught.
- Three lanes assumed three different ExperimentResult shapes.
- Quantum has now merged `contract-conformance` (e1a9d5c, merge e751f3b, tip **951ec9f**), which claims to conform. That is the producer's claim. Verify it independently (gate-independence law 1).

## Pinned SHAs (audit these, record them in every output)
- quantum `lane/quantum/integration` **951ec9f**
- gameplay `lane/gameplay/integration` **31a60f2**
- platform `lane/platform/integration` **939a57d**

If a tip has moved when you start, audit the newer tip and record both SHAs.

## Vault notes to read first
- `vault/Reports/physics-code-audit.md` (0002): findings 1–9, C3, C4 and the nulls
- `vault/Reports/physics-oracle-audit.md`: checklist C0–C9, traps T1/T2
- `lanes/red-team/rulings.md`, especially:
  - the 13 design answers
  - the COMMIT ruling: one atomic call, token consumed only on success, latched
- `vault/Design/gate-independence-cases.md`: laws 3, 4, 10, 15
- The quantum lane's new `contract-conformance` report in the vault on its branch, read through the export

## Where to start
1. Export each pinned tree with `git archive <sha> | tar -x -C $(mktemp -d)`. Do NOT `git worktree add` or check out other lanes' branches. Build one merged disposable `echo/` from the three exports (platform contracts + quantum + gameplay).
2. Run C0 first: `python -m pytest -q evidence/red-team/physics-oracle -p no:cacheprovider && python evidence/red-team/physics-oracle/sabotage.py`.
3. Re-run the 0002 harness in `evidence/red-team/physics-code-audit/` against the merged tree:
   - `test_product_vs_oracle.py`
   - `dump_results.py` → `cross_lane_check.mjs` on its REAL output (not fixtures)
   - `sabotage_product.py`
   - `sabotage_gameplay.sh`
   - `backend_run_audit.py`, which must report exactly one `backend.run` site
   - `c4_token_probe.py`
   
   Adapt a harness only where an API legitimately changed. Note every adaptation, and show it still goes red on a known-bad mutation.
4. Check specifically:
   - (a) every quantum result validates under the current `contracts.js`
   - (b) gameplay's `missionRules.js` advances through every quest state on real results, with no STUCK
   - (c) the `bridge.js` / `verifySelectedBackendOnce` single guard exists, or does not
   - (d) a story-token state that is consumed once, plus random generic dry-run states
   - (e) gameplay still green when fidelity is lowered or removed
   - (f) the three both-suite nulls, still physically identical?

## Deliver
- On branch `lane/red-team/cross-lane-recheck`: `evidence/red-team/cross-lane-recheck/` with a README, the `out/` artifacts and the SHAs.
- `vault/Reports/cross-lane-recheck.md`. Do not regenerate hubs, Map or Index; the loop does that.
- Report `lanes/red-team/reports/0003-cross-lane-recheck.md`:
  - It opens with a **Vault check**, then a TL;DR.
  - A table: 0002 finding → CLOSED / STILL OPEN / NEW, with the command, exit code and artifact for each row.
  - **Findings for owning lanes**, each with its file:line.
  - The nulls.
  - What you did not verify.
  - Questions, only for spend, access or doc conflicts.
- Write a checkpoint report within 1 h.

## How I will judge it
- I re-run the main commands myself on a `git archive` export. If the numbers in the report don't match the artifacts, I refuse the merge.
- Every CLOSED needs positive evidence from an independent path, never the quantum lane's own tests or its conformance report.
- Every harness change must show it still fails on a known defect.
- Label nothing as "Qollab"; this is local CPython only.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 4: I MERGED physics-code-audit (0002) after checking it on a `git archive` export: the oracle gives 523 passed and the sabotage and cross-lane tables match the report. Main lesson: each lane's suite was green while the whole was broken. Gameplay's tests ran on `fakeQuantum.js`, and every real quantum result was INVALID under `contracts.js`. When a lane claims a fix (e.g. quantum "contract-conformance" e751f3b), re-check it with the cross-lane harness on the real `dump_results.py` output at pinned SHAs. The lane's own conformance report is not evidence.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 4: Platform's `echo/main.js` + `index.html` (939a57d) is only the G0 smoke: a Three.js scene, `quantum.smoke` and one `backend.run`. It is NOT a playable game, so "main.js exists" isn't the trigger for playtests. The trigger is a build where the quest state machine is wired to the scene and to terminals. Main 08f911b records G0 on Qollab: the scene and the bridge pass, but the backend-verify button does not respond. That one is platform's.
=== END LEARN ===
