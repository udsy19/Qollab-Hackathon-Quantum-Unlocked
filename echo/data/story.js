// echo/data/story.js — every spoken line and title card in ECHO, in play order.
// Data only. A beat is { speaker, text } and fits two subtitle lines of ~42 characters.
// Optional beat fields:
//   src           the vision section a line is quoted from VERBATIM (absent = new text, owner to review)
//   direction     a stage direction for gameplay/camera; never shown as a caption
//   misconception true when a character voices a wrong idea; the next beat must correct it
// STORY keys are §9.1 quest states verbatim: the sequence plays on ENTERING that state.
// MOMENTS are reactions that are not state changes; their keys name the trigger.

export const CAST = Object.freeze({
  RIN: { name: 'Rin Vale', role: 'courier, former Palisade quantum network technician' },
  MICA: { name: 'Mica Vale', role: "Rin's sister, in the District Nine shelter (radio only)" },
  VEGA: { name: 'VEGA', role: 'abandoned maintenance intelligence in old terminals' },
  MIRROR: { name: 'MIRROR', role: 'Palisade public-safety system voice' },
})

export const SCREEN_TEXT = Object.freeze({
  gameTitle: { text: 'ECHO: ONE OF ONE' },
  openingCard: { text: 'NACRE CITY // 02:17 AM', src: '§4.1' },
  billboard: { text: 'NOTHING EVER HAS TO END', src: '§4.1' },
  cloneLearning: { text: 'CNOT copies a known computational-basis bit, but not an arbitrary unknown qubit.', src: '§4.2' },
  endingCard: { text: "You didn't copy the information. You transferred it.", src: '§4.4' },
  endingTitle: { text: 'ECHO / ONE OF ONE', src: '§4.4' },
})

