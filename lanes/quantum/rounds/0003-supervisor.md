=== PLAN ===
**Lane goal (G1, due Sat 2026-10-10 04:00 ET, plan row 4).** Build `echo/quantum/{__init__,cloning,entanglement,teleportation,formats,qollab_job}.py` to match vision §7 and §10.3–10.7. Each function returns JSON-safe dicts that pass platform's `validateExperimentResult`. Tests in `echo/tests/` must cover:
- basis states copy; |+>, |−> and phase states do not (reduced purity 0.5);
- the receiver's marginal is 50/50 for I/X/Z;
- teleportation for 6+ states × 4 branches at fidelity ≥0.999999;
- endianness;
- the deferred-measurement circuit, labelled as a verification;
- the one selected-backend Bell verification.

**Done**
- **backend-job** was merged at consult 2. It has `qollab_job.py`, 32 tests and the research note on reaching `backend` from JS.
- **quantum-core** (bf7e715..85bbcef) is merged this consult. I judged it myself on a disposable detached worktree:
  - `pytest echo/tests -q` gives 363 passed, exit 0. That is the core's tests plus backend-job's 32 together, run on the core branch tip. The merge-tree against integration is clean.
  - Cloning is derived from the computed joint-state fidelity (`cloning.py:31`). The name-keyed sabotage (`clone-by-name`) turns red, but only one test catches it, which is a thin margin.
  - The teleportation branch model (`teleport_branch`) is separate from `verify_deferred`, and `verify_deferred` is labelled `deferred_measurement_verification`.
  - Sabotage: 19 mutations, 16 red, 3 nulls. Each null is argued to be physically indistinguishable:
    - cloning trace on the wrong qubit;
    - the receiver's marginal against the sender's, which are both I/2;
    - the sender's X applied to the receiver, since (X⊗I)Φ+ = (I⊗X)Φ+.

    I accept the 2nd and 3rd as physics. The 1st needs an independent look (reviewer).

**Found this consult:** platform's contract is now real on `lane/platform/integration` (`echo/contracts.js`, `echo/CONTRACTS.md`). Its `experiment` union is `cloning | bell_signalling | teleportation`. Our outputs carry `kind`/`details`/`circuitText`, and `qollab_job` uses `bell_verification` plus `summary`. Whether they validate is UNMEASURED.

**Running now (2 of cap 2)**
1. `contract-conformance`: run every quantum output through platform's real validator. Fix our side, and list the contract additions we need as a request to platform. Report the cloning-trace null.
2. `physics-review`: an independent adversarial review of the merged lane. Hand derivations, the 3 nulls, Pyodide API surface, and the m0/m1 rule.

**Next**
- Merge both after judging.
- Propose row 4 done once review and conformance are green, the owner has run the Pyodide probe, and the owner questions are answered or recorded as open.
- Then the JS adapter (`verifySelectedBackendOnce`). Where it lives is an owner/platform question; asked below.

**Risks**
- **Q3:** Pyodide Qiskit API availability is unknown, and every puzzle depends on it. It needs the overseer's probe on Qollab.
- Python state may persist across Stop→Run, which would make the once-only guard refuse the next run.
- Schema drift with platform.
- On named states, wrong X/Z corrections give fidelity 1. This is a pedagogy risk and needs an owner ruling.
- `live_commit` has no once-only lock in Python. Gameplay must call it once.
- Nothing has run on Qollab or IonQ yet.
=== END PLAN ===

=== MERGE branch=lane/quantum/quantum-core ===

=== AGENT name=contract-conformance model=opus base=lane/quantum/integration ===
**GOAL.** Every dict this lane's Python returns to the game must be accepted by the platform's real `validateExperimentResult`, unchanged and with no special cases. The terminal UI calls that validator on every bridge result. If a result is rejected, the player sees "scientific module error" instead of the puzzle (CONTRACTS.md). At the moment nobody has measured whether our outputs pass.

**VISION.** ECHO's quantum puzzles must be driven by real local Qiskit, with honest engine labels (exact probabilities never pretend to be shot counts) and exactly one selected-backend job (vision §7, §8.4, §10.2–10.7).

**WHAT WE ARE BUILDING.** `echo/quantum/` (this lane owns it; `echo/tests/` also): `formats.py` (the builder and refusal list), `cloning.py`, `entanglement.py`, `teleportation.py`, `qollab_job.py`.

