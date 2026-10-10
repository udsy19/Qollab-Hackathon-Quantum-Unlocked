import * as THREE from 'three';
import { DEFAULT_SETTINGS, QUALITY_LEVELS } from '../contracts.js';

// Procedural hero and storytelling props (vision §5.3, §5.4, §11.3). No asset files: every prop is
// primitives merged into one geometry per material, and every word in the world is drawn to a
// CanvasTexture at runtime.
//
// Every factory returns { object3D, refs, update(dt), setQuality(q), dispose() }.
// - Local frame: origin at the centre of the footprint at floor level, FRONT faces +Z. Gameplay
//   places the prop with position + rotation.y only (see the swap table in the art report).
// - refs: named parts and idempotent setters for the §9.3 world changes. Setters set a TARGET;
//   update(dt) eases toward it, so calling one twice changes nothing.
// - setQuality('low'|'med'|'high') only hides decoration (§12.2). Silhouettes, emissive state and
//   footprints are identical in every mode, so readability and game logic never depend on quality.
// - Materials and primitive geometries are shared module-wide; dispose() frees what the instance
//   owns (merged geometry, per-instance materials, canvas textures). disposeSharedProps() frees the rest.

// Vision §5.3 palette. Kept here rather than imported from scene/district.js because district.js
// will import this module (a cycle) and is not on main yet.
const COLOR = {
  graphite: 0x070b12, steel: 0x132035, cyan: 0x56e4f2, amber: 0xf3ae62, coral: 0xe96b68, porcelain: 0xeaf3f6,
  green: 0x6ff2a8, dim: 0x1b2433,
};

// ------------------------------------------------------------------ shared materials

let shared = null;
function mats() {
  if (shared) return shared;
  const std = (color, roughness, metalness, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  shared = {
    // Metalness stays low: with no environment map, metallic surfaces render black (measured in the
    // preview), and the lighting lane's fog + hemisphere light is all these surfaces get.
    darkGlass: std(0x16243a, 0.25, 0.3),
    steel: std(0x3a4c6a, 0.55, 0.3),
    mastSteel: std(0x6f819e, 0.5, 0.25),
    graphite: std(0x1a2230, 0.8, 0.15),
    ceramic: std(0xc6d3da, 0.62, 0.05),
    warmMetal: std(0x6a5038, 0.7, 0.25),     // classical: riveted service panels
    rubber: std(0x111111, 0.9, 0.0),
    glass: std(0x9fe9f4, 0.05, 0.1, { transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    cyan: new THREE.MeshBasicMaterial({ color: COLOR.cyan }),
    amber: new THREE.MeshBasicMaterial({ color: COLOR.amber }),
    coral: new THREE.MeshBasicMaterial({ color: COLOR.coral }),
    porcelain: new THREE.MeshBasicMaterial({ color: COLOR.porcelain }),
  };
  return shared;
}

export function disposeSharedProps() {
  if (shared) for (const m of Object.values(shared)) m.dispose();
  for (const t of Object.values(stripes)) t.dispose();
  shared = null;
  stripes = {};
}

// ------------------------------------------------------------------ merge builder

// Collects transformed primitives and bakes them into ONE BufferGeometry, so a prop costs one draw
// call per material instead of one per part. (BufferGeometryUtils lives in three/addons, which
// Qollab does not resolve by bare name; this is the subset we need.)
function parts() {
  const list = [];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1);
  const api = {
    add(geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
      m4.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), one);
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      g.applyMatrix4(m4);
      list.push(g);
      geo.dispose();
      return api;
    },
    box(w, h, d, x, y, z, rx, ry, rz) { return api.add(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz); },
    cyl(rt, rb, h, seg, x, y, z, rx, ry, rz) { return api.add(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, rx, ry, rz); },
    torus(r, tube, seg, x, y, z, rx = Math.PI / 2, ry = 0, rz = 0, arc = Math.PI * 2) {
      return api.add(new THREE.TorusGeometry(r, tube, 6, seg, arc), x, y, z, rx, ry, rz);
    },
    // A cylinder strut between two points.
    strut(a, b, r, seg = 6) {
      const dir = new THREE.Vector3().subVectors(b, a);
      const g = new THREE.CylinderGeometry(r, r, dir.length(), seg);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      return api.add(g, mid.x, mid.y, mid.z);
    },
    get empty() { return list.length === 0; },
    build() {
      let n = 0;
      for (const g of list) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      let o = 0;
      for (const g of list) {
        pos.set(g.attributes.position.array, o * 3);
        nor.set(g.attributes.normal.array, o * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
        o += g.attributes.position.count;
        g.dispose();
      }
      list.length = 0;
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      out.computeBoundingSphere();
      return out;
    },
  };
  return api;
}

// ------------------------------------------------------------------ canvas text

// Draws lines of text to a canvas. Text in the 3D world is sparse and large (§5.3), so one texture
// per sign at modest resolution is enough; the UI overlay carries anything read up close.
function drawText(canvas, lines, { bg = '#05080e', fg = '#eaf3f6', border = null, scan = false } = {}) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = Math.max(4, h * 0.03);
    ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);
  }
  const font = (s) => `700 ${s}px "Helvetica Neue", Arial, sans-serif`;
  const total = lines.reduce((a, l) => a + (l.size ?? 1), 0);
  let y = h * 0.1;
  for (const l of lines) {
    const band = (h * 0.8) * (l.size ?? 1) / total;
    let s = Math.floor(band * 0.72);
    ctx.font = font(s);
    // Shrink to fit the width so long slogans never clip.
    while (ctx.measureText(l.text).width > w * 0.88 && s > 8) ctx.font = font(s -= 2);
    ctx.fillStyle = l.color ?? fg;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(l.text, w / 2, y + band / 2);
    y += band;
  }
  if (scan) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < h; i += 4) ctx.fillRect(0, i, w, 1);
    ctx.globalCompositeOperation = 'source-over';
  }
}

function canvasTexture(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas, tex };
}

// A repeating bright band, used as a scrolling "pulse" on conduits and strips. 'u' runs along uv.x
// (TubeGeometry length), 'v' along uv.y (a cylinder's or box face's height). Shared source images;
// callers clone() to get their own offset/repeat.
let stripes = {};
function stripeTexture(axis) {
  if (stripes[axis]) return stripes[axis];
  const along = axis === 'u';
  const { canvas, tex } = canvasTexture(along ? 64 : 4, along ? 4 : 64);
  const ctx = canvas.getContext('2d');
  const g = along ? ctx.createLinearGradient(0, 0, 64, 0) : ctx.createLinearGradient(0, 64, 0, 0);
  g.addColorStop(0, '#404040');
  g.addColorStop(0.7, '#5c5c5c');
  g.addColorStop(0.86, '#ffffff');
  g.addColorStop(1, '#404040');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return (stripes[axis] = tex);
}

