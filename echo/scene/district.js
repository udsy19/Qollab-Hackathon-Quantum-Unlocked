import * as THREE from 'three';
import { buildAlley } from './alley.js';
import { buildRelay } from './relay.js';
import { buildRooftop } from './rooftop.js';

// One continuous "hero corridor" (vision §5.1). World units are metres, y up, the player starts in the
// alley facing -Z. Collision is 2D: every collider is an XZ box; `low` boxes (guard rails) block
// movement but not the camera or line of sight.
//
//   Rain Alley        x[-6,6]   z[4,-26]     door A at z=-26 (opens at CLONE_UNDERSTOOD)
//   Substation pass.  x[-2.5,2.5] z[-26,-41]  trigger EXIT_BOOTH
//   Relay Chamber     x[-9,9]   z[-41,-59]   door B at x=9  (opens at RELAY_UNDERSTOOD)
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
    // Sliding door: open when the quest has reached `openAt` (derived from state, so idempotent).
    door({ id, x, z, w, d, h = 4.2, openAt }) {
      const mesh = kit.box({ x, z, w, d, h, mat: mats.door, id });
      mesh.matrixAutoUpdate = true;
      const collider = colliders[colliders.length - 1];
      const strip = kit.box({ x, z, w: w + 0.06, d: d + 0.06, h: 0.12, y: h + 0.1, mat: mats.coral, collide: false });
      const door = { id, mesh, strip, collider, openAt, h, open: false, t: 0 };
      doors.push(door);
      return door;
    },
  };
  return kit;
}

const lerp = (a, b, k) => a + (b - a) * k;

export function buildDistrict(scene, { states }) {
  const rank = (s) => states.indexOf(s);
  const kit = createKit(scene);

  // Graybox readability light only; art's lighting.js replaces this.
  scene.add(new THREE.HemisphereLight(0x8aa6d6, 0x1a1e2e, 2.2));
  const key = new THREE.DirectionalLight(0xb4c8ff, 1.2);
  key.position.set(-20, 40, 15);
  scene.add(key);

  const spaces = [buildAlley(kit), buildRelay(kit), buildRooftop(kit)];
  const triggers = spaces.flatMap((s) => s.triggers ?? []);

  let reached = () => false;
  // Derive every world reaction from the current quest state. Calling this twice with the same state is a
  // no-op, which is what makes the §9.3 reactions idempotent and §9.5 reset deterministic.
  function applyQuestState(state, { instant = false } = {}) {
    const r = rank(state);
    reached = (s) => r >= rank(s);
    for (const d of kit.doors) {
      d.open = reached(d.openAt);
      d.collider.enabled = !d.open;
      if (instant) d.t = d.open ? 1 : 0;
    }
    for (const s of spaces) s.react?.({ reached, state, instant });
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
    update,
  };
}
