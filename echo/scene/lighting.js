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

export function createLighting({ scene, renderer = null, quality = DEFAULT_SETTINGS.quality, accents = DEFAULT_ACCENTS, fogDensity = 0.013 } = {}) {
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
    group, hemi, key, accents: accentLights,
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
    },
  };
}

const RESTORED_FOG = new THREE.Color(0x1a2236);