// ------------------------------------------------------------------ prop scaffold

function checkQuality(q) {
  if (!QUALITY_LEVELS.includes(q)) throw new RangeError(`quality must be one of ${QUALITY_LEVELS.join('|')}, got ${q}`);
  return q;
}

// Groups by quality tier: `detail` shows on med+high, `fine` on high only.
function scaffold(name) {
  const object3D = new THREE.Group();
  object3D.name = name;
  const detail = new THREE.Group();
  const fine = new THREE.Group();
  detail.name = `${name}:detail`;
  fine.name = `${name}:fine`;
  object3D.add(detail, fine);
  const owned = [];
  const own = (x) => { owned.push(x); return x; };
  const mesh = (geo, mat, parent = object3D) => {
    const m = new THREE.Mesh(own(geo), mat);
    parent.add(m);
    return m;
  };
  // Bake a parts() builder into one static mesh.
  const bake = (p, mat, parent = object3D) => {
    const m = mesh(p.build(), mat, parent);
    m.matrixAutoUpdate = false;
    m.updateMatrix();
    return m;
  };
  let quality = DEFAULT_SETTINGS.quality;
  const setQuality = (q) => {
    quality = checkQuality(q);
    detail.visible = q !== 'low';
    fine.visible = q === 'high';
  };
  setQuality(quality);
  const dispose = () => {
    object3D.removeFromParent();
    for (const x of owned) x.dispose();
    owned.length = 0;
  };
  return { object3D, detail, fine, own, mesh, bake, setQuality, dispose, get quality() { return quality; } };
}

// Ease `cur` toward `target` with time constant `tau` seconds; frame-rate independent.
const approach = (cur, target, dt, tau) => cur + (target - cur) * (1 - Math.exp(-dt / tau));
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
const ownStripe = (s, axis, repeatX, repeatY) => {
  const t = s.own(stripeTexture(axis).clone());
  t.repeat.set(repeatX, repeatY);
  return t;
};

// ------------------------------------------------------------------ booth

// Palisade duplication booth (vision §4.2 "glass door, flickering signage, two capsule slots";
// §11.3 #6). Footprint 3.0 (x) × 1.8 (z) × 3.2 (y): gameplay's `copy_booth` box (w 1.8, d 3) once
// rotated to face −X. Story without text: two glass pods, one holding a steady cyan sample, the other
// a coral ghost that never resolves; an ivory PALISADE header; a coral roof indicator that fades at
// CLONE_UNDERSTOOD; Rin's own initials scratched into the side panel from her technician years (§2.2).
export function createBooth() {
  const s = scaffold('booth');
  const M = mats();

  const shell = parts()
    .box(3.0, 0.16, 1.8, 0, 0.08, 0)              // base
    .box(3.0, 3.0, 0.14, 0, 1.6, -0.83)           // back
    .box(0.14, 3.0, 1.8, -1.43, 1.6, 0)           // sides
    .box(0.14, 3.0, 1.8, 1.43, 1.6, 0)
    .box(3.1, 0.22, 1.9, 0, 3.09, 0);             // roof
  s.bake(shell, M.darkGlass);
  const trim = parts()
    .box(3.04, 0.06, 0.06, 0, 0.18, 0.88)
    .box(0.06, 2.9, 0.06, -1.47, 1.65, 0.88)
    .box(0.06, 2.9, 0.06, 1.47, 1.65, 0.88)
    .box(0.9, 0.08, 0.5, 0, 0.9, 0.55)            // console shelf
    .box(0.12, 0.9, 0.12, 0, 0.45, 0.55);
  s.bake(trim, M.steel);

  // Pods: glass cylinders with ceramic caps (quantum language = glass + ceramic).
  const podX = [-0.85, 0.85];
  const caps = parts();
  const glass = parts();
  for (const x of podX) {
    caps.cyl(0.5, 0.52, 0.2, 24, x, 0.26, 0.25).cyl(0.52, 0.5, 0.2, 24, x, 2.3, 0.25);
    glass.cyl(0.44, 0.44, 1.9, 24, x, 1.28, 0.25);
  }
  s.bake(caps, M.ceramic);
  s.bake(glass, M.glass);
  const podRings = parts();
  for (const x of podX) for (const y of [0.7, 1.3, 1.9]) podRings.torus(0.445, 0.012, 32, x, y, 0.25);
  s.bake(podRings, M.cyan, s.fine);

  // Source sample (cyan, steady) and the copy that never forms (coral, flickering wireframe).
  const sourceMat = s.own(basic(COLOR.cyan));
  const source = s.mesh(new THREE.OctahedronGeometry(0.2, 0), sourceMat);
  source.position.set(-0.85, 1.35, 0.25);
  const ghostMat = s.own(basic(COLOR.coral, { wireframe: true, transparent: true, opacity: 0.6 }));
  const ghost = s.mesh(new THREE.OctahedronGeometry(0.2, 0), ghostMat);
  ghost.position.set(0.85, 1.35, 0.25);

  // Console screen between the pods (gameplay's cyan strip sits here, y 1.0–1.7).
  const screenMat = s.own(basic(COLOR.cyan, { transparent: true, opacity: 0.85 }));
  const screen = s.mesh(new THREE.PlaneGeometry(0.62, 0.42), screenMat);
  screen.position.set(0, 1.25, 0.6);
  screen.rotation.x = -0.35;

  // Header: ivory PALISADE on dark glass (corporation language).
  const head = canvasTexture(1024, 192);
  drawText(head.canvas, [{ text: 'PALISADE', size: 1.5 }, { text: 'DUPLICATION SERVICES', size: 0.7, color: '#9fb2bd' }]);
  s.own(head.tex);
  const header = s.mesh(new THREE.PlaneGeometry(2.7, 0.5), s.own(basic(0xffffff, { map: head.tex })));
  header.position.set(0, 2.72, 0.91);

  // Indicator: a coral strip along the roof front and a dome. §9.3 booth_indicator_red_fades.
  const indicatorMat = s.own(basic(COLOR.coral));
  s.bake(parts().box(3.12, 0.1, 0.08, 0, 3.24, 0.92)
    .add(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 3.2, 0), indicatorMat);

  // Scratched initials on the +X side panel, at eye height, near the front edge.
  const scratch = canvasTexture(256, 160);
  {
    const c = scratch.canvas.getContext('2d');
    c.fillStyle = '#0b1522'; c.fillRect(0, 0, 256, 160);
    c.strokeStyle = 'rgba(214,226,232,0.85)'; c.lineWidth = 3; c.lineCap = 'round';
    c.fillStyle = 'rgba(214,226,232,0.8)';
    c.font = 'italic 600 64px "Courier New", monospace';
    c.fillText('R.V.', 34, 78);
    c.font = 'italic 500 26px "Courier New", monospace';
    c.fillText('TECH 7 · 2186', 40, 122);
    c.beginPath();
    for (let i = 0; i < 5; i++) { c.moveTo(170 + i * 12, 40); c.lineTo(166 + i * 12, 70); }
    c.moveTo(160, 62); c.lineTo(230, 46);
    c.stroke();
    scratch.tex.needsUpdate = true;
  }
  s.own(scratch.tex);
  const initials = s.mesh(new THREE.PlaneGeometry(0.56, 0.35), s.own(basic(0xffffff, { map: scratch.tex })), s.detail);
  initials.position.set(1.505, 1.55, 0.45);
  initials.rotation.y = Math.PI / 2;

  let indicatorTarget = 1, indicator = 1, t = 0;
  const coral = new THREE.Color(COLOR.coral), off = new THREE.Color(0x2a1416);
  const refs = {
    indicator: indicatorMat, source, sourceMaterial: sourceMat, ghost, ghostMaterial: ghostMat, screen, screenMaterial: screenMat, header,
    // 1 = coral warning lit, 0 = faded. booth_indicator_red_fades → setIndicator(0).
    setIndicator(v) { indicatorTarget = THREE.MathUtils.clamp(v, 0, 1); },
    get indicatorLevel() { return indicator; },
  };
  return {
    object3D: s.object3D, refs,
    update(dt) {
      t += dt;
      indicator = approach(indicator, indicatorTarget, dt, 0.6);
      indicatorMat.color.copy(off).lerp(coral, indicator);
      source.rotation.y += dt * 0.8;
      source.position.y = 1.35 + Math.sin(t * 1.6) * 0.04;
      ghost.rotation.y -= dt * 1.3;
      // The copy flickers but never steadies: it is not a copy (§7.1). Once understood, it goes quiet.
      ghostMat.opacity = indicator > 0.05 ? 0.25 + 0.35 * (Math.sin(t * 23) * Math.sin(t * 3.1) > 0.2 ? 1 : 0) : 0.08;
    },
    setQuality: s.setQuality,
    dispose: s.dispose,
  };
}

