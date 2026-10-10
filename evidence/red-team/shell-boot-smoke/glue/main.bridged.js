// RED-TEAM GLUE — variant BB ("bridged"), NOT a product file and never to be shipped.
// It exists only because platform's echo/main.js (0fc2721) never imports gameplay's game/app.js
// (startGame), so world-v2-port's world cannot be reached through the shell as merged. Every line
// here is a finding: "not integrated". It wires exactly what the shell would have to wire —
// BOOT_COMPLETE, story-ui's title menu, story-ui's opening (FINISHED / SKIP) — and nothing beyond
// it: no terminal UI, no quantum bridge, no prompt UI, because no lane's pinned tree ships one.
// `window.sbsGame` is exposed so the drive script can READ position/focus to steer real key
// presses (as gameplay's own world-playthrough.mjs does); it never sends a quest event.
import { startGame } from './game/app.js';
import { QUEST_EVENTS, QUEST_STATES, BUS_EVENTS, UI_ROOT_ID } from './contracts.js';
import { mountMenu } from './ui/menu.js';
import { mountHud } from './ui/hud.js';
import { mountDialogue } from './ui/dialogue.js';
import { mountOpening } from './ui/opening.js';
import { defaultSettings } from './ui/accessibility.js';

const $ = (id) => document.getElementById(id);
$('echo-build').textContent = 'glue-BB';
$('echo-backend').textContent = String(backend.name);
$('echo-canvas').style.display = 'none';
const uiRoot = $(UI_ROOT_ID);
uiRoot.style.position = 'absolute';
uiRoot.style.inset = '0';
uiRoot.style.zIndex = '5';
uiRoot.style.pointerEvents = 'none';

const game = startGame({ root: $('echo-root'), quantum: null });
window.sbsGame = game;
const settings = defaultSettings();
const hud = mountHud(uiRoot);
const dialogue = mountDialogue(uiRoot);
const menu = mountMenu(uiRoot, {
  settings,
  onStart: () => {
    game.quest.send(QUEST_EVENTS.START, 'menu');
    mountOpening(uiRoot, {
      settings, hud, dialogue,
      onFinished: () => game.quest.send(QUEST_EVENTS.FINISHED, 'dialogue'),
      onSkip: () => game.quest.send(QUEST_EVENTS.SKIP, 'dialogue'),
    });
    for (const n of uiRoot.children) n.style.pointerEvents = 'auto';
  },
  onRestart: () => game.reset(),
});
for (const n of uiRoot.children) n.style.pointerEvents = 'auto';
game.bus.on(BUS_EVENTS.QUEST_STATE_CHANGED, ({ from, to, event }) => {
  $('echo-quest').textContent = `${from} —${event}→ ${to}`;
  console.log(`quest: ${from} -${event}-> ${to}`);
  hud.setVisible(to !== QUEST_STATES.TITLE);
  if (to === QUEST_STATES.TITLE) menu.showTitle();
});
const booted = game.quest.send(QUEST_EVENTS.BOOT_COMPLETE, 'boot');
if (booted && booted.ok === false) throw new Error(`glue: BOOT_COMPLETE refused (${booted.reason})`);
