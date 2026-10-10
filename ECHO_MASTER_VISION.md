# ECHO: ONE OF ONE
## Complete vision, game design document, engineering specification, and production brief

**Version:** 1.0 — Qollab × IonQ 2026 hackathon edition  
**Genre:** Narrative third-person cyberpunk adventure / playable quantum education  
**Primary theme:** Quantum Unlocked  
**Primary submission:** Playable Qollab-native HTML/JS/Three.js experience backed by real Python/Qiskit circuits  
**Optional companion:** Higher-fidelity external React Three Fiber edition, built ONLY after primary submission is reliable  
**Submission:** October 11, 2026, 7:00 PM America/New_York (ET)  
**License:** MIT for project code, including externally hosted dependent repo(s)  
**Target playtime:** 8–12 minutes, first session  
**Development window:** 48 hours maximum, starting October 9, 2026, 7:00 PM ET

---

# 0. Instruction to Claude Code: read this before writing code

You are the lead game engineer, gameplay programmer, technical art director, and quantum software integrator for ECHO: ONE OF ONE. Your job is to build a WORKING, PLAYABLE, VISUALLY DISTINCTIVE third-person cyberpunk quantum puzzle game, not a landing page, mockup, slideshow, static prototype, or circuit tutorial with decorations.

**Never confuse product vision with current implementation.** Every feature described below has one of four statuses:

- **P0 REQUIRED:** Must work in Qollab-native runnable project to submit.
- **P1 POLISH:** High return for presentation; ship after P0 is end-to-end playable.
- **P2 STRETCH:** Only with meaningful time remaining.
- **POST-HACKATHON:** Ambitious full-game roadmap, never on the critical path.

At all times preserve these invariants:
1. A person can start the game, walk a character through an atmospheric 3D world, interact with three quantum devices, finish the story and see the ending.
2. Quantum mechanics are not faked with arbitrary dice rolls: real Qiskit circuit computations and explicit physical rules determine puzzle behavior.
3. Qollab's free built-in and IonQ simulator pathways are supported or demonstrably tested with documented compatibility differences; do not claim success without an actual run.
4. If external assets, shaders, sound, or backend fail, the game remains playable with an explicit fallback.
5. First-time players with no physics knowledge can solve puzzles through discoverable interactions, experimentation, progressive hints, and readable subtitles.
6. Absolutely do not build a visually impressive but functionally inert website.
7. Do not implement story shortcuts that falsely imply cloning unknown quantum information, faster-than-light signalling, or teleporting matter.
8. Work continuously in small slices that keep the project runnable; make commits and report tested outcomes at actual transitions.

Read `CLAUDE.md`, `ROADMAP_48_HOURS.md`, `CLAUDE_CODE_PROMPTS.md`, and `QOLLAB_DEPLOYMENT.md` together with this document.

---

# 1. Executive vision

## 1.1 Logline

In Nacre City, everything has a replica — buildings, memories, identities, and entire lives. But when an automated infrastructure shutdown threatens District Nine, a young courier must deliver the only authorization capable of stopping it: an unknown quantum state that cannot be perfectly copied. With no viable physical route, she must learn to transfer it by quantum teleportation before her sister loses power in a failing emergency shelter.

## 1.2 Thesis

ECHO is a **story that is impossible without quantum mechanics**. The quantum concepts are neither educational interruptions nor decorative jargon. They create the obstacles, define the rules of each puzzle, explain why conventional approaches fail, and make the final solution emotionally resonant.

**Tagline:** “In a world where everything can be copied, the one thing that can save us cannot.”

**Player fantasy:** Be a capable cyberpunk courier who hacks, repairs, and reactivates forgotten quantum infrastructure while navigating a collapsing city, without combat or meaningless collection quests.

**What players should feel:**
- Minute 0–2: I need to save somebody, and this world feels alive.
- Minute 2–4: Why did copying fail? That is strange.
- Minute 4–7: Entanglement is powerful, but it isn't magic communication.
- Minute 7–10: I have everything needed to solve this, if I understand the rules.
- Final minute: I transferred something without making a copy, and the consequence matters.

**What players should be able to explain after play:**
- A universal perfect copier for arbitrary unknown quantum states is impossible.
- A shared entangled state produces correlations but cannot alone transmit usable information at will.
- Quantum teleportation uses a pre-shared entangled pair, an appropriate sender measurement, and **two classical bits** to recover the state at the receiver; it consumes the sender's original.

## 1.3 Unique value / originality

Typical quantum games reveal qubits, circuits, and sliders first, then explain outcomes. ECHO inverts the experience: **the player encounters a practical narrative problem first, physically manipulates machinery, witnesses the consequence, and only then sees the quantum explanation**. A “Declassified” overlay connects their actions to reproducible circuit experiments.

Qollab requires more than a standard tutorial-level circuit. The original educational contribution is the integration of (a) a continuous environmental narrative, (b) three causally connected quantum constraints, (c) real Qiskit-backed feedback, and (d) an optional inspectable proof of why the successful action worked.

## 1.4 Project goals and measurable outcomes

| Goal | Metric / acceptance condition | Priority |
|---|---|---|
| Actually playable | Complete title → opening → three missions → ending with WASD/mouse/E | P0 |
| True quantum core | Test circuits for cloning failure, entanglement/no-signalling and teleportation correctness | P0 |
| Quantum education | First-time player can answer 3 teach-back questions after play; no required physics textbook | P0 |
| Qollab compliant | Runnable project on Qollab free local simulator, and compatible IonQ simulator mode tested | P0 |
| Attractive 3D world | One coherent cyberpunk district, believable scale, lighting, weather aesthetic, meaningful character silhouette | P0 |
| Accessibility | Subtitles, keyboard navigation for menus, readable interactive targets, reduced-motion option | P0 |
| Full-run reliability | Start-to-ending test passes 3 consecutive runs | P0 |
| Performance | Target ≥30 FPS on a mid-range laptop at 1080p with quality scaling; no unbounded stalls | P1 |
| Emotional landing | Final transfer triggers city-lighting reveal, sister dialogue, and credits | P0 |
| Public demo | 2–3-minute no-login video with real game, actual Qiskit evidence, and a reproducible explanation | P0 |
| AAA visuals | Native high-poly protagonist, complex animation, massive skyline, cinematic extras | POST-HACKATHON |

**Anti-goals:** No open-world scale, no combat, no driving, no procedural missions, no multiplayer, no microtransactions, no blockchain, no fake quantum speedup claims, no server-dependent gameplay loop, no game-over resulting from a non-pausing timer.

---

# 2. Story bible and world rules

## 2.1 Nacre City, 2189

Nacre is a layered coastal megacity: flood barriers, freight infrastructure, suspended rail corridors, vertical housing, holographic corporate advertisements, and aging municipal technologies hidden under gleaming retail infrastructure. Night is nearly permanent in the visual slice because of storm cloud cover and artificial illumination. Rain, reflections, turbine noise, announcement speakers, and distant sirens signal a functioning city without simulating hundreds of NPCs.

**Palisade Corporation** operates the MIRROR infrastructure layer, marketed under the slogan “NOTHING EVER HAS TO END.” Their ‘replication’ business concerns CLASSICAL digital information: archives, imagery, ordinary data, and machine-learned behavioral models. It does **not** mean they can clone an arbitrary unknown quantum state. This distinction underpins the game.

**District Nine** is an industrial residential zone scheduled for “controlled load shedding.” A cascading error in MIRROR's classification system incorrectly treats its remaining shelter population as evacuable; the automated grid shutdown is imminent.

**The Vault** accepts an authorization carried by a quantum information token in a fictionalized proof-of-concept security system. Scientific accuracy note: this is an educational speculative authorization device, not a claim that one qubit is a secure practical cryptographic scheme. The world uses appropriate quantum memory and an already distributed entangled pair; it does not materialize physical quantum communication infrastructure out of thin air.

## 2.2 Characters

### Rin Vale — protagonist

Age 27, former Palisade quantum network technician, now independent courier. Physically believable, tactical rather than militaristic. Speaks tersely and confidently, but becomes more vulnerable during calls with Mica. No supernatural powers, combat powers, or “chosen one” cliché. Carries a wrist-mounted shielded quantum capsule and a field scanner.

**Outfit:** Asymmetrical charcoal raincoat with subtle worn technical panels, small amber trim, dark utility trousers, boots, utilitarian scanner sleeve; avoid generic luminous armored cyber-ninja. Renderable MVP silhouette: head, coat, torso, legs, shoulder bag/capsule, simple loop animations. Do not require facial lip sync.

### Mica Vale — emotional anchor

Rin's younger sister, inside an emergency shelter. Present through radio transmissions only, making production economical. Her voice is lively, skeptical, and increasingly anxious. Her job is to make stakes human, not to lecture about physics. Use captions even if no recorded voice exists.

### VEGA — field assistant

