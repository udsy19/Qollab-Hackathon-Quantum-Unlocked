## TL;DR
- **As built, the quest stalls at CLONE_INTRO on real engine output.** Only 5 of the 44 rows the docs say must advance do advance, and all 5 are Mission 2. Running gameplay on main's v2 contracts changes no row.
- **Every real commit leaves the latch at `measured_refused_awaiting_ruling` (8/8).** The token is spent and the ending can never be reached. v2 has no commit contract at all.
- **The engine's physics is right.** Its fidelity matches an independent numpy simulation on 184/184 teleport rows (|ΔF| ≤ 1e-9). All 226 results pass v2's shape check. But 0/208 pass the two-phase validators, because the engine takes a state NAME and v2 needs `{theta, phi}`. With the angles echoed, 160/160 pass and 24/24 correct non-00 choices unlock the commit.
- **Fixing names alone takes the quest to CREDITS** (names-only shim, a diagnostic). That leaves 3 stuck Mission 1 rows and 9 wrong advances, all fixed by gameplay calling v2's `dryRunVerdict` and judging cloning on the result rather than the state name.
- **The fidelity guard holds on real results:** 452/452 checks. It goes RED when the threshold is set to 0.9 or the fidelity check is removed. **Nulls:** v2's threshold alone and v2's cross-check alone are each redundant, and gameplay's rule check is load-bearing only on non-generic states.
- Evidence: `evidence/gameplay/real-engine-seam/` (re-run in about 10 s per its README) · table `out/table.md` · matrix `renders/gameplay-real-engine-seam/seam-matrix.png` · vault `vault/Reports/gameplay-real-engine-seam.md`.
- **Recommendation:** the swap is a known change in three lanes; see Requests. Gameplay's is the smallest: v2 names + `dryRunVerdict` + judging cloning on the result.

## Vault check
- **Read:**
  - `vault/AGENTS.md`, `vault/Index.md` (no prior seam measurement listed);
  - `vault/Reports/quest-state-machine-contract.md`, `vault/Reports/quest-core-adversarial-review.md`;
  - `echo/CONTRACTS.md` + `echo/contracts.js` on main @ 99dfc54;
  - `lanes/gameplay/rulings.md`, `lanes/gameplay/context.md`;
  - red-team `evidence/red-team/physics-code-audit/out/cross_lane_check.txt` (lane/red-team/integration);
  - quantum's `evidence/quantum/contract-conformance/dump_results.py` + `echo/tests/conftest.py::bridge_calls`;
  - vision §7, §9.2–9.5, §10.3–10.6.
- **Already known:** red-team found 12/13 cross-lane failures against quantum @ a9edce2, an older engine whose fields were `kind`/`details`. The quest-core review found that the fake matches Qiskit, and that gameplay's tests pass only on the fake.
- **Reused:**
  - quantum's own entrypoints (no hand-built results);
  - v2's `validateExperimentResult`, `validateTeleport*`, `dryRunVerdict`, fixtures and `check.mjs`;
  - gameplay's `createQuestMachine`/`eventForResult`, copied unmodified beside each contracts file.
- **Stale:**
  - red-team's cross_lane_check was measured on quantum @ a9edce2. The engine has since moved, and the stall at CLONE_INTRO now has a different cause: no top-level `fidelity` on cloning, where before it was `kind`/`details`.
  - `vault/Reports/quest-state-machine-contract.md` still describes gameplay's own table (`BOOTED`), which has since moved to contracts. I have not marked it, because it is not my note's subject. Flagged here for the supervisor.
  - I did not open a pyodide-bridge vault report. `vault/Reports/` on this branch has none; it lives on quantum's branch, and I read `bridge.js` directly.

## What I found

