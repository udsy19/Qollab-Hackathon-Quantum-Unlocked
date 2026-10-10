// echo/scene/buildings.js — Nacre City's skyline (vision §5.5, §9.3, §11.2).
// One InstancedMesh holds every tower in three depth layers (near / mid / far); windows are drawn in the
// shader from each tower's size, so there are no window meshes. A horizon haze cylinder hides the map
// edge. The commit-time restoration lights the city left to right AS SEEN FROM `sweepView` (by default
// gameplay's final skyline shot), so the wave reads left-to-right on screen, not along a world axis.
//
// Superset of the instanced city in gameplay's rooftop.js (same idea: instanced bodies, rooftop-facing
// light, fog-resistant windows, kept-clear playable district), so gameplay can delete that one.
import * as THREE from 'three';
import { DEFAULT_SETTINGS } from '../contracts.js';
import { checkQuality, PALETTE } from './lighting.js';

// Depth layers: distance band (metres outside the footprint), tower count, height range of the roof
// line relative to y = 0 (the walkable level). Far towers are taller so they show above near ones.
const LAYERS = [
  { name: 'near', from: 20, to: 70, count: 110, top: [-22, 26], width: [7, 15] },
  { name: 'mid', from: 70, to: 150, count: 130, top: [-5, 55], width: [10, 22] },
  { name: 'far', from: 150, to: 240, count: 150, top: [15, 110], width: [14, 30] },
];
// Warm-dominant: cyan is the quantum colour (§5.3), so it is rare in the city at large.
const LIT_COLORS = [PALETTE.amber, PALETTE.porcelain, PALETTE.amber, 0xd8c9a8, PALETTE.porcelain, PALETTE.cyan];
const FEATHER = 0.08; // width of the wave front, as a fraction of the sweep

export const DEFAULT_SWEEP_VIEW = Object.freeze({ position: [25, 4.2, -45], target: [80, 4, -95] }); // district.finalShot

