// Elevator corridor (~8 m × 5 m) + Sector C — Rooftop Terminal (~22 m × 20 m), vision §5.1.
// The rooftop floor is the top of a tall block; the city around it is instanced boxes whose facade
// strips light in a wave from the rooftop outward at TELEPORT_COMMITTED (§9.3).
const CITY_DARK = 0x121a28;
const CITY_LIT = [0xf3ae62, 0x56e4f2, 0xeaf3f6];
const WAVE_SPEED = 45; // m/s
const BANDS = 3;

export function buildRooftop(kit) {
  const { mats, THREE, scene } = kit;

  // Elevator corridor.
  kit.floor(8.8, 17.2, -52.5, -47.5, { name: 'elevator', ceiling: 4.2 });
  kit.wall(10, 17, -53.5, -52.5, 4.4, mats.wallDark);
  kit.wall(10, 17, -47.5, -46.5, 4.4, mats.wallDark);
  kit.box({ x: 13.5, z: -50, w: 7, d: 7, h: 0.3, y: 4.4, mat: mats.wallDark, collide: false });
  kit.box({ x: 13.5, z: -52.4, w: 7, d: 0.05, h: 0.08, y: 1.0, mat: mats.amber, collide: false });

  // Rooftop: the top of a tall block, walls on the elevator side, low guard rails elsewhere.
  kit.floor(17, 39, -60, -40, { name: 'rooftop' });
  kit.box({ x: 28, z: -50, w: 22, d: 20, h: 60, y: -60.2, mat: mats.wallDark, collide: false });
  kit.wall(16.6, 17, -60, -52.5, 5);
  kit.wall(16.6, 17, -47.5, -40, 5);
  kit.box({ x: 16.8, z: -50, w: 0.4, d: 5, h: 0.6, y: 4.4, mat: mats.wall, collide: false });
  kit.box({ x: 28, z: -60.2, w: 22.4, d: 0.4, h: 1.1, mat: mats.metal, collide: 'low' });
  kit.box({ x: 28, z: -39.8, w: 22.4, d: 0.4, h: 1.1, mat: mats.metal, collide: 'low' });
  kit.box({ x: 39.2, z: -50, w: 0.4, d: 20.8, h: 1.1, mat: mats.metal, collide: 'low' });
  kit.box({ x: 28, z: -50, w: 8, d: 8, h: 0.12, mat: mats.metal, collide: false }); // raised platform

  // Transmission mast: the rooftop's landmark.
  kit.box({ x: 35.5, z: -56.5, w: 1.2, d: 1.2, h: 1.0, mat: mats.metal });
  kit.box({ x: 35.5, z: -56.5, w: 0.35, d: 0.35, h: 22, mat: mats.wall, collide: false });
  kit.box({ x: 35.5, z: -56.5, w: 0.5, d: 0.5, h: 0.5, y: 22, mat: mats.coral, collide: false });

  // Legacy classical data link (amber, riveted, old) — the two classical bits travel here.
  kit.box({ x: 21.5, z: -57.9, w: 1.2, d: 0.8, h: 1.1, mat: mats.metal, id: 'classical_socket' });
  const socketLamp = kit.box({ x: 21.5, z: -57.48, w: 0.7, d: 0.04, h: 0.3, y: 0.7, mat: mats.amber, collide: false });
  kit.anchor('classical_socket', 21.5, 1.2, -57.3, {
    label: 'LEGACY DATA LINK', requiredQuest: ['ROOFTOP_UNLOCKED'], action: 'REPAIR_CLASSICAL_LINK',
  });

  // Teleport terminal with the story-token capsule and the vault status lamp.
  kit.box({ x: 30, z: -43, w: 1.4, d: 0.8, h: 1.2, mat: mats.metal, id: 'teleport_terminal' });
  kit.box({ x: 30, z: -43.42, w: 1.0, d: 0.04, h: 0.5, y: 0.6, mat: mats.cyan, collide: false });
  const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.3, 4, 10), mats.cyan);
  capsule.position.set(29.6, 1.45, -43);
  scene.add(capsule);
  const vaultLamp = kit.box({ x: 30.4, z: -43, w: 0.25, d: 0.25, h: 0.25, y: 1.2, mat: mats.coral, collide: false });
  kit.anchor('teleport_terminal', 30, 1.2, -43.6, {
    label: 'TELEPORT TERMINAL',
    requiredQuest: ['LINK_REPAIRED', 'TELEPORT_DRY_RUN', 'TELEPORT_DRY_RUN_PASSED'],
    action: 'RUN_DRY_TEST',
  });

  // Amber fiber from the socket out to a remote skyline node; a pulse runs along it once repaired.
  const nodePos = new THREE.Vector3(62, 14, -78);
  const from = new THREE.Vector3(21.5, 0.6, -58.4);
  const fiberDir = nodePos.clone().sub(from);
  const fiber = new THREE.Mesh(kit.geoBox, mats.dim);
  fiber.scale.set(0.08, 0.08, fiberDir.length());
  fiber.position.copy(from).addScaledVector(fiberDir, 0.5);
  fiber.lookAt(nodePos);
  scene.add(fiber);
  const node = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), mats.dim);
  node.position.copy(nodePos);
  scene.add(node);
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mats.amber);
  pulse.visible = false;
  scene.add(pulse);

  // Instanced city: bodies + one facade strip each.
  const center = new THREE.Vector2(28, -50);
  const bodies = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  while (bodies.length < 240) {
    const x = -120 + rnd() * 260;
    const z = -190 + rnd() * 230;
    if (x > -14 && x < 44 && z > -64 && z < 10) continue; // keep the playable district clear
    const w = 6 + rnd() * 10;
    const d = 6 + rnd() * 10;
    const top = -25 + rnd() * 45;
    bodies.push({ x, z, w, d, top, dist: center.distanceTo(new THREE.Vector2(x, z)) });
  }
  // Bodies are a touch lighter than the sky so the skyline reads; window bands ignore fog so the commit
  // wave is visible across the whole city, not just the first 60 m.
  const bodyMesh = new THREE.InstancedMesh(kit.geoBox, new THREE.MeshStandardMaterial({ color: 0x223049, roughness: 0.9 }), bodies.length);
  const stripMesh = new THREE.InstancedMesh(kit.geoBox, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), bodies.length * BANDS);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  bodies.forEach((b, i) => {
    const h = b.top + 80;
    m.makeScale(b.w, h, b.d).setPosition(b.x, b.top - h / 2, b.z);
    bodyMesh.setMatrixAt(i, m);
    // Bands on the facade facing the rooftop.
    const toward = new THREE.Vector2(center.x - b.x, center.y - b.z).normalize();
    const alongX = Math.abs(toward.x) > Math.abs(toward.y);
    const sx = alongX ? b.x + Math.sign(toward.x) * (b.w / 2 + 0.05) : b.x;
    const sz = alongX ? b.z : b.z + Math.sign(toward.y) * (b.d / 2 + 0.05);
    for (let k = 0; k < BANDS; k++) {
      m.makeScale(alongX ? 0.1 : b.w * 0.8, 0.9, alongX ? b.d * 0.8 : 0.1).setPosition(sx, b.top - 3 - k * 7, sz);
      stripMesh.setMatrixAt(i * BANDS + k, m);
      stripMesh.setColorAt(i * BANDS + k, c.set(CITY_DARK));
    }
  });
  scene.add(bodyMesh, stripMesh);

  const trig = { minX: 11, maxX: 16, minZ: -52.5, maxZ: -47.5, event: 'OPEN_ROOFTOP' };
  let linkOn = false;
  let waveT = -1; // seconds since the commit wave began; -1 = idle
  let litCount = 0;
  let pulseT = 0;

  function paintCity(radius) {
    let n = 0;
    bodies.forEach((b, i) => {
      const lit = b.dist <= radius;
      if (lit) n++;
      c.set(lit ? CITY_LIT[i % CITY_LIT.length] : CITY_DARK);
      for (let k = 0; k < BANDS; k++) stripMesh.setColorAt(i * BANDS + k, c);
    });
    stripMesh.instanceColor.needsUpdate = true;
    litCount = n;
  }

  return {
    triggers: [trig],
    react({ reached, instant }) {
      linkOn = reached('LINK_REPAIRED');
      fiber.material = linkOn ? mats.amber : mats.dim;
      node.material = linkOn ? mats.amber : mats.dim;
      socketLamp.material = linkOn ? mats.cyan : mats.amber;
      pulse.visible = linkOn;
      const committed = reached('TELEPORT_COMMITTED');
      capsule.material = committed ? mats.dim : mats.cyan;
      vaultLamp.material = committed ? mats.cyan : mats.coral;
      if (!committed) { waveT = -1; paintCity(-1); }
      else if (instant) { waveT = -1; paintCity(Infinity); }
      else if (waveT < 0 && litCount < bodies.length) waveT = 0;
    },
    update(dt) {
      if (linkOn) {
        pulseT = (pulseT + dt * 0.35) % 1;
        pulse.position.copy(from).addScaledVector(fiberDir, pulseT);
      }
      if (waveT >= 0) {
        waveT += dt;
        paintCity(waveT * WAVE_SPEED);
        if (litCount >= bodies.length) waveT = -1;
      }
    },
  };
}
