// Quest-state audit harness. Drives the REAL gameplay modules (echo/game/*.js) and the platform
// contract (echo/contracts.js) from an export, fires every event in every reachable state, and diffs
// the behaviour against expected.mjs (derived from V§9 + owner rulings, not from the code).
//
//   node run.mjs --game <dir containing echo/game> --contracts <dir containing echo/contracts.js>
//                --results <real-results.json from quest-state-regrade/dump_regrade.py> [--json f]
//   exit 0 all checks green · 1 at least one red · 2 refused (could not import / zero checks ran)
//
// Every ExperimentResult fed in is the quantum engine's own output (--results), never typed here.
// The only producer knowledge used is the SEAM: the field names missionRules.js documents in its
// header (parameters.stateId, parameters.correctionX/Z, top-level fidelity). seam() fills those names
// from the engine's own fields and creates no number; PLAYTHROUGH-RAW feeds the results unaliased.
//
// Two machine APIs are walked: the d5ec620 one (sync send(); a terminal judges with eventForResult
// and sends the event) and the migrated one (experiment(run), commitTransfer(run), resultPanelShown(),
// tickets, resetGame()). On the migrated API commitTransfer() is the only route to COMMIT_TRANSFER.
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXPECTED, MUST_VISIT_BEFORE_ENDING, DOC_STATES } from './expected.mjs';
import { blochState, teleportFidelity, physicsRule, naiveCloneFidelity } from './oracle.mjs';

// Any uncaught error is "no verdict", never a red (law 7): exit 2.
process.on('uncaughtException', (e) => { console.error(`REFUSED: harness crashed: ${e.stack}`); process.exit(2); });
process.on('unhandledRejection', (e) => { console.error(`REFUSED: harness crashed: ${e?.stack ?? e}`); process.exit(2); });
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const GAME = arg('--game'); const CONTRACTS = arg('--contracts'); const RESULTS = arg('--results'); const JSON_OUT = arg('--json');
if (!GAME || !CONTRACTS || !RESULTS) { console.error('usage: node run.mjs --game <dir> --contracts <dir> --results <json>'); process.exit(2); }
const imp = (root, rel) => import(pathToFileURL(resolve(root, rel)).href);

let stateMod, rulesMod, busMod, contractsMod, REAL;
try {
  stateMod = await imp(GAME, 'echo/game/state.js');
  rulesMod = await imp(GAME, 'echo/game/missionRules.js');
  busMod = await imp(GAME, 'echo/game/eventBus.js');
  contractsMod = await imp(CONTRACTS, 'echo/contracts.js');
} catch (e) { console.error(`REFUSED: cannot import audited modules: ${e.message}`); process.exit(2); }
try { REAL = JSON.parse(readFileSync(RESULTS, 'utf8')); } catch (e) { console.error(`REFUSED: cannot read real results: ${e.message}`); process.exit(2); }
for (const k of ['happy', 'branches', 'clones', 'bell', 'commits']) if (!REAL[k]) { console.error(`REFUSED: real results lack "${k}"`); process.exit(2); }

// ---------------------------------------------------------------- deterministic randomness
let seed = 20261011;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };

