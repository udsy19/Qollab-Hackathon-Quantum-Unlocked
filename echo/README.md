# ECHO: ONE OF ONE

*In a world where everything can be copied, the one thing that can save us cannot.*

ECHO is a short third-person story game for the browser. You play Rin Vale, a courier in Nacre City, carrying the one authorization that can stop District Nine's power shutdown. That authorization is an unknown quantum state. You cannot copy it, and entanglement alone cannot send it. To deliver it you have to teleport it, and teleporting it uses up the original.

<!-- FILL AFTER VIDEO UPLOAD: ![ECHO demo, under 3 minutes](https://youtu.be/<id>) -->

Theme: **Quantum Unlocked**. Built with Three.js and Qiskit, running in your browser on Qollab.

## What you will understand after playing

The game has three missions, and each one teaches a quantum rule by letting you try the obvious idea first.

| Mission | What you try | What happens | The rule |
|---|---|---|---|
| 1 · THE COPY | Copy a qubit in a duplication booth (a CNOT onto a blank qubit) | \|0⟩ → \|00⟩ and \|1⟩ → \|11⟩ work. \|+⟩ becomes one entangled pair, and each output on its own is fully mixed (purity 0.5) | No-cloning: CNOT copies a known basis bit, not an arbitrary unknown qubit |
| 2 · THE CONNECTION | Send a message down a Bell pair by applying I, X or Z on your half | The receiver's half alone stays exactly 50 / 50 whatever you do. The pattern only shows when both logs are compared | No-signalling: entanglement gives correlations, not messages |
| 3 · ONE OF ONE | Teleport the authorization to the tower | A Bell measurement gives two classical bits. You pick the receiver's corrections. The original is consumed | Teleportation: Bell pair + Bell measurement + two classical bits + X/Z corrections |

The teleportation rule the game checks: **m0** is the SOURCE READOUT and **m1** is the LOCAL BELL-HALF READOUT. The receiver applies **X if m1 = 1** and **Z if m0 = 1**.

What the game does not claim: nothing travels faster than light, no unknown state is ever copied, no matter is teleported, and simulator output is not "certified quantum randomness" or proof of quantum advantage.

## How to play

1. Open this page in **Chrome, Edge, Brave, Opera or Firefox 153+** on a desktop or laptop. Safari, iPhone and iPad cannot run Qollab projects.
2. Press **Run on Qollab**, pick **Built-in simulator (24q)** under *Locally Run Simulators*, and press **Run**. No sign-in or credits are needed for the local simulators.
3. Click the game once so it has keyboard focus.

| Key | Action |
|---|---|
| W A S D or arrow keys | Move |
| Mouse (click to capture, or drag) | Look around |
| Shift | Sprint |
| E | Interact |
| Enter / Space | Continue dialogue |
| Esc | Pause / back |

Captions are always on. The pause menu has caption style (standard or high-contrast), reduced motion, text size, graphics quality and volume.

<!-- FILL AFTER OVERSEER RUN: expected load time and what the player sees first, measured on Qollab -->

## Truthful quantum: what runs where

**Every puzzle runs locally.** Each mission calls Python modules in `quantum/` through Qollab's Pyodide bridge. They compute exact results with Qiskit's `Statevector`, `partial_trace` and `state_fidelity`, inside your browser. No puzzle answer is hard-coded or looked up by state name: whether two outputs are independent copies, whether the receiver's statistics changed, and how close the teleported state is to the original are all computed from the circuit.

**One job goes to the backend you selected.** A run sends at most one job to the backend picked in *Select QPU*: a two-qubit Bell circuit (H on q0, CNOT q0 → q1, measure both), 256 shots. IonQ backends accept one job per run, so the game never calls the selected backend for puzzle feedback. That job checks Bell correlations, and its sampled counts are shown labelled with the backend's name.

**Every number is labelled with where it came from.** Each result the game shows carries an engine label: `exact_qiskit_local` for the exact local computation, or `qollab_selected_backend` for the one sampled job. An exact local result carries probabilities only, never sampled counts.

**The authorization is used once.** You may run as many teleportation dry runs as you like, each on a fresh random calibration state, and every wrong X/Z choice visibly drops the fidelity. Only after a correct dry run can you commit. The real commit then makes a new Bell measurement with its own bits, applies the rule you calibrated, and consumes the original. Once a commit has returned its result, pressing commit again only shows that same result.

**Backend runs recorded so far.**

| Backend | Status |
|---|---|
| Qollab Built-in simulator | A platform smoke build ran on Qollab (Three.js scene and local Qiskit through the bridge). The full game: <!-- FILL AFTER OVERSEER RUN --> |
| IonQ simulator on Qollab | Untested <!-- FILL AFTER OVERSEER RUN --> |
| IonQ hardware | Not used |

## How it works

| Mission | Circuit (local, exact) | What the game reads from it |
|---|---|---|
| THE COPY | prepare q0 in \|0⟩, \|1⟩ or \|+⟩; CX(q0, q1) | fidelity of the output with two independent copies; purity of each output after `partial_trace` |
| THE CONNECTION | H(q0); CX(q0, q1); then I, X or Z on q0 | the receiver's reduced state (`partial_trace` over q0) and its exact marginal probabilities |
| ONE OF ONE | q0 = source, q1 = local Bell half, q2 = receiver; H(q1); CX(q1, q2); CX(q0, q1); H(q0); measure q0 → m0, q1 → m1 | the receiver's state for the measured bits after your X/Z choice, and its `state_fidelity` with the source |

Files in this project:

- `main.js`: the entry point Qollab runs.
- `contracts.js`: the quest state machine, the result shape every quantum call must match, and the teleportation pass mark (fidelity ≥ 0.999999).
- `quantum/`: the Python modules (`cloning.py`, `entanglement.py`, `teleportation.py`, `qollab_job.py`) and `bridge.js`, which validates every Python result before the game uses it. An invalid result shows an honest "scientific module error" instead of a made-up number.
- `CONTRACTS.md`: how the parts of the game talk to each other.

## What is new here

Most quantum learning tools show you a circuit first and explain the result afterwards. ECHO puts a practical problem first: you try the obvious approach, watch it fail for a physical reason, and only then see the circuit. The three missions are linked by cause: copying fails, so you try entanglement. Entanglement alone carries no message, so you repair a classical link. With both, teleportation works.

## Accessibility

The game targets WCAG 2.2 AA. Checks actually run so far: <!-- FILL AFTER ACCESSIBILITY CHECKS: list each check, tool and result -->

## Built during the hackathon

Everything in this project was written during the hackathon window, starting Oct 9, 2026, 19:00 ET. We used AI coding assistants (Claude Code) to write and review the code and docs.

Third-party software, loaded by Qollab and not bundled here:

| Software | Used for | License |
|---|---|---|
| three.js 0.186.1 | 3D rendering | MIT |
| Pyodide | Python in the browser | MPL-2.0 |
| Qiskit 2.5.x | quantum circuits and exact simulation | Apache-2.0 |

## Credits

Team **The Quantubians** (NYU Tandon School of Engineering): Udaya (captain), George, Harman, Epa.

## License

MIT License, copyright (c) 2026 udsy19 and contributors.

This effort is supported by Qollab & IonQ