export const STORY = Object.freeze({
  // §4.1 Shots B–D. Shot A is SCREEN_TEXT.openingCard over the billboard.
  OPENING: [
    { speaker: 'MIRROR', text: 'Public safety measure active. District Nine.', src: '§4.1' },
    { speaker: 'MIRROR', text: 'Grid isolation in eleven minutes and fifty-nine seconds.', src: '§4.1' },
    { speaker: 'MICA', text: 'Rin. Backup generator is dying. Did you get it?', src: '§4.1' },
    { speaker: 'RIN', text: 'I have the authorization.', src: '§4.1' },
    { speaker: 'MICA', text: 'Then copy it. Send one to the tower. Bring the other to me.', src: '§4.1', misconception: true },
    { speaker: 'RIN', text: "I can't copy this one.", src: '§4.1', direction: 'looks at capsule' },
    { speaker: 'MICA', text: "That's not funny.", src: '§4.1' },
    { speaker: 'RIN', text: "It wasn't supposed to be.", src: '§4.1' },
    { speaker: 'MICA', text: 'Palisade copies everything. It says so on every billboard.' },
    { speaker: 'RIN', text: 'Palisade copies data. This is a qubit.' },
    { speaker: 'RIN', text: "There's a booth on this block. I'll show you." },
  ],

  // §4.2 Mission 1: THE COPY.
  CLONE_INTRO: [
    { speaker: 'VEGA', text: 'Maintenance override accepted. Hello, courier.' },
    { speaker: 'VEGA', text: 'Test chamber only. Your token stays sealed in its capsule.' },
    { speaker: 'VEGA', text: 'I prepare fresh calibration states for every test. Try your old method first.' },
  ],
  CLONE_BASIS_PASSED: [
    { speaker: 'VEGA', text: '|0> in, |00> out. |1> in, |11> out. Both basis values matched.' },
    { speaker: 'RIN', text: 'Zero and one always copy. That was never the problem.' },
    { speaker: 'VEGA', text: 'Then try a state that is not just 0 or 1.' },
  ],
  CLONE_SUPERPOSITION_FAILED: [
    { speaker: 'VEGA', text: 'Two outputs. Not two copies.' },
    { speaker: 'VEGA', text: 'Read either output alone and it is 50/50 in every basis: pure noise.' },
    { speaker: 'VEGA', text: 'Together they form one entangled pair. Neither is a |+>.' },
    { speaker: 'VEGA', text: 'Your call, courier. More power, or a different route?' },
  ],
  CLONE_UNDERSTOOD: [
    { speaker: 'VEGA', text: "It's not defective. You're asking the machine to make two unknowns out of one.", src: '§4.2' },
    { speaker: 'RIN', text: 'Then we stop trying to make two.', src: '§4.2' },
    { speaker: 'VEGA', text: 'There is an old entanglement relay under the substation. Coordinates sent.' },
  ],

  // §4.2 Outcome: on leaving the booth the billboard glitches and the street lamps die.
  RELAY_UNLOCKED: [
    { speaker: 'MIRROR', text: 'District Nine shelter occupancy classified: evacuable.' },
    { speaker: 'MIRROR', text: 'Load shedding proceeding on schedule.' },
    { speaker: 'MICA', text: 'Rin?', src: '§4.2', direction: 'radio static' },
    { speaker: 'RIN', text: "Still here. Copying is out. I'm finding another way." },
  ],

  // §4.3 Mission 2: THE CONNECTION.
  RELAY_INTRO: [
    { speaker: 'VEGA', text: 'Relay maintenance core online. More room for me down here.', direction: 'power switch wakes the relay; VEGA projects at full size' },
    { speaker: 'VEGA', text: 'This relay holds half of an entangled pair.' },
    { speaker: 'VEGA', text: "The other half waits at the vault's receiver." },
    { speaker: 'RIN', text: 'Palisade shared those pairs years ago, before any of this. Kept cold ever since.' },
    { speaker: 'VEGA', text: "Don't touch the vault pair yet. Use the test rig first." },
    { speaker: 'VEGA', text: 'Same physics, with both halves in this room.' },
  ],
  RELAY_BELL_CREATED: [
    { speaker: 'VEGA', text: 'Test pair ready. Left half is yours. The right half plays the receiver.' },
    { speaker: 'VEGA', text: 'The endpoints share a prepared resource. Correlation is not a message.', src: '§4.3' },
    { speaker: 'RIN', text: 'Mica thinks the pair is enough on its own. Let us find out.' },
  ],
  RELAY_SEND_FAILED: [
    { speaker: 'VEGA', text: 'Receiver-only data: 50% / 50%. No decodable message.', src: '§4.3' },
    { speaker: 'VEGA', text: 'What does the receiver actually know?', src: '§2.2' },
  ],
  RELAY_UNDERSTOOD: [
    { speaker: 'VEGA', text: 'Put both logs side by side and a pattern appears. X flips which results match.' },
    { speaker: 'VEGA', text: 'But comparing logs takes an ordinary message. The receiver alone sees noise.' },
    { speaker: 'VEGA', text: 'You still need the message.', src: '§2.2' },
    { speaker: 'VEGA', text: 'Old maintenance blueprint. A classical service line runs up to the rooftop tower.' },
    { speaker: 'MICA', text: "So the secret can't just travel down that blue cable?", src: '§4.3' },
    { speaker: 'RIN', text: 'The blue link makes transfer possible.', src: '§4.3' },
    { speaker: 'RIN', text: 'The amber one tells the other side what to do.', src: '§4.3' },
    { speaker: 'VEGA', text: "Rooftop access unlocked. The amber line's far end is up there." },
  ],

  // §4.4 Mission 3: ONE OF ONE.
  ROOFTOP_UNLOCKED: [
    { speaker: 'MIRROR', text: 'Grid isolation imminent. Shelter systems on reserve power.' },
    { speaker: 'MICA', text: 'The lights on our floor just went out. Rin, hurry.' },
    { speaker: 'VEGA', text: 'Three junctions between you and the mast. Patch the amber line through each.' },
  ],
  LINK_REPAIRED: [
    { speaker: 'VEGA', text: 'Classical link online. It carries ordinary bits at ordinary speed.' },
    { speaker: 'RIN', text: 'Blue for the pair. Amber for the bits. Now the console.' },
  ],
  TELEPORT_DRY_RUN: [
    { speaker: 'VEGA', text: 'Not the token yet. A fresh test state first.' },
    { speaker: 'VEGA', text: "Three slots: test source, your Bell half, and the receiver's half at the vault." },
    { speaker: 'VEGA', text: 'A Bell measurement on the source and your half gives two bits: m0 and m1.' },
    { speaker: 'VEGA', text: 'The amber line carries them. Tell the receiver what to do for each result.' },
  ],
  TELEPORT_DRY_RUN_PASSED: [
    { speaker: 'VEGA', text: 'Receiver matches the test state. Your correction rule holds.' },
    { speaker: 'VEGA', text: 'The live run will give its own bits. The rule carries over, not the bits.' },
    { speaker: 'VEGA', text: 'Commit measures the token. There is no second try.' },
    { speaker: 'RIN', text: 'One of one.' },
  ],
  TELEPORT_COMMITTED: [
    { speaker: 'VEGA', text: 'Bell measurement done. Two bits sent down the amber line.' },
    { speaker: 'VEGA', text: 'Receiver corrected. Your source was measured.' },
    { speaker: 'VEGA', text: 'The state now exists only at the vault.' },
    { speaker: 'MIRROR', text: 'Emergency authorization accepted. District Nine grid isolation aborted.', src: '§4.4' },
  ],
  ENDING: [
    { speaker: 'MICA', text: 'Rin? Did you make it?', src: '§4.4' },
    { speaker: 'RIN', text: 'No. I sent it.', src: '§4.4' },
    { speaker: 'MICA', text: 'But you still have it, right?', src: '§4.4', misconception: true },
    { speaker: 'RIN', text: 'Not anymore.', src: '§4.4' },
  ],
})

export const MOMENTS = Object.freeze({
  // Deduction choice after CLONE_SUPERPOSITION_FAILED (§4.2 Beat 3): allowed, never punished.
  clone_increase_voltage: [
    { speaker: 'VEGA', text: 'Voltage up forty percent. Same result.' },
    { speaker: 'VEGA', text: 'Not a power problem. It is a rule of physics.' },
  ],
  // §4.3 Beat 3: the player reconnects the amber cable in the relay bay; one light strip returns.
  relay_bay_cable: [
    { speaker: 'VEGA', text: 'Amber line patched at this end. The rest of it runs up to the roof.' },
  ],
  // Player tries to commit before a passed dry run (§7.4 story integrity).
  teleport_commit_locked: [
    { speaker: 'VEGA', text: 'Not yet. The token gets one try. Prove the rule on a test state first.' },
  ],
  // A dry run fails; the next one uses a fresh calibration state (owner ruling 2026-10-10).
  teleport_dry_run_failed: [
    { speaker: 'VEGA', text: 'That test state is spent. Here is a fresh one. Check the rule again.' },
  ],
})
