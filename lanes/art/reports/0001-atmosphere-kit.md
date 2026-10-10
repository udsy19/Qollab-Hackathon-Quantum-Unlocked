## TL;DR
- DONE, with gaps named below. Branch `lane/art/atmosphere-kit`, 3 commits (8196838, 7f3dd74, 4708dfc). It adds `echo/scene/{lighting,rain,buildings,effects}.js`, a dev preview in `tools/art-preview/`, and `vault/Reports/atmosphere-kit.md`.
- The preview runs these modules over gameplay's REAL graybox. It is served live from `lane/gameplay/gameplay-world-controller` through `git show`, with nothing copied. Start it with `node tools/art-preview/serve.mjs 5147` and open `http://127.0.0.1:5147/tools/art-preview/`.
- Look: graphite alley with cyan/amber accents, puddle-masked wet floor with coloured reflection streaks, rain as 1 draw, and a 3-layer skyline plus horizon haze that hides the map edge.
- Wave: sweeps left→right as seen from gameplay's `finalShot`, reaching progress 1 at 5.05 s wall clock. A replay returns `already restored`. Reduced motion does a 2 s crossfade.
- Medium preset at 1920×1080 (DPR 1.5, Apple M4 Pro, load average 56): 88–105 FPS mean, 84 draw calls in the alley, 13 on the final shot.
- All 13 `WORLD_CHANGES` ids have an apply path. An unknown id throws. Applying twice leaves the state byte-identical, and this check goes red when the guard is sabotaged.
- Evidence is in `renders/atmosphere-kit/`: `alley-{low,med,high}.png`, `skyline-{before,mid-wave,after}.png`, `skyline-reduced-motion-crossfade-mid.png`, `wave-5s-left-to-right.mp4`, `wave-frames-*.png` and `effects-*.png`.
- Recommendation: gameplay adopts these modules and deletes its city, its lights and its material swaps (details at the end of this report). Gameplay also sets rain to 0 indoors: rain currently falls inside the relay chamber.

## Vault check
- **Read:** `vault/AGENTS.md` (delivered by the hook), `vault/Index.md` (no art/rain/skyline/lighting entries), `lanes/art/context.md`, `vault/Research/qollab-platform-and-submission.md` (three 0.186.1 by name; `<script>` does not run), `echo/contracts.js` (WORLD_CHANGES, QUALITY_LEVELS, DEFAULT_SETTINGS), and gameplay's `district.js`, `renderer.js`, `rooftop.js`, `alley.js` and `relay.js` read with `git show`.
- **Already known:** gameplay's rooftop.js has a 240-tower instanced city with a radial facade wave and fog-ignoring strips. PALETTE lives in gameplay's district.js.
- **Reused:** the rooftop city's idea and layout: instanced bodies, a kept-clear district rect (`x[-14,44] z[-64,10]`, the same numbers), facade/crown strips, fog-resistant windows and seed 7. Gameplay's `finalShot` is used as the sweep view, and its renderer and district come in unmodified.
- **Search:** `where.mjs --branches` for createRain, createSkyline, createLighting, createEffects and wetGround came back with NOTHING FOUND on 35 branches. `lane/art/props-audio` has no diff against main.
- **Stale or wrong:** nothing found stale. The brief asks to link the report via `vault-hubs.mjs`, but the worker rules forbid committing hub output. I wrote the note and left the hubs for the loop: `--check` shows `Reports/README.md` and `Map.md` as STALE.

## What I built
- **lighting.js** — `createLighting({scene, renderer, quality, accents, fogDensity})`.
  - Lights: hemisphere, one key, and 4 accent point lights.
  - Fog: FogExp2 0.013, a shade lighter than the sky.
  - Exports: `PALETTE` (§5.3), `QUALITY_PRESETS` (DPR low 1.0 / med 1.5 / high 1.75; shadows only on high; streak strength) and `checkQuality`, which uses contracts' `QUALITY_LEVELS`.
  - `createWetGroundMaterial()`: puddle-noise roughness plus fake reflection streaks placed between the camera and each accent's ground projection. No SSR and no planar pass.
  - Also `follow(target)` for the shadow frustum, `setRestoration(k)` (fill lifts and fog warms), and `dprFor(q)`.
- **rain.js** — `createRain({scene, camera, quality})`.
  - One LineSegments draw. All motion runs in the vertex shader, world-anchored and wrapped in a box ahead of the camera.
  - Counts: low 1500, med 4000, high 8000. Changing preset only changes the draw range.
  - On high only: 400 splash rings as a second Points draw.
  - `setIntensity(0..1)`.
