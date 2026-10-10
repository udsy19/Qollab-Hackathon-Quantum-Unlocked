// Sabotage round (gate-independence laws 2, 3, 10, 15). Works ONLY on disposable copies of the export.
//   node sabotage.mjs --game <dir> --contracts <dir>
// Three kinds of scenario:
//   break  — a mutation of the audited code that should turn a GREEN check red;
//   fix    — minimal fixes that should turn every RED check green (positive control: the red is
//            not stuck — a correct implementation can pass it);
//   l1o    — all fixes but one: exactly the checks that one fix serves go red again (attribution).
// A patch whose `find` text is not present exactly as expected REFUSES the scenario (exit 2): a
// sabotage that silently did not apply would read as a null.
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const GAME = arg('--game'); const CONTRACTS = arg('--contracts');
if (!GAME || !CONTRACTS) { console.error('usage: node sabotage.mjs --game <dir> --contracts <dir>'); process.exit(2); }
const HERE = dirname(fileURLToPath(import.meta.url));
const S = 'echo/game/state.js'; const R = 'echo/game/missionRules.js'; const K = 'echo/contracts.js';
const p = (root, file, find, repl, all = false) => ({ root, file, find, repl, all });

// ------------------------------------------------------------------ minimal fixes (positive controls)
const FIX = {
  TABLES_GAME: [
    p('game', S, "BOOT: { BOOTED: 'TITLE' },", "BOOT: { BOOT_COMPLETE: 'TITLE' },"),
    p('game', S, "ENDING: { OPEN_SCIENCE: 'DECLASSIFIED', OPEN_CREDITS: 'CREDITS' },", "ENDING: { OPEN_SCIENCE: 'DECLASSIFIED', OPEN_CREDITS: 'CREDITS', RESTART: 'TITLE' },"),
    p('game', S, "DECLASSIFIED: { OPEN_CREDITS: 'CREDITS', RESTART: 'TITLE' },", "DECLASSIFIED: { OPEN_CREDITS: 'CREDITS', BACK: 'ENDING' },"),
    p('game', S, "CREDITS: { OPEN_SCIENCE: 'DECLASSIFIED', RESTART: 'TITLE' },", 'CREDITS: {},'),
  ],
  TABLES_CONTRACT: [
    p('contracts', K, "ENDING: { OPEN_SCIENCE: 'DECLASSIFIED', OPEN_CREDITS: 'CREDITS' },", "ENDING: { OPEN_SCIENCE: 'DECLASSIFIED', OPEN_CREDITS: 'CREDITS', RESTART: 'TITLE' },"),
    p('contracts', K, "DECLASSIFIED: { OPEN_CREDITS: 'CREDITS' },", "DECLASSIFIED: { OPEN_CREDITS: 'CREDITS', BACK: 'ENDING' },"),
  ],
  LATCH: [
    p('game', R, "export const STORY_TOKEN_ID = 'story_token';", "export const STORY_TOKEN_ID = 'story_token';\nlet tokenMeasured = false;"),
    p('game', R, "return none('need the story-token transfer');", "return none('need the story-token transfer');\n    if (tokenMeasured) return none('story token already measured');\n    if (r.measurementBits) tokenMeasured = true;"),
  ],
  BITS00: [
    p('game', R, "return none('calibration may not use the story token');", "return none('calibration may not use the story token');\n    if (r.measurementBits && r.measurementBits.m0 === 0 && r.measurementBits.m1 === 0) return none('bits 00 prove nothing');"),
  ],
  FRESH: [
    p('game', R, "export const STORY_TOKEN_ID = 'story_token';", "export const STORY_TOKEN_ID = 'story_token';\nconst failedStates = new Set();"),
    p('game', R, "    const why = correctTeleport(r);\n    return why ? none(why) : 'CORRECT_CALIBRATION';",
      "    if (failedStates.has(r.parameters.stateId)) return none('retry needs a fresh state');\n    const why = correctTeleport(r);\n    if (why) failedStates.add(r.parameters.stateId);\n    return why ? none(why) : 'CORRECT_CALIBRATION';"),
  ],
  ACK: [
    p('game', S, '  let state = INITIAL;', "  let state = INITIAL;\n  let shown = false;\n  const ACKS = new Set(['EXPLANATION_READ', 'VIEW_RECEIVER_MARGINAL']);"),
    p('game', S, "is not valid in ${state}` };", "is not valid in ${state}` };\n    if (ACKS.has(event) && !shown) return { ok: false, state, reason: 'result panel not shown' };\n    shown = false;"),
    p('game', S, 'return { get state() { return state; }, send, can, reset };', 'return { get state() { return state; }, send, can, reset, noteResultShown: () => { shown = true; } };'),
  ],
};
// LATCH and FRESH both insert after the STORY_TOKEN_ID line and keep it, so either anchor still matches once.
const allFixes = (except) => {
  const out = [];
  for (const [k, v] of Object.entries(FIX)) if (k !== except) out.push(...v);
  return out;
};

