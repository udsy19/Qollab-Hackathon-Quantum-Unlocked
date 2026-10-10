// DEV-ONLY throwaway terminal: drives the §9.2 mission events so the graybox is playable before
// the story-ui terminals and the quantum lane's adapter land. Experiment steps advance ONLY when
// the machine accepts the adapter's result; the button press itself never sends a quest event.
// The player-action buttons are read from contracts' TRANSITIONS, so this file holds no table.
import { TRANSITIONS, BUS_EVENTS, QUEST_STATES as S } from '../../echo/contracts.js';
import { hasExperiment } from '../../echo/game/missionRules.js';
import { COMMIT_STATUS } from '../../echo/game/state.js';
import { objectiveFor } from '../../echo/game/objectives.js';

const ENDING_STATES = new Set([S.ENDING, S.DECLASSIFIED, S.CREDITS]); // owner ruling 12: RESTART offered here
const ACK_STATES = new Set([S.CLONE_SUPERPOSITION_FAILED, S.RELAY_SEND_FAILED]); // ruling 13: panel first

export function mountDevTerminal(root, { machine, bus, quantum }) {
  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props);
    n.append(...kids);
    return n;
  };
  let busy = false;
  let pendingBits = null;
  let lastResult = null;
  let panelShown = false; // the story-ui result panel stub
  let note = '';
  let attempts = 0;
  let callId = 0; // resetGame() frees the terminal at once; the old call's result is still judged (and dropped)

  // Run one experiment through the machine: a result from a reset or moved-on quest is dropped
  // there (epoch ticket), not here.
  async function experiment(label, run) {
    if (busy) return;
    busy = true; note = `${label}…`; render();
    const mine = ++callId;
    try {
      const r = await machine.experiment(run);
      lastResult = r.result;
      if (r.stale) note = `${label}: result DROPPED (stale) — ${r.reason}`;
      else note = r.event ? `${label}: ${r.event} -> ${machine.state}` : `${label}: no progress — ${r.reason}`;
      if (!r.stale && typeof r.result?.fidelity === 'number') note += ` · fidelity shown ${r.result.fidelity}`;
    } catch (err) {
      note = `${label}: ERROR — ${err.message}. Nothing changed; try again.`;
    } finally {
      if (mine === callId) busy = false;
      render();
    }
  }

  async function commit() {
    if (busy) return;
    busy = true; note = 'commit…'; render();
    try {
      const r = await machine.commitTransfer(() => quantum.commitStoryToken());
      if (r.result) lastResult = r.result;
      note = r.ok ? `commit: COMMIT_TRANSFER -> ${machine.state}` : `commit: refused (${r.commit}) — ${r.reason}`;
    } finally {
      busy = false; render();
    }
  }

  function experimentButtons(state) {
    const b = (text, fn) => el('button', { textContent: text, disabled: busy, onclick: fn });
    switch (state) {
      case S.CLONE_INTRO:
      case S.CLONE_BASIS_PASSED:
        return ['zero', 'one', 'plus', 'phase'].map((s) => b(`Duplicate ${s}`, () => experiment(`clone ${s}`, () => quantum.cloneTest(s))));
      case S.RELAY_INTRO:
      case S.RELAY_BELL_CREATED:
        return ['I', 'X', 'Z'].map((g) => b(`Sender ${g}`, () => experiment(`bell ${g}`, () => quantum.bellSignalling(g))));
      case S.TELEPORT_DRY_RUN: {
        if (!pendingBits) {
          return [b('Bell-measure a fresh calibration qubit', () => { pendingBits = quantum.sampleBellBits(); attempts++; note = `attempt ${attempts}: bits m0=${pendingBits.m0} m1=${pendingBits.m1}`; render(); })];
        }
        // Bits first, corrections second (owner ruling); all four X/Z choices offered.
        const x = el('input', { type: 'checkbox', id: 'dt-x' });
        const z = el('input', { type: 'checkbox', id: 'dt-z' });
        return [
          el('span', { className: 'dt-bits', textContent: `attempt ${attempts}: SOURCE READOUT m0=${pendingBits.m0} · LOCAL BELL-HALF READOUT m1=${pendingBits.m1} ` }),
          el('label', {}, x, ' X'), el('label', {}, z, ' Z'),
          b('Apply & verify', () => {
            const bits = pendingBits;
            pendingBits = null; // a measured calibration qubit is spent; a retry uses a fresh state
            experiment('dry run', () => quantum.teleportDryRun(x.checked, z.checked, bits));
          }),
        ];
      }
      case S.TELEPORT_DRY_RUN_PASSED:
        // Offered only while the latch is idle: an errored call re-arms it, a measured result never does.
        return [el('button', { textContent: 'COMMIT TRANSFER (story token, once)', disabled: busy || machine.commit !== COMMIT_STATUS.IDLE, onclick: commit })];
      default:
        return [];
    }
  }

  // Player actions = the state's table edges that no experiment produces (COMMIT included there).
  function actionButtons(state) {
    if (hasExperiment(state)) return [];
    return Object.keys(TRANSITIONS[state]).map((ev) => el('button', {
      textContent: ev, disabled: busy,
      onclick: () => { note = `${ev}: ${JSON.stringify(machine.send(ev))}`; render(); },
    }));
  }

  function render() {
    const s = machine.state;
    const latched = machine.commit !== COMMIT_STATUS.IDLE;
    root.replaceChildren(
      el('div', { className: 'dt-state', textContent: `quest: ${s}   objective: ${objectiveFor(s)}   session: ${machine.epoch}` }),
      el('div', { className: `dt-commit${latched ? ' latched' : ''}`, textContent: `commit latch: ${machine.commit}` }),
      el('div', { className: 'dt-actions' },
        ...actionButtons(s), ...experimentButtons(s),
        ...(ACK_STATES.has(s) ? [el('button', { textContent: 'story-ui stub: show result panel', disabled: busy || panelShown, onclick: () => { panelShown = true; machine.resultPanelShown(); note = 'result panel on screen'; render(); } })] : []),
        ...(ENDING_STATES.has(s) ? [el('button', { textContent: 'RESTART', disabled: busy, onclick: () => { machine.resetGame(); } })] : [])),
      el('div', { className: 'dt-note', textContent: note }),
      ...(panelShown && lastResult ? [el('div', { className: 'dt-panel', textContent: `RESULT PANEL (stub): ${lastResult.facts.join(' ')}` })] : []),
      el('pre', { className: 'dt-result', textContent: lastResult ? JSON.stringify(lastResult, null, 1) : '' }),
    );
  }

  const off = bus.on(BUS_EVENTS.QUEST_STATE_CHANGED, (p) => {
    panelShown = false;
    if (p.event === null) { callId++; busy = false; pendingBits = null; lastResult = null; attempts = 0; note = `resetGame(): ${p.from} -> ${p.to}, session ${machine.epoch}`; }
    render();
  });
  render();
  return { render, unmount: off };
}
