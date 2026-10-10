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
