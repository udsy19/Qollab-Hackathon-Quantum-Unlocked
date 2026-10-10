// Harness for the opening. Lives outside echo/ so it never counts against Qollab's file cap.
// The log records every callback with a time since mount, so the driver counts events itself.
// The provenance badge is a SHA-256 over the exact module + CSS bytes served.
import { mountHud } from '../../../echo/ui/hud.js';
import { mountDialogue } from '../../../echo/ui/dialogue.js';
import { mountOpening } from '../../../echo/ui/opening.js';

const VERSION = 'opening r1';
const FILES = ['echo/main.css', 'echo/ui/accessibility.js', 'echo/ui/hud.js', 'echo/ui/dialogue.js', 'echo/ui/opening.js'];

async function servedHash() {
  const parts = await Promise.all(FILES.map((f) => fetch(`../../../${f}`, { cache: 'no-store' }).then((r) => r.arrayBuffer())));
  const all = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let o = 0;
  for (const p of parts) { all.set(new Uint8Array(p), o); o += p.byteLength; }
  const digest = await crypto.subtle.digest('SHA-256', all);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

const params = new URLSearchParams(location.search);
const root = document.getElementById('ui');
const stage = document.getElementById('stage');
const t0 = performance.now();
const events = [];
const shots = [];
const stamp = () => Math.round(performance.now() - t0);

const hud = mountHud(root);
hud.setCountdown('11:59');
hud.setVisible(false);
const dialogue = mountDialogue(root);
const settings = {
  textScale: Number(params.get('scale') || 100),
  reducedMotion: params.get('rm') === '1',
  captionStyle: params.get('cap') || 'standard',
};
const options = {
  settings,
  hud,
  dialogue,
  onShot: (name, t) => { shots.push({ name, t, at: stamp() }); stage.dataset.shot = name; },
  onFinished: () => events.push({ event: 'FINISHED', at: stamp() }),
  onSkip: () => {
    events.push({ event: 'SKIP', at: stamp() });
    // reenter=1: a handler that itself asks for skip must not re-fire the event.
    if (params.get('reenter') === '1') window.echoOpening.opening.skip();
  },
};
const opening = mountOpening(root, options);
if (params.get('double') === '1') mountOpening(root, options);

window.echoOpening = { opening, events, shots, hud, dialogue };
servedHash().then((h) => {
  document.getElementById('provenance').textContent = `${VERSION} · sha256 ${h}`;
  window.echoOpening.hash = h;
});
