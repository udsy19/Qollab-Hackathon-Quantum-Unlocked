// Deliberately bad fixture: every line here should be caught by check.mjs.
export const STORY = {
  OPENING: [
    { speaker: 'RIN', text: 'This line is far too long to ever fit inside two subtitle lines of forty-two characters each, so it must fail.' },
    { speaker: 'NARRATOR', text: 'Not a cast member.' },
    { speaker: 'VEGA', text: 'The entangled pair sends the secret faster than light.' },
  ],
  NOT_A_STATE: [{ speaker: 'MICA', text: 'Unknown key.' }],
}
export const MOMENTS = {
  bad: [
    { speaker: 'VEGA', text: 'Apply X if m0 = 1.' },
    { speaker: 'MIRROR', text: 'We teleport Rin to the vault.' },
    { speaker: 'MICA', text: 'So you still have it.' },
    { speaker: 'VEGA', text: 'Certified quantum randomness from the simulator.' },
    { speaker: 'VEGA', text: 'Entanglement delivers the message instantly.' },
  ],
}
