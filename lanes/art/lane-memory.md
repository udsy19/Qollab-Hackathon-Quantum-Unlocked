
- 2026-10-10 consult 1: Gameplay already owns a graybox (`lane/gameplay/gameplay-world-controller`: `district.js` kit + PALETTE, `renderer.js` with FogExp2 and DPR 1.5, and a `rooftop.js` that includes an instanced city with a facade wave). Art therefore ships drop-in factory modules (`create*` → `update` / `setQuality` / `dispose`, plus `refs`) that fit gameplay's footprints. Art never builds a second layout or skyline. The skyline swap (`buildings.js` replaces rooftop's city, which gameplay then deletes) is a cross-lane request. Checked 2026-10-10 consult 1.

- 2026-10-10 consult 1: `lane/art/integration` was cut before contracts v2 (80d685f on main). Until main is merged into it, base art workers on `main` so they import `QUALITY` and `WORLD_CHANGES` from `echo/contracts.js` instead of retyping them. Quality ids are `'low'|'med'|'high'` (not 'medium').

- 2026-10-10 consult 1: The decision for zero binary assets in art (procedural geometry, runtime CanvasTexture, synthesized WebAudio) comes from vision §5.4 ("procedural primitives and instancing for Qollab edition"), the ≤100-file cap and the licensing rules. It removes asset-licence risk entirely. This is an autonomous-mode design choice, made 2026-10-10.

- 2026-10-10 consult 2: 2026-10-10 consult 2: I merged atmosphere-kit after looking at the screenshots myself. Two defects showed only in the images, not in the report's checks: rain falls indoors (`renders/atmosphere-kit/effects-relay.png`), and medium rain is a bright curtain that competes with the accents (`alley-med.png`).

Rule: art solves its own visual defects inside art modules (shader shelter volumes) rather than pushing zone toggles onto gameplay. Every cross-lane call is a place where a missed trigger fails silently. Basis: §5 readability first.

- 2026-10-10 consult 2: 2026-10-10 consult 2: Cross-lane adoption requests (gameplay deleting its city, lights and material swaps) go to the overseer through the ASK_OWNER block, because the supervisor cannot write another lane's `owner-answers.md`. The exact list lives in `reports/0001-atmosphere-kit.md` § "Requests to gameplay". Re-check before G2 integration that gameplay has acted on it.
