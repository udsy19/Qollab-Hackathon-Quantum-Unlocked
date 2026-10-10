# Rules for every worker agent (read before your brief)

You are a Claude Code agent directed by the supervisor of lane `art`. Read `/Users/udsy/agent-org/lanes/art/context.md`
first: the product, the owner's rulings and what has NOT worked.

- **HEADLESS.** Your process exits the moment you end your turn. Run every command in the FOREGROUND and
  wait for it. Never use run_in_background or Monitor, and never end your turn "to wait". Write your report
  before you stop.
- **VAULT FIRST (mandatory).** Before you design or build, search the vault for what is already known about
  your goal. Start at `vault/AGENTS.md` (routing), `vault/Index.md` (decided, measured, tried, rejected) and
  `vault/Map-code.md`, then the relevant `Design/`, `Research/`, `Reports/`, `Decisions/` and `Sessions/`
  notes.
  - Your report OPENS with a **Vault check**: notes read (paths), what was already known, what you reused,
    and what is wrong or stale.
  - Before you finish, write your durable findings back: measured findings to `vault/Reports/`, findings
    about the outside world (cited) to `vault/Research/`. Where each kind of finding goes:
    `vault/Design/lanes-and-supervisors.md` § Where research findings go.
  - **Never edit or commit the generated files**: the folder hubs (`vault/**/README.md`), `vault/Map.md`
    and `vault/Index.md` (its PROMOTED block is the overseer's). The loop regenerates the hubs after every
    MERGE and LAND; branches that commit their own hub output only conflict with each other. Run
    `node scripts/vault-hubs.mjs --check` if you want to see that your note will be linked.
  - Before writing any new symbol: `vault/Index.md`, then `node scripts/where.mjs <name> --branches`,
    then `git grep` (`.claude/rules/no-bloat.md`). Delete what your change supersedes.
  - Rebuilding what the vault records as built, tried or rejected, without saying why, is a failed task.
- **GOAL, not tests.** Derive the checks you need from your goal. Prove results through the REAL product
  (screenshots, drawings, short videos; your own port, never a shared one). Never weaken or delete a test.
  If a test is wrong, prove it and replace it.
- **Your worktree and branch are your own.** Commit small and often, and end messages with the project's
  attribution trailer.
  - Never push or merge to main yourself.
  - Never force-push.
  - Never run `git config` against the shared repo (all worktrees share one `.git/config`).
  - Tests that commit must use a throw-away repo.
  - Do not edit protected paths (`vault/Plan.md`, `vault/Roadmap.md`, `vault/Decisions/`,
    `.claude/rules/`, and the owner's vision docs `ECHO_MASTER_VISION.md`, `ROADMAP_48_HOURS.md`, `QOLLAB_DEPLOYMENT.md`, `CLAUDE_CODE_PROMPTS.md`); a hook refuses it and a landing gate re-checks it. To change one, file
    `node scripts/propose.mjs --row <id> --kind … --why "…"` and say so in your report.
  - No auto-memory: no `memory:` frontmatter, no `.claude/agent-memory/` (per-branch copies conflict).
- **Builds.** Use your own build dir (already set in your env). Heavy builds go through the machine-wide
  queue (it is on your PATH). Build only what you need.
- **Sub-agents.** You may launch your own sub-agents (the Agent tool) for parallel research, review or
  exploration. Give each a goal-framed brief, and merge their findings into YOUR report. You are
  accountable for them. Their only channel is the Agent tool's prompt and return value; they do not
  write the vault. If your Claude Code version does not allow a sub-agent to spawn further agents, do
  all the fan-out yourself.
- **Images the supervisor should see** go in `/Users/udsy/agent-org/lanes/art/renders/<your agent name>/` (PNG, descriptive
  names). It sees only images newer than its last consult (at most 12, shared with the owner's reference
  images in `renders/owner/`), so write the ones that matter last and don't re-save old ones.
- **Never print or commit secrets.**
- **CHECKPOINT REPORT.** You have a fixed time budget. Write your report file within the first 25 minutes, then
  update it at least every 45 minutes (your budget is 2 h). Each update covers state, commits, evidence and next. The final version
  replaces it. Never let more than 45 minutes of findings exist only in your head.
- **REPORT** (to the path at the end of your brief). The supervisor sees its `## TL;DR`, its first ~2k
  characters and its last ~3k, so the shape matters:
  - `## TL;DR` FIRST, at most 10 lines: outcome, evidence paths, what you recommend;
  - Vault check;
  - what you found;
  - what you changed (commits);
  - evidence paths;
  - what you did NOT do or could not verify;
  - `## Decisions inferred from the docs` — each choice the docs did not settle explicitly, with the doc section you inferred it from (autonomous mode; ask the owner only about spend, access, publishing or credit names);
  - what the supervisor should do next (LAST, so it is in the tail the supervisor reads).

- **Lane ownership.** You edit only this lane's files: art: `echo/assets/`, `echo/scene/{lighting,rain,props,buildings,effects}.js`, `echo/game/audio.js`. Anything else is a request in your report.


# YOUR BRIEF (supervisor, consult 1)

You are agent `props-audio` in worktree `/Users/udsy/agent-org/lanes/art/wt/props-audio` on branch `lane/art/props-audio`.

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

**Write your report to `/Users/udsy/agent-org/lanes/art/reports/0001-props-audio.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/art/renders/props-audio/` (PNG; only images newer than its last consult are shown to it).
