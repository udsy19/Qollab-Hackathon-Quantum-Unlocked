export const OBJECTIVES = { FREE_ROAM_ALLEY: { number: 1, text: 'FIND A BOOTH' } }
export const HINTS = {
  short: { states: ['CLONE_INTRO'], ladder: [{ kind: 'inspect', text: 'a' }, { kind: 'resource', text: 'b' }] },
  disordered: { states: ['RELAY_INTRO'], ladder: [{ kind: 'operation', text: 'a' }, { kind: 'resource', text: 'b' }, { kind: 'inspect', text: 'c' }] },
}
