// Layer 2 in-world terminals (vision §6.1): the replication booth (§4.2, §6.4), the relay (§4.3),
// the legacy link junctions and the transmission console (§4.4, §6.5). While one is open the
// integrator stops movement and frees the mouse (it hears CLOSE_TERMINAL when Esc closes it).
//
// The terminal never owns quest state. It keeps only what the player has seen on each device, so
// Esc mid-flow and reopen shows the same screen, and it emits contract event names through onEvent
// in §9.2 order. Acknowledgements are emitted only after the result they acknowledge has painted.
// Every number shown comes from an engine result that passed validateExperimentResult plus a
// per-call guard; anything else is refused on screen, never rendered.
import { TERMINALS, FAILURES, HUD } from '../data/objectives.js';
import { QUEST_EVENTS, BUS_EVENTS, INTERACTABLE_IDS, validateExperimentResult } from '../contracts.js';
import { trapTab, focusableIn, el } from './accessibility.js';

const C = TERMINALS.common;
const T = (v) => (typeof v === 'string' ? v : v.text); // data entries are a string or { text, src }
// Data keeps ASCII kets (|0>); the screen shows the angle bracket. The data is never rewritten.
export const ket = (s) => s.replace(/\|([^|<>\s]{1,3})>/g, '|$1⟩');
const fill = (tpl, vals) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(vals[k]));
const f6 = (x) => x.toFixed(6);
const ONE = 1 - 1e-6;

// The receiver correction rule (§7.1): X iff m1 = 1, Z iff m0 = 1. Used for messaging only;
// every fidelity on screen is the engine's.
const ruleFor = ({ m0, m1 }) => ({ x: m1 === 1, z: m0 === 1 });

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const sameKeys = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => v === b[i]);
const bitsOk = (b) => b && (b.m0 === 0 || b.m0 === 1) && (b.m1 === 0 || b.m1 === 1);

// Per-call guards: what this screen needs beyond the shared ExperimentResult contract.
const GUARDS = {
  cloneTest: (r) => [
    r.experiment !== 'cloning' && 'experiment is not cloning',
    !(r.probabilities && sameKeys(r.keyQubits, [1, 0])) && 'joint probabilities with keyQubits [1, 0] required',
    !(r.observables && isNum(r.observables.purityQ0) && isNum(r.observables.purityQ1)) && 'purityQ0 and purityQ1 required',
  ],
  // Owner ruling 2026-10-10: the receiver shows EXACT partial_trace probabilities only.
  bellSignalling: (r) => [
    r.experiment !== 'bell_signalling' && 'experiment is not bell_signalling',
    r.counts !== undefined && 'sampled counts are not shown on the receiver panel',
    !(r.probabilities && sameKeys(r.keyQubits, [1])) && 'receiver-only probabilities with keyQubits [1] required',
    !(r.observables && isNum(r.observables.zBasisAgreement) && isNum(r.observables.xBasisAgreement)) && 'agreement observables required',
  ],
  bellMeasurement: (r) => [
    r.experiment !== 'teleportation' && 'experiment is not teleportation',
    !bitsOk(r.measurementBits) && 'measurementBits m0, m1 required',
    typeof r.parameters?.state !== 'string' && 'parameters.state required',
  ],
  teleportDryRun: (r, [, , , bits]) => [
    r.experiment !== 'teleportation' && 'experiment is not teleportation',
    !isNum(r.fidelity) && 'fidelity required',
    !(bitsOk(r.measurementBits) && r.measurementBits.m0 === bits.m0 && r.measurementBits.m1 === bits.m1) && 'measurementBits differ from the measured bits',
  ],
  commitStoryTransfer: (r) => [
    r.experiment !== 'teleportation' && 'experiment is not teleportation',
    !bitsOk(r.measurementBits) && 'measurementBits m0, m1 required',
    !isNum(r.fidelity) && 'fidelity required',
  ],
};

