const R = process.argv[2];
const { eventForResult, STORY_TOKEN_ID } = await import(R + '/echo/game/missionRules.js');
const { createFakeQuantum } = await import(R + '/dev/gameplay/fakeQuantum.js');
const q = createFakeQuantum({ delayMs: 0 });
// G. story token: nothing below the FSM stops it being "measured" repeatedly
for (let i = 1; i <= 3; i++) {
  const r = await q.teleportDryRun(STORY_TOKEN_ID, false, false, { m0: 1, m1: 1 }); // deliberately wrong corrections
  console.log(`G. story_token teleport #${i}: fidelity=${r.fidelity} -> rule in TELEPORT_DRY_RUN_PASSED: ${JSON.stringify(eventForResult('TELEPORT_DRY_RUN_PASSED', r))}; fact: "${r.facts[2]}"`);
}
// H. the dry run passes on ONE result; with bits 00 the passing answer is "change nothing"
const r = await q.teleportDryRun('bloch', false, false, { m0: 0, m1: 0 });
console.log('H. calibration bloch, m0=0 m1=0, no corrections ->', JSON.stringify(eventForResult('TELEPORT_DRY_RUN', r)));
// I. wrong correction on a dev-terminal calibration state: fidelity shown 1, verdict refused
const w = await q.teleportDryRun('plus', true, false, { m0: 0, m1: 0 });
console.log(`I. calibration plus, m0=0 m1=0, chose X (wrong): fidelity shown=${w.fidelity}; verdict=${JSON.stringify(eventForResult('TELEPORT_DRY_RUN', w))}; facts[1]="${w.facts[1]}"`);