// ------------------------------------------------------------------ scenarios
const SCEN = [
  // break: green -> red
  { kind: 'break', id: 'S1', want: ['GAME-STATES'], why: 'CREDITS made unreachable in state.js', patches: [p('game', S, "OPEN_CREDITS: 'CREDITS'", "OPEN_CREDITS: 'ENDING'", true)] },
  { kind: 'break', id: 'S2', want: ['CONTRACT-STATES'], why: 'CREDITS made unreachable in contracts.js', patches: [p('contracts', K, "OPEN_CREDITS: 'CREDITS'", "OPEN_CREDITS: 'ENDING'", true)] },
  { kind: 'break', id: 'S3', want: ['CONTRACT-EXTRA', 'CONTRACT-NOSKIP', 'CONTRACT-ENDING-ENTRY'], why: 'TITLE --CHEAT--> ENDING in contracts.js', patches: [p('contracts', K, "TITLE: { START: 'OPENING' },", "TITLE: { START: 'OPENING', CHEAT: 'ENDING' },")] },
  { kind: 'break', id: 'S4', want: ['GAME-NOSKIP'], why: 'FREE_ROAM_ALLEY --SHORTCUT--> RELAY_UNLOCKED (skips the clone mission)', patches: [p('game', S, "FREE_ROAM_ALLEY: { OPEN_CLONE_BOOTH: 'CLONE_INTRO' },", "FREE_ROAM_ALLEY: { OPEN_CLONE_BOOTH: 'CLONE_INTRO', SHORTCUT: 'RELAY_UNLOCKED' },")] },
  { kind: 'break', id: 'S5', want: ['GAME-ENDING-ENTRY', 'GAME-NOSKIP'], why: 'LINK_REPAIRED --WARP--> ENDING', patches: [p('game', S, "LINK_REPAIRED: { RUN_DRY_TEST: 'TELEPORT_DRY_RUN' },", "LINK_REPAIRED: { RUN_DRY_TEST: 'TELEPORT_DRY_RUN', WARP: 'ENDING' },")] },
  { kind: 'break', id: 'S6', want: ['CONTRACT-NOSKIP'], why: 'contracts EXIT_BOOTH jumps to RELAY_UNDERSTOOD (skips the relay mission)', patches: [p('contracts', K, "CLONE_UNDERSTOOD: { EXIT_BOOTH: 'RELAY_UNLOCKED' },", "CLONE_UNDERSTOOD: { EXIT_BOOTH: 'RELAY_UNDERSTOOD' },")] },
  { kind: 'break', id: 'S7', want: ['CONTRACT-ENDING-ENTRY'], why: 'contracts TELEPORT_DRY_RUN_PASSED --SKIP_ANIM--> ENDING', patches: [p('contracts', K, "TELEPORT_DRY_RUN_PASSED: { COMMIT_TRANSFER: 'TELEPORT_COMMITTED' },", "TELEPORT_DRY_RUN_PASSED: { COMMIT_TRANSFER: 'TELEPORT_COMMITTED', SKIP_ANIM: 'ENDING' },")] },
  { kind: 'break', id: 'S8a', want: ['REFUSED'], why: 'TELEPORT_COMMITTED --ABORT--> TELEPORT_DRY_RUN_PASSED in state.js (its load-time commitIsOneShot guard should refuse to load)', patches: [p('game', S, "TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING' },", "TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING', ABORT: 'TELEPORT_DRY_RUN_PASSED' },")] },
  { kind: 'break', id: 'S8b', want: ['GAME-COMMIT-ONCE'], why: 'same re-arm edge AND the load-time guard disabled (enabling step, law 15)', patches: [p('game', S, "TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING' },", "TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING', ABORT: 'TELEPORT_DRY_RUN_PASSED' },"), p('game', S, 'if (!proof.ok) throw', 'if (false && !proof.ok) throw')] },
  { kind: 'break', id: 'S9', want: ['CONTRACT-COMMIT-ONCE'], why: 'contracts TELEPORT_COMMITTED --ABORT--> TELEPORT_DRY_RUN_PASSED', patches: [p('contracts', K, "TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING' },", "TELEPORT_COMMITTED: { ANIMATION_END: 'ENDING', ABORT: 'TELEPORT_DRY_RUN_PASSED' },")] },
  { kind: 'break', id: 'S10', want: ['TOKEN-ELSEWHERE'], why: 'dry run no longer refuses the story token', patches: [p('game', R, "    if (r.parameters.stateId === STORY_TOKEN_ID) return none('calibration may not use the story token');\n", '')] },
  { kind: 'break', id: 'S11', want: ['ERR-COMMIT'], why: 'an empty/errored result is treated as a commit', patches: [p('game', R, "return none('no result');", "return { event: state === 'TELEPORT_DRY_RUN_PASSED' ? 'COMMIT_TRANSFER' : null, reason: 'sabotage' };")] },
  { kind: 'break', id: 'S12', want: ['DRY-RULE', 'PLAYTHROUGH'], why: 'X/Z rule swapped (X iff m0, Z iff m1)', patches: [p('game', R, 'return { applyX: m1 === 1, applyZ: m0 === 1 };', 'return { applyX: m0 === 1, applyZ: m1 === 1 };')] },
  { kind: 'break', id: 'S13', want: ['PLAYTHROUGH'], why: 'fidelity threshold lowered 0.999999 -> 0.4 (T2): the clone mission (F=0.5 on |+>) can no longer fail', patches: [p('game', R, 'const FIDELITY_OK = 0.999999;', 'const FIDELITY_OK = 0.4;')] },
  { kind: 'break', id: 'S13n', want: [], why: 'NULL PROBE: teleport-side threshold only — dry-run fidelity gate removed; expected NOT to go red because the rule also matches corrections', patches: [p('game', R, '  if (r.fidelity < FIDELITY_OK) return `fidelity ${r.fidelity} below ${FIDELITY_OK}`;\n', '')] },
  { kind: 'break', id: 'S14', want: ['PLAYTHROUGH', 'GAME-NOSKIP', 'GAME-STATES'], why: 'VIEW_RECEIVER_MARGINAL loops back to RELAY_SEND_FAILED (ending unreachable)', patches: [p('game', S, "RELAY_SEND_FAILED: { VIEW_RECEIVER_MARGINAL: 'RELAY_UNDERSTOOD' },", "RELAY_SEND_FAILED: { VIEW_RECEIVER_MARGINAL: 'RELAY_SEND_FAILED' },")] },
  // fix: every red -> green
  { kind: 'fix', id: 'F-ALL', want: [], why: 'all minimal fixes applied: expect 0 red', patches: allFixes() },
  // leave-one-out
  ...Object.keys(FIX).map((k) => ({
    kind: 'l1o', id: `L-${k}`, why: `all fixes except ${k}`, patches: allFixes(k),
    want: { TABLES_GAME: ['GAME-EDGES', 'GAME-EXTRA', 'PARITY'], TABLES_CONTRACT: ['CONTRACT-EDGES', 'PARITY'], LATCH: ['TOKEN-LATCH'], BITS00: ['DRY-00'], FRESH: ['FRESH'], ACK: ['ACK'] }[k],
  })),
];