- **buildings.js** — `createSkyline({scene, seed, footprint, sweepView, quality})`.
  - 390 towers in 3 depth layers in ONE InstancedMesh. Windows are generated in the shader from per-instance size, plus a crown strip and a horizon haze cylinder.
  - Before restoration it is a blackout city with a few emergency windows and coral crowns.
  - `setRestoration(p)` and `playRestoration({direction:'left-to-right', seconds:5, reducedMotion})` are deterministic. A play while playing or after the wave finished does nothing.
- **effects.js** — `createEffects({scene, refs, audio, skyline, lighting, rain})`.
  - `apply(id, {instant, reducedMotion})`, `reset()`, `update`, `isApplied`.
  - "Fine light" means tints, thin additive bars and a ground ring: no particles.
  - The material is cloned on first touch, so shared kit materials are never changed.
  - If `WORLD_CHANGES` and the handlers drift apart, `createEffects` throws.
- **Preview** — `tools/art-preview/` has a preset switcher, a play-restoration button, a reduced-motion toggle, walk mode, a button per id, an unknown-id button and an FPS/draw-call/triangle readout. It exposes `window.__art` for scripting.

## Evidence (scripted headed Chrome 155; the helper scripts live in /tmp/atmo-tools and are not committed)
- **Unknown id:** `effects.apply('city_lightning_wave')` threw `TypeError: effects.apply: unknown world change "city_lightning_wave"; known: …`. `apply(undefined)` also throws.
- **Apply twice:** all 13 ids returned `already applied`. The snapshot was identical (`identicalSameTick:true`, 763 bytes).
  - **Sabotage:** with the `applied.has` guard removed, the same check gave `identicalSameTick:false`. Restored with `git checkout`.
- **Replay wave:** while playing it returned `already playing` and progress kept rising (0.39). After the wave it returned `already restored` with progress 1.
  - **Sabotage:** with a "restart from 0" version, progress went from 1 to 0 and was 0.068 after 300 ms. Restored.
- **Missing refs:** with `createEffects({refs:{capsule}})` and no audio:
  - At start, `console.error` lists 12 ids that cannot render.
  - `apply('booth_indicator_red_fades')` returns `{applied:false, reason:'missing refs', missing:['boothIndicator']}` and logs.
  - `music_swell` reports missing `system:audio`.
  - The id with its ref present applied normally.
