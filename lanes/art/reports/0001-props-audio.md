# props-audio: final report, consult 1

## TL;DR
- **DONE (local runner only, nothing on Qollab).** `echo/scene/props.js` has 12 procedural factories (booth, relay core with cooling columns, mast, 3 console kinds, cyan/amber conduits, holo signs, slogan and shelter billboards, kiosk, guide arrow, tram). `echo/game/audio.js` has `createAudio()` with 9 synthesized cues and 4 crossfaded zone beds. No asset files.
- **Look first:** `renders/props-audio/b-landmarks-before-after.png` (booth / relay / mast, 10–14 m, before and after the §9.3 changes), `c-storytelling-props.png`, `a-lineup-low-med-high-after.png`, `zz-audio-spectrograms.png`. WAVs of every cue and zone are in `renders/props-audio/audio/`.
- **Autoplay proof** (`node tools/art-preview-props/capture.mjs 8743 <out>`, exit 0):
  - Before any input: 0 AudioContexts, 0 oscillators, 0 errors.
  - An unknown cue, an unknown zone, volume 101 and volume 50.5 each throw RangeError.
  - A real click creates exactly 1 running context.
  - A repeated `music_swell` adds 0 voices.
- **Sabotage round:** 3 of 3 mutations went red (eager AudioContext, unknown cue accepted, latch removed). No nulls.
- **Draw calls per prop (low/med/high):** booth 10/11/12, relay core 12/14/14, mast 6/8/8, consoles 5–8, billboard 2–3, conduit 1–2. Full lineup 62/77/78.
- **Recommend:** gameplay swaps its graybox boxes for these factories using the table at the end. Atmosphere's `effects.js` drives the refs table. Someone should LISTEN to the WAVs (I can only show levels and spectrograms).

## Vault check
- **Read:**
  - `vault/AGENTS.md` (delivered by the hook), `vault/Index.md` (grep: no prior props/audio entries), `vault/Reports/` listing, `vault/Reports/qollab-caps-gate.md` (format)
  - `echo/contracts.js` and `echo/CONTRACTS.md` on main: `WORLD_CHANGES`, `DEFAULT_SETTINGS`, `QUALITY_LEVELS`, interactable ids
  - `lanes/art/context.md`, `lanes/art/owner-answers.md` (tail)
  - Vision §2.1–2.2, §4.1–4.4, §5.1–5.5, §9.3–9.4, §11.1–11.3, §12.1–12.2
  - Gameplay graybox via `git show lane/gameplay/gameplay-world-controller:echo/scene/{district,alley,relay,rooftop,renderer}.js`, and `dev/gameplay/playthrough.mjs` (how they drive headless Chrome)
- **Already known:** nothing on props or audio. `where.mjs --branches` for `createBooth`, `createRelayCore`, `createAudio` and `createConduit` returned NOTHING FOUND on main, HEAD and all 35 unlanded branches. `echo/scene/` and `echo/game/` did not exist on this branch.
- **Reused:**
  - Gameplay's footprints and anchor positions, and its graybox state conventions (socket lamp amber→cyan, ring colours).
  - `renderer.js`'s background and fog for the preview, so readability is judged in game conditions.
  - Gameplay's puppeteer-from-the-MCP-install pattern.
  - `DEFAULT_SETTINGS`, `QUALITY_LEVELS` and the contract's volume rule from `contracts.js`.
- **Stale or wrong:** `vault/Research/qollab-platform-and-submission.md` not re-read (no platform question arose). `lanes/art/context.md` "Where things stand" still says `echo/` does not exist.

## What I found
- With no env map, high-metalness `MeshStandardMaterial` renders black: the booth shell was pitch black at 3 m. Props now use metalness ≤ 0.3.
- The lattice mast was invisible against the night sky past about 10 m (first render). It now carries porcelain marker lights, cyan deck rails and a coral beacon, and it reads at 14 m (see the b- sheet).
- Headless Chrome never fired `load` for a page importing `three` from jsdelivr (30 s navigation timeouts, twice). The driver waits on `domcontentloaded` plus a `window.__ready` flag instead.
- The booth, relay and mast are distinct silhouettes: a box with two glass pods; a ring-crowned glowing cylinder between three columns; a 22 m tapering spire. Each before/after state differs visibly:
  - booth: the coral roof strip fades;
  - relay: rings, core and plinth linework go cyan;
  - mast: the amber riser lights.

## What I changed (commits on `lane/art/props-audio`)
- `2d90892` art(props-audio): procedural props kit, synthesized audio, dev preview + capture driver
- `5370abe` art(props-audio): mast silhouette lights, low-metalness materials, capture asserts autoplay contract
- `11b4069` vault: report props-audio kit (`vault/Reports/props-audio-kit.md`). The hubs are left STALE on purpose: the loop regenerates them.

Files: `echo/scene/props.js` (42 KB), `echo/game/audio.js` (16 KB), `tools/art-preview-props/{index.html,preview.js,audio-proof.html,audio-proof.js,capture.mjs}`.