// ---------------------------------------------------------------- real engine results
// Bloch angles of the engine's prepared states (quantum/__init__.py STATES: ry(theta) then rz(phi)),
// used ONLY by ENGINE-ORACLE to re-derive every fidelity independently.
const BLOCH = { zero: [0, 0], one: [Math.PI, 0], plus: [Math.PI / 2, 0], minus: [Math.PI / 2, Math.PI], phase: [Math.PI / 2, Math.PI / 2], bloch_a: [1.137, 0.44], bloch_b: [2.3, -1.9] };
const GENERIC = ['bloch_a', 'bloch_b'];
const TOKEN = rulesMod.STORY_TOKEN_ID ?? 'story_token';
const clone = (k) => structuredClone(REAL.clones[k]);
const bell = (g) => structuredClone(REAL.bell[g]);
function branch(state, m0, m1, x, z) {
  const r = REAL.branches.find((b) => b.parameters.state === state && b.parameters.m0 === m0 && b.parameters.m1 === m1 && b.parameters.applyX === x && b.parameters.applyZ === z);
  if (!r) throw new Error(`no real branch ${state} ${m0}${m1} X=${x} Z=${z}`);
  return structuredClone(r);
}
function liveCommit(m0, m1) {
  const r = REAL.commits.find((c) => c.measurementBits.m0 === m0 && c.measurementBits.m1 === m1);
  if (!r) throw new Error(`no real commit with bits ${m0}${m1}`);
  return structuredClone(r);
}
// Names-only alias onto the field names missionRules.js documents. live_commit applies the rule
// inside the call (its docstring), so the corrections it applied are named from the bits by the
// oracle's rule. A clone's |<psi psi|out>|^2 is the engine's observables.jointFidelityWithTwoCopies.
function seam(r, stateId) {
  const p = { ...r.parameters };
  if (r.experiment === 'teleportation') {
    p.stateId = stateId;
    if ('applyX' in p) { p.correctionX = p.applyX; p.correctionZ = p.applyZ; } else if (r.measurementBits) {
      const rule = physicsRule(r.measurementBits.m0, r.measurementBits.m1); p.correctionX = rule.applyX; p.correctionZ = rule.applyZ;
    }
  }
  const out = { ...r, parameters: p };
  if (r.experiment === 'cloning' && out.fidelity === undefined) out.fidelity = r.observables?.jointFidelityWithTwoCopies;
  return out;
}
const cal = (state, m0, m1, x, z) => seam(branch(state, m0, m1, x, z), `calibration_${state}`);
const tokenCommit = (m0 = 0, m1 = 1) => seam(liveCommit(m0, m1), TOKEN);
// A commit result that came back computed but shows no correct transfer: the engine's own branch
// on the token state with the corrections withheld (F < 1). Used where a refused commit is needed.
const refusedCommit = () => seam(branch('bloch_b', 1, 1, false, false), TOKEN);
const correctCal = (state = 'bloch_a') => { const [m0, m1] = [1, 0]; const r = physicsRule(m0, m1); return cal(state, m0, m1, r.applyX, r.applyZ); };
const verdict = (state, r) => rulesMod.eventForResult(state, r).event;

// ---------------------------------------------------------------- machine adapters
// Results a terminal would hand over for each outcome-named mission event (V§9.2), used only when
// a machine refuses that event from send(): the BFS then walks it the way the product must.
const RESULT_FOR = { BASIS_DEMO_OK: () => seam(clone('zero')), SUPERPOSITION_DEMO_FAILED: () => seam(clone('plus')),
  PREPARE_BELL_PAIR: () => bell('I'), ATTEMPT_NO_SIGNALLING: () => bell('X'), CORRECT_CALIBRATION: () => correctCal() };
function gameplayMachine() {
  const bus = busMod.createEventBus({ onError: () => {} });
  const m = stateMod.createQuestMachine(bus);
  const migrated = typeof m.commitTransfer === 'function';
  const panel = () => { m.noteResultShown?.(); m.resultPanelShown?.(); };
  // A module that THROWS on an unknown event name (contracts.js design) is refusing it.
  const raw = (ev) => { try { return m.send(ev).ok; } catch { return false; } };
  const x = {
    m, migrated, runs: 0, tokenRuns: 0,
    get state() { return m.state; },
    // The run closure handed to the machine; it counts how often the machine let a request leave.
    run(r) { return async () => { x.runs++; if (r?.parameters?.stateId === TOKEN) x.tokenRuns++; if (r instanceof Error) throw r; return r; }; },
    // A terminal hands one result over. Old API: the terminal measures, judges and sends.
    async result(r) {
      if (m.experiment) return (await m.experiment(x.run(r))).event ?? null;
      await x.run(r)(); const ev = verdict(m.state, r); return ev && raw(ev) ? ev : null;
    },
    async commit(r) {
      if (migrated) { const o = await m.commitTransfer(x.run(r)); return o.ok === true; }
      return (await x.result(r)) === 'COMMIT_TRANSFER';
    },
    // As a real UI: the result panel is shown before an event is sent.
    async send(ev) {
      panel();
      if (ev === 'COMMIT_TRANSFER' && migrated) return x.commit(tokenCommit());
      if (raw(ev)) return true;
      if (Object.hasOwn(RESULT_FOR, ev) && m.experiment) return (await x.result(RESULT_FOR[ev]())) === ev;
      return false;
    },
    sendRaw: async (ev) => raw(ev),
    panel,
    reset: (m.resetGame ?? m.reset) ? () => (m.resetGame ?? m.reset)() : null,
  };
  return x;
}
// Contracts: transition() is pure; a wrong NAME throws by design, counted here as a refusal.
function contractsMachine() {
  let s = contractsMod.INITIAL_STATE;
  const send = async (ev) => { try { const r = contractsMod.transition(s, ev); if (r.ok) s = r.state; return r.ok; } catch { return false; } };
  return { get state() { return s; }, send, sendRaw: send, reset: null };
}