// ------------------------------------------------------------------ runner
function applyPatches(roots, patches) {
  // Fixes that anchor on the same line are applied in order, each on the previous one's output.
  for (const q of patches) {
    const f = join(roots[q.root], q.file);
    const src = readFileSync(f, 'utf8');
    const n = src.split(q.find).length - 1;
    if (n === 0 || (!q.all && n !== 1)) throw new Error(`patch anchor found ${n}x in ${q.file}: ${JSON.stringify(q.find.slice(0, 60))}`);
    writeFileSync(f, q.all ? src.split(q.find).join(q.repl) : src.replace(q.find, q.repl));
  }
}
function runOn(patches) {
  const tmp = mkdtempSync(join(tmpdir(), 'qsa-sab-'));
  const roots = { game: join(tmp, 'game'), contracts: join(tmp, 'contracts') };
  cpSync(GAME, roots.game, { recursive: true }); cpSync(CONTRACTS, roots.contracts, { recursive: true });
  try {
    applyPatches(roots, patches);
    const r = spawnSync('node', [join(HERE, 'run.mjs'), '--game', roots.game, '--contracts', roots.contracts], { encoding: 'utf8', timeout: 120000 });
    if (r.status === null) return { red: ['NO-VERDICT(hang)'], note: '' };
    if (r.status === 2) return { red: ['REFUSED'], note: (r.stderr || '').trim().split('\n')[0] };
    return { red: r.stdout.split('\n').filter((l) => l.startsWith('FAIL')).map((l) => l.split(/\s+/)[1]), note: '' };
  } catch (e) { return { red: ['PATCH-REFUSED'], note: e.message }; } finally { rmSync(tmp, { recursive: true, force: true }); }
}
const BASE = runOn([]).red;
console.log(`baseline red (unpatched copy): [${BASE.join(',')}]`);
const rows = []; let bad = 0;
for (const sc of SCEN) {
  const { red: observed, note } = runOn(sc.patches);
  // A check already red at baseline cannot go "newly" red; its bite is shown by l1o instead.
  // break: judged on what goes red IN ADDITION to baseline; want ⊆ newRed (want [] = a null probe:
  // newRed must be empty). fix / l1o: judged on the full red set.
  const newRed = sc.kind === 'break' ? observed.filter((x) => !BASE.includes(x)) : observed;
  const same = sc.kind === 'break' && sc.want.length
    ? sc.want.every((w) => newRed.includes(w))
    : JSON.stringify([...newRed].sort()) === JSON.stringify([...sc.want].sort());
  if (!same) bad++;
  rows.push({ ...sc, patches: sc.patches.length, observed, newRed, note, ok: same });
  console.log(`${same ? 'AS-EXPECTED' : 'UNEXPECTED '} ${sc.kind.padEnd(5)} ${sc.id.padEnd(18)} want red=[${sc.want.join(',')}] ${sc.kind === 'break' ? 'newly red' : 'red'}=[${newRed.join(',')}]  — ${sc.why}${note ? `  (${note})` : ''}`);
}
console.log(`\n${rows.length} scenarios: ${rows.length - bad} as expected, ${bad} unexpected`);
writeFileSync(join(HERE, 'out', 'sabotage.json'), JSON.stringify(rows, null, 2));
process.exit(bad ? 1 : 0);
