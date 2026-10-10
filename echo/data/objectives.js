// echo/data/objectives.js — every word on the HUD and in the three terminals.
// Data only. OBJECTIVES and HINTS are keyed by §9.1 quest states verbatim; HINTS ladders follow
// §6.6: hint 1 prompts inspection, hint 2 names the resource, hint 3 states the operation. Hints
// carry no penalty. FAILURES are the "every failure says why" lines (§6.6), keyed by puzzle.
// `src` marks text quoted verbatim from the vision; everything else is new text for owner review.
// Bit convention (§7.1): m0 = source readout, m1 = local Bell-half readout; X iff m1=1, Z iff m0=1.

export const OBJECTIVES = Object.freeze({
  FREE_ROAM_ALLEY: { number: 1, text: 'FIND AN AUTHORIZED REPLICATION BOOTH', src: '§4.1' },
  CLONE_INTRO: { number: 1, text: 'TEST THE BOOTH ON |0> AND |1>' },
  CLONE_BASIS_PASSED: { number: 1, text: 'TEST THE BOOTH ON |+>' },
  CLONE_SUPERPOSITION_FAILED: { number: 1, text: 'DECIDE WHAT TO DO ABOUT THE FAILED COPY' },
  CLONE_UNDERSTOOD: { number: 1, text: 'LEAVE THE BOOTH' },
  RELAY_UNLOCKED: { number: 2, text: 'FIND THE OLD ENTANGLEMENT RELAY' },
  RELAY_INTRO: { number: 2, text: 'RESTORE THE ENTANGLEMENT RELAY', src: '§6.3' },
  RELAY_BELL_CREATED: { number: 2, text: 'TRY TO SEND A MESSAGE WITH THE PAIR ALONE' },
  RELAY_SEND_FAILED: { number: 2, text: 'CHECK WHAT THE RECEIVER ACTUALLY SEES' },
  RELAY_UNDERSTOOD: { number: 2, text: 'TAKE THE AMBER LINE UP TO THE ROOFTOP' },
  ROOFTOP_UNLOCKED: { number: 3, text: 'ROUTE THE AMBER LINE THROUGH THREE JUNCTIONS' },
  LINK_REPAIRED: { number: 3, text: 'OPEN THE TRANSMISSION CONSOLE' },
  TELEPORT_DRY_RUN: { number: 3, text: 'SET THE RECEIVER CORRECTIONS ON A TEST STATE' },
  TELEPORT_DRY_RUN_PASSED: { number: 3, text: 'COMMIT THE ONE-WAY TRANSFER' },
  TELEPORT_COMMITTED: { number: 3, text: 'TRANSFER IN PROGRESS' },
})

