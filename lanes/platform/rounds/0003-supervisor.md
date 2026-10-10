=== PLAN ===
**Lane goal:** platform. G0 first: a Qollab-shaped `echo/` (body-fragment `index.html`, `main.js`, `main.css`). It renders Three.js, calls a Qiskit module through `.callPromising` + `.toJs()`, and makes exactly one `backend.run`. Alongside it: a local Qollab-like runner in `tools/` and `echo/QOLLAB_SMOKE_TEST.md`. After G0, platform owns `main.js`, `index.html` and the shared contracts. It integrates every lane after each merge, runs full playthroughs, keeps `echo/` within Qollab's caps, and writes the README/project page, the 2:40 video script and the release. Plan rows 3, 7 and 8.

**Clock (ET):** about Fri 23:40. G0 is overdue. G1 Sat 04:00 · G2 Sat 17:00 · G3 Sun 05:00 · freeze Sun 14:00 · submit Sun 19:00.

**Done:**
- **`shared-contracts`** (merged in consult 2): `echo/contracts.js` + `echo/CONTRACTS.md`, 604/604, 18 of 21 sabotage cases red with 3 named nulls.
- **`echo-caps-gate`** (judged this consult; MERGE below): `node tools/qollab-caps/check.mjs [--root dir]` exits 0, 1 or 2 and has 16 rule ids.
  - I re-ran it myself on a temp extract of the branch:
    - `run-fixtures.mjs` exit 0;
    - the real `echo/` on that branch: exit 1 with `entry-index`/`entry-main` (the G0 files are not there yet, which is correct);
    - my own hand-written sabotage (localStorage + two `backend.run`): exit 1 with exactly `storage` and `backend-run-count`.
  - The worker's own sabotage: 37 of 37 caught.
  - Its 4 questions are decided under autonomous mode (see LEARN): 2,000,000 bytes, count every file, keep the two extra rules, all XHR is red.

**In flight:**
- **`g0-runner-smoke`**: the runner uses real Pyodide v314.0.7 + Qollab's Qiskit 2.5.2 wheel and copies the AsyncFunction/Babel-CJS harness. Its final report must show:
  - `import './contracts.js'` working under the CJS transform;
  - `toJs({dict_converter: Object.fromEntries})` giving a plain object;
  - the one-job guard;
  - the caps gate green on its `echo/`.
- **`contracts-v2`** (dispatched now): folds into `echo/contracts.js` / `CONTRACTS.md` the owner's accepted 13 answers, the red-team physics rulings and the story-ui relay. The biggest change: the teleport dry-run contract becomes bits first (m0, m1), corrections second.

**Next:**
1. When G0 reports:
   - judge it with screenshots and the caps gate;
   - merge it;
   - the overseer runs `QOLLAB_SMOKE_TEST.md` on the Qollab draft;
   - the result goes in owner-answers. Only that closes row 3.
2. Integration shell (after G0 + contracts-v2): `main.js` boots ui (`#echo-ui`), gameplay, scene and quantum against `contracts.js`.
   - Settings route `quality` to the renderer and `volume` to audio.
   - Restart goes to the reset path.
   - Start with an empty-room playable shell, and screenshot it on the runner.
3. Post-merge routine for every lane merge: caps gate + contracts `check.mjs` + a runner load.
4. Watch the file count: quantum's `echo/tests/` ships inside `echo/` and counts toward the 100 files.
5. Later: README as the Qollab write-up, the video script, three consecutive full runs (row 8).

**Risks:**
- Gameplay writes a second state table. Contracts-v2 is the one source; this goes to the overseer.
- Contract churn breaks other lanes. Contracts-v2 must list every renamed or added symbol in its report so the overseer can relay them.
- The caps gate counts `backend.run` per call site only; the runtime guard is the real proof.
- The §9.3 world ids are now owner-accepted as snake_case, but they are still derived by us.
=== END PLAN ===

=== MERGE branch=lane/platform/echo-caps-gate ===

=== AGENT name=contracts-v2 model=opus base=lane/platform/integration ===
**GOAL:** Every lane builds against one contract that already holds the owner's rulings from 2026-10-10. Then nobody codes against a shape the owner has changed. The visible result: a judge's teleport terminal shows the two classical bits m0 and m1 first. The player then picks X/Z corrections, and the dry run reports fidelity, all on contract-valid data.

**VISION:** ECHO's teaching claim (vision §7, §10.5). Teleportation needs a Bell measurement, two classical bits and *conditional* X/Z corrections. The player has to see the bits before choosing, or the lesson is fake. Truthful labels: m1 = "LOCAL BELL-HALF READOUT m1"; Mission 2 shows EXACT partial_trace probabilities only, with no counts.

**WHAT WE ARE BUILDING:** a v2 of the platform-owned `echo/contracts.js` + `echo/CONTRACTS.md` (merged on this branch; read them and `vault/Reports/shared-contracts.md` first). You extend them. You do not fork them. The gate `tools/contract-check/check.mjs` (+ `fixtures.json`, `sabotage.py`) is the one gate; extend it too.

