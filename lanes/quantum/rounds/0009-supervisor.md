=== PLAN ===
**Lane goal (G1, due Sat 2026-10-10 04:00 ET, plan row 4; now Sat 00:13 ET, about 3 h 47 min left).**
- Build `echo/quantum/{__init__,cloning,entanglement,teleportation,formats,qollab_job}.py` plus the quantum-owned `echo/quantum/bridge.js`.
- Every result must pass platform's `validateExperimentResult` under contracts v2.
- Tests go in `echo/tests/`, per vision §7 and §10.3–10.7.
- The proof runs in Pyodide through the local runner here, and on Qollab by the overseer.

**Done**
- backend-job (c2), quantum-core (c3), physics-review (c4), contract-conformance (c5), pyodide-bridge (c6) and ionq-sim-rehearsal (c8, evidence only, no IonQ job ran).
- **main-sync (c9): judged, but not mergeable as it stands.** I re-ran it myself on the disposable detached worktree `/tmp/q9ms`:
  - contract-check: GREEN, 1087/1087, exit 0.
  - qollab-caps: RED, 6 findings, exit 1, the same 6 the report names.
  - pytest: 452 passed, 1 failed (`test_contract_conformance`, the known `bell_verification` failure).
  - `merge-tree` against integration **conflicts**. It is based on d9b42d0 and lacks ionq-sim-rehearsal. The only conflicts are the generated hubs `vault/Map.md` and `vault/Reports/README.md`.
  - The integration-catchup worker merges it onto current integration with the hubs regenerated, and then I merge that.

**Running**
- **quantum-hardening.** It is the only `.py` worker; its final report is pending.
- **bridge-rewire.** It is based on hardening and covers main-sync gap rows 3, 9, 10 and 11, plus the G1 proof run in the local runner.
- **integration-catchup (new).** It merges main-sync into current integration, regenerates the hubs, and re-runs the gates.

**Next**
1. Merge integration-catchup.
2. When hardening reports, re-run pytest and its sabotage round on a detached worktree.
   - Its follow-up must include gap row 7: pin `parameters.shots` to 256 and record any drift in `facts`.
   - It must also include rows 4–5: the caps-flagged literals `ionq_*` and `api_key` in `echo/tests`.
   - If hardening finished without them, dispatch a small `.py` follow-up.
   - Merge hardening, then re-run `contract-check`, `validate.mjs` and `validate_teleport_v2.mjs`.
3. Merge bridge-rewire after hardening, and check that its base matches hardening's final tip.
4. qollab-caps then stays red only on platform rows 1–2 (`main.js` and `index.html` are not on main). Record that in a scoped way and propose row 4 done once the runner proof is in.
5. Reviewer pass on the hardened engine and the bridge.

**Risks**
- Hub conflicts come back on every branch cut before the latest regeneration. Workers must merge the current integration before reporting.
- Cutoffs: hardening 02:30 ET (merge what is green), bridge-rewire 03:30 ET.
- Platform requests still pending: a Python-side `backend.run` counter in the runner, and the caps exemption for the Python `callPromising` site, or moving that site to bridge.js under row 3.
=== END PLAN ===

=== AGENT name=integration-catchup model=sonnet base=lane/quantum/integration ===
**GOAL:** The quantum lane integration branch carries `main`, which includes contracts v2 (80d685f), `tools/contract-check/` and `tools/qollab-caps/`. Every later quantum merge (hardening, then bridge-rewire) can then be graded against the platform's real v2 contract on one tree.

**VISION:** ECHO: ONE OF ONE ships with one result shape across lanes. Quantum can only prove it conforms on a tree that holds both the engine and platform's v2 validators.

**WHAT WE ARE BUILDING:** A merge commit only. You change no product code: nothing under `echo/` beyond what the merge itself brings in.

**WHAT HAS NOT WORKED:** `lane/quantum/main-sync` (7c72712) already merged main, but it was cut from d9b42d0. Since then integration gained ionq-sim-rehearsal and a hub regeneration (bfcfbc3). The result: `git merge-tree --write-tree lane/quantum/integration lane/quantum/main-sync` conflicts in `vault/Map.md` and `vault/Reports/README.md`, which are generated hubs. Hand-picking a side in a generated hub is wrong; regenerate them.

**Do:**
1. On your branch (based on current `lane/quantum/integration`), run `git merge lane/quantum/main-sync`.
2. Resolve the two hub conflicts by running `node scripts/vault-hubs.mjs`, then `node scripts/vault-hubs.mjs --check`, which must exit 0. If any other file conflicts, stop and report it; do not resolve it.
3. Run `python3 scripts/gen-subject-index.py --check`. If it reports drift, regenerate it.
4. On the merged tree, run `node tools/contract-check/check.mjs`, `node tools/qollab-caps/check.mjs` and `python -m pytest -q echo/tests`. Save the logs to `evidence/quantum/integration-catchup/`, with a short README.
   - Expected: contract-check GREEN; caps RED with exactly the 6 findings in `vault/Reports/quantum-vs-contracts-v2.md`; pytest 452 passed and 1 failed (`test_contract_conformance`, `bell_verification`).
   - Any difference from that is the finding. Report it with its output.
5. Prove the branch carries both sides with `git diff --stat lane/quantum/integration...HEAD` (three dots). It must show the tools and contracts files and the main-sync evidence.

**Vault notes to read:**
- `vault/AGENTS.md`
- `vault/Reports/quantum-vs-contracts-v2.md`
- `lanes/quantum/reports/0007-main-sync.md` (in `/Users/udsy/agent-org/lanes/quantum/reports/`)

**How I will judge it:**
- `git merge-tree` of your tip into integration is clean.
- The hubs `--check` exits 0.
- The three gate logs match the expected numbers, or the deviations are explained.
- `echo/` differs from main-sync's `echo/` by nothing: `git diff lane/quantum/main-sync HEAD -- echo/` shows only what integration already had and main-sync lacked.

**Report:** `reports/NNNN-integration-catchup.md`, opening with a Vault check. Include the TL;DR, commands with their exit codes, and evidence paths. Timebox: 30 min.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 9: I did not merge main-sync (7c72712) directly. I re-ran it on the disposable worktree `/tmp/q9ms`: contract-check GREEN 1087/1087; caps RED with 6 findings (entry-index, entry-main, backend-run-python, hardcoded-backend, hardcoded-secret); pytest 452 passed and 1 failed (`test_contract_conformance`, `bell_verification`). Those numbers match its report. But `merge-tree` into integration conflicts in `vault/Map.md` and `vault/Reports/README.md`, because it was cut at d9b42d0 before ionq-sim-rehearsal plus bfcfbc3. The rule: any branch cut before the latest hub regeneration will conflict in the hubs. Have a short worker merge it onto current integration and regenerate the hubs, rather than risk a conflicted MERGE. Every brief from now on says "merge current integration and regenerate hubs before your final report".
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 9: contract-check grades `echo/contracts.js` only; it never runs the engine or bridge.js (main-sync finding). Engine conformance has to be measured with contracts.js's exported validators (`validate.mjs`, `validate_teleport_v2.mjs`) and in the Pyodide runner. A green contract-check is never evidence that quantum output conforms. Remaining gap rows the hardening tip does not close: 3 (Python `backend.run` site), 4–5 (caps-flagged test literals), 7 (shots must be 256 in parameters, with drift in facts), and 9–11 (bridge.js). Rows 1–2 belong to platform (`main.js` and `index.html` are not on main), so qollab-caps cannot go fully green on a quantum branch until platform lands them.
=== END LEARN ===