export const HINTS = Object.freeze({
  alley: {
    states: ['FREE_ROAM_ALLEY'],
    ladder: [
      { kind: 'inspect', text: 'Scan the street (Q). One shopfront on this block is still lit.' },
      { kind: 'resource', text: 'Palisade replication booths copy things. Rin wants to test one.' },
      { kind: 'operation', text: 'Walk to the glowing booth and press E.' },
    ],
  },
  clone_basis: {
    states: ['CLONE_INTRO'],
    ladder: [
      { kind: 'inspect', text: 'Check the TEST INPUT row. Which states can the booth load?' },
      { kind: 'resource', text: 'Start with the plain basis states |0> and |1>.' },
      { kind: 'operation', text: 'Load |0> and press DUPLICATE. Then do the same with |1>.' },
    ],
  },
  clone_superposition: {
    states: ['CLONE_BASIS_PASSED'],
    ladder: [
      { kind: 'inspect', text: 'One test input has not been tried yet.' },
      { kind: 'resource', text: '|+> is a superposition, like the real token. 0 and 1 were special cases.' },
      { kind: 'operation', text: 'Load |+> and press DUPLICATE.' },
    ],
  },
  clone_deduction: {
    states: ['CLONE_SUPERPOSITION_FAILED'],
    ladder: [
      { kind: 'inspect', text: 'Press WHY DID THAT FAIL? and read each output on its own.' },
      { kind: 'resource', text: 'More power changes nothing. One unknown state cannot become two.' },
      { kind: 'operation', text: 'Choose REROUTE, DO NOT DUPLICATE.' },
    ],
  },
  clone_exit: {
    states: ['CLONE_UNDERSTOOD'],
    ladder: [
      { kind: 'inspect', text: 'Open the journal (Tab). VEGA left you something.' },
      { kind: 'resource', text: 'VEGA sent coordinates for an old entanglement relay.' },
      { kind: 'operation', text: 'Leave the booth and head for the substation passage.' },
    ],
  },
  relay_reach: {
    states: ['RELAY_UNLOCKED'],
    ladder: [
      { kind: 'inspect', text: 'Follow the guide arrows. Scan (Q) if you lose them.' },
      { kind: 'resource', text: 'The relay chamber is under the substation.' },
      { kind: 'operation', text: 'Go down the substation passage and press E at the relay core.' },
    ],
  },
  relay_bell: {
    states: ['RELAY_INTRO'],
    ladder: [
      { kind: 'inspect', text: 'Check the relay console. Which control is lit?' },
      { kind: 'resource', text: 'The test rig needs an entangled pair before anything else.' },
      { kind: 'operation', text: 'Press PREPARE BELL PAIR.' },
    ],
  },
  relay_send: {
    states: ['RELAY_BELL_CREATED'],
    ladder: [
      { kind: 'inspect', text: 'Your half has three actions: I, X and Z. The receiver panel is on the right.' },
      { kind: 'resource', text: 'So far the pair is the only link you are using.' },
      { kind: 'operation', text: 'Pick any sender action and press SEND.' },
    ],
  },
  relay_marginal: {
    states: ['RELAY_SEND_FAILED'],
    ladder: [
      { kind: 'inspect', text: 'Try I, X and Z in turn. Compare the receiver-only numbers each time.' },
      { kind: 'resource', text: 'What does the receiver actually know? Only its own results.' },
      { kind: 'operation', text: 'Open RECEIVER-ONLY DATA and confirm it reads 50% / 50%.' },
    ],
  },
  relay_exit: {
    states: ['RELAY_UNDERSTOOD'],
    ladder: [
      { kind: 'inspect', text: "VEGA's blueprint shows a second line. What colour is it?" },
      { kind: 'resource', text: 'The amber classical line runs up to the rooftop tower.' },
      { kind: 'operation', text: 'Take the elevator corridor up to the roof.' },
    ],
  },
  link_repair: {
    states: ['ROOFTOP_UNLOCKED'],
    ladder: [
      { kind: 'inspect', text: 'Scan (Q) the roof. Three junctions are dark.' },
      { kind: 'resource', text: 'The amber line carries ordinary bits. It has to reach the mast.' },
      { kind: 'operation', text: 'Press E at each junction, following the glow, until the mast lights.' },
    ],
  },
  teleport_open: {
    states: ['LINK_REPAIRED'],
    ladder: [
      { kind: 'inspect', text: 'The console by the mast just woke up.' },
      { kind: 'resource', text: 'You have both now: the blue Bell pair and the amber line.' },
      { kind: 'operation', text: 'Press E at the transmission console to start a dry run.' },
    ],
  },
  teleport_correct: {
    states: ['TELEPORT_DRY_RUN'],
    ladder: [
      { kind: 'inspect', text: 'Read the two bits: m0 is the source readout, m1 is your Bell half.' },
      { kind: 'resource', text: 'The amber line carries m0 and m1 to the receiver. Each bit controls one fix.' },
      { kind: 'operation', text: 'Apply X if m1 = 1 and Z if m0 = 1.' },
    ],
  },
  teleport_commit: {
    states: ['TELEPORT_DRY_RUN_PASSED'],
    ladder: [
      { kind: 'inspect', text: 'Check the capsule. The token is still STATE PRESENT.' },
      { kind: 'resource', text: 'Your corrections worked on a test state. The token can be measured only once.' },
      { kind: 'operation', text: 'Press COMMIT ONE-WAY TRANSFER.' },
    ],
  },
})

