import * as THREE from 'three';

// Renderer + scene + camera, sized to `root`. DPR capped at 1.5 (vision §12.1).
export function createRenderer(root, { maxPixelRatio = 1.5 } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b12);
  scene.fog = new THREE.FogExp2(0x070b12, 0.011);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.display = 'block';
  renderer.domElement.tabIndex = 0;
  root.appendChild(renderer.domElement);

  function resize() {
    const w = Math.max(root.clientWidth, 1);
    const h = Math.max(root.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  function dispose() {
    window.removeEventListener('resize', resize);
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { scene, camera, renderer, canvas: renderer.domElement, resize, dispose };
}
