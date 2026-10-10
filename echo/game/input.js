// Keyboard + mouse. Pointer lock is requested only while exploring (vision §3.1); when it is not
// available (denied, or a headless browser) dragging with the left button orbits instead.
const MOVE_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function capturesKeys(target) {
  if (!(target instanceof Element)) return false;
  return target.matches('input, select, textarea, [contenteditable=""], [contenteditable="true"]')
    || Boolean(target.closest('[data-captures-keys]'));
}

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered, cleared by consume()
  let dx = 0;
  let dy = 0;
  let dragging = false;
  const listeners = [];
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); listeners.push([target, type, fn, opts]); };

  on(window, 'keydown', (e) => {
    if (capturesKeys(e.target)) return;
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
    if (MOVE_CODES.has(e.code) || e.code === 'KeyE') e.preventDefault();
  });
  on(window, 'keyup', (e) => keys.delete(e.code));
  on(window, 'blur', () => { keys.clear(); dragging = false; });
  on(document, 'mousemove', (e) => {
    if (document.pointerLockElement === canvas || dragging) { dx += e.movementX || 0; dy += e.movementY || 0; }
  });
  on(canvas, 'mousedown', (e) => { if (e.button === 0) dragging = document.pointerLockElement !== canvas; });
  on(window, 'mouseup', () => { dragging = false; });

  return {
    held: (code) => keys.has(code),
    // True once per physical press.
    consume(code) { const had = pressed.has(code); pressed.delete(code); return had; },
    takeMouse() { const d = [dx, dy]; dx = 0; dy = 0; return d; },
    clear() { keys.clear(); pressed.clear(); dx = 0; dy = 0; dragging = false; },
    get locked() { return document.pointerLockElement === canvas; },
    lock() {
      if (document.pointerLockElement === canvas) return;
      try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => {}); } catch { /* drag fallback */ }
    },
    unlock() { if (document.pointerLockElement === canvas) document.exitPointerLock(); },
    on,
    dispose() { for (const [t, type, fn, opts] of listeners) t.removeEventListener(type, fn, opts); listeners.length = 0; },
  };
}