export const FAILURES = Object.freeze({
  cloning: {
    plus_not_copied: 'Two outputs, one entangled pair. Each output alone is random, not a copy of |+>.',
    increase_voltage: 'Voltage raised. Same result. The limit is a rule of physics, not a power shortage.',
  },
  bell_signalling: {
    sender_I: 'Sender did nothing (I). Receiver-only data: 50% / 50%.',
    sender_X: 'Sender flipped its half (X). The receiver alone still sees 50% / 50%.',
    sender_Z: 'Sender phase-flipped its half (Z). The receiver alone still sees 50% / 50%.',
    no_message: 'Receiver-only data: 50% / 50%. No decodable message.',
    classical_missing: 'The receiver sees random local results; the classical channel is still missing.',
  },
  link_repair: {
    wrong_junction: 'No signal reaches that junction yet. Patch the one the glow stops at.',
  },
  teleportation: {
    missing_X: 'm1 = 1 but X was off. The bit flip that m1 = 1 flags was never undone.',
    missing_Z: 'm0 = 1 but Z was off. The phase flip that m0 = 1 flags was never undone.',
    extra_X: 'X was on but m1 = 0. That X added a bit flip the bits never called for.',
    extra_Z: 'Z was on but m0 = 0. That Z added a phase flip the bits never called for.',
    blind_spot: 'On this test state that mistake happens to look harmless. It would fail on most others.',
    commit_locked: 'Commit locked. First pass a dry run whose bits are not 00: the token can be measured only once.',
    already_committed: 'Transfer complete. The source was measured; there is nothing left to send.',
  },
})

// Which FAILURES.teleportation lines a dry run shows, keyed 'm0m1:XZ': the two measured bits, then
// the receiver plan's X and Z switches (1 = on). A correct plan shows none. A plan with both
// corrections wrong shows two lines, one per wrong switch. Each line is worded to be true whatever
// the other bit and switch are: evidence/story-ui/data-fixes/branch-truth.md checks all 16 in Qiskit.
// `blind_spot` is not listed: the terminal adds it when a listed failure still scores high
// fidelity on that particular test state.
export const TELEPORT_FAILURE_CASES = Object.freeze({
  '00:00': [], '00:01': ['extra_Z'], '00:10': ['extra_X'], '00:11': ['extra_X', 'extra_Z'],
  '01:00': ['missing_X'], '01:01': ['missing_X', 'extra_Z'], '01:10': [], '01:11': ['extra_Z'],
  '10:00': ['missing_Z'], '10:01': [], '10:10': ['extra_X', 'missing_Z'], '10:11': ['extra_X'],
  '11:00': ['missing_X', 'missing_Z'], '11:01': ['missing_X'], '11:10': ['missing_Z'], '11:11': [],
})

// "Fidelity" in plain words, shown wherever the player sees the word. It claims only what holds
// for every value a dry run can show (1, 0.674, 0.177 and 0.149 on the generic test state).
export const FIDELITY_GLOSS = 'Fidelity: how closely the received state matches the test state, on a scale from 0 to 1, where 1 means identical.'

// Labels that say which column of HUD this lives in follow §6.1/§6.3.
export const HUD = Object.freeze({
  header: { text: 'ECHO // DISTRICT 09', src: '§6.3' },
  objectivePrefix: 'OBJECTIVE',
  countdownLabel: { text: 'GRID SHUTDOWN', src: '§6.3' },
  countdownAborted: 'GRID ISOLATION ABORTED',
  // At 00:00 the display holds and the story continues: no game-over from the timer (§1 anti-goals).
  countdownHeld: 'ISOLATION HELD // AWAITING CONFIRMATION',
  capsuleLabel: 'Q-SOURCE',
  capsulePreserved: { text: 'PRESERVED', src: '§6.3' },
  capsuleConsumed: 'MEASURED / CONSUMED',
  interact: { text: '[E] INTERACT', src: '§6.3' },
  hintButton: 'HINT',
  hintCounter: 'HINT {n} OF 3',
  interactLabels: {
    copy_booth: { text: 'REPLICATION BOOTH', src: '§9.4' },
    relay_core: { text: 'QUANTUM RELAY', src: '§9.4' },
    classical_socket: { text: 'LEGACY DATA LINK', src: '§9.4' },
    teleport_terminal: 'TRANSMISSION CONSOLE',
  },
  // §4.1: WASD for 3 s at start, Shift only once the player has moved, E at the booth.
  tooltips: {
    move: 'WASD  MOVE',
    sprint: 'SHIFT  SPRINT',
    interact: 'E  INTERACT',
    scan: 'Q  FIELD SCAN',
    journal: 'TAB  JOURNAL',
    pause: 'ESC  PAUSE',
  },
  // Field scanner (Q) readouts, keyed by interactable id.
  scans: {
    copy_booth: 'PALISADE DUPLICATION SERVICES. CLASSICAL DATA COPIER. MAINTENANCE PORT OPEN.',
    relay_core: 'ENTANGLEMENT RELAY. BELL HALVES IN COLD STORAGE. PARTNERS: VAULT RECEIVER. TEST RIG ON SITE.',
    classical_socket: 'LEGACY DATA LINK. CLASSICAL. THREE JUNCTIONS DARK.',
    teleport_terminal: 'TRANSMISSION CONSOLE. NEEDS: BELL PAIR + CLASSICAL LINK.',
  },
})