// ------------------------------------------------------------------ consoles

// Three console kinds (§5.4 "3 puzzle consoles"), front +Z, sizes [w, h, d]:
//  'quantum'   — teleport_terminal: ceramic body, glass top, cyan screen, the story-token capsule in a
//                glass cradle and the vault status lamp.
//  'classical' — classical_socket: riveted warm panel, patch sockets, drooping amber cables.
//  'relay'     — the relay core's lectern (used by createRelayCore).
const CONSOLE_SIZE = { quantum: [1.4, 1.2, 0.8], classical: [1.2, 1.1, 0.8], relay: [0.9, 1.1, 0.6] };

export function createConsole(kind = 'quantum') {
  if (!CONSOLE_SIZE[kind]) throw new RangeError(`console kind must be one of ${Object.keys(CONSOLE_SIZE).join('|')}, got ${kind}`);
  const [w, h, d] = CONSOLE_SIZE[kind];
  const s = scaffold(`console:${kind}`);
  const M = mats();
  const classical = kind === 'classical';
  const body = parts().box(w, h - 0.2, d, 0, (h - 0.2) / 2, 0).box(w * 1.04, 0.08, d * 1.04, 0, 0.04, 0)
    .box(w, 0.08, d * 0.9, 0, h - 0.12, 0.02, -0.3);   // slanted top deck
  s.bake(body, classical ? M.warmMetal : kind === 'relay' ? M.steel : M.ceramic);

  const screenMat = s.own(basic(classical ? COLOR.amber : COLOR.cyan, { transparent: true, opacity: 0.9 }));
  const screen = s.mesh(new THREE.PlaneGeometry(w * 0.72, d * 0.5), screenMat);
  screen.position.set(0, h - 0.07, 0.05);
  screen.rotation.x = -Math.PI / 2 - 0.3;

  const refs = { screen, screenMaterial: screenMat };
  const animators = [];

  if (classical) {
    // Rivets, patch sockets and drooping amber cables: the old classical world (§5.3).
    const rivets = parts();
    for (const x of [-w / 2 + 0.06, w / 2 - 0.06]) for (let y = 0.15; y < h - 0.2; y += 0.18) rivets.cyl(0.018, 0.018, 0.02, 6, x, y, d / 2 + 0.01, Math.PI / 2);
    s.bake(rivets, M.steel, s.detail);
    const sockets = parts();
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) sockets.cyl(0.045, 0.045, 0.03, 10, -0.36 + i * 0.24, 0.42 + j * 0.16, d / 2 + 0.01, Math.PI / 2);
    s.bake(sockets, M.rubber);
    const cables = parts();
    for (let i = 0; i < 3; i++) cables.torus(0.12 + i * 0.02, 0.018, 16, -0.24 + i * 0.24, 0.3 - i * 0.02, d / 2 + 0.03, 0, 0, Math.PI, Math.PI);
    s.bake(cables, M.amber);
    // Socket lamp: amber = broken, cyan = repaired (gameplay's graybox convention).
    const lampMat = s.own(basic(COLOR.amber));
    const lamp = s.mesh(new THREE.BoxGeometry(0.7, 0.1, 0.03), lampMat);
    lamp.position.set(0, 0.78, d / 2 + 0.02);
    let target = 0, v = 0, t = 0;
    const broken = new THREE.Color(COLOR.amber), fixed = new THREE.Color(COLOR.cyan);
    Object.assign(refs, {
      socketLamp: lampMat,
      // LINK_REPAIRED → setRepaired(true).
      setRepaired(on) { target = on ? 1 : 0; },
      get repaired() { return target === 1; },
    });
    animators.push((dt) => {
      t += dt;
      v = approach(v, target, dt, 0.4);
      lampMat.color.copy(broken).lerp(fixed, v);
      // A broken link stutters; a repaired one is steady.
      screenMat.opacity = target ? 0.9 : (Math.sin(t * 7) > 0.6 ? 0.25 : 0.8);
    });
  } else {
    s.bake(parts().box(w * 0.9, 0.025, 0.02, 0, 0.3, d / 2 + 0.01).box(w * 0.9, 0.025, 0.02, 0, 0.5, d / 2 + 0.01), M.cyan, s.detail);
  }

  if (kind === 'quantum') {
    // Capsule cradle on the +X side (gameplay's capsule sits at world x−0.4 once rotated to face −Z).
    s.bake(parts().cyl(0.17, 0.2, 0.1, 20, 0.4, h + 0.05, -0.1).cyl(0.17, 0.17, 0.06, 20, 0.4, h + 0.55, -0.1), M.steel);
    s.bake(parts().cyl(0.15, 0.15, 0.5, 20, 0.4, h + 0.3, -0.1), M.glass);
    const capsuleMat = s.own(basic(COLOR.cyan));
    const capsule = s.mesh(new THREE.CapsuleGeometry(0.07, 0.2, 4, 12), capsuleMat);
    capsule.position.set(0.4, h + 0.28, -0.1);
    const vaultMat = s.own(basic(COLOR.coral));
    const vaultLamp = s.mesh(new THREE.SphereGeometry(0.09, 12, 8), vaultMat);
    vaultLamp.position.set(-0.45, h + 0.05, -0.15);
    let capT = 1, cap = 1, vT = 0, vv = 0, t = 0;
    const cyan = new THREE.Color(COLOR.cyan), spent = new THREE.Color(0x1d2a33);
    const coral = new THREE.Color(COLOR.coral), green = new THREE.Color(COLOR.green);
    Object.assign(refs, {
      capsule, capsuleMaterial: capsuleMat, vaultLamp, vaultMaterial: vaultMat,
      // capsule_source_indicator_off → setCapsuleActive(false). vault_status_green → setVaultGreen(true).
      setCapsuleActive(on) { capT = on ? 1 : 0; },
      setVaultGreen(on) { vT = on ? 1 : 0; },
    });
    animators.push((dt) => {
      t += dt;
      cap = approach(cap, capT, dt, 0.5);
      vv = approach(vv, vT, dt, 0.5);
      capsuleMat.color.copy(spent).lerp(cyan, cap * (0.85 + 0.15 * Math.sin(t * 2.4)));
      vaultMat.color.copy(coral).lerp(green, vv);
    });
  }

  return {
    object3D: s.object3D, refs,
    update(dt) { for (const a of animators) a(dt); },
    setQuality: s.setQuality,
    dispose: s.dispose,
  };
}

