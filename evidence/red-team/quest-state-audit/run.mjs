// Quest-state audit harness. Drives the REAL gameplay modules (echo/game/*.js) and the platform
// contract (echo/contracts.js) from an export, fires every event in every reachable state, and diffs
// the behaviour against expected.mjs (derived from V§9 + owner rulings, not from the code).
//
//   node run.mjs --game <dir containing echo/game> --contracts <dir containing echo/contracts.js> [--json f]
//   exit 0 all checks green · 1 at least one red · 2 refused (could not import / zero checks ran)
//
// The only producer knowledge used is the SEAM: the ExperimentResult field names that
// missionRules.js documents in its header (experiment, parameters.*, measurementBits, fidelity,
// probabilities['receiver=0']). Every fidelity fed in is computed by oracle.mjs, never typed.
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXPECTED, MUST_VISIT_BEFORE_ENDING, DOC_STATES } from './expected.mjs';
import { blochState, teleportFidelity, physicsRule } from './oracle.mjs';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const GAME = arg('--game'); const CONTRACTS = arg('--contracts'); const JSON_OUT = arg('--json');
if (!GAME || !CONTRACTS) { console.error('usage: node run.mjs --game <dir> --contracts <dir>'); process.exit(2); }
const imp = (root, rel) => import(pathToFileURL(resolve(root, rel)).href);

let stateMod, rulesMod, busMod, contractsMod;
try {
  stateMod = await imp(GAME, 'echo/game/state.js');
  rulesMod = await imp(GAME, 'echo/game/missionRules.js');
  busMod = await imp(GAME, 'echo/game/eventBus.js');
  contractsMod = await imp(CONTRACTS, 'echo/contracts.js');
} catch (e) { console.error(`REFUSED: cannot import audited modules: ${e.message}`); process.exit(2); }

// ---------------------------------------------------------------- deterministic randomness
let seed = 20261011;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const freshGeneric = () => ({ theta: Math.acos(1 - 2 * rand()), phi: 2 * Math.PI * rand() });

// ---------------------------------------------------------------- machine adapters
// Gameplay: the real createQuestMachine on the real bus. ACK_HOOK is the positive-control API
// used ONLY so a fixed machine can still be walked; the red assertion in check ACK does not use it.
function gameplayMachine() {
  const bus = busMod.createEventBus({ onError: () => {} });
  const m = stateMod.createQuestMachine(bus);
  return {
    get state() { return m.state; },
    send: (ev) => { m.noteResultShown?.(); return m.send(ev).ok; },
    sendRaw: (ev) => m.send(ev).ok,
    reset: m.reset ? () => m.reset() : null,
  };
}
// Contracts: transition() is pure; a wrong NAME throws by design, counted here as a refusal.
function contractsMachine() {
  let s = contractsMod.INITIAL_STATE;
  const send = (ev) => { try { const r = contractsMod.transition(s, ev); if (r.ok) s = r.state; return r.ok; } catch { return false; } };
  return { get state() { return s; }, send, sendRaw: send, reset: null };
}

const EXPECTED_EVENTS = [...new Set(EXPECTED.map((r) => r[1]).filter((e) => e !== '*'))];
const PROBES = ['RESTART', 'BACK', 'CLOSE', 'BOOTED', 'BOOT_COMPLETE', 'OPEN_ENDING', 'RETRY', 'FAIL',
  'WRONG_CALIBRATION', 'DRY_RUN_FAILED', 'ANIMATION_END', 'toString', '__proto__', 'constructor', 'hasOwnProperty', ''];
function universe(table) {
  const fromTable = table ? Object.values(table).flatMap((r) => Object.keys(r)) : [];
  return [...new Set([...EXPECTED_EVENTS, ...fromTable, ...PROBES])];
}

// BFS over the real machine: shortest event path to every reachable state, and the observed
// outcome of every (state, event) pair.
function explore(make, events) {
  const paths = { [make().state]: [] };
  const obs = {};
  const queue = [make().state];
  while (queue.length) {
    const s = queue.shift();
    obs[s] = {};
    for (const ev of events) {
      const m = make();
      for (const p of paths[s]) m.send(p);
      if (m.state !== s) throw new Error(`replay of path to ${s} landed in ${m.state}`);
      const ok = m.sendRaw(ev);
      obs[s][ev] = ok ? m.state : null;
      if (ok && !(m.state in paths)) { paths[m.state] = [...paths[s], ev]; queue.push(m.state); }
    }
  }
  return { paths, obs };
}

