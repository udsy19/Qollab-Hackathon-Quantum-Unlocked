# Claude Code command and milestone prompts

## How to use this pack

1. Create a new local repository for ECHO, or enter the existing one.
2. Put `CLAUDE.md`, `ECHO_MASTER_VISION.md`, `ROADMAP_48_HOURS.md`, and `QOLLAB_DEPLOYMENT.md` at the repository root.
3. Open Claude Code in the repository and paste the **Prompt 0** below.
4. Let Claude inspect the repo and write its short critical-path plan; then instruct it to execute immediately. If it already has tool permissions, let it build, test, and commit without restating the blueprint.
5. Use prompts 1–7 as needed to keep implementation moving or to delegate independent work to different teammates/agents.
6. The final project MUST be tested and published on Qollab. Localhost success is not submission success.

---

# Prompt 0 — Master kickoff (copy and paste into Claude Code)

```text
You are my lead technical director, narrative-game engineer, quantum computing engineer, and technical artist. Build ECHO: ONE OF ONE from the files in this repository.

READ ALL OF THESE FIRST:
- CLAUDE.md
- ECHO_MASTER_VISION.md
- ROADMAP_48_HOURS.md
- QOLLAB_DEPLOYMENT.md

Then inspect the current repo state. This is a real hackathon deliverable, not a discussion exercise. I want actual files, working code, tests, a playable third-person cyberpunk game, and an official Qollab-native submission path. Do not output a design-only response or create only a splash page.

PRODUCT VISION:
A 10-minute narrative third-person cyberpunk adventure in Nacre City. Play as Rin Vale. The city grid is being shut down; Mica needs an emergency authorization that is an unknown quantum state that cannot be perfectly cloned. The player discovers no-cloning at a replication booth, why entanglement alone cannot signal at a quantum relay, then uses a pre-shared Bell pair + classical communication + conditional Pauli corrections at a rooftop receiver to transfer the state. The original source state is consumed and the city lights return. Emotional, cinematic, atmospheric. Quantum mechanics must govern the puzzles through Qiskit, not be decoration.

PRIMARY PRODUCT TARGET:
A Qollab-native HTML/JS/Three.js project with root index.html, main.js, main.css, Python Qiskit modules, and small legal assets. Qollab's runtime provides three.js, Python/Pyodide Qiskit modules, a selected backend, and supports interactive rendering. Qollab restricts file size (2MB each), file count (100), network methods, persistent storage, and allows only ONE selected-backend job per run for IonQ. Interactive local Qiskit statevector experiments do not consume remote job quota. Do not hardcode backend credentials. Validate exact platform behavior at the start.

SECONDARY PRODUCT TARGET:
A separately hosted React Three Fiber high-fidelity edition is optional only AFTER the primary game is runnable end-to-end and Qollab compliant. Never sacrifice the deadline or physics to build an external demo.

BUILD ORDER / MILESTONES:
G0: Qollab compatibility smoke test (native three, JS->Python bridge, one selected backend.run).
G1: Implement and independently TEST no-cloning, Bell/no-signalling, teleportation across multiple prepared states. Measurement bits m0=source, m1=Alice. Receiver X iff m1=1, Z iff m0=1.
G2: Graybox FULL playable game: title, controllable Rin, third-person camera, WASD+mouse+Shift+E, 3 reachable spaces, terminal UI, quest machine, subtitled story dialogue, 3 puzzles, corrected dry-run, one-way commit, ending.
G3: Cinematic visual treatment: rain, wet ground, fog, modular city, emissive cyan quantum and amber classical systems, cohesive UI, environmental reactions, audio, accessibility.
G4: Qollab packaging, tests, license, source credits, public project setup, real 2-3 min gameplay video script.

DELIVERABLE QUALITY RULES:
- Real 3D gameplay, not a page pretending to be a game.
- Gameplay can be completed by a new player in ~10 minutes; opening can be skipped.
- Quantum experiments are reproducible in actual Qiskit; disclose any fallback/provenance.
- Do NOT claim entanglement transmits messages faster than light or that a simulated outcome is certified QRNG.
- Never copy Cyberpunk 2077 or Genshin models, story, audio or artwork; create an original aesthetic.
- No unlicensed assets, no API secrets, no external POST dependencies in the Qollab runner.
- Build in vertical slices; don't wait until the end to integrate gameplay.
- Keep master task checklist current and test each major transition.
- Distinguish reference snippets from verified running code. Never claim a platform run you could not execute.
- If this coding environment lacks browser/Qollab login, build an upload-ready Qollab project, use local/browser smoke tests where possible, and write an exact manual Qollab smoke/deploy checklist. Do not invent a published URL.

FIRST ACTION:
Read docs and inspect repo. Create the smallest working native Three.js/Qollab project structure with a visible scene and a functioning quantum-call stub/adapter. Then implement and test the quantum core before expanding the environment. Use a concise implementation plan with exact first three commits and execute immediately. Return at each meaningful milestone with files changed, verified behavior, blockers, and next step. Do not ask routine clarifying questions; make sensible production decisions based on the spec.
```

