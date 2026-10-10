# 0001 — gameplay-world-controller (FINAL)

## TL;DR
- **Done for the graybox, verified headlessly.** A judge can click PLAY and walk Rin in third person through the rain alley, the connector, the relay chamber and the rooftop, in order:
  - doors are gated by quest state;
  - the E prompt shows only when Rin is near the device, facing it and has a clear line of sight;
  - the conduit, schematic, fiber and city lights react to the quest;
  - Restart returns to the title from both Pause and Credits.
- `node dev/gameplay/world-playthrough.mjs --falsify --publish` → **36/36 checks, exit 0**. The token `wc-0001-h` was read from `echo/game/app.js` on disk and back from the served page, and they matched. The run used real keyboard and mouse input in headless Chrome on port 8612.
- **Sabotage flips (all went red/flipped as required):**
  - pylon collider off → the prompt appears behind the pylon;
  - door A collider off → the player walks through it;
  - every collider off → the walkable guard still holds the map edge;
  - RESTART→TITLE handler removed → the credits-restart check goes red.
- **Quest-core merged:** `lane/gameplay/gameplay-quest-core` is merged into this branch and the stand-in is deleted. The world harness drives missions through their dev terminal and fake quantum.
- **Evidence:** `evidence/gameplay/world-controller/` (19 PNGs, `walk.mp4`, `results.json`). The 12 key PNGs are also in `renders/gameplay-world-controller/`.
- **Recommend:** land this branch (it carries quest-core). Platform should call `startGame` as described at the end of this report. Art can replace the graybox meshes and keep the collider and anchor data.

## Vault check
- **Read:**
  - `vault/AGENTS.md`, `vault/Index.md`, `vault/Map-code.md`;
  - `vault/Research/qollab-platform-and-submission.md` (three@0.186.1 imports by name; `<script>` in index.html does not run; no storage);
  - `lanes/gameplay/context.md`;
  - vision §3.1, §5.1, §8.2, §9.1–§9.5, §10.1, §10.8 and §12.1.
- **Already known:** nothing on ECHO gameplay existed. `where.mjs --branches` returned exit 1 for `createEventBus`, `createQuestMachine`, `startGame`, `createRenderer` and `buildDistrict` at 23:20 ET.
- **Reused:** quest-core's `eventBus.js`, `state.js` (`QUEST_STATES`), `devTerminal.js` and `fakeQuantum.js` after they landed on their branch. I deleted my stand-in in the same change.
- **Stale or wrong:**
  - `vault/Map-code.md`'s echo rows are a malformed table row (line with `| | \`echo/\``).
  - The hubs `vault/Reports/README.md` and `vault/Map.md` are STALE because of my new note. I did not regenerate them, per the brief.
- **Written back:** `vault/Reports/world-controller-contract.md`, covering the controls, collision, camera and interaction contracts plus the measured findings.

## What I found
- With headless Chrome pacing, rAF runs at 12–46 FPS whatever the scene. With `--disable-frame-rate-limit` the same scene ran at 110–267 FPS on an M4 Pro (95 draw calls, 1280×720, DPR 1). Main-thread time is 0.2–0.8 ms per frame, measured as `perf:fps.ms`.
- In my first pass the fog (FogExp2 0.018) hid the whole city past about 60 m, so the commit wave could not be seen. Fixed: density is now 0.011 and the window bands use `fog:false`.
- Quest-core's table has `RESTART` (credits/declassified → TITLE) as a **transition**, not `quest:reset`. The world now resets on entering TITLE as well, and this is falsified by the sabotage above.
- Puppeteer under pointer lock: moving the cursor back to centre counts as a turn, so the driver turns with the arrow keys. Mouse orbit is checked separately (+200 px drag → yaw −0.52 rad).

## What I changed (commits on `lane/gameplay/gameplay-world-controller`)
- `2b1f131` — the world and controller graybox:
  - `echo/scene/{renderer,district,alley,relay,rooftop,player}.js`
  - `echo/game/{app,input,camera,controller,interactions}.js`
  - the harness and playthrough.
