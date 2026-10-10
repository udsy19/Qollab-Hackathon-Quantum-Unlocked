// Layer 4 menus (vision §6.1): title, pause, settings, controls. Keyboard alone drives all of it:
// Tab/Shift+Tab move (trapped inside the open panel), Enter/Space activate, Esc goes back.
import { applySettings, normalizeSettings, trapTab, focusableIn, el } from './accessibility.js';

export const CONTROLS = [
  ['W A S D', 'Move'],
  ['Mouse', 'Look around'],
  ['Shift', 'Sprint'],
  ['E', 'Interact'],
  ['Q', 'Field scan'],
  ['Tab', 'Journal'],
  ['Enter / Space', 'Continue dialogue'],
  ['Esc', 'Pause / back'],
];

const QUALITY_LABELS = { low: 'Low', med: 'Medium', high: 'High' };

function button(label, action) {
  const b = el('button', 'echo-button echo-menu__item', label);
  b.type = 'button';
  b.dataset.action = action;
  return b;
}

function panel(id, titleText, className = '') {
  const p = el('div', `echo-menu__panel ${className}`.trim());
  p.dataset.screen = id;
  const h = el('h2', 'echo-menu__title', titleText);
  h.id = `echo-menu-${id}-title`;
  p.append(h);
  return p;
}

