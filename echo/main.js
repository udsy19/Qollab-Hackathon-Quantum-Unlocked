// ECHO: ONE OF ONE — G0 platform smoke entry.
// Proves the three things every later gate stands on: a Three.js scene, a real
// local-Qiskit result reached through the Python bridge, and exactly one job on
// the backend chosen in Qollab's Select QPU dialog.
//
// Platform notes (https://qollab.xyz/learn/docs/runtime-environment, /js-qiskit-projects):
// - `three` is importable by bare name; Python modules by dotted name.
// - `backend` is injected by the runtime; never construct one here.
// - Python functions must be called with `.callPromising` — a plain call stops
//   the run with an XHR ConnectionError on IonQ backends.
import * as THREE from 'three';
import * as smoke from 'quantum.smoke';

// Visible provenance token: change it, reload, and read it back from the page.
const BUILD = 'g0-smoke-2026-10-10a';

const $ = (id) => document.getElementById(id);
$('build-token').textContent = BUILD;
$('backend-name').textContent = String(backend.name);
console.log(`ECHO G0 smoke build ${BUILD} on backend ${backend.name}`);

// Pyodide turns a Python dict into a JS Map by default; ask for a plain object
// so JSON.stringify and property access work.
const toPlain = (proxy) => proxy.toJs({ dict_converter: Object.fromEntries });

// ---- 1. Three.js scene -------------------------------------------------------
function startScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070f);
  scene.fog = new THREE.Fog(0x05070f, 8, 22);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(3.2, 2.4, 4.4);
  camera.lookAt(0, 0.6, 0);

  scene.add(new THREE.HemisphereLight(0x6fa8ff, 0x0b0b18, 0.6));
  const key = new THREE.PointLight(0xff3fa4, 30, 20);
  key.position.set(-2.5, 3, 2);
  scene.add(key);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x0b3a4a, emissive: 0x19d6ff, emissiveIntensity: 0.9, roughness: 0.35 }),
  );
  cube.position.y = 1;
  scene.add(cube);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  scene.add(new THREE.GridHelper(30, 30, 0x2a3f66, 0x16223a));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.1); // bounded step
    last = now;
    if (!reduceMotion) {
      cube.rotation.y += dt * 0.8;
      cube.rotation.x += dt * 0.3;
    }
    renderer.render(scene, camera);
  });
}

// ---- 2. Local Qiskit through the Python bridge ------------------------------
async function showBridgeResult() {
  const out = $('bridge-out');
  try {
    const result = toPlain(await smoke.bell_probabilities.callPromising());
    out.textContent = JSON.stringify(result, null, 2);
    console.log(`bridge: ${JSON.stringify(result)}`);
  } catch (err) {
    out.textContent = `Python bridge failed: ${err}`;
    console.error(`bridge failed: ${err}`);
  }
}

// ---- 3. Exactly one job on the selected backend -----------------------------
// IonQ backends reject a second backend.run in the same run, and a rejected job
// stops the run. The guard is claimed BEFORE the first await, so a double click
// cannot slip a second job past it.
let backendJobUsed = false;

async function verifyOnBackend() {
  const status = $('verify-status');
  if (backendJobUsed) {
    status.className = 'refused';
    status.textContent =
      'Refused: this run has already used its one selected-backend job. ' +
      'Press Stop, then Run, to send another.';
    console.log('verify: refused a second backend job (guard)');
    return;
  }
  backendJobUsed = true;
  status.className = '';
  status.textContent = `Sending 1 job to ${backend.name}…`;
  try {
    const circuit = await smoke.bell_measure_circuit.callPromising();
    const job = await backend.run(circuit, { shots: 256 });
    const counts = toPlain((await job.result()).get_counts());
    const shots = Object.values(counts).reduce((a, b) => a + b, 0);
    $('backend-out').textContent = JSON.stringify(
      { kind: 'sampled_counts', backend: String(backend.name), shots, counts },
      null,
      2,
    );
    status.className = 'ok';
    status.textContent = `Done: 1 job, ${shots} shots on ${backend.name}. A second press will be refused.`;
    $('verify-btn').textContent = 'Verified (1 of 1 job used)';
    console.log(`backend counts: ${JSON.stringify(counts)}`);
  } catch (err) {
    status.className = 'error';
    status.textContent = `Backend job failed: ${err}`;
    console.error(`backend job failed: ${err}`);
  }
}

startScene($('scene'));
$('verify-btn').addEventListener('click', verifyOnBackend);
$('verify-btn').disabled = false;
await showBridgeResult();
