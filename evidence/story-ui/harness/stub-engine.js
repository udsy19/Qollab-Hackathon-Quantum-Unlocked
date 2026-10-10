// Harness stub of the quantum engine for the story-ui terminals. NOT shipped (lives outside echo/).
// Returns objects in exactly the quantum lane's experiment_result shape (echo/quantum/formats.py on
// lane/quantum/integration) with engine 'documented_preview': textbook-exact values only, never
// counts. The teleport fidelities are the closed form for a pure state with Bloch vector (bx, by, bz):
// a residual Pauli X, Y or Z after Bob's correction leaves fidelity bx², by² or bz²; none leaves 1.
// Controls (window.echoHarness.stub.control) let the harness show CALIBRATING, a rejected promise
// and a malformed result.
const PREVIEW = 'Documented preview: textbook values for the harness, not a live Qiskit calculation.';
const r6 = (x) => Math.round(x * 1e12) / 1e12;

// The relay is the exception: the platform contract refuses a documented_preview bell_signalling
// (owner ruling 2026-10-10, the receiver panel is EXACT only), so it replays the quantum lane's REAL
// Qiskit output recorded by record-relay.sh. Those results are honestly exact_qiskit_local.
export function makeStubEngine({ relayFixtures } = {}) {
  const control = { delayMs: 150, rejectNext: 0, malformedNext: 0, bitsQueue: [] };
  const calls = [];
  const results = [];

  async function respond(method, args, build) {
    calls.push({ method, args, at: performance.now() });
    await new Promise((r) => setTimeout(r, control.delayMs));
    if (control.rejectNext > 0) {
      control.rejectNext -= 1;
      throw new Error(`stub: ${method} raised (harness-injected Python error)`);
    }
    let out = build();
    if (control.malformedNext > 0) {
      control.malformedNext -= 1;
      out = { ...out, engine: 'ionq_verified', probabilities: { '0': 0.7 } };
    }
    results.push({ method, out });
    return out;
  }

  const CLONES = {
    zero: { label: '|0>', probs: { '00': 1, '01': 0, '10': 0, '11': 0 }, purity: 1 },
    one: { label: '|1>', probs: { '00': 0, '01': 0, '10': 0, '11': 1 }, purity: 1 },
    plus: { label: '|+> = (|0>+|1>)/√2', probs: { '00': 0.5, '01': 0, '10': 0, '11': 0.5 }, purity: 0.5 },
  };

  function drawBits() {
    if (control.bitsQueue.length) return control.bitsQueue.shift();
    return [Math.random() < 0.5 ? 0 : 1, Math.random() < 0.5 ? 0 : 1];
  }
  // A generic Bloch point well away from every axis, so each wrong correction shows fidelity < 1.
  const states = new Map();
  let nState = 0;
  function freshState() {
    const theta = 0.5 + Math.random() * 0.8;
    const phi = 0.3 + Math.random() * (Math.PI / 2 - 0.6);
    nState += 1;
    const id = `generic_${nState}`;
    states.set(id, { theta, phi, b: [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)] });
    return id;
  }
  const UNIFORM = { '00': 0.25, '01': 0.25, '10': 0.25, '11': 0.25 };

  return {
    control, calls, results, states,
    cloneTest(state) {
      return respond('cloneTest', [state], () => {
        const c = CLONES[state];
        const basis = c.purity === 1;
        return {
          experiment: 'cloning', engine: 'documented_preview',
          circuitDescription: `prepare ${c.label} on q0 (source); CX(q0 -> q1 blank copy)`,
          qubits: 2, parameters: { state }, probabilities: c.probs, keyQubits: [1, 0],
          facts: [basis ? 'Two matching basis values: the input was already a Z-basis state.'
            : 'Not two independent copies: each output alone has purity 0.5.', PREVIEW],
          observables: { purityQ0: c.purity, purityQ1: c.purity, jointFidelityWithTwoCopies: basis ? 1 : 0.5 },
        };
      });
    },
    bellSignalling(senderGate) {
      return respond('bellSignalling', [senderGate], () => structuredClone(relayFixtures[senderGate]));
    },
    bellMeasurement() {
      return respond('bellMeasurement', [], () => {
        const id = freshState();
        const [m0, m1] = drawBits();
        return {
          experiment: 'teleportation', engine: 'documented_preview',
          circuitDescription: `prepare ${id} on q0; H(q1); CX(q1,q2); CX(q0,q1); H(q0); measure q0 -> m0, q1 -> m1`,
          qubits: 3, parameters: { state: id }, probabilities: UNIFORM, keyQubits: [1, 0],
          measurementBits: { m0, m1 }, facts: [`m0 = ${m0} (source readout), m1 = ${m1} (local Bell-half readout).`, PREVIEW],
        };
      });
    },
    teleportDryRun(stateId, correctionX, correctionZ, bits) {
      return respond('teleportDryRun', [stateId, correctionX, correctionZ, bits], () => {
        const { b } = states.get(stateId);
        const rx = (correctionX ? 1 : 0) ^ bits.m1;
        const rz = (correctionZ ? 1 : 0) ^ bits.m0;
        const fidelity = rx && rz ? b[1] ** 2 : rx ? b[0] ** 2 : rz ? b[2] ** 2 : 1;
        return {
          experiment: 'teleportation', engine: 'documented_preview',
          circuitDescription: `prepare ${stateId} on q0; Bell pair; project onto m0=${bits.m0}, m1=${bits.m1}; Bob applies ${[correctionX && 'X', correctionZ && 'Z'].filter(Boolean).join(' then ') || 'no correction'}`,
          qubits: 3, parameters: { state: stateId, m0: bits.m0, m1: bits.m1, applyX: !!correctionX, applyZ: !!correctionZ },
          probabilities: UNIFORM, keyQubits: [1, 0], measurementBits: { m0: bits.m0, m1: bits.m1 },
          fidelity: r6(fidelity), facts: [`Receiver test fidelity: ${fidelity.toFixed(6)}.`, PREVIEW],
          observables: { branchProbability: 0.25 },
        };
      });
    },
    commitStoryTransfer() {
      return respond('commitStoryTransfer', [], () => {
        const [m0, m1] = drawBits();
        return {
          experiment: 'teleportation', engine: 'documented_preview',
          circuitDescription: 'prepare token on q0; Bell pair; measure m0, m1; Bob applies X iff m1=1, Z iff m0=1',
          qubits: 3, parameters: { state: 'story_token' }, probabilities: UNIFORM, keyQubits: [1, 0],
          measurementBits: { m0, m1 }, fidelity: 1,
          facts: [`Live bits m0 = ${m0}, m1 = ${m1} travelled over the classical link.`, PREVIEW],
        };
      });
    },
  };
}