Abandoned maintenance intelligence. Speaker/head-up projection living inside old terminals. Dry, occasionally funny, not omniscient. Guides discovery through questions and short phrases: “Try your old method first.” “What does the receiver actually know?” “You still need the message.”

### MIRROR — system voice and environmental antagonist

Formal and terrifyingly calm. Uses public safety jargon and optimization metrics. Is not evil sentient AI; its machine decisions reflect institutional abandonment. Can be conveyed through signage and short synthesized announcement-style lines.

## 2.3 Core motifs

- **Original vs replica:** A physical prop on Rin's wrist remains after teleportation; the source *quantum state* does not.
- **Two kinds of connection:** Cold cyan quantum relay and warm amber conventional data link; both are needed.
- **Light restoration:** Consequence expands from one street sign → local relay → entire district skyline.
- **Progressive revelation:** Machines should not explain everything before players try them.
- **Corporate slogan inversion:** “Nothing ever has to end” contrasts with quantum information that cannot be freely duplicated.

## 2.4 What not to claim in dialogue or UX

Never say “quantum entanglement transmits the secret instantly.” Never show a second independent copy of an unknown state. Never describe a simulator's sampled output as certified physical quantum randomness. Never frame measurement as a literal human eye looking at a particle. Never conflate the transport of quantum information with material teleportation. Avoid saying the no-cloning theorem prevents storage, authentication, or all forms of copying classical information.

---

# 3. Core gameplay and player experience

## 3.1 Third-person movement

- Over-the-shoulder follow camera, eye height ~1.5–1.7m above in-world ground plus offset, smooth damping.
- WASD camera-relative translation, mouse orbit, Shift sprint, E interact, Q field scan, Tab journal, Esc pause.
- Basic acceleration/deceleration, no ice skating; sprint speed ~1.6x walk speed.
- Pointer lock only while exploring; unlock when terminal, dialogue choice, pause, or browser focus changes.
- Disable interactions when obstructed, use visible distance cue (<2.5 m) and facing/nearby test; must not accidentally trigger terminals through walls.
- Collision constrained by broad bounding boxes for the corridor and rooms; character cannot fall through ground, leave map or clip through critical interfaces.
- Camera avoids walls as much as practical; MVP may use camera position clamps and fixed over-shoulder angles in tight interiors.
- Input works even with cinematic letterboxing; do not steal input if focus is on accessibility controls.
- Design for mouse+keyboard primary; responsive menu layout; optional touchscreen virtual joystick not P0.

## 3.2 Core player loop

1. Follow a narrative objective in the 3D world.
2. Encounter a seemingly impossible practical challenge.
3. Attempt an obvious “classical” or incomplete approach and see meaningful failure with no punishment.
4. Investigate physical clues, talk to VEGA, manipulate quantum hardware.
5. Watch Qiskit-derived evidence and environmental state update.
6. Unlock another place, learn a deeper physical rule, and advance the emotional stakes.
7. At the end, combine all rules to solve a single meaningful problem.

Each puzzle supports **Try → Observe result → Ask hint → Modify → Retry**. Do not gate progress behind obscure pixel-hunting or arbitrary timing challenges.

## 3.3 Interaction philosophy

Physical-first, math-second. A terminal's primary view is a tangible device with two or three action choices, strong visual metaphors, and clear immediate consequences. There is an optional “INSPECT THE SCIENCE” mode for the exact circuit diagram, counts, qubit roles and math.

Example for no-cloning: “DUPLICATE TOKEN” button → visible two capsule icons → scanner reports one input state became correlated two-qubit data, not two copies → VEGA: “A copied *bit* and a copied *qubit* aren't the same.” → inspect Qiskit `H(0), CX(0,1)` test and density output.

## 3.4 Game flow overview

`BOOT → TITLE → OPENING → FREE_ROAM_ALLEY → CLONE_BOOTH → RELAY_CORRIDOR → ENTANGLE_RELAY → ROOFTOP → TELEPORT_TERMINAL → FINAL_REVEAL → DECLASSIFIED → CREDITS`

Allow pause and restart chapter, skip opening after first view, reopen learning journal, and recover from reload at least to the title screen. Qollab runtime cannot persist game state between runs; never pretend save data works there.

---

# 4. Cinematic game script: playable vertical slice

## 4.1 Opening: “NOTHING EVER HAS TO END” (0:00–1:20)

**Shot A, 0:00–0:10:** Dark. Rain. Metallic ambient hum. Minimal title card “NACRE CITY // 02:17 AM”. Camera slowly moves past a billboard “NOTHING EVER HAS TO END.” Cold neon. A train crosses a distant elevated rail.

**Shot B, 0:10–0:24:** The camera looks across the city. A spreading blackout rolls through District Nine in clusters. The distant skyline still glows; our block flickers.

**MIRROR:** “Public safety measure active. District Nine. Grid isolation in eleven minutes and fifty-nine seconds.”

**Shot C, 0:24–0:44:** Camera descends to Rin, running through a wet service alley, clutching a wrist capsule. A tracking light approaches from above, then moves away. No need for enemy AI; use a searchlight sweep and sound.

**MICA, RADIO:** “Rin. Backup generator is dying. Did you get it?”

**RIN:** “I have the authorization.”

**MICA:** “Then copy it. Send one to the tower. Bring the other to me.”

**RIN:** [looks at capsule] “I can't copy this one.”

**MICA:** “That's not funny.”

**RIN:** “It wasn't supposed to be.”

**Shot D, 0:44–1:05:** Camera eases into over-the-shoulder gameplay angle. HUD fades in. Objective: “FIND AN AUTHORIZED REPLICATION BOOTH”. Ambient footsteps and rain.

**First teachable input:** WASD tooltip appears for 3 seconds, Shift tooltip only when player has moved, E prompt at booth. Narration never takes away agency longer than necessary.

## 4.2 Mission 1: THE COPY (1:20–4:00)

**Location:** A tired streetside “PALISADE DUPLICATION SERVICES” booth, repurposed by Rin as a testing station. Glass door, flickering signage, holographic preview panels, two capsule slots.

**Objective:** Attempt a duplicate in a safe test chamber. The story token stays protected; demonstrations use prepared calibration states.

**Beat 1 (warm-up):** Test a conventional classical bit/quantum basis state |0>. Player inserts a test pattern, presses COPY, and reads `0 → 00`. Success chime. Then test |1> and see `1 → 11`. This is intentionally persuasive but incomplete.

**Beat 2 (conflict):** Input a prepared |+> test qubit. Same CNOT-based copying attempt now produces Bell entanglement rather than independent copies. In the game's paired visualization, attempts to inspect each output separately yield an individually maximally mixed state. TEST FAILED: `TWO INDEPENDENT COPIES: NO`.

**Beat 3 (deduction):** Player selects one of two attempts: “increase voltage” (fails because rule is physical, not power) or “reroute, do not duplicate” (advances). Allow both, but don't punish wrong choice.

**VEGA:** “It's not defective. You're asking the machine to make two unknowns out of one.”

**RIN:** “Then we stop trying to make two.”

**Outcome:** Gain map coordinates for an obsolete entanglement relay. At exit, corporate billboard glitches and street lamps go dark. Mica asks “Rin?” with radio static.

**Required clear learning text:** “CNOT copies a known computational-basis bit, but not an arbitrary unknown qubit.”

**Failure/retry:** No loss. A helpful button “Show me why” toggles two compact mini diagrams. A skip-after-demonstration option exists for judges under time pressure.

## 4.3 Mission 2: THE CONNECTION (4:00–7:00)

**Location:** A forgotten underground relay chamber. Tall vertical maintenance rigs, suspended superconducting loops as speculative set dressing, hydraulic coolant sound, cold cyan lights.

**Goal:** Discover whether pre-shared entanglement can immediately deliver the authorization.

**Beat 1:** Walk into chamber. Power switch awakens old maintenance intelligence VEGA. Receiver map shows one entangled qubit at this station and partner at distant vault. Make it explicit the entangled pair was distributed **before** the crisis and preserved with fictionalized advanced hardware.

**VEGA:** “The endpoints share a prepared resource. Correlation is not a message.”

**Beat 2:** Player hits SEND using only Bell entanglement. On sender side, player can toggle a local operation. At receiver the individual outcomes still look uniformly random, whether sender chooses `I`, `X`, or `Z` on a Bell half. The player can view local receiver data versus compared paired data.

**Feedback:** “Receiver-only data: 50% / 50%. No decodable message.”

**Beat 3:** VEGA opens an old maintenance blueprint: a separate classical service link runs through the rooftop tower. The player physically reconnects a warm amber cable in the relay bay. One lighting strip comes back online. Objectives advance.

**MICA:** “So the secret can't just travel down that blue cable?”

**RIN:** “The blue link makes transfer possible. The amber one tells the other side what to do.”

**Outcome:** Relay marked `ENTANGLEMENT READY`, classical link `OFFLINE`; rooftop door unlocks. Player knows two distinct resources are needed.

