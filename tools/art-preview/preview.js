// Dev-only preview: gameplay's real graybox (served from its branch) + art's four modules.
// It swaps gameplay's placeholder lights, floor material and instanced city for art's — exactly the
// swap the report asks gameplay to make — and exposes window.__art for scripted screenshots.
import * as THREE from 'three';
import { QUEST_STATE_LIST, WORLD_CHANGES } from '/echo/contracts.js';
import { createRenderer } from '/gameplay/echo/scene/renderer.js';
import { buildDistrict } from '/gameplay/echo/scene/district.js';
import { createPlayer } from '/gameplay/echo/scene/player.js';
import { createLighting } from '/echo/scene/lighting.js';
import { createRain } from '/echo/scene/rain.js';
import { createSkyline } from '/echo/scene/buildings.js';
import { createEffects } from '/echo/scene/effects.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const log = (msg) => { $('log').textContent = `${msg}\n${$('log').textContent}`.slice(0, 4000); console.log('[preview]', msg); };
if (params.has('nopanel')) $('panel').classList.add('hidden');

const { scene, camera, renderer } = createRenderer($('view'));
const district = buildDistrict(scene, { states: QUEST_STATE_LIST });
district.applyQuestState('FREE_ROAM_ALLEY', { instant: true });

// --- the swap gameplay is asked to make (here done by inspection, there by deleting code) ---
const gameplayLights = [];
scene.traverse((o) => { if (o.isLight) gameplayLights.push(o); });
gameplayLights.forEach((l) => l.parent.remove(l));
const gameplayCity = scene.children.filter((o) => o.isInstancedMesh);
gameplayCity.forEach((o) => scene.remove(o));

const quality = params.get('q') ?? 'med';
const lighting = createLighting({ scene, renderer, quality });
const wet = lighting.createWetGroundMaterial();
let floors = 0;
scene.traverse((o) => { if (o.isMesh && o.material?.color?.getHex() === 0x1f2a3c) { o.material = wet; floors++; } });
const rain = createRain({ scene, camera, quality });
// Gameplay's indoor volumes (from its relay.js / rooftop.js on gameplay-world-controller), as the
// boxes gameplay is asked to pass to rain.addShelter. Each spans floor to roof slab, wall to wall.
// The relay chamber is underground (vision §4.3: "a forgotten underground relay chamber"), so its box has no rain above it either.
const SHELTERS = {
  passage: { min: [-3.5, -1, -41.6], max: [3.5, 4.7, -26] },    // connector: roof slab y 4.4–4.7
  relay: { min: [-10, -1, -60], max: [10, 200, -41] },          // chamber shell, walls 10 m, no roof in graybox
  elevator: { min: [8.8, -1, -53.5], max: [17.2, 4.7, -46.5] }, // corridor: roof slab y 4.4–4.7
};
if (!params.has('noshelter')) Object.values(SHELTERS).forEach((b) => rain.addShelter(b));
const skyline = createSkyline({ scene, quality, sweepView: district.finalShot });

// Refs by position: the preview cannot edit gameplay's files, gameplay will pass these by name.
function findAt(x, y, z) {
  let hit = null;
  scene.traverse((o) => { if (!hit && o.isMesh && o.position.distanceTo(new THREE.Vector3(x, y, z)) < 0.06) hit = o; });
  return hit;
}
const objectiveTarget = new THREE.Object3D();
objectiveTarget.position.set(0, 0, -24.5);
scene.add(objectiveTarget);
const refs = {
  boothIndicator: findAt(5.1, 3.375, -11.5),
  corridorDoorStrip: district.doors.find((d) => d.id === 'door_alley')?.strip,
  objectiveTarget,
  conduit: findAt(-5.3, 0.03, -50),
  schematic: findAt(0, 4.5, -58.92),
  rooftopAccessLamp: findAt(13.5, 1.04, -52.4),
  socketLamp: findAt(21.5, 0.85, -57.48),
  skylineNode: findAt(62, 14, -78),
  capsule: findAt(29.6, 1.45, -43),
  vaultLamp: findAt(30.4, 1.325, -43),
};
const audioLog = [];
const audio = params.has('noaudio') ? null : { play: (cue) => { audioLog.push(cue); log(`audio.play(${cue})`); } };
const effects = createEffects({ scene, refs, audio, skyline, lighting, rain });
log(`floors→wet: ${floors}; refs found: ${Object.entries(refs).filter(([, v]) => v).length}/${Object.keys(refs).length}; gameplay lights removed: ${gameplayLights.length}; gameplay city removed: ${gameplayCity.length}`);

