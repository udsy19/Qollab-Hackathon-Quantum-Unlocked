// DEV-ONLY. Never copy into echo/. A stand-in QuantumEngine (vision §8.4) so the graybox can be
// played before the quantum lane's Pyodide/Qiskit adapter lands. Every result says
// engine: 'documented_preview'. The numbers come from a tiny exact statevector calculation below,
// so they are the §7 physics, but this is NOT Qiskit and must never be presented as Qiskit.
//
// Qubit order follows Qiskit: amplitude index bit k is qubit k (little-endian). Results follow
// echo/CONTRACTS.md: probability keys are bitstrings whose characters keyQubits names, left to right.

const S = Math.SQRT1_2;
const c = (re, im = 0) => [re, im];
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const conj = (a) => [a[0], -a[1]];
const abs2 = (a) => a[0] * a[0] + a[1] * a[1];

const H = [[c(S), c(S)], [c(S), c(-S)]];
const X = [[c(0), c(1)], [c(1), c(0)]];
const Z = [[c(1), c(0)], [c(0), c(-1)]];
const I = [[c(1), c(0)], [c(0), c(1)]];
const RY = (t) => [[c(Math.cos(t / 2)), c(-Math.sin(t / 2))], [c(Math.sin(t / 2)), c(Math.cos(t / 2))]];
const RZ = (t) => [[c(Math.cos(t / 2), -Math.sin(t / 2)), c(0)], [c(0), c(Math.cos(t / 2), Math.sin(t / 2))]];
const apply2 = (m, v) => [add(mul(m[0][0], v[0]), mul(m[0][1], v[1])), add(mul(m[1][0], v[0]), mul(m[1][1], v[1]))];

// Clone-booth states, and the story token: a fixed generic Bloch point, never shown (owner
// ruling 8). Calibration states are drawn fresh on every dry run (randomGenericState below).
const STATES = {
  zero: [c(1), c(0)],
  one: [c(0), c(1)],
  plus: [c(S), c(S)],
  phase: [c(S), c(0, S)],
};
const STORY_TOKEN = { theta: 2.31, phi: -2.05 };
const SENDER_GATES = { I, X, Z };
const blochState = ({ theta, phi }) => apply2(RZ(phi), apply2(RY(theta), [c(1), c(0)])); // ry then rz (§10.5)
const PREVIEW_FACT = 'Dev preview: computed by the dev-only fake engine, not by Qiskit.';

// A uniformly random Bloch point kept away from every Pauli axis. A wrong correction leaves a
// residual Pauli P, and the shown fidelity is then (n_P)^2 for the Bloch vector n, so with every
// |n_i| <= 0.9 each wrong X/Z choice shows fidelity <= 0.81 (owner rulings 7 and 11). On a Pauli
// eigenstate it can show 1 (review F5).
export const GENERIC_AXIS_BOUND = 0.9;
export function randomGenericState(random = Math.random) {
  for (;;) {
    const cosT = 1 - 2 * random();
    const theta = Math.acos(cosT);
    const phi = 2 * Math.PI * random() - Math.PI;
    const n = [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), cosT];
    if (n.every((x) => Math.abs(x) <= GENERIC_AXIS_BOUND)) return { theta, phi };
  }
}

function product(n, first) {
  const v = Array.from({ length: 1 << n }, () => c(0));
  v[0] = first[0]; v[1] = first[1]; // q0 = first, every other qubit |0>
  return v;
}
function gate1(v, k, m) {
  const out = v.map((a) => [...a]);
  for (let i = 0; i < v.length; i++) {
    if ((i >> k) & 1) continue;
    const j = i | (1 << k);
    [out[i], out[j]] = apply2(m, [v[i], v[j]]);
  }
  return out;
}
function cx(v, ctl, tgt) {
  const out = v.map((a) => [...a]);
  for (let i = 0; i < v.length; i++) if ((i >> ctl) & 1) out[i] = v[i ^ (1 << tgt)];
  return out;
}
const fidelity1 = (a, b) => abs2(add(mul(conj(a[0]), b[0]), mul(conj(a[1]), b[1])));
const r12 = (x) => Math.round(x * 1e12) / 1e12; // strip float dust; values stay exact to 1e-12

// Joint 2-qubit probabilities keyed the Qiskit way: key "q1q0", so keyQubits [1, 0].
function joint2(v) {
  const p = {};
  for (let i = 0; i < 4; i++) p[`${(i >> 1) & 1}${i & 1}`] = r12(abs2(v[i]));
  return p;
}
// Purity Tr(rho^2) of q1 after tracing out q0, for a 2-qubit state.
function purityQ1(v) {
  const rho = [[c(0), c(0)], [c(0), c(0)]];
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let q0 = 0; q0 < 2; q0++) {
    rho[a][b] = add(rho[a][b], mul(v[q0 | (a << 1)], conj(v[q0 | (b << 1)])));
  }
  let p = 0;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) p += abs2(rho[a][b]);
  return r12(p);
}
// The copy output is a pure 2-qubit state, so both halves have the same purity (Schmidt).

function cloneTest(state) {
  if (!Object.hasOwn(STATES, state)) throw new Error(`unknown clone state "${state}"`);
  const psi = STATES[state];
  const out = cx(product(2, psi), 0, 1);
  const ideal = [mul(psi[0], psi[0]), mul(psi[1], psi[0]), mul(psi[0], psi[1]), mul(psi[1], psi[1])];
  let ov = c(0);
  for (let i = 0; i < 4; i++) ov = add(ov, mul(conj(ideal[i]), out[i]));
  const fid = r12(abs2(ov));
  const purity = purityQ1(out);
  const copied = fid > 1 - 1e-6;
  return {
    experiment: 'cloning',
    circuitDescription: `prepare ${state} on q0; CX(q0, q1) with q1 blank |0>`,
    qubits: 2,
    parameters: { state },
    probabilities: joint2(out),
    keyQubits: [1, 0],
    observables: { purityQ0: purity, purityQ1: purity },
    fidelity: fid,
    facts: [...(copied
      ? ['A basis state copies: q1 now reads the same as q0. This is a special case, not a universal copier.']
      : [`Copy fidelity with two independent copies is ${fid}, not 1.`,
        `Each output half has purity ${purity}: it is entangled with the other, not a copy.`]), PREVIEW_FACT],
  };
}