**Optional scientific inspect:** Bell state preparation `H(q0), CX(q0,q1)`, sender-local gates `I/X/Z`, and receiver-only measurement marginal remains uniform; correlations show only when sender and receiver classical results are compared.

## 4.4 Mission 3: ONE OF ONE (7:00–10:30)

**Location:** Roof tower overlooking city; storm, wind, far-off flashing aircraft, enormous insulated communications mast, three-piece teleport terminal.

**Objective:** Use the preserved source quantum state + pre-shared Bell pair + repaired classical link to make the remote receiver recover the source state.

**Beat 1 (line repair):** Physically route an amber cable through three simple interactable junctions (not a long wire maze). Players see route as a glow line. Receiver responds `CLASSICAL LINK ONLINE`.

**Beat 2 (Bell measurement):** Terminal displays three labeled qubit slots: SOURCE, LOCAL BELL HALF, REMOTE BELL HALF. Player chooses `EXECUTE BELL MEASUREMENT`. This is a prepared conceptual system; player is not editing arbitrary gates in required mode. Measured results are two classical bits, labeled `SOURCE READOUT m0` and `RELAY READOUT m1`.

**Beat 3 (corrections):** Player selects corrective operations on the remote station: `X if m1 = 1`, `Z if m0 = 1`. Incorrect corrections show reduced state fidelity in the sandbox diagnostic, with explanation; player can retry on a fresh *prepared calibration state*. For narrative integrity, the live story token transfer is committed only after a successful dry run. The story source cannot be teleported multiple times after destructive measurement.

**Beat 4 (authorization):** On successful dry run, VEGA confirms. Rin chooses `COMMIT ONE-WAY TRANSFER`. Fade to dark terminal; source capsule status changes from `STATE PRESENT` to `STATE MEASURED / CONSUMED`. Receiver confirms `STATE RECOVERED`. The remote vault accepts the fictional authorization.

**MIRROR:** “Emergency authorization accepted. District Nine grid isolation aborted.”

**Beat 5 (emotional consequence):** City lights reappear in waves. Radio comes back.

**MICA:** “Rin? Did you make it?”

**RIN:** “No. I sent it.”

**MICA:** “But you still have it, right?”

**RIN:** “Not anymore.”

The 3D camera pulls away. On-screen text “You didn't copy the information. You transferred it.” Title `ECHO / ONE OF ONE`.

## 4.5 Credits and Declassified mode (10:30–12:00)

“Declassified” opens 3 tabs: `THE COPY`, `THE CONNECTION`, `THE TRANSFER`. Each has: What I did / what the qubits did / exact gates / expected data / misconception corrected. Replay in-game experiments and open the Qollab project runner evidence.

A short 3-question teach-back (optional, no scoring pressure):
1. Why didn't the copying machine work on the unknown state?
2. Why was entanglement alone insufficient?
3. What did the classical bits control after the Bell measurement?

This is the educational product, not a graded exam.

---

# 5. World map and 3D environment specification

## 5.1 Level approach: one continuous “hero corridor”

Build one small interlinked environment, not separate levels with loading. Geometry can be approximated as:

- **Sector A — Rain Alley** (playable ~30m long × 12m wide). Narrow street canyon, awnings, wet asphalt, modular shopfronts, one glowing booth, puddles and cables.
- **Connector — Substation Passage** (~15m long × 5m wide). Stair/ramp illusion; subway turn, silhouettes, change of ambient audio.
- **Sector B — Relay Chamber** (~18m × 18m). Circular plinth, 3 tall cooling columns, rotating energy-core rings, maintenance room shell, large exit door.
- **Connector — Elevator Corridor** (~8m × 5m). Scripted door transition and short fade can mask geometry teleport for perf.
- **Sector C — Rooftop Terminal** (~22m × 20m). Raised platform, amber cable sockets, transmission mast, city matte skyline / instanced building field beyond guard rails.

Coordinates are suggestions; prioritize practical geometry and short traversal. Good line-of-sight composition is more important than realistic navigation footprint.

## 5.2 “AAA feel” from 5 disciplined choices

1. **Composition:** Frame Rin against one giant recognisable architectural landmark at every scene. Use silhouettes and contrast.
2. **Lighting:** Key light + emissive accents + fog + physically plausible wet roughness; avoid 50 equally bright point lights.
3. **Sound:** 3 ambient zones, footsteps, electrical chimes, radio static, terminal confirmation, big ending swell.
4. **Transitions:** Seamless environmental reactions; relay coils energize, signage changes, tower lights pulse, rooftop sees distant restoration.
5. **Camera:** Deliberate arrival pans, constrained third-person follow, a single dramatic final skyline shot.

More polygons do not automatically create better visual quality.

## 5.3 Original aesthetic language

- Palette: night graphite `#070B12`, deep blue steel `#132035`, quartz cyan `#56E4F2`, antique amber `#F3AE62`, danger coral `#E96B68`, pale porcelain `#EAF3F6`.
- Quantum elements: glass, ceramic lattice, thin cyan pulse strips, concentric linework, orthogonal geometric tags.
- Classical systems: warm amber cabling, older riveted service panels, visible patch sockets.
- Corporation: bright sterile ivory Palisade signs on dark glass; MIRROR notices have sharp, severe typography.
- Motion language: terminals wake as layers of fine light, NOT explosions of particles every click.
- Text should be sparse in the 3D world; project large textures cheaply and use crisp CSS overlays for readable controls.

## 5.4 Minimal original asset requirements

**Required:** a controllable humanoid silhouette / legally usable GLB under size budget; coat/capsule shape; wet asphalt + sidewalks; 8 reusable modular structures; instanced background buildings; 2 holographic signs; booth; relay core; transmission mast; 3 puzzle consoles; rain particles / fake rain; 3 doors / blockers; emissive guide arrows; one skyline card or procedural geometry.

**Recommended strategy:** procedural primitives and instancing for Qollab edition. Handcrafted low-poly futuristic props textured with emissive gradients can look atmospheric without large assets. Use a tiny compressed `.glb` only if compatible with Qollab's file cap. Do not download proprietary copyrighted Cyberpunk/Genshin models or audio.

**External studio edition:** optimized GLB/GLTF environment sets, baked lighting where possible, R3F postprocessing and better character animation; never block Qollab delivery on these.

## 5.5 Visual production checklist

- Fixed default third-person camera yields clear silhouette at every checkpoint.
- Wet ground reflects colored light in a modest approximation (avoid full expensive SSR in sandbox).
- Tall skyline layers with fog hide the edge of playable map.
- Scene has contrast hierarchy, not uniform noisy neon.
- Narrative objects visible from 8–15m away.
- At least one distinctive landmark/hero prop per playable area.
- Color choices preserve readability for common color-vision differences; use icons and labels with color.
- No texture glitches, Z-fighting, missing models, camera going below floor, or invisible collision walls with no visual cues.

---

# 6. UI/UX specification: cinematic and accessible

## 6.1 UI layers

**Layer 0: immersive world** — Three.js canvas; third-person character; environmental clues.

**Layer 1: minimal in-game HUD** — mission objective (upper left), narrative countdown display (upper right), capsule state status (lower left), contextual interact prompt near object or lower right.

**Layer 2: modal in-world terminal** — a close-up / world-space framing of the device with a clean HTML panel visually mapped to it. When open: movement disabled; mouse free; keyboard options usable; ESC closes.

**Layer 3: quantum insight / Declassified** — optional side-by-side visualization: physical event ↔ gates ↔ measured outcomes. Avoid teaching before player discovers.

**Layer 4: menu / settings** — launch, continue if state in same session, audio, subtitles, reduced motion, display quality, controls, restart.

## 6.2 UI type/visual tokens

- Primary type: accessible geometric sans; fallback system font. Do not ship proprietary fonts without license.
- Display type: condensed futuristic typeface if openly licensed; readability more important.
- Terminal body: 14–16px minimum desktop, scalable to 200% for accessibility.
- Panels: dark translucent `rgba(6, 13, 24, 0.92)`; 1px cool outline; subtle cyan accent; no excessively blurry layers.
- Active focus: visible high-contrast border plus icon; keyboard focus always visible.
- Dialogue: 2 lines max per beat, character name, 1-line text reveal optional, immediate skip to full caption.
- Highlight states: inactive/available/complete/error; not solely color-driven.
- Transitions: 150–300ms UI, longer animations only for rare cinematics and always skippable after first viewing.

## 6.3 Heads-up display example

At Relay Chamber:

```
ECHO // DISTRICT 09                     GRID SHUTDOWN  08:42
OBJECTIVE 02
RESTORE THE ENTANGLEMENT RELAY

                      [world / character / reactor]

Q-SOURCE: PRESERVED                                [E] INTERACT
```

## 6.4 Terminal example: cloning discovery

