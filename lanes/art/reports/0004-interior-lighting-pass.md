## TL;DR
- **CHECKPOINT (≈25 min in).** Gate written and red on the current build; the fill lights are not written yet.
- `tools/art-preview/interior-gate.mjs` (new, uncommitted): it classes pixels from the scene's own materials (opaque unlit = accent, lit or additive = surface). Per room and preset it checks: readable (surface p50 ≥ 0.075 and ≥ 50% of surface px at L ≥ 0.06), dark (p90 ≤ 0.40), accents (accent median ≥ surface p99), and relay energized (surface mean ≥ 1.15× the pre-change mean).
- **Red first:** 33 checks, 12 red (`/tmp/ilp/m-before.jsonl`). Readable is red in all 9 room×preset cases, and energized is red at all 3 presets (gain 1.000: the Bell pair only recolours the accents).
- Med before: relay p50 0.028 / lit 36%; passage p50 0.028 / lit 9%; elevator p50 0.047 / lit 38%.
- **Next:** interior fill in lighting.js (point lights at med/high, additive light cards at every preset), an energized hook from effects, and a lit schematic texture.

## Vault check
Read: lanes/art/context.md, reports 0002 (rain-shelter), echo/scene/{lighting,effects}.js, the props.js header, and gameplay's relay.js and rooftop.js (gameplay-world-controller 1a89bfb). `where.mjs createInteriorLights` and `interior-gate` found nothing on any branch.
