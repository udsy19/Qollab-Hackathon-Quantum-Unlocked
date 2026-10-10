// The opening (vision §4.1, Shots A–D, 0:00–1:05): title card, billboard line, the MIRROR / MICA /
// RIN exchange as timed captions, then the HUD with the first objective. It owns the clock and the
// captions' pacing; the camera and 3D scene belong to other lanes and follow `onShot`.
// Exactly one of onFinished / onSkip fires, once. Qollab cannot remember a first view, so every run
// is a first view and Skip is available from the first frame (§3.4 "skip after first view").
import { el, applySettings } from './accessibility.js';
import { mountDialogue } from './dialogue.js';
import { SCREEN_TEXT, STORY } from '../data/story.js';
import { OBJECTIVES } from '../data/objectives.js';

// Shot starts in seconds (§4.1). The last entry is the end of the opening.
const SHOTS = [['A', 0], ['B', 10], ['C', 24], ['D', 44]];
const END = 65;
const CARD = { from: 0.5, to: 8.5 };
const BILLBOARD = { from: 2, to: 10 };
const HUD_AT = 44;
// When each STORY.OPENING beat starts, by index. Gaps are >= 4 s so even a two-page beat at 200%
// text finishes before the next one replaces it.
const BEAT_AT = [10.5, 17.5, 24.5, 28.5, 32.5, 37, 41, 45, 50, 55, 60];
const TICK_MS = 100;
// Dwell on a fully shown page: a reading floor plus time per character.
const dwell = (pageText) => Math.max(1600, 700 + 35 * pageText.length);

const mounted = new WeakMap();

// Options: { onShot(name, t), onFinished(), onSkip(), settings, hud, dialogue }.
// `hud` (optional) is shown with the FREE_ROAM_ALLEY objective as the opening ends either way;
// `dialogue` (optional) reuses the integrator's instance, otherwise one is mounted and owned here.
export function mountOpening(root, { onShot = () => {}, onFinished = () => {}, onSkip = () => {}, settings, hud, dialogue } = {}) {
  const existing = mounted.get(root);
  if (existing && !existing.done) return existing;
  if (settings) applySettings(root, settings);
  if (BEAT_AT.length !== STORY.OPENING.length) throw new Error('opening: BEAT_AT does not match STORY.OPENING');

  const ownsDialogue = !dialogue;
  const captions = dialogue || mountDialogue(root);

  const overlay = el('section', 'echo-opening');
  overlay.setAttribute('aria-label', 'Opening cinematic');
  const card = el('p', 'echo-opening__card', SCREEN_TEXT.openingCard.text);
  const billboard = el('p', 'echo-opening__billboard', SCREEN_TEXT.billboard.text);
  const skip = el('button', 'echo-opening__skip echo-button');
  skip.type = 'button';
  skip.innerHTML = '<span>Skip</span> <kbd class="echo-key">Esc</kbd>';
  card.dataset.visible = 'false';
  billboard.dataset.visible = 'false';
  overlay.append(card, billboard, skip);
  root.append(overlay);
  root.dataset.opening = 'on';
  skip.focus();

  let settled = false;
  let shotIndex = -1;
  let beatIndex = 0;
  const start = performance.now();
  const between = (t, range) => t >= range.from && t < range.to;

  function revealHud() {
    if (!hud) return;
    const o = OBJECTIVES.FREE_ROAM_ALLEY;
    hud.setObjective(o.number, o.text);
    hud.setVisible(true);
  }

  function teardown() {
    clearInterval(timer);
    document.removeEventListener('keydown', onKey, true);
    captions.clear();
    if (ownsDialogue) captions.destroy();
    overlay.remove();
    delete root.dataset.opening;
  }

  // The single exit. Whichever path gets here first wins; every later call is a no-op.
  function settle(callback) {
    if (settled) return;
    settled = true;
    api.done = true;
    teardown();
    revealHud();
    callback();
  }

  function tick() {
    const t = (performance.now() - start) / 1000;
    while (shotIndex + 1 < SHOTS.length && t >= SHOTS[shotIndex + 1][1]) {
      shotIndex += 1;
      onShot(SHOTS[shotIndex][0], t);
      if (settled) return;
    }
    card.dataset.visible = String(between(t, CARD));
    billboard.dataset.visible = String(between(t, BILLBOARD));
    while (beatIndex < BEAT_AT.length && t >= BEAT_AT[beatIndex]) {
      captions.play([STORY.OPENING[beatIndex]], { auto: dwell });
      beatIndex += 1;
    }
    if (t >= HUD_AT) revealHud();
    if (t >= END) settle(onFinished);
  }

  // Esc skips: there is no pause before free roam (menu.js only opens pause once the game is
  // running and pauseAllowed), and §6 wants cinematics skippable at any moment from the keyboard.
  // Capture phase plus preventDefault keeps the menu's own Esc handler from also acting.
  function onKey(event) {
    if (event.key !== 'Escape' || settled) return;
    event.preventDefault();
    event.stopPropagation();
    settle(onSkip);
  }
  document.addEventListener('keydown', onKey, true);
  skip.addEventListener('click', () => settle(onSkip));

  const timer = setInterval(tick, TICK_MS);
  const api = {
    element: overlay,
    done: false,
    skip: () => settle(onSkip),
    destroy() {
      if (settled) return;
      settled = true;
      api.done = true;
      teardown();
    },
  };
  mounted.set(root, api);
  tick();
  return api;
}