**WHAT HAS NOT WORKED / KNOWN GAPS**
- quantum-core emits extra fields: `kind`, `details`, `circuitText`. The deferred check uses `kind="deferred_measurement_verification"`.
- `qollab_job` uses `experiment: 'bell_verification'` and a `summary` field. Neither is in platform's `experiment` union (`cloning | bell_signalling | teleportation`).
- The proposed contract `vault/Design/experiment-result-contract.md` was written before platform's file existed. It may now be stale; if it is, mark it `status: outdated` with a reason.
- Do not optimise for "validator returns []". The goal is a result the UI can show truthfully. If the contract cannot express something the physics needs (the Bell verification job, the deferred verification), do not distort our output to squeeze it in. Write the exact addition as a request to platform.

**Vault and docs to read first:**
- `vault/AGENTS.md`
- `vault/Index.md`
- `vault/Design/experiment-result-contract.md`
- `vault/Reports/quantum-engine-g1.md`
- `vault/Research/qollab-backend-from-js-projects.md`
- vision §8.4 and §10.2–10.7
- `/Users/udsy/agent-org/lanes/quantum/reports/0001-quantum-core.md` and `0001-backend-job.md`

**The platform contract** is platform-owned, so do NOT copy it into our branch. Read it with:
- `git show lane/platform/integration:echo/contracts.js`
- `git show lane/platform/integration:echo/CONTRACTS.md`

To run it, extract it to `/tmp/<yourdir>/contracts.js`.

**Where to start.**
1. Write the check first: a script under `evidence/quantum/contract-conformance/` that calls EVERY public bridge function across its full input space and dumps each dict with `json.dumps`. The functions and inputs are:
   - every state;
   - every sender gate;
   - all 4 branches × 4 choices;
   - `verify_deferred`, `corrections_withheld` and `live_commit`;
   - `qollab_job`, fed a fake counts dict.
2. Run each dict through platform's validator with node, and record the error list per call. Watch it go red.
3. Then fix our side wherever our side is wrong.
4. Add a pytest in `echo/tests/` that would catch a regression. It must not depend on Node at test time unless you justify that.

**Also:** the sabotage null `trace-wrong-qubit-cloning` stayed green. Determine whether the cloning dict can tell source from copy at all. Either add a check that bites, with a red/green demonstration, or show with numbers why the two are indistinguishable for every catalogue state.

**Deliver**
- commits on your branch;
- a per-function conformance table (before and after), and the sabotage of your new check;
- an exact, minimal contract-addition request for platform (field names, values, why), if one is needed;
- the report at `/Users/udsy/agent-org/lanes/quantum/reports/0002-contract-conformance.md`.

**How I will judge.**
- I rerun your conformance script against platform's contracts.js myself.
- No test is weakened.
- No field is renamed in a way that loses honesty (counts against exact).

**Report.** It opens with "Vault check", then TL;DR, evidence paths, nulls, "Not verified", "Questions for the owner". Write a checkpoint report within 1 h.
=== END AGENT ===

=== AGENT name=physics-review model=opus base=lane/quantum/integration ===
**GOAL.** A judge or physicist who reads ECHO's quantum code finds nothing false. Every number a player sees at the booth, the relay and the rooftop is physically correct. The tests that claim this would turn red if it were not.

**VISION.** Truthful physics is non-negotiable (vision §2.4, §7, §7.5):
- no cloned unknown states;
- no FTL signalling;
- m0 = source readout, m1 = Alice's Bell half; the receiver applies X iff m1=1 and Z iff m0=1;
- the source is consumed;
- the deferred-measurement circuit is a verification, not a link.

**WHAT WE ARE BUILDING.** The merged lane: `echo/quantum/*.py` and `echo/tests/*` on `lane/quantum/integration`. That is quantum-core plus backend-job.

**WHAT HAS NOT WORKED / WHAT TO DISTRUST**
- The tests were written by the same worker that wrote the engine. Their "independent" numpy hand-simulation (`hand_protocol`, `cnot`, `cz` in `test_teleportation.py`) has had no outside review.
- Three sabotage nulls are claimed to be physics (`evidence/quantum-core/sabotage.md`):
  - the cloning trace on the wrong qubit;
  - the receiver's marginal against the sender's;
  - the sender's X applied to the receiver.

  Verify or refute each, with math.
- `clone-by-name` turns red in only one test, which is a thin margin.
- On named states, wrong corrections score fidelity 1.000000. Confirm the table in `evidence/quantum-core/transcript.txt` independently.