export function createSkyline({
  scene,
  seed = 7,
  footprint = { minX: -14, maxX: 44, minZ: -64, maxZ: 10 }, // the playable district, kept clear
  sweepView = DEFAULT_SWEEP_VIEW,
  quality = DEFAULT_SETTINGS.quality,
} = {}) {
  if (!scene) throw new TypeError('createSkyline: scene is required');
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const range = ([a, b]) => a + rnd() * (b - a);
  const cx = (footprint.minX + footprint.maxX) / 2;
  const cz = (footprint.minZ + footprint.maxZ) / 2;
  const halfW = (footprint.maxX - footprint.minX) / 2;
  const halfD = (footprint.maxZ - footprint.minZ) / 2;

  // Place towers on rings around the footprint's rectangle (distance measured from its edge).
  const towers = [];
  LAYERS.forEach((layer, li) => {
    let guard = 0;
    while (towers.filter((t) => t.layer === li).length < layer.count && guard++ < layer.count * 50) {
      const ang = rnd() * Math.PI * 2;
      const dist = range([layer.from, layer.to]);
      const dx = Math.cos(ang), dz = Math.sin(ang);
      // Distance from the rectangle's edge along this ray.
      const tEdge = Math.min(halfW / Math.max(Math.abs(dx), 1e-6), halfD / Math.max(Math.abs(dz), 1e-6));
      const x = cx + dx * (tEdge + dist);
      const z = cz + dz * (tEdge + dist);
      const w = range(layer.width), d = range(layer.width);
      if (x + w / 2 > footprint.minX && x - w / 2 < footprint.maxX && z + d / 2 > footprint.minZ && z - d / 2 < footprint.maxZ) continue;
      const top = range(layer.top);
      towers.push({ x, z, w, d, top, h: top + 90, layer: li, seed: rnd(), lit: LIT_COLORS[Math.floor(rnd() * LIT_COLORS.length)] });
    }
  });

  // Sweep coordinate: the tower's horizontal angle as seen from the sweep camera, normalised over the
  // towers in front of it, so 0 is the left edge of that shot and 1 the right.
  const eye = new THREE.Vector3().fromArray(sweepView.position);
  const fwd = new THREE.Vector3().fromArray(sweepView.target).sub(eye).setY(0).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const angles = towers.map((t) => {
    const v = new THREE.Vector3(t.x - eye.x, 0, t.z - eye.z);
    return Math.atan2(v.dot(right), v.dot(fwd));
  });
  const inView = angles.filter((a) => Math.abs(a) < Math.PI / 2);
  const aMin = Math.min(...inView), aMax = Math.max(...inView);
  towers.forEach((t, i) => { t.sweep = THREE.MathUtils.clamp((angles[i] - aMin) / (aMax - aMin), 0, 1); });

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const aSize = new Float32Array(towers.length * 3);
  const aInfo = new Float32Array(towers.length * 3); // sweep, seed, layer
  const aLit = new Float32Array(towers.length * 3);
  const c = new THREE.Color();
  const mesh = new THREE.InstancedMesh(geo, null, towers.length);
  const m = new THREE.Matrix4();
  towers.forEach((t, i) => {
    m.makeScale(t.w, t.h, t.d).setPosition(t.x, t.top - t.h / 2, t.z);
    mesh.setMatrixAt(i, m);
    aSize.set([t.w, t.h, t.d], i * 3);
    aInfo.set([t.sweep, t.seed, t.layer], i * 3);
    c.set(t.lit);
    aLit.set([c.r, c.g, c.b], i * 3);
  });
  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(aSize, 3));
  geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(aInfo, 3));
  geo.setAttribute('aLit', new THREE.InstancedBufferAttribute(aLit, 3));

  const uniforms = {
    uProgress: { value: 0 },  // wave position, 0..1
    uFade: { value: 0 },      // reduced-motion crossfade, 0..1 (used instead of the wave)
    uCrossfade: { value: 0 }, // 1 = crossfade mode
    uTime: { value: 0 },
    uTwinkle: { value: 1 },
  };
  const mat = new THREE.MeshLambertMaterial({ color: 0x1b2638 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec3 aSize; attribute vec3 aInfo; attribute vec3 aLit;
varying vec3 vLocal; varying vec3 vSize; varying vec3 vInfo; varying vec3 vLitCol; varying vec3 vObjN;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vLocal = position; vSize = aSize; vInfo = aInfo; vLitCol = aLit; vObjN = normal;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uProgress, uFade, uCrossfade, uTime, uTwinkle;
varying vec3 vLocal; varying vec3 vSize; varying vec3 vInfo; varying vec3 vLitCol; varying vec3 vObjN;
float skyHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }
float skyWin;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
skyWin = 0.0;
{
  // Facade coordinates in metres: windows on the four walls, none on the roof.
  bool side = abs(vObjN.y) < 0.5;
  vec2 f = abs(vObjN.x) > 0.5 ? vec2(vLocal.z * vSize.z, vLocal.y * vSize.y) : vec2(vLocal.x * vSize.x, vLocal.y * vSize.y);
  vec2 cell = vec2(2.4, 3.4);
  vec2 id = floor(f / cell);
  vec2 g = fract(f / cell);
  float pane = step(0.18, g.x) * step(g.x, 0.82) * step(0.3, g.y) * step(g.y, 0.8);
  float h = skyHash(id + vInfo.y * 97.0 + vObjN.xz * 13.0);
  float occupied = step(0.55, h);
  float level = 0.35 + 0.65 * fract(h * 7.31);
  // Restoration: the wave front passes this tower at vInfo.x; reduced motion fades all at once.
  float wave = clamp((uProgress * (1.0 + 2.0 * ${FEATHER}) - ${FEATHER} - vInfo.x) / ${FEATHER} + 0.5, 0.0, 1.0);
  float lit = mix(wave, uFade, uCrossfade);
  float flick = 1.0 - uTwinkle * 0.25 * step(0.97, skyHash(id + floor(uTime * 0.7 + h * 10.0)));
  // Before restoration a blackout city: a few dim emergency windows only.
  float dark = step(0.94, h) * 0.06;
  skyWin = side ? pane * occupied * level * mix(dark, 1.0, lit) * flick : 0.0;
  // A thin crown strip on every tower: the facade-strip idea from gameplay's rooftop city.
  float crown = side ? step(0.5 - 1.2 / vSize.y, vLocal.y) * step(vLocal.y, 0.5 - 0.6 / vSize.y) : 0.0;
  skyWin = max(skyWin, crown * lit * 0.9);
  totalEmissiveRadiance += vLitCol * skyWin * mix(0.75, 1.1, vInfo.z * 0.5) + vec3(0.9, 0.25, 0.2) * crown * (1.0 - lit) * step(0.85, h) * 0.5;
}`)
      // Windows punch through the fog so the wave reads across the whole city; walls fog normally.
      .replace('#include <fog_fragment>', `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  fogFactor *= 1.0 - 0.5 * clamp(skyWin, 0.0, 1.0);
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`);
  };
  mat.customProgramCacheKey = () => 'echo-skyline';
  mesh.material = mat;
  mesh.name = 'skyline';
  mesh.frustumCulled = false; // instances span the whole map; the bounding sphere of one box is wrong

  // Horizon haze: an open cylinder whose gradient glows faintly at the horizon line, so the last
  // layer of towers dissolves into light instead of ending at a hard edge.
  const hazeR = Math.max(halfW, halfD) + LAYERS[2].to + 30; // inside gameplay's 400 m camera far plane
  const haze = new THREE.Mesh(
    new THREE.CylinderGeometry(hazeR, hazeR, 400, 32, 1, true),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uGlow: { value: 0 }, uLow: { value: new THREE.Color(0x24344f) }, uHigh: { value: new THREE.Color(PALETTE.graphite) }, uWarm: { value: new THREE.Color(0x3a2a2a) } },
      vertexShader: 'varying float vY; void main() { vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uLow, uHigh, uWarm; uniform float uGlow; varying float vY;
        void main() {
          float t = smoothstep(-40.0, 140.0, vY);
          vec3 col = mix(uLow, uHigh, t);
          col += uWarm * uGlow * (1.0 - smoothstep(-30.0, 80.0, vY));
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  haze.position.set(cx, 40, cz);
  haze.renderOrder = -1;
  haze.name = 'skyline-haze';

  const group = new THREE.Group();
  group.name = 'skyline-group';
  group.add(haze, mesh);
  scene.add(group);

  // Restoration state machine: idle → playing → done. Deterministic: progress depends only on time
  // since play() and the duration. Idempotent: play() while playing or done changes nothing.
  const state = { progress: 0, playing: false, seconds: 5, reducedMotion: false };
  function render() {
    const p = state.progress;
    uniforms.uProgress.value = p;
    uniforms.uFade.value = p;
    uniforms.uCrossfade.value = state.reducedMotion ? 1 : 0;
    haze.material.uniforms.uGlow.value = p;
  }

  function setRestoration(progress) {
    if (!Number.isFinite(progress)) throw new TypeError(`setRestoration: progress must be a number, got ${progress}`);
    state.progress = THREE.MathUtils.clamp(progress, 0, 1);
    state.playing = false;
    render();
  }

  function playRestoration({ direction = 'left-to-right', seconds = 5, reducedMotion = false } = {}) {
    if (direction !== 'left-to-right') throw new TypeError(`playRestoration: only 'left-to-right' is supported, got ${JSON.stringify(direction)}`);
    if (!(seconds > 0)) throw new TypeError(`playRestoration: seconds must be > 0, got ${seconds}`);
    if (state.progress >= 1) return { started: false, reason: 'already restored' };
    if (state.playing) return { started: false, reason: 'already playing' };
    // §11.2: reduced motion crossfades instead of sweeping (shorter, no travelling edge).
    Object.assign(state, { playing: true, seconds: reducedMotion ? Math.min(seconds, 2) : seconds, reducedMotion });
    render();
    return { started: true, reason: null };
  }

  let current = null;
  function setQuality(q) {
    checkQuality(q);
    current = q;
    uniforms.uTwinkle.value = q === 'low' ? 0 : 1; // same towers and windows in every preset
  }
  setQuality(quality);
  render();

  return {
    group, mesh, haze, towers: towers.length,
    get quality() { return current; },
    get progress() { return state.progress; },
    get playing() { return state.playing; },
    setRestoration,
    playRestoration,
    update(dt, elapsed) {
      uniforms.uTime.value = elapsed;
      if (!state.playing) return;
      state.progress = Math.min(1, state.progress + dt / state.seconds);
      if (state.progress >= 1) state.playing = false;
      render();
    },
    setQuality,
    dispose() {
      scene.remove(group);
      geo.dispose(); mat.dispose(); haze.geometry.dispose(); haze.material.dispose();
    },
  };
}
