// echo/scene/lighting.js — Nacre City's light rig (vision §5.2, §5.3, §5.5, §12.1, §12.2).
// Composition over count: one cool key, a hemisphere fill, a few coloured accents, exponential fog.
// The wet ground is faked in the material (no SSR, no planar mirror): puddle-masked low roughness plus
// coloured streaks that sit on the ground between the camera and each accent light, which is where a
// real reflection of that light would appear.
import * as THREE from 'three';
import { QUALITY_LEVELS, DEFAULT_SETTINGS } from '../contracts.js';

// §5.3. Art owns the palette; gameplay's district.js PALETTE should import this one instead.
export const PALETTE = Object.freeze({
  graphite: 0x070b12, steel: 0x132035, cyan: 0x56e4f2, amber: 0xf3ae62, coral: 0xe96b68, porcelain: 0xeaf3f6,
});

// Per preset: DPR cap (§12.1: 1.5–1.75 on capable machines), dynamic shadows (§12.2: selective on high,
// none on low), and how much fake reflection the wet ground shows. Lights and objects are the same in
// every preset; only cost changes (§12.2 "logic is identical in every mode").
export const QUALITY_PRESETS = Object.freeze({
  low: Object.freeze({ dpr: 1.0, shadows: false, streaks: 0.0, puddles: 0.6 }),
  med: Object.freeze({ dpr: 1.5, shadows: false, streaks: 0.8, puddles: 1.0 }),
  high: Object.freeze({ dpr: 1.75, shadows: true, streaks: 1.0, puddles: 1.0 }),
});

export function checkQuality(q) {
  if (!QUALITY_LEVELS.includes(q)) throw new TypeError(`quality must be one of ${QUALITY_LEVELS.join('|')}, got ${JSON.stringify(q)}`);
  return q;
}

const MAX_STREAK_LIGHTS = 4; // fixed so the shader never recompiles when accents change

// The default accents light the alley's shopfronts (gameplay's alley.js puts cyan/amber strips at
// x = ±5.9, y = 2.9) and the rooftop terminal. Gameplay may pass its own; the first four reflect.
const DEFAULT_ACCENTS = [
  { color: PALETTE.cyan, position: [-5.2, 2.9, -7.2], intensity: 9, distance: 14 },
  { color: PALETTE.amber, position: [5.2, 2.9, -14.0], intensity: 9, distance: 14 },
  { color: PALETTE.cyan, position: [5.2, 3.0, -11.5], intensity: 6, distance: 9 },
  { color: PALETTE.amber, position: [27, 3.5, -46], intensity: 10, distance: 18 },
];

