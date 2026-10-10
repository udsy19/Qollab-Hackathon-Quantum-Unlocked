# ECHO: ONE OF ONE — the full script, in play order

Rendered by `evidence/story-ui/story-data/render-script.mjs` from `echo/data/{story,objectives,teachback}.js`. Do not edit by hand.

**Key:** *(verbatim §x)* = quoted word for word from `ECHO_MASTER_VISION.md` (the check verifies this against the doc). ✎ = new text written for this script; the owner should review it. `{n}` and similar are slots the game fills in.

## TITLE

> **ECHO: ONE OF ONE** ✎

## OPENING

> Title card: **NACRE CITY // 02:17 AM** *(verbatim §4.1)*  
> Billboard: **NOTHING EVER HAS TO END** *(verbatim §4.1)*

- **MIRROR:** Public safety measure active. District Nine. *(verbatim §4.1)*
- **MIRROR:** Grid isolation in eleven minutes and fifty-nine seconds. *(verbatim §4.1)*
- **MICA:** Rin. Backup generator is dying. Did you get it? *(verbatim §4.1)*
- **RIN:** I have the authorization. *(verbatim §4.1)*
- **MICA:** Then copy it. Send one to the tower. Bring the other to me. *(verbatim §4.1)*
- **RIN:** I can't copy this one. _[looks at capsule]_ *(verbatim §4.1)*
- **MICA:** That's not funny. *(verbatim §4.1)*
- **RIN:** It wasn't supposed to be. *(verbatim §4.1)*
- **MICA:** Palisade copies everything. It says so on every billboard. ✎
- **RIN:** Palisade copies data. This is a qubit. ✎
- **RIN:** There's a booth on this block. I'll show you. ✎

## FREE_ROAM_ALLEY

**HUD:** OBJECTIVE 01 — FIND AN AUTHORIZED REPLICATION BOOTH *(verbatim §4.1)*


*Hints (`alley`, on request, no penalty):*
1. _inspect_ — Scan the street (Q). One shopfront on this block is still lit. ✎
2. _resource_ — Palisade replication booths copy things. Rin wants to test one. ✎
3. _operation_ — Walk to the glowing booth and press E. ✎

---

# MISSION 1 · THE COPY

## CLONE_INTRO

**HUD:** OBJECTIVE 01 — TEST THE BOOTH ON |0> AND |1> ✎

- **VEGA:** Maintenance override accepted. Hello, courier. ✎
- **VEGA:** Test chamber only. Your token stays sealed in its capsule. ✎
- **VEGA:** I prepare fresh calibration states for every test. Try your old method first. ✎

*Hints (`clone_basis`, on request, no penalty):*
1. _inspect_ — Check the TEST INPUT row. Which states can the booth load? ✎
2. _resource_ — Start with the plain basis states |0> and |1>. ✎
3. _operation_ — Load |0> and press DUPLICATE. Then do the same with |1>. ✎

## CLONE_BASIS_PASSED

**HUD:** OBJECTIVE 01 — TEST THE BOOTH ON |+> ✎

- **VEGA:** |0> in, |00> out. |1> in, |11> out. Both basis values matched. ✎
- **RIN:** Zero and one always copy. That was never the problem. ✎
- **VEGA:** Then try a state that is not just 0 or 1. ✎

*Hints (`clone_superposition`, on request, no penalty):*
1. _inspect_ — One test input has not been tried yet. ✎
2. _resource_ — |+> is a superposition, like the real token. 0 and 1 were special cases. ✎
3. _operation_ — Load |+> and press DUPLICATE. ✎

## CLONE_SUPERPOSITION_FAILED

**HUD:** OBJECTIVE 01 — DECIDE WHAT TO DO ABOUT THE FAILED COPY ✎

- **VEGA:** Two outputs. Not two copies. ✎
- **VEGA:** Read either output alone and it is 50/50 in every basis: pure noise. ✎
- **VEGA:** Together they form one entangled pair. Neither is a |+>. ✎
- **VEGA:** Your call, courier. More power, or a different route? ✎

*Reaction `clone_increase_voltage`:*
- **VEGA:** Voltage up forty percent. Same result. ✎
- **VEGA:** Not a power problem. It is a rule of physics. ✎

