=== PLAN ===
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
=== END PLAN ===

=== MERGE branch=lane/art/atmosphere-kit ===

=== AGENT name=rain-shelter-readability model=opus base=lane/art/atmosphere-kit ===
**GOAL:** Rain never falls indoors, and at every preset the rain reads as atmosphere, not as a curtain. A first-time player can always pick out the cyan/amber objective lights, door strips and the player silhouette through the rain.

**VISION:** ECHO_MASTER_VISION.md §5 (readable palette, cyan = quantum, amber = classical, contrast hierarchy), §11 (rain/fog), §12.2 (quality presets: same logic, different cost) and §12 (reduced motion).

**WHAT WE ARE BUILDING:** `echo/scene/rain.js` (art-owned) in a Qollab-native Three.js 0.186.1 game. It is one LineSegments draw with all motion in the vertex shader, plus splashes on high only. The API is `createRain({scene, camera, quality})`, `update`, `setQuality` and `setIntensity`. Gameplay will import it after G2. Do not edit gameplay's or platform's files.

**WHAT HAS NOT WORKED:**
- The current rain falls inside the relay chamber: see `/Users/udsy/agent-org/lanes/art/renders/atmosphere-kit/effects-relay.png`.
- At medium it is a dense bright sheet that competes with the accents: see `/Users/udsy/agent-org/lanes/art/renders/atmosphere-kit/alley-med.png`.
- The previous report proposed asking gameplay to call `setIntensity(0)` by zone. That couples them to our internals, and a missed zone trigger lets rain leak indoors. Solve it inside rain.js instead.

**Vault/notes to read first:**
- `lanes/art/context.md` and `lanes/art/reports/0001-atmosphere-kit.md` (the full report).
- `vault/Reports/atmosphere-kit.md` and `vault/Index.md`.
- `echo/contracts.js` (QUALITY_LEVELS `'low'|'med'|'high'`).
- Gameplay's geometry for indoor volumes: `git show lane/gameplay/gameplay-world-controller:echo/scene/district.js` and `relay.js`. Read only.

Run `node scripts/where.mjs shelter --branches` before adding any symbol.

**Where to start:**
1. Add `rain.addShelter(box3 | {min,max})` / `clearShelters()`, a small fixed-size uniform array (≤8 boxes). The vertex shader collapses any drop inside a shelter, at zero extra draws.
2. Tune drop alpha, length and thickness and add distance fade per preset so that the accents dominate. Brightness should stay below the accent strips.
3. Let reduced motion slow the drops or cut their density (accept `setReducedMotion(bool)` if needed).
4. Add the gameplay indoor volumes as preset shelters in the preview only (`tools/art-preview/`), not hardcoded into rain.js.

**Deliver:**
- Commits on your branch `lane/art/rain-shelter-readability`.
- Before/after screenshots from the preview at low, med and high in the alley and the relay chamber, with the same camera poses as `renders/atmosphere-kit/`. Save them to `/Users/udsy/agent-org/lanes/art/renders/rain-shelter-readability/`.
- A one-frame crop showing that the objective lights and door strip read through the rain.
- FPS/draw calls at medium versus the previous numbers (alley 105 / relay 91 / final shot 88 FPS mean; machine load stated).
- Update `vault/Reports/atmosphere-kit.md`.
- Run `node tools/qollab-caps/check.mjs` and report its result.

**How I will judge it:**
- Primarily by the screenshots: no streaks inside the relay or the passage, and accents clearly dominant over the rain.
- Then by your falsification. Disable the shelter test in the shader and show that rain returns indoors in a screenshot. Report what did NOT go red.
- Draw calls must not rise.

**Report:** `lanes/art/reports/` as usual. Open with **Vault check** and a TL;DR; checkpoint within 1 h. Any shelter coordinates gameplay must supply go under "Requests to gameplay".
=== END AGENT ===

=== ASK_OWNER ===
This is a coordination request for the overseer to relay to the gameplay lane. It is not a design question. The art atmosphere kit is on `lane/art/atmosphere-kit` (merging into `lane/art/integration`) and needs gameplay's adoption after G2. The list is in `/Users/udsy/agent-org/lanes/art/reports/0001-atmosphere-kit.md`, § "Requests to gameplay".

In short:
- Gameplay deletes its rooftop city, its graybox lights, the material swaps in `react()` and its PALETTE copy.
- Gameplay imports `createSkyline`, `createLighting`, `createRain` and `createEffects`.
- Gameplay supplies the 10 refs listed there.

The swap of material writes is the critical part: otherwise gameplay's `react()` and art's effects.js both write the same materials. Evidence: [skyline wave](renders/atmosphere-kit/wave-frames-0.0-0.8-2.1-2.9-3.9-5.2s.png), [alley medium](renders/atmosphere-kit/alley-med.png). Please add this to gameplay's `owner-answers.md`.
=== END ASK ===

=== LEARN ===
2026-10-10 consult 2: I merged atmosphere-kit after looking at the screenshots myself. Two defects showed only in the images, not in the report's checks: rain falls indoors (`renders/atmosphere-kit/effects-relay.png`), and medium rain is a bright curtain that competes with the accents (`alley-med.png`).

Rule: art solves its own visual defects inside art modules (shader shelter volumes) rather than pushing zone toggles onto gameplay. Every cross-lane call is a place where a missed trigger fails silently. Basis: §5 readability first.
=== END LEARN ===

=== LEARN ===
2026-10-10 consult 2: Cross-lane adoption requests (gameplay deleting its city, lights and material swaps) go to the overseer through the ASK_OWNER block, because the supervisor cannot write another lane's `owner-answers.md`. The exact list lives in `reports/0001-atmosphere-kit.md` § "Requests to gameplay". Re-check before G2 integration that gameplay has acted on it.
=== END LEARN ===