const EXPECTED_EVENTS = [...new Set(EXPECTED.map((r) => r[1]).filter((e) => e !== '*'))];
const PROBES = ['RESTART', 'BACK', 'CLOSE', 'CLOSE_SCIENCE', 'BOOTED', 'BOOT_COMPLETE', 'OPEN_ENDING', 'RETRY', 'FAIL',
  'WRONG_CALIBRATION', 'DRY_RUN_FAILED', 'ANIMATION_END', 'toString', '__proto__', 'constructor', 'hasOwnProperty', ''];
function universe(table) {
  const fromTable = table ? Object.values(table).flatMap((r) => Object.keys(r)) : [];
  return [...new Set([...EXPECTED_EVENTS, ...fromTable, ...PROBES])];
}

// BFS over the real machine: shortest event path to every reachable state, and the observed
// outcome of every (state, event) pair.
async function walk(make, path) { const m = make(); for (const p of path) await m.send(p); return m; }
async function explore(make, events) {
  const s0 = make().state;
  const paths = { [s0]: [] };
  const obs = {};
  const queue = [s0];
  while (queue.length) {
    const s = queue.shift();
    obs[s] = {};
    for (const ev of events) {
      const m = await walk(make, paths[s]);
      if (m.state !== s) throw new Error(`replay of path to ${s} landed in ${m.state}`);
      const ok = await m.send(ev); // as a real UI would: result panel shown first (ACK grades the raw path)
      obs[s][ev] = ok ? m.state : null;
      if (ok && !(m.state in paths)) { paths[m.state] = [...paths[s], ev]; queue.push(m.state); }
    }
  }
  return { paths, obs };
}

// ---------------------------------------------------------------- checks
const checks = [];
// Each check gets a fresh missionRules instance, so module-level state (e.g. a token latch or a
// used-state set in a fixed version) cannot leak between checks and mask or fake a result.
let nImport = 0;
const freshRules = async () => { rulesMod = await import(`${pathToFileURL(resolve(GAME, 'echo/game/missionRules.js')).href}?i=${++nImport}`); };
const pending = [];
const check = (id, source, fn) => pending.push({ id, source, fn });
async function runChecks() {
  for (const { id, source, fn } of pending) {
    await freshRules();
    let fails = [];
    try { fails = (await fn()) ?? []; } catch (e) { fails = [`threw: ${e.stack?.split('\n')[0]}`]; }
    checks.push({ id, source, verdict: fails.length ? 'FAIL' : 'PASS', fails });
  }
}

