// Keyboard + mouse + frame focus (vision §3.1, §6.6; input.js in §8.2).
// Qollab runs the project in <iframe sandbox="allow-scripts">: origin null, NO pointer lock, never
// auto-focused (platform report 0005, from Qollab's /_nuxt/BWPMdZ7B.js). So the camera's primary path
// is a mouse DRAG with any button held, plus ←/→. requestPointerLock() is only an optional extra for a
// top-level page, and is not asked again once refused. Keys reach a frame only after a click inside
// it, so a focus overlay covers the frame until it has focus and returns on every blur or hidden tab;
// held keys and drags are released then, so none can stick.
const MOVE_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

// The overlay's words, in one place: story-ui owns the final copy.
export const FOCUS_OVERLAY_TEXT = Object.freeze({
  title: 'Click to play',
  hint: 'Click anywhere here so the game can hear your keyboard. WASD move · drag to look · ← → turn · E interact · Esc pause',
});

function capturesKeys(target) {
  if (!(target instanceof Element)) return false;
  return target.matches('input, select, textarea, [contenteditable=""], [contenteditable="true"]')
    || Boolean(target.closest('[data-captures-keys]'));
}

// Styled inline: main.css is story-ui's, and the overlay must work before any stylesheet loads.
function createFocusOverlay(parent) {
  const el = document.createElement('button');
  el.type = 'button';
  el.dataset.focusOverlay = '';
  el.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:grid;place-content:center;gap:12px;'
    + 'width:100%;height:100%;margin:0;border:0;padding:24px;cursor:pointer;text-align:center;'
    + 'background:rgba(7,11,18,0.82);color:#eaf3f6;font:16px/1.5 ui-monospace,Menlo,monospace;';
  const title = document.createElement('strong');
  title.textContent = FOCUS_OVERLAY_TEXT.title;
  title.style.cssText = 'font-size:32px;letter-spacing:0.18em;color:#56e4f2;text-transform:uppercase;';
  const hint = document.createElement('span');
  hint.textContent = FOCUS_OVERLAY_TEXT.hint;
  hint.style.cssText = 'max-width:38em;color:#c9d6e2;';
  el.append(title, hint);
  // A keyboard user can Tab into the frame from the page around it; show where focus is (vision §6.6).
  el.addEventListener('focus', () => { el.style.outline = '3px solid #f3ae62'; el.style.outlineOffset = '-8px'; });
  el.addEventListener('blur', () => { el.style.outline = 'none'; });
  parent.appendChild(el);
  return el;
}

export function createInput(canvas, { overlayParent = document.body } = {}) {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered, cleared by consume()
  let dx = 0;
  let dy = 0;
  let dragging = false;
  let lockRefused = false;
  let focused = false;
  const listeners = [];
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); listeners.push([target, type, fn, opts]); };
  const overlay = createFocusOverlay(overlayParent);

  function release() { keys.clear(); pressed.clear(); dx = 0; dy = 0; dragging = false; }
  function setFocused(next) {
    focused = next;
    if (!focused) release();
    overlay.hidden = focused;
  }
  const refreshFocus = () => setFocused(document.hasFocus() && document.visibilityState === 'visible');
  refreshFocus();

  on(window, 'focus', refreshFocus);
  on(window, 'blur', () => setFocused(false));
  on(document, 'visibilitychange', refreshFocus);
  // The first click lands on the overlay, and a click inside a frame is what focuses it.
  on(overlay, 'click', () => { window.focus(); refreshFocus(); });
  on(window, 'keydown', (e) => {
    if (!focused) refreshFocus();
    if (!focused || capturesKeys(e.target)) return;
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
    if (MOVE_CODES.has(e.code) || e.code === 'KeyE') e.preventDefault();
  });
  on(window, 'keyup', (e) => keys.delete(e.code));
  on(document, 'mousemove', (e) => {
    if (document.pointerLockElement === canvas || dragging) { dx += e.movementX || 0; dy += e.movementY || 0; }
  });
  // Any button drags (left, middle or right), so a trackpad or a one-handed player can look around.
  on(canvas, 'mousedown', () => { if (focused) dragging = document.pointerLockElement !== canvas; });
  on(canvas, 'contextmenu', (e) => e.preventDefault());
  on(window, 'mouseup', () => { dragging = false; });
  on(document, 'pointerlockerror', () => { lockRefused = true; });

  return {
    get focused() { return focused; },
    held: (code) => keys.has(code),
    // True once per physical press.
    consume(code) { const had = pressed.has(code); pressed.delete(code); return had; },
    takeMouse() { const d = [dx, dy]; dx = 0; dy = 0; return d; },
    clear: release,
    get locked() { return document.pointerLockElement === canvas; },
    lock() {
      if (lockRefused || document.pointerLockElement === canvas) return;
      try {
        const p = canvas.requestPointerLock?.();
        p?.catch?.(() => { lockRefused = true; });
      } catch { lockRefused = true; }
    },
    unlock() { if (document.pointerLockElement === canvas) document.exitPointerLock(); },
    on,
    dispose() {
      for (const [t, type, fn, opts] of listeners) t.removeEventListener(type, fn, opts);
      listeners.length = 0;
      overlay.remove();
    },
  };
}