// ------------------------------------------------------------------ relay core

// Relay chamber landmark (§5.1, §5.4): circular plinth with concentric linework, a ceramic-lattice
// cage around a glass reactor, three gyroscopic rings and three cooling columns. Origin = core centre
// (gameplay: (0, 0, −50)); `columns` are [x, z] offsets from it, defaulting to gameplay's three.
// The lectern sits inside the core collider at +Z, in front of gameplay's relay_core anchor (z +1.8).
const RELAY_COLUMNS = [[-6, 5], [-6, -5], [5.5, -6]];

export function createRelayCore({ columns = RELAY_COLUMNS } = {}) {
  const s = scaffold('relay_core');
  const M = mats();

  s.bake(parts().cyl(3.2, 3.4, 0.35, 48, 0, 0.175, 0).cyl(1.45, 1.6, 0.4, 32, 0, 0.55, 0).cyl(1.35, 1.45, 0.25, 32, 0, 2.75, 0), M.steel);

  // Ceramic lattice cage: 10 ribs and 3 hoops around the glass core.
  const lattice = parts();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    lattice.box(0.1, 2.1, 0.14, Math.cos(a) * 1.22, 1.75, Math.sin(a) * 1.22, 0, -a, 0);
  }
  for (const y of [0.95, 1.6, 2.25]) lattice.torus(1.24, 0.045, 40, 0, y, 0);
  s.bake(lattice, M.ceramic);

  // Concentric linework on the plinth top (quantum language). Lights with the core.
  const lineMat = s.own(basic(COLOR.dim));
  const lines = parts();
  for (const r of [2.0, 2.5, 3.0]) lines.add(new THREE.RingGeometry(r - 0.025, r + 0.025, 64), 0, 0.356, 0, -Math.PI / 2);
  s.bake(lines, lineMat, s.detail);

  const coreMat = s.own(basic(0x173a44));
  const core = s.mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.0, 24, 1, true), coreMat);
  core.position.y = 1.65;
  s.bake(parts().cyl(0.95, 0.95, 2.1, 24, 0, 1.65, 0), M.glass);

  // Gyroscopic rings (gameplay graybox: r 1.7 / 2.15 / 2.6 at y 2.9 / 3.4 / 3.9).
  const ringMat = s.own(basic(0x2b5d66));
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = s.mesh(new THREE.TorusGeometry(1.7 + i * 0.45, 0.06, 8, 64), ringMat);
    ring.position.y = 2.9 + i * 0.5;
    ring.rotation.x = Math.PI / 2;
    rings.push(ring);
  }

  // Cooling columns (gameplay: r 0.7–0.8, h 9): steel body with ceramic bands, and a cyan pulse strip
  // facing the core. Two instanced draws for all three.
  const colBody = parts().cyl(0.7, 0.8, 9, 16, 0, 4.5, 0);
  for (const y of [1.2, 4.5, 7.8]) colBody.cyl(0.79, 0.79, 0.3, 16, 0, y, 0);
  const colMesh = new THREE.InstancedMesh(s.own(colBody.build()), M.steel, columns.length);
  const stripMat = s.own(basic(COLOR.dim, { map: ownStripe(s, 'v', 1, 4) }));
  const colStripMesh = new THREE.InstancedMesh(s.own(parts().box(0.08, 8, 0.04, 0, 4.6, 0.77).build()), stripMat, columns.length);
  const m4 = new THREE.Matrix4();
  columns.forEach(([x, z], i) => {
    m4.makeRotationY(Math.atan2(-x, -z)).setPosition(x, 0, z);
    colMesh.setMatrixAt(i, m4);
    colStripMesh.setMatrixAt(i, m4);
  });
  s.object3D.add(colMesh, colStripMesh);

  const lectern = createConsole('relay');
  lectern.object3D.position.set(0, 0.35, 1.35);
  s.object3D.add(lectern.object3D);

  let target = 0, e = 0, t = 0;
  const idleRing = new THREE.Color(0x2b5d66), litRing = new THREE.Color(COLOR.cyan);
  const idleCore = new THREE.Color(0x173a44), litCore = new THREE.Color(0x9ff3fb);
  const dimC = new THREE.Color(COLOR.dim), cyanC = new THREE.Color(COLOR.cyan);
  const refs = {
    rings, ringMaterial: ringMat, core, coreMaterial: coreMat, linework: lineMat, columnStrips: stripMat, lectern,
    // cyan_conduit_illuminates → setEnergized(true): the core wakes with the conduit.
    setEnergized(on) { target = on ? 1 : 0; },
    get energy() { return e; },
  };
  return {
    object3D: s.object3D, refs,
    update(dt) {
      t += dt;
      e = approach(e, target, dt, 0.8);
      const spin = 0.3 + e * 1.3;
      rings.forEach((r, i) => {
        r.rotation.z += dt * spin * (i % 2 ? -1 : 1);
        r.rotation.x = Math.PI / 2 + Math.sin(t * 0.4 + i) * 0.12 * (0.3 + e);
      });
      ringMat.color.copy(idleRing).lerp(litRing, e);
      coreMat.color.copy(idleCore).lerp(litCore, e * (0.85 + 0.15 * Math.sin(t * 5)));
      lineMat.color.copy(dimC).lerp(cyanC, e);
      stripMat.color.copy(dimC).lerp(cyanC, 0.25 + 0.75 * e);
      stripMat.map.offset.y -= dt * (0.2 + e * 0.8);
      lectern.update(dt);
    },
    setQuality(q) { s.setQuality(q); lectern.setQuality(q); },
    dispose() { lectern.dispose(); s.dispose(); },
  };
}

