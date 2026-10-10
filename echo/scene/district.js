import * as THREE from 'three';
import { QUEST_STATE_LIST, WORLD_CHANGES } from '../contracts.js';
import { worldChangesFor } from '../game/state.js';
import { buildAlley } from './alley.js';
import { buildRelay } from './relay.js';
import { buildRooftop } from './rooftop.js';

// One continuous "hero corridor" (vision §5.1). World units are metres, y up, the player starts in the
// alley facing -Z. Collision is 2D: every collider is an XZ box; `low` boxes (guard rails) block
// movement but not the camera or line of sight.
//
//   Rain Alley        x[-6,6]   z[4,-26]     door A at z=-26 (opens on corridor_door_opens)
//   Substation pass.  x[-2.5,2.5] z[-26,-41]  trigger EXIT_BOOTH
//   Relay Chamber     x[-9,9]   z[-41,-59]   door B at x=9  (opens on rooftop_access_unlocked)
//   Elevator corridor x[9,17]   z[-47.5,-52.5] trigger OPEN_ROOFTOP
//   Rooftop           x[17,39]  z[-40,-60]

export const PALETTE = {
  graphite: 0x070b12, steel: 0x132035, cyan: 0x56e4f2, amber: 0xf3ae62, coral: 0xe96b68, porcelain: 0xeaf3f6,
};

function createKit(scene) {
  const colliders = [];
  const walkable = [];
  const anchors = {};
  const doors = [];
  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  const mats = {
    wall: new THREE.MeshStandardMaterial({ color: 0x33445f, roughness: 0.85, metalness: 0.1 }),
    wallDark: new THREE.MeshStandardMaterial({ color: 0x1d2738, roughness: 0.9, metalness: 0.1 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x1f2a3c, roughness: 0.4, metalness: 0.3 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x4a5870, roughness: 0.5, metalness: 0.4 }),
    door: new THREE.MeshStandardMaterial({ color: 0x3a2a2e, roughness: 0.6, metalness: 0.5, emissive: PALETTE.coral, emissiveIntensity: 0.15 }),
    cyan: new THREE.MeshBasicMaterial({ color: PALETTE.cyan }),
    amber: new THREE.MeshBasicMaterial({ color: PALETTE.amber }),
    coral: new THREE.MeshBasicMaterial({ color: PALETTE.coral }),
    porcelain: new THREE.MeshBasicMaterial({ color: PALETTE.porcelain }),
    dim: new THREE.MeshBasicMaterial({ color: 0x1b2433 }),
  };

  const kit = {
    THREE, scene, mats, geoBox, colliders, walkable, anchors, doors,
    // Box centred on (x, z) with its base at y. collide: true | 'low' | false.
    box({ x, z, w, d, h, y = 0, mat = mats.wall, collide = true, id, parent = scene }) {
      const mesh = new THREE.Mesh(geoBox, mat);
      mesh.scale.set(w, h, d);
      mesh.position.set(x, y + h / 2, z);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
      if (collide) {
        colliders.push({ id, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, enabled: true, low: collide === 'low' });
      }
      return mesh;
    },
    // Axis-aligned wall from a rect, full height by default.
    wall(minX, maxX, minZ, maxZ, h = 6, mat = mats.wall, collide = true) {
      return kit.box({ x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, w: maxX - minX, d: maxZ - minZ, h, mat, collide });
    },
    floor(minX, maxX, minZ, maxZ, { ceiling = Infinity, mat = mats.floor, name } = {}) {
      const mesh = new THREE.Mesh(geoBox, mat);
      mesh.scale.set(maxX - minX, 0.2, maxZ - minZ);
      mesh.position.set((minX + maxX) / 2, -0.1, (minZ + maxZ) / 2);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      scene.add(mesh);
      walkable.push({ name, minX, maxX, minZ, maxZ, ceiling });
    },
    // Interactable anchor: the point the player must be near, facing and in sight of (vision §3.1, §9.4).
    anchor(id, x, y, z, spec) {
      anchors[id] = { id, position: new THREE.Vector3(x, y, z), ...spec };
    },
    // Sliding door: open while the world change `openOn` is in force (derived from state, so idempotent).
    door({ id, x, z, w, d, h = 4.2, openOn }) {
      const mesh = kit.box({ x, z, w, d, h, mat: mats.door, id });
      mesh.matrixAutoUpdate = true;
      const collider = colliders[colliders.length - 1];
      const strip = kit.box({ x, z, w: w + 0.06, d: d + 0.06, h: 0.12, y: h + 0.1, mat: mats.coral, collide: false });
      const door = { id, mesh, strip, collider, openOn: changeId(openOn), h, open: false, t: 0 };
      doors.push(door);
      return door;
    },
  };
  return kit;
}

