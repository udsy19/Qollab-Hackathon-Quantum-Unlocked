=== PLAN ===
**Lane goal (G1, due Sat 2026-10-10 04:00 ET, plan row 4; now Fri 23:46 ET, so about 4 h 15 min left).** Build `echo/quantum/{__init__,cloning,entanglement,teleportation,formats,qollab_job}.py` plus the quantum-owned `echo/quantum/bridge.js`. Every result is JSON-safe and passes platform's `validateExperimentResult`. Tests go in `echo/tests/`, per vision §7 and §10.3–10.7. Everything has to be proven in Pyodide through the local runner, and on Qollab by the overseer.

**Done**
- **backend-job** (consult 2): `qollab_job.py`, plus the research note on reaching `backend` from JS.
- **quantum-core** (consult 3): the engine.
- **physics-review** (consult 4): independent re-derivation, 81 OK. It produced findings 1–7.
- **contract-conformance** (MERGE this consult):
  - I re-ran it on disposable detached worktree `/tmp/q5cc`: 453 passed, exit 0, merge-tree clean.
  - Rejections by platform's real validator went from 181 of 181 to 3 of 181. The 3 that remain are only the backend job's `experiment` value.
  - The owner has since ruled that value is `backend_verification`, not `bell_verification`. The rename goes to quantum-hardening.

**Running**
- **pyodide-bridge**: `echo/quantum/bridge.js` in platform's local Pyodide runner. It touches no `.py` files.

**Dispatched now**
- **quantum-hardening** (the only `.py` worker). It covers:
  - physics-review findings 1–6;
  - the "consumed once" engine guard and `reset_story_token()`;
  - the owner rulings: random generic calibration states, a fixed hidden `token`, the generic state `ry(1.137)`→`rz(0.44)`, bits first and corrections second, the m1 label, `backend_verification`, Mission 2 EXACT only, and an atomic COMMIT.

**Next**
1. Judge pyodide-bridge and quantum-hardening.
2. Re-run `validate.mjs` once platform adds `backend_verification` to `EXPERIMENTS`. It is still missing at `lane/platform/integration` 4e1b2ed.
3. Propose row 4 done, with the conformance, Pyodide-runner and review evidence.
4. After that, a reviewer pass on the hardened engine.

**Risks**
- Platform hasn't added `backend_verification` yet; this is routed through the overseer.
- `.callPromising` and `toJs` have not been verified on Qollab's JS-project path.
- pyodide-bridge was built against the pre-hardening API, so expect a small re-wire after hardening merges. Any rename needs a matching update to `bridge.js`.
- G1 is in 4 h. If hardening runs over, I land what is green at 03:30 ET and push the remainder to G2.
=== END PLAN ===

=== MERGE branch=lane/quantum/contract-conformance ===

=== AGENT name=quantum-hardening model=opus base=lane/quantum/integration ===
**GOAL.** The player must be able to trust everything the quantum terminals show:
- the receiver's Bloch arrow;
- the facts text;
- that the rooftop dry run catches every wrong X/Z choice;
- that the story token is consumed exactly once.

Every number the engine returns must be computed by local Qiskit and cover the cases a player actually reaches.

**VISION.** ECHO teaches no-cloning, no-signalling and teleportation through play (`ECHO_MASTER_VISION.md` §7 is normative; see also §10.3–10.7, §7.4 and §7.5). The repo-root `CLAUDE.md` sets two rules:
- "The story token is consumed ONCE at final commit."
- m0 is the source readout and m1 is Alice's Bell-half readout. The receiver applies X iff m1=1 and Z iff m0=1.

**WHAT WE ARE BUILDING.** You edit `echo/quantum/*.py` and `echo/tests/` on the lane integration branch, which now carries contract-conformance: 453 tests pass, and results conform to platform's `echo/contracts.js`. The JS bridge `echo/quantum/bridge.js` is being built in parallel by worker `pyodide-bridge`.
- Do NOT edit `bridge.js`.
- List every public API name or signature you change in your report, so the bridge can be re-wired.

**Owner rulings to implement.** They are binding; see `/Users/udsy/agent-org/lanes/quantum/rulings.md`.
1. **Random generic dry-run states.**
   - A dry run uses a fresh random generic Bloch point, so every wrong X/Z visibly lowers the fidelity.
   - A "generic" state must have every |r_P| bounded away from 1. Pick a margin and justify it with the closed form F = r_P² from `vault/Reports/quantum-physics-review.md`.
   - The calibration state must stay identical between the bits call and the corrections call. Pass it explicitly as angles or as a spec the engine validates; never hold it as hidden module state.
   - Keep the fact "this mistake does not show on this state" available as optional.
