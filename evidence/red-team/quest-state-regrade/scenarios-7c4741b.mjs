// Sabotage scenarios for the shipped composition: gameplay 7c4741b echo/game/ + platform f08dd0b
// echo/contracts.js (one tree; gameplay imports ../contracts.js). Run by quest-state-audit/sabotage.mjs
// on disposable copies only. Every `want` was written before the round ran (law 3).
const S = 'echo/game/state.js'; const R = 'echo/game/missionRules.js'; const K = 'echo/contracts.js';
const p = (file, find, repl, all = false) => ({ root: 'game', file, find, repl, all });

// ------------------------------------------------------------------ minimal fixes (positive controls)
const IMPORT_RULES = "import { eventForResult } from './missionRules.js';";
const IMPORT_K = " } from '../contracts.js';"; // state.js has one contracts import; fixes chain on its tail
const STALE_LINE = "    if (t.epoch !== epoch) return { ok: false, commit, stale: true, result, reason: 'the result belongs to a reset session' };\n";
const TOKEN_LINE = "export const STORY_TOKEN_ID = 'story_token';";
const FIX = {
  // experiment() runs nothing where the only measurement is the commit, or after the latch is set.
  RUNGUARD: [
    p(S, IMPORT_RULES, "import { eventForResult, hasExperiment } from './missionRules.js';"),
    p(S, '  async function experiment(run) {\n', "  async function experiment(run) {\n    if (!hasExperiment(tail) || tail === proof.armed || commit !== COMMIT_STATUS.IDLE) return { stale: false, result: null, event: null, reason: `no experiment runs in ${tail}` };\n"),
  ],
  // A commit call that returns no valid ExperimentResult is an error: nothing recorded, retry (RG3.1).
  ERRSHAPE: [
    p(S, IMPORT_K, `, validateExperimentResult${IMPORT_K}`),
    p(S, STALE_LINE, `${STALE_LINE}    if (validateExperimentResult(result).length) { commit = COMMIT_STATUS.IDLE; return { ok: false, commit, result, reason: 'no valid result: nothing recorded, retry' }; }\n`),
  ],
  // send() refuses events that only an experiment result may produce (contract EVENT_SOURCES).
  EARNED: [
    p(S, IMPORT_K, `, EVENT_SOURCES${IMPORT_K}`),
    p(S, '    if (event === COMMIT) return `${COMMIT} is sent only by commitTransfer()`;\n', "    if (event === COMMIT) return `${COMMIT} is sent only by commitTransfer()`;\n    if (EVENT_SOURCES[event].via === 'experiment_result') return `${event} comes only from an experiment result`;\n"),
  ],
  FRESH: [
    p(R, TOKEN_LINE, `${TOKEN_LINE}\nconst failedStates = new Set();`),
    p(R, '    const why = correctTeleport(r);\n    if (why) return none(why);', "    const key = r.parameters.state ?? r.parameters.stateId;\n    if (failedStates.has(key)) return none('retry needs a fresh calibration state');\n    const why = correctTeleport(r);\n    if (why) { if (typeof r.fidelity === 'number') failedStates.add(key); return none(why); }"),
  ],
  BITS: [
    p(R, TOKEN_LINE, `${TOKEN_LINE}\nlet shownBits = null;`),
    p(R, "    if (r.parameters.stateId === STORY_TOKEN_ID) return none('calibration may not use the story token');\n", "    if (r.parameters.stateId === STORY_TOKEN_ID) return none('calibration may not use the story token');\n    if (r.measurementBits && r.fidelity === undefined) { shownBits = r.measurementBits; return none('bits shown; choose X/Z'); }\n    if (!shownBits || shownBits.m0 !== r.measurementBits?.m0 || shownBits.m1 !== r.measurementBits?.m1) return none('choose corrections after the bits are shown');\n    shownBits = null;\n"),
  ],
  // The ENDING screen's RESTART edge runs resetGame() (contracts comment, V§9.5) instead of a plain edge.
  RESTART: [
    p(S, '    if (why) return { ok: false, state: tail, reason: why };\n    return advance(event);', "    if (why) return { ok: false, state: tail, reason: why };\n    if (event === 'RESTART' && transition(tail, event).ok) return resetGame();\n    return advance(event);"),
  ],
  // Read the engine's field names (contract: applyX/applyZ; live_commit applies the rule in the call;
  // the clone overlap is observables.jointFidelityWithTwoCopies).
  RAW: [
    p(R, 'const MARGINAL_TOL = 1e-6;', 'const MARGINAL_TOL = 1e-6;\nconst cloneF = (r) => r.fidelity ?? r.observables?.jointFidelityWithTwoCopies;'),
    p(R, '&& r.fidelity >= FIDELITY_OK ? E.BASIS_DEMO_OK', '&& cloneF(r) >= FIDELITY_OK ? E.BASIS_DEMO_OK'),
    p(R, "&& typeof r.fidelity === 'number' && r.fidelity < FIDELITY_OK ? E.SUPERPOSITION_DEMO_FAILED", "&& typeof cloneF(r) === 'number' && cloneF(r) < FIDELITY_OK ? E.SUPERPOSITION_DEMO_FAILED"),
    p(R, '  if (r.parameters.correctionX !== want.applyX || r.parameters.correctionZ !== want.applyZ) {', '  if ((r.parameters.applyX ?? r.parameters.correctionX) !== want.applyX || (r.parameters.applyZ ?? r.parameters.correctionZ) !== want.applyZ) {'),
    p(R, "    if (r.experiment !== 'teleportation' || r.parameters.stateId !== STORY_TOKEN_ID) return none('need the story-token transfer');\n    const why = correctTeleport(r);\n    return why ? none(why) : E.COMMIT_TRANSFER;",
      "    if (r.experiment !== 'teleportation' || !r.measurementBits || typeof r.fidelity !== 'number') return none('need the story-token transfer');\n    return r.fidelity >= FIDELITY_OK ? E.COMMIT_TRANSFER : none(`fidelity ${r.fidelity} below ${FIDELITY_OK}`);"),
  ],
};
const SERVES = { RUNGUARD: ['TOKEN-RUN-GUARD'], ERRSHAPE: ['ERR-COMMIT'], EARNED: ['DRY-UNEARNED'], FRESH: ['FRESH'], BITS: ['BITS-FIRST'], RESTART: ['RESTART-SESSION'], RAW: ['PLAYTHROUGH-RAW'] };
const allFixes = (except) => Object.entries(FIX).filter(([k]) => k !== except).flatMap(([, v]) => v);

