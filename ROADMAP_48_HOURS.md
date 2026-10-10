# ECHO: ONE OF ONE — 48-hour execution roadmap

**Hackathon window:** Fri Oct 9, 2026 at 19:00 ET → Sun Oct 11, 2026 at 19:00 ET.  
**Rule:** Milestone times are hours since official start. If starting late, rebase the remaining work to the real clock and cut P1/P2.  
**Absolute submission cutoff:** 19:00 ET October 11; publish before the last hour to allow errors and video upload.

## Outcome-based release gates

| Gate | Latest target | Essential evidence |
|---|---|---|
| G0 Platform proof | T+3h | Three.js render visible INSIDE Qollab, Python bridge, 1 selected backend job |
| G1 Quantum accuracy | T+9h | Reproducible cloning, Bell marginal, teleportation test passing |
| G2 Graybox game | T+22h | Title to finale using walking, terminals, quest state transitions |
| G3 Art/UX complete | T+34h | Atmospheric world, accessible UI, dialogue, visual consequences |
| G4 Submission stable | T+43h | Tested public Qollab project, 3 full runs, license/readme |
| G5 Video and final submission | T+48h (earlier strongly preferred) | Public no-login video 2–3 minutes, project page finalized |

## Critical path, explicitly ordered

**Qollab execution → Quantum API/data → Minimal 3D controls → State machine → 3 terminals → Ending → Documentation/publication → Polish.**

Do not build detailed skyscrapers before proving the first quantum terminal can run in the actual Qollab page. Never spend the final two hours building game mechanics.

---

## Phase 0 — Prepare and investigate (T+0–2h)

### Build tickets

- [ ] Read Qollab runtime docs and competition terms; copy hard limits into implementation README.
- [ ] Check any existing repository/project to avoid duplicate setup.
- [ ] Create MIT LICENSE with proper current holders; identify source tree.
- [ ] In Qollab, create JS/HTML project (`index.html`, `main.js`, `main.css`) and verify three.js import.
- [ ] Render dark background, ground plane and rotating emissive hero object; ensure project remains alive and interactive in runner.
- [ ] Import a trivial Python file with `.callPromising` and `.toJs()`; inspect serializable return shape.
- [ ] Execute ONE Qiskit circuit using injected backend, first on built-in simulator, then IonQ simulator if reachable; record result and limitations.
- [ ] Record project/public link or blockers.

### Acceptance

A Qollab browser run displays a working canvas with a responsive animation and quantum sample output. It is not sufficient to see the app working only on localhost.

### Risks/fallback

- If default Three import fails: check exact bundled version/import paths; start with native Qollab minimal JS example.
- If Python bridge import fails: create simplest Python module returning dict, then add Qiskit.
- If IonQ job fails: continue on built-in, label pending IonQ verification rather than blocking entire game; avoid the second job in same run.

---

## Phase 1 — Quantum experiment core (T+2–9h)

### Ticket Q-01 / Cloning

- [ ] Implement `run_calibration(zero|one|plus|phase)` in Python Qiskit.
- [ ] Return exact result with circuit representation and reduced-state purities.
- [ ] Test `zero/one` represent basis-value duplication; `plus/phase` produce entangled, noncloned outputs.
- [ ] Write teach-back text and “what went wrong?” explanation.

### Ticket Q-02 / Bell correlations and no-signalling

- [ ] Prepare Bell pair, sender I/X/Z local operations.
- [ ] Use partial trace to compute receiver marginal for each action.
- [ ] Assert receiver remains 50/50 in the selected measurement basis.
- [ ] Include paired correlation data only after a “Compare notes” step to demonstrate classical communication.

### Ticket Q-03 / Teleportation

- [ ] Implement 3-qubit reference protocol with qubit numbering locked.
- [ ] Exact mathematics for measurement-conditioned branch states; apply X iff `m1=1`, Z iff `m0=1`.
- [ ] Verify exact fidelity for at least six input states and all four branch outcomes.
- [ ] Add a hardware-compatible deferred-measurement gate-only verification circuit as fallback without pretending it physically transmits qubits between nodes.
- [ ] Validate source consumed at commit, while calibration states can be regenerated.
- [ ] Produce JSON outputs directly usable by game UI.

### Acceptance

Run mathematical test suite without game engine, with clear printed pass/fail and inspectable reference circuits. Expose one end-to-end JS → Python experiment call in Qollab.

---

