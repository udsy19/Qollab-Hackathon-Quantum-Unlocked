// Settings shape, how settings reach the DOM, and focus helpers shared by every UI module.
// Settings live in memory only: Qollab blocks localStorage, sessionStorage, IndexedDB and cookies.

export const QUALITIES = ['low', 'med', 'high'];

export function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function defaultSettings() {
  return {
    subtitles: true,
    reducedMotion: prefersReducedMotion(),
    textScale: 100,
    quality: 'med',
    volume: 80,
  };
}

// Clamp untrusted input (a caller, a form control) into the settings shape.
export function normalizeSettings(input = {}) {
  const base = defaultSettings();
  const s = { ...base, ...input };
  s.subtitles = Boolean(s.subtitles);
  s.reducedMotion = Boolean(s.reducedMotion);
  const scale = Number(s.textScale);
  s.textScale = Number.isFinite(scale) ? Math.min(200, Math.max(100, Math.round(scale))) : base.textScale;
  s.quality = QUALITIES.includes(s.quality) ? s.quality : base.quality;
  const vol = Number(s.volume);
  s.volume = Number.isFinite(vol) ? Math.min(100, Math.max(0, Math.round(vol))) : base.volume;
  return s;
}

// The DOM side of the contract: CSS and other lanes read these attributes on the UI root.
export function applySettings(root, settings) {
  const s = normalizeSettings(settings);
  root.classList.add('echo-ui');
  root.dataset.subtitles = s.subtitles ? 'on' : 'off';
  root.dataset.reducedMotion = s.reducedMotion ? 'on' : 'off';
  root.dataset.quality = s.quality;
  root.dataset.textScale = String(s.textScale);
  root.style.setProperty('--echo-text-scale', String(s.textScale / 100));
  return s;
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function focusableIn(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter((node) => node.getClientRects().length > 0);
}

// Keep Tab and Shift+Tab inside a modal panel. Returns true if it handled the event.
export function trapTab(container, event) {
  if (event.key !== 'Tab') return false;
  const items = focusableIn(container);
  if (items.length === 0) return false;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container.contains(active))) {
    last.focus();
  } else if (!event.shiftKey && (active === last || !container.contains(active))) {
    first.focus();
  } else {
    return false;
  }
  event.preventDefault();
  return true;
}

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
