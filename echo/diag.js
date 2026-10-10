// Input diagnostic: an always-visible panel that answers "does mouse and keyboard
// input reach this page inside Qollab's preview iframe?" from one screenshot.
//
// Why it exists: on the 2026-10-10 Qollab run, pressing Verify did nothing at
// all. Either input never reached the frame, or it reached a page whose handlers
// were dead. Counters fed by capture-phase listeners on `document` tell the two
// apart: they run before any page handler can stop propagation, so a click that
// reaches the frame is counted even if the page swallows it.
//
// Qollab facts this panel reports on (read from its shipped JS, 2026-10-10):
// the preview iframe carries sandbox="allow-scripts" and nothing else, so its
// origin is opaque (cross-origin to qollab.xyz) and pointer lock is NOT allowed;
// nothing focuses it, so keys reach it only after a click inside it.
//
// Usage: import * as diag from './diag.js'; diag.mount(document.body);
// then diag.markBridgeResult() when the Python bridge answers.

const EVENTS = ['pointerdown', 'keydown', 'click'];
const CAPTURE = { capture: true };

let panel = null;
let ticker = 0;
let bridgeAt = 0;
let pointerLock = 'not tried (press L)';
const counts = { pointerdown: 0, keydown: 0, click: 0 };
let lastKey = '—';
let lastTarget = '—';

const describe = (el) =>
  el && el.tagName ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}` : String(el);

function onInput(ev) {
  counts[ev.type] += 1;
  if (ev.type === 'keydown') {
    lastKey = ev.key === ' ' ? 'Space' : ev.key;
    if (ev.key === 'l' || ev.key === 'L') tryPointerLock();
  } else {
    lastTarget = describe(ev.target);
  }
  render();
}

// Pointer lock needs both the API and the sandbox token allow-pointer-lock.
// Trying it is the only way to learn the second from inside the frame; a grant
// is released at once so the diagnostic never captures the mouse.
function tryPointerLock() {
  const el = document.documentElement;
  if (typeof el.requestPointerLock !== 'function') {
    pointerLock = 'API missing';
    return;
  }
  pointerLock = 'requested…';
  const granted = () => {
    pointerLock = 'GRANTED';
    document.exitPointerLock();
    render();
  };
  const refused = (why) => {
    pointerLock = `REFUSED${why ? ` (${why})` : ''}`;
    render();
  };
  document.addEventListener('pointerlockchange', () => document.pointerLockElement && granted(), { once: true });
  document.addEventListener('pointerlockerror', () => refused(), { once: true });
  try {
    const p = el.requestPointerLock();
    if (p && typeof p.catch === 'function') p.catch((e) => refused(e && e.name));
  } catch (e) {
    refused(e && e.name);
  }
}

function verdict() {
  const pointer = counts.pointerdown + counts.click > 0;
  const keys = counts.keydown > 0;
  if (pointer && keys) return 'INPUT REACHES PAGE (pointer + keys)';
  if (pointer) return 'POINTER REACHES PAGE · no key yet (click first, then type)';
  if (keys) return 'KEYS REACH PAGE · NO POINTER counted';
  return 'NO INPUT YET — click inside this page, then press a key';
}

function render() {
  if (!panel) return;
  const since = bridgeAt ? `${((performance.now() - bridgeAt) / 1000).toFixed(1)} s` : 'waiting';
  const rows = [
    ['verdict', verdict()],
    ['pointerdown', counts.pointerdown],
    ['click', counts.click],
    ['keydown', counts.keydown],
    ['last key', lastKey],
    ['last pointer target', lastTarget],
    ['document.hasFocus()', String(document.hasFocus())],
    ['active element', describe(document.activeElement)],
    ['origin', String(window.origin)],
    ['pointer lock API', typeof document.documentElement.requestPointerLock === 'function' ? 'present' : 'missing'],
    ['pointer lock', pointerLock],
    ['since bridge result', since],
  ];
  panel.querySelector('tbody').replaceChildren(
    ...rows.map(([k, v]) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      const td = document.createElement('td');
      th.textContent = k;
      td.textContent = String(v);
      td.dataset.diag = k;
      tr.append(th, td);
      return tr;
    }),
  );
}

export function markBridgeResult() {
  bridgeAt = performance.now();
  render();
}

export function mount(root) {
  if (panel) return panel;
  panel = document.createElement('aside');
  panel.id = 'input-diag';
  panel.setAttribute('aria-label', 'Input diagnostic');
  // Inline styles so the panel needs no stylesheet. pointer-events: none keeps
  // the panel from being the thing that swallows the clicks it is counting.
  panel.style.cssText =
    'position:fixed;left:8px;top:8px;z-index:2147483647;pointer-events:none;' +
    'background:rgba(5,8,18,.88);color:#e8f1ff;border:2px solid #ffd166;border-radius:6px;' +
    'padding:6px 8px;font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;max-width:420px';
  panel.innerHTML =
    '<div style="color:#ffd166;font-weight:700;margin-bottom:2px">INPUT DIAGNOSTIC (document, capture phase)</div>' +
    '<table style="border-collapse:collapse"><tbody></tbody></table>' +
    '<style>#input-diag th{text-align:left;font-weight:400;color:#9fb3c8;padding:0 10px 0 0;white-space:nowrap}' +
    '#input-diag td{color:#e8f1ff;font-weight:700}</style>';
  root.appendChild(panel);
  for (const t of EVENTS) document.addEventListener(t, onInput, CAPTURE);
  window.addEventListener('focus', render);
  window.addEventListener('blur', render);
  ticker = setInterval(render, 500);
  render();
  return panel;
}

export function unmount() {
  if (!panel) return;
  for (const t of EVENTS) document.removeEventListener(t, onInput, CAPTURE);
  window.removeEventListener('focus', render);
  window.removeEventListener('blur', render);
  clearInterval(ticker);
  panel.remove();
  panel = null;
}
