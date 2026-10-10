// Substation Passage (~15 m × 5 m) + Sector B — Relay Chamber (~18 m × 18 m), vision §5.1.
export function buildRelay(kit) {
  const { mats, THREE, scene } = kit;

  // Connector: low ceiling and pipes — the change of scale says "passage", not "street".
  kit.floor(-2.5, 2.5, -41.2, -25.8, { name: 'connector', ceiling: 4.2 });
  kit.wall(-3.5, -2.5, -41, -26, 4.4, mats.wallDark);
  kit.wall(2.5, 3.5, -41, -26, 4.4, mats.wallDark);
  kit.box({ x: 0, z: -33.5, w: 7, d: 15, h: 0.3, y: 4.4, mat: mats.wallDark, collide: false });
  for (const x of [-2.1, -1.6, 1.9]) kit.box({ x, z: -33.5, w: 0.22, d: 15, h: 0.22, y: 3.8, mat: mats.metal, collide: false });
  for (let i = 0; i < 4; i++) kit.box({ x: -2.45, z: -28.5 - i * 3.6, w: 0.06, d: 1.2, h: 0.08, y: 0.25, mat: mats.cyan, collide: false });

  // Relay chamber shell.
  kit.floor(-9, 9, -59, -41, { name: 'relay' });
  kit.wall(-10, -2.5, -41.6, -41, 10);
  kit.wall(2.5, 10, -41.6, -41, 10);
  kit.wall(-10, 10, -60, -59, 10);
  kit.wall(-10, -9, -60, -41, 10);
  kit.wall(9, 10, -60, -52.5, 10);
  kit.wall(9, 10, -47.5, -41, 10);
  kit.box({ x: 9.5, z: -50, w: 1, d: 5, h: 5.6, y: 4.4, mat: mats.wall, collide: false });
  kit.box({ x: 0, z: -41.3, w: 5, d: 0.6, h: 5.6, y: 4.4, mat: mats.wall, collide: false });
  kit.door({ id: 'door_relay', x: 9.5, z: -50, w: 0.6, d: 5, openAt: 'RELAY_UNDERSTOOD' });

  // Circular plinth, core pillar and rings: the chamber's landmark silhouette.
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.35, 32), mats.metal);
  plinth.position.set(0, 0.17, -50);
  scene.add(plinth);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 2.6, 16), mats.wallDark);
  core.position.set(0, 1.3, -50);
  scene.add(core);
  kit.colliders.push({ id: 'relay_core', minX: -1.6, maxX: 1.6, minZ: -51.6, maxZ: -48.4, enabled: true, low: false });
  const ringMatIdle = new THREE.MeshBasicMaterial({ color: 0x2b5d66 });
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7 + i * 0.45, 0.05, 6, 48), ringMatIdle);
    ring.position.set(0, 2.9 + i * 0.5, -50);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    rings.push(ring);
  }
  kit.anchor('relay_core', 0, 1.2, -48.2, {
    label: 'QUANTUM RELAY',
    requiredQuest: ['RELAY_UNLOCKED', 'RELAY_INTRO', 'RELAY_BELL_CREATED', 'RELAY_SEND_FAILED'],
    action: 'REACH_RELAY',
  });

  // Three tall cooling columns.
  const colGeo = new THREE.CylinderGeometry(0.7, 0.8, 9, 12);
  for (const [x, z] of [[-6, -45], [-6, -55], [5.5, -56]]) {
    const col = new THREE.Mesh(colGeo, mats.wall);
    col.position.set(x, 4.5, z);
    scene.add(col);
    kit.colliders.push({ id: 'column', minX: x - 0.75, maxX: x + 0.75, minZ: z - 0.75, maxZ: z + 0.75, enabled: true, low: false });
  }

  // Conduit from the west wall into the core: dark until the Bell pair exists (§9.3).
  const conduit = kit.box({ x: -5.3, z: -50, w: 7.4, d: 0.3, h: 0.06, mat: mats.dim, collide: false });
  // Amber schematic on the north wall: appears when the rooftop is unlocked (§9.3).
  const schematic = kit.box({ x: 0, z: -58.92, w: 6, d: 0.04, h: 3, y: 3, mat: mats.amber, collide: false });

  const trig = { minX: -2.5, maxX: 2.5, minZ: -38, maxZ: -29, event: 'EXIT_BOOTH' };
  let spin = 0.3;
  return {
    triggers: [trig],
    react({ reached }) {
      const lit = reached('RELAY_BELL_CREATED');
      conduit.material = lit ? mats.cyan : mats.dim;
      for (const r of rings) r.material = lit ? mats.cyan : ringMatIdle;
      spin = lit ? 1.6 : 0.3;
      schematic.visible = reached('RELAY_UNDERSTOOD');
    },
    update(dt) {
      rings.forEach((r, i) => { r.rotation.z += dt * spin * (i % 2 ? -1 : 1); });
    },
  };
}
