import { PLAYER_RADIUS } from '../scene/player.js';

// Third-person movement (vision §3.1, §10.8): camera-relative WASD, normalised diagonals, damped
// acceleration (no ice skating), sprint 1.6×, 2D circle-vs-AABB collision, and a walkable-area guard
// so the player can never leave the map even if a collider is missing.
export const WALK_SPEED = 3.1;
export const SPRINT_SPEED = WALK_SPEED * 1.6;
const ACCEL = 12; // 1/s — time constant of the velocity damping toward the wish velocity
const DECEL = 16;
const TURN_RATE = 12;

// First intersection of segment a→b with an enabled collider, as a fraction t in [0,1]; Infinity if none.
export function firstHit(colliders, ax, az, bx, bz, { includeLow = false, ignore } = {}) {
  const dx = bx - ax;
  const dz = bz - az;
  let best = Infinity;
  for (const c of colliders) {
    if (!c.enabled || (c.low && !includeLow) || (ignore && c.id === ignore)) continue;
    let t0 = 0;
    let t1 = 1;
    let ok = true;
    for (const [p, d, lo, hi] of [[ax, dx, c.minX, c.maxX], [az, dz, c.minZ, c.maxZ]]) {
      if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) { ok = false; break; } continue; }
      let u0 = (lo - p) / d;
      let u1 = (hi - p) / d;
      if (u0 > u1) [u0, u1] = [u1, u0];
      t0 = Math.max(t0, u0);
      t1 = Math.min(t1, u1);
      if (t0 > t1) { ok = false; break; }
    }
    if (ok && t0 < best) best = t0;
  }
  return best;
}

export function insideWalkable(walkable, x, z) {
  return walkable.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
}

function resolve(colliders, p, r) {
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const c of colliders) {
      if (!c.enabled) continue;
      const cx = Math.min(Math.max(p.x, c.minX), c.maxX);
      const cz = Math.min(Math.max(p.z, c.minZ), c.maxZ);
      const ox = p.x - cx;
      const oz = p.z - cz;
      const d2 = ox * ox + oz * oz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-12) {
        const d = Math.sqrt(d2);
        p.x = cx + (ox / d) * r;
        p.z = cz + (oz / d) * r;
      } else {
        // Centre inside the box: leave along the shallowest axis.
        const pen = [[p.x - c.minX + r, -1, 0], [c.maxX - p.x + r, 1, 0], [p.z - c.minZ + r, 0, -1], [c.maxZ - p.z + r, 0, 1]]
          .sort((a, b) => a[0] - b[0])[0];
        p.x += pen[1] * pen[0];
        p.z += pen[2] * pen[0];
      }
      moved = true;
    }
    if (!moved) break;
  }
}

export function createController({ group, colliders, walkable, spawn }) {
  const pos = { x: 0, z: 0 };
  const vel = { x: 0, z: 0 };
  let heading = 0;

  function reset() {
    pos.x = spawn.position.x;
    pos.z = spawn.position.z;
    vel.x = 0;
    vel.z = 0;
    heading = spawn.heading;
    sync();
  }
  function sync() {
    group.position.set(pos.x, 0, pos.z);
    group.rotation.y = heading;
  }

  // One fixed step. `move` = {x: right, y: forward} in [-1,1]; yaw = camera yaw (rad).
  function step(dt, move, sprint, yaw) {
    let mx = move.x;
    let my = move.y;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; } // no diagonal speed bonus
    // Camera basis on XZ: forward = (-sin yaw, -cos yaw), right = (cos yaw, -sin yaw).
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const wx = (Math.cos(yaw) * mx + fx * my) * (sprint ? SPRINT_SPEED : WALK_SPEED);
    const wz = (-Math.sin(yaw) * mx + fz * my) * (sprint ? SPRINT_SPEED : WALK_SPEED);
    const k = 1 - Math.exp(-(len > 0.01 ? ACCEL : DECEL) * dt);
    vel.x += (wx - vel.x) * k;
    vel.z += (wz - vel.z) * k;

    const prevX = pos.x;
    const prevZ = pos.z;
    pos.x += vel.x * dt;
    resolve(colliders, pos, PLAYER_RADIUS);
    pos.z += vel.z * dt;
    resolve(colliders, pos, PLAYER_RADIUS);
    if (!insideWalkable(walkable, pos.x, pos.z)) { pos.x = prevX; pos.z = prevZ; vel.x = 0; vel.z = 0; }
    // Velocity follows what actually happened, so sliding along a wall does not build speed into it.
    vel.x = (pos.x - prevX) / dt;
    vel.z = (pos.z - prevZ) / dt;

    const speed = Math.hypot(vel.x, vel.z);
    if (speed > 0.25 && len > 0.01) {
      const target = Math.atan2(-vel.x, -vel.z);
      let diff = target - heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      heading += diff * (1 - Math.exp(-TURN_RATE * dt));
    }
    sync();
  }

  function halt() { vel.x = 0; vel.z = 0; }

  return {
    pos, vel,
    get heading() { return heading; },
    step, reset, halt,
    get speed() { return Math.hypot(vel.x, vel.z); },
  };
}