*Failure lines (`cloning`, shown when the player gets it wrong):*
- `plus_not_copied`: Two outputs, one entangled pair. Each output alone is random, not a copy of |+>. ✎
- `increase_voltage`: Voltage raised. Same result. The limit is a rule of physics, not a power shortage. ✎

*Hints (`clone_deduction`, on request, no penalty):*
1. _inspect_ — Press WHY DID THAT FAIL? and read each output on its own. ✎
2. _resource_ — More power changes nothing. One unknown state cannot become two. ✎
3. _operation_ — Choose REROUTE, DO NOT DUPLICATE. ✎

## CLONE_UNDERSTOOD

**HUD:** OBJECTIVE 01 — LEAVE THE BOOTH ✎

- **VEGA:** It's not defective. You're asking the machine to make two unknowns out of one. *(verbatim §4.2)*
- **RIN:** Then we stop trying to make two. *(verbatim §4.2)*
- **VEGA:** There is an old entanglement relay under the substation. Coordinates sent. ✎

> Learning text: **CNOT copies a known computational-basis bit, but not an arbitrary unknown qubit.** *(verbatim §4.2)*

*Hints (`clone_exit`, on request, no penalty):*
1. _inspect_ — Open the journal (Tab). VEGA left you something. ✎
2. _resource_ — VEGA sent coordinates for an old entanglement relay. ✎
3. _operation_ — Leave the booth and head for the substation passage. ✎

*Journal unlocks — THE COPY:* CNOT copies a known computational-basis bit, but not an arbitrary unknown qubit. *(verbatim §4.2)*

---

# MISSION 2 · THE CONNECTION

## RELAY_UNLOCKED

**HUD:** OBJECTIVE 02 — FIND THE OLD ENTANGLEMENT RELAY ✎

- **MIRROR:** District Nine shelter occupancy classified: evacuable. ✎
- **MIRROR:** Load shedding proceeding on schedule. ✎
- **MICA:** Rin? _[radio static]_ *(verbatim §4.2)*
- **RIN:** Still here. Copying is out. I'm finding another way. ✎

*Hints (`relay_reach`, on request, no penalty):*
1. _inspect_ — Follow the guide arrows. Scan (Q) if you lose them. ✎
2. _resource_ — The relay chamber is under the substation. ✎
3. _operation_ — Go down the substation passage and press E at the relay core. ✎

## RELAY_INTRO

**HUD:** OBJECTIVE 02 — RESTORE THE ENTANGLEMENT RELAY *(verbatim §6.3)*

- **VEGA:** Relay maintenance core online. Fully awake, at last. _[power switch wakes the relay; VEGA projects at full size]_ ✎
- **VEGA:** This relay stores one half of many entangled pairs. ✎
- **VEGA:** Each partner half waits at the vault's receiver. ✎
- **RIN:** Palisade shared those pairs years ago, before any of this. Kept cold ever since. ✎
- **VEGA:** Don't spend vault pairs on experiments. Use the test rig. ✎
- **VEGA:** Same physics, with both halves in this room. ✎

*Hints (`relay_bell`, on request, no penalty):*
1. _inspect_ — Check the relay console. Which control is lit? ✎
2. _resource_ — The test rig needs an entangled pair before anything else. ✎
3. _operation_ — Press PREPARE BELL PAIR. ✎

## RELAY_BELL_CREATED

**HUD:** OBJECTIVE 02 — TRY TO SEND A MESSAGE WITH THE PAIR ALONE ✎

- **VEGA:** Test pair ready. Left half is yours. The right half plays the receiver. ✎
- **VEGA:** The endpoints share a prepared resource. Correlation is not a message. *(verbatim §4.3)*
- **RIN:** If the pair can carry the token alone, we're done. Test it. ✎

*Hints (`relay_send`, on request, no penalty):*
1. _inspect_ — Your half has three actions: I, X and Z. The receiver panel is on the right. ✎
2. _resource_ — So far the pair is the only link you are using. ✎
3. _operation_ — Pick any sender action and press SEND. ✎

## RELAY_SEND_FAILED

