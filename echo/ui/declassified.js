// Layer 3 Declassified mode (vision §4.5, §6.1): the player's own run journal, the three
// Declassified tabs, the no-score teach-back and the credits, in one keyboard-driven dialog.
// Tabs follow the WAI-ARIA tabs pattern: Left/Right/Home/End move between tabs, Tab enters the panel.
// All copy is in data/teachback.js; every number comes from the run record and names its engine.
import { trapTab, el, displayKets } from './accessibility.js';
import { DECLASSIFIED, TEACHBACK, CREDITS, RUN_JOURNAL, DECLASSIFIED_UI } from '../data/teachback.js';
import {
  validateExperimentResult, marginalProbabilities, BELL_RECEIVER_QUBIT, BIT_LABELS,
  expectedCorrections, makeCorrectionRequest, dryRunVerdict,
} from '../contracts.js';

// The run record (contract request to platform: contracts v2 has no run-record type yet). Every
// entry is an ExperimentResult exactly as the bridge returned it; absent means it never happened.
//   { clone: ExperimentResult[]        cloning, one per booth test
//     relay: ExperimentResult[]        bell_signalling, one per sender gate tried
//     dryRuns: { bits, result }[]      teleportation phase 1 and phase 2 of each dry run
//     commit: ExperimentResult         teleportation, the one commit of the story token
//     backend: ExperimentResult }      backend_verification, the one selected-backend job
const STATE_KETS = { zero: '|0>', one: '|1>', plus: '|+>', minus: '|->' };
const L = RUN_JOURNAL.labels;
const NR = RUN_JOURNAL.notRecorded;

// Exact numbers are shown to 6 decimals, trailing zeros dropped (0.176668, 0.5, 1).
const fmt = (x) => (typeof x === 'number' && Number.isFinite(x) ? String(Number(x.toFixed(6))) : NR);
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v : []);
const correctionText = (x, z) => (x && z ? 'X then Z' : x ? 'X' : z ? 'Z' : L.none);
// Bitstring keys sorted as strings: integer-like keys ("11") would otherwise jump ahead of "00".
const sortedEntries = (o) => Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
const SEP = '  \u00B7  ';
const applied = (p) => (typeof p.applyX === 'boolean' && typeof p.applyZ === 'boolean' ? correctionText(p.applyX, p.applyZ) : NR);

function rows(pairs) {
  const dl = el('dl', 'echo-declass__readings');
  for (const [k, v] of pairs) dl.append(el('dt', '', displayKets(k)), el('dd', '', displayKets(v)));
  return dl;
}

// One result → one group headed by its engine label, or a "not recorded" line if it fails the contract.
function group(result, title, readingsOf) {
  if (validateExperimentResult(result).length) return el('p', 'echo-declass__none', RUN_JOURNAL.invalid);
  const g = el('div', 'echo-declass__group');
  g.dataset.engine = result.engine;
  const head = el('p', 'echo-declass__grouphead');
  if (title) head.append(el('span', 'echo-declass__grouptitle', title));
  head.append(el('span', 'echo-declass__engine', RUN_JOURNAL.engines[result.engine]));
  g.append(head, rows(readingsOf(result)));
  return g;
}

function probabilityRows(r) {
  if (!isPlain(r.probabilities)) return [[L.joint, NR]];
  const reg = r.keyQubits.map((q) => `q${q}`).join('');
  return [[L.joint, sortedEntries(r.probabilities).map(([k, p]) => `P(${reg} = ${k}) = ${fmt(p)}`).join(SEP)]];
}

const cloneReadings = (r) => [
  [L.input, STATE_KETS[r.parameters.state] ?? (r.parameters.state ?? NR)],
  ...probabilityRows(r),
  [L.purityQ0, fmt(r.observables?.purityQ0)],
  [L.purityQ1, fmt(r.observables?.purityQ1)],
];

function relayReadings(r) {
  let receiver = NR;
  try {
    const m = marginalProbabilities(r, BELL_RECEIVER_QUBIT);
    receiver = `P(0) = ${fmt(m[0])}${SEP}P(1) = ${fmt(m[1])}`;
  } catch { /* the receiver qubit is not in keyQubits: nothing to show */ }
  return [[L.senderGate, r.parameters.senderGate ?? NR], [L.receiver, receiver]];
}

function bitReadings(r) {
  const mb = r.measurementBits;
  return [[BIT_LABELS.m0, mb ? String(mb.m0) : NR], [BIT_LABELS.m1, mb ? String(mb.m1) : NR]];
}

function dryRunReadings(bits, result) {
  const p = result.parameters;
  const mb = result.measurementBits;
  let rule = NR;
  let verdict = NR;
  if (mb) {
    const e = expectedCorrections(mb.m0, mb.m1);
    rule = correctionText(e.applyX, e.applyZ);
  }
  // The verdict is the contract's, recomputed from the phase-1 result and the player's choice.
  try {
    const req = makeCorrectionRequest({ theta: bits.parameters.theta, phi: bits.parameters.phi }, bits, { applyX: p.applyX, applyZ: p.applyZ });
    verdict = dryRunVerdict(req, result).passed ? `✓ ${L.passed}` : `✕ ${L.failed}`;
  } catch { /* an incomplete dry run has no verdict */ }
  return [
    ...bitReadings(result),
    [L.applied, applied(p)],
    [L.rule, rule],
    [L.fidelity, fmt(result.fidelity)],
    [L.verdict, verdict],
  ];
}