// Interior fill (vision §5.2 "readability first", §11 relay mood). The district's rooms are lit by art,
// not by gameplay toggles: every preset gets additive light cards (wall washes, floor pools, ceiling
// strips: three draw calls for all rooms), and med/high add a few real point lights on top. Coordinates
// are gameplay's room shells (relay.js / rooftop.js, gameplay-world-controller 1a89bfb); if a room moves,
// move its entry here. Card: { at, normal: '+x'|'-x'|'+z'|'-z'|'up'|'down', size: [w, h], color, k }.
// Layer 'base' is always on; 'energy' follows the Bell pair (§9.3 cyan_conduit_illuminates) and
// 'schematic' the amber schematic (amber_schematic_visible), so the fill never flattens either change.
const COOL = 0x6f8fb8;
export const INTERIOR_ROOMS = Object.freeze({
  passage: {
    // Down-washes from the ceiling strip: each wall card is centred on the ceiling line, so its upper half
    // hides behind the roof slab and what shows is light falling down the wall.
    cards: [
      { at: [0, 4.38, -33.5], normal: 'down', size: [0.35, 13], color: 0xbfe6f2, k: 0.55 },
      ...[-28.5, -33.5, -38.5].flatMap((z) => [
        { at: [0, 0.02, z], normal: 'up', size: [5, 6], color: COOL, k: 0.6 },
        { at: [-2.48, 4.3, z], normal: '+x', size: [6.5, 7], color: COOL, k: 0.6 },
        { at: [2.48, 4.3, z], normal: '-x', size: [6.5, 7], color: COOL, k: 0.6 },
      ]),
    ],
    lights: [{ at: [0, 3.9, -33.5], color: 0xa9c4e4, intensity: 14, distance: 11, presets: ['med', 'high'] },
      { at: [0, 3.9, -39], color: 0xa9c4e4, intensity: 8, distance: 7, presets: ['high'] }],
  },
  elevator: {
    cards: [
      { at: [13.5, 4.38, -50], normal: 'down', size: [6, 0.3], color: 0xbfe6f2, k: 0.55 },
      { at: [13.5, 0.02, -50], normal: 'up', size: [7, 5], color: COOL, k: 0.4 },
      ...[11.5, 15.5].flatMap((x) => [
        { at: [x, 4.3, -52.48], normal: '+z', size: [5, 6.5], color: COOL, k: 0.33 },
        { at: [x, 4.3, -47.52], normal: '-z', size: [5, 6.5], color: COOL, k: 0.33 },
      ]),
    ],
    lights: [{ at: [13.5, 3.9, -50], color: 0xa9c4e4, intensity: 12, distance: 9, presets: ['med', 'high'] }],
  },
  relay: {
    // Up-washes from work lights at the foot of each wall: cards centred at floor level, so the lower half
    // hides below the floor and the light climbs the wall and dies out before the top (the shell reads,
    // the 10 m height stays dark). Overlapping cards make one continuous band, not spots.
    cards: [
      ...[-55, -50, -45].flatMap((z) => [
        { at: [-8.98, 0.2, z], normal: '+x', size: [10, 12], color: COOL, k: 0.14 },
        { at: [8.98, 0.2, z], normal: '-x', size: [10, 12], color: COOL, k: 0.14 },
      ]),
      // The north wall faces the moonlight key already; it gets half the wash, or it outshines the idle rings.
      ...[-6, 6].map((x) => ({ at: [x, 0.2, -58.98], normal: '+z', size: [11, 12], color: COOL, k: 0.08 })),
      ...[-6.2, 6.2].map((x) => ({ at: [x, 0.2, -41.62], normal: '-z', size: [9, 12], color: COOL, k: 0.14 })),
      { at: [0, 0.02, -50], normal: 'up', size: [16, 16], color: 0x3d6b80, k: 0.55 }, // idle core spill
      { at: [0, 0.37, -50], normal: 'up', size: [7.6, 7.6], color: 0x56e4f2, k: 0.12, layer: 'energy' }, // plinth top
      { at: [0, 0.03, -50], normal: 'up', size: [15, 15], color: 0x56e4f2, k: 0.2, layer: 'energy' },
      { at: [-5.3, 0.04, -50], normal: 'up', size: [8.5, 2.2], color: 0x56e4f2, k: 0.35, layer: 'energy' }, // conduit spill
      { at: [0, 4.5, -58.97], normal: '+z', size: [9, 5.4], color: 0xf3ae62, k: 0.55, layer: 'schematic' }, // display halo
      { at: [0, 0.035, -56.6], normal: 'up', size: [8, 4.6], color: 0xf3ae62, k: 0.4, layer: 'schematic' },
    ],
    lights: [
      { at: [0, 8, -50], color: 0x8fa9d4, intensity: 30, distance: 24, presets: ['med', 'high'] },
      // Rim light on the pedestal: cyan from just above the rings, idle at 30% until the Bell pair.
      { at: [0, 4.4, -50], color: 0x56e4f2, intensity: 15, distance: 13, presets: ['med', 'high'], layer: 'energy', idle: 0.3 },
      { at: [0, 4.5, -56.8], color: 0xf3ae62, intensity: 10, distance: 9, presets: ['high'], layer: 'schematic', idle: 0 },
    ],
  },
});