**HUD:** OBJECTIVE 02 — CHECK WHAT THE RECEIVER ACTUALLY SEES ✎

- **VEGA:** Receiver-only data: 50% / 50%. No decodable message. *(verbatim §4.3)*
- **VEGA:** What does the receiver actually know? *(verbatim §2.2)*

*Failure lines (`bell_signalling`, shown when the player gets it wrong):*
- `sender_I`: Sender did nothing (I). Receiver-only data: 50% / 50%. ✎
- `sender_X`: Sender flipped its half (X). The receiver alone still sees 50% / 50%. ✎
- `sender_Z`: Sender phase-flipped its half (Z). The receiver alone still sees 50% / 50%. ✎
- `no_message`: Receiver-only data: 50% / 50%. No decodable message. ✎
- `classical_missing`: The receiver sees random local results; the classical channel is still missing. ✎

*Hints (`relay_marginal`, on request, no penalty):*
1. _inspect_ — Try I, X and Z in turn. Compare the receiver-only numbers each time. ✎
2. _resource_ — What does the receiver actually know? Only its own results. ✎
3. _operation_ — Open RECEIVER-ONLY DATA and confirm it reads 50% / 50%. ✎

## RELAY_UNDERSTOOD

**HUD:** OBJECTIVE 02 — TAKE THE AMBER LINE UP TO THE ROOFTOP ✎

- **VEGA:** Put both logs side by side: after I they always match. ✎
- **VEGA:** After X they never match. The pattern is real. ✎
- **VEGA:** But comparing logs takes an ordinary message. The receiver alone sees noise. ✎
- **VEGA:** You still need the message. *(verbatim §2.2)*
- **VEGA:** Old maintenance blueprint. A classical service line runs up to the rooftop tower. ✎
- **MICA:** So the secret can't just travel down that blue cable? *(verbatim §4.3)*
- **RIN:** The blue link makes transfer possible. *(verbatim §4.3)*
- **RIN:** The amber one tells the other side what to do. *(verbatim §4.3)*
- **VEGA:** Rooftop access unlocked. The amber line's far end is up there. ✎

*Reaction `relay_bay_cable`:*
- **VEGA:** Amber line patched at this end. The rest of it runs up to the roof. ✎

*Hints (`relay_exit`, on request, no penalty):*
1. _inspect_ — VEGA's blueprint shows a second line. What colour is it? ✎
2. _resource_ — The amber classical line runs up to the rooftop tower. ✎
3. _operation_ — Take the elevator corridor up to the roof. ✎

*Journal unlocks — THE CONNECTION:* An entangled pair gives correlations, not messages. Alone, the receiver always sees 50/50. ✎

---

# MISSION 3 · ONE OF ONE

## ROOFTOP_UNLOCKED

**HUD:** OBJECTIVE 03 — ROUTE THE AMBER LINE THROUGH THREE JUNCTIONS ✎

- **MIRROR:** Grid isolation imminent. Shelter systems on reserve power. ✎
- **MICA:** The lights on our floor just went out. Rin, hurry. ✎
- **VEGA:** Three junctions between you and the mast. Patch the amber line through each. ✎

*Failure lines (`link_repair`, shown when the player gets it wrong):*
- `wrong_junction`: No signal reaches that junction yet. Patch the one the glow stops at. ✎

*Hints (`link_repair`, on request, no penalty):*
1. _inspect_ — Scan (Q) the roof. Three junctions are dark. ✎
2. _resource_ — The amber line carries ordinary bits. It has to reach the mast. ✎
3. _operation_ — Press E at each junction, following the glow, until the mast lights. ✎

## LINK_REPAIRED

**HUD:** OBJECTIVE 03 — OPEN THE TRANSMISSION CONSOLE ✎

- **VEGA:** Classical link online. It carries ordinary bits at ordinary speed. ✎
- **RIN:** Blue for the pair. Amber for the bits. Now the console. ✎

*Hints (`teleport_open`, on request, no penalty):*
1. _inspect_ — The console by the mast just woke up. ✎
2. _resource_ — You have both now: the blue Bell pair and the amber line. ✎
3. _operation_ — Press E at the transmission console to start a dry run. ✎

## TELEPORT_DRY_RUN