```
PALISADE / DUPLICATION UNIT / MAINTENANCE OVERRIDE
-------------------------------------------------
TEST INPUT:        [ |0> ] [ |1> ] [ |+> ]
INPUT MODE:        PREPARED CALIBRATION STATE
ACTION:            [ DUPLICATE ]

RESULT:
  For |0> : |00>      TWO COPIES IN Z BASIS: YES
  For |1> : |11>      TWO COPIES IN Z BASIS: YES
  For |+> : Bell pair TWO INDEPENDENT COPIES: NO

[ WHY DID THAT FAIL? ]       [ TRY ANOTHER STATE ]
```

Replace “two copies in Z basis” with exact description “two basis values matched” where ambiguity might confuse beginners. In Declassified show the reduced-state purity.

## 6.5 Terminal example: teleportation

```
ECHO // TRANSMISSION CONSOLE
---------------------------------------
STATE:     SOURCE PRESENT
BELL PAIR: READY
CLASSICAL: CONNECTED

[ EXECUTE BELL MEASUREMENT ON TEST STATE ]
  m0 = 1  (source readout)
  m1 = 0  (local Bell-half readout)

RECEIVER CORRECTION PLAN
  X: [ OFF ]
  Z: [ ON  ]

[ VERIFY DRY RUN ]
Receiver test fidelity: 1.000000
[ COMMIT STORY TRANSFER ]
```

If `m0=1,m1=0`, Z only is correct. For `m0=0,m1=1`, X only. For `m0=1,m1=1`, X+Z. For `0,0`, none. Document bit endianness clearly.

## 6.6 Tutorials, feedback, and failure

- Tooltips appear only on first relevant context; tutorial step and narrative should not compete for visual attention.
- Every failure says **why**, briefly. Examples: “The receiver sees random local results; the classical channel is still missing.”
- Hints progressive: Hint 1 prompts inspection; Hint 2 mentions resource; Hint 3 explicitly states required operation. No punitive penalty.
- Escape backs out and returns without softlocking quest state.
- Dialogue captions must be visible and not rely on voice-over.
- Settings and interaction accessibility should work from the keyboard alone.
- Reduced motion disables heavy camera shake, rain streaks, rapid flickering, forced head bob; preserve informational feedback.
- If WebGL is unavailable: show a clear unsupported-device message and provide a minimal text-based circuit demonstration if practical.

---

# 7. Quantum science: formal design contract

**This section is normative. Claude Code must match these physical behaviors even if cinematic presentation changes.**

## 7.1 Register mapping and conventions

- Story test state is one qubit: `|ψ> = α|0> + β|1>`, normalized with `|α|²+|β|²=1`.
- Teleportation has three qubits: `q0=source`, `q1=Alice local Bell half`, `q2=Bob receiver Bell half`.
- Bell pair prepared with `H(q1); CX(q1,q2)`.
- Bell measurement step: `CX(q0,q1); H(q0); measure(q0→m0); measure(q1→m1)`.
- Corrections: **X on q2 iff m1=1; Z on q2 iff m0=1**. Apply X then Z, or Z then X; if both, difference only global phase for single state verification.
- Always label bits explicitly. Qiskit string output can be little-endian. Never parse raw bitstrings without an explicit register mapping and tested reference fixtures.

## 7.2 No-cloning mission

For arbitrary unknown `|ψ>=α|0>+β|1>`, the CNOT with a blank |0> qubit gives `α|00>+β|11>`, not `|ψ>⊗|ψ>` in general. The exception for computational basis states explains the deceptive beginning.

**Player-facing expected behaviors:**

| Prepared source | Naive CNOT result | Universal independent copy? |
|---|---|---|
| `|0>` | `|00>` | Special case: basis state copied |
| `|1>` | `|11>` | Special case: basis state copied |
| `|+>` | `( |00>+|11> )/√2` | No; entangled Bell pair |
| phase state `( |0>+i|1> )/√2` | `( |00>+i|11> )/√2` | No |

For the |+> case, each reduced output is maximally mixed with purity 1/2, whereas an ideal independent |+> copy is pure with purity 1.

**Tests:** Basis outcomes deterministic. |+> naive clone is entangled (reduced purity 1/2). The two-qubit output is not `|+>⊗|+>`. Test several non-basis preparations, not only one.

## 7.3 Bell-pair / no-signalling mission

Prepare `(|00>+|11>)/√2`. A local sender action cannot change the marginal measurement statistics available to the remote receiver alone. For example, sender applying `I` versus `X` changes pairwise correlations in Z basis but Bob's individual Z-basis measurement stays 50/50; applying Z phase does not create a decodable local signal either.

**Playable proof:** Left panel shows optional sender action `I/X/Z`; right panel always shows receiver-only `P(0)=P(1)=0.5` for the ideal Bell pair. Compare full two-party measurement logs with a classical message afterward to uncover correlations. The player should physically route the amber classical link rather than concluding “quantum fails.”

**Tests:** For multiple sender-only local operations, `partial_trace(rho, sender_qubit)` returns `I/2` at Bob; display probabilities within tolerance. Demonstrate a pairwise-correlation difference for I vs X if both are later measured in Z.

## 7.4 Quantum teleportation mission

An ideal protocol with a pre-shared Bell pair + Bell measurement + two classical bits + Pauli corrections transfers arbitrary single-qubit input states without creating two independent copies.

**Scientific validation plan:**
- Prepare six+ states: `|0>`, `|1>`, `|+>`, `|->`, `( |0>+i|1> )/√2`, and at least one nontrivial Bloch sphere point such as `RY(1.137) RZ(0.44)` in the correct order.
- Simulate each Bell-measurement outcome branch or a deferred-measurement verification circuit; assert receiver reduced-state fidelity ≥0.999999 in ideal mathematical validation for all states and branches.
- Withhold classical correction information and show receiver's locally averaged state has no dependence on the source message (appropriately initialized conditional ensemble).
- Present a single sampled measurement outcome as an example but do not pretend one shot proves accuracy.
- Distinguish mathematical simulation (exact statevector / density matrix), shot sampling on simulator, and hardware execution.

### Reliable hardware-compatible verification when dynamic control flow is unsupported

Use **the deferred-measurement principle** for a compact local circuit proof:

```
source preparation on q0
H(q1); CX(q1,q2)       # Bell pair
CX(q0,q1); H(q0)       # Bell-basis transform
CX(q1,q2); CZ(q0,q2)  # coherent controlled corrections
```

In ideal simulation, Bob's reduced state is the original source state. This is a valid gate-level verification by deferring measurements, but **it is not a physically separated teleportation link** and must not be displayed as remote quantum controls in the narrative. The narrative action remains measurement + **classical** feedforward, implemented as tested measurement branches/dynamic circuit where available. This distinction should appear in Declassified.

### Story-integrity constraint

Run all corrections and retries on calibration/test qubits first. The unknown narrative source token must be consumed **once** in the final commit. Do not let the player re-run teleportation of the same already-measured unknown token after a failure. The successful dry run proves a **conditional correction rule**, not a prediction of the live measurement bits. During final commit a fresh live Bell measurement generates its own bits and the already-calibrated receiver applies X/Z conditioned on **those live bits**; the story token is not secretly assumed to match the dry run's outcomes.

## 7.5 Simulator claims

Qollab built-in simulator and IonQ simulator are simulator backends. They are not proof of quantum advantage, physical quantum entropy, or real intercity quantum transfer. Do not use phrases such as “certified quantum random,” “unhackable quantum encryption,” or “instant quantum message.”

## 7.6 Test / presentation matrix

| Science claim | In-game observation | Qiskit evidence | Required test |
|---|---|---|---|
| Basis states duplicate under CNOT | |0> and |1> apparent success | CNOT counts/state | pass |
| Unknown superposition cannot be universally cloned | independent outputs fail | Bell state / reduced density matrix | pass |
| Bell pair is entangled | paired detector correlation | Bell circuit/state | pass |
| No usable signalling with entanglement alone | receiver sees 50/50 | partial trace / marginal probabilities | pass |
| Two classical bits required in protocol | amber link mandatory | Bell branch + conditional correction | pass |
| Teleportation preserves unknown test state | calibration fidelity 1 | state fidelity across states | pass |
| Original consumed | source register measured | protocol steps and state reconstruction | educationally faithful |

---

# 8. Engineering architecture and source structure

## 8.1 Critical platform discovery: Qollab supports Three.js natively

Qollab's 2026 project runtime supports a **JavaScript/HTML project** when `index.html` and `main.js` exist at project root. It bundles `three`, `three/addons/...`, `postprocessing`, and a number of other JS libraries. `main.js` may import project-local Python/Qiskit modules. The runtime supplies `backend` based on the simulator a visitor selected before execution. It is sandboxed: no persistent browser storage, no arbitrary POST/PUT/DELETE, no WebSocket, and strict file limits.

**Architectural decision:**