// Terminal copy. Layouts follow §6.4 and §6.5; ui/terminal.js decides placement.
export const TERMINALS = Object.freeze({
  copy_booth: {
    title: { text: 'PALISADE / DUPLICATION UNIT / MAINTENANCE OVERRIDE', src: '§6.4' },
    inputLabel: 'TEST INPUT',
    inputMode: { text: 'PREPARED CALIBRATION STATE', src: '§6.4' },
    duplicate: 'DUPLICATE',
    // §6.4 asks for "two basis values matched" in place of "two copies in Z basis" for beginners.
    basisResult: 'TWO BASIS VALUES MATCHED: YES',
    superpositionResult: { text: 'TWO INDEPENDENT COPIES: NO', src: '§4.2' },
    whyFail: { text: 'WHY DID THAT FAIL?', src: '§6.4' },
    tryAnother: { text: 'TRY ANOTHER STATE', src: '§6.4' },
    showWhy: 'SHOW ME WHY',
    skipDemo: 'SKIP DEMONSTRATION',
    choiceVoltage: 'INCREASE VOLTAGE',
    choiceReroute: 'REROUTE, DO NOT DUPLICATE',
    learning: { text: 'CNOT copies a known computational-basis bit, but not an arbitrary unknown qubit.', src: '§4.2' },
  },
  relay_core: {
    title: 'NACRE MUNICIPAL / ENTANGLEMENT RELAY / TEST RIG',
    prepare: 'PREPARE BELL PAIR',
    senderLabel: 'SENDER ACTION ON ITS HALF',
    send: 'SEND',
    receiverOnly: 'RECEIVER-ONLY DATA',
    compared: 'COMPARED PAIRED DATA',
    comparedNote: 'Needs both logs, brought together by an ordinary message.',
    statusReady: { text: 'ENTANGLEMENT READY', src: '§4.3' },
    statusClassical: 'CLASSICAL LINK: OFFLINE',
  },
  teleport_terminal: {
    title: { text: 'ECHO // TRANSMISSION CONSOLE', src: '§6.5' },
    stateLabel: 'STATE',
    statePresent: { text: 'STATE PRESENT', src: '§4.4' },
    stateConsumed: { text: 'STATE MEASURED / CONSUMED', src: '§4.4' },
    bellReady: { text: 'BELL PAIR: READY', src: '§6.5' },
    classicalOnline: { text: 'CLASSICAL LINK ONLINE', src: '§4.4' },
    slotSource: 'SOURCE',
    slotLocal: 'LOCAL BELL HALF',
    slotRemote: 'RECEIVER BELL HALF',
    measure: { text: 'EXECUTE BELL MEASUREMENT ON TEST STATE', src: '§6.5' },
    m0Label: 'SOURCE READOUT m0',
    m1Label: 'LOCAL BELL-HALF READOUT m1',
    planTitle: { text: 'RECEIVER CORRECTION PLAN', src: '§6.5' },
    planRowTemplate: 'IF m0 = {m0}, m1 = {m1}:  X [{x}]  Z [{z}]',
    verify: { text: 'VERIFY DRY RUN', src: '§6.5' },
    fidelityLabel: { text: 'Receiver test fidelity', src: '§6.5' },
    fidelityGloss: FIDELITY_GLOSS,
    commit: { text: 'COMMIT ONE-WAY TRANSFER', src: '§4.4' },
    receiverRecovered: { text: 'STATE RECOVERED', src: '§4.4' },
    vaultAccepted: 'VAULT: AUTHORIZATION ACCEPTED',
  },
})
