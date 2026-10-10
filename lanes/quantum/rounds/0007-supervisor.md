=== PLAN ===
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
=== END PLAN ===

=== AGENT name=main-sync model=opus base=lane/quantum/integration ===
**GOAL:** the quantum lane's integration branch carries main, including contracts v2 (80d685f) and the platform gates `tools/contract-check/` and `tools/qollab-caps/`. We also need a measured list of exactly what the quantum engine and `bridge.js` still fail under those gates. The next merges (quantum-hardening, then the bridge rewire) can then land on the real contract instead of a stale one.

**VISION:** vision §8.4 has one `ExperimentResult` shape, owned by platform. CLAUDE.md says "Truthful quantum". The owner's ruling says no integrated code lands on main until cross-lane checks pass. G1 is due Sat 04:00 ET.

**WHAT WE ARE BUILDING:** the Qollab-root `echo/` folder. This lane owns `echo/quantum/` and `echo/tests/`.

**WHAT HAS NOT WORKED:**
- Measuring conformance against our own proposal note instead of platform's real validator. Every result was rejected once that mistake was found.
- Gates that cannot fail.
- `git status` used as proof of what a branch carries. Use `git diff --stat main...HEAD`.

**Vault notes to read:**
- `vault/AGENTS.md`, `vault/Index.md`: its promoted lessons include integration drift and test-state traps.
- `vault/Reports/contracts-v2.md` (on main), `vault/Reports/contract-conformance.md`, `vault/Reports/pyodide-bridge.md`.
- `echo/CONTRACTS.md` (main).

**Where to start:** on your branch (based on `lane/quantum/integration`), run `git merge main`. The only expected conflicts are the generated hubs `vault/Map.md` and `vault/Reports/README.md`. Resolve them by regenerating with `node scripts/vault-hubs.mjs`, never by hand-picking a side. Commit the merge.

**Constraints:**
- Do **not** edit any `echo/quantum/*.py` or `echo/tests/*`. A parallel worker (quantum-hardening) owns those right now.
- Do not edit platform files.
- Pick a port of your own if you serve anything.

**Deliver:**
1. The merge commit, with `git diff --stat main...HEAD` showing only quantum-lane files plus the vault.
2. `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs` run on the merged tree. Capture the full output and exit codes in `evidence/quantum/main-sync/`.
3. A short positive control for each gate, run on a disposable copy, showing it goes red on a planted defect. Report any gate that cannot go red.
4. A gap table. For every failure: file:line, the rule it breaks, and which owner fixes it (quantum `.py`, quantum tests, `bridge.js`, or a platform request). Say also whether quantum-hardening's branch (`lane/quantum/quantum-hardening`, head 0893403) would fix it. Check this with `git show`, read-only.
5. `pytest echo/tests -q` on the merged tree, to confirm the merge broke nothing.

**How I will judge it:** I re-run both gates and pytest on a detached worktree of your branch. The gap table must match my run. A gate result you did not show going red counts as unverified.

**Report:** `reports/0006-main-sync.md`. It opens with a **Vault check**, then a TL;DR, then the gap table, the nulls, and `## Questions for the owner` (expect none). Send a checkpoint within 1 h. This task should take about 45 min.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 7: Lane integration was 10 commits behind main, including contracts v2 at 80d685f. A `merge-tree` of main into integration conflicts only in the generated hubs (`vault/Map.md`, `vault/Reports/README.md`). Resolve those by regenerating with `vault-hubs.mjs`. quantum-hardening also lacks main, but it conformed to v2 through `lane/platform/integration` (0893403). Merge it only after main-sync, and re-run `tools/contract-check` on the merged result.
=== END LEARN ===
