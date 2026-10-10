import * as THREE from 'three';

// Rin: a primitive silhouette carrying the collision capsule (radius PLAYER_RADIUS, ~1.75 m tall).
// Long coat flare + a cyan visor so heading reads at a glance. Art may replace the meshes; keep the
// group's origin at the feet and +Z-forward = facing -Z at heading 0.
export const PLAYER_RADIUS = 0.35;

export function createPlayer(scene) {
  const group = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: 0x2b3448, roughness: 0.7, metalness: 0.2 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc9b6a8, roughness: 0.8 });
  const visor = new THREE.MeshBasicMaterial({ color: 0x56e4f2 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.75, 4, 12), coat);
  body.position.y = 1.0;
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.85, 12, 1, true), coat);
  skirt.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), skin);
  head.position.y = 1.62;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.06), visor);
  band.position.set(0, 1.64, -0.13);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.14), coat);
  pack.position.set(0, 1.15, 0.24);
  group.add(body, skirt, head, band, pack);
  scene.add(group);

  return { group, head };
}
