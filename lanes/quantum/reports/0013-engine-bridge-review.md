# 0013 engine-bridge-review — FINAL (2026-10-10 ~01:05 ET)

## TL;DR
- **The physics is true:** my own numpy/kron derivation (no qiskit, no echo code) agrees with the engine on 715 numbers. That covers 8 random generic states × 4 branches × 4 corrections, plus withheld bits, the deferred check, cloning and the relay. It agrees on host Python and inside Pyodide (local runner); the worst |diff| is 4.98e-11 and there are 0 mismatches. The rule choices score F=1 on 32/32; the 96 wrong choices score at most 0.885. Cloning purity is exactly 0.5 for |+> and the phase state. The receiver marginal is 0.5/0.5 for I, X and Z. 0 numpy/PyProxy leaves reach JS.
- **BLOCKER B1: on real engine output the game cannot finish.**
  - `live_commit` emits `parameters {"state":"token"}`. main's contract (CONTRACTS.md § The one story commit: "Not `parameters.state`, not `'token'`") and `validateCommitResult` require `{stateId:"story_token", applyX, applyZ}`, so the commit is REJECTED.
  - Gameplay `world-v2-port` refuses COMMIT_TRANSFER, so the token is consumed and the commit ends as MEASURED_REFUSED.
  - Repro: `evidence/quantum/engine-bridge-review/seam.out`, 6/13 FAIL.
- **BLOCKER B2: Mission 1 cannot advance on real engine output.** Gameplay's CLONE_INTRO and CLONE_BASIS_PASSED rules need a top-level `fidelity`, and cloning results carry it only as `observables.jointFidelityWithTwoCopies`. All 4 cloning rows FAIL in the same `seam.out`.
- **SHOULD (S1–S5):**
  - S1: JS un-latches a commit that Python already consumed; demonstrated in Pyodide.
  - S2: `verify_deferred` and `corrections_withheld` are not exposed by bridge.js; no lane calls them.
  - S3: the FTL guard misses "faster-than-light" (sabotage null).
  - S4: no test pins the m0/m1 label text (sabotage null).
  - S5: "the only copy is at the receiver" is printed even after a WRONG correction.
- **Recommend:** quantum fixes B1 (commit params) and B2 (add cloning `fidelity`), and switches `commitTransfer` to `validateCommitResult`, in one row before G1 is proposed done. Screenshot: `renders/engine-bridge-review/01-pyodide-probe-commit-rejected-by-contract.png`.

## Vault check
- **Read:**
  - `vault/AGENTS.md`, `vault/Index.md` (promoted lessons);
  - `vault/Reports/{quantum-physics-review,quantum-engine-g1,quantum-hardening,bridge-rewire}.md`;
  - the laws in `.claude/rules/gate-independence.md` and the headings of `vault/Design/gate-independence-cases.md`;
  - `main:vault/Reports/contracts-v2.md`. The brief's `quantum-vs-contracts-v2.md` does not exist; contracts-v2 is the nearest note;
  - `main:echo/CONTRACTS.md` and `main:echo/contracts.js` (main @ 47a2466; identical to `lane/platform/integration` @ 45a45f2).
- **Already known, and reused:**
  - The residual-Pauli closed form F = r_P² from physics-review §1, used as my independent check.
  - The three physics nulls (ZX=−XZ etc.), so I did not re-sabotage them.
  - The hardening finding that the token is hidden from results but not from source.
  - The pyodide-bridge harness design: assemble/serve/drive with a build token (law 16). I wrote a smaller probe in the same pattern, because that harness grades its own fixed scenario.
- **Stale:**
  - `vault/Reports/bridge-rewire.md` and `quantum-hardening.md` predate main's `validateCommitResult` (ae39421). Their "0/233 rejected" numbers were measured against `validateExperimentResult` only, so they do not cover the commit contract that now exists.
  - The pyodide-bridge harness validates commits with `validateExperimentResult` only, so it is green on B1.
  - The brief names `quantum-vs-contracts-v2.md`, which does not exist.