function bellSignalling(senderGate) {
  if (!Object.hasOwn(SENDER_GATES, senderGate)) throw new Error(`unknown sender gate "${senderGate}"`);
  let v = cx(gate1(product(2, [c(1), c(0)]), 0, H), 0, 1); // (|00>+|11>)/sqrt2, q0 sender, q1 receiver
  v = gate1(v, 0, SENDER_GATES[senderGate]);
  const j = joint2(v);
  const p0 = r12(j['00'] + j['01']); // q1 = 0
  return {
    experiment: 'bell_signalling',
    circuitDescription: `H(q0); CX(q0, q1); sender applies ${senderGate} to q0; receiver reads q1 alone`,
    qubits: 2,
    parameters: { senderGate },
    probabilities: { 0: p0, 1: r12(1 - p0) },
    keyQubits: [1],
    observables: { jointSame: r12(j['00'] + j['11']), receiverPurity: purityQ1(v) },
    facts: [`Receiver alone sees P(0)=${p0}, P(1)=${r12(1 - p0)} whatever the sender did: no message arrives.`,
      `The sender's ${senderGate} only shows up when both sides' results are compared over a classical link.`, PREVIEW_FACT],
  };
}

function teleport(stateId, angles, correctionX, correctionZ, bits) {
  const psi = blochState(angles);
  let v = product(3, psi);
  v = cx(gate1(v, 1, H), 1, 2); // Bell pair on q1, q2
  v = gate1(cx(v, 0, 1), 0, H); // Bell-basis transform on q0, q1
  const { m0, m1 } = bits;
  const bob = [c(0), c(0)];
  for (let q2 = 0; q2 < 2; q2++) bob[q2] = v[m0 | (m1 << 1) | (q2 << 2)];
  const norm = Math.sqrt(abs2(bob[0]) + abs2(bob[1])); // each branch has probability 1/4
  let out = [mul(bob[0], c(1 / norm)), mul(bob[1], c(1 / norm))];
  if (correctionX) out = apply2(X, out);
  if (correctionZ) out = apply2(Z, out);
  const fid = r12(fidelity1(psi, out));
  const secret = stateId === 'story_token';
  return {
    experiment: 'teleportation',
    circuitDescription: 'prepare q0; H(q1) CX(q1,q2); CX(q0,q1) H(q0); measure q0->m0, q1->m1; '
      + `receiver q2 applies ${[correctionX && 'X', correctionZ && 'Z'].filter(Boolean).join(' then ') || 'nothing'}`,
    qubits: 3,
    // The story token's angles are never shown (owner ruling 8); a calibration state's are.
    parameters: { stateId, correctionX, correctionZ, ...(secret ? {} : { theta: angles.theta, phi: angles.phi }) },
    observables: { branchProbability: r12(norm * norm) },
    fidelity: fid,
    measurementBits: { m0, m1 },
    facts: [`Bell measurement gave m0=${m0} (source), m1=${m1} (local Bell half), sent as two classical bits.`,
      `Receiver state fidelity with the original: ${fid}.`,
      'The source qubit was measured, so the original is gone: one of one.', PREVIEW_FACT],
  };
}

export function createFakeQuantum({ delayMs = 250, random = Math.random } = {}) {
  let pendingFailure = null;
  let commitFault = false;

  // Async like the real Pyodide bridge; an injected failure rejects once, for the retry path.
  function call(fn) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (pendingFailure) { const why = pendingFailure; pendingFailure = null; reject(new Error(why)); return; }
        try { resolve({ ...fn(), engine: 'documented_preview', createdAt: new Date().toISOString() }); } catch (err) { reject(err); }
      }, delayMs);
    });
  }

  // Bell-measurement outcomes are uniform (1/4 each) for every input state, so sampling them
  // without the state is honest. The player sees the bits before choosing X/Z (owner ruling).
  function sampleBellBits() {
    const k = Math.min(3, Math.floor(random() * 4));
    return { m0: k & 1, m1: (k >> 1) & 1 };
  }

  return {
    cloneTest: (state) => call(() => cloneTest(state)),
    bellSignalling: (senderGate) => call(() => bellSignalling(senderGate)),
    // One calibration attempt on a fresh random generic state unless a state is given (tests).
    teleportDryRun: (correctionX, correctionZ, bits, angles = randomGenericState(random)) =>
      call(() => teleport('calibration', angles, Boolean(correctionX), Boolean(correctionZ), bits)),
    // The live commit as ONE atomic call (owner ruling, consult 3): fresh live bits, the §7.1
    // rule's corrections, the receiver state and its fidelity, all inside the same call.
    commitStoryToken: () => call(() => {
      const bits = sampleBellBits();
      const flip = commitFault; // dev fault: the engine applies the wrong X, the call still returns
      commitFault = false;
      return teleport('story_token', STORY_TOKEN, (bits.m1 === 1) !== flip, bits.m0 === 1, bits);
    }),
    sampleBellBits,
    failNext: (reason = 'simulated quantum bridge failure') => { pendingFailure = reason; },
    faultNextCommit: () => { commitFault = true; },
  };
}