// ---------------------------------------------------------------- results (seam shapes)
const cloneResult = (state, fidelity) => ({ experiment: 'cloning', engine: 'exact_qiskit_local', parameters: { state }, fidelity });
const bellResult = (senderGate) => ({ experiment: 'bell_signalling', engine: 'exact_qiskit_local', parameters: { senderGate }, probabilities: { 'receiver=0': 0.5, 'receiver=1': 0.5 } });
function teleResult(stateId, m0, m1, x, z, st = freshGeneric()) {
  const f = teleportFidelity(blochState(st.theta, st.phi), m0, m1, x, z);
  return { experiment: 'teleportation', engine: 'exact_qiskit_local', parameters: { stateId, correctionX: x, correctionZ: z, theta: st.theta, phi: st.phi }, measurementBits: { m0, m1 }, fidelity: f };
}
const TOKEN = rulesMod.STORY_TOKEN_ID ?? 'story_token';
const verdict = (state, r) => rulesMod.eventForResult(state, r).event;

// ---------------------------------------------------------------- checks
const checks = [];
// Each check gets a fresh missionRules instance, so module-level state (e.g. a token latch or a
// used-state set in a fixed version) cannot leak between checks and mask or fake a result.
let nImport = 0;
const freshRules = async () => { rulesMod = await import(`${pathToFileURL(resolve(GAME, 'echo/game/missionRules.js')).href}?i=${++nImport}`); };
const pending = [];
const check = (id, source, fn) => pending.push({ id, source, fn });
async function runChecks() { for (const { id, source, fn } of pending) { await freshRules(); runOne(id, source, fn); } }
const runOne = (id, source, fn) => {
  let fails = [];
  try { fails = fn() ?? []; } catch (e) { fails = [`threw: ${e.stack?.split('\n')[0]}`]; }
  checks.push({ id, source, verdict: fails.length ? 'FAIL' : 'PASS', fails });
};

function tableChecks(prefix, make, table, label) {
  const { paths, obs } = explore(make, universe(table));
  const reach = Object.keys(paths);
  check(`${prefix}-STATES`, 'V§9.1', () => DOC_STATES.filter((s) => !reach.includes(s)).map((s) => `${label}: doc state ${s} unreachable from BOOT`)
    .concat(reach.filter((s) => !DOC_STATES.includes(s)).map((s) => `${label}: state ${s} not in V§9.1`)));
  check(`${prefix}-EDGES`, 'V§9.2 + R13.1/R13.12', () => {
    const f = [];
    for (const [from, ev, to, src] of EXPECTED) {
      if (!obs[from]) { f.push(`${from} unreachable, cannot test ${ev} (${src})`); continue; }
      if (ev === 'RESTART' && make().reset) { // R13.12 may be met by resetGame() instead of an edge
        const m = make(); for (const p of paths[from]) m.send(p); m.reset();
        if (!to.includes(m.state)) f.push(`${from} reset() -> ${m.state}, want one of ${to} (${src})`); continue;
      }
      if (ev === 'RESTART' && !make().reset && obs[from].RESTART == null) { f.push(`${from} --RESTART--> refused and no reset() on this module (${src})`); continue; }
      if (ev === '*') { if (!Object.values(obs[from]).includes(to)) f.push(`${from} has no edge to ${to} (${src})`); continue; }
      const got = obs[from][ev];
      const want = Array.isArray(to) ? to : [to];
      if (!want.includes(got)) f.push(`${from} --${ev}--> ${got ?? 'REFUSED'}, want ${want.join('|')} (${src})`);
    }
    return f;
  });
  check(`${prefix}-EXTRA`, 'V§9.2 transition(): anything else refused', () => {
    const f = [];
    for (const [from, row] of Object.entries(obs)) for (const [ev, to] of Object.entries(row)) {
      if (to == null) continue;
      const ok = EXPECTED.some(([a, e, b]) => a === from && (e === ev || e === '*') && (Array.isArray(b) ? b.includes(to) : b === to));
      if (!ok) f.push(`${label}: undocumented edge ${from} --${ev}--> ${to}`);
    }
    return f;
  });
  return { paths, obs };
}

