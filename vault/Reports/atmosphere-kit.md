---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---

# Atmosphere kit: lighting, rain, skyline, world-change effects (art lane)

Four modules under `echo/scene/` (`lighting.js`, `rain.js`, `buildings.js`, `effects.js`) plus a dev preview,
`tools/art-preview/` (`node tools/art-preview/serve.mjs 5147`). The preview loads gameplay's REAL graybox
straight from `lane/gameplay/gameplay-world-controller` through `git show` and swaps gameplay's placeholder
lights, floor material and instanced city for these modules. Measured on commit 7f3dd74 and the commit after it.

## Performance: headed Chrome 155, Apple M4 Pro, 1920×1080 CSS px, deviceScaleFactor 2

The machine was under heavy load (load average 56 from other agents), so treat FPS as a lower bound. It is also
not the vision's "mid-range laptop". Frame times come from rAF deltas over 4 s per row, after 1.5 s of warm-up.
Draw calls and triangles come from `renderer.info.render` for one frame.

| preset | view | mean FPS | p95 ms | draw calls | triangles | rain lines | splash pts | DPR | backbuffer |
|---|---|---|---|---|---|---|---|---|---|
| low | alley walk | 92.2 | 25.5 | 84 | 8008 | 1500 | 0 | 1 | 1920×1080 |
| low | relay | 84.8 | 26.0 | 50 | 7432 | 1500 | 0 | 1 | 1920×1080 |
| low | final shot, wave playing | 82.7 | 44.8 | 13 | 5020 | 1500 | 0 | 1 | 1920×1080 |
| med | alley walk | 105.3 | 20.2 | 84 | 8008 | 4000 | 0 | 1.5 | 2880×1620 |
| med | relay | 91.0 | 30.7 | 50 | 7432 | 4000 | 0 | 1.5 | 2880×1620 |
| med | final shot, wave playing | 88.2 | 29.4 | 13 | 5020 | 4000 | 0 | 1.5 | 2880×1620 |
| high | alley walk | 87.9 | 28.7 | 85 | 8008 | 8000 | 400 | 1.75 | 3360×1890 |
| high | relay | 84.7 | 36.1 | 51 | 7432 | 8000 | 400 | 1.75 | 3360×1890 |
| high | final shot, wave playing | 87.4 | 27.6 | 14 | 5020 | 8000 | 400 | 1.75 | 3360×1890 |

Most draw calls are gameplay's per-box graybox meshes: about 80 in the alley. Art adds 6: skyline, haze,
rain, splashes on high only, and the lights' cost inside lit materials.

## Measured findings

- **Rain banding (fixed).** Drop speed was a function of the start-height seed, so every ~2 s all the
  heights collapsed into one band, and screenshots taken in that window showed no rain below ~4 m. The fix
  draws speed from an independent hash of x and z. Found by comparing screenshots taken 1.5 s apart.
- **Rain box placement.** A 36 m box centred on the camera put 123 of 4000 drops (3%) on screen in the alley,
  counted by a JS replica of the shader. A 22×14×22 m box, pushed 7 m ahead of the camera with its bottom
  3 m below the camera, put 1202 of 4000 (30%) on screen.
- **ShaderMaterial colour space.** A raw `gl_FragColor` from a `THREE.Color` uniform is linear. Without
  `#include <colorspace_fragment>`, the haze rendered almost black. Every custom ShaderMaterial needs that include.
- **Fog vs. skyline.** FogExp2 at 0.013 hides tower bodies past ~150 m. The far layer still reads because
  the haze cylinder (fog: false) is brighter than the fog colour, so fogged towers show as silhouettes.
  Lit windows cut the fog factor by up to 50% so the wave reads across the whole city.
- **Wave timing.** `playRestoration({seconds:5})` reached progress 1 at 5.05 s wall clock (frame-sequence run).
  Reduced motion crossfades in 2 s.
- **Idempotence.** Taking a snapshot of every ref's colour, opacity and visibility, the added fine-light
  objects, the skyline progress and the rain intensity, then re-applying all 13 ids in the same tick, gives
  identical bytes. With the `applied.has` guard sabotaged, the bytes differ. Replaying the wave after it
  finishes returns `already restored`. With a sabotaged version that restarts from 0, progress went back to 0.07.
- **A trap for the next gate.** Comparing snapshots across frames is NOT a valid idempotence check, because
  the objective ring pulses its opacity. The first attempt went red for that reason, not for a real defect.

## Rain shelters and readability (2026-10-10, branch `lane/art/rain-shelter-readability`)

`rain.addShelter(box3 | {min, max})` / `clearShelters()`: up to 8 world boxes in one uniform array.
The vertex shader moves any streak with EITHER end inside a box outside the clip volume. Splashes do the
same. No extra draws. Indoor-ness lives in rain.js, not in a zone trigger the caller might miss.

The look is now `RAIN_LOOK` per preset (opacity 0.22 / 0.26 / 0.30, streak 0.040–0.045 s of fall), with
**normal** blending instead of additive and colour `#7f93ad`. With normal blending, no rain pixel can be
brighter than the rain colour, however many streaks overlap. A near fade (1 → 4 m) keeps streaks off the
player silhouette. `setReducedMotion(true)` sets fall speed ×0.35 and density ×0.5. Fall time is
accumulated (`uFall`), so toggling never makes the drops jump.

**Gate:** `tools/art-preview/rain-gate.mjs`. It renders the same frame with rain shown and hidden and reads
the framebuffer. Indoor poses (relay, passage, elevator) must show ≤0.01% rain pixels. Outdoors (alley),
rain must cover ≥0.5% of pixels (positive control), and the p99 luminance of rain pixels must be ≤ 0.5 ×
the accent strips' median luminance. Before (4708dfc): 12/12 red. After: 12/12 green.

| preset | indoor coverage % (relay / passage / elevator) | alley rain-pixel L p99 (accent median 0.71) | alley accent wash (mean Δ/255) |
|---|---|---|---|
| low | 3.99 / 1.33 / 0.67 → 0 / 0 / 0 | 0.602 → 0.304 | 2.57 → 0.22 |
| med | 7.01 / 2.32 / 1.48 → 0 / 0 / 0 | 0.644 → 0.331 | 4.26 → 0.60 |
| high | 11.41 / 3.64 / 2.43 → 0 / 0 / 0 | 0.703 → 0.327 | 6.31 → 1.11 |

**Sabotage (on a disposable worktree):** turning the shader test off, never calling `addShelter`, or never
incrementing the shelter count turns all 9 indoor checks red. A world-sized shelter or a broken
hide step turns the 3 alley checks red (the positive control). Testing only the tail end of the streak
turns the passage red at med and high, but NOT at low. A page that never loads exits 2 (refused).
**Null:** going back to additive blending at opacity 0.55, while keeping the new colour and the near
fade, turned only high red. Low and med stayed green at p99 0.327 and 0.344 (limit 0.355). The gate bounds
brightness; it does not detect the blend mode.

**Perf:** draw calls are unchanged (med: alley 84, relay 37, final shot 13). Before and after were measured
interleaved in one session at load average 26–36. FPS differs by ±10% either way, which is noise at that
load. Med: alley 111.5 → 105.8, relay 105.4 → 113.7, final shot 104.0 → 94.1. The relay now has 37 draw
calls (50 in the table above) because gameplay's branch changed since the first measurement.
