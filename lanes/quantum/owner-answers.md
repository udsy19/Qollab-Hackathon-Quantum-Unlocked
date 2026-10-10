# Owner answers: lane quantum

The owner's decisions and answers to this lane's ASK_OWNER questions. They are binding, and the newest is
last. The overseer appends here, quoting the owner verbatim where possible, with a date and the question it
answers. Never edit or delete an earlier entry. If a later answer supersedes it, say so in the new entry.

Write each answer as its own `## <date> · <question>` section: a consult shows only the newest 10 sections
of this log. The law that holds NOW is curated into `rulings.md`, which every consult shows in full.

Questions from this lane land in `/Users/udsy/agent-org/lanes/quantum/owner-questions.md`.

## 2026-10-09 · setup interview
Owner: "this is specific to trrack 3, i will give you the vision, and what to do, we are going to be despatching a swarm of agents to make this happen. 1. all local 2. all claude"
Owner: "ask me if you have any questions going forward. do not assume anything. if you need anything, or if you're not sure of something, ask me"
Approved the org setup ("Yes, set it up (Recommended)"): six lanes, Claude supervisors and workers, 2 h budgets, gates on the clock, `echo/` as the Qollab root, Python scaffold removed. What has not worked: "Nothing yet — fresh start". License: keep "udsy19 and contributors". Entry: "Team" (names not yet given).

## 2026-10-10 · platform consult 1 questions (G0 run, IonQ credits, contracts file)
- G0 on Qollab — owner: "Yes, tonight". When `echo/QOLLAB_SMOKE_TEST.md` lands, the overseer tells the owner; the owner uploads `echo/`, runs once on the built-in simulator and pastes the result here.
- IonQ credits — owner: "No credits ever". Use IonQ only if it is free; otherwise the IonQ path is documented as untested. The owner will check what Select QPU shows when signed in.
- Shared contracts — owner: "Yes, echo/contracts.js". One platform-owned file (quest states, transitions, event names, interactable ids, `ExperimentResult` validator) that every lane imports, plus `echo/CONTRACTS.md`.
- Credit names: still open (asked again 2026-10-10); keep a marked placeholder.

## 2026-10-10 · who drives Qollab
Owner: the overseer ("Me, via your Chrome") drives Qollab in the owner's signed-in Chrome. Allowed: "Create/update one draft project", "Run on free local simulators", "Run on IonQ sim if it shows Free". NOT allowed: publishing (the overseer asks the owner before every publish). Workers never drive Qollab; ask the platform supervisor, who asks the overseer. Qollab results are recorded here with screenshot + console text.

## 2026-10-10 · IonQ simulator label (signed in)
Overseer, in the owner's signed-in Chrome, 2026-10-09 23:3x ET: Select QPU shows all four IonQ remote simulators (Aria 1, Aria 2, Forte 1, Forte Enterprise 1) as **Free**; only IonQ hardware says "Credits apply". Evidence: `evidence/qollab/select-qpu-signed-in-2026-10-10.png` (repo main). The IonQ simulator path is therefore in scope (one job per run); IonQ hardware stays off-limits (no credits ever).

## 2026-10-10 · Pyodide Qiskit probe on Qollab (quantum ASK_OWNER 1)
Overseer ran the quantum lane's probe in the ECHO draft (https://qollab.xyz/u/udsy/echo-one-of-one, temporary Python main.py) on the Built-in simulator, 2026-10-09 ~23:40 ET, 1.6 s. Result: Python **3.14.2**, Qiskit **2.5.2**; `Statevector.from_instruction`, `DensityMatrix`, `partial_trace`, `state_fidelity` all work, exact values (probabilities 0.5/0.5, reduced ρ = [[0.5,0],[0,0.5]], fidelity 0.5). `backend` = `BasicSimulator`, name `basic_simulator`. `get_counts()` → plain dict `{'11': 37, '00': 27}`. **Gotcha:** `probabilities_dict()` keys/values are `np.str_`/`np.float64` — cast to `str`/`float` before returning to JS. Evidence: `evidence/qollab/pyodide-probe-builtin-2026-10-10.{jpg,txt}` on main. Not yet tested: JS-project path, `.callPromising(backend)`, `toJs` conversion, Stop→Run state (quantum ASK_OWNER 2 waits for an ECHO build with the verification step).

