// The EXPECTED answer for every row, derived from the owner's documents only: vision §7 (normative
// physics), §9.2 (the quest table) and the owner rulings in lanes/gameplay/rulings.md. It reads the
// row's INPUTS (prepared state, sender gate, bits, the player's choice), never the engine's result and
// never gameplay code, so it cannot inherit a defect from either (gate-independence law 4).
// `null` = the quest must NOT advance. `undefined` = the documents do not settle it (reported, not graded).

const BASIS = ['zero', 'one'];
// §7.1: receiver applies X iff m1 = 1, Z iff m0 = 1.
const ruleX = (m1) => m1 === 1;
const ruleZ = (m0) => m0 === 1;

export function expectedFor(row, questState) {
  switch (row.mission) {
    case 'cloning':
      // §7.2: basis states copy (the deceptive beginning, BASIS_DEMO_OK); any non-basis state is
      // "not |psi>⊗|psi> in general" and demonstrates the failure ("test several non-basis preparations").
      if (questState === 'CLONE_INTRO') return BASIS.includes(row.state) ? 'BASIS_DEMO_OK' : null;
      if (questState === 'CLONE_BASIS_PASSED') return BASIS.includes(row.state) ? null : 'SUPERPOSITION_DEMO_FAILED';
      return null;
    case 'bell':
      // §9.2 RELAY_INTRO -PREPARE_BELL_PAIR→: any Bell-pair result prepares the pair.
      if (questState === 'RELAY_INTRO') return 'PREPARE_BELL_PAIR';
      // §7.3: a sender's local action (X or Z) leaves the receiver at 50/50 = the failed send.
      // Sender I (doing nothing) is not settled by the docs as an "attempt".
      if (questState === 'RELAY_BELL_CREATED') return row.senderGate === 'I' ? undefined : 'ATTEMPT_NO_SIGNALLING';
      return null;
    case 'teleport_bits':
      // Owner ruling (red-team #2): bits come FIRST, corrections second; a phase-1 result alone shows
      // no lesson and must not advance the dry run.
      return null;
    case 'teleport_correction': {
      if (questState !== 'TELEPORT_DRY_RUN') return null;
      const right = row.applyX === ruleX(row.m1) && row.applyZ === ruleZ(row.m0);
      // Owner ruling (13 questions #7): dry runs use random GENERIC states. A non-generic named state is
      // not a legal dry run; on it a wrong choice can still score fidelity 1 (§7.4 blind spot).
      const generic = typeof row.theta === 'number';
      if (!right) return null;
      if (!generic) return null;
      // Owner ruling (gameplay consult 3): COMMIT unlocks only after a correct NON-00 dry run.
      if (row.m0 === 0 && row.m1 === 0) return null;
      return 'CORRECT_CALIBRATION';
    }
    case 'commit':
      // §7.4: a fresh live Bell measurement, the calibrated rule applied to THOSE bits, fidelity
      // ≥ 0.999999 → the transfer is committed, once.
      return questState === 'TELEPORT_DRY_RUN_PASSED' ? 'COMMIT_TRANSFER' : null;
    default:
      throw new Error(`no expectation for mission ${row.mission}`);
  }
}

// The quest state in which each kind of row is presented (§9.2).
export const STATES_FOR = {
  cloning: ['CLONE_INTRO', 'CLONE_BASIS_PASSED'],
  bell: ['RELAY_INTRO', 'RELAY_BELL_CREATED'],
  teleport_bits: ['TELEPORT_DRY_RUN'],
  teleport_correction: ['TELEPORT_DRY_RUN'],
  commit: ['TELEPORT_DRY_RUN_PASSED'],
};
