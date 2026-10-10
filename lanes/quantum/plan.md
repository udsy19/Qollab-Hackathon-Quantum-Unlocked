**Lane goal (G1, due Sat 2026-10-10 04:00 ET, plan row 4; it is now Sat 00:06 ET, so about 4 h left).** Build `echo/quantum/{__init__,cloning,entanglement,teleportation,formats,qollab_job}.py` plus the quantum-owned `echo/quantum/bridge.js`. Every result is JSON-safe and passes platform's `validateExperimentResult` under **contracts v2, now on main at 80d685f**. Tests go in `echo/tests/`, per vision §7 and §10.3–10.7. Everything has to be proven in Pyodide through the local runner, and on Qollab by the overseer.

**Done**
- **backend-job** (consult 2)
- **quantum-core** (consult 3)
- **physics-review** (consult 4)
- **contract-conformance** (consult 5)
- **pyodide-bridge** (consult 6): 61/61 in the local runner; the no-memo sabotage goes red.

**Running**
- **quantum-hardening**, the only `.py` worker. It has 3 commits so far:
  - 4d57f0e: tests written first, with the red run captured;
  - f8e335b: random generic dry runs, the hidden token, and the once-only atomic commit;
  - 0893403: conforms to v2.
  - Its final report is still pending.
- **ionq-sim-rehearsal**: the off-Qollab IonQ simulator rehearsal. No commits yet.
- **main-sync** (dispatched now). Lane integration is behind main by 10 commits, including contracts v2 and the `tools/contract-check` and `tools/qollab-caps` gates. The overseer asked that main be merged before the next dispatch, and `merge-tree` shows conflicts only in the generated hubs (`vault/Map.md`, `vault/Reports/README.md`). This worker:
  - merges main;
  - regenerates the hubs;
  - runs both platform gates against the integration engine;
  - reports the exact gap list, so hardening's merge and the bridge rewire land on an up-to-date base.

  It touches no `echo/quantum/*.py`, so it can run in parallel with hardening.

**Next**
1. Judge quantum-hardening: re-run pytest and its sabotage on a detached worktree. Merge it **after** main-sync, and resolve conflicts against the v2 base.
2. Dispatch **bridge-rewire** to move `bridge.js` onto hardening's API:
   - `bell_measurement("calibration")` returns theta/phi;
   - `teleport_branch(…, theta, phi)`;
   - `live_commit()` on the hidden token;
   - a `reset_story_token` hook.

   It then re-runs `round.sh`. The expected outcome is that `verifySelectedBackendOnce` **resolves** as a valid `backend_verification`. That run is the G1 proof screenshot.
3. Fix the caps-gate fixture strings in `echo/tests` (`ionq_simulator`, `api_key`), plus anything else main-sync's caps run lists. This happens after hardening merges, because it touches `echo/tests`.
4. Run `contract-check` and `qollab-caps` green on integration, then propose row 4 done.
5. A reviewer pass on the hardened engine.

**Risks**
- The bridge has to be rewired after hardening.
- Two platform-runner requests are still pending: a Python `backend.run` counter, and the caps exemption for `qollab_job.py`.
- G1 cutoffs: if hardening runs past 02:30 ET, merge what is green. The bridge rewire is the last G1 item, with a cutoff at 03:30.