export function mountMenu(root, { settings, onChange = () => {}, onStart = () => {}, onResume = () => {}, onRestart = () => {} } = {}) {
  let current = applySettings(root, normalizeSettings(settings));
  let stack = [];
  let started = false;
  let pauseAllowed = true;
  let returnFocus = null;

  const overlay = el('div', 'echo-menu');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  // A name even while closed; show() swaps in the open screen's heading.
  overlay.setAttribute('aria-label', 'Menu');
  overlay.dataset.visible = 'false';

  // Title (vision §4.1 Shot A card, §12.5 Gate C "strong title screen").
  const title = el('div', 'echo-menu__panel echo-title');
  title.dataset.screen = 'title';
  const kicker = el('p', 'echo-title__kicker', 'NACRE CITY // 02:17 AM');
  const logo = el('h1', 'echo-title__logo');
  logo.id = 'echo-menu-title-title';
  logo.append(el('span', 'echo-title__echo', 'ECHO'), el('span', 'echo-title__sub', 'ONE OF ONE'));
  const titleNav = el('nav', 'echo-menu__list');
  titleNav.setAttribute('aria-label', 'Main menu');
  titleNav.append(button('Start', 'start'), button('Settings', 'settings'), button('Controls', 'controls'));
  const credit = el('p', 'echo-title__credit', 'This effort is supported by Qollab & IonQ');
  title.append(kicker, logo, titleNav, credit);

  const pause = panel('pause', 'Paused');
  const pauseNav = el('nav', 'echo-menu__list');
  pauseNav.setAttribute('aria-label', 'Pause menu');
  pauseNav.append(button('Resume', 'resume'), button('Settings', 'settings'), button('Controls', 'controls'), button('Restart', 'restart'));
  pause.append(pauseNav);

  const settingsPanel = panel('settings', 'Settings');
  const form = el('form', 'echo-settings');
  form.addEventListener('submit', (e) => e.preventDefault());

  function row(labelText, control, id, output) {
    const r = el('div', 'echo-settings__row');
    const label = el('label', 'echo-settings__label', labelText);
    label.htmlFor = id;
    control.id = id;
    r.append(label, control);
    if (output) r.append(output);
    return r;
  }
  function toggle(key) {
    const c = el('input', 'echo-toggle');
    c.type = 'checkbox';
    c.name = key;
    return c;
  }
  function range(key, min, max, step) {
    const c = el('input', 'echo-range');
    Object.assign(c, { type: 'range', name: key, min, max, step });
    return c;
  }
  const subtitles = toggle('subtitles');
  const reducedMotion = toggle('reducedMotion');
  const textScale = range('textScale', 100, 200, 25);
  const textScaleOut = el('output', 'echo-settings__value');
  const quality = el('select', 'echo-select');
  quality.name = 'quality';
  for (const [value, label] of Object.entries(QUALITY_LABELS)) {
    const o = el('option', '', label);
    o.value = value;
    quality.append(o);
  }
  const volume = range('volume', 0, 100, 5);
  const volumeOut = el('output', 'echo-settings__value');
  textScaleOut.htmlFor = 'echo-set-textScale';
  volumeOut.htmlFor = 'echo-set-volume';
  form.append(
    row('Subtitles', subtitles, 'echo-set-subtitles'),
    row('Reduced motion', reducedMotion, 'echo-set-reducedMotion'),
    row('Text size', textScale, 'echo-set-textScale', textScaleOut),
    row('Quality', quality, 'echo-set-quality'),
    row('Volume', volume, 'echo-set-volume', volumeOut),
  );
  const settingsNav = el('div', 'echo-menu__list');
  settingsNav.append(button('Back', 'back'));
  settingsPanel.append(form, settingsNav);

  function syncForm() {
    subtitles.checked = current.subtitles;
    reducedMotion.checked = current.reducedMotion;
    textScale.value = String(current.textScale);
    textScaleOut.textContent = `${current.textScale}%`;
    quality.value = current.quality;
    volume.value = String(current.volume);
    volumeOut.textContent = `${current.volume}%`;
  }

  form.addEventListener('input', (event) => {
    const key = event.target.name;
    if (!key) return;
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    current = applySettings(root, { ...current, [key]: value });
    syncForm();
    onChange({ ...current }, key);
  });

  const controls = panel('controls', 'Controls');
  const list = el('dl', 'echo-controls');
  for (const [keys, action] of CONTROLS) {
    const dt = el('dt');
    dt.append(el('kbd', 'echo-key', keys));
    list.append(dt, el('dd', '', action));
  }
  const controlsNav = el('div', 'echo-menu__list');
  controlsNav.append(button('Back', 'back'));
  controls.append(list, controlsNav);

  const screens = { title, pause, settings: settingsPanel, controls };
  overlay.append(title, pause, settingsPanel, controls);
  root.append(overlay);

  function show(id) {
    for (const [key, node] of Object.entries(screens)) node.hidden = key !== id;
    overlay.dataset.screen = id;
    overlay.setAttribute('aria-labelledby', `echo-menu-${id}-title`);
    overlay.removeAttribute('aria-label');
    overlay.dataset.visible = 'true';
    root.dataset.menuOpen = 'true';
    if (id === 'settings') syncForm();
    const first = focusableIn(screens[id])[0];
    if (first) first.focus();
  }

  function open(id) {
    if (overlay.dataset.visible !== 'true') returnFocus = document.activeElement;
    stack.push(id);
    show(id);
  }

  function close() {
    stack = [];
    overlay.dataset.visible = 'false';
    delete overlay.dataset.screen;
    overlay.removeAttribute('aria-labelledby');
    overlay.setAttribute('aria-label', 'Menu');
    root.dataset.menuOpen = 'false';
    for (const node of Object.values(screens)) node.hidden = true;
    if (returnFocus && returnFocus.isConnected && returnFocus !== document.body) returnFocus.focus();
    else if (document.activeElement && overlay.contains(document.activeElement)) document.activeElement.blur();
    returnFocus = null;
  }

  function back() {
    const leaving = stack.pop();
    const target = stack[stack.length - 1];
    if (!target) {
      close();
      return;
    }
    show(target);
    // Return focus to the item that opened the sub-screen, so Esc never loses the player's place.
    const opener = screens[target].querySelector(`[data-action="${leaving}"]`);
    if (opener) opener.focus();
  }

  const api = {
    element: overlay,
    get screen() {
      return overlay.dataset.visible === 'true' ? stack[stack.length - 1] : null;
    },
    isOpen: () => overlay.dataset.visible === 'true',
    showTitle() {
      started = false;
      stack = [];
      open('title');
    },
    showPause() {
      stack = [];
      open('pause');
    },
    openSettings: () => open('settings'),
    openControls: () => open('controls'),
    close,
    getSettings: () => ({ ...current }),
    setSettings(next) {
      current = applySettings(root, { ...current, ...next });
      syncForm();
      onChange({ ...current }, null);
    },
    // Terminals own Esc while open: the integrator turns pause off, or calls preventDefault first.
    setPauseAllowed(allowed) {
      pauseAllowed = Boolean(allowed);
    },
    destroy() {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
    },
  };

  overlay.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'start') {
      started = true;
      close();
      onStart();
    } else if (action === 'resume') {
      close();
      onResume();
    } else if (action === 'restart') {
      close();
      onRestart();
    } else if (action === 'settings') open('settings');
    else if (action === 'controls') open('controls');
    else if (action === 'back') back();
  });

  function onKey(event) {
    if (api.isOpen()) {
      if (trapTab(overlay, event)) return;
      if (event.key !== 'Escape') return;
      event.preventDefault();
      const screen = api.screen;
      if (screen === 'pause') {
        close();
        onResume();
      } else if (screen !== 'title') {
        back();
      }
      return;
    }
    if (event.key === 'Escape' && started && pauseAllowed && !event.defaultPrevented) {
      event.preventDefault();
      api.showPause();
    }
  }
  document.addEventListener('keydown', onKey);

  for (const node of Object.values(screens)) node.hidden = true;
  syncForm();
  return api;
}