## What I found (severity · file:line · reproduction)

### B1 — BLOCKER: the commit result does not meet the platform commit contract, so the game cannot reach the ending
- **Where:** `echo/quantum/teleportation.py:254-256` (`_commit_parameters` returns `{"state": TOKEN}`), used at `:281`.
- **What the contract requires:** main's CONTRACTS.md § "The one story commit" requires `parameters {stateId: STORY_TOKEN_ID, applyX, applyZ}` and says: "Not `parameters.state`, not `'token'`".
- **Reproduction:** `python evidence/quantum/engine-bridge-review/engine_dump.py echo > dump.json && node seam.mjs <dir> dump.json`, where `<dir>` holds `main:echo/contracts.js` and `lane/gameplay/gameplay-world-v2-port:echo/game/missionRules.js`.
- **Result:**
  - `validateCommitResult` rejects with: "stateId must be STORY_TOKEN_ID … applyX must be the boolean … applyZ …";
  - `eventForResult(TELEPORT_DRY_RUN_PASSED, commit)` returns null ("need the story-token transfer").
- **Also in Pyodide** (`pyodide/out/pyodide-engine.json`, `.bridge.commitVerdicts`): the bridge RESOLVES this commit, because `bridge.js:96-107` uses `validateExperimentResult`. The rejection then happens in gameplay, after the token is measured. Gameplay `state.js` (integration 7c4741b, lines 156-162) treats that as `MEASURED_REFUSED`: token consumed, "verification failed", RESTART offered.
- **Why the tests missed it:** the tests and the pyodide-bridge harness only check `validateExperimentResult` on the commit. This is the "fake/partial contract hid an integration break" failure again.

### B2 — BLOCKER (seam; fix owner to settle): Mission 1 never advances on real cloning output
- **Where:** `echo/quantum/cloning.py:51-67`. The result has no top-level `fidelity`.
- **What each side says:**
  - Gameplay `world-v2-port` `missionRules.js:46-49` requires `r.fidelity >= FIDELITY_PASS` for zero/one, and `typeof r.fidelity === 'number' && < FIDELITY_PASS` for plus/phase.
  - CONTRACTS.md's cloning row lists only `observables {purityQ0, purityQ1}`, so the contract does not settle which side must change.
- **Result:** in `seam.out`, cloning zero, one, plus and phase all return `null`.
- **Cheapest fix:** the engine sets `fidelity = jointFidelityWithTwoCopies`, which it already computes and which is the quantity gameplay's header names: "fidelity = |<psi psi|out>|^2".