const lerp = (a, b, k) => a + (b - a) * k;

// §9.3 world changes by their contracts ids. A scene file names the ids it reacts to through
// `changeId`, which throws on a name contracts does not define, so a typo or a rename fails at build
// time instead of leaving a door shut forever.
const KNOWN_CHANGES = new Set(Object.values(WORLD_CHANGES).flat());
export function changeId(id) {
  if (!KNOWN_CHANGES.has(id)) throw new TypeError(`unknown WORLD_CHANGES id "${id}"; known: ${[...KNOWN_CHANGES].join(', ')}`);
  return id;
}
// The changes in force in `state`: those of entering it and of every state before it in §9.1 order
// (the quest only moves forward until a reset). Derived from the state alone, so applying it twice
// is a no-op (§9.3 idempotence) and a reset to TITLE clears every one (§9.5).
export function activeChanges(state) {
  const r = QUEST_STATE_LIST.indexOf(state);
  return new Set(QUEST_STATE_LIST.slice(0, r + 1).flatMap(worldChangesFor));
}

export function buildDistrict(scene) {
  const rank = (s) => QUEST_STATE_LIST.indexOf(s);
  const kit = createKit(scene);
  kit.changeId = changeId;

  // Graybox readability light only; art's lighting.js replaces this.
  scene.add(new THREE.HemisphereLight(0x8aa6d6, 0x1a1e2e, 2.2));
  const key = new THREE.DirectionalLight(0xb4c8ff, 1.2);
  key.position.set(-20, 40, 15);
  scene.add(key);

  const spaces = [buildAlley(kit), buildRelay(kit), buildRooftop(kit)];
  const triggers = spaces.flatMap((s) => s.triggers ?? []);

  let active = new Set();
  // Derive every world reaction from the WORLD_CHANGES ids in force. Calling this twice with the same
  // state is a no-op, which is what makes the §9.3 reactions idempotent and §9.5 reset deterministic.
  // `before(s)` is for guidance only (the door-A arrow), never for a §9.3 consequence.
  function applyQuestState(state, { instant = false } = {}) {
    active = activeChanges(state);
    const has = (id) => active.has(id);
    const before = (s) => rank(state) < rank(s);
    for (const d of kit.doors) {
      d.open = has(d.openOn);
      d.collider.enabled = !d.open;
      if (instant) d.t = d.open ? 1 : 0;
    }
    for (const s of spaces) s.react?.({ has, before, state, instant });
  }

  function update(dt, t) {
    for (const d of kit.doors) {
      d.t = THREE.MathUtils.clamp(d.t + (d.open ? dt : -dt) / 0.9, 0, 1);
      d.mesh.position.y = lerp(d.h / 2, d.h / 2 + d.h - 0.15, d.t);
      d.strip.material = d.open ? kit.mats.cyan : kit.mats.coral;
    }
    for (const s of spaces) s.update?.(dt, t);
  }

  return {
    colliders: kit.colliders,
    walkable: kit.walkable,
    anchors: kit.anchors,
    doors: kit.doors,
    triggers,
    spawn: { position: new THREE.Vector3(0, 0, 2), heading: 0 },
    // Final skyline shot at commit: over the east rail, across the city to the fiber's skyline node.
    finalShot: { position: [25, 4.2, -45], target: [80, 4, -95] },
    applyQuestState,
    get activeChanges() { return [...active]; },
    update,
  };
}
