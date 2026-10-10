// The quest machine (vision §9). The table is platform's (echo/contracts.js); this file owns only
// the runtime around it: delivery order, session identity for async results, the one-shot commit,
// the acknowledgement gate and resetGame() (§9.5). It keeps no copy of any state or edge.
import { TRANSITIONS, transition, INITIAL_STATE, BUS_EVENTS, WORLD_CHANGES, QUEST_STATES, QUEST_EVENTS } from '../contracts.js';
import { eventForResult } from './missionRules.js';

const RESET_TO = QUEST_STATES.TITLE;
const COMMIT = QUEST_EVENTS.COMMIT_TRANSFER;
// Owner ruling 13 (2026-10-10): reading the explanation / the receiver panel only counts once
// story-ui has actually put that result panel on screen in this state.
const ACKNOWLEDGEMENTS = new Set([QUEST_EVENTS.EXPLANATION_READ, QUEST_EVENTS.VIEW_RECEIVER_MARGINAL]);

// The story token is measured once per session (§7.4). Structural proof on the imported table:
// exactly one edge carries COMMIT_TRANSFER, and from its target the only way back to that edge
// runs through TITLE, i.e. through resetGame() and a fresh token. Checked when this module loads,
// so a contracts.js edited into a re-commit loop never runs.
export function commitIsOneShot(table) {
  const commits = [];
  for (const [from, row] of Object.entries(table)) {
    for (const [event, to] of Object.entries(row)) if (event === COMMIT) commits.push({ from, to });
  }
  if (commits.length !== 1) return { ok: false, reason: `expected one ${COMMIT} edge, found ${commits.length}` };
  const [{ from: armed, to: committed }] = commits;
  const seen = new Set([committed]);
  const queue = [committed];
  while (queue.length) {
    const s = queue.shift();
    if (s === armed) return { ok: false, reason: `${armed} is reachable again from ${committed} without passing ${RESET_TO}` };
    for (const next of Object.values(table[s] ?? {})) {
      if (next !== RESET_TO && !seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return { ok: true, armed, committed };
}

const proof = commitIsOneShot(TRANSITIONS);
if (!proof.ok) throw new Error(`contracts TRANSITIONS violate the one-shot commit: ${proof.reason}`);

// The commit latch, per session (owner ruling 2026-10-10, gameplay consult 3). The live commit is
// one atomic engine call. If that call errors, nothing was measured and the player may retry.
// Once a result has come back the token has been measured: no second request leaves gameplay,
// whether or not that result advanced the quest.
export const COMMIT_STATUS = Object.freeze({
  IDLE: 'idle',
  IN_FLIGHT: 'in_flight',
  COMMITTED: 'committed',
  // A result came back but did not show a correct transfer. The rule applies the corrections
  // inside the call, so this is an engine fault: the token is spent and the quest cannot
  // honestly advance. Visible state, awaiting an owner ruling on what the player sees.
  MEASURED_REFUSED: 'measured_refused_awaiting_ruling',
});

export function createQuestMachine(bus) {
  let state = INITIAL_STATE;
  let epoch = 0; // one value per session; bumps on resetGame()
  let seq = 0; // bumps on every delivered change, so a ticket is ABA-proof within a session too
  let commit = COMMIT_STATUS.IDLE;
  let panelSeq = -1; // seq at which story-ui last showed a result panel
  // Run-to-completion: a send() or resetGame() made while listeners are hearing about a change is
  // queued, so every listener hears every change in the order it happened, and machine.state
  // equals payload.to while that payload is delivered (review F2).
  let tail = state; // the state once everything queued has been delivered
  const queue = [];
  let draining = false;

  function drain() {
    if (draining) return;
    draining = true;
    try {
      while (queue.length) {
        const job = queue.shift();
        state = job.payload.to;
        seq++;
        if (job.reset) { epoch++; commit = COMMIT_STATUS.IDLE; }
        bus.emit(BUS_EVENTS.QUEST_STATE_CHANGED, job.payload);
      }
    } finally {
      draining = false;
    }
  }

  function enqueue(payload, reset = false) {
    tail = payload.to;
    queue.push({ payload, reset });
    drain();
    return { ok: true, state: tail };
  }

  // contracts.transition throws on a wrong NAME (a bug at the call site) and refuses a right name
  // at the wrong time with ok:false; a refusal emits nothing.
  function advance(event) {
    const r = transition(tail, event);
    if (!r.ok) return { ok: false, state: tail, reason: r.reason };
    return enqueue({ from: tail, to: r.state, event });
  }

  function gate(event) {
    if (event === COMMIT) return `${COMMIT} is sent only by commitTransfer()`;
    if (ACKNOWLEDGEMENTS.has(event) && (panelSeq !== seq || queue.length)) return `${event} needs the result panel on screen first`;
    return null;
  }

  function send(event) {
    transition(tail, event); // a misspelt name throws even where the gate would refuse it
    const why = gate(event);
    if (why) return { ok: false, state: tail, reason: why };
    return advance(event);
  }

  function can(event) {
    try { return transition(tail, event).ok && !gate(event); } catch { return false; }
  }

  // §9.5: back to TITLE from anywhere, as a new session. Emits QUEST_STATE_CHANGED with
  // event: null (it is not a table edge); listeners restore player, terminals, flags, camera,
  // audio and UI on it. Every ticket from the old session becomes stale.
  const resetGame = () => enqueue({ from: tail, to: RESET_TO, event: null }, true);

  // Story-ui calls this once the result panel for the current state is on screen.
  function resultPanelShown() { if (!queue.length) panelSeq = seq; }

  // Async results are judged against the ticket they were asked under (review F3).
  const ticket = () => Object.freeze({ epoch, seq, state });
  const isCurrent = (t) => Boolean(t) && t.epoch === epoch && t.seq === seq && queue.length === 0;

  // Run one experiment and let its result decide (missionRules). Rejects only with what run() rejects.
  async function experiment(run) {
    const t = ticket();
    const result = await run();
    if (!isCurrent(t)) return { stale: true, result, event: null, reason: `asked in ${t.state} (session ${t.epoch}); the quest has moved on` };
    const verdict = eventForResult(t.state, result);
    if (!verdict.event || verdict.event === COMMIT) {
      return { stale: false, result, event: null, reason: verdict.event ? `${COMMIT} only via commitTransfer()` : verdict.reason };
    }
    const r = advance(verdict.event);
    return { stale: false, result, event: r.ok ? verdict.event : null, reason: r.ok ? verdict.reason : r.reason };
  }

  // The one live commit (§7.4). run() is the atomic engine call: fresh live Bell bits, the rule's
  // corrections, the receiver state and its fidelity (owner ruling, consult 3).
  async function commitTransfer(run) {
    if (commit !== COMMIT_STATUS.IDLE) return { ok: false, commit, reason: `commit already ${commit}` };
    if (tail !== proof.armed || queue.length) return { ok: false, commit, reason: `commit is not armed in ${tail}` };
    const t = ticket();
    commit = COMMIT_STATUS.IN_FLIGHT;
    let result;
    try {
      result = await run();
    } catch (err) {
      if (t.epoch === epoch) commit = COMMIT_STATUS.IDLE; // nothing measured: retry allowed
      return { ok: false, commit, error: err, reason: `commit call failed, nothing was measured: ${err?.message ?? err}` };
    }
    if (t.epoch !== epoch) return { ok: false, commit, stale: true, result, reason: 'the result belongs to a reset session' };
    const verdict = eventForResult(t.state, result);
    if (verdict.event !== COMMIT || !isCurrent(t)) {
      commit = COMMIT_STATUS.MEASURED_REFUSED;
      return { ok: false, commit, result, reason: verdict.event ? 'the quest moved during the commit' : verdict.reason };
    }
    commit = COMMIT_STATUS.COMMITTED;
    const r = advance(COMMIT);
    return { ok: r.ok, commit, result, state: r.state };
  }

  return {
    get state() { return state; },
    get epoch() { return epoch; },
    get commit() { return commit; },
    send, can, resetGame, resultPanelShown, ticket, isCurrent, experiment, commitTransfer,
  };
}

// §9.3: the consequences of entering `to`, as platform names them (art renders them, each
// idempotent). Empty for a state that has none.
export const worldChangesFor = (to) => (Object.hasOwn(WORLD_CHANGES, to) ? WORLD_CHANGES[to] : []);
