=== PLAN ===
**Lane goal (G1, due Sat 2026-10-10 04:00 ET, plan row 4).** At consult 10 it is Sat 00:15 ET, so about 3 h 45 min remain.
- Build `echo/quantum/{__init__,cloning,entanglement,teleportation,formats,qollab_job}.py` plus the quantum-owned `echo/quantum/bridge.js`.
- Every result must pass platform's `validateExperimentResult` under contracts v2.
- Put the tests in `echo/tests/`, per vision §7 and §10.3–10.7.
- Prove it in Pyodide through the local runner here, and on Qollab through the overseer.

**Done**
- Merged earlier: backend-job (c2), quantum-core (c3), physics-review (c4), contract-conformance (c5), pyodide-bridge (c6) and ionq-sim-rehearsal (c8, evidence only, no IonQ job ran).
- main-sync and integration-catchup (c10): I am merging integration-catchup at bdb6261 now. I re-ran it myself on the disposable worktree `/tmp/q10ic`:
  - It is a fast-forward: integration is an ancestor, and `merge-tree` exits 0.
  - `echo/` is identical to main-sync's.
  - contract-check is GREEN, 1087/1087, exit 0.
  - qollab-caps is RED with 6 failures across 5 rules, exit 1. These are known gap rows 1–5.
  - pytest: 452 passed and 1 failed, the known `bell_verification` failure (row 6).
  - vault-hubs `--check` exits 0.
  - Integration now carries contracts v2, `tools/contract-check` and `tools/qollab-caps`.

**Running**
- **quantum-hardening** is the only `.py` worker. Its tip is f1d5b23 (review follow-ups); its final report is pending.
- **bridge-rewire** has already merged hardening and the old integration (bfcfbc3). It covers gap rows 3, 9, 10 and 11 plus the G1 runner proof.
- One slot is free on purpose. The only remaining `.py` work (rows 4, 5 and 7) touches hardening's files, so it waits until hardening finishes.

**Next**
1. When hardening reports, re-run on a detached worktree: pytest, its sabotage round, `validate.mjs`, `validate_teleport_v2.mjs` and contract-check.
   - Before merging, it must have merged the current integration (bdb6261) and regenerated the hubs. If not, a short catch-up worker does it.
   - If gap rows 7 (shots pinned to 256 in `parameters`, drift recorded in `facts`) and 4–5 (the caps-flagged `ionq_*` and `api_key` literals in `echo/tests`) are open, dispatch a small `.py` follow-up right after.
2. Merge bridge-rewire after hardening.
   - Check that it carries hardening's final tip and integration bdb6261.
   - Check that the runner proof shows one guarded JS `backend.run` and `verifySelectedBackendOnce` resolving with `backend_verification`.
3. qollab-caps should then stay red only on platform rows 1–2 (`main.js` and `index.html` are not on main). Record that as a scoped finding.
4. Run a reviewer pass on the hardened engine plus the bridge, then propose row 4 done with the runner evidence.

**Risks**
- Hub and Index conflicts: integration now has a regenerated `vault/Index.md` as well as the hubs. Both running branches predate bdb6261, so expect generated-file conflicts. Resolve them by regenerating, never by picking a side.
- Cutoffs: hardening 02:30 ET (merge whatever is green), bridge-rewire 03:30 ET.
- Pending platform requests:
  - a Python-side `backend.run` counter in the runner;
  - a caps exemption for the Python `callPromising` site, or moving it to bridge.js (row 3, bridge-rewire).
=== END PLAN ===

=== MERGE branch=lane/quantum/integration-catchup ===

=== LEARN ===
2026-10-10 consult 10: I merged integration-catchup (bdb6261, a fast-forward over bfcfbc3) after re-running it on the disposable worktree `/tmp/q10ic`. Results matched the worker's report exactly:
- contract-check: GREEN 1087/1087.
- caps: RED, 6 failures across 5 rules.
- pytest: 452 passed, 1 failed (`bell_verification`).
- hubs `--check`: 0.

New fact: integration now commits a regenerated `vault/Index.md` (the brief ordered it), so a branch cut earlier can conflict in Index.md as well as in Map.md and the Reports hub. Resolve all three by regenerating (`vault-hubs.mjs`, `gen-subject-index.py`) and confirm with `--check` exit 0.

Quick judge recipe: `git merge-base --is-ancestor integration <branch>` plus an empty `git diff <source-branch> <branch> -- echo/` proves a catch-up merge changed no product code.
=== END LEARN ===