### The table (law 14)
- **Full table:** `evidence/gameplay/real-engine-seam/out/table.md`, 236 lines. Each line is one experiment × branch × quest state, with these columns:
  - the expected event, from the docs (`expected.mjs`, which reads only the row's inputs);
  - v2 validity;
  - for each of the three configurations: the event produced, the quest state reached, refused or not, and a verdict;
  - the engine's fidelity and the oracle's fidelity.
- **Per-step summary** (`out/matrix.png`, counted from `table.jsonl`):

| step | docs expect | as built (v1) | on v2 | on v2 + names-only shim |
|---|---|---|---|---|
| M1 CLONE_INTRO, basis (zero, one) | BASIS_DEMO_OK | **0/2** | **0/2** | 2/2 |
| M1 CLONE_BASIS_PASSED, non-basis (plus, minus, phase, bloch_a, bloch_b) | SUPERPOSITION_DEMO_FAILED | **0/5** | **0/5** | **2/5** (minus, bloch_a, bloch_b stuck: name list) |
| M1 wrong-state presses (basis in BASIS_PASSED, non-basis in INTRO) | none | 7/7 | 7/7 | 7/7 |
| M2 RELAY_INTRO, I/X/Z | PREPARE_BELL_PAIR | 3/3 | 3/3 | 3/3 |
| M2 RELAY_BELL_CREATED, X/Z | ATTEMPT_NO_SIGNALLING | 2/2 | 2/2 | 2/2 |
| M2 RELAY_BELL_CREATED, I | unsettled by docs | refused | refused | refused |
| M3 phase-1 bits result | none (bits first) | 32/32 | 32/32 | 32/32 |
| M3 right choice, generic, non-00 | CORRECT_CALIBRATION | **0/24** | **0/24** | 24/24 |
| M3 right choice, bits 00 | none (consult-3 ruling) | 11/11 | 11/11 | 11/11 |
| M3 wrong choice, generic (F 0.0007–0.838) | none | 96/96 | 96/96 | 96/96 |
| M3 wrong choice, named, incl. 12 with F = 1 | none | 36/36 | 36/36 | 36/36 |
| M3 right choice, named non-generic, non-00 | none (13q #7: generic only) | 9/9 | 9/9 | **0/9** (wrong advance) |
| M3 COMMIT, live_commit, 2 tokens × 4 live branches | COMMIT_TRANSFER, then a second commit refused | **0/8**, latch measured_refused | **0/8** | 8/8, second refused 8/8 |

**Playthrough on real results, BOOT → CREDITS** (`out/playthroughs.json`):
- as built: stops at **CLONE_INTRO**;
- on v2: stops at **CLONE_INTRO**;
- on v2 + shim: reaches **CREDITS**, commit `committed`.

The as-built "must refuse" rows score 191/191 only because gameplay refuses every Mission 1 and Mission 3 result for its field names. Those rows are correct by accident.

### Engine results under v2 (step 1)

| group | v2 `validateExperimentResult` | v2 two-phase validators | with theta/phi echoed |
|---|---|---|---|
| cloning (7) | 7/7 | n/a | n/a |
| bell (3) | 3/3 | n/a | n/a |
| phase-1 bits (32) | 32/32 | **0/32** (`parameters.theta/phi` missing) | 32/32 |
| phase-2 corrections, generic (128) | 128/128 | **0/128** (same reason) | 128/128, 24 unlock commit |
| phase-2 corrections, named (48) | 48/48 | **0/48** (no v2 request is possible: not generic) | not derivable |
| commit (8) | 8/8 | **no validator exists** | — |
| backend verification (3, quantum's fake backend) | **0/3** (`bell_verification` ≠ `backend_verification`) | — | — |

`node tools/contract-check/check.mjs` on main: GREEN, 1087/1087, exit 0. That is v2 checking itself, not the engine.

### v2's own fixtures through gameplay (`out/fixtures.md`, `node fixtures.mjs` exit 1)
- **`good[0]` cloning plus** (v2 cloning shape: purity in observables, no fidelity) is **refused** in CLONE_BASIS_PASSED. Gameplay can never accept a v2-shaped cloning result.
- **`good[2]`** uses the v1 names (`stateId`, `correctionX/Z`, no theta/phi, state `plus`). Gameplay **advances CORRECT_CALIBRATION** on a non-generic state.
- **`teleport-fixtures.json` correction[1]** is v2's correct worked example (m0=1, m1=0, Z on, F=1). Gameplay **refuses** it.
- **`documented_preview` cloning:** the docs do not settle whether a preview may advance Mission 1 (UNSETTLED).
- **Bad fixtures:** 37/37 refused.

### Fidelity guard (step 3, `node guard.mjs` exit 0; `out/guard-round.txt`)
- **Real wrong-correction results are refused** by gameplay (through the shim) and by v2's `dryRunVerdict`. There are 96 such rows on generic states (F 0.0007–0.838), and 12 more wrong choices on named states score F = 1.
- **Real correct non-00 results perturbed** to F = 0.9999, 0.99999, 0.5 and 0.0 are refused in 24 × 4 cases. Real commits perturbed to 0.9999 do not commit (8/8).
- **Positive control:** the unperturbed real results advance (24/24) and unlock (24/24), so the refusals are not vacuous.

| sabotage (disposable copy) | verdict | checks that went red |
|---|---|---|
| baseline | GREEN | — |
| gameplay FIDELITY_OK 0.999999→0.9 | **RED** | G2 perturbed, G3 commit perturbed |
| gameplay fidelity check removed | **RED** | G2, G3 |
| gameplay rule check removed | **RED** | G1b only (named states, F = 1) |
| v2 FIDELITY_PASS →0.9 | **GREEN (null)** | — the 1e-6 cross-check refuses 0.9999 first |
| v2 cross-check tolerance →1 | **GREEN (null)** | — the threshold refuses it |
| v2 both | **RED** | G2 v2 |

**Nulls, reported:**
- In v2, the threshold and the cross-check each mask the other's removal. That is fine as defence in depth, but neither is individually tested by this guard.
- On generic states, gameplay's rule check is redundant with the fidelity check: the worst wrong choice scores 0.838.
- The earlier gameplay-test null (FIDELITY_OK 0.9 left the gameplay tests green) is now covered: this guard goes red.

**Harness refusal controls:** missing results → exit 2, empty results → exit 2, unknown sabotage → exit 2.

### Mismatches (step 4): gameplay vs v2 vs engine

| # | where | gameplay reads | v2 says | engine emits | owner of fix |
|---|---|---|---|---|---|
| S1 | cloning verdict | top-level `fidelity` | cloning puts purity in `observables {purityQ0, purityQ1}`, verdict in facts; no fidelity | `observables.jointFidelityWithTwoCopies`, `purityQ0/1`; no top-level fidelity | **gameplay** (judge on observables); **platform** to name the deciding observable |
| S2 | cloning superposition set | state NAME ∈ {plus, phase} | — | also minus, bloch_a, bloch_b | **gameplay** (judge the result, e.g. purityQ0 < 1, not the name) |
| S3 | phase-2 field names | `parameters.correctionX/Z`, `stateId` | `applyX/applyZ`, `theta/phi` | `applyX/applyZ`, `state` | **gameplay** (use v2 names) |
| S4 | phase-2 judging | own `expectedCorrections` + FIDELITY_OK; no cross-check, no generic check | `dryRunVerdict(request, result)` → `unlocksCommit` | — | **gameplay**: fire CORRECT_CALIBRATION iff `unlocksCommit`, and delete the duplicate `expectedCorrections` (no-bloat). This fixes the 9 wrong advances. |
| S5 | two-phase flow | one result per dry run; no phase-1 handling, no `makeCorrectionRequest` | phase 1 `{theta, phi}` → bits; phase 2 via `makeCorrectionRequest` | phase 1 `bell_measurement(name, seed)`, phase 2 `teleport_branch(name, m0, m1, x, z)` | **gameplay** (hold phase-1 request + result) |
| S6 | dry-run state input | — | `{theta, phi}` from `randomGenericState()`; result echoes theta/phi | named states only; params `{state, seed}` | **quantum**: accept theta/phi, echo them. Measured: this alone makes 160/160 v2-valid. |
| S7 | bridge.js signatures | — | request objects | `calibrationMeasurement(stateId)`, `teleportDryRun(stateId, X, Z, bits)`, `commitTransfer(stateId)` | **quantum** |
| S8 | commit result | `parameters.stateId === 'story_token'`, `correctionX/Z` | **no commit contract** (no validator, token id or field list) | `live_commit(name, seed)` → `{state, seed}`, no applied corrections in parameters | **platform** (define + validate the commit result); **quantum** (emit it); **gameplay** (read it via the validator). Highest severity: it spends the token and blocks the ending. |
| S9 | story token | `STORY_TOKEN_ID = 'story_token'` | — | no token state; the caller passes any named state, so the token is not hidden from JS | **quantum** (fixed hidden token, per the owner ruling) |
| S10 | backend verification | — | `backend_verification` | `bell_verification` | **quantum** |
| S11 | v2 fixture `good[2]` | — | uses v1 names (`stateId`, `correctionX/Z`), non-generic `plus`, no theta/phi | — | **platform** (fixture contradicts v2's own phase-2 contract) |
| S12 | contracts copy | gameplay integration carries v1 `contracts.js` (no ENDING RESTART, etc.) | v2 on main | — | **gameplay** (take main's). Measured harmless for these rows: on-v2 = as-built, row for row. |

## What I changed (commits, this branch `lane/gameplay/gameplay-real-engine-seam`)
- `e3692e7`: harness (`gen_results.py`, `expected.mjs`, `seam.mjs`) and first outputs.
- `762c615`: `lib.mjs` refactor (output byte-identical, checked by diffing summary.json), `fixtures.mjs`, `guard.mjs` with `--round`, `render_matrix.py`, README, outputs, and `vault/Reports/gameplay-real-engine-seam.md`.

No `echo/` file was edited on any branch. All sabotage ran on temp copies.

## Evidence paths
- `evidence/gameplay/real-engine-seam/out/`:
  - `results.jsonl` (226 real results);
  - `table.md` / `table.jsonl` / `summary.json` / `playthroughs.json` (`seam.mjs`, exit 1);
  - `fixtures.md` (`fixtures.mjs`, exit 1);
  - `guard-baseline.txt` (`guard.mjs`, exit 0);
  - `guard-round.txt`;
  - `backend_verification.json`;
  - `matrix.png`.
- `/Users/udsy/agent-org/lanes/gameplay/renders/gameplay-real-engine-seam/seam-matrix.png`

## What I did NOT do or could not verify
- **Not run in Pyodide or a browser.** All engine calls ran in the venv's CPython Qiskit 2.5.2. Pyodide's proxy conversion is not exercised. Not run on Qollab.
- **No playthrough through the real UI.** This measures the quest core only (`state.js`/`missionRules.js`). Story-ui terminals and `resultPanelShown` timing are driven by the harness.
- **Random generic states were injected into the engine's `STATES` table** (the engine has no theta/phi input). The engine's code computed every number, but the registration is a harness intervention.
- **The shim is a diagnostic, not a fix.** For the commit, it supplies `correctionX/Z` from the engine's measured bits and the rule its `circuitDescription` states. The engine does not emit them.
- **Not resolved:**
  - Mission 2 sender `I` in RELAY_BELL_CREATED (gameplay refuses; docs unsettled);
  - whether a `documented_preview` may advance Mission 1.
- **Hubs not regenerated in a commit.** I ran `node scripts/vault-hubs.mjs --check`: 2 hubs STALE (Reports/README.md, Map.md). Following the worker rule, I did not commit generated hubs; the loop regenerates them on merge.
- `vault/Reports/quest-state-machine-contract.md` is likely stale (it describes gameplay's own table). I did not mark it.

## Decisions inferred from the docs
- **Any non-basis state in CLONE_BASIS_PASSED should count as the failed copy.** From vision §7.2: "Test several non-basis preparations, not only one", and "for arbitrary unknown |ψ> … not |ψ>⊗|ψ> in general".
- **A correct dry run on a non-generic named state must not unlock the commit.** From owner ruling 13 questions #7 (random generic dry-run states) and v2's `checkState`.
- **A phase-1 bits result must not advance the quest.** From owner ruling red-team #2 (bits first, corrections second).
- **Bits 00 never unlock.** From the overseer ruling, gameplay consult 3 #2.
- **A second commit must be refused after a recorded result.** From §7.4 and the consult-3 ruling.
- **Sender I and a documented_preview in Mission 1 are left UNSETTLED** and not graded. §7.3 and §8.4 do not settle them.

## Requests

**gameplay**
1. Take main's `echo/contracts.js` (S12).
2. Rewrite the TELEPORT_DRY_RUN rule to hold the phase-1 request and result, build phase 2 with `makeCorrectionRequest`, and fire CORRECT_CALIBRATION iff `dryRunVerdict(...).unlocksCommit`. Delete the local `expectedCorrections`/FIDELITY_OK duplicate, or keep FIDELITY_OK only if the commit still needs it (S3–S5).
3. Judge cloning on the result's observables, not the state name (S1, S2).
4. Read the commit through platform's commit validator once it exists (S8).
5. Re-run `node evidence/gameplay/real-engine-seam/seam.mjs`: the target is as-built 44/44 must-advance and 191/191 must-refuse, with the playthrough reaching CREDITS.

**quantum**
1. Make `bell_measurement`/`teleport_branch` accept `{theta, phi}` and echo them in parameters (S6), and update the `bridge.js` signatures to v2's request objects (S7).
2. Add a fixed, hidden story-token state that the caller cannot choose, and have `live_commit` emit the corrections it applied (S8, S9).
3. Rename `bell_verification` → `backend_verification` (S10).

**platform**
1. Define a commit-result contract and validator (token id, applied corrections, measurementBits, fidelity ≥ FIDELITY_PASS, `exact_qiskit_local`) (S8).
2. Name the cloning observable that decides Mission 1 (S1).
3. Fix fixture `good[2]` to v2's names and a generic `{theta, phi}`; as it stands it teaches the v1 names (S11).
4. Consider a test that sabotages FIDELITY_PASS and the cross-check separately: each is masked by the other (guard nulls).

## What the supervisor should do next
1. Re-run one script to check: `cd evidence/gameplay/real-engine-seam && node guard.mjs --round` (about 5 s; the worktrees per the README). Or `node seam.mjs`, then compare `out/summary.json`.
2. Dispatch a gameplay worker on Requests/gameplay 1–4. Its acceptance check is `seam.mjs`: 44/44 must-advance, 0 FAIL, playthrough reaches CREDITS on real results, with a names-only shim no longer needed. Use the engine fix from quantum S6, or this harness's theta/phi registration until that lands.
3. Relay S8 (no commit contract; every real commit strands the token) to platform and quantum as the highest-severity item: it blocks the ending.
4. Relay S6/S7/S9/S10 to quantum and S1/S11 to platform.
