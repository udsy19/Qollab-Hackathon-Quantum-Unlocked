// ECHO: ONE OF ONE — Qollab entry (vision §8.3 boot, §9 quest, §12.3 honest errors).
// Boot order: renderer and placeholder room → story-ui mounted into #echo-ui → gameplay's quest
// machine on the contracts.js tables, BOOT -BOOT_COMPLETE→ TITLE → the local Qiskit module
// calibrates in the background while the world already renders.
//
// Platform notes (https://qollab.xyz/learn/docs/runtime-environment, /js-qiskit-projects;
// vault/Research/qollab-js-runtime-internals.md):
// - Qollab compiles this file to CommonJS and runs it inside an AsyncFunction: no import.meta,
//   and `backend` is a parameter injected by the runtime. Never construct one here.
// - Bare names resolve to Python first (`quantum.cloning`); `three` comes from the import map.
// - Python is called with `.callPromising` only: a plain call stops the run with an XHR
//   ConnectionError on IonQ backends.
import * as THREE from 'three';
import { QUEST_STATES, QUEST_EVENTS, BUS_EVENTS, validateExperimentResult } from './contracts.js';
import { createEventBus } from './game/eventBus.js';
import { createQuestMachine } from './game/state.js';
import { mountMenu } from './ui/menu.js';
import { mountHud } from './ui/hud.js';
import { mountDialogue } from './ui/dialogue.js';
import { defaultSettings } from './ui/accessibility.js';
import * as cloning from 'quantum.cloning';
import * as qollabJob from 'quantum.qollab_job';

// Visible provenance token: change it, reload, and read it back from the served page.
const BUILD = 'shell-2026-10-10a';

const $ = (id) => document.getElementById(id);
$('echo-build').textContent = BUILD;
$('echo-backend').textContent = String(backend.name);
console.log(`ECHO build ${BUILD} on backend ${backend.name}`);

// Pyodide turns a Python dict into a JS Map by default; contracts.validateExperimentResult
// rejects a Map, so every bridge result is converted with plain objects.
const toPlain = (proxy) => proxy.toJs({ dict_converter: Object.fromEntries });

// ---- renderer and placeholder room (until gameplay ships scene/ and the controller) ----------
// §12.1/§12.2: pixel ratio capped 1.0 / 1.5 / 1.75, shadows only above low. Game logic and
// readability are identical in every mode.
const QUALITY = {
  low: { maxPixelRatio: 1, shadows: false },
  med: { maxPixelRatio: 1.5, shadows: true },
  high: { maxPixelRatio: 1.75, shadows: true },
};

function startWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070f);
  scene.fog = new THREE.Fog(0x05070f, 10, 26);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  const home = { pos: new THREE.Vector3(0, 2.2, 7.5), look: new THREE.Vector3(0, 1, 0) };

  scene.add(new THREE.HemisphereLight(0x6fa8ff, 0x0b0b18, 0.5));
  const key = new THREE.DirectionalLight(0xffd6f0, 1.6);
  key.position.set(-4, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const neon = new THREE.PointLight(0x19d6ff, 25, 14);
  neon.position.set(3, 2.5, -2);
  scene.add(neon);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x151c2b, roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 0.4), new THREE.MeshStandardMaterial({ color: 0x0e1422, roughness: 0.9 }));
  wall.position.set(0, 3, -4);
  wall.receiveShadow = true;
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.5 }));
  crate.position.set(-1.6, 0.7, 0.5);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.6, 24),
    new THREE.MeshStandardMaterial({ color: 0x0b3a4a, emissive: 0x19d6ff, emissiveIntensity: 0.6 }));
  pillar.position.set(1.8, 1.3, 0);
  for (const m of [crate, pillar]) { m.castShadow = true; m.receiveShadow = true; }
  scene.add(floor, wall, crate, pillar);

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);

  function setQuality(name) {
    const q = QUALITY[name];
    if (!q) throw new TypeError(`unknown quality ${JSON.stringify(name)}`);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.maxPixelRatio));
    renderer.shadowMap.enabled = q.shadows;
    // Materials compiled without shadow maps must recompile to pick the change up.
    scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    resize();
    $('echo-render').textContent = `quality ${name} · pixel ratio ${renderer.getPixelRatio()} · shadows ${q.shadows ? 'on' : 'off'}`;
  }

  function resetCamera() {
    camera.position.copy(home.pos);
    camera.lookAt(home.look);
  }
  resetCamera();

  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.1); // bounded step
    last = now;
    // story-ui's applySettings writes data-reduced-motion on the UI root (accessibility.js).
    if ($('echo-ui').dataset.reducedMotion !== 'on') pillar.rotation.y += dt * 0.6;
    frameHooks.forEach((fn) => fn(dt));
    renderer.render(scene, camera);
  });
  return { setQuality, resetCamera };
}
const frameHooks = [];

// ---- audio stub: volume is routed now, art's game/audio.js replaces the body later -------------
const audio = {
  volume: 0,
  setVolume(percent) { this.volume = percent / 100; },
  reset() {},
};