// §9.2 order per device: each event fires once, when its condition holds and all before it have fired.
const MILESTONES = {
  copy_booth: [
    ['BASIS_DEMO_OK', (s) => s.painted.zero && s.painted.one],
    ['SUPERPOSITION_DEMO_FAILED', (s) => s.painted.plus],
    ['EXPLANATION_READ', (s) => s.choice === 'reroute'],
  ],
  relay_core: [
    ['PREPARE_BELL_PAIR', (s) => s.prepared],
    ['ATTEMPT_NO_SIGNALLING', (s) => s.paintedSend],
    ['VIEW_RECEIVER_MARGINAL', (s) => s.paintedReceiver],
  ],
  classical_socket: [['REPAIR_CLASSICAL_LINK', (s) => s.patched === 3]],
  teleport_terminal: [
    ['CORRECT_CALIBRATION', (s) => s.qualified],
    ['COMMIT_TRANSFER', (s) => !!s.committed],
  ],
};

function freshState(id) {
  const base = { busy: false, status: null, retry: null, emitted: new Set(), focusKey: null, note: null };
  if (id === 'copy_booth') return { ...base, selected: 'zero', results: {}, last: null, painted: {}, why: false, choice: null };
  if (id === 'relay_core') return { ...base, prepared: false, gate: 'I', result: null, view: 'receiver', paintedSend: false, paintedReceiver: false };
  if (id === 'classical_socket') return { ...base, patched: 0 };
  return { ...base, measurement: null, x: false, z: false, dry: null, qualified: false, committed: null, committing: false };
}