**Fold in, citing the owner-answers heading for each** (`/Users/udsy/agent-org/lanes/platform/owner-answers.md`: "13 lane design questions", "red-team physics ambiguities + captions", "overseer relay from story-ui"):
1. Transitions: `BOOT —BOOT_COMPLETE→ TITLE`, `DECLASSIFIED —OPEN_CREDITS→ CREDITS`, DECLASSIFIED → ENDING (back), and RESTART from ENDING (§9.5 reset). Check what is already there; do not duplicate.
2. ExperimentResult:
   - add `keyQubits` and `observables`;
   - `documented_preview` + `counts` → rejected;
   - add `experiment: "backend_verification"` for the single selected-backend job (256 shots);
   - Mission 2 receiver results carry exact probabilities and no counts. Decide how the validator enforces this from the data. Do not trust a flag.
3. Bus/world/interactables: `QUEST_STATE_CHANGED`, `CLOSE_TERMINAL`, snake_case world ids, `teleport_terminal`. For each of `OPEN_ROOFTOP` and `EXIT_BOOTH` (gameplay world triggers), and `EXPLANATION_READ` and `VIEW_RECEIVER_MARGINAL` (story-ui terminals), record which lane fires it as data in the contract.
4. **Teleport dry-run, two phases:**
   - phase 1 returns m0, m1 (named exactly so: m0 = source readout, m1 = local Bell-half);
   - phase 2 takes the player's {applyX, applyZ} and returns fidelity.
   - Correct rule: X iff m1=1, Z iff m0=1.
   - The generic test state is `ry(1.137)` then `rz(0.44)`; dry runs use fresh random generic states.
   - Define the request/response shapes and validators for both phases in the contract, and a worked example in CONTRACTS.md built from **real Qiskit 2.5** (venv on PATH).
   - Show with a Qiskit script that all 16 (m0, m1, X, Z) combinations give fidelity 1 only on the correct rule, on a generic state.
5. The story-ui relay:
   - `UI_ROOT_ID = "echo-ui"`;
   - the settings shape `{captionStyle:'standard'|'high-contrast', reducedMotion, textScale:100–200, quality:'low'|'med'|'high', volume:0–100}` with a validator;
   - name the pause-allowed/restart hooks as contract names.
   - Captions are always on, so there is no captions on/off field.

**WHAT HAS NOT WORKED:** The vision's §9.2/§10.3 code samples are incomplete and illustrative. Derive the contract from the text and flows, as v1 did. Do not optimise against the fixture count. Contracts must survive Qollab's Babel CommonJS transform: no top-level `import.meta`, no dynamic import tricks.

**Vault/notes:**
- `vault/AGENTS.md`, `vault/Index.md`, `vault/Reports/shared-contracts.md`, `vault/Research/qollab-platform-and-submission.md`;
- vision §7, §8.4, §9, §10.3–10.7.

**Deliver:**
- commits on your branch;
- check.mjs red first (the v1 module against the new fixtures must fail on each new rule; log it), then green;
- a sabotage round on a disposable copy with the nulls named;
- a headless-Chrome load of `tools/contract-check/browser.html` showing the two-phase dry run, with the served sha256 matching the file;
- run `node tools/qollab-caps/check.mjs --root echo` (it goes red only for the missing G0 entry files; say so);
- `vault/Reports/contracts-v2.md`, linked via `node scripts/vault-hubs.mjs`.

**How I judge:**
- the screenshot;
- my own re-run of check.mjs;
- one sabotage I pick (e.g. allowing X when m1=0) must go red;
- a **migration table** in your report: every symbol added, renamed or removed, and which lane must change what. I relay it to the other lanes.

**Report:** `reports/NNNN-contracts-v2.md`, opening with a Vault check. Write a checkpoint within 1 h. Do not touch `echo/main.js`/`index.html` (`g0-runner-smoke` is writing them).
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 3: I merged `echo-caps-gate` after re-running it myself on a temp `git archive` extract:
- fixtures exit 0;
- branch `echo/` red on the missing entry files only;
- a hand-written localStorage + double `backend.run` main.js went red on exactly `storage` and `backend-run-count`.

I decided its 4 questions under autonomous mode, taking the strict reading of QOLLAB_DEPLOYMENT.md's limits each time, because a false red costs minutes and a false green costs the submission:
- 2 MB = 2,000,000 bytes;
- every file counts toward 100;
- keep `html-stylesheet` + `import-unresolved`;
- any XHR is red.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 3: v1 contracts were merged BEFORE the owner answered Q1–Q6 and before the red-team rulings. The teleport dry run must be two-phase: bits first, then the player's corrections, then fidelity (owner-answers § red-team physics ambiguities). Every contract revision must ship a migration table, so the overseer can relay the changes to gameplay, quantum and story-ui.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 3: quantum's `echo/tests/` ships inside `echo/` and counts toward Qollab's 100-file cap (caps-gate finding). Track the file count at every integration. If it gets tight, propose moving the tests out of the upload rather than cutting product files.
=== END LEARN ===