**HUD:** OBJECTIVE 03 — SET THE RECEIVER CORRECTIONS ON A TEST STATE ✎

- **VEGA:** Not the token yet. A fresh test state first. ✎
- **VEGA:** This console has a test rig. Both Bell halves stay here. ✎
- **VEGA:** Only COMMIT spends a vault pair. ✎
- **VEGA:** A Bell measurement on the source and your half gives two bits: m0 and m1. ✎
- **VEGA:** The amber line carries them to the receiver. You choose its fix. ✎

*Reaction `teleport_dry_run_failed`:*
- **VEGA:** That test state is spent. Here is a fresh one. Check the rule again. ✎

*Reaction `teleport_commit_locked`:*
- **VEGA:** Not yet. The token gets one try. Prove a correction on a test state first. ✎

*Failure lines (`teleportation`, shown when the player gets it wrong):*
- `missing_X`: m1 = 1 but X was off. The bit flip that m1 = 1 flags was never undone. ✎
- `missing_Z`: m0 = 1 but Z was off. The phase flip that m0 = 1 flags was never undone. ✎
- `extra_X`: X was on but m1 = 0. That X added a bit flip the bits never called for. ✎
- `extra_Z`: Z was on but m0 = 0. That Z added a phase flip the bits never called for. ✎
- `blind_spot`: On this test state that mistake happens to look harmless. It would fail on most others. ✎
- `commit_locked`: Commit locked. First pass a dry run whose bits are not 00: the token can be measured only once. ✎
- `already_committed`: Transfer complete. The source was measured; there is nothing left to send. ✎

*Hints (`teleport_correct`, on request, no penalty):*
1. _inspect_ — Read the two bits: m0 is the source readout, m1 is your Bell half. ✎
2. _resource_ — The amber line carries m0 and m1 to the receiver. Each bit controls one fix. ✎
3. _operation_ — Apply X if m1 = 1 and Z if m0 = 1. ✎

## TELEPORT_DRY_RUN_PASSED

**HUD:** OBJECTIVE 03 — COMMIT THE ONE-WAY TRANSFER ✎

- **VEGA:** Receiver matches the test state. Those corrections were right. ✎
- **VEGA:** The live run gives its own bits. The receiver applies the same rule. ✎
- **VEGA:** Commit measures the token. There is no second try. ✎
- **RIN:** One of one. ✎

*Hints (`teleport_commit`, on request, no penalty):*
1. _inspect_ — Check the capsule. The token is still STATE PRESENT. ✎
2. _resource_ — Your corrections worked on a test state. The token can be measured only once. ✎
3. _operation_ — Press COMMIT ONE-WAY TRANSFER. ✎

## TELEPORT_COMMITTED

**HUD:** OBJECTIVE 03 — TRANSFER IN PROGRESS ✎

- **VEGA:** Bell measurement done. Two bits sent down the amber line. ✎
- **VEGA:** Receiver corrected. Your source was measured. ✎
- **VEGA:** The state now exists only at the vault. ✎
- **MIRROR:** Emergency authorization accepted. District Nine grid isolation aborted. *(verbatim §4.4)*

*Journal unlocks — THE TRANSFER:* Bell pair + Bell measurement + two classical bits + X/Z corrections moved the state. The original was consumed. ✎

## ENDING

- **MICA:** Rin? Did you make it? *(verbatim §4.4)*
- **RIN:** No. I sent it. *(verbatim §4.4)*
- **MICA:** But you still have it, right? *(verbatim §4.4)*
- **RIN:** Not anymore. *(verbatim §4.4)*

> On screen: **You didn't copy the information. You transferred it.** *(verbatim §4.4)*  
> Title: **ECHO / ONE OF ONE** *(verbatim §4.4)*

---

# DECLASSIFIED

## THE COPY *(verbatim §4.5)*

- **What I did:** Fed three prepared test states into a duplication booth: |0>, |1> and |+>. ✎
- **What the qubits did:** The booth runs a CNOT from the input onto a blank |0>. For |0> and |1> the blank ends up matching. For |+> the two qubits become one entangled pair. ✎
- **Exact gates:** `prepare input on q0 · CX(q0, q1)`
- **Expected data:**
  - |0>  →  |00>
  - |1>  →  |11>
  - |+>  →  (|00> + |11>)/√2
  - Purity of each output for |+>: 0.5 (an ideal, independent |+> has purity 1).
