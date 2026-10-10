// DEV-ONLY throwaway terminal: drives the §9.2 mission events so the graybox is playable before
// the story-ui terminals and the quantum lane's adapter land. Experiment steps advance ONLY when
// eventForResult() accepts the adapter's result; the button press itself never sends a quest event.
import { eventForResult, expectedCorrections, STORY_TOKEN_ID } from '../../echo/game/missionRules.js';
import { objectiveFor } from '../../echo/game/objectives.js';

const CALIBRATION_STATES = ['plus', 'minus', 'phase', 'bloch', 'one', 'zero'];

// Steps that are the player's own action (walk up and press E, read a panel), not an experiment.
const ACTIONS = {
  BOOT: [['BOOTED', 'Boot']],
  TITLE: [['START', 'Start']],
  OPENING: [['FINISHED', 'Finish opening'], ['SKIP', 'Skip opening']],
  FREE_ROAM_ALLEY: [['OPEN_CLONE_BOOTH', 'E at booth']],
  CLONE_SUPERPOSITION_FAILED: [['EXPLANATION_READ', 'Read the scan']],
  CLONE_UNDERSTOOD: [['EXIT_BOOTH', 'Leave booth']],
  RELAY_UNLOCKED: [['REACH_RELAY', 'E at relay']],
  RELAY_SEND_FAILED: [['VIEW_RECEIVER_MARGINAL', 'Read receiver panel']],
  RELAY_UNDERSTOOD: [['OPEN_ROOFTOP', 'Open rooftop']],
  ROOFTOP_UNLOCKED: [['REPAIR_CLASSICAL_LINK', 'E at socket']],
  LINK_REPAIRED: [['RUN_DRY_TEST', 'Start calibration']],
  TELEPORT_COMMITTED: [['ANIMATION_END', 'Transfer animation ends']],
  ENDING: [['OPEN_SCIENCE', 'Declassified'], ['OPEN_CREDITS', 'Credits']],
  DECLASSIFIED: [['OPEN_CREDITS', 'Credits'], ['RESTART', 'Restart']],
  CREDITS: [['OPEN_SCIENCE', 'Declassified'], ['RESTART', 'Restart']],
};

export function mountDevTerminal(root, { machine, bus, quantum }) {
  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props);
    n.append(...kids);
    return n;
  };
  let busy = false;
  let pendingBits = null;
  let calibIndex = 0;
  let lastResult = null;
  let note = '';

  // Run one experiment, then let the result decide. If the quest moved while the call was in
  // flight (reset, restart), the stale result is dropped rather than applied to the new state.
  async function experiment(label, run) {
    if (busy) return;
    busy = true; note = `${label}…`; render();
    const askedIn = machine.state;
    try {
      const result = await run();
      if (machine.state !== askedIn) { note = `${label}: result discarded (quest moved to ${machine.state})`; return; }
      lastResult = result;
      const verdict = eventForResult(askedIn, result);
      if (verdict.event) {
        const r = machine.send(verdict.event);
        note = `${label}: ${verdict.event} -> ${r.ok ? r.state : `refused (${r.reason})`}`;
      } else {
        note = `${label}: no progress — ${verdict.reason}`;
      }
    } catch (err) {
      note = `${label}: ERROR — ${err.message}. Nothing changed; try again.`;
    } finally {
      busy = false; render();
    }
  }

  function experimentButtons(state) {
    const b = (text, fn) => el('button', { textContent: text, disabled: busy, onclick: fn });
    switch (state) {
      case 'CLONE_INTRO':
      case 'CLONE_BASIS_PASSED':
        return ['zero', 'one', 'plus', 'phase'].map((s) => b(`Duplicate ${s}`, () => experiment(`clone ${s}`, () => quantum.cloneTest(s))));
      case 'RELAY_INTRO':
      case 'RELAY_BELL_CREATED':
        return ['I', 'X', 'Z'].map((g) => b(`Sender ${g}`, () => experiment(`bell ${g}`, () => quantum.bellSignalling(g))));
      case 'TELEPORT_DRY_RUN': {
        if (!pendingBits) {
          return [b('Bell-measure a calibration qubit', () => { pendingBits = quantum.sampleBellBits(); note = `bits m0=${pendingBits.m0} m1=${pendingBits.m1}`; render(); })];
        }
        const x = el('input', { type: 'checkbox', id: 'dt-x' });
        const z = el('input', { type: 'checkbox', id: 'dt-z' });
        const stateId = CALIBRATION_STATES[calibIndex % CALIBRATION_STATES.length];
        return [
          el('span', { textContent: `calibration state ${stateId}; m0=${pendingBits.m0} m1=${pendingBits.m1} ` }),
          el('label', {}, x, ' X'), el('label', {}, z, ' Z'),
          b('Apply & verify', () => {
            const bits = pendingBits;
            pendingBits = null; calibIndex++; // a measured calibration qubit is spent; retry uses a fresh one
            experiment('dry run', () => quantum.teleportDryRun(stateId, x.checked, z.checked, bits));
          }),
        ];
      }
      case 'TELEPORT_DRY_RUN_PASSED':
        return [b('COMMIT TRANSFER (story token, once)', () => {
          // Live bits from a fresh Bell measurement; corrections follow the calibrated rule (§7.4).
          const bits = quantum.sampleBellBits();
          const { applyX, applyZ } = expectedCorrections(bits.m0, bits.m1);
          experiment('commit', () => quantum.teleportDryRun(STORY_TOKEN_ID, applyX, applyZ, bits));
        })];
      default:
        return [];
    }
  }

  function render() {
    const s = machine.state;
    root.replaceChildren(
      el('div', { className: 'dt-state', textContent: `quest: ${s}   objective: ${objectiveFor(s)}` }),
      el('div', { className: 'dt-actions' },
        ...(ACTIONS[s] ?? []).map(([ev, text]) => el('button', { textContent: text, disabled: busy, onclick: () => { note = `${ev}: ${JSON.stringify(machine.send(ev))}`; render(); } })),
        ...experimentButtons(s)),
      el('div', { className: 'dt-note', textContent: note }),
      el('pre', { className: 'dt-result', textContent: lastResult ? JSON.stringify(lastResult, null, 1) : '' }),
    );
  }

  const offs = [
    bus.on('quest:transition', render),
    bus.on('quest:reset', () => { pendingBits = null; lastResult = null; note = 'reset'; render(); }),
  ];
  render();
  return { render, unmount: () => offs.forEach((off) => off()) };
}