- **PRIMARY, P0:** Build an honest-to-goodness, playable Qollab-native 3D chapter with **vanilla Three.js** and lightweight HTML/CSS controls, using Python Qiskit (Pyodide) for experiment logic. This is the entry judges actually run.
- **SECONDARY, P2:** Build an external cinematic React + React Three Fiber edition that reuses scenes, dialogue data and physics contracts. Avoid a premature React rebuild or external FastAPI dependency for the primary entry.

### Why this matters

An elaborate external React build alone does not fulfill the stronger objective of a runnable interactive Qollab submission. A Qollab-native game dramatically reduces the “beautiful presentation, unusable submission” risk. The code should tolerate the Qollab iframe and execution restrictions from day one.

## 8.2 Recommended Qollab project tree

```text
ECHO/
├── index.html                 # body fragment ONLY, with canvas/HUD root
├── main.js                    # Qollab entry, backend is injected
├── main.css                   # automatically loaded stylesheet
├── requirements.txt           # Qiskit dependency; no unsupported binary wheels
├── LICENSE                    # MIT
├── README.md                  # run docs, controls, science and attribution
├── game/
│   ├── app.js                 # game bootstrap, lifecycle
│   ├── state.js               # finite state machine and scene progress
│   ├── eventBus.js            # small event dispatch layer
│   ├── input.js               # keyboard, mouse, focus handling
│   ├── camera.js              # follow and cinematic camera modes
│   ├── controller.js          # player movement, collision
│   ├── interactions.js        # nearby interactables, triggers
│   ├── narrative.js           # dialogue state and cue sequencing
│   ├── objectives.js          # data-driven objectives
│   ├── audio.js               # WebAudio minimal audio if permitted
│   ├── quality.js             # DPR/perf settings and adaptive effects
│   └── save.js                # in-memory only; NO localStorage in Qollab
├── scene/
│   ├── renderer.js            # Three.js renderer and render loop
│   ├── district.js            # continuous scene composition
│   ├── alley.js
│   ├── relay.js
│   ├── rooftop.js
│   ├── buildings.js           # instanced background structures
│   ├── lighting.js
│   ├── rain.js
│   ├── player.js              # placeholder or small GLB with fallback
│   ├── props.js
│   └── effects.js
├── ui/
│   ├── hud.js
│   ├── dialogue.js
│   ├── terminal.js
│   ├── declassified.js
│   ├── menu.js
│   ├── credits.js
│   └── accessibility.js
├── data/
│   ├── story.js               # dialogue + cutscene beats in JSON-like data
│   ├── objectives.js
│   ├── locations.js
│   ├── interactables.js
│   └── assets.js               # small local asset paths; explicit paths
├── quantum/
│   ├── __init__.py
│   ├── cloning.py              # exact statevector calibration experiments
│   ├── entanglement.py         # marginal and correlation experiments
│   ├── teleportation.py        # branch calculation/fidelity validation
│   ├── qollab_job.py           # ONE Qollab backend job integration
│   └── formats.py              # JSON-friendly result structures
├── tests/
│   ├── test_cloning.py
│   ├── test_entanglement.py
│   ├── test_teleportation.py
│   └── smoke_plan.md
└── assets/
    ├── texture/                # each file < 2 MB
    ├── audio/                  # tiny freely licensed files if usable
    └── model/                  # compressed GLB below Qollab file cap
```

The actual project tree may be flatter if the browser's module-loader or source-file size constraints favor it. **Do not assume Vite bundling, npm scripts, or Node APIs exist inside Qollab.** Use the native import patterns documented by Qollab.

## 8.3 External edition (deferred until P0 is solid)

```text
studio/
├── package.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── engine/
│   │   ├── gameMachine.ts
│   │   ├── InputManager.ts
│   │   └── QuantumAdapter.ts
│   ├── world/
│   │   ├── DistrictNine.tsx
│   │   ├── RinController.tsx
│   │   ├── FollowCamera.tsx
│   │   └── InteractiveTerminal.tsx
│   ├── ui/
│   └── styles/
└── public/assets/
```

The optional React implementation should consume an adapter contract and data files, not attempt to embed Qollab's injected `backend` object into an external website. Locally, prefer a testing adapter based on verified outcomes or a small FastAPI service. Clearly display which adapter the viewer is using.

## 8.4 Quantum adapter contract

Make the rest of the game unaware of whether data comes from local Qiskit statevector, Qollab simulator jobs, or a cached educational preview.

```ts
// Pseudocode / TypeScript contract; implement an equivalent plain JS adapter on Qollab.
type EngineKind = 'exact_qiskit_local' | 'qollab_selected_backend' | 'documented_preview';

type ExperimentResult = {
  experiment: 'cloning' | 'bell_signalling' | 'teleportation';
  engine: EngineKind;
  circuitDescription: string;
  qubits: number;
  parameters: Record<string, string | number | boolean>;
  probabilities?: Record<string, number>;
  counts?: Record<string, number>;
  fidelity?: number;
  facts: string[];
  measurementBits?: { m0: 0 | 1; m1: 0 | 1 };
  createdAt?: string;
};

interface QuantumEngine {
  cloneTest(state: 'zero' | 'one' | 'plus' | 'phase'): Promise<ExperimentResult>;
  bellSignalling(senderGate: 'I' | 'X' | 'Z'): Promise<ExperimentResult>;
  teleportDryRun(stateId: string, correctionX: boolean, correctionZ: boolean): Promise<ExperimentResult>;
  verifySelectedBackendOnce(): Promise<ExperimentResult>;
}
```

**Important:** Exact local Qiskit simulation means Qiskit `Statevector`, `DensityMatrix`, and `partial_trace`, not an invented “quantum dice” implementation in JS. A documented preview is a nonauthoritative fallback for UI continuity. Never label preview data as a fresh hardware or cloud simulator measurement.

## 8.5 Qollab runtime details to respect

- `index.html` contains body markup, not `<html>`, `<head>`, `<body>` wrappers; `main.css` is automatically loaded; `<script>` in HTML is not executed.
- Qollab supplies a `backend` global; **do not hardcode a backend** or API token.
- In JS/Qiskit, `backend.run(circuit, {shots: ...})` returns a job asynchronously, and `job.result()` yields counts via Python proxy `.toJs()`.
- Import Python Qiskit module as `import * as module from 'quantum.module'`, call async Python functions with `.callPromising(...)`, then convert `.toJs()`.
- The built-in simulator can allow multiple local backend jobs, but **IonQ backend selection allows one backend job per run** in current Qollab runtime. Do not call `backend.run` for every terminal click. Treat this as a hard invariant unless actual platform testing proves a different allowed behavior.
- Plan **at most one backend.run call** in the main lifecycle, preferably during a designated verified quantum experiment. All exploratory puzzle feedback can be generated via local Qiskit mathematical simulations without consuming remote-job allowance.
- A specific IonQ configuration may reject a dynamic circuit or multi-circuit submission. Use the deferred-measurement verification circuit for hardware-compatible test, and keep the physical story's classical-feedforward logic in the local branch demonstration. Test the exact selected backends.
- Project-local Python execution uses Pyodide. Package install restrictions apply; use bundled Qiskit, numpy and built-in math unless there's a reason to add dependencies.
- No persistent `localStorage`, sessionStorage, IndexedDB, cookies or long-term file saves in Qollab. Use a restartable in-memory game session.
- Network access is limited to cross-origin GET; POST/WebSocket/workers unsupported. Do not design required gameplay around an external API.
- Each project file maximum 2 MB, 100 files maximum, 200 MB account project total (current docs). Distribute assets accordingly and test uploads early.
- Recent Chrome/Edge/Firefox compatibility may differ; Qollab requires WebAssembly JSPI support. Test in the browser judges are likely to use and give a graceful compatibility message.

## 8.6 Backend job lifecycle design

The game must remain interactive if backend verification has latency, but must never misreport generated values. Suggested flow:

1. Boot Three.js world and local prepared Qiskit precomputation for the three pedagogical experiments. If Qiskit precomputation is slow, initialize a “CALIBRATING” indicator and load the scene without blocking painting.
2. Missions 1–3 dry runs use exact Qiskit local statevector/density matrix. They DO NOT call selected remote `backend.run` repeatedly.
3. At final verification, run exactly one selected Qollab backend job with a standard gate-only verification circuit; show `VERIFYING ON SELECTED SIMULATOR` while in flight. Do not require a specific remote measurement bit for story success.
4. On success, show selected-backend counts, execution mode, and accurate experiment description in `Declassified` panel.
5. On backend error, show status: “Quantum backend verification unavailable; educational circuit validated locally” and provide a way to inspect scientific evidence. Do not say “IonQ verified” when not true.
6. If judged specifically on local simulator, this pathway must work without a cloud account or API key.

**Aesthetic principle:** Waiting for cloud verification should look like a device calibration, not a frozen web browser. But never invent successful real job results while waiting.

