// PORT of evidence/gameplay-quest-review/a4_token.mjs to the contracts API and the new fake.
const R = process.argv[2];
const { eventForResult } = await import(R + '/echo/game/missionRules.js');
const { createEventBus } = await import(R + '/echo/game/eventBus.js');
const { createQuestMachine } = await import(R + '/echo/game/state.js');
const { createFakeQuantum } = await import(R + '/dev/gameplay/fakeQuantum.js');
const q = createFakeQuantum({ delayMs: 0 });
// G. story token: gameplay lets at most one commit request reach the engine per session
{
  const m = createQuestMachine(createEventBus());
  for (const ev of ['BOOT_COMPLETE', 'START', 'SKIP', 'OPEN_CLONE_BOOTH', 'BASIS_DEMO_OK']) m.send(ev); // BASIS_DEMO_OK refused: only a result advances
  let calls = 0;
  const outcomes = [];
  for (let i = 1; i <= 3; i++) outcomes.push((await m.commitTransfer(async () => { calls++; return q.commitStoryToken(); })).reason);
  console.log(`G0. commit requested outside TELEPORT_DRY_RUN_PASSED x3: engine calls=${calls}; ${outcomes[0]}`);
}
{
  q.faultNextCommit();
  // drive a machine to TELEPORT_DRY_RUN_PASSED through real fake results
  const m = createQuestMachine(createEventBus());
  for (const ev of ['BOOT_COMPLETE', 'START', 'SKIP', 'OPEN_CLONE_BOOTH']) m.send(ev);
  await m.experiment(() => q.cloneTest('zero')); await m.experiment(() => q.cloneTest('plus'));
  m.resultPanelShown(); m.send('EXPLANATION_READ'); m.send('EXIT_BOOTH'); m.send('REACH_RELAY');
  await m.experiment(() => q.bellSignalling('I')); await m.experiment(() => q.bellSignalling('X'));
  m.resultPanelShown(); for (const ev of ['VIEW_RECEIVER_MARGINAL', 'OPEN_ROOFTOP', 'REPAIR_CLASSICAL_LINK', 'RUN_DRY_TEST']) m.send(ev);
  while (m.state === 'TELEPORT_DRY_RUN') { const b = q.sampleBellBits(); await m.experiment(() => q.teleportDryRun(b.m1 === 1, b.m0 === 1, b)); }
  let calls = 0;
  for (let i = 1; i <= 3; i++) {
    const r = await m.commitTransfer(async () => { calls++; return q.commitStoryToken(); });
    console.log(`G. story_token commit request #${i} (first result engine-faulted): ok=${r.ok} latch=${r.commit} engine calls so far=${calls}; ${r.reason}`);
  }
}
// H. a 00 calibration ("change nothing") no longer unlocks COMMIT (overseer ruling, consult 3)
const AX = { theta: 1.137, phi: 0.44 };
const h = await q.teleportDryRun(false, false, { m0: 0, m1: 0 }, AX);
console.log('H. calibration generic, m0=0 m1=0, no corrections ->', JSON.stringify(eventForResult('TELEPORT_DRY_RUN', h)));
// I. a wrong correction on the calibration state the game actually draws now (fresh random generic)
const w = await q.teleportDryRun(true, false, { m0: 0, m1: 0 });
console.log(`I. fresh calibration state theta=${w.parameters.theta.toFixed(4)} phi=${w.parameters.phi.toFixed(4)}, m0=0 m1=0, chose X (wrong): fidelity shown=${w.fidelity}; verdict=${JSON.stringify(eventForResult('TELEPORT_DRY_RUN', w))}`);
