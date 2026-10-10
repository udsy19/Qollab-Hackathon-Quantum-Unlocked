// Harness for the story-ui shell. Lives outside echo/ so it never counts against Qollab's file cap.
// The provenance badge shows a version token plus a SHA-256 of the exact module bytes served,
// so a screenshot can be matched to a commit (`shasum -a 256` over the same files, same order).
import { mountHud } from '../../../echo/ui/hud.js';
import { mountDialogue } from '../../../echo/ui/dialogue.js';
import { mountMenu } from '../../../echo/ui/menu.js';
import { STORY, MOMENTS } from '../../../echo/data/story.js';
import { CAPTION_STYLES, validateSettings } from '../../../echo/contracts.js';

const VERSION = 'shell-polish r1';
const FILES = ['echo/main.css', 'echo/ui/accessibility.js', 'echo/ui/hud.js', 'echo/ui/dialogue.js', 'echo/ui/menu.js', 'echo/data/story.js'];

async function servedHash() {
  const parts = await Promise.all(FILES.map((f) => fetch(`../../../${f}`, { cache: 'no-store' }).then((r) => r.arrayBuffer())));
  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const all = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { all.set(new Uint8Array(p), o); o += p.byteLength; }
  const digest = await crypto.subtle.digest('SHA-256', all);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

const params = new URLSearchParams(location.search);
const root = document.getElementById('ui');
const log = [];

const hud = mountHud(root);
const dialogue = mountDialogue(root);
const menu = mountMenu(root, {
  settings: {
    textScale: Number(params.get('scale') || 100),
    reducedMotion: params.get('rm') === '1',
  },
  onChange: (s, key) => log.push(['change', key, s[key]]),
  onStart: () => { log.push(['start']); startGame(); },
  onResume: () => log.push(['resume']),
  onRestart: () => log.push(['restart']),
});

export const BEATS = {
  short: [{ speaker: 'Mica', text: 'Rin. Backup generator is dying. Did you get it?' }],
  long: [{ speaker: 'VEGA', text: 'A copied bit and a copied qubit are not the same thing. The duplicator matched the basis values for |0> and |1>, but for |+> it produced one correlated two-qubit state, not two independent copies. Inspect the science panel to see the reduced state of each slot.' }],
};

function startGame() {
  hud.setVisible(true);
  hud.setObjective(2, 'Restore the entanglement relay');
  hud.setCountdown(8 * 60 + 42);
  hud.setCapsuleState('Q-SOURCE: PRESERVED', 'available');
  hud.showPrompt('INTERACT', 'E');
}

hud.setVisible(false);
// Every spoken beat in the game, for the all-script pagination walk.
const SCRIPT = [...Object.values(STORY), ...Object.values(MOMENTS)].flat().filter((b) => b && typeof b.text === 'string' && b.speaker);
window.echoHarness = { hud, dialogue, menu, log, BEATS, SCRIPT, CAPTION_STYLES, validateSettings, startGame };

if (params.get('scene') === 'game') {
  startGame();
} else {
  menu.showTitle();
}

servedHash().then((h) => {
  document.getElementById('provenance').textContent = `${VERSION} · sha256 ${h}`;
  window.echoHarness.hash = h;
  window.echoHarness.version = VERSION;
});
