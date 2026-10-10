// echo/scene/effects.js — how the world LOOKS when it changes (vision §9.3, §5.3 "layers of fine light").
// Gameplay calls apply(id) for each WORLD_CHANGES id on entering a quest state; this module renders it.
//
// apply(id, { instant, reducedMotion }):
//   - an id not in WORLD_CHANGES throws (contracts' fail-loud rule);
//   - an id already applied is a no-op ({ applied: false, reason: 'already applied' });
//   - an id whose refs are missing does nothing, logs console.error and returns { applied: false, missing },
//     and stays un-applied so it can be applied once the ref exists. It is never silently skipped.
//   - instant: jump to the end state (save-free reload, skip, RESTART into a later state).
// reset() puts every touched object back exactly as it was (§9.5 resetGame).
//
// Refs gameplay fills (all THREE.Object3D; meshes whose material colour this module may tint — it clones
// the material on first touch, so shared kit materials are never changed):
//   boothIndicator      clone booth's red lamp (alley.js boothLamp)
//   corridorDoorStrip   the light strip over door A (district door 'door_alley' .strip)
//   objectiveTarget     where the player should go next after the booth (door A / relay entrance)
//   conduit             relay floor conduit (relay.js conduit)
//   schematic           amber schematic panel (relay.js schematic)
//   rooftopAccessLamp   the elevator corridor's amber strip (rooftop.js, x 13.5 z -52.4)
//   socketLamp          legacy data link lamp (rooftop.js socketLamp)
//   skylineNode         the remote skyline node sphere (rooftop.js node)
//   capsule             story-token capsule (rooftop.js capsule)
//   vaultLamp           vault status lamp (rooftop.js vaultLamp)
// Systems: skyline (createSkyline), lighting (createLighting), rain (createRain), audio ({ play(cueId) }).
import * as THREE from 'three';
import { WORLD_CHANGES } from '../contracts.js';
import { PALETTE } from './lighting.js';
import { createSchematicTexture } from './props.js';

const DIM = 0x1b2433;
// Not in the §5.3 palette: the contract names this change "green". A cool mint that sits next to cyan.
const STATUS_GREEN = 0x6fe3b0;
export const AUDIO_CUES = Object.freeze({ reactor_audio_begins: 'reactor_hum', music_swell: 'music_swell' });

const ALL_IDS = Object.values(WORLD_CHANGES).flat();

