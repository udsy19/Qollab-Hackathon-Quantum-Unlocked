# CLAUDE.md — ECHO: ONE OF ONE

You are the lead implementer of a hackathon project called **ECHO: ONE OF ONE**, a playable, immersive, story-driven cyberpunk 3D puzzle adventure that teaches the no-cloning theorem, entanglement/no-signalling and quantum teleportation through actual gameplay and verified Qiskit computations.

## Mandatory reading order

1. `ECHO_MASTER_VISION.md` — single source of truth for story, gameplay, world, quantum, UI, engineering and acceptance criteria.
2. `ROADMAP_48_HOURS.md` — strict critical path and timeboxing.
3. `QOLLAB_DEPLOYMENT.md` — current project runtime rules and submission constraints.
4. `CLAUDE_CODE_PROMPTS.md` — reusable agent prompts and milestones.

## Primary outcome

A **published, runnable Qollab-native JavaScript/Three.js game** (index.html + main.js + main.css), with Python Qiskit integration, that a judge can play end-to-end without reading a physics textbook or needing external credentials. A premium React Three Fiber site is optional only after the Qollab version is reliable.

## Non-negotiable requirements

- Never produce only a landing page, design mockup, slide deck, spinning cube or static quantum visualizer.
- Build an actual third-person player controller and a complete beginning-to-ending quest loop.
- Real Qiskit calculations must underlie quantum puzzles, not hardcoded random yes/no responses or scripted-looking fabrications.
- Physics must be accurate: arbitrary unknown qubits cannot be universally cloned; entanglement alone cannot send a message; teleportation uses a Bell pair, Bell measurement, two classical bits, conditional X/Z and consumes sender source.
- The story token is consumed ONCE at final commit. Allow unlimited safe calibration runs on new prepared states, not repeated reuse of a measured unknown token.
- The IonQ path on Qollab supports only **one backend job per run**; interactive Qiskit statevector calculations must be local to Pyodide, without repeatedly calling the selected remote backend. Document backend provenance clearly.
- Qollab selected `backend` is injected. Do not hardcode a backend, assume permanent storage, depend on POST requests, or require auth keys.
- Third-party assets must have documented compatible licenses; never copy models/audio/textures from proprietary games. Submitted code and dependent external repos must be MIT.
- UI accessibility: subtitles, keyboard-accessible menus, text contrast, reduced-motion mode, visibly focused elements.
- Preserve game functionality with procedural geometry, low-quality mode and honest simulator fallback.
- The original project must be runnable and published on Qollab by Oct 11, 2026, 7 PM ET. Demo video 2–3 minutes at public no-login URL.

## How to work

1. **Inspect before changing:** Identify existing repo state, project files and which milestone is already implemented. Do not overwrite working code or create duplicate apps.
2. **Work in vertical slices:** Create the smallest end-to-end thing, test it, then improve visuals. The game must stay runnable after every meaningful milestone.
3. **Use milestones:** Gate 0 platform smoke test, Gate 1 quantum science validated, Gate 2 complete graybox, Gate 3 polished presentation, Gate 4 public submission.
4. **Keep a checklist:** Update `ROADMAP_48_HOURS.md` or an implementation `STATUS.md` after each milestone with links, tests and blockers.
5. **Tests are not optional:** Run quantum mathematical assertions and manual browser playthroughs. A successful npm build isn't evidence a story game works.
6. **No invented tool success:** If you cannot interact with Qollab's editor or publish using available tools, produce the exact upload-ready files and explain the manual deployment requirement.
7. **Protect time:** If any visual experiment blocks for >45 minutes, use a simpler shader/asset fallback and continue building game logic.
8. **Brief updates:** At completion of each gate summarize changes, verified tests, current blockers, next work. Never promise background work.

## Priority order

P0: Qollab runtime confirmed > quantum contracts tested > third-person controls > 3 quest terminals > final teleportation puzzle > ending > publish/demo.

P1: convincing lighting/rain/skyline, original character silhouette, cinematic dialogue, accessibility polish, sound, smooth transitions.