- **Misconception:** "If a machine can copy 0 and 1, it can copy anything." — A copier can only be built for a known set of perfectly distinguishable states, like 0 and 1. No machine can perfectly copy an arbitrary unknown qubit: that is the no-cloning theorem. Ordinary data copies fine. ✎

## THE CONNECTION *(verbatim §4.5)*

- **What I did:** Prepared an entangled test pair, applied I, X or Z to the sender half, and read the receiver half alone. ✎
- **What the qubits did:** Whatever the sender did, the receiver's own results stayed 50/50. The sender's action only changed how the two logs line up when compared. ✎
- **Exact gates:** `H(q0) · CX(q0, q1) · sender applies I, X or Z to q0 · measure q1`
- **Expected data:**
  - Receiver alone: P(0) = 0.5, P(1) = 0.5 for I, X and Z.
  - Receiver's reduced state: I/2 in every case.
  - Compared logs after I: results always match. After X: they always differ.
- **Misconception:** "Entanglement sends the secret instantly." — An entangled pair is a shared resource, not a channel. Seeing the correlation needs both logs brought together by an ordinary message, which is no faster than any other signal. ✎

## THE TRANSFER *(verbatim §4.5)*

- **What I did:** Measured the source together with my Bell half, sent the two bits over the amber line, and set the receiver corrections. Then committed the real token once. ✎
- **What the qubits did:** The Bell measurement destroyed the source's state and produced two random bits. The receiver's half became the source state up to a known flip, which the bits undid. ✎
- **Exact gates:** `H(q1) · CX(q1, q2) · CX(q0, q1) · H(q0) · measure q0 → m0, q1 → m1 · X on q2 if m1 = 1 · Z on q2 if m0 = 1`
- **Expected data:**
  - m0 = 0, m1 = 0: no correction
  - m0 = 0, m1 = 1: X
  - m0 = 1, m1 = 0: Z
  - m0 = 1, m1 = 1: X then Z
  - Receiver fidelity with the test state: 1 in every branch, ideal maths.
- **How it was verified:** The verification circuit replaces the measurement and the bits with controlled gates (CX(q1, q2), CZ(q0, q2)). That is the deferred-measurement principle, a valid check of the maths. It is not how separated stations work: in the story the corrections ride on two classical bits. ✎
- **Misconception:** "Teleportation moves the capsule, or leaves Rin a spare copy." — Only quantum information moved, and the original was consumed by the measurement. The physical capsule stayed on Rin's wrist, now without the state. ✎

*Provenance note:* Puzzle numbers come from exact Qiskit statevector maths running locally in your browser. Simulator counts are samples drawn by a classical simulation of the circuit. ✎

## Teach-back (optional, no score)

1. **Why didn't the copying machine work on the unknown state?** *(verbatim §4.5)*
   - Answer: Its CNOT only copies 0 and 1. On a superposition it makes an entangled pair instead, and no machine can perfectly copy an arbitrary unknown qubit. ✎
   - ✔ "No machine can perfectly copy an arbitrary unknown qubit; CNOT only copies 0 and 1." → Yes. The |+> test made one entangled pair, not two copies. ✎
   - ✘ "The booth needed more power." → Raising the voltage changed nothing. It is a rule of physics, not a power limit. ✎
   - ✘ "Quantum states cannot be stored at all." → Rin's capsule stores one fine. The rule is about copying an unknown state, not storing it. ✎
2. **Why was entanglement alone insufficient?** *(verbatim §4.5)*
   - Answer: The receiver's own results are 50/50 whatever the sender does. A pattern only shows when both logs are compared, and that needs an ordinary message. ✎
   - ✔ "The receiver's results alone stay 50/50, so they carry no message." → Yes. Correlation is not a message. ✎
   - ✘ "The entangled pair was too old and had decayed." → The pair worked: compared logs showed perfect correlation. It still could not carry a message alone. ✎
   - ✘ "Entanglement delivers the message, but too slowly." → It delivers no message at all. The receiver alone sees 50/50 whatever the sender does. ✎
