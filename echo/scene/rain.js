// echo/scene/rain.js — rain as ONE LineSegments draw (vision §5.5, §12.2).
// Drops live in a box that follows the camera, but each drop is anchored in world space and wrapped
// with mod() in the vertex shader, so moving the camera never makes the rain swim and the CPU does no
// per-drop work. Splashes (high only) are a second, tiny Points draw on the ground plane.
import * as THREE from 'three';
import { DEFAULT_SETTINGS } from '../contracts.js';
import { checkQuality } from './lighting.js';

// Drops drawn per preset (§12.2: high = rain particles, medium = fewer, low = reduced). The buffer is
// allocated once at the high count; presets only change drawRange, so switching never rebuilds.
export const RAIN_COUNTS = Object.freeze({ low: 1500, med: 4000, high: 8000 });
const SPLASH_COUNT = 400;
const BOX = new THREE.Vector3(36, 22, 36); // metres around the camera

export function createRain({ scene, camera, quality = DEFAULT_SETTINGS.quality, color = 0x9fb8d6, groundY = 0, seed = 1 } = {}) {
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

  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 },
    uCam: { value: new THREE.Vector3() },
    uBox: { value: BOX.clone() },
    uSpeed: { value: 17 },
    uWind: { value: new THREE.Vector2(1.6, 0.6) },
    uLen: { value: 0.045 }, // streak length in seconds of fall
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: 0.55 },
    uGround: { value: groundY },
  }]);
  const mat = new THREE.ShaderMaterial({
    uniforms, fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec4 aSeed;
      uniform float uTime, uSpeed, uLen, uGround;
      uniform vec3 uCam, uBox;
      uniform vec2 uWind;
      varying float vFade;
      #include <fog_pars_vertex>
      void main() {
        float speed = uSpeed * (0.8 + 0.4 * aSeed.y);
        vec3 vel = vec3(uWind.x, -speed, uWind.y);
        // World-anchored drop, wrapped into the camera's box on every axis.
        vec3 p = aSeed.xyz * uBox + vel * uTime;
        vec3 lo = uCam - uBox * 0.5;
        p = lo + mod(p - lo, uBox);
        p -= vel * uLen * aSeed.w;           // the tail end of the streak
        vFade = smoothstep(uGround - 0.2, uGround + 1.0, p.y) * (1.0 - smoothstep(0.35, 0.5, length((p.xz - uCam.xz) / uBox.xz)));
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
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
    }),
    fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aSeed;
      uniform float uTime, uGround, uScale;
      uniform vec3 uCam;
      varying float vLife;
      #include <fog_pars_vertex>
      void main() {
        float cycle = uTime * 2.5 + aSeed.z * 10.0;
        float k = floor(cycle);
        vLife = fract(cycle);
        // A new random spot every cycle, within 12 m of the camera.
        vec2 r = fract(aSeed.xy + vec2(0.618, 0.382) * k) - 0.5;
        vec3 p = vec3(uCam.x + r.x * 24.0, uGround + 0.02, uCam.z + r.y * 24.0);
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
        gl_FragColor = vec4(uColor, ring * (1.0 - vLife) * uOpacity * 0.9);
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

  let intensity = 1;
  let current = null;
  function setQuality(q) {
    checkQuality(q);
    current = q;
    applyCount();
    splashes.visible = q === 'high';
  }
  function applyCount() {
    geo.setDrawRange(0, Math.round(RAIN_COUNTS[current] * intensity) * 2);
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
    update(dt, elapsed) {
      uniforms.uTime.value = elapsed;
      uniforms.uCam.value.copy(camera.position);
    },
    setQuality,
    dispose() {
      scene.remove(group);
      geo.dispose(); mat.dispose(); sGeo.dispose(); sMat.dispose();
    },
  };
}