const VIEWS = {
  alley: { position: [1.2, 1.7, 3.5], target: [-0.6, 1.4, -14] },
  'alley-wide': { position: [-3.5, 2.6, 3.6], target: [2, 3.5, -22] },
  relay: { position: [6.5, 2.6, -43], target: [-3, 1.2, -56] },
  passage: { position: [0, 1.7, -27.6], target: [0, 1.5, -40] },
  elevator: { position: [16, 1.7, -50], target: [9, 1.5, -50] },
  follow: { position: [0.9, 2.3, -3.2], target: [0, 1.3, -14] }, // gameplay-like follow cam behind ?player
  rooftop: { position: [19, 2.4, -42], target: [36, 3, -58] },
  finalShot: district.finalShot,
};
let view = params.get('view') ?? 'alley';
let walk = params.has('walk');
function setView(name) {
  view = name;
  const v = VIEWS[name];
  camera.position.fromArray(v.position);
  camera.lookAt(new THREE.Vector3().fromArray(v.target));
}
setView(view);
// ?player puts gameplay's Rin where the follow camera would keep her, to judge her silhouette in rain.
if (params.has('player')) createPlayer(scene).group.position.set(0.3, 0, -7);

const systems = [lighting, rain, skyline, effects];
function setQuality(q) { systems.forEach((s) => s.setQuality(q)); $('q').value = q; }
setQuality(quality);
$('rm').checked = params.has('rm');
rain.setReducedMotion($('rm').checked);
$('rm').onchange = (e) => rain.setReducedMotion(e.target.checked);

// --- controls ---
$('q').onchange = (e) => setQuality(e.target.value);
$('view-sel').value = view;
$('view-sel').onchange = (e) => setView(e.target.value);
$('walk').checked = walk;
$('walk').onchange = (e) => { walk = e.target.checked; };
$('play').onclick = () => log(`playRestoration → ${JSON.stringify(skyline.playRestoration({ seconds: 5, reducedMotion: $('rm').checked }))}`);
$('reset').onclick = () => { effects.reset(); log('effects.reset()'); };
$('prog').oninput = (e) => skyline.setRestoration(Number(e.target.value));
for (const [state, ids] of Object.entries(WORLD_CHANGES)) {
  const row = document.createElement('div');
  row.textContent = `${state}: `;
  for (const id of ids) {
    const b = document.createElement('button');
    b.textContent = id;
    b.onclick = () => log(`apply(${id}) → ${JSON.stringify(effects.apply(id, { reducedMotion: $('rm').checked }))}`);
    row.appendChild(b);
  }
  $('ids').appendChild(row);
}
$('unknown').onclick = () => {
  try { effects.apply('city_lightning_wave'); log('NO THROW (bug)'); } catch (e) { log(`threw: ${e.message}`); }
};

// --- frame loop with FPS / draw-call / triangle readout ---
const clock = new THREE.Clock();
let elapsed = 0, frames = 0, acc = 0, fps = 0;
const stats = { fps: 0, calls: 0, triangles: 0, points: 0, lines: 0, frameMs: [] };
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  elapsed += dt;
  if (walk) {
    // A slow walk up the alley and back, so rain and reflections are measured with a moving camera.
    const z = 3 - 22 * (0.5 - 0.5 * Math.cos(elapsed * 0.25));
    camera.position.set(Math.sin(elapsed * 0.4) * 1.5, 1.7, z);
    camera.lookAt(camera.position.x * 0.5, 1.5, z - 10);
  }
  district.update(dt, elapsed);
  for (const s of systems) s.update(dt, elapsed);
  renderer.render(scene, camera);
  stats.calls = renderer.info.render.calls;
  stats.triangles = renderer.info.render.triangles;
  stats.lines = renderer.info.render.lines;
  stats.points = renderer.info.render.points;
  frames++; acc += dt;
  stats.frameMs.push(dt * 1000);
  if (stats.frameMs.length > 600) stats.frameMs.shift();
  if (acc >= 0.5) {
    fps = frames / acc; frames = 0; acc = 0; stats.fps = fps;
    $('stats').textContent = `fps ${fps.toFixed(1)}  dpr ${renderer.getPixelRatio()}  ${innerWidth}×${innerHeight}
draw calls ${stats.calls}  tris ${stats.triangles}
lines ${stats.lines}  points ${stats.points}  drops ${rain.drops}
restoration ${skyline.progress.toFixed(2)} ${skyline.playing ? 'playing' : ''}  applied ${effects.applied.length}/${effects.ids.length}`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__art = { THREE, scene, camera, renderer, district, lighting, rain, skyline, effects, refs, audioLog, stats, setView, setQuality, SHELTERS,
  setWalk: (w) => { walk = w; }, get elapsed() { return elapsed; } };
