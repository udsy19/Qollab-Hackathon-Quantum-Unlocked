=== PLAN ===
**Lane goal (G3, plan row 6):** deliver the cyberpunk atmosphere of vision §5 and §11 without destabilising gameplay. That means:
- graphite structures, a wet-ground approximation, fog and rain
- an instanced skyline
- cyan for quantum, amber for classical
- three hero landmarks
- the §11.2 skyline-restoration ending
- audio that starts only after user input
- high/med/low presets that run the same logic
- ≥30 FPS at medium

Everything is procedural or original, and every file is under 2 MB. Due Sun 05:00 ET; feature freeze Sun 14:00 ET.

**Approach:** art ships drop-in factory modules (`create*` → `update` / `setQuality` / `dispose`, plus `refs`). They fit gameplay's graybox footprints. We prove them in `tools/art-preview*` harnesses that run over gameplay's real graybox. After G2, one integration worker wires them into the district.

**Done:**
1. `atmosphere-kit` (merged at consult 2): `echo/scene/{lighting,rain,buildings,effects}.js` and `tools/art-preview/`.
2. `rain-shelter-readability` (merging now, consult 4). I judged it from the images:
   - The relay, passage and elevator have no rain at any preset.
   - With the shader test sabotaged, rain comes back into the relay (`falsify-shader-test-off-relay-med.png`), so the gate bites.
   - The medium alley rain sits below the accents (`crop-objective-door-player-med.png`: the door, strips and booth all read with rain on).
   - Draw calls did not change.
   - One null is recorded: additive blending at opacity 0.55 went red only on high.
3. `props-audio` (merging now, consult 4): `echo/scene/props.js` with 12 factories, and `echo/game/audio.js` with 9 synthesized cues and 4 zone beds.
   - Audio unlocks only after input, and the 3 sabotage checks went red.
   - Landmarks (`b-landmarks-before-after.png`): the booth reads as a PALISADE kiosk and the relay core's energized state is a strong cyan change. The mast's link-active change is too subtle; it is a follow-up.

**In flight:** `interior-lighting-pass` (dispatched now). It adds fill light to the relay, passage and elevator, and makes the amber schematic readable. Proof is a luminance table before and after on the same poses.

**Next:**
- Mast and booth state legibility. The before/after change at 10–14 m must be visible at a glance (§9.3, §11.3). This is a small worker once a slot frees.
- After G2 (Sat 17:00): an integration worker wires lighting, rain, skyline, effects, props and audio into gameplay's district, once gameplay has acted on the relayed requests.
  - Art exports a `SHELTERS` constant keyed to gameplay's footprints.
  - Fold the palette into one copy.
- Perf pass on a throttled, mid-range-like profile.
- Finale polish with gameplay's `finalShot`.
- Someone should listen to the WAVs: `music_swell`, `zone-alley`, `radio_static_burst`, `ui_failure`.

**Risks:**
- Two writers on the same materials: gameplay `react()` vs `effects.js`.
- Art sitting unimported until gameplay adopts it.
- FPS measured only on a loaded M4 Pro.
- Underlit interiors hurt the first impression.
- The 100-file cap: art now has 6 product files.
- `props.js` `COLOR` duplicates district `PALETTE`.
=== END PLAN ===

=== MERGE branch=lane/art/rain-shelter-readability ===

=== MERGE branch=lane/art/props-audio ===

=== AGENT name=interior-lighting-pass model=opus base=lane/art/integration ===
**GOAL:** a first-time player walking into the substation passage, the underground relay chamber and the elevator corridor can read the room: walls, floor, pedestal, consoles and the amber schematic. The mood stays dark and cyberpunk. Today these rooms sit at about 5–10% luminance, and only the teal rings read (`renders/rain-shelter-readability/after-relay-med.png`, `after-passage-med.png`, `after-elevator-med.png`). Removing the indoor rain uncovered this: the rain curtain had been the main source of light pixels.

**VISION:** ECHO_MASTER_VISION.md §5 ("readability first"; cyan = quantum, amber = classical; the contrast hierarchy puts accents first) and §11 (relay mood: cyan conduit glow lighting the chamber, rim light on the pedestal, the amber classical schematic visible as a story beat). Judges form their impression in the first minutes, and the relay is Mission 2's teaching room.

**WHAT WE ARE BUILDING:** art-owned, drop-in modules for the Qollab `echo/` game. You may edit only `echo/scene/lighting.js`, `echo/scene/effects.js`, `echo/scene/props.js` (for the schematic only, if needed) and `tools/art-preview*/`.
- Gameplay owns `district.js`, `relay.js`, `rooftop.js` and `alley.js`. Do not edit them.
- Fill lights go into an art export keyed to gameplay's known room footprints. Suggested form: `createInteriorLights({ scene, quality })` in lighting.js, or local lights in effects tied to the `conduit` and `schematic` refs. Reuse what exists; no second lighting system.
- Constraints:
  - Respect the presets. Low gets no real-time point lights: use emissive cards or a hemisphere tint instead. Med gets few. High gets more.
  - Keep ≥30 FPS at med, and keep the draw-call budget (med alley/relay/final: 84 / 37 / 13) within about +10%.
  - No binary assets (vision §5.4, lane decision).
  - Quality ids are `'low'|'med'|'high'` from `echo/contracts.js`.