export function mountTerminal(root, { engine, onEvent = () => {}, getHint } = {}) {
  const states = {};
  for (const id of Object.keys(MILESTONES)) {
    if (!(id in INTERACTABLE_IDS)) throw new TypeError(`terminal: ${id} is not an INTERACTABLE_IDS value`);
    states[id] = freshState(id);
  }
  let current = null;
  let returnFocus = null;
  let hint = null;

  const overlay = el('div', 'echo-terminal');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'echo-terminal-title');
  overlay.dataset.visible = 'false';
  overlay.hidden = true;
  const panel = el('div', 'echo-terminal__panel');
  overlay.append(panel);
  root.append(overlay);

  const emit = (name, payload) => {
    if (name in BUS_EVENTS) onEvent(BUS_EVENTS[name], payload);
    else onEvent(QUEST_EVENTS[name]);
  };

  function flush(id) {
    const s = states[id];
    for (const [name, cond] of MILESTONES[id]) {
      if (s.emitted.has(name)) continue;
      if (!cond(s)) return;
      s.emitted.add(name);
      emit(name);
    }
  }

  // Runs two frames after a render, i.e. once the browser has painted what render() built.
  function afterPaint(id) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (current !== id) return;
      const s = states[id];
      const shown = !!panel.querySelector('[data-role="result"]');
      let changed = false;
      const mark = (obj, key) => { if (!obj[key]) { obj[key] = true; changed = true; } };
      if (id === 'copy_booth' && s.last && shown) mark(s.painted, s.last);
      if (id === 'relay_core' && s.result && shown) {
        mark(s, 'paintedSend');
        if (s.view === 'receiver') mark(s, 'paintedReceiver');
      }
      if (id === 'teleport_terminal' && s.dry && s.dry.pass && !s.dry.trivial && shown) mark(s, 'qualified');
      flush(id);
      if (changed) render();
    }));
  }

  // One engine call: pending → CALIBRATING, rejection → module error + RETRY, bad shape → refused + RETRY.
  async function call(id, method, args, onOk) {
    const s = states[id];
    if (s.busy) return false;
    s.busy = true;
    s.status = { kind: 'pending' };
    s.retry = () => call(id, method, args, onOk);
    s.note = null;
    render();
    let result;
    try {
      result = await engine[method](...args);
    } catch (e) {
      s.busy = false;
      s.status = { kind: 'error', detail: `${method}: ${e?.message ?? e}` };
      render();
      return false;
    }
    s.busy = false;
    const errors = validateExperimentResult(result);
    if (errors.length === 0) errors.push(...GUARDS[method](result, args).filter(Boolean));
    if (errors.length) {
      s.status = { kind: 'refused', detail: `${method}: ${errors.slice(0, 2).join('; ')}` };
      render();
      return false;
    }
    s.status = null;
    s.retry = null;
    onOk(result);
    render();
    return true;
  }

  // ------------------------------------------------------------------ small builders

  function btn(key, label, onClick, { pressed, disabled, cls = '' } = {}) {
    const b = el('button', `echo-button echo-terminal__btn ${cls}`.trim(), ket(T(label)));
    b.type = 'button';
    b.dataset.key = key;
    if (pressed !== undefined) b.setAttribute('aria-pressed', String(!!pressed));
    // aria-disabled, not disabled: the control stays focusable and pressing it explains why.
    if (disabled) b.setAttribute('aria-disabled', 'true');
    b.addEventListener('click', onClick);
    return b;
  }
  const line = (cls, text, role) => {
    const p = el('p', cls, ket(T(text)));
    if (role) p.dataset.role = role;
    return p;
  };
  const engineTag = (r) => line('echo-terminal__engine', `${C.engineLabel}: ${C.engines[r.engine]}`, 'engine');
  const row = (label, value, role) => {
    const d = el('div', 'echo-terminal__row');
    const v = el('span', 'echo-terminal__value', ket(String(value)));
    if (role) v.dataset.role = role;
    d.append(el('span', 'echo-terminal__label', ket(T(label))), v);
    return d;
  };
  const section = (cls = '') => el('section', `echo-terminal__section ${cls}`.trim());
  function bar(label, p) {
    const d = el('div', 'echo-terminal__bar');
    const track = el('span', 'echo-terminal__track');
    const fillEl = el('span', 'echo-terminal__fill');
    fillEl.style.width = `${Math.round(p * 100)}%`;
    track.append(fillEl);
    d.append(el('span', 'echo-terminal__label', ket(label)), track, el('span', 'echo-terminal__value', f6(p)));
    return d;
  }

  function statusBlock(s) {
    const box = el('div', 'echo-terminal__status');
    box.setAttribute('role', 'status');
    if (!s.status) return box;
    if (s.status.kind === 'pending') {
      box.append(line('echo-terminal__calibrating', T(C.calibrating)));
      return box;
    }
    box.dataset.kind = 'error';
    box.append(line('echo-terminal__error', s.status.kind === 'error' ? C.moduleError : C.refused),
      line('echo-terminal__detail', s.status.detail),
      btn('retry', C.retry, () => s.retry && s.retry()));
    return box;
  }

  // ------------------------------------------------------------------ copy_booth (§4.2, §6.4)

  const CLONE_INPUTS = [['zero', '|0>'], ['one', '|1>'], ['plus', '|+>']];
  function jointText(r) {
    // keyQubits [1, 0]: key "10" is q1 = 1, q0 = 0; the ket is written q1 q0, as Qiskit prints it.
    return Object.entries(r.probabilities).filter(([, p]) => p > 1e-9)
      .map(([k, p]) => (p > ONE ? `|${k}>` : `${f6(p)} |${k}>`)).join(' + ');
  }
  function marginal(r, qubit) {
    const pos = r.keyQubits.indexOf(qubit);
    return Object.entries(r.probabilities).reduce((p1, [k, p]) => p1 + (k[pos] === '1' ? p : 0), 0);
  }
  const runClone = (s, state) => call('copy_booth', 'cloneTest', [state], (r) => { s.results[state] = r; s.last = state; });

  function renderBooth(body, s) {
    const D = TERMINALS.copy_booth;
    const inputs = section('echo-terminal__inputs');
    inputs.append(el('span', 'echo-terminal__label', D.inputLabel));
    for (const [state, label] of CLONE_INPUTS) {
      inputs.append(btn(`in-${state}`, label, () => { if (!s.busy) { s.selected = state; render(); } }, { pressed: s.selected === state }));
    }
    body.append(inputs, row(D.inputModeLabel, T(D.inputMode)));
    const actions = section('echo-terminal__actions');
    actions.append(btn('duplicate', D.duplicate, () => runClone(s, s.selected), { disabled: s.busy, cls: 'echo-terminal__primary' }));
    if (!s.results.plus) {
      actions.append(btn('skip', D.skipDemo, async () => {
        for (const state of ['zero', 'one', 'plus']) {
          s.selected = state;
          if (!(await runClone(s, state))) return;
        }
      }, { disabled: s.busy }));
    }
    body.append(actions, statusBlock(s));

    const tested = CLONE_INPUTS.filter(([state]) => s.results[state]);
    if (tested.length) {
      const res = section('echo-terminal__result');
      res.dataset.role = 'result';
      res.append(el('h3', 'echo-terminal__heading', C.result));
      for (const [state, label] of tested) {
        const r = s.results[state];
        const basis = r.observables.purityQ0 > ONE && r.observables.purityQ1 > ONE;
        const item = el('div', 'echo-terminal__item');
        item.dataset.status = basis ? 'complete' : 'error';
        item.append(row(label, `${D.joint}: ${jointText(r)}`),
          line('echo-terminal__verdict', basis ? D.basisResult : T(D.superpositionResult)));
        if (!basis) item.append(line('echo-terminal__why', FAILURES.cloning.plus_not_copied));
        item.append(engineTag(r));
        res.append(item);
      }
      body.append(res);
    }
    if (s.results.plus) {
      const r = s.results.plus;
      const after = section('echo-terminal__actions');
      after.append(btn('why', D.whyFail, () => { s.why = !s.why; render(); }, { pressed: s.why }),
        btn('another', D.tryAnother, () => { s.focusKey = `in-${s.selected}`; render(); }));
      body.append(after);
      if (s.why) {
        // §4.2 "two compact mini diagrams": each output on its own, from the engine's numbers.
        const why = section('echo-terminal__why-panel');
        for (const [label, q, purity] of [[D.whyA, 0, r.observables.purityQ0], [D.whyB, 1, r.observables.purityQ1]]) {
          const d = el('div', 'echo-terminal__mini');
          d.append(el('h4', 'echo-terminal__heading', label), bar('P(|0>)', 1 - marginal(r, q)), bar('P(|1>)', marginal(r, q)),
            row(D.purity, f6(purity)));
          why.append(d);
        }
        why.append(line('echo-terminal__note', D.whyIdeal), engineTag(r));
        body.append(why);
      }
      const choice = section('echo-terminal__actions');
      choice.append(btn('voltage', D.choiceVoltage, () => { if (s.choice !== 'reroute') s.choice = 'voltage'; s.note = FAILURES.cloning.increase_voltage; render(); }),
        btn('reroute', D.choiceReroute, () => { s.choice = 'reroute'; s.note = T(D.learning); render(); }));
      body.append(choice);
    }
  }

  // ------------------------------------------------------------------ relay_core (§4.3, §7.3)

  function renderRelay(body, s) {
    const D = TERMINALS.relay_core;
    const status = section('echo-terminal__statuses');
    if (s.prepared) status.append(line('echo-terminal__ok', T(D.statusReady)));
    status.append(line('echo-terminal__offline', D.statusClassical));
    body.append(status);
    const prep = section('echo-terminal__actions');
    prep.append(btn('prepare', D.prepare, () => { if (!s.prepared) { s.prepared = true; s.focusKey = 'gate-I'; render(); } },
      { pressed: s.prepared, cls: s.prepared ? '' : 'echo-terminal__primary' }));
    body.append(prep);
    if (!s.prepared) return;
    const gates = section('echo-terminal__inputs');
    gates.append(el('span', 'echo-terminal__label', D.senderLabel));
    for (const g of ['I', 'X', 'Z']) gates.append(btn(`gate-${g}`, g, () => { if (!s.busy) { s.gate = g; render(); } }, { pressed: s.gate === g }));
    gates.append(btn('send', D.send, () => call('relay_core', 'bellSignalling', [s.gate], (r) => { s.result = r; s.view = 'receiver'; }),
      { disabled: s.busy, cls: 'echo-terminal__primary' }));
    body.append(gates, statusBlock(s));
    if (!s.result) return;
    const r = s.result;
    const tabs = section('echo-terminal__actions');
    tabs.append(btn('view-receiver', D.receiverOnly, () => { s.view = 'receiver'; render(); }, { pressed: s.view === 'receiver' }),
      btn('view-paired', D.compared, () => { s.view = 'paired'; render(); }, { pressed: s.view === 'paired' }));
    body.append(tabs);
    const res = section('echo-terminal__result');
    res.dataset.role = 'result';
    const gate = r.parameters.senderGate;
    const head = el('h3', 'echo-terminal__heading', s.view === 'receiver' ? D.receiverOnly : D.compared);
    head.append(' ', el('span', 'echo-terminal__badge', C.exact));
    res.append(head);
    if (s.view === 'receiver') {
      res.append(bar('P(0)', r.probabilities['0']), bar('P(1)', r.probabilities['1']),
        line('echo-terminal__why', FAILURES.bell_signalling[`sender_${gate}`]),
        line('echo-terminal__why', FAILURES.bell_signalling.no_message));
    } else {
      res.append(line('echo-terminal__note', D.comparedNote), row(D.senderLabel, gate),
        bar(D.agreeZ, r.observables.zBasisAgreement), bar(D.agreeX, r.observables.xBasisAgreement),
        line('echo-terminal__why', FAILURES.bell_signalling.classical_missing));
    }
    res.append(engineTag(r));
    body.append(res);
  }

  // ------------------------------------------------------------------ classical_socket (§4.4 Beat 1)

  function renderSocket(body, s) {
    const D = TERMINALS.classical_socket;
    const list = section('echo-terminal__junctions');
    for (let n = 1; n <= 3; n++) {
      const done = s.patched >= n;
      const b = btn(`junction-${n}`, fill(D.junction, { n }), () => {
        if (s.patched >= n) return;
        if (n !== s.patched + 1) { s.note = FAILURES.link_repair.wrong_junction; render(); return; }
        s.patched = n;
        s.note = null;
        s.focusKey = `junction-${Math.min(3, n + 1)}`;
        render();
        flush('classical_socket');
      }, { pressed: done, cls: n === s.patched + 1 ? 'echo-terminal__primary' : '' });
      const d = el('div', 'echo-terminal__row');
      d.dataset.status = done ? 'complete' : 'inactive';
      d.append(b, el('span', 'echo-terminal__value', done ? D.patched : D.dark));
      list.append(d);
    }
    body.append(list, line(s.patched === 3 ? 'echo-terminal__ok' : 'echo-terminal__offline',
      s.patched === 3 ? T(TERMINALS.teleport_terminal.classicalOnline) : TERMINALS.relay_core.statusClassical));
  }

  // ------------------------------------------------------------------ teleport_terminal (§4.4, §6.5, §7.4)

  function dryExplanation(dry) {
    const { bits, x, z, fidelity } = dry;
    const want = ruleFor(bits);
    const F = FAILURES.teleportation;
    const out = [];
    if (want.x && !x) out.push(F.missing_X);
    if (!want.x && x) out.push(F.extra_X);
    if (want.z && !z) out.push(F.missing_Z);
    if (!want.z && z) out.push(F.extra_Z);
    if (!x && !z && (want.x || want.z)) out.push(F.no_corrections);
    if (out.length && fidelity > ONE) out.push(F.blind_spot);
    return out;
  }

  function commit() {
    const s = states.teleport_terminal;
    if (s.committed) { s.note = FAILURES.teleportation.already_committed; render(); return; }
    if (!s.qualified) { s.note = FAILURES.teleportation.commit_locked; render(); return; }
    if (s.busy) return;
    // One atomic engine call. The source shows CONSUMED only once it resolves with a valid result.
    s.committing = true;
    call('teleport_terminal', 'commitStoryTransfer', [], (r) => { s.committed = r; }).then(() => {
      s.committing = false;
      flush('teleport_terminal'); // not an acknowledgement: the transfer happened, so the quest hears it now
      render();
    });
  }

  function renderTeleport(body, s) {
    const D = TERMINALS.teleport_terminal;
    const consumed = !!s.committed;
    const status = section('echo-terminal__statuses');
    status.dataset.consumed = String(consumed);
    status.append(row(D.stateLabel, consumed ? T(D.stateConsumed) : T(D.statePresent), 'source'),
      line('echo-terminal__ok', T(D.bellReady)), line('echo-terminal__ok', T(D.classicalOnline)));
    const slots = section('echo-terminal__slots');
    for (const label of [D.slotSource, D.slotLocal, D.slotRemote]) slots.append(el('div', 'echo-terminal__slot', label));
    body.append(status, slots);

    const locked = consumed || s.busy;
    const measure = section('echo-terminal__actions');
    measure.append(btn('measure', T(D.measure), () => {
      if (locked) return;
      call('teleport_terminal', 'bellMeasurement', [], (r) => {
        s.measurement = { stateId: r.parameters.state, bits: { ...r.measurementBits }, result: r };
        s.x = false;
        s.z = false;
        s.dry = null;
        s.focusKey = 'toggle-x';
      });
    }, { disabled: locked, cls: s.measurement && !s.dry ? '' : 'echo-terminal__primary' }),
    el('span', 'echo-terminal__label', D.testState));
    body.append(measure);

    if (s.measurement) {
      const { bits } = s.measurement;
      // Bits first (owner ruling 2026-10-10): the corrections are chosen after the readout is shown.
      const readout = section('echo-terminal__readout');
      readout.append(row(D.m0Label, bits.m0, 'm0'), row(D.m1Label, bits.m1, 'm1'), engineTag(s.measurement.result));
      const plan = section('echo-terminal__plan');
      const open = !s.dry && !locked;
      plan.append(el('h3', 'echo-terminal__heading', T(D.planTitle)),
        line('echo-terminal__plan-row', fill(D.planRowTemplate, { m0: bits.m0, m1: bits.m1, x: s.x ? D.on : D.off, z: s.z ? D.on : D.off })));
      const toggles = el('div', 'echo-terminal__toggles');
      const toggle = (key, label, prop) => btn(key, `${label}  [${s[prop] ? D.on : D.off}]`,
        () => { if (!s.dry && !locked) { s[prop] = !s[prop]; render(); } }, { pressed: s[prop], disabled: !open });
      toggles.append(toggle('toggle-x', D.toggleX, 'x'), toggle('toggle-z', D.toggleZ, 'z'),
        btn('verify', T(D.verify), () => {
          if (s.dry || locked) return;
          const { x, z } = s;
          call('teleport_terminal', 'teleportDryRun', [s.measurement.stateId, x, z, { ...bits }], (r) => {
            const want = ruleFor(bits);
            const follows = want.x === x && want.z === z;
            s.dry = { bits, x, z, fidelity: r.fidelity, result: r, pass: follows && r.fidelity > ONE, trivial: bits.m0 === 0 && bits.m1 === 0 };
            s.focusKey = 'measure';
          });
        }, { disabled: !open, cls: open ? 'echo-terminal__primary' : '' }));
      plan.append(toggles);
      body.append(readout, plan);
    }
    body.append(statusBlock(s));

    if (s.dry) {
      const res = section('echo-terminal__result');
      res.dataset.role = 'result';
      res.dataset.status = s.dry.pass ? 'complete' : 'error';
      res.append(line('echo-terminal__verdict', s.dry.pass ? D.dryPass : D.dryFail),
        row(T(D.fidelityLabel), f6(s.dry.fidelity), 'fidelity'));
      for (const why of dryExplanation(s.dry)) res.append(line('echo-terminal__why', why));
      if (s.dry.pass && s.dry.trivial && !s.qualified) res.append(line('echo-terminal__note', FAILURES.teleportation.trivial_pass));
      res.append(engineTag(s.dry.result));
      body.append(res);
    }

    const fin = section('echo-terminal__actions echo-terminal__commit');
    fin.append(btn('commit', T(D.commit), commit, { disabled: !s.qualified || consumed || s.busy, cls: s.qualified && !consumed ? 'echo-terminal__primary' : '' }));
    if (s.committing && s.status?.kind === 'pending') fin.append(line('echo-terminal__calibrating', D.committing));
    body.append(fin);
    if (consumed) {
      const r = s.committed;
      const done = section('echo-terminal__result');
      done.dataset.status = 'complete';
      done.append(row(D.m0Label, r.measurementBits.m0), row(D.m1Label, r.measurementBits.m1),
        row(T(D.fidelityLabel), f6(r.fidelity)), line('echo-terminal__ok', T(D.receiverRecovered)),
        line('echo-terminal__ok', D.vaultAccepted), engineTag(r));
      body.append(done);
    }
  }

  // ------------------------------------------------------------------ frame

  const RENDER = { copy_booth: renderBooth, relay_core: renderRelay, classical_socket: renderSocket, teleport_terminal: renderTeleport };

  function render() {
    if (!current) return;
    const id = current;
    const s = states[id];
    const focusKey = overlay.contains(document.activeElement) ? document.activeElement.dataset.key : null;
    panel.textContent = '';
    overlay.setAttribute('aria-busy', String(s.busy));
    const head = el('header', 'echo-terminal__head');
    const title = el('h2', 'echo-terminal__title', T(TERMINALS[id].title));
    title.id = 'echo-terminal-title';
    const tools = el('div', 'echo-terminal__tools');
    if (getHint) tools.append(btn('hint', HUD.hintButton, () => { hint = getHint(id); render(); }));
    const close = btn('close', C.close, () => api.close());
    close.append(' ', el('span', 'echo-key', C.closeKey));
    tools.append(close);
    head.append(title, tools);
    const body = el('div', 'echo-terminal__body');
    panel.append(head, body);
    if (hint) body.append(line('echo-terminal__hint', hint));
    RENDER[id](body, s);
    if (s.note) body.append(line('echo-terminal__note', s.note, 'note'));
    const want = s.focusKey || focusKey;
    s.focusKey = null;
    const target = want ? panel.querySelector(`[data-key="${want}"]`) : null;
    (target || focusableIn(body)[0] || close).focus();
    afterPaint(id);
  }

  function onKey(event) {
    if (!current) return;
    if (trapTab(overlay, event)) return;
    if (event.key === 'Escape') {
      // Capture phase on window: the pause menu never sees an Esc that closes a terminal.
      event.preventDefault();
      event.stopPropagation();
      api.close();
    }
  }
  window.addEventListener('keydown', onKey, true);

  const api = {
    open(id) {
      if (!(id in INTERACTABLE_IDS)) throw new TypeError(`terminal.open: unknown interactable ${id}`);
      if (current === id) return;
      if (current) api.close();
      returnFocus = document.activeElement;
      current = id;
      hint = null;
      overlay.hidden = false;
      overlay.dataset.visible = 'true';
      overlay.dataset.terminal = id;
      render();
    },
    close() {
      if (!current) return;
      const id = current;
      const active = document.activeElement;
      states[id].focusKey = overlay.contains(active) ? active.dataset.key : null;
      current = null;
      overlay.dataset.visible = 'false';
      overlay.hidden = true;
      panel.textContent = '';
      if (returnFocus && returnFocus.isConnected) returnFocus.focus();
      emit('CLOSE_TERMINAL', { id });
    },
    isOpen: () => current !== null,
    get id() { return current; },
    destroy() {
      window.removeEventListener('keydown', onKey, true);
      overlay.remove();
    },
  };
  return api;
}