const ISCURRENT = 'Boolean(t) && t.epoch === epoch && t.seq === seq && queue.length === 0';
export const SCEN = [
  // ---- the four the brief names
  { kind: 'break', id: 'B-LATCH', want: ['TOKEN-LATCH', 'COMMIT-TWICE'], why: 'commit latch removed (commitTransfer no longer checks commit !== IDLE)', patches: [p(S, '    if (commit !== COMMIT_STATUS.IDLE) return { ok: false, commit, reason: `commit already ${commit}` };\n', '')] },
  { kind: 'break', id: 'B-ACK', want: ['ACK', 'ACK-STALE-PANEL'], why: 'acknowledgement gate removed from gate()', patches: [p(S, '    if (ACKNOWLEDGEMENTS.has(event) && (panelSeq !== seq || queue.length)) return `${event} needs the result panel on screen first`;\n', '')] },
  { kind: 'break', id: 'B-EPOCH', want: ['COMMIT-STALE'], why: 'epoch compare dropped from isCurrent() and from commitTransfer()', patches: [p(S, ISCURRENT, 'Boolean(t) && t.seq === seq && queue.length === 0'), p(S, STALE_LINE, '')] },
  { kind: 'break', id: 'B-00', want: ['DRY-00'], why: 'bits-00 refusal removed: a 00 dry run unlocks COMMIT', patches: [p(R, "    if (r.measurementBits.m0 === 0 && r.measurementBits.m1 === 0) return none('correct, but bits 00 need no correction: calibrate again on a run that needs X or Z');\n", '')] },
  // ---- null probes (want [] = expected NOT to go red; the reason is the finding)
  { kind: 'break', id: 'N-EPOCH-TICKET', want: [], why: 'NULL PROBE: only isCurrent() epoch compare dropped; seq is monotonic across sessions, so tickets stay stale', patches: [p(S, ISCURRENT, 'Boolean(t) && t.seq === seq && queue.length === 0')] },
  { kind: 'break', id: 'N-FID-TELE', want: [], why: 'NULL PROBE: teleport fidelity gate removed; the rule also matches corrections to bits', patches: [p(R, '  if (r.fidelity < FIDELITY_OK) return `fidelity ${r.fidelity} below ${FIDELITY_OK}`;\n', '')] },
  // ---- the enabling step for the ticket checks (law 15)
  { kind: 'break', id: 'B-EPOCH-SEQ', want: ['STALE-TICKET', 'TICKET-REPLAY', 'COMMIT-STALE'], why: 'epoch AND seq compare dropped (isCurrent only checks the queue)', patches: [p(S, ISCURRENT, 'Boolean(t) && queue.length === 0'), p(S, STALE_LINE, '')] },
  { kind: 'break', id: 'B-ACK-SEQ', want: ['ACK-STALE-PANEL'], why: 'ack gate no longer bound to the current state (any panel ever shown counts)', patches: [p(S, '(panelSeq !== seq || queue.length)', '(panelSeq < 0 || queue.length)')] },
  { kind: 'break', id: 'B-ARMED', want: ['COMMIT-AFTER-RESTART'], why: 'commitTransfer() no longer checks the armed state', patches: [p(S, '    if (tail !== proof.armed || queue.length) return { ok: false, commit, reason: `commit is not armed in ${tail}` };\n', '')] },
  { kind: 'break', id: 'B-TOKEN-DRY', want: ['TOKEN-ELSEWHERE'], why: 'dry run no longer refuses the story token', patches: [p(R, "    if (r.parameters.stateId === STORY_TOKEN_ID) return none('calibration may not use the story token');\n", '')] },
  { kind: 'break', id: 'B-RULE-SWAP', want: ['DRY-RULE', 'PLAYTHROUGH'], why: 'X/Z rule swapped (X iff m0, Z iff m1)', patches: [p(R, '  return { applyX: m1 === 1, applyZ: m0 === 1 };', '  return { applyX: m0 === 1, applyZ: m1 === 1 };')] },
  { kind: 'break', id: 'B-FID', want: ['PLAYTHROUGH'], why: 'FIDELITY_OK 0.999999 -> 0.4: the |+> copy (F=0.5) no longer fails', patches: [p(R, 'const FIDELITY_OK = 0.999999;', 'const FIDELITY_OK = 0.4;')] },
  { kind: 'break', id: 'B-PARITY', want: ['PARITY', 'GAME-EDGES'], why: 'gameplay gate() refuses SKIP that the contract allows', patches: [p(S, '    if (event === COMMIT) return `${COMMIT} is sent only by commitTransfer()`;\n', "    if (event === COMMIT) return `${COMMIT} is sent only by commitTransfer()`;\n    if (event === 'SKIP') return 'sabotage';\n")] },
  { kind: 'break', id: 'B-CREDITS', want: ['GAME-STATES', 'CONTRACT-STATES', 'GAME-EDGES', 'CONTRACT-EDGES'], why: 'contract: CREDITS unreachable', patches: [p(K, "OPEN_CREDITS: 'CREDITS'", "OPEN_CREDITS: 'ENDING'", true)] },
  { kind: 'break', id: 'B-CHEAT', want: ['GAME-EXTRA', 'CONTRACT-EXTRA', 'GAME-NOSKIP', 'CONTRACT-NOSKIP', 'GAME-ENDING-ENTRY', 'CONTRACT-ENDING-ENTRY'], why: 'contract: TITLE --CHEAT--> ENDING', patches: [p(K, "  TITLE: { START: 'OPENING' },", "  TITLE: { START: 'OPENING', CHEAT: 'ENDING' },")] },
  { kind: 'break', id: 'B-REARM-a', want: ['REFUSED'], why: 'contract: TELEPORT_COMMITTED --ABORT--> TELEPORT_DRY_RUN_PASSED (state.js load guard must refuse to load)', patches: [p(K, "  TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING' },", "  TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING', ABORT: 'TELEPORT_DRY_RUN_PASSED' },")] },
  { kind: 'break', id: 'B-REARM-b', want: ['GAME-COMMIT-ONCE', 'CONTRACT-COMMIT-ONCE'], why: 'same re-arm edge AND the load guard disabled (enabling step)', patches: [p(K, "  TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING' },", "  TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING', ABORT: 'TELEPORT_DRY_RUN_PASSED' },"), p(S, 'if (!proof.ok) throw', 'if (false && !proof.ok) throw')] },
  { kind: 'break', id: 'B-CONTRACT-BITS', want: ['CONTRACT-BITS'], why: 'contract: makeCorrectionRequest no longer refuses a choice without a valid phase-1 result', patches: [p(K, "  if (errors.length) throw new TypeError(`makeCorrectionRequest: ${errors.join('; ')}`)", '  if (false) throw new TypeError()')] },
  { kind: 'break', id: 'B-ORACLE', want: ['ENGINE-ORACLE'], why: 'one real engine fidelity nudged by 1e-8 in the fed results (bloch_b 11, no corrections)', patches: [],
    results: (j) => { const b = j.branches.find((x) => x.parameters.state === 'bloch_b' && x.parameters.m0 === 1 && x.parameters.m1 === 1 && !x.parameters.applyX && !x.parameters.applyZ); b.fidelity += 1e-8; return j; } },
  // ---- fix: every red -> green; leave-one-out: each red is attributable to its own fix
  { kind: 'fix', id: 'F-ALL', want: [], why: 'all minimal fixes applied: expect 0 red', patches: allFixes() },
  ...Object.keys(FIX).map((k) => ({ kind: 'l1o', id: `L-${k}`, why: `all fixes except ${k}`, patches: allFixes(k), want: SERVES[k] })),
];
