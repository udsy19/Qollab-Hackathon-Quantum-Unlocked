Reading done: gameplay already has a graybox, so I'm drafting the art lane's plan and the first two worker briefs.

=== PLAN ===
**Lane goal (G3, plan row 6):** the cyberpunk atmosphere of vision §5 and §11, without destabilising gameplay. That means graphite structures, a wet-ground approximation, fog, rain and an instanced skyline. It also means the cyan quantum / amber classical colour language, three hero landmarks (booth, relay core, transmission mast), the skyline restoration ending (§11.2: left to right over 4–6 s), audio that starts after user input, high/med/low quality presets with identical logic, and ≥30 FPS at medium. Everything is procedural or original, and every file is under 2 MB. Due Sun 05:00 ET; feature freeze Sun 14:00.

**What exists (checked this consult):**
- main has `echo/contracts.js` + `CONTRACTS.md` v2. That includes `WORLD_CHANGES` (art implements every id, each idempotent) and `DEFAULT_SETTINGS.quality` with the values `'low'|'med'|'high'` (platform routes it to the renderer) plus `volume` 0..100.
- Gameplay's `lane/gameplay/gameplay-world-controller` (not landed) already has a graybox: `scene/district.js`, a kit with `PALETTE` and materials, `renderer.js` (FogExp2, DPR cap 1.5), and `alley.js`, `relay.js` and `rooftop.js`. `rooftop.js` already contains an instanced city with a lit-facade wave.
- Art therefore does not build geometry layout or the renderer. Art supplies drop-in modules that the gameplay graybox imports: `lighting.js`, `rain.js`, `buildings.js`, `props.js`, `effects.js` and `game/audio.js`.
- `lane/art/integration` is still at the pre-contracts commit. Workers branch from `main` until the first merge brings contracts in.

**Approach:**
- Every art module is a pure factory: `create*(THREE-scene deps, opts)` → `{ object3D?, update(dt), setQuality(q), dispose() }`. They have no quest logic and import nothing from `game/`.
- Effects take the `WORLD_CHANGES` ids from contracts and resolve them against refs that gameplay registers.
- A dev-only preview page lives outside `echo/` (`tools/art-preview/`, not a product file). It proves each module in a real browser with an FPS readout per preset before any gameplay integration. Heavy integration into district geometry waits for G2 (Sat 17:00).

**Workers now (cap 2):**
1. `atmosphere-kit`: lighting presets + wet ground, rain, instanced skyline with the restoration wave API, and effects for all `WORLD_CHANGES` ids. Preview page + per-preset FPS.
2. `props-audio`: procedural prop kit (the three landmarks, three consoles, two holo signs, the §11.3 storytelling props, conduits, guide arrows) + procedural WebAudio `audio.js` (P0 sound list from §11.1, starts after a gesture, volume setting). No asset files.

**Next:**
- Judge both workers on screenshots and FPS tables.
- Merge them into `lane/art/integration`, together with main.
- After G2: an integration worker that wires art modules into gameplay's district. That requires a request to gameplay to import `buildings.js` in place of its own city in `rooftop.js` (no fork: art's skyline supersedes it, and gameplay deletes theirs in the same change), and to platform for quality/volume routing.
- Then a perf pass on a mid-range profile and a finale-cinematic polish pass with gameplay's camera.

**Risks:**
- Duplicate skyline/wave between `rooftop.js` and `buildings.js`. Resolve through a coordinated swap, never two copies.
- Art sitting on a branch nobody imports ("building behind flags nobody switches on").
- The 100-file cap: keep art at ≤8 files, zero binary assets.
- Bloom/postprocessing cost: high preset only, medium minimal.
- Reduced-motion must turn the restoration wave into a crossfade.
=== END PLAN ===

=== AGENT name=atmosphere-kit model=opus base=main ===
**GOAL.** A first-time player walking through Nacre City feels rain, wet light and fog, and sees a deep skyline. When the teleport commits, they watch the city's lights come back left to right. All of this costs nothing in gameplay stability and holds ≥30 FPS at the medium preset.

**VISION.** ECHO_MASTER_VISION.md:
- §5.2: composition, key light + emissive accents + fog + plausible wet roughness, not 50 bright point lights.
- §5.3 palette: graphite `#070B12`, steel `#132035`, cyan `#56E4F2` for quantum, amber `#F3AE62` for classical, coral `#E96B68`, porcelain `#EAF3F6`.
- §5.5: wet ground reflects coloured light modestly (no SSR); skyline layers + fog hide the map edge; contrast hierarchy, not uniform neon.
- §9.3 world changes.
- §11.2: the skyline lights left to right over 4–6 s; reduced motion → crossfade.
- §12.1 budgets: DPR 1.5–1.75 cap, a few hundred draw calls, few lights, selective shadows.
- §12.2 presets: high = rain particles, selective shadows, subtle bloom; medium (default) = fewer particles, simple reflections, minimal post; low = no post, no dynamic shadows, reduced rain. Logic is identical in every mode.

