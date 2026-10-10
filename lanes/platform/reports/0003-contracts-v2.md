# contracts-v2: FINAL

## TL;DR
- **Done and verified.** `echo/contracts.js` v2 + `echo/CONTRACTS.md` now hold every owner ruling from 2026-10-10. It extends v1 and does not fork it. Branch `lane/platform/contracts-v2`, tip 0312e27; code tip 340f45d.
- **Teleport dry run is two phases.** Phase 1 `{theta, phi}` returns m0, m1 and no fidelity. Phase 2 `makeCorrectionRequest(phase1, {applyX, applyZ})` returns the Qiskit fidelity. `dryRunVerdict` gives `{passed, unlocksCommit}`.
- **Qiskit 2.5.2 oracle** (`tools/contract-check/teleport_oracle.py`): on the test state ry(1.137) rz(0.44) and 3 random generic states, F = 1 on exactly 4/16 (m0, m1, X, Z) combinations, the rule X iff m1=1, Z iff m0=1. The worst wrong choice scores 0.674.
- **Gate** `node tools/contract-check/check.mjs`: v1 module red (478 FAILs, 609/1087), v2 green (1087/1087). Sabotage: 49 cases, 43 red, 6 named nulls, 0 mismatches.
- **Your pick, "allow X when m1=0", goes red** (9 FAIL lines). "Swap the rule" gives 18. "Fidelity cross-check removed" gives 64.
- **Screenshot:** `renders/contracts-v2/04-browser-two-phase-dry-run.png`. Served sha256 `4dd92ff3…` = `shasum` (`04-provenance.txt`).
- **Caps** `node tools/qollab-caps/check.mjs --root echo`: exit 1, only `entry-index` and `entry-main`. The G0 files are not on this branch.
- **Recommend:** merge, then relay the migration table (at the end) to quantum, gameplay and story-ui. The quantum rename `bell_verification` → `backend_verification` is the most urgent.
- **Flag:** an unexplained `Merge branch 'main'` commit (c6073be, 23:53 ET) appeared on my branch during a read-only review sub-agent run. Content is main-only (rules text, Qollab evidence images). I kept it rather than force-push.

## Vault check
- **Read:**
  - `vault/AGENTS.md` (delivered by the hook), `vault/Reports/shared-contracts.md` (v1), `vault/Index.md` (no contract entries);
  - lane `context.md`, `owner-answers.md`, `rulings.md`;
  - vision §7, §8.4–8.6, §9, §10.3–10.7.
- **Also read, in-flight work on other branches:**
  - quantum `lane/quantum/integration` `teleportation.py`, `qollab_job.py`, `formats.py`, `vault/Design/experiment-result-contract.md`, and the uncommitted contract-conformance worktree;
  - gameplay `echo/game/missionRules.js`;
  - story-ui `echo/ui/menu.js`, `accessibility.js`.
- **Already in v1 (reused, not rebuilt):** BOOT→TITLE, DECLASSIFIED→CREDITS, `keyQubits`, `observables`, `QUEST_STATE_CHANGED`, `CLOSE_TERMINAL`, snake_case world ids, `teleport_terminal`.
- **Stale:** `vault/Reports/shared-contracts.md` is now marked `status: superseded`, `superseded_by: [[Reports/contracts-v2]]`. Its teleport_terminal null is closed.
- **Hubs:** `vault-hubs --check` says the Reports hub and Map are stale. Per the rules I did not commit hub output; the loop regenerates them on merge.
- **Written:** `vault/Reports/contracts-v2.md`.

## What I found
- The quantum lane (contract-conformance, uncommitted) is already moving to v1 `keyQubits`/`observables`. Their `qollab_job.py` uses `experiment: "bell_verification"`; the owner ruled `backend_verification`.
- Their counts total can drift from the 256 requested shots on IonQ's noisy path. So the contract pins `parameters.shots === 256`, the requested number, and does not require the counts to sum to it.
- story-ui still has a `subtitles` on/off field. Captions are ruled always on.
- gameplay `missionRules.js` reads `probabilities['receiver=0']` and `parameters.correctionX/stateId`. Neither shape exists in v1 or v2.
- **Adversarial review (reviewer sub-agent):**
  - `x in TABLE` accepted inherited names (`engine: "constructor"`, `experiment: "toString"`, and `transition(s, "constructor")` was refused instead of thrown). This was a v1 bug too.
  - Dry-run `parameters.m0/m1` could contradict `measurementBits`.
  - Several negative checks passed when the export was missing.
  - All fixed, gate red first (`06-red-review-findings.log`, 5 FAILs).
- **The verdict's two guards are redundant by design.** It needs rule AND Qiskit F ≥ 0.999999. Removing either alone is a null; removing both goes red.
- JS can cross-check fidelity without fabricating it. F after the choice is 1, x², z² or y² of the Bloch vector. Across the 64 oracle rows this differs from Qiskit by at most 4.7e-13. The validator only uses it to refuse forged numbers.