- `fd6d62c` — renamed my dev files to `dev/gameplay/world.html` and `world-playthrough.mjs` (frees quest-core's paths), added `perf ms` and the sabotage checks.
- `49df1bd` — merged `lane/gameplay/gameplay-quest-core`.
- `45cfe3c` — switched to the real `eventBus.js`/`state.js`, deleted `questStandin.js`, made RESTART reset the world, put the dev terminal in the world harness, and added evidence.
- `1a89bfb` — added the `--publish` step, the evidence README and the vault note.
- Gates: `node scripts/gates/sprawl.mjs` exit 0 (it was red twice and I fixed both causes). `echo/` has 15 files, no storage/fetch/WebSocket/Worker, and imports only `three` plus relative modules.

## Evidence paths
- `evidence/gameplay/world-controller/`:
  - title: `01-title.png`
  - alley start: `02`
  - booth prompt: `03`
  - **no prompt behind the pylon at 2.16 m while facing the booth:** `04`
  - door A closed and blocking: `05`
  - dev terminal: `06`
  - door A open: `07`
  - relay prompt: `08`
  - conduit and rings lit: `09`
  - door B open with the schematic: `10`
  - socket prompt: `11`
  - fiber to the skyline: `12`
  - commit wave start: `13`
  - city lit: `14`
  - ending: `15`
  - credits: `16a`
  - restart to title: `16`
  - paused: `17`
  - FPS readout: `18`
  - `walk.mp4` (8.6 s screencast)
  - `results.json` (build, renderer, every check)
- Serve: `python3 -m http.server 8612 --bind 127.0.0.1` from the worktree root → `http://127.0.0.1:8612/dev/gameplay/world.html`

## Nulls and what is NOT verified
- **UNVERIFIED: real pointer lock with a human mouse.** Headless granted the lock on click. The Esc-releases-lock-then-pause path is reasoned, not observed; the headless Esc check took the keydown path.
- **UNVERIFIED: ≥30 FPS on a mid-range laptop.** The only numbers are from the M4 Pro: about 110+ FPS uncapped, and 12–46 FPS under headless pacing.
- **UNVERIFIED: running inside Qollab.** Only the local harness ran: three from the jsdelivr importmap, not Qollab's injected `three`.
- **Not done:**
  - camera collision against ceilings is only a height clamp;
  - there is no step or ramp height (the world is flat at y=0, and the rooftop reads as high because the city sits below it);
  - no Q scan or Tab journal (not my lane);
  - no touch controls (P1 per §3.1).
- Relay-core facing passed at a dot of about 0.6 against a 0.5 threshold, because the driver arrives at an angle. A human walking straight in gets about 1.0.

## Questions for the owner
1. Door A: vision §9.3 opens the "sealed corridor door" at `CLONE_UNDERSTOOD`, so I followed §9.3 over the brief's "cannot reach relay before RELAY_UNLOCKED". `EXIT_BOOTH` fires from a trigger in the connector, and the relay core still needs `RELAY_UNLOCKED`. Is that the intended reading?
2. Which event should `EXIT_BOOTH` and `OPEN_ROOFTOP` be? Right now they are walk-through triggers (the connector and the elevator corridor). Should they instead be terminal buttons in story-ui?

## Requests
- **Platform (`echo/main.js`):**
  - Mount a full-window `<div id="game-root">` in `index.html`.
  - In `main.js`: `import { startGame } from './game/app.js'; const game = startGame({ root: document.getElementById('game-root'), quantum: <adapter>, ui: <story-ui object with mount({bus, quest, quantum, game})> });`
  - Call `game.dispose()` on Qollab Stop if a hook exists.
  - `ui:*` event names and the `game` API (`pause`, `resume`, `reset`, `paused`, `terminalOpen`, `debug`) become shared contracts. Please own them.
- **Story-ui:**
  - Listen to `ui:prompt` {id,label,key}|null, `ui:terminal:open` {id,state}, `ui:pause` {paused} and `perf:fps`.
  - Emit `ui:terminal:close` when a terminal closes.
  - PLAY should send `START`, and the opening should send `FINISHED`/`SKIP`.
  - Narrative sends `ANIMATION_END` after the commit shot. The world harness stands in for this with a 5 s timer.
  - The pause menu calls `game.resume()` / `game.reset()`.
  - Add `data-captures-keys` on any panel that types.
- **Art:**
  - Replace the meshes in `alley.js`, `relay.js` and `rooftop.js`, and the lights in `district.js`.
  - Keep `kit.box` collider extents, the anchor positions and the door `openAt` values, or tell gameplay.
  - The graybox lights are only there for readability.

## What the supervisor should do next
1. Look at `renders/gameplay-world-controller/`: `04` (no prompt behind the pylon), `05`/`07` (door closed, then open), `14` (city lit) and `16` (restart).
2. Land `lane/gameplay/gameplay-world-controller` (it includes quest-core) once a reviewer passes it.
3. Send the `startGame` contract above to platform, and the bus events to story-ui.
4. Ask the owner the two questions above.
5. Get a human run on a mid-range laptop for FPS and pointer lock: the only remaining UNVERIFIED items.