## 2026-10-10 · Does Python state survive between runs? (quantum ASK_OWNER 2)
Overseer, ECHO draft, Built-in simulator, two back-to-back runs of a `sys`/`builtins` counter: both printed `runs seen by this interpreter: 1` and `marker before: None`. The interpreter is **fresh on every Run** (Python project). The once-per-run backend-job guard is therefore safe across runs. Not separately tested inside a JS project; re-check when ECHO's verification step runs on Qollab. Evidence: `evidence/qollab/interpreter-fresh-per-run-2026-10-10.jpg`.

## 2026-10-10 · overseer relay from platform (contracts)
Platform has merged `echo/contracts.js` + `echo/CONTRACTS.md` into `lane/platform/integration`. Read `echo/CONTRACTS.md` and conform to `echo/contracts.js` (ExperimentResult schema, event names, interactable ids); propose changes through platform, never fork them.

## 2026-10-10 · 13 lane design questions — owner: "Accept all recommendations"
Contracts (platform): (1) add `BOOT —BOOT_COMPLETE→ TITLE`, `DECLASSIFIED —OPEN_CREDITS→ CREDITS`, and DECLASSIFIED → back to ENDING; (2) add `ExperimentResult.keyQubits` and `observables`; (3) `documented_preview` results may NOT carry `counts`; (4) the selected-backend job is `experiment: "backend_verification"`; (5) `QUEST_STATE_CHANGED`, `CLOSE_TERMINAL` and snake_case world-change ids accepted; (6) rooftop console id `teleport_terminal`; movement events (`OPEN_ROOFTOP`, `EXIT_BOOTH`) are fired by gameplay world triggers, acknowledgement events (`EXPLANATION_READ`, `VIEW_RECEIVER_MARGINAL`) by story-ui terminals.
Quantum: (7) teleport dry runs use fresh random generic Bloch states so every wrong X/Z visibly fails; keep "this mistake does not show on this state" as an optional fact; (8) the story token is a fixed generic Bloch point, never shown; (9) the one backend job uses 256 shots; (10) `verifySelectedBackendOnce` lives in quantum-owned `echo/quantum/bridge.js`, imported by platform `main.js`.
Gameplay: (11) a wrong dry run retries on a fresh calibration state; (12) the ENDING screen offers RESTART directly; (13) acknowledgement steps advance only after the result panel has been on screen.

## 2026-10-10 · red-team physics ambiguities + captions — owner: "Accept all four", "Keep always-on"
(1) m1 is labelled "LOCAL BELL-HALF READOUT m1" everywhere (not "RELAY READOUT"). (2) The player chooses X/Z AFTER seeing m0, m1: the dry-run contract changes so bits are produced first, corrections second (platform owns the contract change). (3) The generic test state is `ry(1.137)` then `rz(0.44)` in circuit order (§10.5). (4) Mission 2's receiver panel shows exact `partial_trace` probabilities only, labelled EXACT — no sampled counts there. Captions are always on; the setting is caption style (standard / high-contrast).

## 2026-10-10 · AUTONOMOUS MODE (supersedes "ask, never assume" for design choices)
Owner, verbatim: "keep going - do not keep stopping the progress, as of now, this is an autonomous loop, infer from the docs i gave you". From now on the supervisor DECIDES any design/implementation choice from the vision docs itself, cites the doc in a LEARN block and the brief, and does not raise ASK_OWNER for it. ASK_OWNER only for: money/credits, accounts/access, publishing, personal facts (credit names), or a genuine conflict between owner docs. Never stall waiting. `.claude/rules/ask-the-owner.md` (main) is updated.

## 2026-10-10 · overseer rulings from the docs (autonomous mode) — gameplay consult 3
(1) Failed final COMMIT: compute the live commit atomically in ONE local exact call (fresh live Bell measurement bits + corrected receiver state + fidelity). The story token is marked MEASURED/CONSUMED only when that call returns successfully. If the call errors, nothing was measured: show the honest scientific-module error and allow retry (§12.3 "not fabricated success; retry"), which keeps §7.4 intact because no measurement was recorded. Once the result is recorded, the commit is latched forever (never fires twice). A "transfer lost" screen is therefore unnecessary.
(2) COMMIT unlocks after at least one correct dry-run pass whose bits are NOT 00 (the player must actually apply X and/or Z), on fresh random calibration states; the UI always offers all four X/Z selections (CLAUDE.md "make all four conditional correction choices"; §4.4 Beat 3).

