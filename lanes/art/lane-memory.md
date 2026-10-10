
- 2026-10-10 consult 1: Gameplay already owns a graybox (`lane/gameplay/gameplay-world-controller`: `district.js` kit + PALETTE, `renderer.js` with FogExp2 and DPR 1.5, and a `rooftop.js` that includes an instanced city with a facade wave). Art therefore ships drop-in factory modules (`create*` → `update` / `setQuality` / `dispose`, plus `refs`) that fit gameplay's footprints. Art never builds a second layout or skyline. The skyline swap (`buildings.js` replaces rooftop's city, which gameplay then deletes) is a cross-lane request. Checked 2026-10-10 consult 1.

- 2026-10-10 consult 1: `lane/art/integration` was cut before contracts v2 (80d685f on main). Until main is merged into it, base art workers on `main` so they import `QUALITY` and `WORLD_CHANGES` from `echo/contracts.js` instead of retyping them. Quality ids are `'low'|'med'|'high'` (not 'medium').

- 2026-10-10 consult 1: The decision for zero binary assets in art (procedural geometry, runtime CanvasTexture, synthesized WebAudio) comes from vision §5.4 ("procedural primitives and instancing for Qollab edition"), the ≤100-file cap and the licensing rules. It removes asset-licence risk entirely. This is an autonomous-mode design choice, made 2026-10-10.

- 2026-10-10 consult 2: 2026-10-10 consult 2: I merged atmosphere-kit after looking at the screenshots myself. Two defects showed only in the images, not in the report's checks: rain falls indoors (`renders/atmosphere-kit/effects-relay.png`), and medium rain is a bright curtain that competes with the accents (`alley-med.png`).

Rule: art solves its own visual defects inside art modules (shader shelter volumes) rather than pushing zone toggles onto gameplay. Every cross-lane call is a place where a missed trigger fails silently. Basis: §5 readability first.

- 2026-10-10 consult 2: 2026-10-10 consult 2: Cross-lane adoption requests (gameplay deleting its city, lights and material swaps) go to the overseer through the ASK_OWNER block, because the supervisor cannot write another lane's `owner-answers.md`. The exact list lives in `reports/0001-atmosphere-kit.md` § "Requests to gameplay". Re-check before G2 integration that gameplay has acted on it.

- 2026-10-10 consult 3: 2026-10-10 consult 3: I checked the rain-shelter checkpoint images myself. Indoor rain is gone in the relay (`renders/rain-shelter-readability/before-relay-med.png` vs `after-relay-med.png`), and the medium alley rain now reads below the accents (`after-alley-med.png`).

Removing the rain uncovered a second defect: the relay interior is nearly black, and only the teal rings read. The rain curtain had been the main source of light-coloured pixels in that room.

Lesson: when a fix removes a visual layer, re-judge the bare scene. One defect can mask another. Interior fill lighting is now its own task (§5 readability, §11 relay mood).

- 2026-10-10 consult 3: 2026-10-10 consult 3: Shelter volumes should be exported from art and keyed to gameplay's known footprints (relay, substation passage, elevator), not placed by gameplay through `addShelter` calls. That leaves one less cross-lane trigger that can fail silently, and it follows the consult 2 rule that art solves its own visual defects inside art modules. The integration worker must check the volumes against gameplay's current `district.js` footprints from the images, not from the coordinates alone.

- 2026-10-10 consult 4: 2026-10-10 consult 4: I merged rain-shelter-readability on images, not on its numbers.
- Evidence the fix works: `crop-objective-door-player-med.png` shows the accents dominating with rain on.
- Evidence the gate bites: `falsify-shader-test-off-relay-med.png` shows the rain return indoors.
- The recorded null: additive blending at opacity 0.55 goes red only on high. A blend-mode or saturation check would close it, and is optional.
- The worker was still listed as running when I merged. Its report was final, with 4 commits, so I merged without a KILL.

- 2026-10-10 consult 4: 2026-10-10 consult 4: I merged props-audio. In `b-landmarks-before-after.png` the relay core's energized change reads strongly. The booth indicator and especially the mast's link-active change are near-invisible at 10–14 m. Lesson: every §9.3 world change on a landmark needs a before/after pair at gameplay distance in which a glance shows the difference. Change the emissive area or the colour, not just the intensity of a thin strip. This is a queued follow-up.

- 2026-10-10 consult 5: 2026-10-10 consult 5: `lane/art/integration` now contains contracts v2 (80d685f is an ancestor, checked with `git merge-base --is-ancestor`). The consult-1 rule "base art workers on main" is superseded: base them on `lane/art/integration`. When two art workers run in parallel, their briefs give each one disjoint file ownership (for example, lighting/effects for one and props.js for the other), so the lane never merges two edits to the same module.