---

# Prompt 1 — Technical prototype: get Qollab compatibility right

```text
Implement G0 from ROADMAP_48_HOURS.md NOW. Build upload-ready files for a Qollab-native JS/HTML project. Render one animated Three.js scene with a start screen and readable HUD. Add a minimal Python Qiskit module imported from main.js using documented dotted module name + .callPromising; return a JSON-safe result. Add an actual selected backend Qiskit circuit with at most one backend.run call per Qollab run. Use only officially supported runtime imports and no external credentials or POST.

Do not begin character modeling yet. Verify local browser behavior and clearly mark steps that require manual Qollab testing if no Qollab runtime access. Add QOLLAB_SMOKE_TEST.md documenting exact expected output and errors. Keep existing files unless incompatible and explain the smallest necessary changes.
```

# Prompt 2 — Quantum correctness (run before gameplay cosmetics)

```text
Implement quantum/cloning.py, entanglement.py, teleportation.py and tests. Follow ECHO_MASTER_VISION.md Section 7 exactly. Return JSON-friendly experiments to JS. Test basis |0>,|1> via CNOT, superposition |+> and phase state with non-clonable output (reduced purity 0.5); Bell pair no-signalling receiver marginals 50/50 after sender I/X/Z; teleportation source q0, Alice q1, Bob q2, m0 source, m1 Alice, correction X iff m1=1, Z iff m0=1. Validate all 4 branches for 6+ test states with near-unit receiver state fidelity. Include an accurately labeled deferred-measurement gate-only circuit for backend compatibility. Don't fake hardware network controls; no actual story token is duplicated or repeatedly measured. Run tests and show exact pass/fail results.
```

# Prompt 3 — Playable graybox vertical slice

```text
Implement G2 and make the game PLAYABLE from title to end. Build one continuous playable city environment in Three.js: Rain Alley with copy booth, corridor/Relay Chamber, rooftop with teleport terminal. Add third-person follow camera, WASD movement, Shift sprint, mouse-look, E interact, collision bounds, pointer lock, pause, restart, subtitles, quest state machine. Implement each terminal connected to real local Qiskit experiment results via adapter. Make events idempotent and impossible to skip incorrectly. Include three-part narrative and final scene. Use primitive geometry and simple materials now; do NOT spend time on polish until a person can finish the whole story. Record manual smoke-test instructions and make the first complete path obvious.
```

# Prompt 4 — Make it feel like Cyberpunk, without copying Cyberpunk

```text
Perform G3 visual-art and game-feel pass without destabilizing completed gameplay. Target cinematic realistic cyberpunk atmosphere using original assets: night graphite structures, wet pavement approximation, emissive storefronts, volumetric-looking fog, cyan quantum devices and amber classical cables, distant skyline, rain, and deliberate camera framing. Improve Rin's silhouette and walking response. Add 3 environmental animations for the copied state failure, relay powerup and final city restoration. Keep at least 30 FPS on mid-range laptop quality preset, file <2MB, and a low-quality fallback. Do not replace working gameplay with an overdesigned menu. Show before-and-after screenshots or concrete rendering observations if available.
```

