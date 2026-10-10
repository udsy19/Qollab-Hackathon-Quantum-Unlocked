// DEV-ONLY preview for the art lane's props and audio. URL params:
//   ?view=lineup (default) | booth | relay | mast | quantum | classical | kiosk | slogan | shelter | holo | arrow | tram
//   &dist=10    camera distance for a single-prop view (metres, eye height 1.6)
//   &q=low|med|high   &state=before|after   &shot=1 (hide UI, fixed-step frames, sets window.__ready)
//   ?view=drawcalls  → JSON of draw calls / triangles per prop per quality in #out
import * as THREE from 'three';
import * as P from '../../echo/scene/props.js';
import { createAudio, AUDIO_ZONES, CUE_IDS } from '../../echo/game/audio.js';

const qs = new URLSearchParams(location.search);
const view = qs.get('view') ?? 'lineup';
const shot = qs.has('shot');
if (shot) document.body.classList.add('shot');

const root = document.getElementById('root');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);
const scene = new THREE.Scene();
// Same background and fog as gameplay's renderer.js, so readability is judged in game conditions.
scene.background = new THREE.Color(0x070b12);
scene.fog = new THREE.FogExp2(0x070b12, 0.011);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
scene.add(new THREE.HemisphereLight(0x8aa6d6, 0x1a1e2e, 1.6));
const key = new THREE.DirectionalLight(0xb4c8ff, 1.0);
key.position.set(-20, 40, 15);
scene.add(key);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x1f2a3c, roughness: 0.4, metalness: 0.3 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// ------------------------------------------------------------------ build

const FACTORIES = {
  booth: () => P.createBooth(),
  relay: () => P.createRelayCore(),
  mast: () => P.createMast(),
  quantum: () => P.createConsole('quantum'),
  classical: () => P.createConsole('classical'),
  kiosk: () => P.createKiosk(),
  slogan: () => P.createSloganBillboard({ poleHeight: 3 }),
  shelter: () => P.createShelterBillboard({ poleHeight: 1.2 }),
  holo: () => P.createHoloSign({ lines: [{ text: 'PALISADE', size: 1.2 }, { text: 'EVERY COPY PERFECT', size: 0.6 }] }),
  holo2: () => P.createHoloSign({ lines: [{ text: 'MIRROR NOTICE', size: 0.8 }, { text: 'GRID ISOLATION · DISTRICT 9', size: 0.6 }], color: 0xe96b68, width: 2.2, height: 0.8 }),
  arrow: () => P.createGuideArrow(),
  tram: () => P.createTram({ from: [-60, 9, -70], to: [60, 9, -70] }),
  cyan: () => P.createConduit([[-3, 0.08, 3.2], [3, 0.08, 4.5], [10, 0.08, 4.5], [15.4, 0.6, 1.2], [15.6, 2.5, 0.4]], 'cyan'),
  amber: () => P.createConduit([[11.5, 0.5, 0.5], [12.5, 0.08, 2.5], [14.5, 0.08, 3.0], [16.4, 0.9, 0.7]], 'amber'),
};
const LINEUP = {
  kiosk: [-27, 0, 0], booth: [-20, 0, 0], holo: [-14, 0.2, 1], holo2: [-14, 1.5, -1], relay: [0, 0, 0],
  quantum: [9, 0, 2], classical: [11.5, 0, 0], mast: [16, 0, 0], arrow: [3, 0, 7],
  slogan: [-13, 0, -14], shelter: [9, 0, -12], tram: [0, 0, 0], cyan: [0, 0, 0], amber: [0, 0, 0],
};

const props = {};
function add(name, pos = [0, 0, 0], rotY = 0) {
  const p = FACTORIES[name]();
  p.object3D.position.set(...pos);
  p.object3D.rotation.y = rotY;
  scene.add(p.object3D);
  props[name] = p;
  return p;
}

function setWorld(after) {
  props.booth?.refs.setIndicator(after ? 0 : 1);
  props.relay?.refs.setEnergized(after);
  props.cyan?.refs.setLit(after);
  props.amber?.refs.setLit(after);
  props.mast?.refs.setLinkActive(after);
  props.classical?.refs.setRepaired(after);
  props.quantum?.refs.setCapsuleActive(!after);
  props.quantum?.refs.setVaultGreen(after);
  props.shelter?.refs.setState(after ? 'restored' : 'unknown');
  if (props.arrow) props.arrow.object3D.visible = true;
}

function setQuality(q) { for (const p of Object.values(props)) p.setQuality(q); }