// ------------------------------------------------------------------ transmission mast

// Rooftop landmark (§5.1, §5.4): a 22 m tapering four-leg lattice mast on gameplay's 1.2 × 1.2 base,
// with service decks, a dish, an amber classical cable riser, a cyan crown and a coral aviation beacon.
// The amber riser carries a travelling light once the classical link is repaired.
export function createMast({ height = 22 } = {}) {
  const s = scaffold('mast');
  const M = mats();
  s.bake(parts().box(1.2, 1.0, 1.2, 0, 0.5, 0).box(1.3, 0.08, 1.3, 0, 1.0, 0), M.warmMetal);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const halfAt = (y) => THREE.MathUtils.lerp(0.52, 0.14, (y - 1) / (height - 1));
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  const legs = parts();
  for (const [cx, cz] of corners) legs.strut(V(cx * 0.52, 1, cz * 0.52), V(cx * 0.14, height, cz * 0.14), 0.06);
  legs.cyl(0.5, 0.5, 0.08, 24, 0, 8, 0).cyl(0.36, 0.36, 0.08, 24, 0, 15, 0); // service decks
  s.bake(legs, M.mastSteel);

  // X-bracing on each face every 2.5 m: decoration, dropped on low.
  const brace = parts();
  for (let y = 1; y < height - 2.5; y += 2.5) {
    const a = halfAt(y), b = halfAt(y + 2.5);
    for (let k = 0; k < 4; k++) {
      const [x1, z1] = corners[k], [x2, z2] = corners[(k + 1) % 4];
      brace.strut(V(x1 * a, y, z1 * a), V(x2 * b, y + 2.5, z2 * b), 0.02, 4);
      brace.strut(V(x2 * a, y, z2 * a), V(x1 * b, y + 2.5, z1 * b), 0.02, 4);
    }
  }
  s.bake(brace, M.mastSteel, s.detail);
  // Deck rails glow faint cyan and the legs carry porcelain marker lights: against a night sky the
  // lattice alone is invisible past ~10 m (measured), so the silhouette is drawn in points of light.
  s.bake(parts().torus(0.8, 0.035, 24, 0, 8.6, 0).torus(0.6, 0.035, 24, 0, 15.6, 0), M.cyan);
  const markers = parts();
  for (let y = 3; y < height - 1; y += 3.5) for (const [cx, cz] of corners) markers.add(new THREE.SphereGeometry(0.07, 6, 4), cx * (halfAt(y) + 0.04), y, cz * (halfAt(y) + 0.04));
  s.bake(markers, M.porcelain);
  const dish = parts().add(new THREE.SphereGeometry(0.9, 20, 8, 0, Math.PI * 2, 0, 0.7), 0.75, 17, 0, 0, 0, -Math.PI / 2 - 0.25)
    .cyl(0.05, 0.05, 0.7, 6, 0.4, 17, 0, 0, 0, Math.PI / 2);
  s.bake(dish, M.ceramic);

  // Amber classical riser up the outside of one leg; a stripe travels up it when the link is live.
  const riserMat = s.own(basic(COLOR.dim, { map: ownStripe(s, 'v', 1, 7) }));
  s.bake(parts().strut(V(0.6, 1.0, 0.6), V(0.22, height - 2, 0.22), 0.07), riserMat);

  // Cyan quantum crown at the top.
  const crownMat = s.own(basic(COLOR.cyan));
  s.bake(parts().torus(0.3, 0.035, 20, 0, height - 0.6, 0).torus(0.26, 0.035, 20, 0, height - 1.3, 0), crownMat);

  const beaconMat = s.own(basic(COLOR.coral));
  const beacon = s.mesh(new THREE.SphereGeometry(0.26, 16, 10), beaconMat);
  beacon.position.y = height + 0.25;

  let linkT = 0, link = 0, t = 0;
  const dimC = new THREE.Color(COLOR.dim), amberC = new THREE.Color(COLOR.amber);
  const coralC = new THREE.Color(COLOR.coral), darkC = new THREE.Color(0x3a1a1a);
  const refs = {
    beacon, beaconMaterial: beaconMat, riserMaterial: riserMat, crownMaterial: crownMat,
    // amber_light_travels_to_skyline_node → setLinkActive(true).
    setLinkActive(on) { linkT = on ? 1 : 0; },
  };
  return {
    object3D: s.object3D, refs,
    update(dt) {
      t += dt;
      link = approach(link, linkT, dt, 0.6);
      riserMat.color.copy(dimC).lerp(amberC, 0.15 + 0.85 * link);
      riserMat.map.offset.y -= dt * 0.9 * link;
      // Aviation beacon: slow blink, always (a landmark at night).
      beaconMat.color.copy(darkC).lerp(coralC, Math.sin(t * 2.2) > -0.2 ? 1 : 0.15);
    },
    setQuality: s.setQuality,
    dispose: s.dispose,
  };
}

// ------------------------------------------------------------------ conduit

