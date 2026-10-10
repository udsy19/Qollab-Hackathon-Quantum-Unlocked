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

**Approach:** art ships drop-in factory modules (`create*` → `update` / `setQuality` / `dispose`, plus `refs`) that fit gameplay's graybox footprints. We prove them in the `tools/art-preview*` harnesses over gameplay's real graybox. After G2, one integration worker wires them into the district. `lane/art/integration` already contains contracts v2 (80d685f, checked this consult), so new workers are based on it.

**Done (merged into lane/art/integration):**
1. `atmosphere-kit`: lighting, rain, buildings and effects, plus `tools/art-preview/`.
2. `rain-shelter-readability`: shelter volumes in the shader, so no rain falls indoors at any preset. The alley rain now sits below the accents, the rain gate bites when sabotaged, and draw calls did not change.
3. `props-audio`: 12 prop factories and 9 synthesized cues with 4 zone beds. Audio starts only after input, and all 3 sabotage checks went red.

**In flight:**
- `interior-lighting-pass`: fill light for the relay, passage and elevator, and a readable amber schematic. Owns `lighting.js` and possibly `effects.js`.
- `landmark-state-legibility` (dispatched now): the before/after states of the mast, booth and relay must read at a glance from 10–14 m (§9.3, §11.3). It owns `props.js` only, so it cannot collide with the lighting pass.

**Next:**
- After G2 (Sat 17:00): an integration worker wires lighting, rain, skyline, effects, props and audio into gameplay's district, once gameplay has acted on the relayed requests. It also:
  - exports a `SHELTERS` constant from art, keyed to gameplay's footprints;
  - folds the palette into one copy (`props.js` `COLOR` vs district `PALETTE`).
- A perf pass on a throttled, mid-range-like profile.
- Finale polish with gameplay's `finalShot`.
- A reduced-motion clip for the rain and the wave.
- Listen to the WAVs: `music_swell`, `zone-alley`, `radio_static_burst`, `ui_failure`.

**Risks:**
- Two writers on the same materials: gameplay's `react()` and `effects.js`.
- Art sits unimported until gameplay adopts it.
- FPS has only been measured on a loaded M4 Pro.
- Underlit interiors.
- The 100-file cap: art has 6 product files.
- Duplicate palette copies.