P2: external React Three Fiber 'Director's Cut', rich NPC animations, rooftop extras, postprocessing.

Never implement POST-HACKATHON content in the 48-hour build.

## Code and quality conventions

- Use small ES modules and named exports in Qollab; project structure from main spec is adaptable if platform constraints demand it.
- Use `requestAnimationFrame`, delta seconds, bounded time steps, world-space movement, deterministic quest state machine, and object/geometry reuse.
- Avoid heavy reactive state updates every animation frame.
- Use typed result schemas (or guarded JS equivalents) between JS and Python; do not silently conflate simulator counts and exact statevector probabilities.
- Use `Statevector`, `partial_trace`, `DensityMatrix` and `state_fidelity` for local quantum validation as appropriate.
- In Python functions for JS bridge, return plain serializable objects only.
- Explicit names for measurement bits: `m0 = source readout`, `m1 = local Bell half`; receiver X if m1=1, Z if m0=1.
- Make major world changes idempotent.
- Feature flags may exist for development but should not expose broken unfinished experiences in public build.
- Code comments should explain scientific subtleties and platform-specific workarounds, not narrate obvious lines.

## Working definitions

- **Playable**: Player can start, move, use E at three mission locations, fail and retry tests, repair link, make all four conditional correction choices, commit once, and reach credits.
- **Truthful quantum**: If an experiment claims actual local Qiskit output, tests can independently verify the math; if it shows selected backend output, a real Qollab run occurred.
- **Cinematic**: Consistent framing, readable palette, basic rain/fog/light, world-reactive consequences, refined terminal UI, final city restoration. Not AAA polygon count.
- **Submitted**: Qollab project page published, runnable, MIT, documentation, public 2–3 minute demo video, credits.

## Current official references

- https://qollab.xyz/learn/docs/runtime-environment
- https://qollab.xyz/learn/docs/js-qiskit-projects
- https://qollab.xyz/programs/hackathon/terms
- https://qiskit.qotlabs.org/learning/modules/computer-science/quantum-teleportation

**Implement, test, and report tangible progress. Do not merely restate this vision.**


## How work is organised (agent-org)

- **Start of every session:** `/session-open` — read `vault/Home.md`, the newest `vault/Sessions/` note
  and the mission in force. The vault is mission control: its contract is `vault/CLAUDE.md`, its routing
  table for every agent is `vault/AGENTS.md`, the supervisor's contract is `vault/SUPERVISOR.md`, and who
  may write what is the authority matrix in `vault/Architecture.md`.
- **Lanes:** work runs in supervised lanes — one supervisor per lane plans and judges, worker agents build,
  workers may use sub-agents. See `vault/Design/lanes-and-supervisors.md`. Org root `/Users/udsy/agent-org` on
  udsy's Mac (local tmux).
- **Rules** (`.claude/rules/`, auto-loaded): gate-independence · no-bloat · goals-not-tests · vault-first ·
  evidence-and-honesty · protected-paths · ask-the-owner · qollab-runtime · lane-ownership · deadline-gates.
- **Protected (supervisor/owner only, enforced by hook + landing gate):** `vault/Plan.md`,
  `vault/Roadmap.md`, `vault/Decisions/`, `.claude/rules/`, and (owner only) the four ECHO vision docs. Everyone else: `node scripts/propose.mjs`.
- **Before writing a new symbol:** `vault/Index.md` → `node scripts/where.mjs <name> --branches` →
  `git grep`. Delete what you supersede in the same change.
- **The org's board:** `bash scripts/gates/org-board.sh` (0 green · 1 red · skips named, never passes).
- **End of every session:** `/session-close` — the session note (`vault/Templates/session.md`), Home NOW,
  `node scripts/vault-hubs.mjs` and `python3 scripts/gen-subject-index.py`.
- **The Qollab project root is `echo/`** (owner ruling 2026-10-09): `index.html`, `main.js`, `main.css` and the
  tree in vision §8.2 live under `echo/`, not the repo root, so the org layer never counts against Qollab's
  100-file limit.