## Phase 2 — Graybox game (T+7–22h)

### Ticket G-01 / playable core

- [ ] Title, `PLAY`, title fade/cutscene skip; app does not crash on repeat start.
- [ ] Third-person camera + movement: WASD, Shift, mouse, E; pointer lock correctly released for UI.
- [ ] Capsule-carrying original character silhouette, no animation requirement at first.
- [ ] Simple collision and edge bounds, wall-aware camera approximations.
- [ ] Graybox three connected locations with distinctive shapes.
- [ ] Interaction ray/distance detection, E prompts and crosshair only where appropriate.

### Ticket G-02 / state machine

- [ ] Implement every required quest transition from `ECHO_MASTER_VISION.md`.
- [ ] Data-driven objective text, clear progress indication and idempotent events.
- [ ] Each mission zone locked/unlocked by validated quantum step.
- [ ] Dialogue renderer with subtitles and click/keyboard continue.
- [ ] `Esc` pause and safe `Restart` reset.

### Ticket G-03 / puzzle terminals

- [ ] Copy booth: basis successes, |+> failure, explanation, state transition.
- [ ] Relay: create entanglement, send attempt fails, receiver-only marginal stays uniform, guide to classical cable.
- [ ] Rooftop: connect cable, measurement result m0/m1, choose X/Z, dry run result, correct/incorrect feedback, commit once.
- [ ] When local Qiskit calculation fails, show honest retry/error rather than automatically advance.

### Ticket G-04 / ending

- [ ] Source capsule state visibly consumed after commit.
- [ ] Remote vault state recovered.
- [ ] Skyline light-restoration animation and Mica/Rin dialogue.
- [ ] End title, Declassified toggle and credit panel.

### Acceptance

A blind tester can finish the WHOLE STORY from title in grayboxes, with no developer console and no route skip. Record a raw full-run screen capture. If this gate slips, cut the external React site immediately.

---

## Phase 3 — Cinematic art and UX (T+20–34h)

### Ticket A-01 / environment art

- [ ] Dark graphite structures, three hero landmarks, layered distant skyline with fog.
- [ ] Wet street approximation, reflection highlights, emissive panels, one train light silhouette.
- [ ] Rain effect that scales down on low quality; no expensive water simulation.
- [ ] Cyan quantum and amber classical link colors used consistently.
- [ ] Reusable procedural prop kit, small files and instancing.

### Ticket A-02 / atmosphere and camera

- [ ] Title to opening cinematic path, transition to follow camera, reveal of abandoned relay, rooftop arrival pan, ending city reveal.
- [ ] Optional radio static and sound cues, muted by default until player initiates audio.
- [ ] Ambient sound zones or at least one continuous loop and terminal sounds.
- [ ] Visual reaction for three plot milestones: failed copier, powered relay, restored grid.

### Ticket U-01 / interface and accessibility

- [ ] A cohesive terminal design system, 2-3 purposeful transitions only.
- [ ] Readable subtitles, no tiny holographic-only text.
- [ ] Keyboard navigation for menus, visible focus, alternative to hover.
- [ ] Reduced motion, audio toggle, graphics preset/quality scale.
- [ ] Objective/comms HUD hidden correctly in cutscenes.
- [ ] Error messages for backend failures and reset from stuck player position.

### Acceptance

Show a 30-second gameplay clip. A viewer should instantly recognize a third-person cyberpunk story, understand what is interactable, and see the physics-driven world reaction.

---

## Phase 4 — Integration, tests and documentation (T+32–43h)

### Functional QA

- [ ] 3 complete title-to-credits runs without crashes or unintended state skips.
- [ ] All 4 Bell measurement bits -> correct X/Z combinations verified.
- [ ] Source can only be committed once; refreshing Qollab starts fresh by design.
- [ ] All three Qiskit physics claims checked against output data.
- [ ] Screens of failures and hints are legible.
- [ ] Pause/resume, resize, pointer lock recovery, browser tab switch.
- [ ] At least one low-quality performance test and reduced-motion test.
- [ ] Audio disabled still fully understandable.

### Deployment QA

- [ ] Qollab code uses top-level `index.html`, `main.js`, optional `main.css`.
- [ ] The `backend` selected by user is used; no hardcoded API keys.
- [ ] Supports judges choosing built-in free simulator; verify IonQ simulator as possible.
- [ ] Doesn't exceed platform file count / file-size limits.
- [ ] Doesn't rely on CORS-blocked remote APIs or persistent storage.
- [ ] MIT LICENSE and third-party asset manifests complete.
- [ ] Public published project playable for non-logged-in judge where Qollab permits.
- [ ] Required credit: “This effort is supported by Qollab & IonQ”.