# Prompt 5 — Write cinematic dialogue and UI without exposition dumps

```text
Implement the story and UI from Sections 4 and 6 of ECHO_MASTER_VISION.md. Make opening a skippable cinematic with Mica call, not a forced lecture. Use 3 world-space styled but DOM-readable quantum terminals, cinematic quest HUD, contextual prompts, VEGA dialogue, accurate consequences, and 'Declassified' inspect panel. Add keyboard focus, subtitles, reduced motion, text scaling/readability, sound toggles, error states. Use original short emotional dialogue and avoid clichéd technobabble. No puzzle requires a textbook; hints are progressive and discoverable.
```

# Prompt 6 — Physics red-team and technical audit

```text
Conduct a hostile audit of our quantum/game integration. Verify every quantum claim has the correct experiment and code. Specifically: unknown states cannot be universally cloned (a CNOT copying basis values is not universal cloning); remote Bell marginals cannot transmit a chosen message; teleportation requires shared entanglement + Bell measurement + 2 classical bits + receiver X/Z corrections; the original source is consumed. Check little-endian bit labeling and each of four classical bit pairs. Check that all Qiskit local results are truthful, backend runs don't exceed IonQ one-job-per-run restriction, simulator runs are not labeled as hardware or physical quantum randomness, and the cinematic system does not falsely show quantum information duplicated. Run tests, report real failures and fix issues.
```

# Prompt 7 — Competition release and demonstration

```text
Freeze new features. Complete G4/G5: real Qollab-native runnable project, verified simulator pathways, MIT LICENSE, attribution and third-party credits, README and Qollab project description, public video plan (2:40) with only honest gameplay/screenshots and actual simulator output. Check Qollab's 2MB/file limit and browser sandbox restrictions. Validate full title-to-ending game loop three times, low quality/reduced motion, pause/resume, keyboard UI and error handling. Prepare release ZIP of source and exact upload instructions, if publishing cannot be automated. NEVER claim the project is published until the actual host confirms it. Include remaining risks and last-minute cut candidates. Stop working on stretch items.
```

---

# Example multi-agent delegation (only if tooling safely supports separate working trees)

**Agent A (quantum owner):** “Own only `quantum/`, quantum tests, and the result schema. Implement no-cloning, Bell, and teleportation with exact Qiskit physics. Commit and surface integration contract. Do not change game and scene files.”

**Agent B (gameplay owner):** “Own `game/` and `scene/`, build the player/controller/camera, level topology, triggers and world reactions against a fake adapter that matches the agreed result schema. Do not change quantum files.”

**Agent C (UI/narrative owner):** “Own `ui/`, `data/story.js` and CSS. Build captions, terminal interactions, state machine views, player-education reveals and accessibility. Integrate against stable adapter contract. Do not change quantum engine.”

**Integrator/Lead:** “Own main.js, shared contracts and integration tests. Merge only after each agent's branch passes its smoke tests. Ensure no simultaneous conflicts on `main.js` or global state, and run a complete story playthrough after every merge.”

**Art owner (if four):** “Own `assets/`, `scene/props.js`, `scene/lighting.js` with coordination to game agent; focus on performance, procedural prop kit, sound, background skyline and credits.”

Use a single shared project state contract before splitting work. If agents cannot share separate branches safely, work sequentially with Prompt 0 and the milestone prompts rather than simulating imaginary parallel progress.

---

# Daily / milestone reporting template

```text
ECHO — GATE [0–5]
Current playable path: [Title → ... → ...]
What changed: [concrete files and behaviors]
Quantum verification: [exact tests and outputs]
Platform verification: [Qollab browser vs local only; backend selected]
Visual status: [quantified or observed]
Open blockers: [specific errors, not speculation]
Next critical step: [single most important implementation item]
Remaining to submit: [only material items]
```

# When Claude says “done”

Require evidence of at least one actual complete playthrough, real mathematical test output, exact runner deployment status, and a video/publication checklist. “I wrote components” and “npm build passed” are **not** enough.
