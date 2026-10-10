// Layer 1 HUD (vision §6.1, §6.3): objective upper left, countdown upper right,
// capsule state lower left, interact prompt lower right, first-context tooltips.
import { el } from './accessibility.js';

// Highlight states from vision §6.2. Each has a glyph so the state never rests on colour alone.
export const STATUS_GLYPHS = { inactive: '○', available: '◆', complete: '✓', error: '✕' };

export function formatCountdown(value) {
  if (typeof value === 'string') return value;
  const total = Math.max(0, Math.floor(Number(value) || 0));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function mountHud(root, { district = 'ECHO // DISTRICT 09', countdownLabel = 'GRID SHUTDOWN' } = {}) {
  const hud = el('div', 'echo-hud');
  hud.dataset.visible = 'true';

  const top = el('div', 'echo-hud__top');
  const objective = el('section', 'echo-hud__objective');
  objective.setAttribute('aria-label', 'Objective');
  objective.append(el('p', 'echo-hud__brand', district));
  const objNum = el('p', 'echo-hud__objnum');
  const objText = el('p', 'echo-hud__objtext');
  objective.append(objNum, objText);
  // Announce objective changes politely; the countdown is not announced every second.
  objText.setAttribute('aria-live', 'polite');

  const timer = el('div', 'echo-hud__timer');
  const timerLabel = el('span', 'echo-hud__timerlabel', countdownLabel);
  const timerValue = el('span', 'echo-hud__timervalue', '--:--');
  timerValue.setAttribute('role', 'timer');
  timer.append(timerLabel, timerValue);
  top.append(objective, timer);

  const tooltip = el('div', 'echo-hud__tooltip');
  tooltip.setAttribute('role', 'status');
  tooltip.dataset.visible = 'false';

  const bottom = el('div', 'echo-hud__bottom');
  const capsule = el('div', 'echo-hud__capsule echo-status');
  const capGlyph = el('span', 'echo-status__glyph');
  capGlyph.setAttribute('aria-hidden', 'true');
  const capText = el('span', 'echo-status__text');
  capsule.append(capGlyph, capText);
  capsule.setAttribute('aria-live', 'polite');

  const prompt = el('div', 'echo-hud__prompt');
  const promptKey = el('kbd', 'echo-key');
  const promptLabel = el('span', 'echo-hud__promptlabel');
  prompt.append(promptKey, promptLabel);
  prompt.dataset.visible = 'false';
  bottom.append(capsule, prompt);

  hud.append(top, tooltip, bottom);
  root.append(hud);

  let tooltipTimer = 0;

  const api = {
    element: hud,
    setObjective(number, text) {
      objNum.textContent = `OBJECTIVE ${String(number).padStart(2, '0')}`;
      objText.textContent = text;
    },
    setCountdown(value) {
      timerValue.textContent = formatCountdown(value);
    },
    setCapsuleState(label, status = 'available') {
      const key = STATUS_GLYPHS[status] ? status : 'inactive';
      capsule.dataset.status = key;
      capGlyph.textContent = STATUS_GLYPHS[key];
      capText.textContent = label;
    },
    showPrompt(label = 'INTERACT', key = 'E') {
      promptKey.textContent = key;
      promptLabel.textContent = label;
      prompt.dataset.visible = 'true';
    },
    hidePrompt() {
      prompt.dataset.visible = 'false';
    },
    // Vision §4.1: e.g. the WASD tooltip for 3 seconds. duration 0 keeps it until hidden.
    showTooltip(text, { duration = 3000 } = {}) {
      clearTimeout(tooltipTimer);
      tooltip.textContent = text;
      tooltip.dataset.visible = 'true';
      if (duration > 0) tooltipTimer = setTimeout(api.hideTooltip, duration);
    },
    hideTooltip() {
      clearTimeout(tooltipTimer);
      tooltip.dataset.visible = 'false';
    },
    setVisible(visible) {
      hud.dataset.visible = visible ? 'true' : 'false';
    },
    destroy() {
      clearTimeout(tooltipTimer);
      hud.remove();
    },
  };
  api.setCapsuleState('Q-SOURCE: PRESERVED', 'available');
  return api;
}