## What I changed (commits)
- 4c5e3b7 gate first: Qiskit oracle + `teleport-fixtures.json`, new check sections, fixtures (red vs v1)
- 7f36522 contracts.js v2
- 6af0a3c sabotage round v2
- 85b3c93 CONTRACTS.md v2 with the real Qiskit 2.5.2 worked example
- 0cd03da browser page: two-phase dry run
- b3b2cfa / 4ef00a2 / 0312e27 vault report, v1 report marked superseded
- 340f45d review fixes (`Object.hasOwn`, m0/m1 echo check, non-vacuous negatives), 49 sabotage cases
- c6073be: merge of main, **not made by me** (see TL;DR)

## Evidence (`/Users/udsy/agent-org/lanes/platform/renders/contracts-v2/`)
- `00-teleport-oracle.log`: Qiskit `--check` green; committed fixtures equal a fresh run.
- `01-red-v1-module-vs-v2-gate.log` + `01-red-summary.txt`: dry run 359, event sources 33, refusal grid 41, settings 20, validator 12, marginal 4, edges 5, happy path 2, strict tables 2.
- `02-green.log` (1087/1087) · `03-sabotage.log` · `06-red-review-findings.log`.
- `04-browser-two-phase-dry-run.png`, `04-browser-dom.html`, `04-provenance.txt`. Headless Chrome 155, port 8763, measured on 340f45d.
- `05-qollab-caps.log`.

## Sabotage nulls (blind spots, named)
1. The verdict ignores the rule (fidelity alone gates). Equivalent on generic states.
2. The verdict threshold is loosened to 0.5 (the rule alone gates). Both together: RED.
3. ANIMATION_END is moved to story-ui. Inferred sources are not pinned; only the 4 owner-ruled ones and the interactable actions are.
4. Default volume 80 → 50. Defaults are validated, not pinned.
5. Renaming a §9.3 world-change id (carried from v1).
6. Dropping the Map hint text (carried from v1).
- Closed since v1: rebinding teleport_terminal is now RED.
- Some bad fixtures were already rejected by v1 for a coincidental reason, so they were not red-first: "receiver result with sampled counts" and "backend_verification computed locally".

## What I did NOT do or could not verify
- Did not run Babel's CommonJS transform itself. Static only: no `import.meta`, no dynamic `import()`, no imports at all; the caps gate scanned it clean.
- Nothing ran on Qollab. The browser load is local headless Chrome, not Qollab.
- `dryRunVerdict` trusts the request's bits. Only `makeCorrectionRequest` ties phase 2 to phase 1 (documented in CONTRACTS.md, not enforced).
- `marginalProbabilities` assumes a validated result. Junk keys give junk output and it does not throw.
- Did not touch `echo/main.js` or `index.html`. `<div id="echo-ui">` in `index.html` is for g0-runner-smoke.

## Decisions inferred from the docs
- **`CLOSE_SCIENCE`** is the event name for DECLASSIFIED → ENDING. The owner ruled the edge but not its name; it pairs with §9.2's OPEN_SCIENCE.
- **RESTART lands on TITLE; `RESET_STATE = 'TITLE'`** for both ENDING's RESTART and the pause menu's `onRestart`. §3.4 flow; BOOT is loading, not a menu. A restart is a new §9.5 session, so it is not a second use of the token (§7.4).
- **Inferred `EVENT_SOURCES`, beyond the 4 owner-ruled ones:**
  - BOOT_COMPLETE → platform;
  - START, OPEN_SCIENCE, CLOSE_SCIENCE, OPEN_CREDITS, RESTART → story-ui menu;
  - FINISHED, SKIP → story-ui dialogue;
  - interactable actions → gameplay (§9.4);
  - result events → gameplay experiment_result (§8.7: "result → ObjectiveMachine");
  - ANIMATION_END → gameplay cinematic.