// The graph a player can walk: observed edges + reset() from anywhere (if the module has one).
function graph(obs, make) {
  const g = {};
  for (const [s, row] of Object.entries(obs)) g[s] = Object.values(row).filter(Boolean);
  if (make().reset) { const m = make(); m.reset(); const r = m.state; for (const s of Object.keys(g)) g[s].push(r); }
  return g;
}
function reachable(g, from, avoid) {
  const seen = new Set([from]); const q = [from];
  while (q.length) { const s = q.shift(); for (const n of g[s] ?? []) if (n !== avoid && !seen.has(n)) { seen.add(n); q.push(n); } }
  return seen;
}

const G = tableChecks('GAME', gameplayMachine, stateMod.TRANSITIONS, 'gameplay state.js');
const C = tableChecks('CONTRACT', contractsMachine, contractsMod.TRANSITIONS, 'platform contracts.js');

check('PARITY', 'owner relay "gameplay imports its quest table from echo/contracts.js"', () => {
  const f = [];
  for (const s of new Set([...Object.keys(G.obs), ...Object.keys(C.obs)])) {
    for (const ev of new Set([...Object.keys(G.obs[s] ?? {}), ...Object.keys(C.obs[s] ?? {})])) {
      const a = G.obs[s]?.[ev] ?? null; const b = C.obs[s]?.[ev] ?? null;
      if (a !== b) f.push(`${s} --${ev}--> gameplay ${a ?? 'REFUSED'} vs contracts ${b ?? 'REFUSED'}`);
    }
  }
  return f;
});

for (const [prefix, R, make] of [['GAME', G, gameplayMachine], ['CONTRACT', C, contractsMachine]]) {
  const g = graph(R.obs, make);
  check(`${prefix}-NOSKIP`, 'V§9.2 chain; CLAUDE.md "Playable"', () => {
    if (!reachable(g, 'BOOT').has('ENDING')) return ['ENDING not reachable at all'];
    return MUST_VISIT_BEFORE_ENDING.filter((m) => reachable(g, 'BOOT', m).has('ENDING')).map((m) => `ENDING reachable from BOOT without visiting ${m}`);
  });
  check(`${prefix}-ENDING-ENTRY`, 'V§9.2 + R13.1', () => Object.entries(g)
    .filter(([s, ns]) => ns.includes('ENDING') && !['TELEPORT_COMMITTED', 'DECLASSIFIED', 'ENDING'].includes(s))
    .map(([s]) => `ENDING entered from ${s}`));
  check(`${prefix}-COMMIT-ONCE`, 'V§7.4, V§9.3 idempotence', () => {
    const f = [];
    const m = make(); for (const p of R.paths.TELEPORT_DRY_RUN_PASSED ?? ['<unreachable>']) m.send(p);
    if (m.state !== 'TELEPORT_DRY_RUN_PASSED') return ['TELEPORT_DRY_RUN_PASSED unreachable'];
    if (!m.sendRaw('COMMIT_TRANSFER')) f.push('first COMMIT_TRANSFER refused');
    if (m.sendRaw('COMMIT_TRANSFER')) f.push('second COMMIT_TRANSFER accepted');
    // Within one session the commit edge must never be armed again after it fired. A path through
    // TITLE is a new session (V§9.5 resetGame), so TITLE is the session boundary and is not walked.
    const g0 = graph(R.obs, () => ({ reset: null, state: 'BOOT' }));
    if (reachable(g0, 'TELEPORT_COMMITTED', 'TITLE').has('TELEPORT_DRY_RUN_PASSED')) f.push('TELEPORT_DRY_RUN_PASSED re-armed after commit within the same session');
    // Fuzz: 3000 random walks of 120 events (resets included); one commit per session at most.
    const evs = universe(); let sessions = 0;
    for (let w = 0; w < 3000 && !f.length; w++) {
      const x = make(); let commits = 0;
      for (let i = 0; i < 120; i++) {
        if (x.reset && rand() < 0.01) { x.reset(); commits = 0; sessions++; continue; }
        const ev = rand() < 0.5 ? (R.paths[x.state] ? Object.keys(R.obs[x.state]).find((e) => R.obs[x.state][e]) ?? 'X' : 'X') : evs[Math.floor(rand() * evs.length)];
        const from = x.state; const moved = x.send(ev);
        if (moved && x.state === 'TITLE') { commits = 0; sessions++; } // RESTART edge = new session (V§9.5)
        if (moved && ev === 'COMMIT_TRANSFER') { commits++; if (from !== 'TELEPORT_DRY_RUN_PASSED') f.push(`COMMIT_TRANSFER fired from ${from}`); }
        if (commits > 1) { f.push(`walk ${w}: two commits in one session`); break; }
      }
    }
    return f;
  });
}

