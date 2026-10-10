---
type: report
status: current
date: 2026-10-10
updated: 2026-10-10
lane: gameplay
---

# World + controller contract (echo/game, echo/scene): controls, collision and interaction

`startGame({ root, quantum, ui })` in `echo/game/app.js` boots a third-person graybox of four spaces, and the player can walk title → three missions → commit → ending → restart. Measured on branch `lane/gameplay/gameplay-world-controller`, build token `wc-0001-h`: `node dev/gameplay/world-playthrough.mjs --falsify` returned 36/36 checks, exit 0. That run used headless Chrome 131 on ANGLE Metal (M4 Pro) with real keyboard and mouse input. Evidence is in `evidence/gameplay/world-controller/`.

## Controls (vision §3.1)
- WASD moves relative to the camera, and diagonals are normalised. Walk speed is 3.1 m/s and Shift sprints at ×1.6 (4.96 m/s). Velocity is damped toward the input (accel k=12/s, decel k=16/s), so there is no ice skating.
- The simulation runs fixed 1/60 s steps, at most 6 per frame, with frame dt clamped to 0.1 s.
- The mouse orbits the camera. Under pointer lock it uses movement deltas; without lock (lock denied, or headless) a left-drag orbits instead. The arrow keys also turn and move.
- Pointer lock is requested on a canvas click, and only while exploring. It is released on terminal open, pause, blur and non-explorable states.
- Esc toggles pause. Losing pointer lock while exploring also pauses, and a 200 ms guard stops the same Esc from un-pausing again.
- Keys are ignored while focus is in an input, select, textarea, contenteditable or any `[data-captures-keys]` subtree.

## Collision
- Collision is 2D. Each collider is an XZ box `{id,minX,maxX,minZ,maxZ,enabled,low}`, and the player is a circle of radius 0.35 m resolved per axis.
- `low` boxes are the rooftop rails. They block movement but not the camera or line of sight.
- **Walkable-rect guard:** a step that ends outside every floor rect is reverted. With every collider disabled, the player still stopped at the map edge (sabotage check).
- Doors are colliders whose `enabled` flag comes from the quest state. Door A opens at `CLONE_UNDERSTOOD` (§9.3 says the sealed corridor door opens there). Door B opens at `RELAY_UNDERSTOOD`.

## Camera
- The camera sits over the right shoulder: 4.2 m back, pivot at 1.55 m, shoulder offset 0.55 m, looking 1.5 m ahead. Pitch is limited to [-0.25, 0.85] rad.
- A segment test against full-height colliders pulls the camera in instantly, and it eases back out. It stays under the connector and elevator ceilings.
- At `TELEPORT_COMMITTED` the camera takes the fixed final skyline shot (`district.finalShot`).

## Interaction
A device is focusable only when all four of these hold:
1. The quest state is in the anchor's `requiredQuest` list.
2. The ground-plane distance is under 2.5 m.
3. The player is facing it (dot > 0.5, about ±60°).
4. No enabled non-low collider crosses the segment to the anchor (its own collider is ignored).

`ui:prompt` is emitted only when the focus changes. Pressing E sends the anchor's `action` if `quest.can(action)`, then emits `ui:terminal:open {id,state}`.

Measured at the booth pylon: at 2.16 m, facing the booth, no prompt appeared. With the pylon's collider disabled in the page, the prompt appeared at the same spot.

| anchor | position | requiredQuest | action |
|---|---|---|---|
| copy_booth | (3.9, 1.2, -11.5) | FREE_ROAM_ALLEY … CLONE_SUPERPOSITION_FAILED | OPEN_CLONE_BOOTH |
| relay_core | (0, 1.2, -48.2) | RELAY_UNLOCKED … RELAY_SEND_FAILED | REACH_RELAY |
| classical_socket | (21.5, 1.2, -57.3) | ROOFTOP_UNLOCKED | REPAIR_CLASSICAL_LINK |
| teleport_terminal | (30, 1.2, -43.6) | LINK_REPAIRED … TELEPORT_DRY_RUN_PASSED | RUN_DRY_TEST |

Trigger volumes send `EXIT_BOOTH` in the connector and `OPEN_ROOFTOP` in the elevator corridor. They are guarded by `quest.can`.

## World reactions (§9.3) and reset (§9.5)
- `applyQuestState(state)` derives every reaction from the state's position in `QUEST_STATES`, so it is idempotent:
  - booth lamp: coral, then dim;
  - door arrow;
  - relay conduit and rings turn cyan at `RELAY_BELL_CREATED`;
  - amber schematic appears at `RELAY_UNDERSTOOD`;
  - fiber pulse runs to the skyline node at `LINK_REPAIRED`;
  - at `TELEPORT_COMMITTED` the capsule goes dark, the vault lamp turns cyan and a city light wave spreads at 45 m/s.
- Reset runs on both `quest:reset` and any transition into `TITLE` (the `RESTART` edge). It snaps the world back and resets the player transform, camera, pause, terminal and pointer lock.

## Bus events
- The game emits `ui:prompt` {id,label,key}|null, `ui:terminal:open` {id,state}, `ui:pause` {paused} and `perf:fps` {fps,ms,calls}.
- It listens for `ui:terminal:close`.
- `ui.mount({bus, quest, quantum, game})` is called once after boot.

## Findings worth keeping
- Headless Chrome paces rAF at roughly 12–46 FPS no matter what is drawn. With `--disable-frame-rate-limit` the same scene ran at 110–267 FPS (95 draw calls, 1280×720, DPR 1, M4 Pro). Headless FPS is not a performance measurement.
- In a puppeteer driver under pointer lock, moving the cursor back to centre counts as a turn. Drive turns by key, or by deltas only.
- Exponential fog at 0.018 hid the whole city past about 60 m. City window bands use `fog:false` so the commit wave reads.