**Vault and docs to read first:**
- `vault/AGENTS.md`
- `vault/Index.md`
- `.claude/rules/gate-independence.md` and `vault/Design/gate-independence-cases.md`
- `vault/Reports/quantum-engine-g1.md`
- `vault/Research/qollab-backend-from-js-projects.md` (§ The probe: the list of Pyodide APIs we depend on)
- vision §7 and §10.3–10.7

**Where to start.** You are read-only on product code. Run the review on a disposable detached worktree:

`git worktree add --detach /tmp/<dir> lane/quantum/integration`

(A plain worktree add fails, because the branch is already checked out.) Then:
1. Re-derive from scratch, on paper or in your own scratch numpy outside the repo, for at least 3 non-axis Bloch states:
   - the four branch probabilities;
   - Bob's conditional state per branch;
   - the corrected state;
   - the cloning reduced purities;
   - the relay marginals.

   Compare these with the engine's dicts.
2. Check the endianness end to end: Qiskit qubit order → our labels → count keys → m0/m1.
3. List every Qiskit/numpy API call in `echo/quantum/` and mark each one as on or off the probe list. Flag anything Pyodide might not ship, such as `qiskit_aer` or scipy-heavy paths.
4. Run your own sabotages (e.g. Z iff m1, or dropping the CNOT in the Bell measurement) on the disposable copy. Report which ones stay green.

**Deliver**
- `vault/Reports/quantum-physics-review.md`: findings ranked by severity, each with a reproduction and the math, plus the sabotage table including the nulls;
- the report at `/Users/udsy/agent-org/lanes/quantum/reports/0002-physics-review.md`.

Do not fix product code. Name the fix and I will brief a builder.

**How I will judge.**
- Each finding is reproducible from your commands.
- Each confirmation is backed by an independent derivation, not by reading our tests.

**Report.** It opens with "Vault check", then TL;DR, findings, nulls, "Not verified", "Questions for the owner". Write a checkpoint report within 1 h.
=== END AGENT ===

=== ASK_OWNER ===
1. **Rooftop calibration states.** On the named states |0>, |1>, |+>, |−> and phase, some WRONG X/Z correction still scores fidelity 1.000000. The evidence is the table in `evidence/quantum-core/transcript.txt` on `lane/quantum/integration`. There are two options:
   - (a) Use only generic states for the dry run (a fixed off-axis Bloch point, or a fresh random one each run), so every wrong choice visibly fails.
   - (b) Keep the named states and show "this mistake doesn't show on this state" as a teaching moment.

   I recommend (a): fresh random Bloch points, with (b)'s message kept as an optional fact. Which do you want?
2. **The story token.** Vision §7.4 says it is "unknown". Should it be a fixed generic Bloch point that is never shown to the player (my recommendation), or randomised per playthrough?
3. **Shots for the one selected-backend job.** Keep 256 (§10.7, faster on IonQ simulators), or use Qollab's default of 1024?
4. **For the overseer's next Qollab session.** Please run:
   - the ~10 s probe in `vault/Research/qollab-backend-from-js-projects.md` § The probe. It settles whether Pyodide's Qiskit has `Statevector`/`DensityMatrix`/`partial_trace`/`state_fidelity`, and every puzzle depends on that;
   - `echo/tests/smoke_plan.md` §2 steps 1–5.

   Later, once the verify step exists: run, Stop, Run again, and tell us whether the second run is refused.
5. **The JS adapter `verifySelectedBackendOnce`** (the memoised one-job call). I propose it lives in a quantum-owned `echo/quantum/bridge.js`, imported by platform's `main.js`. The other option is to put it in `main.js` itself (platform). Do you approve the quantum-owned file?
=== END ASK ===

=== LEARN ===
2026-10-10 consult 3: I merged quantum-core after re-running it on a disposable detached worktree (363 passed, exit 0, merge-tree clean) and checking two things myself. First, cloning is derived from the joint-state fidelity (`cloning.py:31`), not from the state name. Second, `teleport_branch` is separate from `verify_deferred`. I accepted two of the three sabotage nulls as physics: (X⊗I)Φ+ = (I⊗X)Φ+, and both Bell-pair marginals are I/2. The cloning-trace null went to review. The lesson: platform's real contract is on `lane/platform/integration` (`echo/contracts.js` and `CONTRACTS.md`), with `experiment` ∈ {cloning, bell_signalling, teleportation}. Our extra fields (`kind`, `details`, `circuitText`, `bell_verification`, `summary`) must be measured against that validator, not against our own proposal note.
=== END LEARN ===