// --- below the FSM: what the rules let a terminal do with results (gameplay only) ------------
const walkTo = (target) => { const m = gameplayMachine(); for (const p of G.paths[target] ?? []) m.send(p); return m; };

check('TOKEN-ELSEWHERE', 'V§7.4: the token is measured only at the final commit', () => {
  const f = [];
  for (const s of Object.keys(G.obs)) {
    if (s === 'TELEPORT_DRY_RUN_PASSED') continue;
    for (const [m0, m1] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
      const r = teleResult(TOKEN, m0, m1, m1 === 1, m0 === 1);
      const ev = verdict(s, r);
      if (ev) f.push(`story-token result in ${s} yields ${ev}`);
    }
  }
  return f;
});

check('TOKEN-LATCH', 'V§7.4 "do not let the player re-run teleportation of the already-measured token"; RG3.1 "latched once recorded"', () => {
  const f = [];
  // A live commit result that comes back (successfully computed) with the wrong corrections for its
  // live bits. The token is now measured. No second story-token result may then advance the quest.
  const m = walkTo('TELEPORT_DRY_RUN_PASSED');
  const first = teleResult(TOKEN, 1, 1, false, false);
  const ev1 = verdict(m.state, first);
  if (ev1) m.send(ev1);
  const second = teleResult(TOKEN, 0, 1, true, false);
  const ev2 = verdict(m.state, second);
  if (ev2) f.push(`after a recorded commit result (F=${first.fidelity.toFixed(3)}) in TELEPORT_DRY_RUN_PASSED, a SECOND story-token measurement yields ${ev2} -> token measured twice`);
  return f;
});

check('ERR-COMMIT', 'RG3.1: an errored commit records nothing; retry allowed', () => {
  const f = [];
  const m = walkTo('TELEPORT_DRY_RUN_PASSED');
  for (const bad of [null, undefined, {}, { experiment: 'teleportation' }, { experiment: 'teleportation', parameters: { stateId: TOKEN } }]) {
    const ev = verdict(m.state, bad); if (ev) f.push(`errored result ${JSON.stringify(bad)} yields ${ev}`);
  }
  if (m.state !== 'TELEPORT_DRY_RUN_PASSED') f.push(`state moved to ${m.state} on an error`);
  const ok = verdict(m.state, teleResult(TOKEN, 1, 0, false, true));
  if (ok !== 'COMMIT_TRANSFER') f.push(`a good commit after errors yields ${ok}, want COMMIT_TRANSFER`);
  return f;
});

check('DRY-RULE', 'V§7.4 + oracle physics; CLAUDE.md "all four conditional correction choices"', () => {
  const f = [];
  for (const [m0, m1] of [[0, 1], [1, 0], [1, 1]]) {
    const want = physicsRule(m0, m1);
    for (const x of [false, true]) for (const z of [false, true]) {
      const r = teleResult(`calibration_${Math.floor(rand() * 1e9)}`, m0, m1, x, z);
      const right = x === want.applyX && z === want.applyZ;
      const ev = verdict('TELEPORT_DRY_RUN', r);
      if (right && ev !== 'CORRECT_CALIBRATION') f.push(`m0=${m0} m1=${m1} correct (X=${x},Z=${z}) F=${r.fidelity.toFixed(6)} refused`);
      if (!right && ev) f.push(`m0=${m0} m1=${m1} WRONG (X=${x},Z=${z}) F=${r.fidelity.toFixed(6)} accepted as ${ev}`);
    }
  }
  return f;
});