const backendReadings = (r) => [
  [L.backend, r.parameters.backend ?? NR],
  [L.shots, r.parameters.shots === undefined ? NR : String(r.parameters.shots)],
  [L.counts, isPlain(r.counts) ? sortedEntries(r.counts).map(([k, n]) => `${r.keyQubits.map((q) => `q${q}`).join('')} = ${k}: ${n}`).join(SEP) : NR],
];

function journalPanel(record) {
  const rec = isPlain(record) ? record : {};
  const frag = [el('p', 'echo-declass__lead', RUN_JOURNAL.intro)];
  const section = (title, nodes) => {
    const s = el('section', 'echo-declass__section');
    s.append(el('h3', 'echo-declass__h3', title));
    if (nodes.length) s.append(...nodes);
    else s.append(el('p', 'echo-declass__none', NR));
    frag.push(s);
  };
  const S = RUN_JOURNAL.sections;
  section(S.clone, list(rec.clone).map((r) => group(r, null, cloneReadings)));
  section(S.relay, list(rec.relay).map((r) => group(r, null, relayReadings)));
  section(S.dryRuns, list(rec.dryRuns).map((d, i) => (isPlain(d) && validateExperimentResult(d.bits).length === 0
    ? group(d.result, `${L.dryRun} ${i + 1}`, (r) => dryRunReadings(d.bits, r))
    : el('p', 'echo-declass__none', RUN_JOURNAL.invalid))));
    section(S.commit, rec.commit ? [group(rec.commit, null, (r) => [...bitReadings(r), [L.applied, applied(r.parameters)], [L.commitFidelity, fmt(r.fidelity)]])] : []);
  section(S.backend, rec.backend ? [group(rec.backend, null, backendReadings)] : []);
  return frag;
}

function sciencePanel(tab) {
  const H = DECLASSIFIED_UI.headings;
  const block = (heading, ...nodes) => {
    const s = el('section', 'echo-declass__section');
    s.append(el('h3', 'echo-declass__h3', heading), ...nodes);
    return s;
  };
  const expected = el('ul', 'echo-declass__expected');
  for (const line of tab.expected) expected.append(el('li', '', displayKets(line)));
  const myth = el('dl', 'echo-declass__myth');
  myth.append(el('dt', '', H.wrong), el('dd', '', displayKets(tab.misconception.wrong)),
    el('dt', '', H.why), el('dd', '', displayKets(tab.misconception.why)));
  const out = [
    block(H.whatIDid, el('p', '', displayKets(tab.whatIDid))),
    block(H.whatTheQubitsDid, el('p', '', displayKets(tab.whatTheQubitsDid))),
    block(H.gates, el('p', 'echo-declass__gates', displayKets(tab.gates))),
    block(H.expected, expected, ...(tab.verificationNote ? [el('p', 'echo-declass__note', displayKets(tab.verificationNote))] : [])),
    block(H.misconception, myth),
    el('p', 'echo-declass__note', DECLASSIFIED.provenanceNote),
  ];
  return out;
}

// §4.5: optional, no scoring pressure. The right choice is not always first: question i shows it
// at position (i + 1) mod 3, so the order itself gives nothing away.
function teachbackPanel(onCredits) {
  const out = [el('p', 'echo-declass__lead', DECLASSIFIED_UI.teachbackIntro)];
  TEACHBACK.forEach((q, qi) => {
    const field = el('section', 'echo-declass__question');
    field.dataset.question = String(qi);
    const h = el('h3', 'echo-declass__h3', `${qi + 1}. ${q.question}`);
    h.id = `echo-declass-q${qi}`;
    const choices = el('div', 'echo-declass__choices');
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-labelledby', h.id);
    const feedback = el('div', 'echo-declass__feedback');
    feedback.setAttribute('aria-live', 'polite');
    const k = (qi + 1) % q.choices.length;
    const ordered = k ? [...q.choices.slice(-k), ...q.choices.slice(0, -k)] : q.choices;
    ordered.forEach((c, ci) => {
      const b = el('button', 'echo-button echo-declass__choice');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      const mark = el('span', 'echo-declass__mark');
      mark.setAttribute('aria-hidden', 'true');
      b.append(mark, el('span', 'echo-declass__letter', `${'ABC'[ci]} `), el('span', '', displayKets(c.right ?? c.wrong)));
      b.addEventListener('click', () => {
        const right = Boolean(c.right);
        b.setAttribute('aria-pressed', 'true');
        b.dataset.result = right ? 'right' : 'wrong';
        mark.textContent = right ? '✓ ' : '✕ ';
        feedback.replaceChildren(
          el('p', 'echo-declass__verdict', right ? DECLASSIFIED_UI.rightMark : DECLASSIFIED_UI.wrongMark),
          el('p', '', displayKets(c.why)),
        );
        feedback.dataset.result = right ? 'right' : 'wrong';
      });
      choices.append(b);
    });
    field.append(h, choices, feedback);
    out.push(field);
  });
  const next = el('button', 'echo-button', DECLASSIFIED_UI.toCredits);
  next.type = 'button';
  next.addEventListener('click', onCredits);
  out.push(next);
  return out;
}

