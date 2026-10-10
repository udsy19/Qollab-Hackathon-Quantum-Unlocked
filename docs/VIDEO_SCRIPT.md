# ECHO: ONE OF ONE · demo video script (2:40)

A screen recording of the real game running on the Qollab project page, with voice-over. Built from vision §15's suggested 2:40 table, re-cut so every shot is a quest state from `echo/contracts.js` (`QUEST_STATE_LIST`) that the recorder can actually reach.

**Recording rules** (vision §15, §7.5; `.claude/rules/qollab-runtime.md`):
- Record only genuine gameplay and real output. No concept art passed off as the game. If a shot is not built by recording day, cut it and lengthen a neighbour; do not fake it.
- Record in Chrome on the Qollab page, Built-in simulator (24q), 1080p. Captions stay on (they are always on).
- Shot 8 shows the ONE selected-backend job. Show the backend name on screen. Say "IonQ simulator" only if that run was recorded in `lanes/platform/owner-answers.md`; otherwise record it on the Built-in simulator and say "the selected simulator".
- Never say: "faster than light", "instant message", "copied the state", "teleported matter", "certified quantum random", "runs on IonQ hardware".
- Upload to YouTube (public or unlisted, no sign-in), the only host the Qollab page can embed. Then fill the `FILL AFTER VIDEO UPLOAD` line in `echo/README.md`.

## Shot list

| # | Time | Length | Quest state(s) | On screen | Voice-over |
|---|---|---|---|---|---|
| 1 | 0:00–0:12 | 0:12 | `TITLE` → `OPENING` | The Qollab page: Run on Qollab → Built-in simulator → Run. The game loads to the title; press Start. | "This is ECHO: One of One, a story game that runs in your browser on Qollab." |
| 2 | 0:12–0:30 | 0:18 | `OPENING` | Opening dialogue with captions: MIRROR's grid-isolation warning, Mica asking Rin to copy the authorization, "I can't copy this one." | "In Nacre City almost everything can be copied. The authorization that saves District Nine is a quantum state, and it can't be." |
| 3 | 0:30–0:42 | 0:12 | `FREE_ROAM_ALLEY` | Third-person: Rin walks and sprints down the rainy alley to the replication booth; the E prompt appears. | "It's a game, not a slide deck. You walk Rin through the city and use the machines yourself." |
| 4 | 0:42–1:05 | 0:23 | `CLONE_INTRO` → `CLONE_BASIS_PASSED` → `CLONE_SUPERPOSITION_FAILED` → `CLONE_UNDERSTOOD` | Booth terminal: \|0⟩ → 00 and \|1⟩ → 11 pass. \|+⟩ fails: TWO INDEPENDENT COPIES: NO, each output purity 0.5, engine label `exact_qiskit_local`. | "The copier is a CNOT. It copies zero and one. Feed it a superposition and you get one entangled pair, not two copies. That's the no-cloning theorem, computed live by Qiskit." |
| 5 | 1:05–1:30 | 0:25 | `RELAY_INTRO` → `RELAY_BELL_CREATED` → `RELAY_SEND_FAILED` → `RELAY_UNDERSTOOD` | Relay chamber: prepare the Bell pair, apply I, then X, then Z on the sender half. The receiver panel stays at EXACT 50 / 50 each time. | "So try entanglement. Whatever the sender does to their half, the receiver alone sees fifty-fifty. A shared Bell pair gives correlations, not a message." |
| 6 | 1:30–1:40 | 0:10 | `ROOFTOP_UNLOCKED` → `LINK_REPAIRED` | Rooftop: Rin reconnects the amber classical link at the socket. | "The missing piece is an ordinary classical link. Rin repairs it." |
| 7 | 1:40–2:05 | 0:25 | `TELEPORT_DRY_RUN` → `TELEPORT_DRY_RUN_PASSED` | Terminal: Bell measurement shows SOURCE READOUT m0 and LOCAL BELL-HALF READOUT m1. One wrong X/Z choice (fidelity drops), then the right one (fidelity 1.000000) on a fresh calibration state. | "Teleportation: a Bell measurement gives two bits. The receiver applies X if m1 is one and Z if m0 is one. Get it wrong and the fidelity drops. Get it right and the state is recovered, on a calibration state first." |
| 8 | 2:05–2:20 | 0:15 | `TELEPORT_DRY_RUN_PASSED` | The one selected-backend job: Bell circuit, 256 shots, counts with the backend name; console line beside it. | "Every puzzle runs locally with exact Qiskit in the browser. The game sends one job to the backend you selected: a Bell-correlation check, labelled with where it ran." |
| 9 | 2:20–2:33 | 0:13 | `TELEPORT_COMMITTED` → `ENDING` | COMMIT ONE-WAY TRANSFER. Source: STATE MEASURED / CONSUMED; receiver: STATE RECOVERED; city lights return; "Not anymore." | "Then the real transfer, once. The original is consumed by the measurement. Nothing was copied; it was transferred." |
| 10 | 2:33–2:40 | 0:07 | `DECLASSIFIED` → `CREDITS` | Declassified panel for a beat, then credits: Team The Quantubians, MIT, "This effort is supported by Qollab & IonQ". | "Play ECHO: One of One on Qollab. MIT licensed. Supported by Qollab and IonQ." |

**Total:** 0:12 + 0:18 + 0:12 + 0:23 + 0:25 + 0:10 + 0:25 + 0:15 + 0:13 + 0:07 = **2:40**.

`BOOT`, `RELAY_UNLOCKED` and the walk between missions are cut for time. Shot 8 is shown while the quest is at `TELEPORT_DRY_RUN_PASSED`; if the integrated build triggers the backend job at a different moment, film it there and keep the length.
