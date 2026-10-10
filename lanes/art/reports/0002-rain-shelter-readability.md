## TL;DR
- **DONE.** Four commits on `lane/art/rain-shelter-readability` (7456d01, c658c08, f0261af, 84d3673).
  - `rain.addShelter(box3|{min,max})` and `clearShelters()`: up to 8 boxes, collapsed in the vertex shader, no extra draws.
  - Rain look per preset (`RAIN_LOOK`): normal blending, darker colour, near fade.
  - `setReducedMotion(bool)`: speed ×0.35, density ×0.5.
- **Indoors, no rain at any preset.** Pixel gate (rain shown vs hidden in the same frame): relay, passage and elevator coverage went from 0.67–11.41% to 0.00% at low, med and high.
- **Accents dominate in the alley.** p99 luminance of rain pixels went from 0.60–0.70 to 0.30–0.33, against an accent-strip median of 0.71. Accent wash at med fell from 4.26 to 0.60.
- **Falsified on a disposable worktree.** With the shader test off, rain returns indoors (`falsify-shader-test-off-relay-med.png`) and 9/9 indoor checks go red. One null: reverting to additive blending at opacity 0.55 went red only on high.
- **Perf.** Draw calls unchanged (med: 84 / 37 / 13). Med FPS before → after: alley 111.5 → 105.8, relay 105.4 → 113.7, final shot 104.0 → 94.1. That is ±10% noise at load average 26–36.
- **Caps check** exits 1 on the same 2 rules as before: platform's `echo/index.html` and `echo/main.js` are absent. No other findings.
- **Evidence** is in `renders/rain-shelter-readability/`. Start with `crop-objective-door-player-med.png`, then the `before-*`/`after-*` pairs.
- **Recommend:** gameplay calls `addShelter` with the 3 boxes in "Requests to gameplay" and adds a roof to the relay chamber.

## Vault check
- **Read:** `vault/AGENTS.md` (from the hook), `vault/Index.md`, `lanes/art/context.md`, `lanes/art/reports/0001-atmosphere-kit.md`, `vault/Reports/atmosphere-kit.md`, and `echo/scene/rain.js`.
  - `vault/Index.md`: grepped for rain, shelter and atmosphere; no entries.
  - Gameplay's `district.js`, `relay.js`, `rooftop.js`, `alley.js` and `player.js`, read with `git show` on `lane/gameplay/gameplay-world-controller` (1a89bfb).
  - Vision §4.3: the relay is "a forgotten underground relay chamber".
