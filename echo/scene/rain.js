// echo/scene/rain.js — rain as ONE LineSegments draw (vision §5.5, §12.2).
// Drops live in a box that follows the camera, but each drop is anchored in world space and wrapped
// with mod() in the vertex shader, so moving the camera never makes the rain swim and the CPU does no
// per-drop work. Splashes (high only) are a second, tiny Points draw on the ground plane.
// Shelters (addShelter) are world boxes in which the shader drops every streak and splash, so rain
// never falls indoors whatever zone triggers the caller does or forgets, at zero extra draws.
import * as THREE from 'three';
import { DEFAULT_SETTINGS } from '../contracts.js';
import { checkQuality } from './lighting.js';

// Drops drawn per preset (§12.2: high = rain particles, medium = fewer, low = reduced). The buffer is
// allocated once at the high count; presets only change drawRange, so switching never rebuilds.
export const RAIN_COUNTS = Object.freeze({ low: 1500, med: 4000, high: 8000 });
const SPLASH_COUNT = 400;
// Per-preset look, tuned so the accents dominate (vision §5.3 contrast hierarchy). WebGL lines are
// always 1 device px, so a higher DPR draws thinner streaks: opacity rises a little with the preset
// to keep the same perceived weight. Blending is NORMAL, not additive, so a rain pixel can never be
// brighter than RAIN_COLOR, which sits below the cyan/amber strips however many streaks overlap.
export const RAIN_LOOK = Object.freeze({
  low: Object.freeze({ opacity: 0.22, len: 0.04 }),
  med: Object.freeze({ opacity: 0.26, len: 0.045 }),
  high: Object.freeze({ opacity: 0.3, len: 0.045 }),
});
const RAIN_COLOR = 0x7f93ad;
// Reduced motion (vision §12): slower, sparser fall; shorter streaks follow from the slower speed.
const REDUCED_SPEED = 0.35;
const REDUCED_DENSITY = 0.5;
export const MAX_SHELTERS = 8; // fixed uniform array size; the shader loop is unrolled to this
const SHELTER_GLSL = `
  uniform vec3 uShelterMin[${MAX_SHELTERS}];
  uniform vec3 uShelterMax[${MAX_SHELTERS}];
  uniform int uShelterCount;
  bool sheltered(vec3 p) {
    for (int i = 0; i < ${MAX_SHELTERS}; i++) {
      if (i >= uShelterCount) break;
      if (all(greaterThanEqual(p, uShelterMin[i])) && all(lessThanEqual(p, uShelterMax[i]))) return true;
    }
    return false;
  }`;

// Metres. Small and pushed ahead of the camera: measured on the alley shot, a 36 m box centred on the
// camera put only ~3% of drops on screen; most were behind, beside, or below the floor.
const BOX = new THREE.Vector3(22, 14, 22);
const AHEAD = 7; // box centre this far in front of the camera
const BELOW = 3; // box bottom this far below the camera