## Evidence (commands, exit codes, paths)
- `node tools/art-preview-props/capture.mjs 8743 /Users/udsy/agent-org/lanes/art/target-props-audio-capture` → **exit 0**, `fail: []`, `errors: []`, measured at 5370abe. Full JSON: `renders/props-audio/capture-report.json`.
- Sabotage, each mutation reverted from a backup copy; `git diff --stat echo/` was empty afterwards:
  - eager `build()` in `createAudio` → exit 1, "an AudioContext existed before any user input (1)", "oscillators were created before unlock (61)";
  - `checkCue` never throws → exit 1, "unknownCue did not throw a RangeError (null)";
  - latch removed → exit 1, "music_swell played twice without reset (21 voices)".
- `node tools/qollab-caps/check.mjs` → **exit 1**, red only on `entry-index` and `entry-main`. `echo/index.html` and `echo/main.js` are platform-owned and not on this branch. No rule fired on `props.js` or `audio.js`. Scanned 4 files, 0 `backend.run` sites.
- Screenshots (1280×720 each) in `renders/props-audio/all/`: booth-10m(-after), booth-3m-initials, relay-10m(-after), mast-14m(-after), consoles, kiosk 4 m and 10 m, billboards before/after, holo-8m, arrow-4m, tram, and lineup at low/med/high/after-high.
- Audio levels, peak / RMS dBFS at the default volume 80, through the game's own limiter:
  - terminal_wake −20.5 / −40.5
  - ui_success −20.3 / −37.4
  - ui_failure −15.3 / −34.5
  - radio_static_burst −27.4 / −43.1
  - music_swell −8.8 / −24.8 (15 s)
  - zone beds −22 to −29 RMS
  - nothing clips

## Not done / not verified
- **Nothing on Qollab.** All results are local runner, headless Chrome with SwiftShader.
- **No human listening.** "Quiet, atmospheric, non-grating" is supported only by levels and spectrograms. The supervisor or owner should play `renders/props-audio/audio/*.wav` (start with `music_swell.wav`, `zone-alley.wav`, `radio_static_burst.wav`).
- **Not placed in gameplay's district.** The 8–15 m read under real lighting and rain is unverified, and the in-world positions below are proposals.
- **No FPS measurement** (headless SwiftShader is not representative). Only draw calls were counted.
- **No recorded video.** Cue evidence is WAV plus spectrograms.
- **Captions are story-ui's.** I only expose `onCue(id)`, which fires even while audio is locked or muted.
- **`amber_schematic_visible`** stays gameplay's box. I built no prop for it.

## Decisions inferred from the docs
- Booth header "PALISADE / DUPLICATION SERVICES" and two glass pods (one steady cyan sample, one coral ghost that never resolves): §4.2 ("PALISADE DUPLICATION SERVICES booth … two capsule slots"), §7.1.
- The scratched initials are Rin's own, "R.V. TECH 7 · 2186": §2.2 (Rin, former Palisade quantum network technician) and §11.3 #6.
- The shelter billboard says "DISTRICT NINE SHELTER / POPULATION UNKNOWN" and switches to "GRID RESTORED": §11.3 #5, §2.1 (District Nine).
- The receipt reads "GRID NOTICE: D9 LOAD SHEDDING": §2.1 "controlled load shedding".
- The slogan billboard can glitch (`setGlitch`) for the booth exit beat: §4.2 "corporate billboard glitches".
- `reactor_audio_begins` and `music_swell` latch until `audio.reset()`: §9.3 idempotence, §9.5 restart. I added `reset()` to the API in the brief.
- Extra cues beyond the P0 list (`terminal_input`, `terminal_close`, `door_open`): §5.2 #3 ("electrical chimes, terminal confirmation") and the §9.3 door changes.
- The ending swell is a plagal IV→I in D, about 4 s rise and 15 s total: §11.2 ("skyline lights up over 4–6 seconds"), §11.1 "ending musical swell".
- Quality tiers hide decoration only; silhouettes and emissive state are identical: §12.2 "Game logic and readability must be identical in all modes".
- Volume uses a perceptual taper `(v/100)²`, and the volume rule is `contracts.js` `validateSettings`'s: integer 0..100.

## refs table for `effects.js` (WORLD_CHANGES id → call)
All setters are idempotent targets that ease in `update(dt)`. For RESTART, call each with the opposite value and `audio.reset()`.

| world change | call |
|---|---|
| `booth_indicator_red_fades` | `booth.refs.setIndicator(0)` (1 = coral lit) |
| `corridor_door_opens` / `rooftop_access_unlocked` | gameplay door + `audio.play('door_open')` |
| `objective_target_glows` | `guideArrow.object3D.visible = true` |
| `cyan_conduit_illuminates` | `cyanConduit.refs.setLit(true)` + `relayCore.refs.setEnergized(true)` |
| `reactor_audio_begins` | `audio.play('reactor_audio_begins')` |
| `amber_light_travels_to_skyline_node` | `amberConduit.refs.setLit(true)` + `mast.refs.setLinkActive(true)` + `socketConsole.refs.setRepaired(true)` |
| `capsule_source_indicator_off` | `terminalConsole.refs.setCapsuleActive(false)` |
| `vault_status_green` | `terminalConsole.refs.setVaultGreen(true)` |
| `city_lighting_wave` | `shelterBillboard.refs.setState('restored')` (city wave itself: gameplay/atmosphere) |
| `music_swell` | `audio.play('music_swell')` |
| booth exit beat (§4.2) | `sloganBillboard.refs.setGlitch(true)` + `audio.play('radio_static_burst')` |