## 8.7 Data flow example

```
Player presses E at relay terminal
     → Interactions emits OPEN_TERMINAL(relay)
     → GameMachine pauses movement and camera orbit
     → RelayTerminal offers I/X/Z and executes experiment
     → QuantumAdapter.bellSignalling('X')
     → Python Qiskit module computes receiver reduced density
     → JSON-safe ExperimentResult returned to JS
     → UI displays receiver P(0)=0.5, P(1)=0.5
     → player realizes no message was sent
     → ObjectiveMachine unlocks route to amber classical cable
     → 3D environment changes: amber socket illuminates
```

State changes must be expressed as named events and tested, not as ad hoc DOM toggles scattered across scripts.

---

# 9. Quest state machine and narrative data

## 9.1 Required states

```
BOOT
TITLE
OPENING
FREE_ROAM_ALLEY
CLONE_INTRO
CLONE_BASIS_PASSED
CLONE_SUPERPOSITION_FAILED
CLONE_UNDERSTOOD
RELAY_UNLOCKED
RELAY_INTRO
RELAY_BELL_CREATED
RELAY_SEND_FAILED
RELAY_UNDERSTOOD
ROOFTOP_UNLOCKED
LINK_REPAIRED
TELEPORT_DRY_RUN
TELEPORT_DRY_RUN_PASSED
TELEPORT_COMMITTED
ENDING
DECLASSIFIED
CREDITS
```

If narrative cutscenes require their own substates, use clearly named child states. Avoid a giant integer counter like `missionStep=9` whose meaning is unclear.

## 9.2 Type-safe-ish transition design

```js
const transitions = {
  TITLE: { START: 'OPENING' },
  OPENING: { FINISHED: 'FREE_ROAM_ALLEY', SKIP: 'FREE_ROAM_ALLEY' },
  FREE_ROAM_ALLEY: { OPEN_CLONE_BOOTH: 'CLONE_INTRO' },
  CLONE_INTRO: { BASIS_DEMO_OK: 'CLONE_BASIS_PASSED' },
  CLONE_BASIS_PASSED: { SUPERPOSITION_DEMO_FAILED: 'CLONE_SUPERPOSITION_FAILED' },
  CLONE_SUPERPOSITION_FAILED: { EXPLANATION_READ: 'CLONE_UNDERSTOOD' },
  CLONE_UNDERSTOOD: { EXIT_BOOTH: 'RELAY_UNLOCKED' },
  RELAY_UNLOCKED: { REACH_RELAY: 'RELAY_INTRO' },
  RELAY_INTRO: { PREPARE_BELL_PAIR: 'RELAY_BELL_CREATED' },
  RELAY_BELL_CREATED: { ATTEMPT_NO_SIGNALLING: 'RELAY_SEND_FAILED' },
  RELAY_SEND_FAILED: { VIEW_RECEIVER_MARGINAL: 'RELAY_UNDERSTOOD' },
  RELAY_UNDERSTOOD: { OPEN_ROOFTOP: 'ROOFTOP_UNLOCKED' },
  ROOFTOP_UNLOCKED: { REPAIR_CLASSICAL_LINK: 'LINK_REPAIRED' },
  LINK_REPAIRED: { RUN_DRY_TEST: 'TELEPORT_DRY_RUN' },
  TELEPORT_DRY_RUN: { CORRECT_CALIBRATION: 'TELEPORT_DRY_RUN_PASSED' },
  TELEPORT_DRY_RUN_PASSED: { COMMIT_TRANSFER: 'TELEPORT_COMMITTED' },
  TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING' },
  ENDING: { OPEN_SCIENCE: 'DECLASSIFIED', OPEN_CREDITS: 'CREDITS' },
};

function transition(current, event) {
  const next = transitions[current]?.[event];
  if (!next) return { ok: false, state: current, reason: 'invalid transition' };
  return { ok: true, state: next };
}
```

This sample is a simple model, not a complete implementation. Build progress flags for optional actions separately; do not put every incidental animation into the quest state machine.

## 9.3 Event-driven world changes

- `CLONE_UNDERSTOOD` → booth indicator red fades; sealed corridor door opens; new objective target glows.
- `RELAY_BELL_CREATED` → cyan energy conduit illuminates; reactor audio begins.
- `RELAY_UNDERSTOOD` → amber schematic becomes visible, rooftop access unlocked.
- `LINK_REPAIRED` → amber fiber light travels through conduit to remote skyline node.
- `TELEPORT_COMMITTED` → capsule source-status indicator switches off, vault status green, city-wide instanced lighting activation wave, low music swell, ending dialogue.

Ensure narrative events are **idempotent**: opening a terminal twice must not replay an irreversible transfer or decrement a fictional timer to negative values.

## 9.4 World interaction data example

```js
export const INTERACTABLES = [
  { id: 'copy_booth', position: [5.5, 1.2, 0], radius: 2.3, label: 'REPLICATION BOOTH', requiredQuest: 'FREE_ROAM_ALLEY', action: 'OPEN_CLONE_BOOTH' },
  { id: 'relay_core', position: [27, 1.2, 16], radius: 2.6, label: 'QUANTUM RELAY', requiredQuest: 'RELAY_UNLOCKED', action: 'REACH_RELAY' },
  { id: 'classical_socket', position: [52, 1.2, 32], radius: 2.3, label: 'LEGACY DATA LINK', requiredQuest: 'ROOFTOP_UNLOCKED', action: 'REPAIR_CLASSICAL_LINK' },
];
```

Position values are illustrative. The actual implementation must match the constructed geometry and path reachability.

## 9.5 In-memory session and restart

Implement `resetGame()` that resets quest state, player transform, all terminal state, optional event flags, camera and audio, and public UI in a deterministic way. Qollab's runtime has no durable local browser storage; “Continue” can resume only within the active browser run if state exists. A small dev-only `?debugState=` flag must not leak into public game by default; use explicit developer mode or internal test harness.

---

# 10. Core code examples to direct implementation

**These are illustrative contracts and reference patterns, not tested production drop-ins. Claude must run and adapt them against installed library versions and the Qollab runtime.**

## 10.1 Qollab-native Three.js scene skeleton

```js
// main.js — example structure; Qollab supplies `backend` to this entry.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// DO NOT treat OrbitControls as finished third-person movement;
// implement a dedicated follow-camera in game/camera.js.

const root = document.getElementById('game-root');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b12);
scene.fog = new THREE.FogExp2(0x070b12, 0.024);

const camera = new THREE.PerspectiveCamera(65, root.clientWidth / root.clientHeight, 0.1, 500);
camera.position.set(0, 2.4, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(root.clientWidth, root.clientHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x6281a9, 0x10121e, 0.7));
const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70),
  new THREE.MeshStandardMaterial({ color: 0x121a27, roughness: 0.32, metalness: 0.35 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

let prev = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  // input.update(dt), controller.update(dt), camera.update(dt), rain.update(dt)
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

window.addEventListener('resize', () => {
  const width = root.clientWidth;
  const height = root.clientHeight;
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});
```

**Production additions required:** cleanup on Stop, render loop pause, world collision, interactions, mobile-safe event handling, actual player model, quality settings, controls focus, and backend quantum bridge.

## 10.2 Example Qollab Python bridge

Qollab allows importing project Python files by dotted module names, then invoking them asynchronously from JS:

```js
// main.js, after initialization
import * as cloning from 'quantum.cloning';

async function runCloningCalibration() {
  const resultProxy = await cloning.run_calibration.callPromising('plus');
  const result = resultProxy.toJs();
  console.log('Actual Qiskit local calibration result:', result);
  return result;
}
```

The matching Python function should return a JSON-friendly dict with only strings, numbers and arrays. Before using `.toJs()` in a real project, verify that it produces plain JS objects as documented and adapt any nested proxy values.

## 10.3 Qiskit no-cloning reference

```python
# quantum/cloning.py — illustrative exact-state experiment
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace


def run_calibration(state_name: str = "plus"):
    qc = QuantumCircuit(2)
    if state_name == "one":
        qc.x(0)
    elif state_name == "plus":
        qc.h(0)
    elif state_name == "phase":
        qc.h(0)
        qc.s(0)
    elif state_name != "zero":
        raise ValueError("unknown prepared calibration state")

    qc.cx(0, 1)
    state = Statevector.from_instruction(qc)
    one_output = partial_trace(state, [1])
    other_output = partial_trace(state, [0])
    return {
        "experiment": "cloning",
        "input": state_name,
        "outputPurity0": round(float(one_output.purity()), 8),
        "outputPurity1": round(float(other_output.purity()), 8),
        "isIndependentCloning": state_name in ("zero", "one"),
        "circuit": str(qc.draw(output="text")),
    }
```

`isIndependentCloning` refers to *the known calibration states under this naive circuit*, NOT to a generic physical cloning oracle. For source states `plus/phase`, output purity should be 0.5. Test before using.