## 2026-10-10 · overseer rulings from the docs (autonomous mode) — red-team consult 3
(1) Theme: **Quantum Unlocked** (vision header "Primary theme: Quantum Unlocked"). (2) The page may say "targets WCAG 2.2 AA" only for checks actually run, listing them (terms require accessibility best practice; CLAUDE.md accessibility list). (3) Submission form: the overseer opened `/programs/hackathon/register` signed in; it currently shows only the team registration (team, captain, teammates), no submission fields yet — re-check closer to submission. (4) Yes: mark the "equally weighted" line in `vault/Research/qollab-platform-and-submission.md` §4 as unsourced.

## 2026-10-10 · credit names — owner: "\"The Quantubians\" + first names"
Credits (README, Qollab page, in-game credits, video): **Team The Quantubians (NYU Tandon School of Engineering)** — Udaya (captain), George, Harman, Epa. Never include anyone's email. License line stays "udsy19 and contributors".

## 2026-10-10 · overseer relay from red-team physics-code-audit (INTEGRATION BLOCKER)
Report: `lanes/red-team/reports/*physics-code-audit*.md`; evidence `evidence/red-team/physics-code-audit/out/` on `lane/red-team/integration`.
- Physics correct: oracle matches `lane/quantum/integration` a9edce2 on 12 states × 4 branches × 4 corrections to 1e-6.
- BLOCKER: 12/13 cross-lane checks fail (`out/cross_lane_check.txt`). Every real quantum result is INVALID under `echo/contracts.js`; gameplay `missionRules.js` reads field names the engine never emits (quest stalls at CLONE_INTRO); gameplay tests pass only on `fakeQuantum.js`.
- Two `backend.run` sites with independent guards once merged (`main.js:114`, `qollab_job.py:168`); the ruled `echo/quantum/bridge.js` / `verifySelectedBackendOnce` exists nowhere yet — there must be exactly ONE guarded site (bridge.js), and main.js calls it.
- `live_commit` re-measures the token on every call; no story-token state, no random generic dry-run states — conflicts with owner rulings (token fixed+hidden, consumed once; random generic dry-run states).
- Gameplay test nulls: FIDELITY_OK 0.999999→0.9 or removing the fidelity check leaves tests green.
OVERSEER DECISION (from the docs, vision §8.4 "Quantum adapter contract"): platform owns the ONE result shape in `echo/contracts.js` and settles it NOW (fold in quantum's needed fields — keyQubits/observables already ruled — rather than a second `kind/details` shape). Quantum conforms its emitters and adds token state, random generic states and `bridge.js`. Gameplay tests run against real engine output (e.g. `dump_results.py` fixtures), not only the fake, and its fidelity threshold is ≥0.999999. No lane lands on main until red-team's cross_lane_check passes.

(Clarification, same day: platform MAY land echo/contracts.js + echo/CONTRACTS.md on main early so every lane builds against the one shape; integrated product code waits for cross_lane_check.)

## 2026-10-10 · local IonQ simulator key — owner: "Yes, via env file I create"
The owner keeps an IonQ API key in `~/.config/echo/ionq.env` (outside the repo, mode 600). Workers MAY use it ONLY for local, off-Qollab checks against IonQ's **simulator** (`IonQProvider().get_backend("simulator")`, optionally `noise_model` aria-1/forte-1), e.g. to rehearse the one verification job before the overseer runs it on Qollab. Load it inside the single command that needs it: `set -a; . ~/.config/echo/ionq.env; set +a; python …`. NEVER: print, log, echo, copy or commit the key or the file; put it in `org.json`, the repo, `.env` files, reports, renders or the vault; use the `qpu` backend; use it from anything under `echo/` (Qollab supplies the backend there — published code never needs a key). If the file is missing, skip the IonQ step and say so; do not ask for the key. Local IonQ results are labelled "local IonQ simulator (off Qollab)", never "Qollab".

## 2026-10-10 · overseer: contracts v2 is on main (80d685f)
Platform landed `echo/contracts.js` + `echo/CONTRACTS.md` v2 (restart, EVENT_SOURCES, engine/experiment rules, two-phase teleport dry run — bits first, corrections second — UI root + settings) plus `tools/contract-check/` (fixtures, teleport oracle, browser page) and `tools/qollab-caps/` (Qollab-limits gate). Merge `main` into your lane integration branch before the next dispatch (base new workers on it), conform to v2, and run `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs` before claiming integration-ready. v2 supersedes the earlier `shared-contracts` version.

## 2026-10-10 · owner: "do not stop until you are done … spin up as many agents as you need"
Full autonomy until submission. Caps raised (platform 3, quantum 3, gameplay 3, story-ui 3, red-team 2, art 2 — art starts now with the procedural prop kit and atmosphere systems that do not touch gameplay files; heavy art integration still after G2). Use the slots: parallelise independent work, keep one task per worker, and keep within lane file ownership. The loop now re-reads `max_parallel` live and adopts running workers on restart (macOS fix).

## 2026-10-10 · overseer relay from platform integration-shell (assembled tree)
Platform's assembler (`tools/assemble-echo/`) and caps gate are RED on quantum files (4 caps lines). To integrate: rename `experiment: "bell_verification"` → `"backend_verification"` (owner ruling), delete the Python-side once-guard `run_bell_verification_once` (the ONE guarded site is `echo/quantum/bridge.js`), and ship `bridge.js`. Measured: in Pyodide v314.0.7 `toJs()` already returns plain objects. Then re-run `node tools/assemble-echo/...` and `node tools/qollab-caps/check.mjs`.

## 2026-10-10 · overseer relay: red-team cross-lane-recheck — the THREE fixes that unblock landing
Report `lanes/red-team/reports/*cross-lane-recheck*.md`. Gate RED 5/13 (was 12/13). Physics 86/86. Real-output quest walk stalls at CLONE_INTRO, CLONE_BASIS_PASSED, TELEPORT_DRY_RUN and the commit (commit then ends `measured_refused` with the token spent). Fake-adapter walk reaches CREDITS.
QUANTUM: (a) teleport results report `theta`/`phi` (the contract names) — with only that renamed, physics cross-check is 20/20; (b) add the hidden story-token state so `live_commit('story_token')` works; (c) random generic dry-run states; (d) emit `experiment: "backend_verification"` — today bridge.js SPENDS the one job then REJECTS the result (`bell_verification`), which would waste the single IonQ job on Qollab; (e) delete the Python-side `backend.run` site in `qollab_job.py:168` — bridge.js is the only site.

## 2026-10-10 · overseer relay from platform g0-input-diagnostic — QOLLAB RUNTIME FACTS (binding for all game code)
Cited from Qollab's shipped code (`/_nuxt/BWPMdZ7B.js`): the preview iframe is `sandbox="allow-scripts"` only — cross-origin (origin null), **no pointer lock**, never auto-focused.
OVERSEER DECISIONS (inferred from vision §3.1 "Pointer lock only while exploring" + invariant 1 and §6.6 keyboard alternatives): (1) No pointer lock on Qollab: camera orbit = mouse DRAG (hold button) plus keyboard (arrow keys / Q-E style) as the primary path; try `requestPointerLock()` only as an optional enhancement that silently falls back. (2) Show a "Click to focus" overlay until the frame has focus; resume it whenever focus is lost (§3.1 "unlock when … browser focus changes"). (3) `main.js` must NEVER return before the game ends: when it returns Qollab stops listening to the frame (console, Probabilities, IonQ proxying). Keep the top-level module awaiting a promise that resolves only at CREDITS/stop. Evidence: platform report `*g0-input-diagnostic*.md`, build `g0-smoke-2026-10-10c`.

## 2026-10-10 · G0 ON REAL QOLLAB — overseer run of build g0-smoke-2026-10-10c (lane/platform/g0-input-diagnostic)
Draft https://qollab.xyz/u/udsy/echo-one-of-one. Evidence on main: `evidence/qollab/g0c-*.jpg` + README.
- Built-in simulator: scene renders; bridge JSON exact (0.5/0.5, purity 0.5, fidelity 1, qiskit 2.5.2, py 3.14.2, emscripten); auto-send ONE job → counts {"11":134,"00":122}, 256 shots; console `backend counts` then `Done.`; Probabilities panel 47.66/52.34. PASS.
- **IonQ Forte 1 remote simulator (Free): ONE job → counts {"11":124,"00":131,"01":1}, backend `ionq_simulator`, 20.9 s, no one-job error. PASS** — the eligibility path ("runs on IonQ's simulator") is proven on Qollab.
- Input: the overseer's automated clicks/keys registered 0 on the diagnostic (frame never focused; origin null) — automation cannot drive the Qollab frame. A REAL human mouse/keyboard test is pending with the owner.
G0 (Plan row 3) is DONE on Qollab except the human-input confirmation. The game must keep `main.js` alive until the ending and the one-job path must stay exactly as in 10c (memoised, guarded, auto-safe).