- **Already known:** the atmosphere-kit report: rain falls indoors, med is a dense sheet, the rain box is placed ahead of the camera, ShaderMaterials need the colour-space include, and the banding fix.
- **Reused:** the preview server and the earlier worker's playwright harness (`/tmp/atmo-tools`), the same camera poses, and gameplay's real geometry for the shelter boxes.
- **Search:** `where.mjs shelter --branches` found only story text (story-ui's `story.js`) and no code, so `addShelter` is new.
- **Stale:** the earlier report's request #4 ("gameplay calls `setIntensity(0)` by zone") is superseded by `addShelter`. Its relay draw-call count of 50 is now 37, because gameplay's branch changed. I recorded both in the vault note rather than rewriting history.

## What I found
- **Passage and elevator** have roof slabs at y 4.4–4.7, and rain was falling under them.
- **Relay chamber** has 10 m walls and no roof in the graybox, but the vision calls it underground. Its shelter therefore runs from y −1 to 200, and no streaks show above the walls.
- **Additive blending at 0.55 opacity** let overlapping streaks reach luminance 0.78–0.93 (rain-added maximum), brighter than the accents' median of 0.71. That was the curtain.
  - Under normal blending a rain pixel is at most `mix(bg, #7f93ad, a)`, so brightness is bounded by the colour whatever the density.
- **WebGL lines are always 1 device pixel,** so "thickness" can only be tuned through DPR. Opacity therefore rises slightly with the preset (0.22 / 0.26 / 0.30), because higher presets have higher DPR and thinner lines.
- **Near fade (1 → 4 m):** the follow camera sits about 3.5 m behind Rin, so streaks between camera and player thin out. The crop shows her silhouette clean.

## What I changed
- **`echo/scene/rain.js`** (art-owned):
  - `addShelter`, `clearShelters` and `shelters`.
  - `MAX_SHELTERS = 8`, `RAIN_LOOK`, `setReducedMotion` and `reducedMotion`.
  - `uFall` replaces `uTime` for drop motion, so a speed change never makes drops jump.
  - The shelter test checks both streak ends, so a streak crossing a roof edge disappears whole.
  - `addShelter` throws on a 9th box, an inverted box or a missing corner. All three were verified in the browser.
- **`tools/art-preview/`** (dev-only):
  - The 3 gameplay shelters (`?noshelter` disables them).
  - New views: `passage`, `elevator`, `follow`.
  - `?player` loads gameplay's Rin.
  - The reduced-motion checkbox now drives the rain.
  - `rain-gate.mjs`: exit 0 green · 1 red · 2 refused. It needs `PW_CORE` pointing at playwright-core (not vendored).
- **`vault/Reports/atmosphere-kit.md`:** a new section with the gate, the table, the sabotages and perf.
  - Hubs not committed, per the worker rules; `--check` shows `Reports/README.md` and `Map.md` STALE for the loop.

## Evidence (`/Users/udsy/agent-org/lanes/art/renders/rain-shelter-readability/`)
- **Pairs at the same pose:** `before|after-alley-{low,med,high}`, `before|after-relay-{low,med,high}`, `before|after-passage-med` and `after-elevator-med`.
- **Readability crop:** `crop-objective-door-player-med.png`, rain on and off side by side: door strip, objective ring, cyan/amber strips and Rin. The full frame is `after-follow-player-med.png`.
- **Falsification:** `falsify-shader-test-off-{relay,passage}-med.png`.
- **Gate output:** `/tmp/rsr/m-before.jsonl`, `m-after.jsonl`, `m-final.jsonl` and `sab-*.jsonl` (tmp, not committed). The numbers are in the vault note.

### Sabotage round (disposable `git worktree` at c658c08, port 5164)
| sabotage | result |
|---|---|
| S1: shader shelter test → `if (false)` | exit 1; 9/9 indoor checks red; screenshot shows rain back in the relay |
| S2: preview never calls `addShelter` (the enabling step) | exit 1; 9/9 indoor red |
| S3: `addShelter` never increments the count | exit 1; 9/9 indoor red |
| S4: additive blending + opacity 0.55, keeping the new colour and near fade | exit 1, **but only high/alley red**; low and med stayed green (p99 0.327 / 0.344, limit 0.355). **NULL:** the gate bounds brightness, not the blend mode |
| S5: gate's hide step removed (identical frames) | exit 1; 3/3 alley red through the positive control (≥0.5% coverage). Before that control was added, this would have been a vacuous green on every indoor check |
| S6: a world-sized shelter | exit 1; 3/3 alley red |
| S7: shelter test on the tail end only | exit 1; med and high passage red; **low passage stayed green** (partial null: too few drops at low cross the roof edge in that pose) |
| S8: preview with a syntax error | first run exit 1, which is wrong: a crash read as red. I fixed it in f0261af; it now exits 2 (refused) |

### Perf
Headed Chrome 155, Apple M4 Pro, 1920×1080, deviceScaleFactor 2. Before and after were interleaved in one session; load average was 32 at the start and 26 at the end.

| preset | view | before 4708dfc FPS | after FPS | draw calls (both) |
|---|---|---|---|---|
| low | alley walk | 30.0* | 30.0* | 84 |
| low | relay | 106.1 | 96.4 | 37 |
| low | final shot | 111.5 | 114.8 | 13 |
| med | alley walk | 111.5 | 105.8 | 84 |
| med | relay | 105.4 | 113.7 | 37 |
| med | final shot | 104.0 | 94.1 | 13 |
| high | alley walk | 103.1 | 103.2 | 85 |
| high | relay | 113.3 | 104.6 | 38 |
| high | final shot | 112.2 | 101.3 | 14 |

\*Low/alley ran first, in a freshly launched browser, and both trees hit the 30 FPS floor. That is a warm-up artifact, not a preset cost. The shader adds an ≤8-iteration box loop for each of 2 vertices per drop; at this load I cannot separate that cost from noise.

## What I did NOT do or could not verify
- **No Qollab run.** No mid-range-laptop FPS. The machine was heavily loaded.
- **Thin shelter coverage:**
  - Awnings in the alley are not shelters; the 8-slot budget is kept for rooms.
  - The booth is a solid block and needs none.
  - Rain still falls through the open doorway seen from inside, which is correct.
- **Reduced motion** was verified numerically only: drops 4000 → 2000, fall rate 1.00 → 0.35 per second. No screenshot or video.
- **Splash suppression** under shelters is in the shader but not separately measured. The high-preset indoor checks include splashes and read 0.00%.
- **The gate's accent mask** is a saturation/brightness heuristic. In the relay pose it finds no accents (the ring is dim), so that pose is graded only on leaks.

## Decisions inferred from the docs
- **Relay is fully sheltered up to y 200**, despite having no graybox roof: §4.3 says "underground relay chamber".
- **Normal blending** instead of additive: §5.3's contrast hierarchy (accents first) needs a hard brightness bound, and additive has none.
- **Reduced motion** slows the rain to 0.35× and halves the density rather than removing it: §12 asks for reduced motion, while §11 keeps rain as atmosphere.
- **Shelters supplied by the caller** rather than hardcoded in rain.js: per the brief; geometry is gameplay's.
- **Gate thresholds:**
  - Indoor coverage ≤0.01%: the pose sees only indoor space, so any rain pixel is a leak.
  - Rain p99 ≤ 0.5 × accent median: the after values sit 7–15% under it; the before values were 70–98% over.

## Requests to gameplay
1. **After `buildDistrict`, call:**
   ```js
   rain.addShelter({ min: [-3.5, -1, -41.6], max: [3.5, 4.7, -26] });    // substation passage (roof slab 4.4–4.7)
   rain.addShelter({ min: [-10, -1, -60],    max: [10, 200, -41] });     // relay chamber (underground, §4.3)
   rain.addShelter({ min: [8.8, -1, -53.5],  max: [17.2, 4.7, -46.5] }); // elevator corridor (roof slab 4.4–4.7)
   ```
   - If geometry moves, export these boxes from relay.js and rooftop.js next to the walls, so they move together.
   - This replaces request #4 from report 0001: do NOT toggle `setIntensity(0)` by zone.
2. **Add a ceiling slab to the relay chamber** (it is open to the sky at y 10), so the room reads as underground.
3. **On the settings change,** call `rain.setReducedMotion(settings.reducedMotion)` next to `setQuality`.

## What the supervisor should do next
- Judge by `crop-objective-door-player-med.png`, then the `before-*`/`after-*` relay, passage and alley pairs, then `falsify-shader-test-off-relay-med.png`.
- Forward "Requests to gameplay" 1–3 through gameplay's `owner-answers.md`, marking 0001 request #4 as superseded.
- Decide whether `rain-gate.mjs` belongs on the org board. It needs playwright-core (`PW_CORE`) and Chrome, and it refuses with exit 2 without them.
- Optionally assign a follow-up: a reduced-motion clip, and a gate check that targets blend mode or saturation (the S4 null).
