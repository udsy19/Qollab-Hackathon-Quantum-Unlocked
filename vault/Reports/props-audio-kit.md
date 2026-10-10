---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
---

# Art: procedural prop kit and synthesized audio (`props.js`, `audio.js`)

Branch `lane/art/props-audio`, measured on commit 5370abe. All numbers come from
`node tools/art-preview-props/capture.mjs 8743 <out>` (local headless Chrome 0.186.1 `three` from jsdelivr,
SwiftShader). These are local runner results, not Qollab results.

## What exists

- `echo/scene/props.js`: `createBooth`, `createRelayCore`, `createMast`, `createConsole('quantum'|'classical'|'relay')`,
  `createConduit(points, 'cyan'|'amber')`, `createHoloSign`, `createBillboard` (+ `createSloganBillboard`,
  `createShelterBillboard`), `createKiosk`, `createGuideArrow`, `createTram`, `disposeSharedProps`. Each factory returns
  `{ object3D, refs, update(dt), setQuality(q), dispose() }`, front +Z, origin at the footprint centre on the floor.
- `echo/game/audio.js`: `createAudio({ onCue, zone })` → `unlock / setVolume / setZone / play / reset / dispose`, plus
  `CUE_IDS`, `AUDIO_ZONES`, and the pure synth layer `buildMix`, `buildAmbience`, `synthCue`, which run on a live or an
  offline context.
- `tools/art-preview-props/`: the preview (`index.html`), the autoplay proof page (`audio-proof.html`), and the driver
  (`capture.mjs`), which asserts the autoplay contract and exits 1 if it is broken.

## Measured

Draw calls per prop at low / med / high (renderer.info, prop alone, camera fitted):

| prop | low | med | high | tris (med) |
|---|---|---|---|---|
| booth | 10 | 11 | 12 | 1.2k |
| relay core (with 3 columns and the lectern) | 12 | 14 | 14 | 6.6k |
| mast | 6 | 8 | 8 | 3.0k |
| console quantum / classical | 7 / 5 | 8 / 6 | 8 / 6 | 0.8k / 1.2k |
| kiosk | 5 | 9 | 9 | 0.5k |
| billboard (each) | 2 | 3 | 3 | 50 |
| holo sign (each) | 3 | 3 | 3 | 16 |
| conduit | 1 | 2 | 2 | 0.7–1.6k |
| guide arrow / tram | 2 / 3 | 2 / 3 | 2 / 3 | — |

The full lineup is 62 / 77 / 78 calls (low / med / high).

Audio, rendered offline through the game's own mix at the default volume 80. Peak / RMS in dBFS:
- terminal_wake −20.5 / −40.5
- terminal_input −28 / −59
- terminal_close −24.6 / −45.7
- radio_static_burst −27.4 / −43.1
- ui_success −20.3 / −37.4
- ui_failure −15.3 / −34.5
- door_open −19.3 / −36.4
- reactor (bed + spin-up) −8.4 / −17.7
- music_swell (15 s) −8.8 / −24.8
- zone beds: alley −16.2 / −28.6, substation −12.7 / −21.8, relay −13.7 / −22.7, rooftop −16 / −29.1

Nothing clips.

Autoplay contract, before any user input:
- 0 AudioContexts and 0 oscillators exist;
- every cue, zone and volume call returns without error;
- an unknown cue, an unknown zone, volume 101 and volume 50.5 each throw RangeError.

After one real click there is exactly 1 running context. A second `music_swell` adds 0 voices, and after `reset()` it plays again.

**Sabotage round** (each mutation was made on the working tree and reverted with `cp` from a backup):
- eager `build()` in createAudio → red ("an AudioContext existed before any user input");
- unknown cue no longer throws → red;
- latch removed → red ("music_swell played twice").

Nulls: none of the three sabotages went undetected.

## Findings worth keeping

- **Metallic MeshStandardMaterial renders near-black with no environment map.** At metalness 0.7 the booth shell was
  pitch black at 3 m. Props now keep metalness ≤ 0.3. If the lighting lane adds an env map, metal can go back up.
- **A lattice mast is invisible against the night sky past ~10 m.** The silhouette had to be drawn in points of light
  (porcelain marker lights, cyan deck rails, a coral beacon). The same holds for any thin landmark.
- **Headless Chrome never fired `load` for a page importing `three` from jsdelivr** (30 s navigation timeouts), while
  `domcontentloaded` plus a `window.__ready` flag works. Drivers should wait on a flag, not on load or networkidle.
- **Gameplay's PALETTE is duplicated** in props.js (`COLOR`), because district.js will import props.js (a cycle) and is
  not on main. Fold them into one place when the scene lands.

## Not verified

- Nothing on Qollab.
- No human has listened to the cues. The spectrograms (`lanes/art/renders/props-audio/zz-audio-spectrograms.png`) and
  levels are the only evidence of "quiet and non-grating".
- Not placed in gameplay's district, so the in-world 8–15 m read under the real lighting and rain is unverified.
- Frame rate is not measured (headless SwiftShader).
