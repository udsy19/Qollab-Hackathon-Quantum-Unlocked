// PORT of dump_fake.mjs for the new fake: clone/bell as before (contract keys), and the dry runs
// the game now makes — every call draws its own fresh random generic state (no angles passed) —
// plus a positive control that passes the named Pauli eigenstates explicitly.
const { createFakeQuantum } = await import(process.argv[2] + '/dev/gameplay/fakeQuantum.js');
const N = Number(process.argv[3] ?? 2000);
const q = createFakeQuantum({ delayMs: 0 });
const out = { clone: {}, bell: {}, random: [], control: [], token: [] };
for (const s of ['zero', 'one', 'plus', 'phase']) out.clone[s] = await q.cloneTest(s);
for (const g of ['I', 'X', 'Z']) out.bell[g] = await q.bellSignalling(g);
const row = (r, extra = {}) => ({ m0: r.measurementBits.m0, m1: r.measurementBits.m1, X: r.parameters.correctionX, Z: r.parameters.correctionZ, f: r.fidelity, p: r.observables.branchProbability, engine: r.engine, ...extra });
for (let i = 0; i < N; i++) {
  const bits = { m0: i & 1, m1: (i >> 1) & 1 }; const X = Boolean(i & 4); const Z = Boolean(i & 8); // all 16 choices cycle
  const r = await q.teleportDryRun(X, Z, bits);
  out.random.push(row(r, { theta: r.parameters.theta, phi: r.parameters.phi }));
}
const NAMED = { zero: [0, 0], one: [Math.PI, 0], plus: [Math.PI / 2, 0], minus: [Math.PI / 2, Math.PI], phase: [Math.PI / 2, Math.PI / 2] };
for (const [name, [theta, phi]] of Object.entries(NAMED)) for (let k = 0; k < 16; k++) {
  const r = await q.teleportDryRun(Boolean(k & 4), Boolean(k & 8), { m0: k & 1, m1: (k >> 1) & 1 }, { theta, phi });
  out.control.push(row(r, { name, theta, phi }));
}
for (let i = 0; i < 20; i++) out.token.push(row(await q.commitStoryToken()));
console.log(JSON.stringify(out));
