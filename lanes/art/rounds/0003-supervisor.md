=== PLAN ===
**Lane goal (G3, plan row 6):** deliver the cyberpunk atmosphere of vision §5 and §11 without destabilising gameplay. The pieces are:
- graphite structures, a wet-ground approximation, fog and rain
- an instanced skyline
- cyan for quantum, amber for classical
- three hero landmarks
- the §11.2 skyline-restoration ending
- audio that starts only after user input
- high/med/low presets that run the same logic
- ≥30 FPS at medium

Everything is procedural or original, and every file is under 2 MB. Due Sun 05:00 ET; feature freeze Sun 14:00.

**Done:**
- `lane/art/atmosphere-kit` was merged into `lane/art/integration` at consult 2. It adds `echo/scene/{lighting,rain,buildings,effects}.js` and the `tools/art-preview/` harness, which runs over gameplay's real graybox.

**In flight (judged from the checkpoint images this consult, not merged yet):**
- `rain-shelter-readability`, commit 7456d01. I looked at the images myself:
  - The relay chamber, before (`before-relay-med.png`), had a full curtain of rain inside the room. After (`after-relay-med.png`), there is none. The rings and pillar are unchanged.
  - The medium alley (`after-alley-med.png`) now has thin, dim streaks. The cyan and amber strips, the red booth and the wet-floor reflections all read clearly above the rain. That is §5 "readability first", met.
  - Still owed before I merge:
    - falsification: sabotage the shelter so it collapses nothing and show that the pixel gate goes red
    - an FPS table for low/med/high
    - the vault report
    - `node tools/qollab-caps/check.mjs` and `node tools/contract-check/check.mjs`
    - images for the passage and elevator at all presets
- `props-audio`: the three landmarks, consoles, signs, storytelling props, and `echo/game/audio.js` with `play('reactor_hum'|'music_swell')`, unlocked after user input. No report yet.

**New defect seen in the images:**
4. With the rain gone, the relay chamber is nearly black (`after-relay-med.png`). The walls, floor and pedestal sit at about 5–10% luminance. The only readable element is the dim teal ring stack. Nothing yet carries the §11 relay mood: a cyan conduit glow lighting the room, rim light on the pedestal, or a visible amber schematic. This is lighting's job, in `lighting.js` or local fill lights in `effects.js`. The next free slot fixes it, together with defect 3, the flat amber schematic card. The props worker may cover the schematic; I will check its report before dispatching.

**Next:**
- When rain-shelter-readability finishes: judge the full evidence and merge it.
- When props-audio finishes: judge it and merge it. Then dispatch `interior-lighting-pass`: relay, passage and elevator fill light, plus the schematic if props did not cover it. The proof is the same camera views, with a luminance table before and after.
- After G2 (Sat 17:00): an integration worker wires the kit into gameplay's district once gameplay has made the swap that the overseer relayed. Gameplay calls `rain.addShelter(...)` with the volumes art defines, or art exports `SHELTERS` for gameplay's footprints. I prefer exporting them from art, because it means one less cross-lane trigger.
- Then:
  - a perf pass under a throttled profile resembling a mid-range laptop
  - finale polish with gameplay's camera

**Risks:**
- Two writers on materials, gameplay's `react()` and `effects.js`, if gameplay does not delete its swaps.
- Art sitting unimported on a branch.
- FPS has only been measured on an M4 Pro under load.
- The interiors are underlit, which hurts readability and the judges' first impression.
- The 100-file cap. Art uses 4 files now, plus `props.js` and `audio.js`.
=== END PLAN ===

=== LEARN ===
2026-10-10 consult 3: I checked the rain-shelter checkpoint images myself. Indoor rain is gone in the relay (`renders/rain-shelter-readability/before-relay-med.png` vs `after-relay-med.png`), and the medium alley rain now reads below the accents (`after-alley-med.png`).

Removing the rain uncovered a second defect: the relay interior is nearly black, and only the teal rings read. The rain curtain had been the main source of light-coloured pixels in that room.

Lesson: when a fix removes a visual layer, re-judge the bare scene. One defect can mask another. Interior fill lighting is now its own task (§5 readability, §11 relay mood).
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 3: Shelter volumes should be exported from art and keyed to gameplay's known footprints (relay, substation passage, elevator), not placed by gameplay through `addShelter` calls. That leaves one less cross-lane trigger that can fail silently, and it follows the consult 2 rule that art solves its own visual defects inside art modules. The integration worker must check the volumes against gameplay's current `district.js` footprints from the images, not from the coordinates alone.
=== END LEARN ===