- §9.3 world changes still apply. The relay should be noticeably brighter or cyan-er once `relay_energized` (or the equivalent `WORLD_CHANGES` id) fires. Do not let fill light flatten that before/after contrast.

**WHAT HAS NOT WORKED:**
- Rain doubling as interior light. It made a bright curtain indoors, which consult 2 rejected.
- Pushing zone toggles onto gameplay. The lane rule: art fixes its own visuals inside art modules, because every cross-lane trigger can fail silently.
- Judging by numbers alone. The supervisor merges on images. A one-sided "mean luminance went up" can be propped up by a blown-out wall: also report the upper percentiles, and confirm the accents still dominate (gate-independence law 11).
- Flat amber schematic card (defect 3): it reads as a sticker, not a lit display.

**VAULT AND REPORTS TO READ FIRST:** `vault/AGENTS.md`, `vault/Index.md`, `vault/Reports/atmosphere-kit.md`, `vault/Reports/props-audio-kit.md`, `lanes/art/reports/0002-rain-shelter-readability.md` (its pixel gate, poses and accent mask are reusable: extend `rain-gate.mjs` or its harness rather than writing a new one), `lanes/art/reports/0001-props-audio.md` (relay core / conduit factories), and `lanes/art/context.md`.

**WHERE TO START:**
- `node tools/art-preview/serve.mjs <your own port>`. Use the same relay, passage and elevator camera poses as the rain-shelter evidence, so the images pair before/after.
- Write the readability check first and watch it go red on the current build. Suggested measurement:
  - per room: luminance p10/p50/p90/p99
  - the fraction of wall/floor pixels above a floor threshold
  - the accent median vs the non-accent p99
- Then make the change.

**DELIVER:**
1. Commits on your branch.
2. `renders/interior-lighting-pass/`, containing:
   - before/after pairs for relay, passage and elevator at low, med and high
   - the relay before and after its energized world change, at med
   - a schematic close-up
   - one alley med frame proving the exteriors did not change
3. A luminance table (before/after, per room, per preset), an FPS and draw-call table, and a sabotage round: turn the fill off and show the check goes red. Report the nulls.
4. `node tools/qollab-caps/check.mjs` and `node tools/contract-check/check.mjs` output. Name any pre-existing failures as pre-existing.
5. `vault/Reports/interior-lighting.md`, linked via `node scripts/vault-hubs.mjs`.

**HOW I WILL JUDGE:** I look at the images myself.
- The pedestal, walls and schematic must be readable at med.
- The accents must still be the brightest thing in the room.
- The energized change must still read.
- Low must not look broken.

A report without paired images is not merged.

**REPORT:** `lanes/art/reports/0003-interior-lighting-pass.md`. Open it with a TL;DR, then a "Vault check". Write a checkpoint version within 1 h, including the red-first check output.
=== END AGENT ===

=== ASK_OWNER ===
These are not decisions; they are relay requests to the gameplay lane through the overseer, because I cannot write gameplay's `owner-answers.md`:
1. **Rain shelters** (art report `0002-rain-shelter-readability.md` § "Requests to gameplay"): call `rain.addShelter` with the three boxes (passage, relay, elevator), and call `rain.setReducedMotion(settings.reducedMotion)` on settings change. This supersedes 0001 request #4: do NOT toggle rain intensity by zone. Art will move to exporting `SHELTERS` itself at integration, so gameplay only needs to keep the footprints stable.
2. **Props swap list** (`0001-props-audio.md`, swap table at the end): replace the graybox booth, relay core, conduit, mast, sockets and terminal boxes with the `props.js` factories at the listed positions. Send one in-world screenshot per landmark at about 10 m after the swap.
3. **Audio unlock** (platform/story-ui): call `audio.unlock()` on the title Start click, and wire `onCue` to captions.
4. The atmosphere-kit adoption list (0001 report) still stands. The most important item is removing gameplay's `react()` material swaps, so `effects.js` is the single writer.
=== END ASK ===

=== LEARN ===
2026-10-10 consult 4: I merged rain-shelter-readability on images, not on its numbers.
- Evidence the fix works: `crop-objective-door-player-med.png` shows the accents dominating with rain on.
- Evidence the gate bites: `falsify-shader-test-off-relay-med.png` shows the rain return indoors.
- The recorded null: additive blending at opacity 0.55 goes red only on high. A blend-mode or saturation check would close it, and is optional.
- The worker was still listed as running when I merged. Its report was final, with 4 commits, so I merged without a KILL.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 4: I merged props-audio. In `b-landmarks-before-after.png` the relay core's energized change reads strongly. The booth indicator and especially the mast's link-active change are near-invisible at 10–14 m. Lesson: every §9.3 world change on a landmark needs a before/after pair at gameplay distance in which a glance shows the difference. Change the emissive area or the colour, not just the intensity of a thin strip. This is a queued follow-up.
=== END LEARN ===
