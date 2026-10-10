// Sector A — Rain Alley (vision §5.1, ~30 m × 12 m). Graybox: tall canyon walls, awnings, the booth.
export function buildAlley(kit) {
  const { mats, THREE } = kit;
  kit.floor(-6, 6, -26.2, 4, { name: 'alley' });

  // Canyon: tall facades make the alley read as a street slot, not a room.
  kit.wall(-7, -6, -27, 5, 14);
  kit.wall(6, 7, -27, 5, 14);
  kit.wall(-7, 7, 4, 5, 14);
  kit.wall(-7, -2.5, -27, -26, 14);
  kit.wall(2.5, 7, -27, -26, 14);
  kit.box({ x: 0, z: -26.5, w: 5, d: 1, h: 9, y: 4.6, mat: mats.wall, collide: false }); // lintel over door A

  kit.door({ id: 'door_alley', x: 0, z: -26.5, w: 5, d: 0.6, openAt: 'CLONE_UNDERSTOOD' });

  // Shopfront strips and awnings on both sides (non-colliding, overhead).
  for (let i = 0; i < 5; i++) {
    const z = -2 - i * 5.2;
    kit.box({ x: -5.9, z, w: 0.1, d: 3.2, h: 0.12, y: 2.9, mat: i % 2 ? mats.amber : mats.cyan, collide: false });
    kit.box({ x: 5.9, z: z - 2.4, w: 0.1, d: 3.2, h: 0.12, y: 2.9, mat: i % 2 ? mats.cyan : mats.amber, collide: false });
    kit.box({ x: -5.2, z, w: 1.6, d: 3.4, h: 0.15, y: 3.2, mat: mats.metal, collide: false });
  }
  // Crates and a dumpster: things to walk around.
  kit.box({ x: -5.2, z: -5, w: 1.4, d: 1.8, h: 1.1, mat: mats.metal });
  kit.box({ x: -5.0, z: -17, w: 1.8, d: 2.6, h: 1.4, mat: mats.wallDark });
  kit.box({ x: 5.3, z: -2, w: 1.2, d: 1.2, h: 0.9, mat: mats.metal });

  // The replication booth, recessed into the east wall, console facing -X.
  kit.box({ x: 5.1, z: -11.5, w: 1.8, d: 3, h: 3.2, mat: mats.wallDark, id: 'copy_booth' });
  kit.box({ x: 4.18, z: -11.5, w: 0.06, d: 1.2, h: 0.7, y: 1.0, mat: mats.cyan, collide: false });
  const boothLamp = kit.box({ x: 5.1, z: -11.5, w: 1.9, d: 3.1, h: 0.25, y: 3.25, mat: mats.coral, collide: false });
  kit.anchor('copy_booth', 3.9, 1.2, -11.5, {
    label: 'REPLICATION BOOTH',
    requiredQuest: ['FREE_ROAM_ALLEY', 'CLONE_INTRO', 'CLONE_BASIS_PASSED', 'CLONE_SUPERPOSITION_FAILED'],
    action: 'OPEN_CLONE_BOOTH',
  });
  // A sign pylon beside the booth. It is the "no prompt through a wall" case: within 2.5 m of the
  // console and facing it from the south-west, the pylon blocks line of sight.
  kit.box({ x: 2.75, z: -13.0, w: 0.3, d: 1.2, h: 3.2, mat: mats.metal, id: 'booth_pylon' });
  kit.box({ x: 2.58, z: -13.0, w: 0.04, d: 0.9, h: 1.6, y: 1.2, mat: mats.porcelain, collide: false });

  // Guide arrow at door A, shown once the door is open and until the relay is reached.
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 4), mats.cyan);
  arrow.rotation.x = -Math.PI / 2;
  arrow.position.set(0, 0.4, -24.5);
  arrow.visible = false;
  kit.scene.add(arrow);

  return {
    react({ reached }) {
      boothLamp.material = reached('CLONE_UNDERSTOOD') ? mats.dim : mats.coral;
      arrow.visible = reached('CLONE_UNDERSTOOD') && !reached('RELAY_INTRO');
    },
    update(dt, t) {
      if (arrow.visible) arrow.position.y = 0.45 + Math.sin(t * 3) * 0.12;
    },
  };
}
