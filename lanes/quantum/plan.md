**Lane goal (G1, due Sat 2026-10-10 04:00 ET, plan row 4).** At consult 11 it is Sat 00:19 ET, so about 3 h 40 min remain.
- Build `echo/quantum/{__init__,cloning,entanglement,teleportation,formats,qollab_job}.py` plus the quantum-owned `echo/quantum/bridge.js`.
- Every result must pass platform's `validateExperimentResult` under contracts v2.
- Put the tests in `echo/tests/`, per vision §7 and §10.3–10.7.
- Prove it in Pyodide through the local runner, and on Qollab through the overseer.

**Done**
- Merged earlier: backend-job (c2), quantum-core (c3), physics-review (c4), contract-conformance (c5), pyodide-bridge (c6), ionq-sim-rehearsal (c8), and main-sync with integration-catchup (c10).
- **quantum-hardening (c11): merging 4db9aba now.** I re-ran it on the disposable worktree `/tmp/q11h`, which was integration f7efb92 with hardening merged in (exit 0, no conflict; `merge-tree` also exits 0):
  - pytest: 595 passed.
  - contract-check: GREEN, 1087/1087.
  - Sabotage round against the v2 `contracts.js`: 42 mutations, 38 red, 4 nulls (all predicted), 0 refused. That matches the report exactly.
  - qollab-caps: RED with 6 findings, the known rows 1–5.
  - Row 6 (`backend_verification`) and row 8 (v2 `{theta, phi}`) are closed. Row 7 is also closed: `interpret_counts` pins `parameters.shots` to the requested shots and records any drift in `facts`.

**Running**
- **bridge-rewire** (tip de3a66c). It has merged hardening and rewired bridge.js to the hardened API. It still leaves Python's `backend.run` at `qollab_job.py:169`, so row 3 stays open.

**Dispatching now**
- **tests-caps-clean** clears gap rows 4–5: three caps findings in `echo/tests/test_qollab_job.py:91,207`. It edits test files only, without weakening any test.
- **backend-site-research** settles row 3 from the Qollab docs and the runner. Options: move the one `backend.run` into bridge.js (JS submits the circuit), or keep the documented Python `callPromising` route and ask platform to exempt that one guarded site in caps. This is research only; bridge-rewire owns bridge.js until it merges.

**Next**
1. Judge bridge-rewire:
   - It must carry hardening 4db9aba and integration.
   - Runner proof: one `backend.run`, and `verifySelectedBackendOnce` resolves with `backend_verification`.
   - Two-phase dry run, token latch, and RESTART.
   - Re-run its `round.sh` on a disposable worktree with its own `PB_PORT`.
2. Merge tests-caps-clean. caps should then be red only on row 3 and platform rows 1–2.
3. Act on row 3 from the research: either a small bridge.js and qollab_job follow-up after bridge-rewire merges, or a platform request for a caps exemption.
4. Reviewer pass on the hardened engine and bridge, then propose row 4 done, with runner evidence and an overseer Pyodide smoke request (`smoke_plan.md` §2.4).

**Risks**
- Generated-file conflicts in `vault/Map.md`, `Reports/README.md` and `Index.md`. Resolve by regenerating, never by picking a side.
- bridge-rewire and tests-caps-clean may both touch `echo/tests`. tests-caps-clean is limited to `test_qollab_job.py` and must merge integration before its report.
- Cutoffs: bridge-rewire 03:30 ET; tests-caps-clean 01:30 ET; research 01:30 ET.