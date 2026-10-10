**Lane goal (G3, plan row 6):** the cyberpunk atmosphere of vision §5 and §11, without destabilising gameplay. That means graphite structures, a wet-ground approximation, fog, rain, an instanced skyline, the cyan quantum / amber classical colour language, three hero landmarks, the §11.2 skyline restoration ending, audio that starts after user input, high/med/low presets with identical logic, and ≥30 FPS at medium. Everything is procedural or original, and every file is under 2 MB. Due Sun 05:00 ET; feature freeze Sun 14:00.

**Done (judged this consult):**
- `lane/art/atmosphere-kit` (8196838..4708dfc) adds `echo/scene/{lighting,rain,buildings,effects}.js` and the `tools/art-preview/` harness. The harness runs over gameplay's real graybox through `git show`, with nothing copied.
- I looked at the evidence myself:
  - `alley-med.png`: graphite alley, cyan and amber accents, and wet-floor streaks are visible.
  - `wave-frames-*.png`: the skyline wave runs left to right over about 5 s, from a blackout city to a lit warm/cyan city.
  - `effects-relay.png`: the conduit turns cyan and the schematic amber.
- The rule checks behind it:
  - Unknown ids throw.
  - Applying an id twice is idempotent, and that check goes red when the guard is sabotaged.
  - A wave replay is guarded, and that check goes red when sabotaged.
  - The caps gate fails only on `index.html`/`main.js`, which belong to platform.
- Accepted. It merges into `lane/art/integration`, which also brings main's contracts v2 in.

**Defects seen in the screenshots (art-owned, being fixed):**
1. Rain falls inside the relay chamber (`effects-relay.png`).
   - Art fixes this inside `rain.js` with shelter volumes, so gameplay does not have to toggle by zone.
2. At medium, the rain is dense and bright enough to compete with the objective lights and silhouettes in `alley-med.png`.
   - §5 asks for readability first, so it needs a legibility tune: thinner, dimmer and with depth fade.
3. The relay schematic is a flat amber card that reads as a placeholder (`effects-relay.png`). This goes to the props worker or the polish pass.

**Running:** `props-audio`, which makes the three landmarks, consoles, signs, storytelling props, and the WebAudio `audio.js` that has to implement `play('reactor_hum'|'music_swell')` for effects.js.

**Next:**
- `rain-shelter-readability`, dispatched now.
- When props-audio lands: judge it and merge it.
- After G2 (Sat 17:00): an integration worker wires the kit into gameplay's district once gameplay has made the swap. The swap is that gameplay deletes its rooftop city, graybox lights, material swaps in `react()` and palette copy; it imports lighting, rain, skyline and effects, and supplies the refs table in report 0001. The overseer is relaying this.
- Then a perf pass under a throttled, mid-range-like profile, and finale polish with gameplay's camera.

**Risks:**
- Two writers on materials, gameplay's `react()` and effects.js, if gameplay does not delete its swaps.
- Art sitting unimported on a branch.
- FPS has only been measured on an M4 Pro under load.
- High-preset shadows show nothing until the meshes opt in.
- The 100-file cap: art is at 4 files plus up to 2 more.