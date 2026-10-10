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
=== END PLAN ===

=== AGENT name=landmark-state-legibility model=opus base=lane/art/integration ===
**GOAL.** A first-time player who glances at each hero landmark from gameplay distance (10–14 m, the medium preset, rain on) can tell at once whether it is in its "before" or its "after" state:
- **Booth:** active and armed vs understood and safe (`setIndicator`).
- **Relay core:** dormant vs energized (`setEnergized`).
- **Mast:** link down vs link active (`setLinkActive`).
- **Rooftop quantum console:** capsule active vs vault green (`setCapsuleActive` / `setVaultGreen`).
- **Classical socket:** broken vs repaired (`setRepaired`).

These state changes are how the world shows the player that they made progress (vision §9.3 world changes, §11.3 landmark list, §5.3 cyan quantum / amber classical language).

**VISION.** ECHO: ONE OF ONE has to teach through the world reacting, not through text. A world change nobody notices is a progress signal lost, and a judge watching the demo video sees nothing happen.

**WHAT WE ARE BUILDING.** `echo/scene/props.js`, art's procedural prop kit, which gameplay will swap in for its graybox boxes. You edit **only** `echo/scene/props.js` and the dev preview under `tools/art-preview-props/`. Do NOT touch `lighting.js`, `effects.js`, `rain.js` or `buildings.js`: the worker `interior-lighting-pass` owns those right now. Gameplay's files are read-only to you. Use `git show lane/gameplay/gameplay-world-controller:<path>` for footprints and camera.

**WHAT HAS NOT WORKED.** In `renders/props-audio/b-landmarks-before-after.png` the relay core reads strongly. The booth indicator, and especially the mast's link-active change, are near-invisible at 10–14 m. Each is an intensity change on a thin strip.
- **Lesson:** change emissive AREA and/or HUE (for example dead grey to cyan or amber, a beacon or halo that switches on, a light cone, rotating or blinking elements that start), not just the intensity of a thin line.
- **Constraints:** keep within the §5.3 colour language (cyan = quantum, amber = classical) and keep the accents dominant over rain (see the rain-shelter-readability report). Reduced motion must still read: a colour or area change, not only motion.
- **Draw calls:** do not add more than about 2 per prop at med (the current counts are in `vault/Reports/props-audio-kit.md`).

**VAULT NOTES TO READ FIRST:**
- `vault/AGENTS.md`
- `vault/Index.md`
- `vault/Reports/props-audio-kit.md`
- `vault/Reports/atmosphere-kit.md`
- `lanes/art/reports/0001-props-audio.md` (the swap table and the landmark positions)
- `lanes/art/reports/0002-rain-shelter-readability.md` (the accent-dominance gate)
- `lanes/art/context.md`
- vision `ECHO_MASTER_VISION.md` §5.3, §9.3 and §11.3

**WHERE TO START.** Run `node tools/art-preview-props/capture.mjs <your own port> <out>`, and reproduce the before/after pairs at 10 m and 14 m from a third-person camera height, with rain on and the medium preset. Write the check FIRST and watch it fail on the current code: for each landmark, measure the before-vs-after mean colour difference over the landmark's screen region at 12 m (ΔE or a luminance+hue table), with a threshold that you justify. Then change `props.js`.

**DELIVER:**
1. Commits on your branch.
2. `renders/landmark-state-legibility/`, containing:
   - one side-by-side before/after image per landmark at 12 m on the medium preset with rain, for the current code and for yours;
   - the same images on the low preset;
   - one reduced-motion pair for the mast.
3. A table of the measured differences (old vs new) per landmark.
4. A sabotage round: revert one landmark's change on a disposable copy and show that the check goes red. Report any nulls.
5. The draw-call delta per prop.
6. An update to `vault/Reports/props-audio-kit.md` (or a new linked report), then run `node scripts/vault-hubs.mjs`.
7. `node tools/qollab-caps/check.mjs` output (the 2 known absences of platform files are expected; report anything else).

**HOW I WILL JUDGE:** by looking at the side-by-side images. If I cannot tell before from after at a glance at 12 m for the mast and the booth, the work is refused, whatever the numbers say. Secondary: no new draw-call blow-up, the colour language is kept, and nothing outside `props.js` and the preview has changed (`git diff --stat lane/art/integration...HEAD`).

**REPORT** to `lanes/art/reports/0003-landmark-state-legibility.md`, opening with a "Vault check". It has a TL;DR, the evidence paths, the sabotage results and nulls, what was not verified, and the inferred decisions with doc citations. Write a checkpoint report within 1 h even if the work is partial, marked PARTIAL.
=== END AGENT ===

=== LEARN ===
2026-10-10 consult 5: `lane/art/integration` now contains contracts v2 (80d685f is an ancestor, checked with `git merge-base --is-ancestor`). The consult-1 rule "base art workers on main" is superseded: base them on `lane/art/integration`. When two art workers run in parallel, their briefs give each one disjoint file ownership (for example, lighting/effects for one and props.js for the other), so the lane never merges two edits to the same module.
=== END LEARN ===