- **All 13 applied in the preview:** 13/13 applied; `audioLog` = `[reactor_hum, music_swell]`. Screenshots are `effects-clone-understood-alley.png`, `effects-relay.png` (before/after: cyan conduit, amber schematic) and `effects-teleport-committed-rooftop.png` (amber line to the node, green vault lamp, lit city).
- **Caps:** `node tools/qollab-caps/check.mjs` exits 1. The only failures are `entry-index` and `entry-main`, because `echo/index.html` and `echo/main.js` do not exist on this branch (platform's files). No size or forbidden-API findings; `backend.run` call sites: 0. Largest file: buildings.js at 12,375 bytes.
- **Perf table:** in `vault/Reports/atmosphere-kit.md`. Medium: 105.3 FPS alley walk / 91.0 relay / 88.2 final shot with the wave playing. p95 frame times run 20–45 ms because the machine was at load average 56.

## Nulls and limits
- **FPS** was measured on an M4 Pro under heavy load, not on a mid-range laptop. Low was not faster than med: system load swamps the difference at these costs. The ≥30 FPS claim covers only this machine.
- **Replay check that cannot fail:** "replay after done leaves progress at 1" would not have caught a version that restarts without resetting progress. It is a vacuous check. The restart-from-0 sabotage is the one that bites.
- **Alley shots** show the door still closed, because gameplay's door animation needs `applyQuestState`, which also swaps materials, so I did not call it. The objective ring is out of frame in the alley shot.
- **Shadows on high:** nothing is set to castShadow, because gameplay's meshes do not opt in. The high preset turns on the shadow map, but no shadows are visible.
- **Not done:** no Qollab run; no audio module (effects only calls `audio.play(cue)`).

## Decisions inferred from the docs
- **Wave direction** is left→right in screen space from gameplay's `finalShot`, not along a world axis. §11.2 describes what the player sees.
- **Reduced-motion crossfade** is min(seconds, 2) = 2 s, uniform across towers. §11.2 asks for a crossfade, and a shorter fade suits reduced motion.
- **`vault_status_green`** uses mint `#6FE3B0`. The §5.3 palette has no green and the contract names green, so I chose the nearest cool tone next to cyan.
- **`ending_dialogue`:** the world calms the rain to 35% over 6 s, while story-ui owns the lines (§9.3 lists it as a world change; §5.3 "fine light").
- **Missing ref:** it logs `console.error` and returns `{applied:false, missing}`, and stays un-applied so it can be retried. It does not throw, because a throw at TELEPORT_COMMITTED would break the one-shot commit (§7.4 token consumed once). Unknown ids still throw (the contracts' fail-loud rule).
- **City colours** are warm-dominant, with cyan rare (§5.3: cyan means quantum, amber means classical, contrast hierarchy).
- **Presets** keep the same objects. Low: no streaks, no twinkle, 1500 drops, DPR 1. High: shadow map on, splashes, DPR 1.75 (§12.2).

## Requests to gameplay (as requests; I did not edit their files)
1. **Delete the city in `rooftop.js`:** `bodies`, `bodyMesh`, `stripMesh`, `paintCity`, `waveT`, `litCount`, `WAVE_SPEED`, `BANDS`, `CITY_DARK`, `CITY_LIT`, and the wave branch in `react` and `update`.
   - Replace it with `createSkyline({ scene, footprint: { minX: -14, maxX: 44, minZ: -64, maxZ: 10 }, sweepView: district.finalShot })`.
   - On reset or non-committed states call `skyline.setRestoration(0)`; on an instant committed state call `setRestoration(1)`. The animated wave comes from `effects.apply('city_lighting_wave')`.
2. **Delete the graybox lights in `district.js`** (the HemisphereLight and DirectionalLight marked "art's lighting.js replaces this") and use `createLighting({ scene, renderer, quality: settings.quality })`.
   - Set `mats.floor = lighting.createWetGroundMaterial()`.
   - Import `PALETTE` from `./lighting.js` and delete the copy in district.js.
3. **In `renderer.js`,** drop the fog/background/DPR lines; `lighting.setQuality` owns them now. Keep `maxPixelRatio` out of it, or pass `lighting.dprFor(q)`.
4. **Rain:** call `createRain({ scene, camera, quality })`, and use `rain.setIntensity(0)` while the player is in the substation passage or the relay chamber. Rain falls indoors now; see `effects-relay.png`.
5. **Effects:** call `createEffects({ scene, refs, audio, skyline, lighting, rain })`. On QUEST_STATE_CHANGED, call `effects.apply(id, { instant, reducedMotion: settings.reducedMotion })` for each `WORLD_CHANGES[to]`, and call `effects.reset()` in `resetGame()`.
   - Remove the material swaps that effects now owns: the `boothLamp`, `capsule`, `vaultLamp`, `socketLamp`, `fiber`/`node` and `schematic.visible` and conduit/ring tints in `react()`. Otherwise the two writers fight.
   - **Refs to supply (Object3D):**

     | ref | gameplay object |
     |---|---|
     | `boothIndicator` | alley `boothLamp` |
     | `corridorDoorStrip` | `door_alley.strip` |
     | `objectiveTarget` | an Object3D at door A (0, 0, −24.5) |
     | `conduit` | relay `conduit` |
     | `schematic` | relay `schematic` |
     | `rooftopAccessLamp` | the elevator corridor's amber strip |
     | `socketLamp` | rooftop `socketLamp` |
     | `skylineNode` | rooftop `node` |
     | `capsule` | rooftop `capsule` |
     | `vaultLamp` | rooftop `vaultLamp` |

   - **Audio:** `audio.play('reactor_hum')` and `audio.play('music_swell')` (`AUDIO_CUES` in effects.js), for the art props-audio worker.
6. **Every frame:** call `update(dt, elapsed)` on lighting, rain, skyline and effects. On a settings change call `setQuality(q)`. To get high-preset shadows, set `castShadow`/`receiveShadow` on selected meshes (player, crates, rooftop floor).

## What the supervisor should do next
- Send the request list above to gameplay through their `owner-answers.md`. Item 5's material-swap removal is the one that matters most: without it, gameplay's `react()` overwrites the effects.
- Assign a follow-up for art: make an audio module that implements `play(cue)` for `reactor_hum` and `music_swell` (props-audio), and tune high-preset `castShadow` on hero meshes once gameplay adopts the kit.
- After adoption, re-measure FPS on a mid-range laptop, or on this Mac with the agents quiet.