2. **The story token.** Add a fixed generic Bloch point `token` to the catalogue. It is never shown to the player: no angles or Bloch vector before the commit appear in any result field.
3. **The generic state** is `ry(1.137)` then `rz(0.44)`, in circuit order (§10.5).
4. **Bits first, corrections second.** One call returns m0 and m1. A separate call takes the player's X/Z choice for those bits and that state. `bell_measurement` + `teleport_branch` may already be most of this, so check before you add anything.
5. The m1 label is exactly **"LOCAL BELL-HALF READOUT m1"** wherever m1 is labelled in facts.
6. The selected-backend experiment value is **`backend_verification`**. Rename `bell_verification` everywhere, including the pending-gap filter in `test_contract_conformance.py`. That filter must keep tolerating only that one value, because platform hasn't added it yet.
7. **Mission 2 (relay):** the receiver panel shows EXACT `partial_trace` probabilities only, labelled EXACT. The relay result carries no sampled counts for the receiver.
8. **COMMIT** (overseer ruling, autonomous mode):
   - `live_commit` is one atomic local exact call: fresh Bell bits, the corrected receiver, and the fidelity.
   - The token is marked consumed only on success. A second call in the same interpreter run is refused with an honest error.
   - Expose `reset_story_token()` for gameplay's RESTART. The interpreter is fresh on every Qollab Run (owner-answers 2026-10-10).
   - If the computation raises, the token is NOT marked consumed.

**Physics-review findings to close.** They are in `vault/Reports/quantum-physics-review.md` §4, and finding 2 is covered by ruling 8 above. Each fix is test-first: write the test, and show it red against the matching mutation in `evidence/physics-review/sabotage.py` (ids are in its table) before the fix makes it green.
- **F1:** `receiverBlochVector` must be tested against an independent derivation. Use the mutations `bob-bloch-uncorrected` and `bloch-y-sign`.
- **F3:** the false causation in the basis-state source fact.
- **F4:** the live fidelity text must say it is computed exactly, not measured.
- **F5:** `sampler-hardcoded-uniform` must go red. Use a statistical test with a stated false-alarm rate and a fixed seed.
- **F6:** widen `clone-by-name-variant` so a name list can't pass.
- **F7** (`interpret_counts` builds its dict by hand): make it go through `formats.py`.

**WHAT HAS NOT WORKED / pitfalls**
- Named states (|0>, |1>, |+>, |->, phase) let a wrong correction score 1.000000. That is why ruling 1 exists.
- A cloning verdict derived from the state's name is forbidden. It must come from the computed joint state.
- Some sabotage nulls are true physics: (X⊗I)Φ+ = (I⊗X)Φ+, the I/2 marginals, and swap-symmetric a|00>+b|11>. Don't chase them; cite §2 of the review.
- Do not weaken or delete any test to get green. If a test is wrong, show why and replace it.
- Pyodide API set: Statevector, DensityMatrix, partial_trace and state_fidelity only. No aer, no scipy. Cast numpy scalars to `str`/`float` before returning.

**VAULT NOTES TO READ FIRST**
- `vault/AGENTS.md` and `vault/Index.md`
- `vault/Reports/quantum-physics-review.md`
- `vault/Reports/contract-conformance.md`
- `vault/Reports/quantum-engine-g1.md`
- `vault/Research/qollab-backend-from-js-projects.md`
- the lane's `context.md`, `rulings.md` and `owner-answers.md`
- Before adding any symbol, run `node scripts/where.mjs <name> --branches`.

**WHERE TO START.** Read `echo/quantum/teleportation.py`: `bell_measurement`, `teleport_branch`, `live_commit` and the catalogue. Then read `evidence/physics-review/sabotage.py`.

**DELIVER (commits on your branch)**
- The code and tests.
- `evidence/quantum/hardening/`, containing:
  - the red-before output for each fix;
  - pytest output, full suite, exit 0;
  - the platform validator re-run (`evidence/quantum/contract-conformance/validate.mjs` against `lane/platform/integration`'s `contracts.js`). Expect only `backend_verification` rejections;
  - a sabotage round re-running every physics-review mutation plus new ones for each ruling, e.g. token leaking its angles, a second commit allowed, consumed-on-error, and a non-generic calibration draw. Report every null;
  - a transcript of one complete player path: relay EXACT panel → dry run (bits → wrong X/Z → fail → fresh state → right X/Z → pass, non-00 bits) → commit → second commit refused → `reset_story_token` → commit again.
- A vault report, `vault/Reports/quantum-hardening.md`.

**HOW I WILL JUDGE**
- I will re-run your tests and the sabotage on a disposable detached worktree.
- I will read the transcript for ruling conformance.
- I will check that no `token` angles leak in any field.
- I will check the API change list against `bridge.js`.

**REPORT.** Write `/Users/udsy/agent-org/lanes/quantum/reports/<n>-quantum-hardening.md`.
- Open with **Vault check**, then a TL;DR.
- Then sections for: the evidence paths, the nulls, the API changes for the bridge, Not verified, Questions for the owner (spend, access or doc conflict only), and What the supervisor should do next.
- Checkpoint report within 1 h. Final within 2 h, and in any case before Sat 03:30 ET (G1 is at 04:00 ET).
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 5: I merged contract-conformance after re-running it on disposable worktree `/tmp/q5cc`: 453 passed, exit 0, merge-tree clean. It still emits `experiment: "bell_verification"`, but the owner has since ruled `backend_verification`, so quantum-hardening does the rename. At `lane/platform/integration` 4e1b2ed, `EXPERIMENTS` still lacks the value, so the conformance test's single-value pending-gap filter has to follow the rename. The clock at consult 5 read Fri 23:46 ET, so G1 (Sat 04:00 ET) is 4 h away and not overdue. Decision (autonomous; CLAUDE.md "consumed ONCE" + the overseer's gameplay-consult-3 ruling): `live_commit` marks the token consumed only on success, and refuses a second call. `reset_story_token()` exists only for RESTART.
=== END LEARN ===