### Documentation

- [ ] `README.md`: pitch, story, controls, 3 science explanations, architecture, execution, troubleshooting, accessibility and team credits.
- [ ] Qollab project page: how to run and reproduce, what's new relative to sources, honest simulator modes and limitations.
- [ ] `SCIENCE.md` (optional): annotated formulas, Qiskit gates, experiment results and educational interpretation.
- [ ] Source attributions / license provenance for every externally sourced model, sound, image or code sample.

### Acceptance

A person who knows nothing about the team can open the public Qollab project and understand how to run it and inspect the quantum evidence.

---

## Phase 5 — Video and submit (T+42–48h)

- [ ] Capture authentic game footage from playable build, not mockups.
- [ ] Follow 2:40 trailer/scientific-demo storyboard in master vision.
- [ ] Include clear shots of actual Qiskit circuit and selected simulator outcome.
- [ ] Export within 2–3 minute limit, good audio, captions if narration, no copyrighted sound.
- [ ] Upload to no-login public URL; verify in incognito.
- [ ] Publish Qollab project and link video before deadline.
- [ ] Confirm public runner after publishing from nonauthor account if possible.
- [ ] Final check Qollab page has MIT, attribution and technical explanations.
- [ ] Tag/commit the exact submitted source as a release; record hashes/URL.

**Stop feature development no later than T+43h. Spend the final five hours on verification, publishing, video, fixing critical blockers.** If starting late, stop earlier.

---

## Team parallelization (up to four)

| Owner | Deliverables | Critical interface |
|---|---|---|
| Quantum lead | quantum/*.py, tests, adapter functions, Qollab backend job integration | `ExperimentResult` schema |
| Gameplay lead | world, controller, camera, collision, interactions | `GameEvent` transitions and world prop IDs |
| Narrative/UI lead | story/dialogue, terminal UI, state machine, accessibility, end screens | terminal callbacks to quantum adapter |
| Art/production lead | procedural props, lighting, effects, audio, demo video, submission page | locations/asset manifest, no core logic edits |

If solo: Follow the phase order; do not try four-track parallelization. If team: assign a named owner to every output, establish interface shapes by T+2h, merge daily or at each milestone, protect main with smoke tests.

## Risks and specific mitigations

| Risk | Early signal | Action |
|---|---|---|
| Qollab doesn't accept planned asset format | Upload fail or blank GLB | Use Three procedural geometry, remove heavy GLB |
| Qiskit Pyodide initialization is slow | >5s blank | Render world first, show calibrating overlay; precompute reusable experiments |
| IonQ one-job quota exhausted | Error on second backend.run | Fix architecture: one selected-backend verification; local Qiskit analysis for gameplay |
| Unrealistic character art overhead | Character model takes >2h | Procedural silhouette with coat; focus on camera and lighting |
| GPU performance collapse | <25 FPS early | Kill costly bloom/shadows; reduce DPR and particles; instance geometry |
| Quest state is brittle | Doors stuck, terminal loops | Pure transition reducer, numbered smoke test checkpoints |
| Physics questionable | Wrong qubit output mapping or invented claims | Validate test suite and consult IBM docs; label abstract metaphors |
| File upload blocked by 2MB limit | compressed asset too large | split or simplify; procedural fallback |
| Time slipping | G2 graybox not complete by target | Cut P1 visuals, external site; finish one-room equivalent |
| Submission surprises | Public link not runnable | Test publishing at least 5h before deadline |

## Stop/go decision tree

At **T+9h**: If quantum core incomplete, pause art and finish tests / Qollab bridge.

At **T+22h**: If no full graybox playthrough, cancel all external frontend work; collapse map to one-room adventure with 3 devices.

At **T+34h**: If frontend incomplete, cut weather/bloom and rich character art; keep terminal UI + ending.

At **T+43h**: No new features. Publish, verify, video.

## Definition of done for each PR/commit

Commit message reflects a tangible deliverable; branch starts from current main; no broken imports; runnable Qollab file layout maintained; new gameplay event has a transition test; quantum feature has a math check; a short `STATUS.md` records demo steps and known limitations. Avoid agents independently rewriting central game state files at the same time.