## 10.4 Qiskit entanglement/no-signal reference

```python
# quantum/entanglement.py — illustrative local ideal-state calculation
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace


def receiver_statistics(sender_gate: str = "I"):
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)
    if sender_gate == "X":
        qc.x(0)
    elif sender_gate == "Z":
        qc.z(0)
    elif sender_gate != "I":
        raise ValueError("gate must be I/X/Z")
    state = Statevector.from_instruction(qc)
    receiver = partial_trace(state, [0])
    p0 = float(receiver.data[0, 0].real)
    p1 = float(receiver.data[1, 1].real)
    return {"senderGate": sender_gate, "receiverMarginal": {"0": p0, "1": p1},
            "circuit": str(qc.draw(output="text"))}
```

For `I/X/Z`, receiver marginal should always be `{0: 0.5, 1: 0.5}` in the ideal experiment. The full joint correlation **does** depend on some sender operations, visible only after comparing both parties' results via classical communication.

## 10.5 Qiskit teleportation exact-state verification

```python
# quantum/teleportation.py — faithful deferred-measurement verification,
# NOT a model of sending quantum controls between physically separated stations.
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity


def verify_teleportation(theta: float = 1.137, phi: float = 0.44):
    src = QuantumCircuit(1)
    src.ry(theta, 0)
    src.rz(phi, 0)
    target = Statevector.from_instruction(src)

    qc = QuantumCircuit(3)
    qc.ry(theta, 0)
    qc.rz(phi, 0)
    qc.h(1)
    qc.cx(1, 2)
    qc.cx(0, 1)
    qc.h(0)

    # Deferred measurements and coherent versions of correction controls:
    qc.cx(1, 2)    # X correction controlled by Alice's Bell-half bit
    qc.cz(0, 2)    # Z correction controlled by source readout bit

    full = Statevector.from_instruction(qc)
    receiver = partial_trace(full, [0, 1])
    fidelity = float(state_fidelity(receiver, target))
    return {"experiment": "teleportation", "fidelity": fidelity,
            "circuit": str(qc.draw(output="text"))}
```

**Very important:** This check alone does NOT create the classical two-bit story protocol or measurement history. Implement a separate **branch model** that projects the Bell measurement outcomes, applies the selected X/Z corrections to Bob's conditional state, verifies output fidelity, and uses the two measured bits for interactive gameplay. The coherent circuit is only a convenient local mathematical equivalence to verify an ideal protocol and a compatible gate-only simulator showcase.

## 10.6 Branch table for game input

```js
export function expectedCorrections(m0, m1) {
  if (![0, 1].includes(m0) || ![0, 1].includes(m1)) throw new Error('invalid bits');
  return { applyX: m1 === 1, applyZ: m0 === 1 };
}

export function correctionsMatch(bits, selection) {
  const expected = expectedCorrections(bits.m0, bits.m1);
  return expected.applyX === selection.applyX && expected.applyZ === selection.applyZ;
}
```

The exact mathematical state-fidelity result must be computed by the Qiskit engine, not fabricated from `correctionsMatch`. This helper is used only for pedagogical UI messaging and straightforward correctness checks.

## 10.7 Qollab selected simulator one-job showcase (example)

```js
import { QuantumCircuit } from 'qiskit';

let selectedBackendJobUsed = false;
export async function verifyOnSelectedSimulator() {
  if (selectedBackendJobUsed) throw new Error('Only one backend verification per run on IonQ');
  selectedBackendJobUsed = true;

  // Example only: Bell-pair correlation circuit, safe across common backends.
  // Final project should also document teleportation in separate local exact tests.
  const qc = QuantumCircuit(2, 2);
  qc.h(0);
  qc.cx(0, 1);
  qc.measure([0, 1], [0, 1]);
  const job = await backend.run(qc, { shots: 256 });
  const result = await job.result();
  return { mode: 'selected_backend', counts: result.get_counts().toJs() };
}
```

This is only a reference for backend integration and will need actual Qollab testing. If a first job fails, the one-job allowance may still be consumed in that runtime; explicitly present a restart instruction. The final demonstration should show both the teleportation mathematics and (at least) one actual selected-backend Qiskit job. Do not present the Bell-only showcase as “teleportation executed on IonQ.”

## 10.8 Character control examples and collision

Movement pseudocode:

```js
const wish = normalize([rightKey - leftKey, forwardKey - backKey]);
const worldDir = cameraRight * wish.x + cameraForwardXZ * wish.y;
velocity = damp(velocity, worldDir * (sprint ? 5.5 : 3.1), 10, delta);
nextPosition = position + velocity * delta;
nextPosition = resolveAgainstStaticColliders(nextPosition, playerCapsule, levelColliders);
player.position.copy(nextPosition);
characterOrientation = smoothRotateTowards(characterOrientation, movementHeading, delta);
camera.position = smoothFollowThirdPerson(player.position, cameraYaw, cameraPitch, delta);
```

Requirements: prevent diagonal speed bonus via normalization, use `delta` time, stop input when terminal open, avoid `setState` at every animation frame, and prevent camera clipping/scene escape.

---

# 11. Audio, cinematic timing, and procedural content

## 11.1 Audio priorities

**P0:** Low-volume 2D atmospheric audio (rain, transformer hum), terminal interaction feedback, one radio static burst, UI success/failure, and ending musical swell using legally usable/created sounds. Browser autoplay restrictions mean sound must begin after explicit user input and always have captions/subtitles.

**P1:** Positional audio by zone, understated synth ambient bed, footsteps by surface, maintenance announcements, voice samples for Mica/VEGA, volume mixer.

**P2:** Full voiced dialogue, 3D positional acoustics, adaptive soundtrack based on quest stage.

If time is limited, **excellent subtitles and sound design are better than poor AI voice acting**. Keep player agency during dialogue.

## 11.2 Cinematic camera choreography

- Intro starts with fixed cinematic camera path, stops at controllable follow position.
- Arrival at each device: 2–3-second automatic push-in, then interactive camera is restored.
- Solve animation never exceeds ~5 seconds except one final reveal.
- Finale: rotate toward rooftop vista, distant skyline lights up left-to-right over 4–6 seconds, then close on inactive capsule, then title. Player's motion is temporarily controlled only during the decisive cinematic.
- Reduced-motion setting replaces long camera movement with crossfades and fixed shots.

## 11.3 Environmental storytelling props

Seven repeatable details offer more value than a large empty city:
1. Billboard “NOTHING EVER HAS TO END.”
2. Empty convenience kiosk with abandoned warm drink and last transaction receipt.
3. Civil grid evacuation announcement playing on loop.
4. Tram visible beyond playable bounds as a simple moving light silhouette.
5. Shelter status billboard showing `POPULATION UNKNOWN`, later `GRID RESTORED`.
6. Palisade proprietary replication booth with scratched technician initials.
7. Two conduit colors physically tracing from relay to rooftop (cyan quantum / amber classical).

These should tell the story even if players skip text.

---

# 12. Performance, quality gates and fallback strategy

## 12.1 Performance budgets

- **Browser:** desktop Chrome first; test a second supported browser and Qollab runner directly.
- **Frame rate:** aim 30+ FPS at default quality on a mid-range laptop; 60 FPS optional.
- **Pixel ratio:** cap at 1.5–1.75 by default; scale down to 1.0 under load.
- **Draw calls:** aim below a few hundred in primary scenes; instantiate distant buildings and rain efficiently.
- **Lighting:** one hemisphere/ambient plus a small number of meaningful directional/spot lights; static emissive details carry visual interest.
- **Shadows:** selective, low/medium-resolution, only for protagonist + nearby objects where perceptually useful.
- **Textures:** power-of-two where helpful, reuse atlases, small compressed textures; avoid dozens of unique 4k images.
- **Geometry:** use instanced building pieces, LOD where appropriate, scene culled by zones.
- **Qollab file cap:** each asset <2 MB, overall max 100 files; test uploading early.
- **UI:** terminal overlay text must remain crisp even if renderer downscales canvas.

## 12.2 Progressive degradation

Quality modes:

**High** — rain particles, select shadows, bloom/subtle glow, richer reflections approximation.

**Medium (default)** — fewer particles, capped DPR, simple reflections, minimal postprocessing.

**Low** — no costly postprocessing, no dynamic shadows, reduced rain, simplified character/scene geometry.

Game logic and readability must be identical in all modes.

## 12.3 Error and backend fallback states

| Failure | User experience | Development requirement |
|---|---|---|
| Asset cannot load | Procedural stand-in appears; warning in console | Reusable fallback geometry |
| WebGL initialization fails | Readable unsupported-browser screen, show alternative mini demo if available | Error boundary on boot |
| Python bridge not ready | “Calibrating quantum module...” progress; world still renders | Async init |
| Qiskit exact calculation errors | Terminal reports scientific module error, not fabricated success; retry | Catch/log with module and method |
| Selected IonQ backend fails | Display honest “verification unavailable”; local exact experiment remains inspectable | Mode/status flag |
| Player stuck | Reset position / chapter restart from pause | Fail-safe spawn |
| Camera clips | Camera clamp or snap back | Collision tests |
| No audio | Story understandable through captions | Required subtitles |
| Reload | Begin new session; no pretend cloud saves | Clear start state |

