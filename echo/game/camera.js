import { firstHit } from './controller.js';

// Over-the-shoulder follow camera (vision §3.1): mouse orbit, eye pivot ~1.55 m, damped follow, and
// pulled in (never pushed through) walls; clamped under connector/elevator ceilings. `setShot` hands the
// camera to a fixed cinematic pose (the final skyline shot, vision §5.2) and `setShot(null)` returns it.
const PIVOT_H = 1.55;
const DIST = 4.2;
const SHOULDER = 0.55;
const SENS = 0.0026;
const PITCH_MIN = -0.25;
const PITCH_MAX = 0.85;
const WALL_PAD = 0.3;
const LOOK_AHEAD = 1.5; // m along the camera's forward (-sin yaw, -cos yaw)

export function createFollowCamera({ camera, colliders, walkable }) {
  let yaw = 0;
  let pitch = 0.22;
  let frac = 1;
  const pivot = { x: 0, y: PIVOT_H, z: 0 };
  const look = { x: 0, y: PIVOT_H, z: 0 };
  let shot = null;

  function placeShot(dt) {
    const k = 1 - Math.exp(-1.1 * dt);
    const p = camera.position;
    p.set(p.x + (shot.position[0] - p.x) * k, p.y + (shot.position[1] - p.y) * k, p.z + (shot.position[2] - p.z) * k);
    look.x += (shot.target[0] - look.x) * k;
    look.y += (shot.target[1] - look.y) * k;
    look.z += (shot.target[2] - look.z) * k;
    camera.lookAt(look.x, look.y, look.z);
  }

  function place(target, dt) {
    if (shot) { placeShot(dt); return; }
    const k = dt === Infinity ? 1 : 1 - Math.exp(-14 * dt);
    pivot.x += (target.x - pivot.x) * k;
    pivot.z += (target.z - pivot.z) * k;

    const cp = Math.cos(pitch);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const vx = Math.sin(yaw) * cp * DIST + rx * SHOULDER;
    const vy = Math.sin(pitch) * DIST;
    const vz = Math.cos(yaw) * cp * DIST + rz * SHOULDER;

    const lenXZ = Math.hypot(vx, vz);
    const t = firstHit(colliders, pivot.x, pivot.z, pivot.x + vx, pivot.z + vz);
    let want = 1;
    if (t !== Infinity) want = Math.max(0.12, Math.min(1, (t * lenXZ - WALL_PAD) / lenXZ));
    // Pull in instantly so the camera never sits inside a wall; ease back out.
    frac = want < frac ? want : frac + (want - frac) * (dt === Infinity ? 1 : 1 - Math.exp(-4 * dt));

    const cx = pivot.x + vx * frac;
    const cz = pivot.z + vz * frac;
    let cy = PIVOT_H + vy * frac;
    for (const r of walkable) {
      if (cx >= r.minX && cx <= r.maxX && cz >= r.minZ && cz <= r.maxZ) cy = Math.min(cy, r.ceiling - 0.35);
    }
    camera.position.set(cx, Math.max(cy, 0.4), cz);
    // Look past Rin's shoulder, not at her back, so the device she walks up to stays in view.
    look.x = pivot.x + rx * SHOULDER * frac - Math.sin(yaw) * LOOK_AHEAD;
    look.y = PIVOT_H;
    look.z = pivot.z + rz * SHOULDER * frac - Math.cos(yaw) * LOOK_AHEAD;
    camera.lookAt(look.x, look.y, look.z);
  }

  return {
    get yaw() { return yaw; },
    get pitch() { return pitch; },
    get pulledIn() { return frac < 0.98; },
    orbit(dx, dy) {
      yaw -= dx * SENS;
      pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch + dy * SENS));
    },
    update(target, dt) { place(target, dt); },
    setShot(next) { shot = next; },
    reset(target, heading) {
      shot = null;
      yaw = heading;
      pitch = 0.22;
      frac = 1;
      pivot.x = target.x;
      pivot.z = target.z;
      place(target, Infinity);
    },
  };
}
