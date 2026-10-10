=== PLAN ===
**Lane goal: G1, plan row 4, due Sat 2026-10-10 04:00 ET.** At consult 12 it is Sat 00:30 ET, so 3 h 30 min remain.
- Build `echo/quantum/{__init__,cloning,entanglement,teleportation,formats,qollab_job}.py` and the quantum-owned `echo/quantum/bridge.js`.
- Every result must pass platform's `validateExperimentResult` under contracts v2.
- Put the tests in `echo/tests/`, per vision §7 and §10.3–10.7.
- Prove it in Pyodide through the local runner, and on Qollab through the overseer.

**Done**
- Merged in earlier consults: backend-job (c2), quantum-core (c3), physics-review (c4), contract-conformance (c5), pyodide-bridge (c6), ionq-sim-rehearsal (c8), main-sync and integration-catchup (c10), quantum-hardening (c11).
- **tests-caps-clean (c12): merging 08bf8c2 now.** I re-ran it on the disposable detached worktree `/tmp/q12tc` (now removed). The branch already contains integration (it is an ancestor), and `merge-tree` exits 0.
  - caps: RED 3. The only findings left are entry-index and entry-main (platform rows 1–2) and backend-run-python (row 3).
  - pytest: 595 passed, the same count as before the edit.
  - Sabotage: 9/9 OK. Both controls stayed green and all 7 mutations went red, with 0 nulls. Before the edit there were 2 nulls (`ionq-simulator` and `apikey`), so the test is now stronger.
  - The diff touches only `test_qollab_job.py`: one import moved to `importlib`, and the pattern classes were widened.
  - **Gap rows 4–5 are closed.**

**Running**
- **bridge-rewire** (checkpoint de3a66c). The bridge is rewired to the hardened API. Its new checks went red first (47/72) and one run of the rewired bridge passed 80/80 in the local runner. The full round (3 green runs, a fault control, 2 head controls, 9 sabotages) is under way. Cutoff 03:30 ET.
- **backend-site-research** (checkpoint). It leans toward Option A, where JS submits a Python-built circuit through bridge.js. Qollab's real one-job guard is the frame's `fetch` override, which refuses a second `POST jobs` and so counts both routes. Platform's main.js already calls a renamed function (`build_bell_verification_circuit`), so it is stale. Its runner proof comes next. Cutoff 01:30 ET.

**Next**
1. Judge bridge-rewire:
   - It must carry hardening and current integration, including tests-caps-clean. Its merge into integration must be clean, or it regenerates the hubs.
   - Re-run `round.sh` on a disposable worktree with its own `PB_PORT`.
   - Check the screenshots: `backend_verification` resolved, and the engine-lies fault refused.
   - Check the token latch and RESTART.
2. Act on the research ruling for row 3 (expected: Option A). A small follow-up worker would:
   - make bridge.js do the one JS `backend.run` with a Python-built circuit;
   - delete the Python `backend.run` at `qollab_job.py:169`, leaving Python to build and interpret only;
   - keep the asymmetric X-on-q0 control locally;
   - prove it in the runner with a spy counting both routes.
   It runs only after bridge-rewire merges, because both touch bridge.js and qollab_job.py. Then caps should be red only on platform rows 1–2.
3. Tell platform, through the overseer, that main.js calls a stale function name. It must call `verifySelectedBackendOnce` from bridge.js and keep no inline `backend.run`. `__pycache__` must also be stripped from the upload (found by tests-caps-clean).
4. Reviewer pass on the hardened engine and bridge. Then propose row 4 done, with runner evidence and an overseer Pyodide smoke request.

**Risks**
- Generated hubs and Index.md conflict whenever a branch was cut before the latest regeneration. The fix is to regenerate them, never to pick a side.
- bridge-rewire was cut before tests-caps-clean. Both touch `echo/tests`, but in different files, so a real conflict is unlikely; check `merge-tree` anyway.
- G1 margin: bridge-rewire (03:30) plus the row-3 follow-up leaves under 30 min. If row 3 cannot land by 03:45, I will report G1 as PARTIAL, with row 3 named as the open item, rather than claim it.
=== END PLAN ===

=== MERGE branch=lane/quantum/tests-caps-clean ===

=== LEARN ===
2026-10-10 consult 12: I merged tests-caps-clean (08bf8c2) after re-running it on the disposable worktree `/tmp/q12tc`. Integration is an ancestor and `merge-tree` exits 0. Results:
- caps: RED 3 (entry-index, entry-main, backend-run-python). Gap rows 4–5 are closed.
- pytest: 595 passed.
- `sabotage.sh`: 9/9 OK, 0 nulls.

Gotchas:
- Run gates with `PYTHONDONTWRITEBYTECODE=1`. Without it, pytest's `__pycache__` inflates caps' file count (19→34 files) and would count toward Qollab's 100-file cap if `echo/` were uploaded from a working tree.
- `cmd | tail` hides the exit code (caps showed `=0` while the printed verdict was RED). Read the verdict line, or use `${PIPESTATUS[0]}`.
- A literal regex in a "never names X" test misses spelling variants (the before-edit nulls were `ionq-simulator` and `apikey`). Use character classes for separators.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 12: backend-site-research checkpoint (not yet proven):
- Qollab's real one-job guard is the frame's `fetch` override (`rewriteIonqRequest`), which refuses a second `POST jobs` from either the JS or the Python route. Only the local runner's counter is JS-proxy-only.
- A JS `backend.run` accepts a Python-built `QuantumCircuit` PyProxy.
- Platform's main.js on `lane/platform/integration` calls `build_bell_verification_circuit`, which no longer exists after hardening.

The row-3 follow-up must therefore come with a cross-lane note to platform: main.js must call bridge.js `verifySelectedBackendOnce` and hold no `backend.run` of its own. I will confirm all of this against the research's runner proof before I act on it.
=== END LEARN ===
