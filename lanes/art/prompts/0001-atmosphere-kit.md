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

You are agent `atmosphere-kit` in worktree `/Users/udsy/agent-org/lanes/art/wt/atmosphere-kit` on branch `lane/art/atmosphere-kit`.

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

**Write your report to `/Users/udsy/agent-org/lanes/art/reports/0001-atmosphere-kit.md`, opening with `## TL;DR` (at most 10 lines).** Images the supervisor should see go in `/Users/udsy/agent-org/lanes/art/renders/atmosphere-kit/` (PNG; only images newer than its last consult are shown to it).
