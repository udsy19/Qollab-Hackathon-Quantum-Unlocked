// Settings shape, how settings reach the DOM, and focus helpers shared by every UI module.
// Settings live in memory only: Qollab blocks localStorage, sessionStorage, IndexedDB and cookies.
// The shape is the platform's (contracts.js). Captions are always on, so there is a caption STYLE
// and no on/off field; a stale caller's extra keys are dropped here, never applied.
import { CAPTION_STYLES, QUALITY_LEVELS, DEFAULT_SETTINGS } from '../contracts.js';

export function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function defaultSettings() {
  return { ...DEFAULT_SETTINGS, reducedMotion: prefersReducedMotion() };
}

// Clamp untrusted input (a caller, a form control) into the settings shape.
export function normalizeSettings(input = {}) {
  const base = defaultSettings();
  const s = {};
  for (const key of Object.keys(base)) s[key] = key in input ? input[key] : base[key];
  s.captionStyle = CAPTION_STYLES.includes(s.captionStyle) ? s.captionStyle : base.captionStyle;
  s.reducedMotion = Boolean(s.reducedMotion);
  const scale = Number(s.textScale);
  s.textScale = Number.isFinite(scale) ? Math.min(200, Math.max(100, Math.round(scale))) : base.textScale;
  s.quality = QUALITY_LEVELS.includes(s.quality) ? s.quality : base.quality;
  const vol = Number(s.volume);
  s.volume = Number.isFinite(vol) ? Math.min(100, Math.max(0, Math.round(vol))) : base.volume;
  return s;
}

// The DOM side of the contract: CSS and other lanes read these attributes on the UI root.
export function applySettings(root, settings) {
  const s = normalizeSettings(settings);
  root.classList.add('echo-ui');
  root.dataset.captionStyle = s.captionStyle;
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

// Data keeps kets as ASCII `|x>`; on screen they are `|x⟩` (U+27E9), which reads as a ket, not as
// "greater than". Applied at display time only, so the data stays greppable and unchanged.
export function displayKets(text) {
  return String(text).replace(/\|([^|<>\s]{1,8})>/g, '|$1⟩');
}