// Low has no interior point lights (§12.2), so its cards carry their share: brighter cards, same layout.
const CARD_GAIN = { low: 1.4, med: 1, high: 1 };
const CARD_FACE = { up: [-Math.PI / 2, 0], down: [Math.PI / 2, 0], '+x': [0, Math.PI / 2], '-x': [0, -Math.PI / 2], '+z': [0, 0], '-z': [0, Math.PI] };
let cardTexture = null;
// A soft elliptical falloff shared by every card: a broad plateau (so a wash lifts the room's middle
// tones, not a hot spot) and no hard edge for the eye to catch.
function lightCardTexture() {
  if (cardTexture) return cardTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [s, a] of [[0, 1], [0.45, 0.8], [0.8, 0.3], [1, 0]]) g.addColorStop(s, `rgba(255,255,255,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  cardTexture = new THREE.CanvasTexture(c);
  return cardTexture;
}

// One merged additive mesh per layer: vertex colour = card colour × k.
function buildCardLayer(cards) {
  const pos = [], uv = [], col = [], idx = [];
  const e = new THREE.Euler(), m = new THREE.Matrix4(), v = new THREE.Vector3(), c = new THREE.Color();
  for (const card of cards) {
    const [rx, ry] = CARD_FACE[card.normal];
    m.makeRotationFromEuler(e.set(rx, ry, 0, 'YXZ')).setPosition(...card.at);
    c.set(card.color).multiplyScalar(card.k);
    const base = pos.length / 3, [w, h] = card.size;
    for (const [x, y, u, t] of [[-w / 2, -h / 2, 0, 0], [w / 2, -h / 2, 1, 0], [w / 2, h / 2, 1, 1], [-w / 2, h / 2, 0, 1]]) {
      v.set(x, y, 0).applyMatrix4(m);
      pos.push(v.x, v.y, v.z); uv.push(u, t); col.push(c.r, c.g, c.b);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ map: lightCardTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.matrixAutoUpdate = false;
  mesh.renderOrder = 1;
  return mesh;
}

function createInteriorFill(group, rooms) {
  const cards = { base: [], energy: [], schematic: [] };
  const lights = [];
  for (const [room, spec] of Object.entries(rooms)) {
    for (const card of spec.cards) cards[card.layer ?? 'base'].push(card);
    for (const l of spec.lights) {
      const light = new THREE.PointLight(l.color, l.intensity, l.distance, 2);
      light.position.fromArray(l.at);
      light.name = `interior:${room}`;
      group.add(light);
      lights.push({ light, spec: l });
    }
  }
  const layers = Object.fromEntries(Object.entries(cards).filter(([, list]) => list.length).map(([name, list]) => {
    const mesh = buildCardLayer(list);
    mesh.name = `interior-cards:${name}`;
    group.add(mesh);
    return [name, mesh];
  }));
  const level = { base: 1, energy: 0, schematic: 0 };
  let quality = null;
  function refresh() {
    for (const [name, mesh] of Object.entries(layers)) {
      mesh.material.opacity = Math.min(1, level[name] * CARD_GAIN[quality]);
      mesh.visible = level[name] > 0;
    }
    for (const { light, spec } of lights) {
      const k = spec.layer ? (spec.idle ?? 0) + (1 - (spec.idle ?? 0)) * level[spec.layer] : 1;
      light.intensity = spec.intensity * k;
      // Visibility follows the preset only: a light that toggles with the story would recompile every lit
      // material mid-scene. Intensity 0 costs a few ALU ops, not a shader swap.
      light.visible = spec.presets.includes(quality);
    }
  }
  return {
    lights: lights.map((l) => l.light),
    layers,
    setQuality(q) { quality = q; refresh(); },
    // { relayEnergy, schematic } in 0..1; omitted keys keep their value.
    set({ relayEnergy = level.energy, schematic = level.schematic } = {}) {
      level.energy = THREE.MathUtils.clamp(relayEnergy, 0, 1);
      level.schematic = THREE.MathUtils.clamp(schematic, 0, 1);
      refresh();
    },
    get state() { return { relayEnergy: level.energy, schematic: level.schematic }; },
    dispose() { for (const mesh of Object.values(layers)) { mesh.geometry.dispose(); mesh.material.dispose(); } for (const l of lights) l.light.dispose(); },
  };
}

export function createLighting({ scene, renderer = null, quality = DEFAULT_SETTINGS.quality, accents = DEFAULT_ACCENTS, fogDensity = 0.013, rooms = INTERIOR_ROOMS } = {}) {
  if (!scene) throw new TypeError('createLighting: scene is required');
  // Fog is a shade lighter than the sky so silhouettes separate and the map edge dissolves (§5.5).
  const fogColor = new THREE.Color(0x0b1424);
  scene.background = new THREE.Color(PALETTE.graphite);
  scene.fog = new THREE.FogExp2(fogColor.clone(), fogDensity);

  const group = new THREE.Group();
  group.name = 'lighting';
  const hemi = new THREE.HemisphereLight(0x5a7aa8, 0x0a0d14, 0.9);
  const key = new THREE.DirectionalLight(0xa8c4ff, 1.1); // cold moonlight through cloud
  key.position.set(-20, 40, 15);
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
  group.add(hemi, key, key.target);

  const accentLights = accents.map((a) => {
    const l = new THREE.PointLight(a.color, a.intensity, a.distance, 2);
    l.position.fromArray(a.position);
    group.add(l);
    return l;
  });
  const interior = createInteriorFill(group, rooms);
  scene.add(group);

  // Uniforms shared by every wet material, so accents and quality update all floors at once.
  const wetUniforms = {
    uStreakPos: { value: Array.from({ length: MAX_STREAK_LIGHTS }, () => new THREE.Vector3(0, -1000, 0)) },
    uStreakColor: { value: Array.from({ length: MAX_STREAK_LIGHTS }, () => new THREE.Color(0, 0, 0)) },
    uStreaks: { value: 1 },
    uPuddles: { value: 1 },
  };
  accentLights.slice(0, MAX_STREAK_LIGHTS).forEach((l, i) => {
    wetUniforms.uStreakPos.value[i].copy(l.position);
    wetUniforms.uStreakColor.value[i].copy(l.color);
  });

  let current = null;
  function setQuality(q) {
    checkQuality(q);
    const p = QUALITY_PRESETS[q];
    wetUniforms.uStreaks.value = p.streaks;
    wetUniforms.uPuddles.value = p.puddles;
    key.castShadow = p.shadows;
    interior.setQuality(q);
    if (renderer) {
      renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, p.dpr));
      if (renderer.shadowMap.enabled !== p.shadows) {
        renderer.shadowMap.enabled = p.shadows;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        // Toggling shadows changes every lit material's program; flag them once, not per frame.
        scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
      }
    }
    current = q;
  }
  setQuality(quality);

  // A floor material that reads wet. `color` is the dry base; gameplay can give it to every walkable floor.
  function createWetGroundMaterial({ color = 0x10161f, roughness = 0.55, metalness = 0.35 } = {}) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, wetUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWetWorld;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWetWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vWetWorld;
uniform vec3 uStreakPos[${MAX_STREAK_LIGHTS}];
uniform vec3 uStreakColor[${MAX_STREAK_LIGHTS}];
uniform float uStreaks;
uniform float uPuddles;
float wetHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wetNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(wetHash(i), wetHash(i + vec2(1, 0)), u.x), mix(wetHash(i + vec2(0, 1)), wetHash(i + vec2(1, 1)), u.x), u.y);
}
float wetPuddle(vec2 p) { return smoothstep(0.48, 0.62, wetNoise(p * 0.35) * 0.65 + wetNoise(p * 1.3) * 0.35); }`)
        // Puddles are near-mirror; dry patches stay matte.
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
float wetMask = wetPuddle(vWetWorld.xz) * uPuddles;
roughnessFactor = mix(roughnessFactor, 0.08, wetMask);`)
        // Reflection streaks: a light at height h mirrors to a point between the camera and the light's
        // ground projection, smeared toward the viewer by the rain-rippled surface. Up-facing pixels only.
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (uStreaks > 0.0 && inverseTransformDirection(normal, viewMatrix).y > 0.7) {
  for (int i = 0; i < ${MAX_STREAK_LIGHTS}; i++) {
    vec2 L = uStreakPos[i].xz;
    vec2 axis = cameraPosition.xz - L;
    vec2 dir = axis / max(length(axis), 0.001);
    vec2 rel = vWetWorld.xz - L;
    float along = dot(rel, dir);
    float across = abs(rel.x * dir.y - rel.y * dir.x);
    float width = 0.25 + max(along, 0.0) * 0.06;
    float s = exp(-across * across / (width * width)) * smoothstep(-0.6, 0.4, along) * exp(-max(along, 0.0) * 0.22);
    float ripple = 0.65 + 0.35 * wetNoise(vec2(across * 6.0, along * 1.5));
    totalEmissiveRadiance += uStreakColor[i] * s * ripple * (0.25 + 0.75 * wetMask) * uStreaks * 0.55;
  }
}`);
    };
    mat.customProgramCacheKey = () => 'echo-wet-ground';
    return mat;
  }

  return {
    group, hemi, key, accents: accentLights, interior,
    get quality() { return current; },
    dprFor: (q) => QUALITY_PRESETS[checkQuality(q)].dpr,
    createWetGroundMaterial,
    // Keep the key's shadow frustum over the player so a small shadow map stays sharp (high only).
    follow(target) {
      key.position.set(target.x - 20, target.y + 40, target.z + 15);
      key.target.position.copy(target);
    },
    // 0 = blackout city, 1 = restored: the fill lifts and the fog takes a little of the city's glow.
    setRestoration(k) {
      const t = THREE.MathUtils.clamp(k, 0, 1);
      hemi.intensity = 0.9 + 0.35 * t;
      scene.fog.color.copy(fogColor).lerp(RESTORED_FOG, t * 0.6);
    },
    update() {},
    setQuality,
    dispose() {
      scene.remove(group);
      for (const l of [key, ...accentLights]) l.dispose();
      hemi.dispose();
      interior.dispose();
    },
  };
}

const RESTORED_FOG = new THREE.Color(0x1a2236);