function creditsPanel() {
  const ul = el('ul', 'echo-declass__credits');
  for (const c of CREDITS) {
    const li = el('li', `echo-declass__credit echo-declass__credit--${c.role}`, c.text);
    ul.append(li);
  }
  return [ul];
}

// deps: { menu, onEvent(eventName) }. onEvent gets QUEST_EVENTS names: OPEN_CREDITS the first time
// the credits tab opens, CLOSE_SCIENCE when the player leaves before reaching the credits.
export function mountDeclassified(root, { menu, onEvent = () => {} } = {}) {
  const overlay = el('div', 'echo-declass');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', DECLASSIFIED_UI.dialogLabel);
  overlay.dataset.visible = 'false';

  const frame = el('div', 'echo-declass__frame');
  const head = el('div', 'echo-declass__head');
  const title = el('h2', 'echo-declass__title', DECLASSIFIED.title);
  const closeBtn = el('button', 'echo-button echo-declass__close', DECLASSIFIED_UI.close);
  closeBtn.type = 'button';
  head.append(title, closeBtn);
  const tablist = el('div', 'echo-declass__tabs');
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', DECLASSIFIED_UI.dialogLabel);
  const body = el('div', 'echo-declass__body');
  frame.append(head, tablist, body);
  overlay.append(frame);
  root.append(overlay);

  const T = DECLASSIFIED_UI.tabs;
  const defs = [
    { id: 'journal', label: T.journal },
    ...DECLASSIFIED.tabs.map((t) => ({ id: t.id, label: t.title.text, science: t })),
    { id: 'teachback', label: T.teachback },
    { id: 'credits', label: T.credits },
  ];
  const tabs = [];
  const panels = [];
  for (const d of defs) {
    const tab = el('button', 'echo-declass__tab', d.label);
    tab.type = 'button';
    tab.id = `echo-declass-tab-${d.id}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `echo-declass-panel-${d.id}`);
    const panel = el('div', 'echo-declass__panel');
    panel.id = `echo-declass-panel-${d.id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    // The panel scrolls at 200% text; tabindex lets the keyboard reach it and scroll.
    panel.tabIndex = 0;
    panel.hidden = true;
    tab.addEventListener('click', () => select(tabs.indexOf(tab)));
    tablist.append(tab);
    body.append(panel);
    tabs.push(tab);
    panels.push(panel);
  }

  let open = false;
  let current = 0;
  let creditsReached = false;
  let returnFocus = null;

  function select(i, focus = true) {
    current = (i + tabs.length) % tabs.length;
    tabs.forEach((t, j) => {
      const on = j === current;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
    });
    panels[current].scrollTop = 0;
    if (focus) tabs[current].focus();
    if (defs[current].id === 'credits' && !creditsReached) {
      creditsReached = true;
      onEvent('OPEN_CREDITS');
    }
  }

  function fill(record) {
    defs.forEach((d, i) => {
      const nodes = d.id === 'journal' ? journalPanel(record)
        : d.science ? sciencePanel(d.science)
          : d.id === 'teachback' ? teachbackPanel(() => select(defs.findIndex((x) => x.id === 'credits')))
            : creditsPanel();
      panels[i].replaceChildren(...nodes);
    });
  }

  function close() {
    if (!open) return;
    open = false;
    overlay.dataset.visible = 'false';
    root.dataset.declassifiedOpen = 'false';
    if (menu) menu.setPauseAllowed(true);
    if (!creditsReached) onEvent('CLOSE_SCIENCE');
    if (returnFocus && returnFocus.isConnected && returnFocus !== document.body) returnFocus.focus();
    else if (overlay.contains(document.activeElement)) document.activeElement.blur();
    returnFocus = null;
  }

  // Capture phase, so Declassified sees Esc and Tab before the menu's document listener does.
  function onKey(event) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (trapTab(overlay, event)) return;
    if (event.target.getAttribute?.('role') === 'tab') {
      const moves = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
      if (event.key in moves) {
        event.preventDefault();
        select(moves[event.key]);
      }
    }
  }
  document.addEventListener('keydown', onKey, true);
  closeBtn.addEventListener('click', close);

  return {
    element: overlay,
    open(record) {
      if (!open) returnFocus = document.activeElement;
      open = true;
      creditsReached = false;
      // Declassified owns Esc while open (ui-shell contract: setPauseAllowed).
      if (menu) menu.setPauseAllowed(false);
      fill(record);
      overlay.dataset.visible = 'true';
      root.dataset.declassifiedOpen = 'true';
      select(0);
    },
    close,
    isOpen: () => open,
    destroy() {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
    },
  };
}