**WHAT WE ARE BUILDING.** The Qollab-native Three.js game in `echo/` (`three` 0.186.1 imported by bare name `'three'`; no bundler, no Node, no storage, no workers). You own, and may create, exactly these files: `echo/scene/lighting.js`, `echo/scene/rain.js`, `echo/scene/buildings.js`, `echo/scene/effects.js`. You may also create a dev-only preview at `tools/art-preview/` (outside `echo/`; it is never uploaded) that uses an importmap mapping `three` to `https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js`.

Gameplay owns the graybox on `lane/gameplay/gameplay-world-controller`. Read `echo/scene/district.js`, `renderer.js` and `rooftop.js` there with `git show`, and do not edit them. Your modules must drop into that graybox:
- **Factories, named exports**, each returning `{ update(dt, elapsed), setQuality('low'|'med'|'high'), dispose() }` plus their own fields. Quality ids come from `DEFAULT_SETTINGS`/`validateSettings` in `echo/contracts.js`; import them, never retype them.
- **lighting.js:** hemisphere/ambient + one key + a few accent lights; fog tuning; a wet-ground material helper (low roughness, slight metalness, a cheap env/planar-free trick such as an emissive-streak or fake-reflection approach) that gameplay's floors can adopt; a shadows on/off policy per preset; a DPR recommendation per preset.
- **rain.js:** one instanced or `LineSegments` draw. Counts per preset. It follows the camera so it never needs a world-sized volume. Optional ground splash only on high.
- **buildings.js:** an instanced background skyline in 2–3 depth layers with per-instance window emissive (an instance colour attribute or a tiny shader). It exposes `setRestoration(progress 0..1)` and `playRestoration({ direction:'left-to-right', seconds:5, reducedMotion })`. These must be deterministic and idempotent: calling `play` twice does not restart a finished wave. It also takes a seed and footprint bounds so gameplay can place it around the rooftop.
- **effects.js:** `createEffects({ scene, refs, audio? })` → `apply(worldChangeId)` for **every** id in `WORLD_CHANGES` (contracts). Each apply is idempotent, and applying the same id twice is a no-op. `refs` is a map gameplay fills with named meshes (booth indicator, corridor door, conduit, schematic, socket lamp, capsule…). Document the ref names you need in a header comment and in your report. An unknown id throws (contracts' fail-loud rule); a missing ref is reported loudly, never silently skipped. Use "layers of fine light" (§5.3), not particle explosions.

**WHAT HAS NOT WORKED (project-wide).** Optimising against a test suite instead of the product; building behind flags nobody switches on; judging the wrong artifact; meta-work. Here specifically: gameplay's `rooftop.js` already has an instanced city with a facade wave. Do not build a second one in parallel and leave both. `buildings.js` must be a superset that gameplay can swap in, deleting theirs. Read theirs first, reuse its idea and layout, and state in your report exactly what gameplay should replace (as a request, not an edit).

**VAULT NOTES TO READ FIRST.** `vault/AGENTS.md`, `vault/Index.md`, `vault/Research/qollab-platform-and-submission.md` (import rules, the `three` version, `<script>` in `index.html` does not run), `vault/Design/lanes-and-supervisors.md`, `echo/CONTRACTS.md` on main (WORLD_CHANGES, Settings). Search order before any new symbol: `.claude/rules/no-bloat.md` (`node scripts/where.mjs <name> --branches`).

**WHERE TO START.**
1. `git show lane/gameplay/gameplay-world-controller:echo/scene/district.js` (the PALETTE and kit) and `rooftop.js`.
2. Build the preview page with a graybox-like alley strip + rooftop + skyline, a preset switcher, a "play restoration" button, a reduced-motion toggle and an on-screen FPS / draw-call / triangle readout (`renderer.info`).
3. Serve it on your OWN port (e.g. 51xx, not shared).

**DELIVER.**
- The four modules.
- The preview page.
- Screenshots in `renders/art/atmosphere-kit/`: alley at each preset, rooftop skyline before, mid and after restoration, and the reduced-motion crossfade.
- A short screen recording or frame sequence of the 5 s wave.
- A table of FPS / draw calls / triangles per preset, measured in headed Chrome on this Mac and labelled with the machine and the commit.
- A note in `vault/Reports/` with the measurements, linked via `node scripts/vault-hubs.mjs`.
- Run `node tools/qollab-caps/check.mjs` and confirm that no file is over 2 MB. Commit to your branch.

**HOW I WILL JUDGE.** By looking. The alley must read as wet, foggy, rainy and graphite with cyan/amber accents, not uniform neon. The skyline must hide the map edge. The wave must visibly sweep left to right in about 5 s, and replaying it must not restart it. Low, med and high must look different but keep the same objects. Medium must hit ≥30 FPS with draw calls in the low hundreds. Every `WORLD_CHANGES` id must have an apply path. Show that it bites: apply an unknown id and screenshot or log the throw; call apply twice and show the state is unchanged.

**REPORT** to `/Users/udsy/agent-org/lanes/art/reports/atmosphere-kit.md`. It opens with a **Vault check** (notes read, what was known, what you reused, what is stale), then a TL;DR, evidence paths with the commands and exit codes, the nulls, the ref names gameplay must supply, and the replacement request for gameplay's city. Write a checkpoint report within 1 h even if partial (mark it PARTIAL).
=== END AGENT ===

=== AGENT name=props-audio model=opus base=main ===
**GOAL.** Every playable area has a recognisable hero landmark and props that tell the story even when the player skips the text. The world sounds alive (rain, hum, terminal chimes, a radio burst, success/failure cues, an ending swell) from the first click, with nothing autoplaying before user input.

**VISION.** ECHO_MASTER_VISION.md:
- §5.2 #1: frame Rin against one landmark per scene.
- §5.3 language: quantum = glass, ceramic lattice, thin cyan pulse strips, concentric linework; classical = warm amber cabling, riveted panels, patch sockets; corporation = ivory Palisade signs on dark glass. Text is sparse in 3D.
- §5.4 required props: booth, relay core (circular plinth, 3 cooling columns, rotating rings), transmission mast, 3 puzzle consoles, 2 holographic signs, 3 doors/blockers, emissive guide arrows.
- §11.3 seven storytelling props: billboard "NOTHING EVER HAS TO END."; empty kiosk with a warm drink and receipt; a looping evacuation announcement (caption via story-ui, not you); a tram light silhouette beyond bounds; a shelter billboard `POPULATION UNKNOWN` → `GRID RESTORED`; the Palisade booth with scratched initials; cyan/amber conduits tracing from relay to rooftop.
- §11.1 audio P0: low-volume rain + transformer hum, terminal feedback, one radio static burst, UI success/failure, an ending swell, starting only after explicit input, always captioned (captions are story-ui's).
- §12.2: props simplify on low; logic is identical in every mode.

**WHAT WE ARE BUILDING.** The Qollab-native Three.js game in `echo/` (`three` 0.186.1 by bare name; no bundler, Node, storage or workers; ≤100 files total, so add **no asset files**: everything is procedural geometry, canvas textures generated at runtime, and synthesized WebAudio). You own exactly `echo/scene/props.js` and `echo/game/audio.js`. You may add a dev-only preview at `tools/art-preview-props/` (outside `echo/`, never uploaded; importmap `three` → `https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js`).

Gameplay owns the graybox on `lane/gameplay/gameplay-world-controller` (`echo/scene/district.js` kit + PALETTE, `alley.js`, `relay.js`, `rooftop.js`). Read it with `git show` and do not edit it.
- **props.js:** named factory exports, e.g. `createBooth`, `createRelayCore`, `createMast`, `createConsole`, `createHoloSign`, `createKiosk`, `createBillboard`, `createConduit(pathPoints, 'cyan'|'amber')`, `createGuideArrow`, `createTram`. Each returns `{ object3D, refs, update(dt), setQuality(q), dispose() }`. `refs` holds the named parts that world-change effects animate (booth indicator, capsule source indicator, conduit material, billboard text state). Share geometries and materials, keep each prop to a handful of draw calls, and match gameplay's graybox footprint and anchor positions so it can swap a box for your prop without moving colliders. Billboard and sign text is drawn to a CanvasTexture at runtime.
- **audio.js:** `createAudio()` → `{ unlock()` (call from a user gesture; resumes the AudioContext), `setVolume(0..100)` (the settings contract), `setZone('alley'|'substation'|'relay'|'rooftop')` (crossfaded ambient beds), `play(cueId)`, `dispose() }`. Cue ids cover the §11.1 P0 list plus §9.3 `reactor_audio_begins` and `music_swell`. Everything is synthesized (noise/oscillators/filters), so there are no licensing questions. Before `unlock()`, nothing makes sound and nothing throws. An unknown cue id throws. Read `volume` and `quality` ids from `echo/contracts.js` (`DEFAULT_SETTINGS`), never retyped.

**WHAT HAS NOT WORKED (project-wide).** Optimising against a test suite instead of the product; building behind flags nobody switches on; judging the wrong artifact; meta-work. Here: gameplay's graybox already places boxes for the booth, relay and mast (`rooftop.js` builds a mast). Your props must fit those footprints, and your report tells gameplay exactly which boxes each factory replaces (a request, not an edit). Do not invent a second layout. Do not copy or imitate proprietary game assets (§5.4).

**VAULT NOTES TO READ FIRST.** `vault/AGENTS.md`, `vault/Index.md`, `vault/Research/qollab-platform-and-submission.md`, `vault/Design/lanes-and-supervisors.md`, `echo/CONTRACTS.md` on main (WORLD_CHANGES, Settings, interactable ids). Before any new symbol: `.claude/rules/no-bloat.md` (`node scripts/where.mjs <name> --branches`). A sibling worker, `atmosphere-kit`, owns lighting/rain/buildings/effects. Do not build those. Its `effects.js` will animate your `refs`, so name them clearly.

**WHERE TO START.**
1. `git show lane/gameplay/gameplay-world-controller:echo/scene/{district,alley,relay,rooftop}.js` to get footprints and anchor positions.
2. Build a preview page: a turntable/lineup of every prop under a simple key + fog, a quality switcher, a "click to enable audio" button, buttons per cue and per zone, a volume slider, and an FPS / draw-call readout.
3. Serve it on your OWN port.

**DELIVER.**
- `props.js` and `audio.js`.
- The preview page.
- Screenshots in `renders/art/props-audio/`: each landmark at ~10 m (it must read from 8–15 m, §5.5), the full lineup at low/med/high, and the billboard before/after text states.
- A short recording, or an audio capture (WAV under `renders/`, not `echo/`), of each cue.
- A draw-call count per prop.
- Proof that no sound or error occurs before unlock.
- A `vault/Reports/` note linked via `node scripts/vault-hubs.mjs`.
- Run `node tools/qollab-caps/check.mjs`. Commit to your branch.

**HOW I WILL JUDGE.** By looking and listening:
- The booth, relay core and mast are distinct silhouettes readable from 10 m, in the palette, cyan = quantum and amber = classical.
- The storytelling props carry the story with no captions.
- The props fit gameplay's footprints.
- The audio is quiet, atmospheric and non-grating, starts only after a click, and the swell feels like an ending.
- Show it bites: an unknown cue throws; calling `play` before `unlock` is silent, without errors.

**REPORT** to `/Users/udsy/agent-org/lanes/art/reports/props-audio.md`. It opens with a **Vault check** (notes read, known, reused, stale), then a TL;DR, evidence paths with commands and exit codes, the nulls, the refs table for `effects.js`, and the box-to-prop swap list for gameplay. Write a checkpoint within 1 h even if partial (mark it PARTIAL).
=== END AGENT ===

=== LEARN ===
Gameplay already owns a graybox (`lane/gameplay/gameplay-world-controller`: `district.js` kit + PALETTE, `renderer.js` with FogExp2 and DPR 1.5, and a `rooftop.js` that includes an instanced city with a facade wave). Art therefore ships drop-in factory modules (`create*` → `update` / `setQuality` / `dispose`, plus `refs`) that fit gameplay's footprints. Art never builds a second layout or skyline. The skyline swap (`buildings.js` replaces rooftop's city, which gameplay then deletes) is a cross-lane request. Checked 2026-10-10 consult 1.
=== END LEARN ===

=== LEARN ===
`lane/art/integration` was cut before contracts v2 (80d685f on main). Until main is merged into it, base art workers on `main` so they import `QUALITY` and `WORLD_CHANGES` from `echo/contracts.js` instead of retyping them. Quality ids are `'low'|'med'|'high'` (not 'medium').
=== END LEARN ===

=== LEARN ===
The decision for zero binary assets in art (procedural geometry, runtime CanvasTexture, synthesized WebAudio) comes from vision §5.4 ("procedural primitives and instancing for Qollab edition"), the ≤100-file cap and the licensing rules. It removes asset-licence risk entirely. This is an autonomous-mode design choice, made 2026-10-10.
=== END LEARN ===