async function tableChecks(prefix, make, table, label) {
  const { paths, obs } = await explore(make, universe(table));
  const reach = Object.keys(paths);
  check(`${prefix}-STATES`, 'V§9.1', () => DOC_STATES.filter((s) => !reach.includes(s)).map((s) => `${label}: doc state ${s} unreachable from BOOT`)
    .concat(reach.filter((s) => !DOC_STATES.includes(s)).map((s) => `${label}: state ${s} not in V§9.1`)));
  check(`${prefix}-EDGES`, 'V§9.2 + R13.1/R13.12', async () => {
    const f = [];
    for (const [from, ev, to, src] of EXPECTED) {
      if (!obs[from]) { f.push(`${from} unreachable, cannot test ${ev} (${src})`); continue; }
      if (ev === 'RESTART' && make().reset) { // R13.12 may be met by resetGame() instead of an edge
        const m = await walk(make, paths[from]); m.reset();
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

const G = await tableChecks('GAME', gameplayMachine, stateMod.TRANSITIONS, 'gameplay state.js');
const C = await tableChecks('CONTRACT', contractsMachine, contractsMod.TRANSITIONS, 'platform contracts.js');

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
  check(`${prefix}-COMMIT-ONCE`, 'V§7.4, V§9.3 idempotence', async () => {
    const f = [];
    const m = await walk(make, R.paths.TELEPORT_DRY_RUN_PASSED ?? ['<unreachable>']);
    if (m.state !== 'TELEPORT_DRY_RUN_PASSED') return ['TELEPORT_DRY_RUN_PASSED unreachable'];
    if (!(await m.send('COMMIT_TRANSFER'))) f.push('first COMMIT_TRANSFER refused');
    if (await m.send('COMMIT_TRANSFER')) f.push('second COMMIT_TRANSFER accepted');
    // Within one session the commit edge must never be armed again after it fired. A path through
    // TITLE is a new session (V§9.5 resetGame), so TITLE is the session boundary and is not walked.
    const g0 = graph(R.obs, () => ({ reset: null, state: 'BOOT' }));
    if (reachable(g0, 'TELEPORT_COMMITTED', 'TITLE').has('TELEPORT_DRY_RUN_PASSED')) f.push('TELEPORT_DRY_RUN_PASSED re-armed after commit within the same session');
    // Fuzz: 3000 random walks of 120 events (resets included); one commit per session at most.
    const evs = universe();
    for (let w = 0; w < 3000 && !f.length; w++) {
      const x = make(); let commits = 0;
      for (let i = 0; i < 120; i++) {
        if (x.reset && rand() < 0.01) { x.reset(); commits = 0; continue; }
        const ev = rand() < 0.5 ? (R.obs[x.state] ? Object.keys(R.obs[x.state]).find((e) => R.obs[x.state][e]) ?? 'X' : 'X') : evs[Math.floor(rand() * evs.length)];
        const from = x.state; const moved = await x.send(ev);
        if (moved && x.state === 'TITLE') commits = 0; // RESTART edge = new session (V§9.5)
        if (moved && ev === 'COMMIT_TRANSFER') { commits++; if (from !== 'TELEPORT_DRY_RUN_PASSED') f.push(`COMMIT_TRANSFER fired from ${from}`); }
        if (commits > 1) { f.push(`walk ${w}: two commits in one session`); break; }
      }
    }
    return f;
  });
}

// --- below the FSM: what the machine and rules let a terminal do with real results (gameplay) ---
const walkTo = (target) => walk(gameplayMachine, G.paths[target] ?? []);
const at = async (target) => { const m = await walkTo(target); if (m.state !== target) throw new Error(`${target} unreachable`); return m; };
const fromStart = (target) => G.paths[target].slice(G.paths[target].indexOf('START'));

check('ENGINE-ORACLE', 'independence: every fed fidelity re-derived by oracle.mjs (cross-checked vs Qiskit in crosscheck.py)', () => {
  const f = [];
  for (const b of REAL.branches) {
    const [th, ph] = BLOCH[b.parameters.state];
    const want = teleportFidelity(blochState(th, ph), b.parameters.m0, b.parameters.m1, b.parameters.applyX, b.parameters.applyZ);
    if (Math.abs(want - b.fidelity) > 1e-9) f.push(`branch ${JSON.stringify(b.parameters)}: engine F=${b.fidelity} oracle ${want}`);
  }
  for (const [k, c] of Object.entries(REAL.clones)) {
    const want = naiveCloneFidelity(...BLOCH[k]);
    if (Math.abs(want - c.observables.jointFidelityWithTwoCopies) > 1e-9) f.push(`clone ${k}: engine ${c.observables.jointFidelityWithTwoCopies} oracle ${want}`);
  }
  if (REAL.branches.length < 64) f.push(`only ${REAL.branches.length} real branches: the regrade needs every branch of the two generic states`);
  return f;
});

check('TOKEN-ELSEWHERE', 'V§7.4: the token is measured only at the final commit', () => {
  const f = [];
  for (const s of Object.keys(G.obs)) {
    if (s === 'TELEPORT_DRY_RUN_PASSED') continue;
    for (const [m0, m1] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
      const ev = verdict(s, seam(liveCommit(m0, m1), TOKEN));
      if (ev) f.push(`story-token result in ${s} yields ${ev}`);
    }
  }
  return f;
});

check('TOKEN-LATCH', 'V§7.4 "do not let the player re-run teleportation of the already-measured token"; RG3.1 "latched once recorded"', async () => {
  const f = [];
  // A commit result that comes back computed but refused: the token is now measured. No second
  // commit may then leave the machine, and none may advance the quest.
  const m = await at('TELEPORT_DRY_RUN_PASSED');
  const first = refusedCommit();
  if (await m.commit(first)) return [`setup: a commit with withheld corrections (F=${first.fidelity.toFixed(3)}) was accepted`];
  const before = m.tokenRuns;
  if (await m.commit(tokenCommit())) f.push(`after a recorded refused commit (F=${first.fidelity.toFixed(3)}), a SECOND story-token commit advanced to ${m.state}`);
  if (m.tokenRuns > before) f.push(`after a recorded refused commit, a second story-token request left the machine (${m.tokenRuns} token measurements)`);
  return f;
});

check('TOKEN-RUN-GUARD', 'V§7.4 + P-ONCE: the token is measured exactly once per session, only via the commit', async () => {
  const f = [];
  // experiment() in the armed state: its only rule IS the commit, so the request it runs is a
  // token measurement outside the latch. Then the real commit. Token measurements in the session must be 1.
  const m = await at('TELEPORT_DRY_RUN_PASSED');
  await m.result(tokenCommit(1, 1));
  const ok = await m.commit(tokenCommit(0, 1));
  if (ok && m.tokenRuns > 1) f.push(`experiment() in TELEPORT_DRY_RUN_PASSED ran a story-token request outside commitTransfer, then the commit measured again: ${m.tokenRuns} token measurements in one session`);
  // After the commit, further story-token requests through experiment() must not leave either.
  const m2 = await at('TELEPORT_DRY_RUN_PASSED');
  await m2.commit(tokenCommit());
  const n = m2.tokenRuns;
  await m2.result(tokenCommit(1, 0));
  if (m2.tokenRuns > n) f.push(`after the commit (latch ${m2.m.commit ?? 'n/a'}), experiment() in ${m2.state} still ran a story-token request`);
  return f;
});

check('ERR-COMMIT', 'RG3.1: an errored commit records nothing; retry allowed', async () => {
  const f = [];
  for (const bad of [new Error('engine call failed'), null, undefined, {}, { experiment: 'teleportation' }, { experiment: 'teleportation', parameters: { stateId: TOKEN } }]) {
    const m = await at('TELEPORT_DRY_RUN_PASSED');
    const label = bad instanceof Error ? 'a thrown error' : `errored result ${JSON.stringify(bad)}`;
    let ok = false;
    try { ok = await m.commit(bad); } catch { ok = false; }
    if (ok) f.push(`${label} counted as a commit`);
    if (m.state !== 'TELEPORT_DRY_RUN_PASSED') f.push(`${label}: state moved to ${m.state}`);
    if (!(await m.commit(tokenCommit()))) f.push(`after ${label}, a good commit is refused (latch ${m.m.commit ?? 'n/a'}): no retry`);
  }
  return f;
});

check('DRY-RULE', 'V§7.4 + oracle physics; CLAUDE.md "all four conditional correction choices"', () => {
  const f = [];
  for (const st of GENERIC) for (const [m0, m1] of [[0, 1], [1, 0], [1, 1]]) {
    const want = physicsRule(m0, m1);
    for (const x of [false, true]) for (const z of [false, true]) {
      const r = cal(st, m0, m1, x, z);
      const right = x === want.applyX && z === want.applyZ;
      const ev = verdict('TELEPORT_DRY_RUN', r);
      if (right && ev !== 'CORRECT_CALIBRATION') f.push(`${st} m0=${m0} m1=${m1} correct (X=${x},Z=${z}) F=${r.fidelity.toFixed(6)} refused`);
      if (!right && ev) f.push(`${st} m0=${m0} m1=${m1} WRONG (X=${x},Z=${z}) F=${r.fidelity.toFixed(6)} accepted as ${ev}`);
    }
  }
  return f;
});

check('DRY-00', 'RG3.2: COMMIT unlocks only after a correct dry run whose bits are NOT 00', () => {
  const f = [];
  for (const st of GENERIC) for (const x of [false, true]) for (const z of [false, true]) {
    const r = cal(st, 0, 0, x, z); const ev = verdict('TELEPORT_DRY_RUN', r);
    if (ev) f.push(`${st} bits m0=0 m1=0 (X=${x},Z=${z}, F=${r.fidelity.toFixed(6)}) yields ${ev} -> COMMIT unlocked without the player applying X or Z`);
  }
  return f;
});

check('DRY-UNEARNED', 'RG3.2 + V§9.2: an outcome-named mission event needs the result that shows it', async () => {
  const f = [];
  for (const [s, ev] of [['CLONE_INTRO', 'BASIS_DEMO_OK'], ['CLONE_BASIS_PASSED', 'SUPERPOSITION_DEMO_FAILED'], ['TELEPORT_DRY_RUN', 'CORRECT_CALIBRATION'], ['TELEPORT_DRY_RUN_PASSED', 'COMMIT_TRANSFER']]) {
    const m = await at(s); m.panel();
    if (await m.sendRaw(ev)) f.push(`${s}: send('${ev}') with no experiment result advanced to ${m.state}`);
  }
  return f;
});

check('FRESH', 'R13.11: a wrong dry run retries on a FRESH calibration state', () => {
  const wrong = cal('bloch_a', 1, 0, false, false);
  if (verdict('TELEPORT_DRY_RUN', wrong)) return ['setup: wrong calibration accepted'];
  const ev = verdict('TELEPORT_DRY_RUN', cal('bloch_a', 1, 0, false, true));
  return ev ? [`after a wrong dry run on bloch_a, a retry on the SAME prepared state yields ${ev}`] : [];
});

check('BITS-FIRST', 'owner § red-team physics (2): corrections are chosen after m0, m1 are shown', async () => {
  // The only result handed to the machine in TELEPORT_DRY_RUN already carries the corrections: no
  // bits-only (phase-1) result was ever shown, yet the pass is granted.
  const m = await at('TELEPORT_DRY_RUN');
  const ev = await m.result(correctCal());
  return ev ? [`TELEPORT_DRY_RUN: a single corrections-included result, with no bits-first result before it, yields ${ev}`] : [];
});

check('CONTRACT-BITS', 'owner § red-team physics (2): the contract defines a bits-first dry run', () => {
  const k = contractsMod;
  if (typeof k.makeCorrectionRequest !== 'function' || typeof k.validateTeleportBitsResult !== 'function') return ['no two-phase dry-run contract (makeCorrectionRequest / validateTeleportBitsResult)'];
  const f = [];
  const req = { theta: 1.137, phi: 0.44 };
  try { k.makeCorrectionRequest(req, {}, { applyX: false, applyZ: true }); f.push('makeCorrectionRequest built a correction with no phase-1 result'); } catch { /* refused: good */ }
  if (k.validateTeleportBitsResult(req, branch('bloch_a', 1, 0, false, true)).length === 0) f.push('validateTeleportBitsResult accepts a result that already reports fidelity/corrections');
  return f;
});

check('ACK', 'R13.13: acknowledgements advance only after the result panel was shown', async () => {
  const f = [];
  for (const [s, ev] of [['CLONE_SUPERPOSITION_FAILED', 'EXPLANATION_READ'], ['RELAY_SEND_FAILED', 'VIEW_RECEIVER_MARGINAL']]) {
    const m = await walkTo(s);
    if (m.state !== s) { f.push(`${s} unreachable`); continue; }
    if (await m.sendRaw(ev)) f.push(`${ev} accepted in ${s} with no result-panel signal of any kind (0 ms after entry)`);
  }
  return f;
});

check('ACK-STALE-PANEL', 'R13.13: the panel must be shown IN the acknowledging state', async () => {
  const f = [];
  for (const [prev, s, ev] of [['CLONE_BASIS_PASSED', 'CLONE_SUPERPOSITION_FAILED', 'EXPLANATION_READ'], ['RELAY_BELL_CREATED', 'RELAY_SEND_FAILED', 'VIEW_RECEIVER_MARGINAL']]) {
    const m = await at(prev); m.panel(); // a panel from the PREVIOUS state
    const step = G.paths[s].at(-1);
    if (!(await m.sendRaw(step)) && !(await m.result(RESULT_FOR[step]()))) { f.push(`setup: cannot reach ${s}`); continue; }
    if (await m.sendRaw(ev)) f.push(`${ev} in ${s} accepted on a panel shown in ${prev}`);
  }
  return f;
});

check('STALE-TICKET', 'V§9.5 resetGame: a result asked in an old session must not move the new one', async () => {
  const f = [];
  const m = await at('CLONE_INTRO');
  let release; const gate = new Promise((r) => { release = r; });
  const r = seam(clone('zero'));
  const late = m.m.experiment ? m.m.experiment(async () => { m.runs++; await gate; return r; }) : null;
  m.reset();
  for (const p of fromStart('CLONE_INTRO')) await m.send(p);
  if (m.state !== 'CLONE_INTRO') return [`setup: re-walk landed in ${m.state}`];
  release();
  if (late) await late; else { const ev = verdict(m.state, r); if (ev) await m.sendRaw(ev); } // old API: the terminal judges on arrival
  if (m.state !== 'CLONE_INTRO') f.push(`a result asked before resetGame() moved the new session to ${m.state}`);
  return f;
});

check('TICKET-REPLAY', 'V§9.5 + ABA: a ticket from an earlier session or an earlier visit is not current', async () => {
  const m = await at('CLONE_INTRO');
  if (!m.m.ticket || !m.m.isCurrent) return ['no ticket API: an async result cannot be bound to the session it was asked in'];
  const f = [];
  const t0 = m.m.ticket();
  if (!m.m.isCurrent(t0)) f.push('positive control: a fresh ticket is not current');
  m.reset(); for (const p of fromStart('CLONE_INTRO')) await m.send(p);
  if (m.m.isCurrent(t0)) f.push('a ticket from the previous session is current again after resetGame() and a re-walk');
  const e = await at('ENDING'); const t1 = e.m.ticket();
  await e.send('OPEN_SCIENCE'); await e.send(Object.keys(G.obs.DECLASSIFIED ?? {}).find((k) => G.obs.DECLASSIFIED[k] === 'ENDING') ?? 'CLOSE_SCIENCE');
  if (e.state === 'ENDING' && e.m.isCurrent(t1)) f.push('ABA: a ticket from ENDING is current again after ENDING -> DECLASSIFIED -> ENDING');
  return f;
});

check('COMMIT-TWICE', 'V§7.4: one commit, one token measurement', async () => {
  const f = [];
  const m = await at('TELEPORT_DRY_RUN_PASSED');
  if (!(await m.commit(tokenCommit()))) f.push('first commit refused');
  const n = m.tokenRuns;
  if (await m.commit(tokenCommit(1, 1))) f.push('second commit accepted');
  if (m.tokenRuns > n) f.push(`second commit request left the machine (${m.tokenRuns} token measurements)`);
  // concurrently: two presses before the first call returns
  const c = await at('TELEPORT_DRY_RUN_PASSED');
  const both = await Promise.all([c.commit(tokenCommit()), c.commit(tokenCommit(1, 0))]);
  if (both.filter(Boolean).length !== 1) f.push(`two concurrent commits: ${both.filter(Boolean).length} accepted`);
  if (c.tokenRuns !== 1) f.push(`two concurrent commits: ${c.tokenRuns} token measurements`);
  return f;
});

check('COMMIT-STALE', 'V§9.5: a commit in flight across resetGame() moves nothing, and the new session can commit', async () => {
  const m = await at('TELEPORT_DRY_RUN_PASSED');
  if (!m.migrated) return ['no commit call: a commit cannot be in flight (no session binding)'];
  const f = [];
  let release; const gate = new Promise((r) => { release = r; });
  const late = m.m.commitTransfer(async () => { await gate; return tokenCommit(); });
  m.reset();
  for (const p of fromStart('TELEPORT_DRY_RUN_PASSED')) await m.send(p);
  release(); const o = await late;
  if (o.ok) f.push('the old session\'s commit result was accepted in the new session');
  if (m.state !== 'TELEPORT_DRY_RUN_PASSED') f.push(`the old commit moved the new session to ${m.state}`);
  if (!(await m.commit(tokenCommit()))) f.push(`the new session cannot commit (latch ${m.m.commit})`);
  return f;
});

check('COMMIT-AFTER-RESTART', 'R13.12 + V§9.5: after RESTART the old token is gone; nothing commits outside the armed state', async () => {
  const f = [];
  for (const route of ['edge', 'reset']) {
    const e = await at('ENDING'); const n = e.tokenRuns;
    if (route === 'edge') { if (!(await e.sendRaw('RESTART'))) continue; } else if (e.reset) e.reset(); else continue;
    if (await e.commit(tokenCommit())) f.push(`after RESTART via ${route}, a commit in ${e.state} was accepted`);
    if (e.migrated && e.tokenRuns > n) f.push(`after RESTART via ${route}, a commit request in ${e.state} left the machine`);
  }
  return f;
});

check('RESTART-SESSION', 'R13.12 + V§9.5: every RESTART the ENDING screen offers starts a full new session', async () => {
  const f = [];
  for (const route of ['edge', 'reset']) {
    const e = await at('ENDING');
    if (route === 'edge') { if (!(await e.sendRaw('RESTART'))) continue; } else if (e.reset) e.reset(); else continue;
    if (e.state !== 'TITLE') { f.push(`RESTART via ${route} landed in ${e.state}`); continue; }
    const n = e.tokenRuns;
    for (const p of fromStart('TELEPORT_DRY_RUN_PASSED')) await e.send(p);
    if (e.state !== 'TELEPORT_DRY_RUN_PASSED') { f.push(`RESTART via ${route}: second session stuck in ${e.state}`); continue; }
    if (!(await e.commit(tokenCommit()))) f.push(`RESTART via ${route}: second session cannot commit (latch ${e.m.commit ?? 'n/a'}); the game is soft-locked before the ending`);
    else if (e.tokenRuns - n !== 1) f.push(`RESTART via ${route}: ${e.tokenRuns - n} token measurements in the second session`);
  }
  return f;
});

async function playthrough(asTerminal) {
  const f = []; const m = gameplayMachine();
  const step = async (ev) => { if (!(await m.send(ev))) f.push(`${m.state} refused ${ev}`); };
  const res = async (r, want = true) => {
    const ev = await m.result(asTerminal(r));
    if (want && !ev) f.push(`${m.state}: rule refused ${r.experiment} ${JSON.stringify(r.parameters)} (${rulesMod.eventForResult(m.state, asTerminal(r)).reason})`);
    if (!want && ev) f.push(`${m.state}: wrong result accepted as ${ev}`);
    m.panel();
  };
  await step(Object.keys(G.obs.BOOT ?? {}).find((k) => G.obs.BOOT[k] === 'TITLE') ?? 'BOOT_COMPLETE');
  for (const e of ['START', 'SKIP', 'OPEN_CLONE_BOOTH']) await step(e);
  await res(clone('zero')); await res(clone('plus')); await step('EXPLANATION_READ'); await step('EXIT_BOOTH'); await step('REACH_RELAY');
  await res(bell('I')); await res(bell('X')); await step('VIEW_RECEIVER_MARGINAL'); await step('OPEN_ROOFTOP'); await step('REPAIR_CLASSICAL_LINK'); await step('RUN_DRY_TEST');
  await res(branch('bloch_a', 1, 0, false, false), false); // wrong: Z missing
  await res(branch('bloch_b', 1, 1, true, true)); // fresh state, correct
  if (m.state === 'TELEPORT_DRY_RUN_PASSED' && !(await m.commit(asTerminal(liveCommit(0, 1), true)))) f.push(`TELEPORT_DRY_RUN_PASSED: the real live commit was refused (latch ${m.m.commit ?? 'n/a'})`);
  await step('ANIMATION_END');
  if (m.state !== 'ENDING') f.push(`playthrough ended in ${m.state}`);
  if (m.tokenRuns > 1) f.push(`${m.tokenRuns} story-token measurements`);
  return f;
}
check('PLAYTHROUGH', 'V§9.2 legal path on real engine results (names-only seam alias); CLAUDE.md "Playable"', () =>
  playthrough((r, token) => seam(r, token ? TOKEN : `calibration_${r.parameters.state}`)));
check('PLAYTHROUGH-RAW', 'V§9.2 + CLAUDE.md "Playable": the engine\'s results as emitted, no alias', () => playthrough((r) => r));

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
