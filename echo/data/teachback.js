// echo/data/teachback.js — the learning journal, Declassified tabs (§4.5), the three teach-back
// questions and the credits. Data only.
// A `wrong` field quotes a misconception so the game can correct it; its `why` says what is true.
// "Expected" numbers are the ideal values from §7; the game shows the computed values next to them
// and labels where they came from (exact local Qiskit, or the selected backend's sampled counts).

// Journal entries unlock on entering the named §9.1 state (Tab, §3.1).
export const JOURNAL = Object.freeze([
  { unlock: 'CLONE_UNDERSTOOD', title: 'THE COPY', text: 'CNOT copies a known computational-basis bit, but not an arbitrary unknown qubit.', src: '§4.2' },
  { unlock: 'RELAY_UNDERSTOOD', title: 'THE CONNECTION', text: 'An entangled pair gives correlations, not messages. Alone, the receiver always sees 50/50.' },
  { unlock: 'TELEPORT_COMMITTED', title: 'THE TRANSFER', text: 'Bell pair + Bell measurement + two classical bits + X/Z corrections moved the state. The original was consumed.' },
])

export const DECLASSIFIED = Object.freeze({
  title: 'DECLASSIFIED',
  tabs: [
    {
      id: 'copy',
      title: { text: 'THE COPY', src: '§4.5' },
      whatIDid: 'Fed three prepared test states into a duplication booth: |0>, |1> and |+>.',
      whatTheQubitsDid: 'The booth runs a CNOT from the input onto a blank |0>. For |0> and |1> the blank ends up matching. For |+> the two qubits become one entangled pair.',
      gates: 'prepare input on q0 · CX(q0, q1)',
      expected: [
        '|0>  →  |00>',
        '|1>  →  |11>',
        '|+>  →  (|00> + |11>)/√2',
        'Purity of each output for |+>: 0.5 (an ideal, independent |+> has purity 1).',
      ],
      misconception: {
        wrong: 'If a machine can copy 0 and 1, it can copy anything.',
        why: 'A copier can only be built for a known set of perfectly distinguishable states, like 0 and 1. No machine can perfectly copy an arbitrary unknown qubit: that is the no-cloning theorem. Ordinary data copies fine.',
      },
    },
    {
      id: 'connection',
      title: { text: 'THE CONNECTION', src: '§4.5' },
      whatIDid: 'Prepared an entangled test pair, applied I, X or Z to the sender half, and read the receiver half alone.',
      whatTheQubitsDid: "Whatever the sender did, the receiver's own results stayed 50/50. The sender's action only changed how the two logs line up when compared.",
      gates: 'H(q0) · CX(q0, q1) · sender applies I, X or Z to q0 · measure q1',
      expected: [
        'Receiver alone: P(0) = 0.5, P(1) = 0.5 for I, X and Z.',
        "Receiver's reduced state: I/2 in every case.",
        'Compared logs after I: results always match. After X: they always differ.',
      ],
      misconception: {
        wrong: 'Entanglement sends the secret instantly.',
        why: 'An entangled pair is a shared resource, not a channel. Seeing the correlation needs both logs brought together by an ordinary message, which is no faster than any other signal.',
      },
    },
    {
      id: 'transfer',
      title: { text: 'THE TRANSFER', src: '§4.5' },
      whatIDid: 'Measured the source together with my Bell half, sent the two bits over the amber line, and set the receiver corrections. Then committed the real token once.',
      whatTheQubitsDid: "The Bell measurement destroyed the source's state and produced two random bits. The receiver's half became the source state up to a known correction (none, X, Z, or X and Z), and the two bits said which one to apply.",
      gates: 'H(q1) · CX(q1, q2) · CX(q0, q1) · H(q0) · measure q0 → m0, q1 → m1 · X on q2 if m1 = 1 · Z on q2 if m0 = 1',
      expected: [
        'm0 = 0, m1 = 0: no correction',
        'm0 = 0, m1 = 1: X',
        'm0 = 1, m1 = 0: Z',
        'm0 = 1, m1 = 1: X then Z',
        'Receiver fidelity with the test state: 1 in every branch, ideal maths.',
      ],
      verificationNote: "The verification circuit replaces the measurement and the bits with controlled gates (CX(q1, q2), CZ(q0, q2)). That is the deferred-measurement principle, a valid check of the maths. It is not how separated stations work: in the story the corrections ride on two classical bits.",
      misconception: {
        wrong: 'Teleportation moves the capsule, or leaves Rin a spare copy.',
        why: "Only quantum information moved, and the original was consumed by the measurement. The physical capsule stayed on Rin's wrist, now without the state.",
      },
    },
  ],
  provenanceNote: 'Puzzle numbers come from exact Qiskit statevector maths running locally in your browser. Simulator counts are samples drawn by a classical simulation of the circuit.',
})

