import { createEventBus, createQuestMachine, STATES } from './questStandin.js';
import { createRenderer } from '../scene/renderer.js';
import { buildDistrict } from '../scene/district.js';
import { createPlayer } from '../scene/player.js';
import { createInput } from './input.js';
import { createController } from './controller.js';
import { createFollowCamera } from './camera.js';
import { createInteractions } from './interactions.js';

// Read back from the served page to prove which build a screenshot came from.
export const BUILD = 'wc-0001-f';

const FIXED_DT = 1 / 60;
const MAX_STEPS = 6;
const FIRST_EXPLORE = STATES.indexOf('FREE_ROAM_ALLEY');
const LAST_EXPLORE = STATES.indexOf('TELEPORT_DRY_RUN_PASSED');

/**
 * Boot the 3D world into `root` and run it.
 *
 * Bus events the game EMITS (for ui/): `ui:prompt` {id,label,key}|null · `ui:terminal:open` {id,state}
 * · `ui:pause` {paused} · `perf:fps` {fps,ms,calls}.
 * Bus events the game LISTENS to: `ui:terminal:close` · plus the quest's own `quest:transition` / `quest:reset`.
 * `ui.mount({ bus, quest, quantum, game })`, if present, is called once after boot.
 */
export function startGame({ root, quantum, ui } = {}) {
  const bus = createEventBus();
  const quest = createQuestMachine(bus);
  const view = createRenderer(root);
  const world = buildDistrict(view.scene, { states: STATES });
  const player = createPlayer(view.scene);
  const input = createInput(view.canvas);
  const controller = createController({ group: player.group, ...world });
  const follow = createFollowCamera({ camera: view.camera, colliders: world.colliders, walkable: world.walkable });
  const interactions = createInteractions({ anchors: world.anchors, colliders: world.colliders, bus, quest });

  let paused = false;
  let terminalOpen = false;
  let lockLostAt = -1;
  const offs = [];

  const rank = () => STATES.indexOf(quest.state);
  const explorableState = () => rank() >= FIRST_EXPLORE && rank() <= LAST_EXPLORE;
  const exploring = () => explorableState() && !terminalOpen && !paused;

  function setPaused(p) {
    if (p === paused) return;
    paused = p;
    if (paused) { input.unlock(); input.clear(); controller.halt(); interactions.clear(); }
    bus.emit('ui:pause', { paused });
  }

  function resetWorld() {
    terminalOpen = false;
    paused = false;
    input.unlock();
    input.clear();
    controller.reset();
    follow.reset(controller.pos, controller.heading);
    world.applyQuestState(quest.state, { instant: true });
    interactions.clear();
  }

  offs.push(bus.on('quest:transition', ({ to }) => {
    world.applyQuestState(to);
    if (to === 'TELEPORT_COMMITTED') follow.setShot(world.finalShot);
    if (!explorableState()) { input.unlock(); interactions.clear(); controller.halt(); }
  }));
  offs.push(bus.on('quest:reset', resetWorld));
  offs.push(bus.on('ui:terminal:open', () => {
    terminalOpen = true;
    input.unlock();
    input.clear();
    controller.halt();
    interactions.clear();
  }));
  offs.push(bus.on('ui:terminal:close', () => {
    terminalOpen = false;
    if (explorableState() && !paused) input.lock();
  }));

  input.on(view.canvas, 'click', () => { if (exploring()) input.lock(); });
  input.on(document, 'pointerlockchange', () => {
    if (!input.locked && exploring()) { lockLostAt = performance.now(); setPaused(true); }
  });
  input.on(window, 'blur', () => { if (exploring()) setPaused(true); });

  function step(dt) {
    if (input.consume('Escape')) {
      // Chrome may deliver the Esc that released pointer lock; that one already paused us.
      if (!terminalOpen && explorableState() && performance.now() - lockLostAt > 200) setPaused(!paused);
    }
    if (!exploring()) {
      input.consume('KeyE');
      return;
    }
    const [mdx, mdy] = input.takeMouse();
    follow.orbit(mdx, mdy);
    const turn = (input.held('ArrowRight') ? 1 : 0) - (input.held('ArrowLeft') ? 1 : 0);
    if (turn) follow.orbit(turn * 600 * dt, 0);
    const move = {
      x: (input.held('KeyD') ? 1 : 0) - (input.held('KeyA') ? 1 : 0),
      y: (input.held('KeyW') || input.held('ArrowUp') ? 1 : 0) - (input.held('KeyS') || input.held('ArrowDown') ? 1 : 0),
    };
    const sprint = input.held('ShiftLeft') || input.held('ShiftRight');
    controller.step(dt, move, sprint, follow.yaw);

    for (const t of world.triggers) {
      const p = controller.pos;
      if (p.x >= t.minX && p.x <= t.maxX && p.z >= t.minZ && p.z <= t.maxZ && quest.can(t.event)) quest.send(t.event);
    }
    interactions.update(controller.pos, controller.heading);
    if (input.consume('KeyE')) interactions.interact();
  }

  let raf = 0;
  let prev = performance.now();
  let acc = 0;
  let clock = 0;
  let fpsFrames = 0;
  let fpsTime = 0;
  let workMs = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t0 = performance.now();
    const dt = Math.min((now - prev) / 1000, 0.1);
    prev = now;
    acc += dt;
    clock += dt;
    let n = 0;
    while (acc >= FIXED_DT && n < MAX_STEPS) { step(FIXED_DT); acc -= FIXED_DT; n++; }
    if (n === MAX_STEPS) acc = 0;
    if (!exploring()) input.takeMouse();
    world.update(dt, clock);
    follow.update(controller.pos, dt);
    view.renderer.render(view.scene, view.camera);

    // ms = main-thread time per frame (sim + render submission); it excludes GPU time and vsync waits.
    workMs += performance.now() - t0;
    fpsFrames++;
    fpsTime += dt;
    if (fpsTime >= 0.5) {
      bus.emit('perf:fps', { fps: Math.round(fpsFrames / fpsTime), ms: +(workMs / fpsFrames).toFixed(2), calls: view.renderer.info.render.calls });
      fpsFrames = 0;
      fpsTime = 0;
      workMs = 0;
    }
  }

  quest.send('BOOTED');
  resetWorld();
  raf = requestAnimationFrame(frame);

  const game = {
    bus,
    quest,
    BUILD,
    get paused() { return paused; },
    get terminalOpen() { return terminalOpen; },
    pause: () => setPaused(true),
    resume() { setPaused(false); if (exploring()) input.lock(); },
    // Restart to title (vision §9.5): quest, player transform, camera, world, pointer lock, prompts.
    reset: () => quest.reset(),
    // Read-only view for harnesses and tests.
    debug: {
      get state() { return quest.state; },
      get player() { return { x: controller.pos.x, z: controller.pos.z, heading: controller.heading, speed: controller.speed }; },
      get focus() { return interactions.focus?.id ?? null; },
      get camera() { const p = view.camera.position; return { x: p.x, y: p.y, z: p.z, yaw: follow.yaw, pulledIn: follow.pulledIn }; },
      doors: () => world.doors.map((d) => ({ id: d.id, open: d.open, t: d.t })),
      anchors: () => Object.keys(world.anchors),
      // Live collider list, exposed so a harness can sabotage a disposable page and prove its checks bite.
      colliders: world.colliders,
    },
    dispose() {
      cancelAnimationFrame(raf);
      offs.forEach((off) => off());
      input.dispose();
      view.dispose();
    },
  };
  ui?.mount?.({ bus, quest, quantum, game });
  return game;
}