3. **What did the classical bits control after the Bell measurement?** *(verbatim §4.5)*
   - Answer: Which correction the receiver applies: X if m1 = 1, Z if m0 = 1. Without them the receiver cannot know which fix its half needs. ✎
   - ✔ "The receiver corrections: X if m1 = 1, Z if m0 = 1." → Yes. Two bits pick one of four fixes. ✎
   - ✘ "They carried the quantum state itself." → Two bits cannot hold a qubit. The state needed the Bell pair; the bits only said how to finish. ✎
   - ✘ "They told the vault the password." → The vault checked the recovered state. The bits only chose the X and Z corrections. ✎

---

# CREDITS

- ECHO: ONE OF ONE
- Team The Quantubians (NYU Tandon School of Engineering): Udaya (captain), George, Harman, Epa
- This effort is supported by Qollab & IonQ
- Code: MIT License, udsy19 and contributors
- Built with three.js (MIT) and Qiskit (Apache-2.0), running in Pyodide (MPL-2.0) on Qollab.
- TODO_OWNER: third-party assets and their licenses (art lane to list; none yet)
- Thank you for playing.

---

# Appendix: HUD and terminal copy

- `HUD.header`: ECHO // DISTRICT 09 *(verbatim §6.3)*
- `HUD.objectivePrefix`: OBJECTIVE ✎
- `HUD.countdownLabel`: GRID SHUTDOWN *(verbatim §6.3)*
- `HUD.countdownAborted`: GRID ISOLATION ABORTED ✎
- `HUD.countdownHeld`: ISOLATION HELD // AWAITING CONFIRMATION ✎
- `HUD.capsuleLabel`: Q-SOURCE ✎
- `HUD.capsulePreserved`: PRESERVED *(verbatim §6.3)*
- `HUD.capsuleConsumed`: MEASURED / CONSUMED ✎
- `HUD.interact`: [E] INTERACT *(verbatim §6.3)*
- `HUD.hintButton`: HINT ✎
- `HUD.hintCounter`: HINT {n} OF 3 ✎
- `HUD.interactLabels.copy_booth`: REPLICATION BOOTH *(verbatim §9.4)*
- `HUD.interactLabels.relay_core`: QUANTUM RELAY *(verbatim §9.4)*
- `HUD.interactLabels.classical_socket`: LEGACY DATA LINK *(verbatim §9.4)*
- `HUD.interactLabels.teleport_terminal`: TRANSMISSION CONSOLE ✎
- `HUD.tooltips.move`: WASD  MOVE ✎
- `HUD.tooltips.sprint`: SHIFT  SPRINT ✎
- `HUD.tooltips.interact`: E  INTERACT ✎
- `HUD.tooltips.scan`: Q  FIELD SCAN ✎
- `HUD.tooltips.journal`: TAB  JOURNAL ✎
- `HUD.tooltips.pause`: ESC  PAUSE ✎
- `HUD.scans.copy_booth`: PALISADE DUPLICATION SERVICES. CLASSICAL DATA COPIER. MAINTENANCE PORT OPEN. ✎
- `HUD.scans.relay_core`: ENTANGLEMENT RELAY. BELL HALVES IN COLD STORAGE. PARTNERS: VAULT RECEIVER. TEST RIG ON SITE. ✎
- `HUD.scans.classical_socket`: LEGACY DATA LINK. CLASSICAL. THREE JUNCTIONS DARK. ✎
- `HUD.scans.teleport_terminal`: TRANSMISSION CONSOLE. NEEDS: BELL PAIR + CLASSICAL LINK. ✎
- `TERMINALS.copy_booth.title`: PALISADE / DUPLICATION UNIT / MAINTENANCE OVERRIDE *(verbatim §6.4)*
- `TERMINALS.copy_booth.inputLabel`: TEST INPUT ✎
- `TERMINALS.copy_booth.inputMode`: PREPARED CALIBRATION STATE *(verbatim §6.4)*
- `TERMINALS.copy_booth.duplicate`: DUPLICATE ✎
- `TERMINALS.copy_booth.basisResult`: TWO BASIS VALUES MATCHED: YES ✎
- `TERMINALS.copy_booth.superpositionResult`: TWO INDEPENDENT COPIES: NO *(verbatim §4.2)*
- `TERMINALS.copy_booth.whyFail`: WHY DID THAT FAIL? *(verbatim §6.4)*
- `TERMINALS.copy_booth.tryAnother`: TRY ANOTHER STATE *(verbatim §6.4)*
- `TERMINALS.copy_booth.showWhy`: SHOW ME WHY ✎
- `TERMINALS.copy_booth.skipDemo`: SKIP DEMONSTRATION ✎
- `TERMINALS.copy_booth.choiceVoltage`: INCREASE VOLTAGE ✎
- `TERMINALS.copy_booth.choiceReroute`: REROUTE, DO NOT DUPLICATE ✎
- `TERMINALS.copy_booth.learning`: CNOT copies a known computational-basis bit, but not an arbitrary unknown qubit. *(verbatim §4.2)*
- `TERMINALS.relay_core.title`: NACRE MUNICIPAL / ENTANGLEMENT RELAY / TEST RIG ✎
- `TERMINALS.relay_core.prepare`: PREPARE BELL PAIR ✎
- `TERMINALS.relay_core.senderLabel`: SENDER ACTION ON ITS HALF ✎
- `TERMINALS.relay_core.send`: SEND ✎
- `TERMINALS.relay_core.receiverOnly`: RECEIVER-ONLY DATA ✎
- `TERMINALS.relay_core.compared`: COMPARED PAIRED DATA ✎
- `TERMINALS.relay_core.comparedNote`: Needs both logs, brought together by an ordinary message. ✎
- `TERMINALS.relay_core.statusReady`: ENTANGLEMENT READY *(verbatim §4.3)*
- `TERMINALS.relay_core.statusClassical`: CLASSICAL LINK: OFFLINE ✎
- `TERMINALS.teleport_terminal.title`: ECHO // TRANSMISSION CONSOLE *(verbatim §6.5)*
- `TERMINALS.teleport_terminal.stateLabel`: STATE ✎
- `TERMINALS.teleport_terminal.statePresent`: STATE PRESENT *(verbatim §4.4)*
- `TERMINALS.teleport_terminal.stateConsumed`: STATE MEASURED / CONSUMED *(verbatim §4.4)*
- `TERMINALS.teleport_terminal.bellReady`: BELL PAIR: READY *(verbatim §6.5)*
- `TERMINALS.teleport_terminal.classicalOnline`: CLASSICAL LINK ONLINE *(verbatim §4.4)*
- `TERMINALS.teleport_terminal.slotSource`: SOURCE ✎
- `TERMINALS.teleport_terminal.slotLocal`: LOCAL BELL HALF ✎
- `TERMINALS.teleport_terminal.slotRemote`: RECEIVER BELL HALF ✎
- `TERMINALS.teleport_terminal.measure`: EXECUTE BELL MEASUREMENT ON TEST STATE *(verbatim §6.5)*
- `TERMINALS.teleport_terminal.m0Label`: SOURCE READOUT m0 ✎
- `TERMINALS.teleport_terminal.m1Label`: LOCAL BELL-HALF READOUT m1 ✎
- `TERMINALS.teleport_terminal.planTitle`: RECEIVER CORRECTION PLAN *(verbatim §6.5)*
- `TERMINALS.teleport_terminal.planRowTemplate`: IF m0 = {m0}, m1 = {m1}:  X [{x}]  Z [{z}] ✎
- `TERMINALS.teleport_terminal.verify`: VERIFY DRY RUN *(verbatim §6.5)*
- `TERMINALS.teleport_terminal.fidelityLabel`: Receiver test fidelity *(verbatim §6.5)*
- `TERMINALS.teleport_terminal.commit`: COMMIT ONE-WAY TRANSFER *(verbatim §4.4)*
- `TERMINALS.teleport_terminal.receiverRecovered`: STATE RECOVERED *(verbatim §4.4)*
- `TERMINALS.teleport_terminal.vaultAccepted`: VAULT: AUTHORIZATION ACCEPTED ✎

*Spoken words across all beats: 671.*