// Cyan (quantum) or amber (classical) cable along `points` (Vector3s or [x, y, z], in the parent's
// space), §11.3 #7. A band scrolls along it when lit, so the flow direction reads (first → last point).
export function createConduit(points, kind = 'cyan', { radius = 0.06 } = {}) {
  if (kind !== 'cyan' && kind !== 'amber') throw new RangeError(`conduit kind must be cyan|amber, got ${kind}`);
  if (!Array.isArray(points) || points.length < 2) throw new RangeError('conduit needs at least two points');
  const s = scaffold(`conduit:${kind}`);
  const pts = points.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(...p)));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const length = curve.getLength();
  const tex = ownStripe(s, 'u', Math.max(1, Math.round(length / 1.5)), 1);
  const mat = s.own(basic(COLOR.dim, { map: tex }));
  // Segment count scales with length so long runs stay smooth; low quality halves it.
  const build = (q) => new THREE.TubeGeometry(curve, Math.max(8, Math.ceil(length * (q === 'low' ? 2 : 4))), radius, q === 'low' ? 5 : 8, false);
  let geo = build(s.quality);
  const tube = new THREE.Mesh(geo, mat);
  s.object3D.add(tube);
  // Collars at each control point (ceramic on quantum, warm metal on classical).
  const clamps = parts();
  for (const p of pts) clamps.cyl(radius * 1.8, radius * 1.8, radius * 3, 10, p.x, p.y, p.z);
  s.bake(clamps, kind === 'cyan' ? mats().ceramic : mats().warmMetal, s.detail);

  let target = 0, v = 0;
  const dimC = new THREE.Color(COLOR.dim), litC = new THREE.Color(kind === 'cyan' ? COLOR.cyan : COLOR.amber);
  const refs = {
    material: mat, curve, length,
    // cyan_conduit_illuminates → setLit(true) on the cyan run; amber_light_travels_to_skyline_node on the amber run.
    setLit(on) { target = on ? 1 : 0; },
    get lit() { return target === 1; },
  };
  return {
    object3D: s.object3D, refs,
    update(dt) {
      v = approach(v, target, dt, 0.5);
      mat.color.copy(dimC).lerp(litC, 0.12 + 0.88 * v);
      tex.offset.x -= dt * 0.6 * v;
    },
    setQuality(q) {
      const wasLow = s.quality === 'low';
      s.setQuality(q);
      if (wasLow !== (q === 'low')) { geo.dispose(); geo = build(q); tube.geometry = geo; }
    },
    dispose() { geo.dispose(); s.dispose(); },
  };
}

// ------------------------------------------------------------------ relay schematic

