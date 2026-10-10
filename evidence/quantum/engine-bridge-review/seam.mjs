// Feeds REAL engine output (dump.json) through platform's validators (main) and gameplay's rules
// (a named gameplay ref). Usage: node seam.mjs <dir-with-contracts.js-and-game/missionRules.js> dump.json
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const [dir, dumpPath] = process.argv.slice(2);
const C = await import(pathToFileURL(path.join(dir, 'contracts.js')).href);
const R = await import(pathToFileURL(path.join(dir, 'game', 'missionRules.js')).href);
const d = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
const S = C.QUEST_STATES;
const rows = [];
const row = (what, state, res, req, want) => {
  const v = R.eventForResult(state, res, req);
  rows.push({ what, state, event: v.event, want, ok: v.event === want, reason: v.reason });
};
row('cloning(zero)', S.CLONE_INTRO, d.cloning.zero, undefined, 'BASIS_DEMO_OK');
row('cloning(one)', S.CLONE_INTRO, d.cloning.one, undefined, 'BASIS_DEMO_OK');
row('cloning(plus)', S.CLONE_BASIS_PASSED, d.cloning.plus, undefined, 'SUPERPOSITION_DEMO_FAILED');
row('cloning(phase)', S.CLONE_BASIS_PASSED, d.cloning.phase, undefined, 'SUPERPOSITION_DEMO_FAILED');
row('relay(I)', S.RELAY_INTRO, d.relay.I, undefined, 'PREPARE_BELL_PAIR');
row('relay(X)', S.RELAY_BELL_CREATED, d.relay.X, undefined, 'ATTEMPT_NO_SIGNALLING');
row('relay(Z)', S.RELAY_BELL_CREATED, d.relay.Z, undefined, 'ATTEMPT_NO_SIGNALLING');
for (const { request, result } of d.dry) {
  const rule = C.expectedCorrections(request.m0, request.m1);
  const right = rule.applyX === request.applyX && rule.applyZ === request.applyZ;
  row(`dry m0=${request.m0} m1=${request.m1} X=${request.applyX} Z=${request.applyZ}`, S.TELEPORT_DRY_RUN, result, request, right ? 'CORRECT_CALIBRATION' : null);
}
row('live_commit', S.TELEPORT_DRY_RUN_PASSED, d.commit, undefined, 'COMMIT_TRANSFER');
for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.what.padEnd(34)} ${r.state.padEnd(24)} got ${String(r.event).padEnd(26)} want ${r.want}  ${r.ok ? '' : '— ' + r.reason}`);
const ce = C.validateCommitResult(d.commit);
console.log(`validateCommitResult(live_commit): ${ce.length ? 'REJECTED — ' + ce.join(' | ') : 'valid'}`);
console.log(`commit parameters as emitted: ${JSON.stringify(d.commit.parameters)}`);
const fails = rows.filter(r => !r.ok).length + (ce.length ? 1 : 0);
console.log(`${rows.length + 1} checks, ${fails} FAIL`);
process.exit(fails ? 1 : 0);
