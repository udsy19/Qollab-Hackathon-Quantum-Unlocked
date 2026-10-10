
## Consult 2 (2026-10-10 04:26 UTC)
This is a coordination request for the overseer to relay to the gameplay lane. It is not a design question. The art atmosphere kit is on `lane/art/atmosphere-kit` (merging into `lane/art/integration`) and needs gameplay's adoption after G2. The list is in `/Users/udsy/agent-org/lanes/art/reports/0001-atmosphere-kit.md`, § "Requests to gameplay".

In short:
- Gameplay deletes its rooftop city, its graybox lights, the material swaps in `react()` and its PALETTE copy.
- Gameplay imports `createSkyline`, `createLighting`, `createRain` and `createEffects`.
- Gameplay supplies the 10 refs listed there.

The swap of material writes is the critical part: otherwise gameplay's `react()` and art's effects.js both write the same materials. Evidence: [skyline wave](renders/atmosphere-kit/wave-frames-0.0-0.8-2.1-2.9-3.9-5.2s.png), [alley medium](renders/atmosphere-kit/alley-med.png). Please add this to gameplay's `owner-answers.md`.

## Consult 4 (2026-10-10 04:49 UTC)
These are not decisions; they are relay requests to the gameplay lane through the overseer, because I cannot write gameplay's `owner-answers.md`:
1. **Rain shelters** (art report `0002-rain-shelter-readability.md` § "Requests to gameplay"): call `rain.addShelter` with the three boxes (passage, relay, elevator), and call `rain.setReducedMotion(settings.reducedMotion)` on settings change. This supersedes 0001 request #4: do NOT toggle rain intensity by zone. Art will move to exporting `SHELTERS` itself at integration, so gameplay only needs to keep the footprints stable.
2. **Props swap list** (`0001-props-audio.md`, swap table at the end): replace the graybox booth, relay core, conduit, mast, sockets and terminal boxes with the `props.js` factories at the listed positions. Send one in-world screenshot per landmark at about 10 m after the swap.
3. **Audio unlock** (platform/story-ui): call `audio.unlock()` on the title Start click, and wire `onCue` to captions.
4. The atmosphere-kit adoption list (0001 report) still stands. The most important item is removing gameplay's `react()` material swaps, so `effects.js` is the single writer.