Raw materials for custom effects:
- booth: `refs.indicator`, `sourceMaterial`, `ghostMaterial`, `screenMaterial`
- relay: `refs.rings`, `ringMaterial`, `coreMaterial`, `linework`, `columnStrips`
- mast: `refs.beaconMaterial`, `riserMaterial`, `crownMaterial`
- conduit: `refs.material`, `curve`
- consoles: `refs.capsule*`, `vault*`, `socketLamp`, `screenMaterial`
- billboard: `refs.texture`, `state`
- kiosk: `refs.warmMaterial`
- tram: `refs.windowMaterial`

## Box-to-prop swap list for gameplay (a request, not an edit)
Props face +Z with their origin at the floor centre. Keep every existing collider; the props never exceed them.

| graybox (file: what) | replace with | position, rotation.y | react / update |
|---|---|---|---|
| alley.js: `copy_booth` box (5.1, −11.5, 1.8×3×3.2), cyan strip at x 4.18, `boothLamp` | `createBooth()` | (5.1, 0, −11.5), −π/2 | `setIndicator(reached('CLONE_UNDERSTOOD') ? 0 : 1)` |
| alley.js: cone `arrow` at (0, 0.4, −24.5) | `createGuideArrow()` | (0, 0, −24.5), π | same `visible` rule; drop the bob code |
| relay.js: plinth, core, collider, 3 rings, 3 `colGeo` columns | `createRelayCore()` (columns default to gameplay's 3 positions) | (0, 0, −50), 0 | `setEnergized(lit)`; drop the ring spin |
| relay.js: `conduit` box (−5.3, −50, 7.4 long) | `createConduit([[-9,0.05,-50],[-3.3,0.05,-50],[-1.6,0.5,-50]], 'cyan')` | as given | `setLit(lit)` |
| rooftop.js: mast base, shaft and coral top at (35.5, −56.5) | `createMast()` | (35.5, 0, −56.5), 0 | `setLinkActive(linkOn)` |
| rooftop.js: `classical_socket` box + `socketLamp` | `createConsole('classical')` | (21.5, 0, −57.9), 0 | `setRepaired(linkOn)` |
| rooftop.js: `teleport_terminal` box, screen, `capsule`, `vaultLamp` | `createConsole('quantum')` | (30, 0, −43), π | `setCapsuleActive(!committed)`, `setVaultGreen(committed)` |
| rooftop.js: `fiber` box + `node` socket→(62, 14, −78) | `createConduit([from, mid, nodePos], 'amber', { radius: 0.08 })` | as given | `setLit(linkOn)`; the pulse sphere is optional |

New placements, with no graybox box today (proposals; check in-world):
- **kiosk:** (−4.9, 0, −9), π/2, plus a collider 1.6 (x) × 2.4 (z).
- **slogan billboard:** on the door-A lintel, (0, 9.5, −25.9), 0.
- **holo "PALISADE / EVERY COPY PERFECT":** (5.9, 3.6, −15), −π/2.
- **holo MIRROR notice:** (−2.4, 1.6, −33), π/2.
- **shelter billboard:** rooftop, (38.4, 0, −44), −π/2, `poleHeight 1.2`.
- **tram:** default path at z −110, y 18.
- **§11.3 #7 conduits, relay → rooftop:**
  - cyan: `[[-1.6,0.4,-50],[4,0.05,-50.6],[9.5,4.25,-51.2],[17,4.25,-51.2],[22,0.05,-47],[29,0.05,-43.6]]`
  - amber: `[[8.8,2.5,-58.5],[9.5,4.25,-52.3],[17,4.25,-52.3],[19,0.05,-57],[21.5,0.6,-57.5]]`

Every prop needs `update(dt)` from the frame loop and `setQuality(settings.quality)` on settings change. `audio.unlock()` goes on the title screen's Start click (platform or story-ui).

## What the supervisor should do next
1. **Listen** to `renders/props-audio/audio/music_swell.wav`, `zone-alley.wav`, `radio_static_burst.wav` and `ui_failure.wav`, and send back any cue that grates. Each is one `case` in `synthCue`.
2. **Give gameplay the swap list above** (gameplay owns `alley.js`, `relay.js` and `rooftop.js`). Ask for one in-world screenshot per landmark at about 10 m after the swap: that is the unverified 8–15 m read.
3. **Give atmosphere-kit the refs table** for `effects.js`. If it adds an environment map, props metalness can go back up (see the vault report finding).
4. **Ask platform/story-ui** to call `audio.unlock()` on the Start click and to wire `onCue` to captions. Optionally list `CUE_IDS` in `CONTRACTS.md`.
5. **Fold the palette:** after gameplay's scene lands, keep one palette (props.js `COLOR` duplicates district.js `PALETTE` because of the import cycle).