check('DRY-00', 'RG3.2: COMMIT unlocks only after a correct dry run whose bits are NOT 00', () => {
  const r = teleResult('calibration_00', 0, 0, false, false);
  const ev = verdict('TELEPORT_DRY_RUN', r);
  return ev ? [`bits m0=0 m1=0 with no corrections (F=${r.fidelity.toFixed(6)}) yields ${ev} -> COMMIT unlocked without the player applying X or Z`] : [];
});

check('FRESH', 'R13.11: a wrong dry run retries on a FRESH calibration state', () => {
  const st = freshGeneric();
  const wrong = teleResult('calibration_A', 1, 0, false, false, st);
  if (verdict('TELEPORT_DRY_RUN', wrong)) return ['setup: wrong calibration accepted'];
  const sameAgain = teleResult('calibration_A', 1, 0, false, true, st);
  const ev = verdict('TELEPORT_DRY_RUN', sameAgain);
  return ev ? [`after a wrong dry run on calibration_A, a retry on the SAME state (same stateId, theta, phi) yields ${ev}`] : [];
});

check('ACK', 'R13.13: acknowledgements advance only after the result panel was shown', () => {
  const f = [];
  for (const [s, ev] of [['CLONE_SUPERPOSITION_FAILED', 'EXPLANATION_READ'], ['RELAY_SEND_FAILED', 'VIEW_RECEIVER_MARGINAL']]) {
    const m = walkTo(s);
    if (m.state !== s) { f.push(`${s} unreachable`); continue; }
    if (m.sendRaw(ev)) f.push(`${ev} accepted in ${s} with no result-panel signal of any kind (0 ms after entry)`);
  }
  return f;
});

check('PLAYTHROUGH', 'V§9.2 legal path, results through missionRules; CLAUDE.md "Playable"', () => {
  const f = []; const m = gameplayMachine(); let tokenHandovers = 0;
  const step = (ev) => { if (!m.send(ev)) f.push(`${m.state} refused ${ev}`); };
  const res = (r) => { const ev = verdict(m.state, r); if (!ev) f.push(`${m.state}: rule refused ${JSON.stringify(r.parameters)}`); else step(ev); };
  // BOOT -> TITLE by whichever event the module names (the NAME is graded by GAME-EDGES, not here).
  step(Object.keys(G.obs.BOOT ?? {}).find((k) => G.obs.BOOT[k] === 'TITLE') ?? 'BOOT_COMPLETE');
  for (const e of ['START', 'SKIP', 'OPEN_CLONE_BOOTH']) step(e);
  res(cloneResult('zero', 1)); res(cloneResult('plus', 0.75)); step('EXPLANATION_READ'); step('EXIT_BOOTH'); step('REACH_RELAY');
  res(bellResult('I')); res(bellResult('X')); step('VIEW_RECEIVER_MARGINAL'); step('OPEN_ROOFTOP'); step('REPAIR_CLASSICAL_LINK'); step('RUN_DRY_TEST');
  res(teleResult('calibration_1', 1, 1, true, true));
  tokenHandovers++; res(teleResult(TOKEN, 0, 1, true, false));
  step('ANIMATION_END');
  if (m.state !== 'ENDING') f.push(`playthrough ended in ${m.state}`);
  if (tokenHandovers !== 1) f.push(`${tokenHandovers} story-token results needed`);
  return f;
});

await runChecks();
// ---------------------------------------------------------------- report
if (!checks.length) { console.error('REFUSED: zero checks ran'); process.exit(2); }
for (const c of checks) {
  console.log(`${c.verdict.padEnd(4)} ${c.id.padEnd(22)} [${c.source}]`);
  for (const x of c.fails.slice(0, 12)) console.log(`       - ${x}`);
  if (c.fails.length > 12) console.log(`       ... ${c.fails.length - 12} more`);
}
const red = checks.filter((c) => c.verdict === 'FAIL').length;
console.log(`\n${checks.length} checks: ${checks.length - red} green, ${red} red`);
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(checks, null, 2));
process.exit(red ? 1 : 0);