// The amber classical schematic on the relay's north wall (§9.3 amber_schematic_visible, §11): the
// teleportation circuit drawn as an old service display, so it reads as a lit screen, not a sticker.
// Physics as §7.4 states it: the source and Bell half A are measured (m0 = source readout, m1 = Bell
// half A); only TWO CLASSICAL BITS (double lines) reach Bell half B, which applies X if m1 = 1, then Z
// if m0 = 1. The source wire ends at its meter: it is consumed. 2:1, for gameplay's 6 m × 3 m panel.
export function createSchematicTexture() {
  const { canvas, tex } = canvasTexture(1024, 512);
  const ctx = canvas.getContext('2d');
  const hot = '#ffd9a3', amber = '#f3ae62', faint = 'rgba(243,174,98,0.16)';
  ctx.fillStyle = '#1e1006';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = faint;
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1024; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
  for (let y = 0; y <= 512; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); }
  ctx.strokeStyle = amber;
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 1004, 492);
  const font = (s) => `700 ${s}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = hot;
  ctx.textBaseline = 'middle';
  ctx.font = font(34);
  ctx.textAlign = 'center';
  ctx.fillText('CLASSICAL LINK  ·  2 BITS REQUIRED', 512, 58);
  const W = [170, 280, 390]; // source, Bell A, Bell B
  ctx.font = font(26);
  ctx.textAlign = 'left';
  ['SOURCE', 'BELL A', 'BELL B'].forEach((t, i) => ctx.fillText(t, 34, W[i]));
  const line = (x0, y0, x1, y1, w = 5, c = hot) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
  const dbl = (x0, y0, x1, y1) => {
    const horiz = y0 === y1;
    line(x0 - (horiz ? 0 : 5), y0 - (horiz ? 5 : 0), x1 - (horiz ? 0 : 5), y1 - (horiz ? 5 : 0), 3, amber);
    line(x0 + (horiz ? 0 : 5), y0 + (horiz ? 5 : 0), x1 + (horiz ? 0 : 5), y1 + (horiz ? 5 : 0), 3, amber);
  };
  const box = (x, y, label) => {
    ctx.fillStyle = '#1e1006'; ctx.fillRect(x - 34, y - 34, 68, 68);
    ctx.strokeStyle = hot; ctx.lineWidth = 5; ctx.strokeRect(x - 34, y - 34, 68, 68);
    ctx.fillStyle = hot; ctx.font = font(38); ctx.textAlign = 'center'; ctx.fillText(label, x, y + 2);
  };
  const meter = (x, y) => {
    box(x, y, '');
    ctx.strokeStyle = hot; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y + 14, 22, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    line(x, y + 14, x + 16, y - 16, 4);
  };
  line(180, W[0], 560, W[0]);          // source: ends at its meter (consumed)
  line(180, W[1], 560, W[1]);          // Bell A: ends at its meter
  line(180, W[2], 990, W[2]);          // Bell B: carries the state on
  line(230, W[1], 230, W[2], 4, amber); // the shared pair
  ctx.fillStyle = amber; ctx.font = font(24); ctx.textAlign = 'center'; ctx.fillText('PAIR', 230, (W[1] + W[2]) / 2 + 2);
  ctx.fillStyle = hot;
  ctx.beginPath(); ctx.arc(330, W[0], 11, 0, Math.PI * 2); ctx.fill(); // CNOT control
  line(330, W[0], 330, W[1] + 20);
  ctx.strokeStyle = hot; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(330, W[1], 20, 0, Math.PI * 2); ctx.stroke();
  box(430, W[0], 'H');
  meter(560, W[0]);
  meter(560, W[1]);
  dbl(594, W[1], 760, W[1]); dbl(760, W[1], 760, W[2] - 34); // m1 → X
  dbl(594, W[0], 880, W[0]); dbl(880, W[0], 880, W[2] - 34); // m0 → Z
  ctx.fillStyle = amber; ctx.font = font(26);
  ctx.fillText('m1', 680, W[1] - 26); ctx.fillText('m0', 740, W[0] - 26);
  box(760, W[2], 'X');
  box(880, W[2], 'Z');
  ctx.fillStyle = hot; ctx.font = font(30); ctx.textAlign = 'right';
  ctx.fillText('ψ', 1000, W[2] - 36);
  ctx.font = font(22); ctx.textAlign = 'center'; ctx.fillStyle = amber;
  ctx.fillText('X IF m1 = 1  ·  Z IF m0 = 1  ·  NO BITS, NO STATE', 512, 462);
  tex.needsUpdate = true;
  return tex;
}

// ------------------------------------------------------------------ signs and billboards

// Holographic sign: a thin additive panel of text that flickers like a projection (§5.4 "2 holographic
// signs"). `lines`: [{ text, size?, color? }]; width/height in metres; base at y = 0.
export function createHoloSign({ lines = [{ text: 'PALISADE' }], width = 3, height = 1.1, color = COLOR.cyan } = {}) {
  const s = scaffold('holo_sign');
  const { canvas, tex } = canvasTexture(1024, Math.round(1024 * height / width));
  const hex = `#${new THREE.Color(color).getHexString()}`;
  drawText(canvas, lines, { bg: 'rgba(0,0,0,0)', fg: hex, border: hex, scan: true });
  s.own(tex);
  const mat = s.own(basic(0xffffff, { map: tex, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const panel = s.mesh(new THREE.PlaneGeometry(width, height), mat);
  panel.position.y = height / 2 + 0.08;
  s.bake(parts().box(width * 0.9, 0.06, 0.12, 0, 0.03, 0), mats().steel);
  let t = 0;
  return {
    object3D: s.object3D,
    refs: { material: mat, texture: tex, panel },
    update(dt) {
      t += dt;
      const glitch = Math.sin(t * 13.7) * Math.sin(t * 2.3) > 0.93;
      mat.opacity = glitch ? 0.25 : 0.78 + 0.07 * Math.sin(t * 40);
      panel.position.x = glitch ? 0.03 : 0;
    },
    setQuality: s.setQuality,
    dispose: s.dispose,
  };
}

// Billboard with named text states drawn to one canvas (§11.3 #1, #5): ivory on dark glass by default
// (corporation language). `states`: { name: { lines, fg?, bg?, border? } }. refs.setState(name) redraws
// once and is idempotent. refs.setGlitch(on) makes it stutter (§4.2: "corporate billboard glitches").
export function createBillboard({ states, initial, width = 6, height = 2.2, poleHeight = 0 } = {}) {
  if (!states || !Object.keys(states).length) throw new RangeError('billboard needs at least one state');
  const s = scaffold('billboard');
  const M = mats();
  const { canvas, tex } = canvasTexture(1024, Math.round(1024 * height / width));
  s.own(tex);
  const mat = s.own(basic(0xffffff, { map: tex }));
  const face = s.mesh(new THREE.PlaneGeometry(width, height), mat);
  face.position.set(0, poleHeight + height / 2, 0.06);
  const frame = parts().box(width + 0.2, height + 0.2, 0.1, 0, poleHeight + height / 2, 0);
  if (poleHeight > 0) frame.box(0.25, poleHeight, 0.25, -width / 3, poleHeight / 2, -0.1).box(0.25, poleHeight, 0.25, width / 3, poleHeight / 2, -0.1);
  s.bake(frame, M.darkGlass);
  s.bake(parts().box(width + 0.2, 0.05, 0.14, 0, poleHeight + height + 0.12, 0.02), M.porcelain, s.detail);

  let state = null, glitch = false, t = 0;
  const setState = (name) => {
    if (!states[name]) throw new RangeError(`billboard state must be one of ${Object.keys(states).join('|')}, got ${name}`);
    if (state === name) return;
    state = name;
    const st = states[name];
    drawText(canvas, st.lines, { bg: st.bg ?? '#05080e', fg: st.fg ?? '#eaf3f6', border: st.border ?? null });
    tex.needsUpdate = true;
  };
  setState(initial ?? Object.keys(states)[0]);
  return {
    object3D: s.object3D,
    refs: {
      material: mat, texture: tex, face, setState,
      get state() { return state; },
      setGlitch(on) { glitch = !!on; if (!glitch) { mat.color.setScalar(1); face.position.x = 0; } },
    },
    update(dt) {
      if (!glitch) return;
      t += dt;
      const k = Math.sin(t * 31) * Math.sin(t * 4.7);
      mat.color.setScalar(k > 0.6 ? 0.15 : 1);
      face.position.x = k > 0.8 ? 0.08 : 0;
    },
    setQuality: s.setQuality,
    dispose: s.dispose,
  };
}

// The two story billboards with their canonical text (§2.1 slogan, §11.3 #1 and #5).
export function createSloganBillboard(opts = {}) {
  return createBillboard({
    ...opts,
    states: { slogan: { lines: [{ text: 'NOTHING EVER HAS TO END.', size: 1.2 }, { text: 'PALISADE · MIRROR', size: 0.5, color: '#8fa3ae' }] } },
  });
}
export function createShelterBillboard(opts = {}) {
  return createBillboard({
    width: 4, height: 2.2, ...opts,
    states: {
      // GRID RESTORED → refs.setState('restored') at TELEPORT_COMMITTED (rides city_lighting_wave).
      unknown: { lines: [{ text: 'DISTRICT NINE SHELTER', size: 0.4, color: '#9fb2bd' }, { text: 'POPULATION', size: 0.8 }, { text: 'UNKNOWN', size: 0.8 }], fg: '#e96b68', border: '#e96b68' },
      restored: { lines: [{ text: 'DISTRICT NINE SHELTER', size: 0.4, color: '#9fb2bd' }, { text: 'GRID', size: 0.8 }, { text: 'RESTORED', size: 0.8 }], fg: '#6ff2a8', border: '#6ff2a8' },
    },
    initial: 'unknown',
  });
}

// ------------------------------------------------------------------ kiosk

// Empty convenience kiosk (§11.3 #2), 2.4 × 2.7 × 1.6, front +Z: half-drawn shutter, a warm-lit counter,
// an abandoned cup still steaming and the last receipt curling off the counter.
export function createKiosk() {
  const s = scaffold('kiosk');
  const M = mats();
  s.bake(parts()
    .box(2.4, 0.1, 1.6, 0, 0.05, 0)
    .box(2.4, 2.5, 0.1, 0, 1.3, -0.75)
    .box(0.1, 2.5, 1.6, -1.15, 1.3, 0).box(0.1, 2.5, 1.6, 1.15, 1.3, 0)
    .box(2.6, 0.15, 1.8, 0, 2.6, 0.05)
    .box(2.2, 1.0, 0.5, 0, 0.55, 0.45), M.graphite);       // last box: counter
  // Shutter: slats pulled half down.
  const shutter = parts();
  for (let i = 0; i < 7; i++) shutter.box(2.2, 0.1, 0.03, 0, 2.48 - i * 0.11, 0.78);
  s.bake(shutter, M.steel);
  // Shelves with a few boxes behind the counter.
  const shelves = parts();
  for (const y of [1.3, 1.75]) {
    shelves.box(2.1, 0.04, 0.3, 0, y, -0.55);
    for (let i = 0; i < 6; i++) shelves.box(0.18, 0.24, 0.18, -0.85 + i * 0.34 + (i % 2) * 0.05, y + 0.14, -0.55);
  }
  s.bake(shelves, M.warmMetal, s.detail);
  // Warm interior strip: the only warm light in a cold alley — someone was here a moment ago.
  const warmMat = s.own(basic(0xffc98a));
  s.bake(parts().box(2.1, 0.05, 0.05, 0, 2.08, 0.1).box(0.05, 0.9, 0.05, -1.05, 1.6, 0.1).box(0.05, 0.9, 0.05, 1.05, 1.6, 0.1), warmMat);
  // The cup on the counter and its lid.
  s.bake(parts().cyl(0.05, 0.04, 0.13, 12, 0.35, 1.115, 0.5).cyl(0.055, 0.055, 0.02, 12, 0.35, 1.19, 0.5), M.porcelain);
  // Receipt: a printed strip curling off the counter edge.
  const r = canvasTexture(128, 384);
  {
    const c = r.canvas.getContext('2d');
    c.fillStyle = '#efe9dc'; c.fillRect(0, 0, 128, 384);
    c.fillStyle = '#3a342c'; c.font = '700 14px "Courier New", monospace';
    ['KIOSK 9-114', '02:04 AM', '--------', '1 GENMAICHA', '  HOT  2.40', '--------', 'PAID', 'THANK YOU', '', 'GRID NOTICE:', 'D9 LOAD', 'SHEDDING'].forEach((l, i) => c.fillText(l, 10, 30 + i * 26));
    r.tex.needsUpdate = true;
  }
  s.own(r.tex);
  const receipt = s.mesh(new THREE.PlaneGeometry(0.1, 0.3, 1, 6), s.own(basic(0xffffff, { map: r.tex, side: THREE.DoubleSide })));
  {
    const p = receipt.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = (0.15 - p.getY(i)) / 0.3;     // 0 at the top of the strip, 1 at the bottom
      p.setZ(i, Math.sin(k * 1.8) * 0.12);
      p.setY(i, p.getY(i) - k * k * 0.05);
    }
    receipt.geometry.computeVertexNormals();
    receipt.position.set(-0.4, 1.0, 0.72);
    receipt.rotation.x = -0.3;
  }
  // Steam: three soft cards rising from the cup (detail only).
  const steamMat = s.own(basic(0xd8e2e8, { transparent: true, opacity: 0.16, depthWrite: false }));
  const steam = [];
  for (let i = 0; i < 3; i++) steam.push(s.mesh(new THREE.PlaneGeometry(0.06, 0.12), steamMat, s.detail));
  let t = 0;
  return {
    object3D: s.object3D,
    refs: { warmMaterial: warmMat, receipt },
    update(dt) {
      t += dt;
      steam.forEach((p, i) => {
        const k = (t * 0.25 + i / 3) % 1;
        p.position.set(0.35 + Math.sin(t * 1.3 + i) * 0.02, 1.22 + k * 0.3, 0.5);
        p.scale.setScalar(0.6 + k);
      });
      // The warm strip buzzes faintly: power is unreliable here.
      warmMat.color.setHex(Math.sin(t * 17) * Math.sin(t * 0.9) > 0.97 ? 0x6b5236 : 0xffc98a);
    },
    setQuality: s.setQuality,
    dispose: s.dispose,
  };
}

// ------------------------------------------------------------------ guide arrow

// Two emissive chevrons lying on the floor, pointing +Z, pulsing gently (§5.4). Gameplay sets
// object3D.visible to show it and rotation.y to aim it (π to point −Z).
export function createGuideArrow({ color = COLOR.cyan } = {}) {
  const s = scaffold('guide_arrow');
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.45); shape.lineTo(0.45, 0); shape.lineTo(0.28, 0); shape.lineTo(0, 0.28);
  shape.lineTo(-0.28, 0); shape.lineTo(-0.45, 0); shape.closePath();
  const mat = s.own(basic(color, { side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
  // ShapeGeometry is drawn in XY; laying it flat with rx = +π/2 turns its +Y into +Z.
  const chevrons = parts();
  for (let i = 0; i < 2; i++) chevrons.add(new THREE.ShapeGeometry(shape), 0, 0, -0.2 + i * 0.4, Math.PI / 2);
  const mesh = s.bake(chevrons, mat);
  mesh.matrixAutoUpdate = true;
  let t = 0;
  return {
    object3D: s.object3D,
    refs: { material: mat },
    update(dt) {
      if (!s.object3D.visible) return;
      t += dt;
      const k = Math.sin(t * 3) * 0.5 + 0.5;
      mesh.position.y = 0.05 + k * 0.08;
      mat.opacity = 0.6 + 0.35 * k;
    },
    setQuality: s.setQuality,
    dispose: s.dispose,
  };
}

// ------------------------------------------------------------------ tram

// A distant tram (§11.3 #4, §4.1 Shot A): dark cars with a lit window band and a headlight gliding
// `from` → `to` and looping. It lives beyond the playable bounds, so it has no collider. Its lights
// ignore fog so the silhouette reads through the haze.
export function createTram({ from = [-120, 18, -110], to = [140, 18, -110], speed = 14, cars = 3 } = {}) {
  const s = scaffold('tram');
  const M = mats();
  const car = new THREE.Group();
  s.object3D.add(car);
  const body = parts(), windows = parts();
  for (let i = 0; i < cars; i++) {
    body.box(9, 2.6, 2.6, -i * 9.4, 1.3, 0);
    windows.box(8.2, 0.55, 2.64, -i * 9.4, 1.6, 0);
  }
  body.box(cars * 9.4 + 4, 0.4, 1.2, -(cars - 1) * 4.7, -0.4, 0); // rail beam under the cars
  s.bake(body, M.graphite, car);
  const winMat = s.own(basic(0xf6dcae, { fog: false }));
  s.bake(windows, winMat, car);
  const head = s.mesh(new THREE.SphereGeometry(0.35, 10, 6), s.own(basic(0xffffff, { fog: false })), car);
  head.position.set(4.6, 1.2, 0);
  const a = new THREE.Vector3(...from), dir = new THREE.Vector3(...to).sub(a);
  const len = dir.length();
  car.rotation.y = Math.atan2(-dir.z, dir.x);
  let d = 0;
  return {
    object3D: s.object3D,
    refs: { windowMaterial: winMat, car },
    update(dt) {
      d = (d + dt * speed) % (len + cars * 9.4);
      car.position.copy(a).addScaledVector(dir, d / len);
    },
    setQuality: s.setQuality,
    dispose: s.dispose,
  };
}