// ---- boot ---------------------------------------------------------------------------------------
let world;
try {
  world = startWorld($('echo-canvas'));
} catch (err) {
  // §12.3: WebGL failure gets a readable screen, not a blank page.
  $('echo-quest').textContent = 'stopped';
  $('echo-ui').textContent = `This browser could not start WebGL, which ECHO needs (${err}). Try a current Chrome, Edge or Firefox.`;
  throw err;
}

const uiRoot = $('echo-ui');
const settings = defaultSettings();
const hud = mountHud(uiRoot);
const dialogue = mountDialogue(uiRoot);
const bus = createEventBus();
const machine = createQuestMachine(bus);

function applySetting(s, key) {
  if (key === null || key === 'quality') world.setQuality(s.quality);
  if (key === null || key === 'volume') audio.setVolume(s.volume);
}

const menu = mountMenu(uiRoot, {
  settings,
  onChange: applySetting,
  onStart: () => machine.send(QUEST_EVENTS.START),
  // §9.5: the machine's resetGame() emits QUEST_STATE_CHANGED to TITLE; the listener below
  // restores camera, audio, dialogue and UI from that one event.
  onRestart: () => machine.resetGame(),
});
applySetting(menu.getSettings(), null);

// Movement and the camera never hold the mouse while a menu or dialogue owns the screen.
frameHooks.push(() => {
  if ((menu.isOpen() || dialogue.active) && document.pointerLockElement) document.exitPointerLock();
});

bus.on(BUS_EVENTS.QUEST_STATE_CHANGED, ({ from, to, event }) => {
  $('echo-quest').textContent = event ? `${from} —${event}→ ${to}` : `${from} → ${to} (reset)`;
  console.log(`quest: ${from} -${event ?? 'reset'}-> ${to}`);
  hud.setVisible(to !== QUEST_STATES.TITLE);
  if (to === QUEST_STATES.TITLE) {
    if (event === null) { dialogue.clear(); world.resetCamera(); audio.reset(); }
    menu.showTitle();
  }
});

$('echo-quest').textContent = machine.state;
const booted = machine.send(QUEST_EVENTS.BOOT_COMPLETE);
if (!booted.ok) throw new Error(`boot: quest machine refused BOOT_COMPLETE (${booted.reason})`);

// ---- one job on the selected backend ----------------------------------------------------------
// IonQ backends reject a second backend.run in a run, and a rejected job stops the run. The guard
// is claimed BEFORE the first await, so a double click cannot slip a second job past it.
// backend.run is called from JS, not inside Python: Qollab's job accounting and the local runner's
// counter both sit on the JS backend proxy. The circuit and the reading of its counts are the
// quantum lane's (quantum/qollab_job.py).
// TODO(quantum): replace with verifySelectedBackendOnce from quantum/bridge.js once it exists.
let backendJobUsed = false;
async function verifyOnBackend() {
  const status = $('echo-verify-status');
  if (backendJobUsed) {
    status.textContent = 'Refused: this run has already used its one selected-backend job. Press Stop, then Run, to send another.';
    console.log('verify: refused a second backend job (guard)');
    return;
  }
  backendJobUsed = true;
  status.textContent = `Verifying on selected backend ${backend.name}…`;
  try {
    const circuit = await qollabJob.build_bell_verification_circuit.callPromising();
    const job = await backend.run(circuit, { shots: qollabJob.DEFAULT_SHOTS });
    const counts = (await job.result()).get_counts();
    const result = toPlain(await qollabJob.interpret_counts.callPromising(counts, String(backend.name), qollabJob.DEFAULT_SHOTS));
    $('echo-verify-out').textContent = JSON.stringify({ engine: result.engine, counts: result.counts, keyQubits: result.keyQubits }, null, 1);
    const errors = validateExperimentResult(result);
    status.textContent = errors.length
      ? `1 job done, but its result breaks the shared contract: ${errors.join('; ')}`
      : `Done: 1 job on ${backend.name}. A second press will be refused.`;
    $('echo-verify').textContent = 'Verified (1 of 1 job used)';
  } catch (err) {
    // §8.6 step 5: honest unavailability, never an invented result.
    status.textContent = `Quantum backend verification unavailable (${err}); the circuits are still validated locally.`;
    console.error(`backend job failed: ${err}`);
  }
}
$('echo-verify').addEventListener('click', verifyOnBackend);
$('echo-verify').disabled = false;

// ---- local Qiskit module: calibrate while the world renders (§12.3) ---------------------------
try {
  const r = toPlain(await cloning.run_calibration.callPromising('plus'));
  const errors = validateExperimentResult(r);
  if (errors.length) throw new Error(`cloning.run_calibration broke the shared contract: ${errors.join('; ')}`);
  $('echo-quantum').textContent =
    `Quantum module ready (exact local Qiskit). Copy test on |+>: overlap with two copies ` +
    `${r.observables.jointFidelityWithTwoCopies.toFixed(6)}, each output purity ${r.observables.purityQ0.toFixed(6)}.`;
  console.log(`bridge: ${JSON.stringify(r.observables)}`);
} catch (err) {
  $('echo-quantum').textContent = `Scientific module error in quantum.cloning.run_calibration: ${err}`;
  console.error(`bridge failed: ${err}`);
}