- **The phase-1 request carries `{theta, phi}`** and JS draws it with `randomGenericState`. This keeps Python deterministic apart from the bit sample, and the state is on record in both results. Owner #7 asks for random generic states; who draws them is not settled anywhere.
- **"Generic" means max(x², y², z²) ≤ 0.9,** so every wrong choice scores ≤ 0.9. Owner #7: "every wrong X/Z visibly fails"; the threshold number is mine.
- **The JS fidelity cross-check has tolerance 1e-6.** It is never displayed (§10.6).
- **`CORRECT_CALIBRATION` fires only on `unlocksCommit`,** a correct pass on bits other than 00 (overseer ruling, gameplay consult 3 #2).
- **Mission 2 is enforced from the data.** `experiment === 'bell_signalling'` requires engine exact, probabilities and no counts, and keyQubits ∋ q1. No `documented_preview` is allowed, since the panel is labelled EXACT (owner red-team #4).
- **`measurementBits` are teleportation-only;** `qollab_selected_backend` ⇔ `backend_verification` (owner #4, §8.6 single job).
- **Settings:** `textScale` is an integer 100–200; story-ui steps by 25. Defaults are `{standard, false, 100, med, 80}`, from story-ui's current defaults.
- **`UI_HOOKS`** = `setPauseAllowed`, `onRestart`, `onChange`, `isOpen` (all four from the relay).

## Migration table (relay to lanes)

| symbol | change | lane | what to change |
|---|---|---|---|
| `EXPERIMENTS.backend_verification`, `BACKEND_SHOTS` (256) | added | quantum | `qollab_job.py`: `experiment="bell_verification"` → `"backend_verification"`; `parameters.shots` must be 256 (the requested number) |
| validator: `qollab_selected_backend` only with `backend_verification` | changed | quantum | no other experiment may use the selected-backend engine |
| validator: `counts` only under `qollab_selected_backend` | changed | quantum | `documented_preview` never carries counts |
| validator: `bell_signalling` exact only, probabilities required, keyQubits ∋ 1 | changed | quantum (`entanglement.py` in-flight already returns `[1]`), story-ui | the receiver panel uses `marginalProbabilities(r, BELL_RECEIVER_QUBIT)`, labelled EXACT |
| `marginalProbabilities`, `BELL_RECEIVER_QUBIT` | added | gameplay | `missionRules.js`: replace `probabilities['receiver=0']` with `marginalProbabilities(r, BELL_RECEIVER_QUBIT)[0]` |
| validator: `measurementBits` teleportation only | changed | quantum | — |
| teleport dry-run shapes: `validateTeleportBitsRequest/Result`, `makeCorrectionRequest`, `validateTeleportCorrectionRequest/Result`, `dryRunVerdict`, `randomGenericState`, `TELEPORT_TEST_STATE`, `FIDELITY_PASS`, `GENERIC_MAX_WRONG_FIDELITY` | added | quantum | entry points taking `{theta, phi}` (phase 1: bits, no fidelity, no applyX/applyZ) and `{theta, phi, m0, m1, applyX, applyZ}` (phase 2: fidelity). Today's `bell_measurement(state_name)` / `teleport_branch(state_name, …)` use named states; parameters must echo `theta`/`phi`, and `m0`/`m1` in parameters must equal `measurementBits` |
| same | added | gameplay | `TELEPORT_DRY_RUN` rule: replace `parameters.correctionX/stateId` with `dryRunVerdict(req, res).unlocksCommit` → CORRECT_CALIBRATION; delete the local `expectedCorrections` and `FIDELITY_OK` and import them from contracts |
| same + `BIT_LABELS` | added | story-ui | teleport terminal: show `BIT_LABELS.m0/m1` first, then the four X/Z choices; build phase 2 with `makeCorrectionRequest` |
| `expectedCorrections` | added | gameplay, quantum JS side | single JS copy; UI messaging only |
| `ENDING -RESTART→ TITLE`, `DECLASSIFIED -CLOSE_SCIENCE→ ENDING`, `RESET_STATE` | added | story-ui, gameplay | story-ui: the ending RESTART and the science "back" button fire these. Gameplay: `resetGame()` on RESTART / `onRestart`, quest state = `RESET_STATE` |
| `EVENT_SOURCES` | added | all | fire only the events listed for your lane |
| `UI_ROOT_ID` ("echo-ui"), `UI_HOOKS` | added | story-ui, platform (g0-runner-smoke) | `index.html` gets `<div id="echo-ui">`; import the constant instead of the literal |
| `DEFAULT_SETTINGS`, `validateSettings`, `CAPTION_STYLES`, `QUALITY_LEVELS` | added | story-ui | `accessibility.js`: drop `subtitles`, add `captionStyle`; replace `QUALITIES` with `QUALITY_LEVELS` |
| `in` → `Object.hasOwn` for enums and transition events | fixed | none | behaviour change only for inherited names, which now throw or error |
| fixture "selected backend counts" | renamed | none | now "backend_verification: …" |

## What the supervisor should do next
1. Re-run `node tools/contract-check/check.mjs` (expect 1087/1087) and `python3 tools/contract-check/sabotage.py` (49 cases, 0 mismatches). Then apply your own sabotage on a copy with `--contracts <copy>`.
2. Ask who made merge commit c6073be. If no loop syncs main into lane branches, a sub-agent did it despite being read-only.
3. Merge to `lane/platform/integration`. Relay the migration table, quantum's `backend_verification` rename first: it is a hard reject today.
4. Tell g0-runner-smoke to use `UI_ROOT_ID` for the `<div id="echo-ui">` mount.
