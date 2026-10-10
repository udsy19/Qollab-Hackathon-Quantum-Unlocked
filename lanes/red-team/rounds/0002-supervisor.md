=== PLAN ===
**Lane:** red-team. We write reports only and make no product edits. Plan row 7.

**Goal:** Run three independent checks on ECHO: ONE OF ONE and report each, with evidence, to the lane that owns the fix.
1. **Physics audit.** Check `CLAUDE_CODE_PROMPTS.md` Prompt 6 and vision §7 against the real quantum code and tests: every claim, the four (m0,m1) pairs, endianness, the one-`backend.run` limit, and misleading labels.
2. **Blind playtests.** Newcomers play the newest integrated build in a local runner. We record where they get stuck and whether they can answer the three teach-back questions.
3. **Rubric score.** Score the build on novelty, technical execution, impact and documentation, with evidence.

**Approach:** The ground truth comes from an oracle derived from first principles, never from the quantum lane's code (law 4). The spec is treated as a hypothesis (law 5). Every gate is sabotaged on a disposable copy (laws 10 and 15). Results are labelled "local runner"; nothing is claimed for Qollab unless the owner records it.

**Done:**
- `physics-oracle-audit` (report 0001). I re-ran it myself on an exported copy of the branch: **523 passed, sabotage.py exit 0**.
  - Spec audit: 0 FALSE and 7 AMBIGUOUS claims (P1–P6).
  - Traps: T1 (each eigenstate catches only some correction errors), T2 (pass threshold must be ≥0.99), T3 (the Bell showcase can't reveal an endianness bug).
  - Platform fact: BasicSimulator refuses `if_test`.
  - Code-audit checklist C0–C9 is in `vault/Reports/physics-oracle-audit.md`.
  - MERGED this consult.

**Now:**
- `rubric-research` is still running.
- `physics-code-audit` is dispatched. Quantum code now exists at `lane/quantum/integration` (a9edce2): cloning, entanglement, formats, teleportation, qollab_job, plus tests. The worker runs checklist C0–C9 against a disposable export of that code, sabotages the code's own tests, and audits the one-job guard in `qollab_job.py` and in the G0 `echo/main.js` (`lane/platform/g0-runner-smoke`).
- Four owner questions (P5, P6, P3, P2) are raised in ASK_OWNER below.

**Next:**
- Once the platform, gameplay and story-ui integrations combine into a playable graybox: dispatch 1–2 `blind-playtest` workers. Each uses its own port, records screenshots and video, and answers the teach-back questions.
- If only a partial slice exists by Sat ~12:00 ET, playtest it anyway and label the result PARTIAL.
- After the first playtest: `rubric-score`.
- Re-run the playtests after G3 and before the freeze (Sun 14:00 ET), aiming for 3 consecutive full runs.
- Re-run the physics-code-audit whenever `echo/quantum` changes materially.

**Risks:**
- The graybox could arrive late, which squeezes the playtests.
- A worker could calibrate the oracle on the code (forbidden in every brief).
- The quantum code might use deferred-only verification, so the m0/m1 labels and the parser are never exercised (P4).
- If the dry-run contract makes players commit X/Z before they see the bits (P6), the game becomes a lottery and teaches nothing.
=== END PLAN ===

=== MERGE branch=lane/red-team/physics-oracle-audit ===

=== AGENT name=physics-code-audit model=opus base=lane/red-team/integration ===
**GOAL:** Prove whether ECHO's real quantum code and tests tell the physics truth, and whether its tests would catch a wrong product. A judge or player must never see a wrong X/Z rule, a misread bitstring, a cloned state, a "signal" through entanglement, or a second backend job, and every one of those defects must turn a test red.

**VISION:** The whole submission's credibility is "real Qiskit, truthful physics" (vision §2.4, §7). One physics error in front of IonQ judges sinks the technical-execution score.

**WHAT WE ARE BUILDING:** The `echo/` Qollab project.
- The quantum lane's code is at `lane/quantum/integration` (a9edce2): `echo/quantum/{cloning,entanglement,formats,teleportation,qollab_job}.py` and `echo/tests/*`.
- The platform's G0 bridge and one-job guard are at `lane/platform/g0-runner-smoke`: `echo/main.js`, `echo/quantum/smoke.py`.
- The shared contracts are in `lane/platform/integration`: `echo/contracts.js`, `echo/CONTRACTS.md`.

**WHAT HAS NOT WORKED / TRAPS ALREADY FOUND:** Our oracle (report 0001) found these:
- T1: a suite that tests only |0⟩/|1⟩ ships a dropped Z green, and a suite that tests only |+⟩/|−⟩ ships a dropped X green.
- T2: a wrong correction reaches F=0.957, so any threshold below 0.99 is unsafe.
- T3: the Bell showcase keys can't expose an endianness bug.
- BasicSimulator refuses `if_test`.
- The §10.3 cloning result reports only purity, so it can't tell which state was prepared.
- Deferred-only verification never exercises the m0/m1 labels or the parser.

**VAULT NOTES TO READ FIRST:**
- `vault/Reports/physics-oracle-audit.md`. This is your checklist C0–C9; follow it.
- `vault/Research/qollab-platform-and-submission.md`
- `vault/Design/gate-independence-cases.md` (laws 3, 4, 5, 10, 15)
- `vault/Index.md`
- `lanes/red-team/rulings.md`. Owner rulings: random generic dry-run states, a fixed hidden story token, 256 shots, `verifySelectedBackendOnce` in `echo/quantum/bridge.js`, and a `backend_verification` experiment.

**WHERE TO START:**
1. Run the C0 baseline on your branch: `python -m pytest -q evidence/red-team/physics-oracle -p no:cacheprovider && python evidence/red-team/physics-oracle/sabotage.py`.
2. Export the code under audit into a disposable directory, e.g. `git archive lane/quantum/integration echo | tar -x -C $TMP`. **Never edit or commit to any quantum or platform branch.**
3. Drive the oracle against the code's public functions. The ground truth stays the oracle's (law 4): never adjust the oracle to agree with the code. If they disagree, show which is right from first principles.

**DELIVER:**
- **Per checklist item C0–C9:** PASS, FAIL or UNTESTABLE, with the command, its exit code and the file:line.
  - Cover all four (m0,m1) branches through the code's own parser and correction path.
  - Check endianness on real sampled counts.
  - Check the threshold value used.
  - Check that the story token is consumed once.
  - Check that the receiver marginal is exact and labelled EXACT.
  - Check that cloning results report the input state.
  - Check Pyodide-safe imports (no `qiskit_aer`) and numpy scalars cast before returning to JS.
- **Sabotage round** on a disposable copy of the quantum code. Swap X/Z, swap m0/m1, reverse the bitstring, drop X, drop Z, loosen the threshold, and allow a second backend job. Report a table of which of THEIR tests go red and **the nulls**, i.e. the mutations their suite misses. The nulls are the main product.
- **One-job audit:** run `backend_run_audit.py` over the exported `echo/` from both branches, and read the guard logic in `qollab_job.py` and `main.js`.
- **Label audit:** grep any UI and data strings that exist on the story-ui, gameplay and platform lanes for "RELAY READOUT", "certified", "instant", "copied", and "measured" on deferred captions.
- **Findings** filed per owning lane as concrete defects: file:line, the failing input, the expected value and the observed value.

**HOW I WILL JUDGE:**
- Reproducible commands with exit codes, run on a named commit SHA of `lane/quantum/integration`.
- A sabotage table with the nulls stated.
- No claim of Qollab or IonQ execution.
- Any report that does not open with a Vault check is rejected.

**REPORT:** Write `reports/` plus a durable `vault/Reports/physics-code-audit.md`. Commit the evidence under `evidence/red-team/physics-code-audit/`. Checkpoint within 1 h with a PARTIAL report, then the final report within 2 h.
=== END AGENT ===

=== ASK_OWNER ===
Our red-team physics audit of the vision docs found no physics errors, but four ambiguities change what the player sees or a shared contract. I need your ruling on each. My recommendation comes first:

1. **m1 label.** Recommend **"LOCAL BELL-HALF READOUT m1"**. Vision line 417 uses that; line 261 says "RELAY READOUT", but "Relay" is Mission 2's station name and reads as if the bit came from the receiver's side.
2. **Dry-run order (contract).** Recommend that the player **chooses X/Z after seeing m0, m1**. The contract `teleportDryRun(stateId, correctionX, correctionZ)` (vision line 661) takes the corrections before the bits exist, which turns the puzzle into a 1-in-4 guess instead of learning the rule. This needs a platform contract change.
3. **Generic test state.** Recommend **circuit order: `ry(1.137)` then `rz(0.44)`**, as §10.5 codes it. Read the other way, RZ acts first on |0⟩ and does nothing, so the state loses its phase and the test gets weaker.
4. **Receiver panel in Mission 2.** Recommend **exact `partial_trace` probabilities only, labelled EXACT**. Sampled counts at 256 shots wobble by about ±3%, and a player toggling X could read 0.53 → 0.47 as a signal.
=== END ASK ===

=== LEARN ===
2026-10-10 consult 2: I verified the oracle independently before merging: `git archive` of lane/red-team/physics-oracle-audit into a temp dir gave 523 passed and sabotage.py exit 0. Don't `git worktree add` a worker branch to verify it, because worker branches are already checked out at `lanes/red-team/wt/<slug>`. Export with `git archive` instead.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 2: Quantum code landed on `lane/quantum/integration` (a9edce2) about 20 min after the oracle finished. Building the oracle before the code existed paid off: the code audit can start the same consult. Audit other lanes' branches only through a disposable export, never by checking them out or committing to them.
=== END LEARN ===