## 12.4 Automated and manual tests

**Quantum tests** (Python `pytest`, when supported in development environment): clone special cases; clone |+> fails; receiver Bell marginal 50/50 for I/X/Z; per-branch teleport correction rule; six diverse states fidelity above threshold; endianness fixture; no unknown token duplicated.

**Gameplay unit tests:** state machine transitions, no invalid skipping, interaction distances, reset idempotence, 4 correction combinations, no double commit, failure hints visible, conditional door unlocks.

**Browser smoke tests:** Chrome launch/Play/Skip cinematic/controls/Booth/Relay/Rooftop/Ending; pause/unpause; tab switch; resize; return from terminal; reduced motion; broken external asset fallback; 3 full runs.

**Qollab compatibility tests:** `index.html+main.js` recognized; `main.css` loaded; `three` import works; Python module import via dotted path works; `.callPromising` returns expected dict; selected built-in simulator job completes; IonQ selected backend job completes once; publish and run from public project page.

**Documentation tests:** MIT LICENSE, third-party asset manifest, third-party code attributions, no copied proprietary assets, explanatory project page, demo video public with no login, attribution line “This effort is supported by Qollab & IonQ”.

## 12.5 Quality gates / definition of done

**Gate A — Quantum verified:** tests green for Bell/no-cloning/teleportation in local Qiskit; have screenshots or counts from actual Qollab run.

**Gate B — Playable:** blind-test a person who hasn't read this plan; they can start, understand controls, and reach the ending without developer intervention.

**Gate C — Presentation:** one cohesive visual direction; strong title screen, minimum one atmospheric location hero shot, readable terminals, satisfying light-restoration ending.

**Gate D — Submission:** actual published Qollab project and public video, license, documentation, and tested runner. A GitHub repo alone is insufficient.

---

# 13. Practical cut list: protect the core product

If schedule is slipping, cut in this strict order:

1. Facial animation and lip sync.
2. Animated background pedestrians/vehicles.
3. Realtime rain reflection or complex postprocessing.
4. Full voice acting (keep text+radio effects).
5. Exploration collectibles and secret rooms.
6. Any branching dialogue that doesn't change quantum lesson.
7. Separate elevator traversal (instant door fade acceptable).
8. Exterior standalone React version.
9. Elaborate skybox/background props.
10. One of the nonessential explanatory UI tabs, provided all three quantum lessons remain understandable.

**Never cut:** quantum validation, Qollab-compatible playable entry, character controls, readable UI, full quest loop, teleport correction interactions, actual ending, public demo video, licensing, project page.

Emergency final cut if needed: shrink to **one cinematic control room** containing three interactable devices, but preserve 3D movement, complete story beats, and end-to-end quantum learning. A finished one-room experience beats an unplayable city.

---

# 14. Scope beyond the hackathon (product vision)

## Chapter II — “Corrupted Copies”

Players investigate imperfect quantum memories and learn decoherence and basic error detection by preventing quantum information from leaking into uncontrolled environmental interactions. Story remains grounded: cannot arbitrarily read unknown states to fix them.

## Chapter III — “The Network That Lies”

Long-distance entanglement distribution, swapping, noisy repeaters, and message latency become level mechanics. Use actual simulator noise models when technically justified; don't call error-free state-vector math a practical hardware network.

## Chapter IV — “The City of Almosts”

Quantum error correction and fault tolerance presented as systemic survival of a distributed city's fragile information. Surface-code-themed world map/puzzle must be scientifically reviewed before development.

## Gameplay productization

- Story campaigns with physics-based puzzles.
- A creative “Build a Quantum Room” mode for educators and game creators.
- An accessible circuit inspector plus simulation notebook export.
- Schools and museums edition with lesson plans and classroom presets.
- No dependence on gambling or casino monetization; ECHO stands alone as an educational adventure.

Do NOT build these chapters during the 48-hour hackathon.

---

# 15. Competition rubric and evidence packet

The four judging categories are novelty/creativity, technical execution, impact potential and documentation quality.

| Criterion | Claim | Evidence to include |
|---|---|---|
| Novelty & Creativity | Seamless first-person-knowledge learning through a third-person cyberpunk story | 15-sec intro, player walking, quantum devices changing world |
| Technical Execution | Gates drive puzzles, not random scripted branching | Actual Qiskit code, test suite, state-fidelity validation, Qollab simulator logs |
| Impact Potential | Complex quantum networking intuitions accessible to nontechnical audiences | Three explicit post-play learning outcomes, optional teach-back |
| Documentation Quality | Judges can run, understand and extend the project | MIT source, architecture, controls, troubleshooting, asset credits, references |

### Submission package MUST contain

- Published runnable Qollab-native project with a real 3D interactive page.
- Qiskit computation with reproducible output on supported free simulator(s).
- Qollab project explanation: problem, originality, game, science, technology, how to run, technical results, limitations.
- MIT license for submitted code and externally hosted dependent repos.
- Short playable controls guide.
- List of reused libraries/assets with respective licenses and original contribution statement.
- 2–3-minute public video and playable link.
- Required attribution: **“This effort is supported by Qollab & IonQ”**.

### Suggested 2:40 demo video script

| Time | Content | Voice-over idea |
|---|---|---|
| 0:00–0:18 | City blackout, title, Mica's message | “In Nacre City, almost everything can be copied. One quantum state cannot.” |
| 0:18–0:42 | Rin explores interactive street, opens booth | “ECHO is a third-person game, not a slide deck.” |
| 0:42–1:05 | Basis vs superposition cloning | “It starts with a copying method that works on bits and fails on unknown qubits.” |
| 1:05–1:29 | Bell chamber, attempt to send without classical line | “Entanglement makes correlations, not usable faster-than-light messages.” |
| 1:29–1:57 | Player reads two bits and configures receiver X/Z | “Quantum teleportation requires a Bell measurement and classical corrections.” |
| 1:57–2:16 | Qiskit code and actual simulator results | “These mechanics are backed by reproducible Qiskit experiments.” |
| 2:16–2:35 | Skyline power-on cinematic + sister dialogue | “The original isn't copied; the information is recovered at the destination.” |
| 2:35–2:40 | Project URL, MIT, credits | “Play ECHO: One of One on Qollab.” |

**Recording rule:** Show genuine recorded gameplay and actual simulator output, not a pre-rendered concept image passed off as implemented software. Clearly identify conceptual shots if any are used.

---

# 16. Referenced primary docs and verification checklist

These URLs are source-of-truth starting points that Claude Code should revisit as needed:

1. Qollab hackathon rules: https://qollab.xyz/programs/hackathon/terms
2. Qollab runtime environment: https://qollab.xyz/learn/docs/runtime-environment
3. Qollab JS/Qiskit project docs: https://qollab.xyz/learn/docs/js-qiskit-projects
4. Qollab running projects: https://qollab.xyz/learn/docs/run-your-code
5. Qollab Python/Qiskit docs: https://qollab.xyz/learn/docs/python-qiskit-projects
6. IBM Quantum teleportation module: https://qiskit.qotlabs.org/learning/modules/computer-science/quantum-teleportation
7. IBM classical feedforward docs: https://qiskit.qotlabs.org/docs/guides/classical-feedforward-and-control-flow
8. React Three Fiber loading/performance docs: https://r3f.docs.pmnd.rs/
9. IonQ's Qiskit provider: https://github.com/qiskit-community/qiskit-ionq

**Do not assume this document proves an API works in the current browser or installed versions.** The code examples above must be smoke-tested. If Qollab behavior differs, record an `ADR` (architecture decision record) in the repository, choose the smallest compatible fix, and keep the quantum/story invariants intact.

---

# 17. Final definition of success

We ship a finished ten-minute sci-fi chapter in which a player:

1. Takes control of Rin in an atmospheric 3D cyberpunk alley.
2. Fails to clone a quantum state for a principled scientific reason.
3. Creates and inspects entanglement, then learns it cannot alone transmit an intended message.
4. Repairs a classical communications link.
5. Uses the Bell-measurement bits to select valid receiver corrections.
6. Verifies the transfer with real Qiskit experiments and clear simulator provenance.
7. Watches the distant district regain power and understands the emotional price: the original quantum state was not duplicated.
8. Can open an optional transparent explanation of what happened and reproduce the circuit on Qollab.

**The game should feel like an immersive adventure first, and leave the player understanding quantum information only after they have already experienced the rules.**

When prioritizing, choose **working gameplay + truthful quantum physics + cinematic finish** over size, spectacle or architectural cleverness.
