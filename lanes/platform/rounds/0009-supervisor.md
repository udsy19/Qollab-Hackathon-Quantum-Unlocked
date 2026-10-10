=== PLAN ===
**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`) that renders Three.js, calls Qiskit through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`. It comes with a local runner in `tools/` and `echo/QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane, runs full playthroughs, keeps `echo/` within the caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Sat 00:25. G1 Sat 04:00 · G2 Sat 17:00 (else the one-room cut) · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- c2 `shared-contracts`, c3 `echo-caps-gate`, c4 `g0-runner-smoke`.
- c5 `contracts-v2`: landed on main.
- c7 `contracts-pin-thresholds`, c8 `contracts-fidelity-band`: merged.
- G0 on real Qollab (overseer, built-in sim): steps 1–5 PASS.
- **c9 `integration-shell`: MERGE.** I re-ran it on my own `git archive` extract:
  - `assemble-echo` fixtures GREEN 8/8;
  - contract-check GREEN 1087/1087 on the branch's older gate. After the merge, integration's 1132-check gate applies; merge-tree is clean;
  - caps on the branch-only `echo/` are RED only on `import-unresolved`/`import-specifier`. That is expected, because the quantum files are not on this branch. The shell is graded on the assembled tree;
  - `main.js` imports `./contracts.js` (line 14); the runner screenshots prove it under the CJS transform;
  - the smoke files are retired.

  Known gap I am merging with: `main.js` still resolves (`Done.`) after calibration, before the click-to-verify job. On Qollab, that cuts off the IonQ proxy. `g0-input-diagnostic` (adae31b) carries the keep-alive and auto-send on an older base, so it must be reconciled onto the shell's `main.js`.

**In flight:**
- `g0-input-diagnostic`: `diag.js`, auto-send countdown, keep-alive, runner fidelity. Its `main.js` will conflict with the shell. On its report, the merge happens only after a rebase onto integration. If it finishes un-rebased, I dispatch `lifecycle-reconcile`.
- `readme-and-video-draft`.
- `contracts-moments-and-land` (new): the MOMENT events and countdown hold from the story-ui↔gameplay relay, plus a contracts-only branch cut from main, so the 1132-gate contracts reach main without product files.

**Decided this consult:**
- `echo/tests/` stays in the repo but is excluded from the release upload. Like `QOLLAB_SMOKE_TEST.md`, the assembler drops it. Grounds: the 100-file cap (QOLLAB_DEPLOYMENT.md), and pytest plus ~10 packages loading on every Run (report 0004 (d)). README says how to run the tests.

**Relay (overseer → lanes):**
- **quantum:**
  - (a) `qollab_job.py:131` `bell_verification` → `backend_verification`;
  - (b) delete Python `run_bell_verification_once` (a second `backend.run` site);
  - (c) ship `echo/quantum/bridge.js` `verifySelectedBackendOnce(backend)`: claim the guard before the first await, JS `backend.run`, then `interpret_counts`. Then platform swaps `verifyOnBackend` out;
  - (d) `tests/` is not uploaded (decision above).
- **gameplay:**
  - drop its stale v1 `echo/contracts.js` and `CONTRACTS.md` (assembler CONFLICT);
  - import `FIDELITY_PASS`/`FIDELITY_EPSILON` or `dryRunVerdict` and drop `FIDELITY_OK`;
  - no pointer lock; click-to-focus plus drag-to-orbit.
- **story-ui:**
  - settings to the v2 shape (`captionStyle`, not `subtitles`);
  - `data/*.js` keys retype 70 contract names: import them instead.
- **red-team quest-state Q7/Q8:** already in contracts v2 (`ENDING.RESTART→TITLE` at contracts.js:58, `DECLASSIFIED→ENDING`). The single name is `BOOT_COMPLETE`.

**Next:**
1. Judge `g0-input-diagnostic`, then the overseer re-runs G0 steps 6–7 on Qollab with the diagnostic build.
2. Once quantum (a)–(c) and the gameplay contract drop land, re-run assemble → runner check (22/22) → caps on the assembled tree.
3. Wire gameplay's scene and controller and story-ui's OPENING into the shell: G2 graybox, then the first full playthrough.
4. LAND contracts-only once `contracts-moments-and-land` proves `main...` touches only the contract and gate paths.

**Risks:**
- Iframe keyboard focus on Qollab is unproven.
- The `Done.` lifecycle is not yet on integration.
- A `main.js` merge conflict between the shell and the diagnostic.
- Lane restarts drop dispatches: check `lane.log` start lines.
- Contract churn, now at the third revision.
=== END PLAN ===

=== MERGE branch=lane/platform/integration-shell ===

=== AGENT name=contracts-moments-and-land model=opus base=lane/platform/integration ===
**GOAL:** every lane builds against one contract that already holds the names it was promised. Those contracts (with their gate) reach `main` without dragging integrated product code along.

**VISION:** vision §8.4 (one adapter contract) and §9 (quest states/moments). Owner ruling: "platform MAY land echo/contracts.js + echo/CONTRACTS.md on main early so every lane builds on them; integrated product code waits for cross_lane_check".

**WHAT WE ARE BUILDING:** `echo/contracts.js` + `echo/CONTRACTS.md` (platform-owned), the gate `tools/contract-check/`, and a landing branch.

**WHAT HAS NOT WORKED:**
- Every platform branch descends from integration, which carries product files (`main.js`, `index.html`, `requirements.txt`, `QOLLAB_SMOKE_TEST.md`). So a plain LAND would push product code to main, and consult 8 refused it.
- A declared null on an owner-ruled value (contracts-v2: `FIDELITY_PASS` 0.9 stayed green). Pin every new ruled value.
- Contract revisions without a migration table leave lanes guessing.

**Part 1, on `lane/platform/contracts-moments-and-land`:** add the overseer relay of 2026-10-10 (`lanes/platform/owner-answers.md` § "overseer relay: new contract names"):
- MOMENT events `clone_increase_voltage`, `relay_bay_cable`, `teleport_commit_locked`, `teleport_dry_run_failed`. Gameplay fires them and story-ui consumes them: put them in `EVENT_SOURCES`.
- A countdown contract that holds at 00:00, is never negative and is never a game-over. Use a pure helper or rule plus a pinned constant if one is needed.

Search first (`node scripts/where.mjs MOMENT --branches`, and `git grep` the four ids on the gameplay/story-ui integration branches) and reuse the names those lanes already use, if any. Write the gate checks first and watch them go red. Then implement. Then run a sabotage round:
- drop one moment id;
- let the countdown go negative;
- give a moment the wrong source.

Each must go RED. Report the nulls. Add a migration row to `CONTRACTS.md`.

**Part 2, landing branch `lane/platform/contracts-land`:** cut it from `main`. Bring over ONLY `echo/contracts.js`, `echo/CONTRACTS.md` and `tools/contract-check/` from your Part 1 tip (`git checkout <tip> -- <paths>`), and commit. Prove it:
- `git diff --stat main...lane/platform/contracts-land` lists only those paths;
- `node tools/contract-check/check.mjs` is GREEN on a `git archive` extract of that branch;
- `node tools/qollab-caps/check.mjs` runs on that extract (report its verdict honestly; a red on missing entry files is expected on main).

**Vault notes:**
- `vault/AGENTS.md`, `vault/Index.md`;
- `vault/Reports/contracts-v2.md`, `contracts-pin-thresholds.md`, `contracts-fidelity-band.md`;
- `.claude/rules/gate-independence.md` (laws 3, 5, 12, 15);
- lane `rulings.md`, `owner-answers.md`.

**Deliver:**
- both branches;
- evidence under `evidence/platform/contracts-moments/` (README table: command, exit, log);
- `vault/Reports/contracts-moments-and-land.md`.

**How I will judge:**
- I re-run check.mjs on archive extracts of both branches;
- I mutate one moment id and the countdown floor myself;
- I check `git diff --stat main...contracts-land` contains only the allowed paths.

**Report** `lanes/platform/reports/0008-contracts-moments-and-land.md`. It opens with a Vault check, then TL;DR, commands and exits, nulls, migration table, and next. Checkpoint within 1 h. No browser and no Qollab claims needed.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 9: I merged `integration-shell` after my own `git archive` run:
- assembler fixtures GREEN 8/8;
- contract-check GREEN on the branch's gate;
- merge-tree clean;
- branch-only caps RED only on unresolved quantum imports, which is expected. The shell is graded on the assembled tree.

I merged it knowing that `main.js` still resolves before the click-to-verify job, so on Qollab the IonQ proxy is off by then. The keep-alive lives on `g0-input-diagnostic` (adae31b, older base): require a rebase onto integration before merging it.

Lesson: two platform workers both editing `main.js` from different bases guarantees a conflict. Serialise `main.js` edits: one `main.js` worker at a time.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 9: Decided under autonomous mode: `echo/tests/` stays in the repo, but the release assembler excludes it from the Qollab upload, as it does `QOLLAB_SMOKE_TEST.md`. Grounds:
- QOLLAB_DEPLOYMENT.md 100-file cap;
- report 0004 (d): tests in the upload load pytest and ~10 packages on every Run.

The README documents running them locally. Relay to quantum.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 9: Red-team quest-state Q7/Q8 are already satisfied by contracts v2:
- `ENDING.RESTART→TITLE` (contracts.js:58);
- `DECLASSIFIED→ENDING`;
- the one boot name is `BOOT_COMPLETE`.

The overseer's MOMENT-events and countdown-hold relay was NOT yet in `contracts.js` (grep, consult 9). Dispatched `contracts-moments-and-land`, which also builds the contracts-only landing branch cut from main.
=== END LEARN ===
