// Harness for the story-ui terminals. Lives outside echo/ so it never counts against Qollab's file cap.
// Badge: version token + SHA-256 of the exact module bytes served (match with `shasum -a 256`).
import { mountTerminal } from '../../../echo/ui/terminal.js';
import { mountHud } from '../../../echo/ui/hud.js';
import { applySettings } from '../../../echo/ui/accessibility.js';
import { HINTS } from '../../../echo/data/objectives.js';
import { makeStubEngine } from './stub-engine.js';

const VERSION = 'terminals r1';
const FILES = ['echo/main.css', 'echo/ui/terminal.js', 'echo/data/objectives.js', 'echo/contracts.js', 'evidence/story-ui/harness/relay-fixtures.json'];

async function servedHash() {
  const parts = await Promise.all(FILES.map((f) => fetch(`../../../${f}`, { cache: 'no-store' }).then((r) => r.arrayBuffer())));
  const all = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let o = 0;
  for (const p of parts) { all.set(new Uint8Array(p), o); o += p.byteLength; }
  const d = await crypto.subtle.digest('SHA-256', all);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

const params = new URLSearchParams(location.search);
const root = document.getElementById('ui');
applySettings(root, { textScale: Number(params.get('scale') || 100) });
const hud = mountHud(root);
hud.setVisible(false);
const events = [];
const relayFixtures = await fetch('./relay-fixtures.json', { cache: 'no-store' }).then((r) => r.json());
const stub = makeStubEngine({ relayFixtures });
const HINT_FOR = { copy_booth: 'clone_superposition', relay_core: 'relay_send', teleport_terminal: 'teleport_correct', classical_socket: 'link_repair' };
let hintStep = 0;
const terminal = mountTerminal(root, {
  engine: stub,
  onEvent: (name, payload) => {
    events.push(payload === undefined ? name : `${name}${JSON.stringify(payload)}`);
    document.getElementById('eventlog').textContent = `events: ${events.join(' · ')}`;
  },
  getHint: (id) => {
    const ladder = HINTS[HINT_FOR[id]].ladder;
    const h = ladder[Math.min(hintStep, ladder.length - 1)];
    hintStep += 1;
    return h.text;
  },
});
window.echoHarness = { terminal, stub, events, VERSION };
if (params.get('open')) terminal.open(params.get('open'));
servedHash().then((h) => {
  document.getElementById('provenance').textContent = `${VERSION} · sha256 ${h}`;
  window.echoHarness.hash = h;
});
