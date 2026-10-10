// DEV-ONLY throwaway terminal: drives the §9.2 mission events so the graybox is playable before
// the story-ui terminals and the quantum lane's adapter land. Experiment steps advance ONLY when
// the machine accepts the adapter's result; the button press itself never sends a quest event.
// The player-action buttons are read from contracts' TRANSITIONS, so this file holds no table.
// `sources` names the EVENT_SOURCES `via` values this terminal stands in for: in the 3D world only
// story-ui's terminal acknowledgements (movement comes from walking through triggers); in the flat
// harness, which has no world, every source.
import { TRANSITIONS, BUS_EVENTS, EVENT_SOURCES, BIT_LABELS, QUEST_STATES as S, randomGenericState,
  validateTeleportBitsResult, makeCorrectionRequest } from '../../echo/contracts.js';
import { hasExperiment } from '../../echo/game/missionRules.js';
import { COMMIT_STATUS } from '../../echo/game/state.js';
import { objectiveFor } from '../../echo/game/objectives.js';

const ENDING_STATES = new Set([S.ENDING, S.DECLASSIFIED, S.CREDITS]); // owner ruling 12: RESTART offered here
const ACK_STATES = new Set([S.CLONE_SUPERPOSITION_FAILED, S.RELAY_SEND_FAILED]); // ruling 13: panel first

// All four choices are offered whatever the bits (owner ruling, gameplay consult 3).
const CHOICES = [['no correction', false, false], ['X', true, false], ['Z', false, true], ['X then Z', true, true]];

export function mountDevTerminal(root, { machine, bus, quantum, sources = Object.values(EVENT_SOURCES).map((s) => s.via) }) {
  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props);
    n.append(...kids);
    return n;
  };
  let busy = false;
  let dry = null; // { request, bits }: phase 1 done, the player has not chosen yet
  let lastResult = null;
  let panelShown = false; // the story-ui result panel stub
  let note = '';
  let attempts = 0;
  let callId = 0; // resetGame() frees the terminal at once; the old call's result is still judged (and dropped)

  // Run one experiment through the machine: a result from a reset or moved-on quest is dropped
  // there (epoch ticket), not here.
  async function experiment(label, run, request) {
    if (busy) return;
    busy = true; note = `${label}…`; render();
    const mine = ++callId;
    try {
      const r = await machine.experiment(run, request);
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

  async function measure() {
    if (busy) return;
    busy = true; note = 'Bell measurement…'; render();
    const mine = callId;
    try {
      const request = randomGenericState();
      const bits = await quantum.teleportBits(request);
      if (mine !== callId) return; // reset while measuring
      const errors = validateTeleportBitsResult(request, bits);
      if (errors.length) { note = `Bell measurement refused: ${errors.join('; ')}`; return; }
      attempts++;
      dry = { request, bits };
      lastResult = bits;
      note = `attempt ${attempts}: bits on screen — choose the receiver's corrections`;
    } catch (err) {
      note = `Bell measurement: ERROR — ${err.message}. Nothing changed; try again.`;
    } finally {
      if (mine === callId) busy = false;
      render();
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
        // Phase 1 (CONTRACTS.md § Teleport dry run): Bell-measure a fresh generic calibration state.
        if (!dry) return [b('Bell-measure a fresh calibration qubit', measure)];
        // Phase 2: the bits are on screen; the player picks the corrections.
        const { m0, m1 } = dry.bits.measurementBits;
        return [
          el('div', { className: 'dt-bits', textContent: `attempt ${attempts}: ${BIT_LABELS.m0} = ${m0} · ${BIT_LABELS.m1} = ${m1}` }),
          ...CHOICES.map(([text, applyX, applyZ]) => b(`Apply ${text}`, () => {
            const request = makeCorrectionRequest(dry.request, dry.bits, { applyX, applyZ });
            dry = null; // a measured calibration qubit is spent; a retry uses a fresh state
            experiment(`dry run (${text})`, () => quantum.teleportCorrection(request), request);
          })),
        ];
      }
      case S.TELEPORT_DRY_RUN_PASSED:
        // Offered only while the latch is idle: an errored call re-arms it, a measured result never does.
        return [el('button', { textContent: 'COMMIT TRANSFER (story token, once)', disabled: busy || machine.commit !== COMMIT_STATUS.IDLE, onclick: commit })];
      default:
        return [];
    }
  }

  // Player actions = the state's table edges that no experiment produces, from a source this
  // terminal stands in for, sent as that source.
  function actionButtons(state) {
    if (hasExperiment(state)) return [];
    return Object.keys(TRANSITIONS[state]).filter((ev) => sources.includes(EVENT_SOURCES[ev].via)).map((ev) => el('button', {
      textContent: ev, disabled: busy,
      onclick: () => { note = `${ev}: ${JSON.stringify(machine.send(ev, EVENT_SOURCES[ev].via))}`; render(); },
    }));
  }

  // A measured, refused commit (§7.4): the token is gone, so the only honest way on is a new
  // session (§9.5). Stub for story-ui's scientific-module error.
  function faultPanel(fault) {
    return el('div', { className: 'dt-fault', role: 'alert' },
      el('strong', { textContent: 'SCIENTIFIC MODULE ERROR' }),
      el('p', { textContent: 'The story token was measured and consumed by this commit. Verification failed, so the transfer is not reported as a success. A measured token cannot be measured again.' }),
      el('p', { className: 'dt-fault-reason', textContent: `Refusal: ${fault.reason}` }),
      el('p', { textContent: 'RESTART begins a new session with a fresh story token.' }));
  }

  function render() {
    const s = machine.state;
    const fault = machine.commitFault;
    const latched = machine.commit !== COMMIT_STATUS.IDLE;
    root.replaceChildren(
      el('div', { className: 'dt-state', textContent: `quest: ${s}   objective: ${objectiveFor(s)}   session: ${machine.epoch}` }),
      el('div', { className: `dt-commit${latched ? ' latched' : ''}`, textContent: `commit latch: ${machine.commit}` }),
      el('div', { className: 'dt-actions' },
        ...actionButtons(s), ...experimentButtons(s),
        ...(ACK_STATES.has(s) ? [el('button', { textContent: 'story-ui stub: show result panel', disabled: busy || panelShown, onclick: () => { panelShown = true; machine.resultPanelShown(); note = 'result panel on screen'; render(); } })] : []),
        // resetGame() (§9.5) where the table has no RESTART edge: CREDITS (terminal in contracts v2)
        // and a measured, refused commit, whose token is spent (machine.commitFault).
        ...((ENDING_STATES.has(s) && !Object.hasOwn(TRANSITIONS[s], 'RESTART')) || fault?.restartOffered ? [el('button', { textContent: 'RESTART (resetGame)', disabled: busy, onclick: () => { machine.resetGame(); } })] : [])),
      el('div', { className: 'dt-note', textContent: note }),
      ...(fault ? [faultPanel(fault)] : []),
      ...(panelShown && lastResult ? [el('div', { className: 'dt-panel', textContent: `RESULT PANEL (stub): ${lastResult.facts.join(' ')}` })] : []),
      el('pre', { className: 'dt-result', textContent: lastResult ? JSON.stringify(lastResult, null, 1) : '' }),
    );
  }

  const off = bus.on(BUS_EVENTS.QUEST_STATE_CHANGED, (p) => {
    panelShown = false;
    if (p.event === null || p.event === 'RESTART') { callId++; busy = false; dry = null; lastResult = null; attempts = 0; note = `resetGame(): ${p.from} -> ${p.to}, session ${machine.epoch}`; }
    render();
  });
  render();
  return { render, unmount: off };
}