export function createEffects({ scene, refs = {}, audio = null, skyline = null, lighting = null, rain = null } = {}) {
  if (!scene) throw new TypeError('createEffects: scene is required');
  const systems = { skyline, lighting, rain, audio };
  const added = new THREE.Group();
  added.name = 'effects';
  scene.add(added);

  const owned = new Map(); // mesh → original material
  const tweens = [];
  const pulses = [];
  const applied = new Set();
  let restorationSync = false;
  let schematicTex = null;

  const worldPos = (o) => o.getWorldPosition(new THREE.Vector3());
  function own(mesh) {
    if (!owned.has(mesh)) {
      owned.set(mesh, { material: mesh.material, visible: mesh.visible });
      mesh.material = mesh.material.clone();
    }
    return mesh.material;
  }
  function tween(seconds, fn, instant) {
    if (instant || seconds <= 0) { fn(1); return; }
    fn(0);
    tweens.push({ t: 0, seconds, fn });
  }
  function tint(mesh, to, seconds, instant) {
    const mat = own(mesh);
    const from = mat.color.clone();
    const target = new THREE.Color(to);
    tween(seconds, (k) => mat.color.copy(from).lerp(target, k), instant);
  }
  // A thin additive bar: the "fine light" unit everything below is made of.
  function glowBar({ from, to, color, width = 0.06 }) {
    const dir = to.clone().sub(from);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width, width, 1),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    bar.scale.z = Math.max(dir.length(), 0.001);
    bar.position.copy(from).addScaledVector(dir, 0.5);
    bar.lookAt(to);
    added.add(bar);
    return bar;
  }
  function glowRing(at, color, radius = 0.9) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.86, radius, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(at).setY(0.03);
    added.add(ring);
    return ring;
  }
  const fadeIn = (mesh, opacity, seconds, instant) => tween(seconds, (k) => { mesh.material.opacity = opacity * k; }, instant);

  // id → { need: [ref names or 'system:<name>'], run(ctx) }. Every WORLD_CHANGES id has exactly one.
  const HANDLERS = {
    booth_indicator_red_fades: {
      need: ['boothIndicator'],
      run: ({ instant, rm }) => tint(refs.boothIndicator, DIM, rm ? 0.4 : 1.6, instant),
    },
    corridor_door_opens: {
      need: ['corridorDoorStrip'],
      run: ({ instant, rm }) => {
        tint(refs.corridorDoorStrip, PALETTE.cyan, 0.6, instant);
        // Light spilling under the opening door: a cyan line on the wet floor below the strip.
        const p = worldPos(refs.corridorDoorStrip);
        const half = new THREE.Box3().setFromObject(refs.corridorDoorStrip).getSize(new THREE.Vector3()).x / 2;
        fadeIn(glowBar({ from: new THREE.Vector3(p.x - half, 0.03, p.z + 0.4), to: new THREE.Vector3(p.x + half, 0.03, p.z + 0.4), color: PALETTE.cyan, width: 0.05 }), 0.9, rm ? 0.4 : 0.9, instant);
      },
    },
    objective_target_glows: {
      need: ['objectiveTarget'],
      run: ({ instant, rm }) => {
        const at = worldPos(refs.objectiveTarget);
        const ring = glowRing(at, PALETTE.cyan);
        const column = glowBar({ from: at.clone().setY(0.05), to: at.clone().setY(3.2), color: PALETTE.cyan, width: 0.03 });
        fadeIn(ring, 0.8, rm ? 0.3 : 1.0, instant);
        fadeIn(column, 0.5, rm ? 0.3 : 1.0, instant);
        if (!rm) pulses.push({ mesh: ring, base: 0.8 });
      },
    },
    cyan_conduit_illuminates: {
      need: ['conduit', 'system:lighting'],
      run: ({ instant, rm }) => {
        tint(refs.conduit, PALETTE.cyan, rm ? 0.4 : 1.2, instant);
        // The chamber itself wakes: cyan spill on the floor and pedestal, the rim light comes up.
        tween(rm ? 0.4 : 1.6, (k) => lighting.interior.set({ relayEnergy: k }), instant);
      },
    },
    reactor_audio_begins: {
      need: ['system:audio'],
      run: () => audio.play(AUDIO_CUES.reactor_audio_begins),
    },
    amber_schematic_visible: {
      need: ['schematic', 'system:lighting'],
      run: ({ instant, rm }) => {
        // A lit display, not a flat card (consult 2 defect 3): the drawn circuit, its halo on the wall
        // and its spill on the floor fade in together.
        const mat = own(refs.schematic);
        mat.map = schematicTex ??= createSchematicTexture();
        mat.color.set(0xffffff);
        mat.transparent = true;
        refs.schematic.visible = true;
        tween(rm ? 0.4 : 1.4, (k) => { mat.opacity = k; lighting.interior.set({ schematic: k }); }, instant);
      },
    },
    rooftop_access_unlocked: {
      need: ['rooftopAccessLamp'],
      run: ({ instant, rm }) => tint(refs.rooftopAccessLamp, PALETTE.cyan, rm ? 0.4 : 1.0, instant),
    },
    amber_light_travels_to_skyline_node: {
      need: ['socketLamp', 'skylineNode'],
      run: ({ instant, rm }) => {
        // The two classical bits' path: an amber line grows from the socket to the node, then the node lights.
        const from = worldPos(refs.socketLamp), to = worldPos(refs.skylineNode);
        const bar = glowBar({ from, to, color: PALETTE.amber, width: 0.07 });
        bar.material.opacity = 0.85;
        const dir = to.clone().sub(from);
        const len = dir.length();
        const node = own(refs.skylineNode);
        const nodeFrom = node.color.clone();
        tween(rm ? 0.5 : 2.2, (k) => {
          bar.scale.z = Math.max(len * k, 0.001);
          bar.position.copy(from).addScaledVector(dir, k / 2);
          node.color.copy(nodeFrom).lerp(new THREE.Color(PALETTE.amber), THREE.MathUtils.smoothstep(k, 0.85, 1));
        }, instant);
      },
    },
    capsule_source_indicator_off: {
      need: ['capsule'],
      // The source is consumed by the Bell measurement (§7.4): its light goes out, it does not move.
      run: ({ instant, rm }) => tint(refs.capsule, DIM, rm ? 0.4 : 1.2, instant),
    },
    vault_status_green: {
      need: ['vaultLamp'],
      run: ({ instant, rm }) => tint(refs.vaultLamp, STATUS_GREEN, rm ? 0.4 : 0.8, instant),
    },
    city_lighting_wave: {
      need: ['system:skyline', 'system:lighting'],
      run: ({ instant, rm }) => {
        if (instant) skyline.setRestoration(1);
        else skyline.playRestoration({ direction: 'left-to-right', seconds: 5, reducedMotion: rm });
        restorationSync = true;
        lighting.setRestoration(skyline.progress);
      },
    },
    music_swell: {
      need: ['system:audio'],
      run: () => audio.play(AUDIO_CUES.music_swell),
    },
    ending_dialogue: {
      // story-ui shows the lines; the world answers by calming the storm under them.
      need: ['system:rain'],
      run: ({ instant }) => {
        const from = rain.intensity;
        tween(6, (k) => rain.setIntensity(THREE.MathUtils.lerp(from, 0.35, k)), instant);
      },
    },
  };

  const handled = Object.keys(HANDLERS);
  const unhandled = ALL_IDS.filter((id) => !handled.includes(id));
  const stale = handled.filter((id) => !ALL_IDS.includes(id));
  if (unhandled.length || stale.length) {
    throw new Error(`effects.js is out of step with WORLD_CHANGES: unhandled ${JSON.stringify(unhandled)}, stale ${JSON.stringify(stale)}`);
  }

  function missingFor(id) {
    return HANDLERS[id].need.filter((n) => (n.startsWith('system:') ? !systems[n.slice(7)] : !(refs[n] instanceof THREE.Object3D)));
  }
  const missingAtStart = Object.fromEntries(ALL_IDS.map((id) => [id, missingFor(id)]).filter(([, m]) => m.length));
  if (Object.keys(missingAtStart).length) {
    console.error('[effects] world changes that cannot render until these refs/systems are supplied:', missingAtStart);
  }

  function apply(id, { instant = false, reducedMotion = false } = {}) {
    if (typeof id !== 'string' || !Object.hasOwn(HANDLERS, id)) {
      throw new TypeError(`effects.apply: unknown world change ${JSON.stringify(id)}; known: ${ALL_IDS.join(', ')}`);
    }
    if (applied.has(id)) return { applied: false, reason: 'already applied', missing: [] };
    const missing = missingFor(id);
    if (missing.length) {
      console.error(`[effects] ${id} NOT applied: missing ${missing.join(', ')}`);
      return { applied: false, reason: 'missing refs', missing };
    }
    HANDLERS[id].run({ instant, rm: reducedMotion });
    applied.add(id);
    return { applied: true, reason: null, missing: [] };
  }

  function reset() {
    tweens.length = 0;
    pulses.length = 0;
    for (const [mesh, orig] of owned) {
      mesh.material.dispose();
      mesh.material = orig.material;
      mesh.visible = orig.visible;
    }
    owned.clear();
    schematicTex?.dispose();
    schematicTex = null;
    for (const o of [...added.children]) { added.remove(o); o.geometry.dispose(); o.material.dispose(); }
    applied.clear();
    restorationSync = false;
    skyline?.setRestoration(0);
    lighting?.setRestoration(0);
    lighting?.interior.set({ relayEnergy: 0, schematic: 0 });
    rain?.setIntensity(1);
  }

  return {
    group: added,
    ids: ALL_IDS,
    missingAtStart,
    apply,
    reset,
    isApplied: (id) => applied.has(id),
    get applied() { return [...applied]; },
    update(dt, elapsed) {
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        tw.t = Math.min(tw.seconds, tw.t + dt);
        tw.fn(tw.t / tw.seconds);
        if (tw.t >= tw.seconds) tweens.splice(i, 1);
      }
      for (const p of pulses) p.mesh.material.opacity = p.base * (0.6 + 0.4 * Math.sin(elapsed * 3));
      if (restorationSync) lighting.setRestoration(skyline.progress);
    },
    setQuality() {}, // fine light costs the same at every preset
    dispose() {
      reset();
      scene.remove(added);
    },
  };
}
