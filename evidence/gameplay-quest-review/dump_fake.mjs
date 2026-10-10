const { createFakeQuantum } = await import(process.argv[2] + '/dev/gameplay/fakeQuantum.js');
const q = createFakeQuantum({ delayMs: 0 });
const out = { clone: {}, bell: {}, tele: [] };
for (const s of ['zero', 'one', 'plus', 'phase']) out.clone[s] = await q.cloneTest(s);
for (const g of ['I', 'X', 'Z']) out.bell[g] = await q.bellSignalling(g);
for (const s of ['zero', 'one', 'plus', 'minus', 'phase', 'bloch', 'story_token'])
  for (let k = 0; k < 4; k++) for (const X of [false, true]) for (const Z of [false, true]) {
    const r = await q.teleportDryRun(s, X, Z, { m0: k & 1, m1: k >> 1 });
    out.tele.push({ s, m0: k & 1, m1: k >> 1, X, Z, f: r.fidelity, engine: r.engine, p: r.parameters.branchProbability });
  }
console.log(JSON.stringify(out));