### S1 — SHOULD: the bridge un-latches a commit that Python already consumed
- **Where:** `echo/quantum/bridge.js:96-107`, with `teleportation.py:294`.
- **The gap:** Python latches `_token_consumed` when it returns. If JS validation then rejects (as it will under B1 once the bridge uses `validateCommitResult`), `callEngine` throws and `commitTransfer` sets `commit = null`, which says "nothing measured, retry". Python then refuses the retry.
- **Pyodide reproduction:** `pyodide/out/pyodide-engine.json`, `.bridge.pythonRetryAfterCommit` = "TokenAlreadyConsumed: The story token was already measured…".
- **Result:** the player is told to retry, and the retry can never succeed until RESTART. The comment at `bridge.js:93-95` ("A call that failed measured nothing") is false for a post-Python rejection.
- **Fix:** distinguish a Python exception (retry allowed) from a contract rejection after a returned result (token consumed: surface §12.3's fault plus RESTART).

### S2 — SHOULD: two engine checks no game code can reach
- **Where:** `teleportation.py:304` (`corrections_withheld`) and `:328` (`verify_deferred`), the "two checks behind the Declassified panel".
- **The gap:** `bridge.js` exports neither. `git grep` over every non-quantum `lane/*` branch finds no caller.
- **Fix:** either expose them, so the no-signalling-without-bits lesson and the deferred verification reach a judge, or delete them (`.claude/rules/no-bloat.md`).
- **Labelling** (the brief asks whether the deferred check is labelled a verification, not a link):
  - Its `facts` are correct: "Mathematical verification … This is not a physical teleportation link".
  - Its `circuitDescription` (`:343`) carries no "verification" word, and it reports `experiment: "teleportation"`, the same value a dry run uses. A UI that shows only the description would present it as a teleport. Nit.

### S3 — SHOULD: the overclaim guard is literal, and a hyphen beats it (sabotage NULL)
- **Where:** `formats.py:21` `FORBIDDEN_PHRASES`, and the same literal list in `echo/tests/test_formats.py:61` and `test_qollab_job.py:187`.
- **Sabotage `ftl-hyphenated-fact`:** commit fact → "travelled faster-than-light over the entangled link". All 595 tests pass, and `experiment_result` raised nothing.
- **Also missed:** "FTL", "instant" without "-ly", and "teleports matter".
- **Fix:** normalise (lower-case, collapse `[-\s]+`) before matching, and add the missing variants. This repeats the "literal regexes" lesson.
- **Current shipped strings:** they contain no overclaim (`strings-scan.out`: 70 distinct strings, all read).

### S4 — SHOULD: the m0/m1 label text is not pinned by any test (sabotage NULL)
- **Where:** `teleportation.py:35-36`.
- **Sabotage `swap-bit-labels`:** swapping the two label strings leaves all 595 tests green. Every bits fact would then read "LOCAL BELL-HALF READOUT m1 = <m0's value>".
- **Fix:** platform already exports `BIT_LABELS` (`contracts.js:379`); a test should compare against it.
- **Current text:** correct in every `circuitDescription` and fact (`strings-scan.out`). The commit's description says "Bob applies X iff LOCAL BELL-HALF READOUT m1 = 1, Z iff SOURCE READOUT m0 = 1", which is right.

### S5 — SHOULD (wording): the "only copy is at the receiver" fact is printed after a wrong correction
- **Where:** `teleportation.py:166-171`, attached to every `teleport_branch`.
- **Example:** on a dry run with F = 0.052830 (wrong X/Z, Pyodide probe) the result still says "the only copy is at the receiver".
- **Why it misleads:** the receiver holds a Pauli-rotated state, not the state. In a no-cloning game, "copy" also cuts against the lesson.
- **Suggested wording:** "the state now exists only on the receiver's side, and it is correct only after the right X/Z".

### Nits
- **N1:** `bridge.js:77` validates phase 1 against angles taken from the result itself (`anglesOf(result)`). The `sameNumber` check is therefore tautological (gate-independence: input from the producer). Only the genericity check bites. The real independent check is phase 2's F cross-check, which held: `swap-correction-gates` went red in 100 tests and in derive.
- **N2:** CONTRACTS.md's phase-1 row says JS draws `{theta, phi}` with `randomGenericState()`. The bridge instead lets Python draw. Both are physically fine, but the docs disagree.
- **N3:** The descriptions say "Alice's Bell half" while the labels say "LOCAL BELL-HALF". Mixed naming.
- **N4:** The TokenAlreadyConsumed message, "Teleporting it again would mean a second copy existed", is muddled physics. Re-running the commit would re-prepare a known state; it would not copy the measured one.

### Audited and clean (scoped to the engine at HEAD 2bfc51e, host + local runner)
- **Token latch:** set only after the result is built (`:294`). The `latch-before-compute` sabotage went red in 6 tests.
- **RESTART:** `resetStoryToken` re-arms Python, then JS. In Pyodide, the commit after RESTART resolved.
- **Commit unlock (non-00):** it lives in platform's `dryRunVerdict.unlocksCommit` and gameplay's rule, not in the engine. On real output it gave `CORRECT_CALIBRATION` only on the rule choice (`seam.out`, m0=1 m1=0).
- **θ/φ pass-through:** exact. Every Pyodide dry run passed `validateTeleportCorrectionResult` (1e-12 echo plus the F cross-check).
- **Dry-run randomness:** the `dry-run-fixed-state` sabotage went red in 3 tests.
- **Shots and backend job:** shots are 256, and there is one backend job (memo plus Python guard). Not re-measured; covered by bridge-rewire.
- **numpy leaks:** a JS-side census of every leaf in 8×16 dry runs, 8 withheld, 32 deferred, 5 cloning, 3 relay and the bridge calls found 0 non-plain values.

## What I changed (commits, branch `lane/quantum/engine-bridge-review`)
- `d76271c`: seam check (engine output vs main contracts plus gameplay rules).
- `7dd57ee`: numpy derivation (host plus Pyodide), Pyodide probe, sabotage round, string scan, README.
- The vault report is committed after this file.
- No file under `echo/` was edited.

## Evidence
- `evidence/quantum/engine-bridge-review/README.md` indexes everything: `seam.out`, `derive-host.out`, `derive-pyodide.out`, `sabotage.out`, `strings-scan.out`, `pyodide/out/{pyodide-engine.json,engine.json,provenance.txt,pyodide-probe-page.png}`.
- Provenance: Python from HEAD d76271c (engine identical to 2bfc51e); runner `lane/platform/integration`@45a45f2; contracts main@47a2466; gameplay `world-v2-port`@372847e.

**Sabotage round** (disposable `git archive` copies; full `echo/tests` plus derive; unmutated control 595 pass):

| mutation | tests | derive |
|---|---|---|
| swap-correction-gates | RED (100) | RED |
| latch-before-compute | RED (6) | null, out of its scope |
| dry-run-fixed-state | RED (3) | null, out of its scope |
| commit-rule-bits-swapped | RED (5) | null, out of its scope |
| **ftl-hyphenated-fact** | **NULL** | — |
| **swap-bit-labels** | **NULL** | — |

## What I did NOT do or could not verify
- Nothing ran on Qollab or IonQ; everything is host or local runner.
- I did not drive the real game (`main.js` plus gameplay) end to end. B1 and B2 are proven at the seam with the exact functions the game uses, not through a playthrough.
- I did not check which gameplay branch will land. `integration` (7c4741b) reads `correctionX/Z` and `stateId`, which is also incompatible; `world-v2-port` reads `applyX/Z` and `stateId`.
- I did not re-measure the backend job.
- I did not test the commit on Pyodide with an injected Python failure; the host tests cover that.

## Decisions inferred from the docs
- I treated main's `echo/CONTRACTS.md` § "The one story commit" as binding over the engine's `{"state":"token"}`. That section is platform-owned shared contract (lane-ownership rule), and it names the engine's form as wrong explicitly.
- I took "random generic dry run" to mean uniform on the sphere with max r_P² ≤ 0.9, which is `GENERIC_MAX_WRONG_FIDELITY` (contracts-v2), for my 8 states.

## What the supervisor should do next
1. **Before proposing G1 done**, dispatch one quantum row:
   - `_commit_parameters` → `{stateId:"story_token", applyX, applyZ[, seed]}`;
   - cloning `fidelity = jointFidelityWithTwoCopies`;
   - `commitTransfer` validated with `validateCommitResult`, and a post-Python rejection reported as "token consumed" rather than retry (S1);
   - its gate: `seam.mjs` must go 13/13 (it is 7/13 now, so it is already red first).
2. Tell gameplay, through platform, which commit fields it gets. Its `integration` branch still reads `correctionX/Z`.
3. Second priority:
   - S3: normalised forbidden-phrase match;
   - S4: label test against `BIT_LABELS`;
   - S5: wording;
   - S2: expose or delete the Declassified checks.