export function createRain({ scene, camera, quality = DEFAULT_SETTINGS.quality, color = RAIN_COLOR, groundY = 0, seed = 1 } = {}) {
  if (!scene || !camera) throw new TypeError('createRain: scene and camera are required');
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);

  const max = RAIN_COUNTS.high;
  const seeds = new Float32Array(max * 2 * 4); // per vertex: x, y, z in [0,1) and end flag
  for (let i = 0; i < max; i++) {
    const x = rnd(), y = rnd(), z = rnd();
    seeds.set([x, y, z, 0, x, y, z, 1], i * 8);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 2 * 3), 3)); // unused, sized for three
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6); // positions are computed in the shader

  const shelterUniforms = {
    uShelterMin: { value: Array.from({ length: MAX_SHELTERS }, () => new THREE.Vector3()) },
    uShelterMax: { value: Array.from({ length: MAX_SHELTERS }, () => new THREE.Vector3()) },
    uShelterCount: { value: 0 },
  };
  const uniforms = Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 },
    uFall: { value: 0 }, // accumulated fall time: a speed change (reduced motion) never makes drops jump
    uCam: { value: new THREE.Vector3() },
    uBox: { value: BOX.clone() },
    uSpeed: { value: 17 },
    uWind: { value: new THREE.Vector2(1.6, 0.6) },
    uLen: { value: RAIN_LOOK.med.len }, // streak length in seconds of fall
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: RAIN_LOOK.med.opacity },
    uGround: { value: groundY },
  }]), shelterUniforms);
  const mat = new THREE.ShaderMaterial({
    uniforms, fog: true, transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    vertexShader: `
      attribute vec4 aSeed;
      uniform float uFall, uSpeed, uLen, uGround;
      uniform vec3 uCam, uBox;
      uniform vec2 uWind;
      varying float vFade;
      #include <fog_pars_vertex>
      ${SHELTER_GLSL}
      void main() {
        // Speed must not correlate with the start height (aSeed.y): if it did, the heights would
        // periodically collapse into one band (measured: a ~2 s cycle with speed = f(aSeed.y)).
        float speed = uSpeed * (0.8 + 0.4 * fract(aSeed.x * 37.13 + aSeed.z * 91.71));
        vec3 vel = vec3(uWind.x, -speed, uWind.y);
        // World-anchored drop, wrapped into the camera's box on every axis.
        vec3 p = aSeed.xyz * uBox + vel * uFall;
        vec3 lo = vec3(uCam.x - uBox.x * 0.5, uCam.y - ${BELOW.toFixed(1)}, uCam.z - uBox.z * 0.5);
        p = lo + mod(p - lo, uBox);
        vec3 tail = p - vel * uLen;
        // Both vertices test both ends, so a streak crossing a roof edge vanishes whole instead of
        // being stretched to wherever one end was moved. Outside the clip volume = no fragments.
        if (sheltered(p) || sheltered(tail)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vFade = 0.0; return; }
        p = mix(p, tail, aSeed.w);
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        // Ground fade, rain-box edge fade, and a near fade: streaks within ~3 m of the camera would
        // cross the player silhouette (the follow camera sits 3-4 m behind Rin), so they thin out.
        vFade = smoothstep(uGround - 0.2, uGround + 1.0, p.y)
          * (1.0 - smoothstep(0.38, 0.5, length((p.xz - uCam.xz) / uBox.xz)))
          * smoothstep(1.0, 4.0, -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(uColor, uOpacity * vFade);
        #include <fog_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.name = 'rain';

  // Splashes: short-lived rings on the ground plane, each on its own phase.
  const sSeeds = new Float32Array(SPLASH_COUNT * 3);
  for (let i = 0; i < SPLASH_COUNT; i++) sSeeds.set([rnd(), rnd(), rnd()], i * 3);
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPLASH_COUNT * 3), 3));
  sGeo.setAttribute('aSeed', new THREE.BufferAttribute(sSeeds, 3));
  sGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const sMat = new THREE.ShaderMaterial({
    // merge() clones, so the shared uniforms are attached after it: one uTime drives both draws.
    uniforms: Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uScale: { value: 300 } }]), {
      uTime: uniforms.uTime, uCam: uniforms.uCam, uGround: uniforms.uGround, uColor: uniforms.uColor, uOpacity: uniforms.uOpacity,
    }, shelterUniforms),
    fog: true, transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    vertexShader: `
      attribute vec3 aSeed;
      uniform float uTime, uGround, uScale;
      uniform vec3 uCam;
      varying float vLife;
      #include <fog_pars_vertex>
      ${SHELTER_GLSL}
      void main() {
        float cycle = uTime * 2.5 + aSeed.z * 10.0;
        float k = floor(cycle);
        vLife = fract(cycle);
        // A new random spot every cycle, within 12 m of the camera.
        vec2 r = fract(aSeed.xy + vec2(0.618, 0.382) * k) - 0.5;
        vec3 p = vec3(uCam.x + r.x * 24.0, uGround + 0.02, uCam.z + r.y * 24.0);
        if (sheltered(p)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vLife = 1.0; return; }
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = uScale * (0.03 + 0.08 * vLife) / -mvPosition.z;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vLife;
      #include <fog_pars_fragment>
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c * vec2(1.0, 2.6)); // flattened: a ring seen at a grazing angle
        float ring = smoothstep(0.5, 0.42, d) * smoothstep(0.28, 0.4, d);
        gl_FragColor = vec4(uColor, ring * (1.0 - vLife) * uOpacity * 1.6);
        #include <fog_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const splashes = new THREE.Points(sGeo, sMat);
  splashes.frustumCulled = false;
  splashes.name = 'rain-splashes';

  const group = new THREE.Group();
  group.name = 'rain-group';
  group.add(lines, splashes);
  scene.add(group);

  const fwd = new THREE.Vector3();
  let intensity = 1;
  let current = null;
  let reduced = false;
  function setQuality(q) {
    checkQuality(q);
    current = q;
    uniforms.uOpacity.value = RAIN_LOOK[q].opacity;
    uniforms.uLen.value = RAIN_LOOK[q].len;
    applyCount();
    splashes.visible = q === 'high';
  }
  function applyCount() {
    geo.setDrawRange(0, Math.round(RAIN_COUNTS[current] * intensity * (reduced ? REDUCED_DENSITY : 1)) * 2);
  }
  // Accepts a THREE.Box3 or any {min, max} with x/y/z (or [x, y, z]) corners, in world space.
  function addShelter(box) {
    const n = shelterUniforms.uShelterCount.value;
    if (n >= MAX_SHELTERS) throw new RangeError(`rain.addShelter: at most ${MAX_SHELTERS} shelters`);
    const min = shelterUniforms.uShelterMin.value[n], max = shelterUniforms.uShelterMax.value[n];
    const v = (c) => (Array.isArray(c) ? c : [c?.x, c?.y, c?.z]);
    min.fromArray(v(box?.min)); max.fromArray(v(box?.max));
    if (![min.x, min.y, min.z, max.x, max.y, max.z].every(Number.isFinite) || min.x > max.x || min.y > max.y || min.z > max.z) {
      throw new TypeError(`rain.addShelter: need a box with finite min <= max, got ${JSON.stringify(box)}`);
    }
    shelterUniforms.uShelterCount.value = n + 1;
    return n + 1;
  }
  setQuality(quality);

  return {
    group, lines, splashes,
    get quality() { return current; },
    get drops() { return geo.drawRange.count / 2; },
    // 0..1: gameplay dims rain under cover; the ending calms the storm.
    setIntensity(k) {
      intensity = THREE.MathUtils.clamp(k, 0, 1);
      applyCount();
      group.visible = intensity > 0;
    },
    get intensity() { return intensity; },
    addShelter,
    clearShelters() { shelterUniforms.uShelterCount.value = 0; },
    get shelters() { return shelterUniforms.uShelterCount.value; },
    setReducedMotion(on) {
      reduced = !!on;
      applyCount();
    },
    get reducedMotion() { return reduced; },
    update(dt, elapsed) {
      uniforms.uTime.value = elapsed;
      uniforms.uFall.value += dt * (reduced ? REDUCED_SPEED : 1);
      // uCam is the rain box's centre, pushed ahead of the camera so the drops land in view.
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      if (fwd.lengthSq() > 1e-6) fwd.normalize();
      uniforms.uCam.value.copy(camera.position).addScaledVector(fwd, AHEAD);
      uniforms.uCam.value.y = camera.position.y;
    },
    setQuality,
    dispose() {
      scene.remove(group);
      geo.dispose(); mat.dispose(); sGeo.dispose(); sMat.dispose();
    },
  };
}