// §4.5: optional, no scoring pressure. Each question has one right choice and two wrong ones.
export const TEACHBACK = Object.freeze([
  {
    question: "Why didn't the copying machine work on the unknown state?",
    src: '§4.5',
    answer: 'Its CNOT only copies 0 and 1. On a superposition it makes an entangled pair instead, and no machine can perfectly copy an arbitrary unknown qubit.',
    choices: [
      { right: 'No machine can perfectly copy an arbitrary unknown qubit; CNOT only copies 0 and 1.', why: 'Yes. The |+> test made one entangled pair, not two copies.' },
      { wrong: 'The booth needed more power.', why: 'Raising the voltage changed nothing. It is a rule of physics, not a power limit.' },
      { wrong: 'Quantum states cannot be stored at all.', why: "Rin's capsule stores one fine. The rule is about copying an unknown state, not storing it." },
    ],
  },
  {
    question: 'Why was entanglement alone insufficient?',
    src: '§4.5',
    answer: "The receiver's own results are 50/50 whatever the sender does. A pattern only shows when both logs are compared, and that needs an ordinary message.",
    choices: [
      { right: "The receiver's results alone stay 50/50, so they carry no message.", why: 'Yes. Correlation is not a message.' },
      { wrong: 'The entangled pair was too old and had decayed.', why: 'The pair worked: compared logs showed perfect correlation. It still could not carry a message alone.' },
      { wrong: 'Entanglement delivers the message, but too slowly.', why: 'It delivers no message at all. The receiver alone sees 50/50 whatever the sender does.' },
    ],
  },
  {
    question: 'What did the classical bits control after the Bell measurement?',
    src: '§4.5',
    answer: 'Which correction the receiver applies: X if m1 = 1, Z if m0 = 1. Without them the receiver cannot know which fix its half needs.',
    choices: [
      { right: 'The receiver corrections: X if m1 = 1, Z if m0 = 1.', why: 'Yes. Two bits pick one of four fixes.' },
      { wrong: 'They carried the quantum state itself.', why: 'Two bits cannot hold a qubit. The state needed the Bell pair; the bits only said how to finish.' },
      { wrong: 'They told the vault the password.', why: 'The vault checked the recovered state. The bits only chose the X and Z corrections.' },
    ],
  },
])

// Team line: owner-answers 2026-10-10 § credit names, byte for byte (U+2014 em dash). No emails.
// Assets line: the build is procedural; if the art lane ever bundles a third-party file, this line
// must be replaced with that file and its licence (the story-data gate fails on any file in echo/assets/).
export const CREDITS = Object.freeze([
  { role: 'title', text: 'ECHO: ONE OF ONE' },
  { role: 'team', text: 'Team The Quantubians (NYU Tandon School of Engineering) — Udaya (captain), George, Harman, Epa' },
  { role: 'support', text: 'This effort is supported by Qollab & IonQ' },
  { role: 'license', text: 'Code: MIT License, udsy19 and contributors' },
  { role: 'libraries', text: 'Built with three.js (MIT) and Qiskit (Apache-2.0), running in Pyodide (MPL-2.0) on Qollab.' },
  { role: 'assets', text: 'Art and sound: generated in code for this project. No third-party assets.' },
  { role: 'thanks', text: 'Thank you for playing.' },
])

// Declassified mode's own words (§4.5, §6.1 layer 3). The journal shows numbers from the player's
// run record only; each reading names the engine that produced it (§8.4 EngineKind). Kets are ASCII
// here and rendered as |x⟩ by the UI.
export const RUN_JOURNAL = Object.freeze({
  title: 'YOUR RUN',
  intro: 'What you actually did this run. Every number names the engine that produced it.',
  notRecorded: 'not recorded',
  invalid: 'not recorded (the result failed its contract check)',
  engines: {
    exact_qiskit_local: 'EXACT · local Qiskit statevector',
    documented_preview: 'PREVIEW · documented values, not computed this run',
    qollab_selected_backend: 'SAMPLED · the selected Qollab backend',
  },
  sections: {
    clone: 'THE COPY · booth tests',
    relay: 'THE CONNECTION · relay readings',
    dryRuns: 'THE TRANSFER · dry runs',
    commit: 'THE TRANSFER · the one commit',
    backend: 'BACKEND CHECK · one job',
  },
  labels: {
    input: 'Input state',
    joint: 'Joint outcome probabilities',
    purityQ0: 'Purity of the input slot (q0)',
    purityQ1: 'Purity of the blank slot (q1)',
    senderGate: 'Sender applied',
    receiver: 'Receiver alone',
    dryRun: 'Dry run',
    applied: 'You applied',
    // No-break spaces keep each "m1 = 1" on one line.
    rule: 'Rule for these bits (X if m1\u00A0=\u00A01, Z if m0\u00A0=\u00A01)',
    none: 'no correction',
    fidelity: 'Fidelity with the test state',
    commitFidelity: 'Fidelity with the original state (simulation check)',
    passed: 'passed',
    failed: 'did not pass',
    verdict: 'Dry-run result',
    backend: 'Backend',
    shots: 'Shots requested',
    counts: 'Counts',
  },
})

export const DECLASSIFIED_UI = Object.freeze({
  dialogLabel: 'Declassified',
  tabs: { journal: 'JOURNAL', teachback: 'TEACH-BACK', credits: 'CREDITS' },
  headings: {
    whatIDid: 'What I did',
    whatTheQubitsDid: 'What the qubits did',
    gates: 'Exact gates',
    expected: 'Expected data (ideal maths)',
    misconception: 'Misconception corrected',
    wrong: 'Myth',
    why: 'What is true',
  },
  teachbackIntro: 'Three questions, no score. Pick any answer to see why it is or is not right, and try the others too.',
  rightMark: 'Right.',
  wrongMark: 'Not quite.',
  close: 'Back to the city',
  toCredits: 'Credits',
})