// ------------------------------------------------------------------ draw-call census

function drawcalls() {
  const out = {};
  ground.visible = false;
  for (const name of Object.keys(FACTORIES)) {
    out[name] = {};
    for (const q of ['low', 'med', 'high']) {
      const p = FACTORIES[name]();
      p.setQuality(q);
      scene.add(p.object3D);
      // Fit the camera to the prop so frustum culling keeps every part.
      const box = new THREE.Box3().setFromObject(p.object3D);
      const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length();
      camera.position.copy(c).add(new THREE.Vector3(0, r * 0.3, r * 1.6));
      camera.lookAt(c);
      camera.far = r * 10 + 100;
      camera.updateProjectionMatrix();
      renderer.info.autoReset = true;
      renderer.render(scene, camera);
      out[name][q] = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
      p.dispose();
    }
  }
  ground.visible = true;
  document.getElementById('out').textContent = JSON.stringify(out);
  window.__ready = true;
}

// ------------------------------------------------------------------ scene

let target = new THREE.Vector3(0, 4, 0);
if (view === 'drawcalls') {
  resize();
  drawcalls();
} else {
  if (view === 'lineup') {
    for (const [name, pos] of Object.entries(LINEUP)) add(name, pos);
    camera.position.set(-4, 7, 30);
    target.set(-4, 4, 0);
  } else {
    const p = add(view === 'holo' ? 'holo' : view);
    if (view === 'relay') { add('cyan'); }
    if (view === 'mast') { add('amber'); props.amber.object3D.position.x = -16; }
    const box = new THREE.Box3().setFromObject(p.object3D);
    const c = box.getCenter(new THREE.Vector3());
    const dist = Number(qs.get('dist') ?? 10);
    const az = Number(qs.get('az') ?? 0.45);
    camera.position.set(Math.sin(az) * dist, 1.6, Math.cos(az) * dist);
    target.set(0, Math.min(c.y, 1.6 + dist * 0.55), 0);
  }
  setQuality(qs.get('q') ?? 'med');
  setWorld(qs.get('state') === 'after');
  if (view !== 'lineup' && props.arrow) props.arrow.object3D.visible = true;
  resize();
  if (shot) {
    // Fixed-step frames: the screenshot shows the eased end state, independent of wall-clock speed.
    for (let i = 0; i < 80; i++) for (const p of Object.values(props)) p.update(1 / 20);
    camera.lookAt(target);
    renderer.render(scene, camera);
    window.__calls = renderer.info.render.calls;
    window.__ready = true;
  } else {
    requestAnimationFrame(loop);
  }
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

let last = performance.now();
let frames = 0, acc = 0, fps = 0, orbit = 0;
const statsEl = document.getElementById('stats');
function loop() {
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  for (const p of Object.values(props)) p.update(dt);
  if (view === 'lineup') {
    orbit += dt * 0.05;
    camera.position.set(-4 + Math.sin(orbit) * 30, 7, Math.cos(orbit) * 30);
  }
  camera.lookAt(target);
  renderer.render(scene, camera);
  frames++; acc += dt;
  if (acc > 0.5) { fps = frames / acc; frames = 0; acc = 0; }
  statsEl.textContent = `FPS ${fps.toFixed(0)}  draw calls ${renderer.info.render.calls}  tris ${renderer.info.render.triangles}`;
  requestAnimationFrame(loop);
}

// ------------------------------------------------------------------ controls

const sel = document.getElementById('quality');
sel.value = qs.get('q') ?? 'med';
sel.onchange = () => setQuality(sel.value);
document.getElementById('world').onclick = () => setWorld(true);
document.getElementById('reset').onclick = () => { setWorld(false); audio.reset(); };

const caption = document.getElementById('caption');
const audio = createAudio({ onCue: (id) => { caption.textContent = `[${id}]`; } });
window.__audio = audio;
document.getElementById('unlock').onclick = async () => {
  await audio.unlock();
  document.getElementById('unlock').textContent = audio.unlocked ? 'Audio on' : 'Audio unavailable';
};
const vol = document.getElementById('volume');
vol.oninput = () => audio.setVolume(Number(vol.value));
for (const z of AUDIO_ZONES) {
  const b = document.createElement('button');
  b.textContent = `zone: ${z}`;
  b.onclick = () => audio.setZone(z);
  document.getElementById('zones').appendChild(b);
}
for (const id of CUE_IDS) {
  const b = document.createElement('button');
  b.textContent = id;
  b.onclick = () => audio.play(id);
  document.getElementById('cues').appendChild(b);
}
