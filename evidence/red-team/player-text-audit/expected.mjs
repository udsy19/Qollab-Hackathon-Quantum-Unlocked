// Independent expected set for ECHO's player-visible text.
// Derived ONLY from the owner docs and rulings, written BEFORE any story-ui string was read
// (law 3; law 4: never calibrate on the population under test). Citations:
//   V:n  = ECHO_MASTER_VISION.md line n        OA:n = lanes/red-team/owner-answers.md line n
//   Q:n  = QOLLAB_DEPLOYMENT.md line n          ctx  = lanes/red-team/context.md (standing rulings)
// Forbidden-claim patterns are written in the DOCS' and physics' vocabulary plus paraphrases a
// writer might use (law 4a), never in story-ui's wording.

// ---- (a) required strings: exact bytes, must appear in a player-visible string literal ----
export const REQUIRED = [
  { id: 'R-M1-LABEL', text: 'LOCAL BELL-HALF READOUT m1', cite: 'OA:41 (1); V:417', sev: 'HIGH' },
  { id: 'R-M0-LABEL', text: 'SOURCE READOUT m0', cite: 'V:261 (m0 label, unchanged by OA:41); V:416', sev: 'HIGH' },
  { id: 'R-EXACT', re: /\bEXACT\b/, desc: 'Mission 2 receiver panel labelled EXACT', cite: 'OA:41 (4)', sev: 'HIGH' },
  { id: 'R-ATTRIB', text: 'This effort is supported by Qollab & IonQ', cite: 'V:1205; V:1124; Q:78', sev: 'MED' },
  { id: 'R-CREDITS', text: 'Team The Quantubians (NYU Tandon School of Engineering) — Udaya (captain), George, Harman, Epa', cite: 'OA:50', sev: 'HIGH' },
  { id: 'R-LICENSE-HOLDER', text: 'udsy19 and contributors', cite: 'OA:50; ctx Licensing', sev: 'MED' },
  { id: 'R-MIT', re: /\bMIT\b/, desc: 'MIT license named', cite: 'V:1201; CLAUDE.md Non-negotiable', sev: 'MED' },
  { id: 'R-THEME', text: 'Quantum Unlocked', cite: 'V:6; OA:47 (1)', sev: 'LOW' },
  { id: 'R-CLONE-LEARN', re: /CNOT copies a known computational-basis bit, but not an arbitrary unknown qubit/, desc: 'required clear learning text', cite: 'V:225', sev: 'MED' },
  { id: 'R-RULE-X', re: /\bX\b[^.\n]{0,20}\b(if|iff|when)\b\s*m1\s*=\s*1/, desc: 'rule stated: X if m1 = 1', cite: 'V:263; V:453; ctx Truthful physics', sev: 'HIGH' },
  { id: 'R-RULE-Z', re: /\bZ\b[^.\n]{0,20}\b(if|iff|when)\b\s*m0\s*=\s*1/, desc: 'rule stated: Z if m0 = 1', cite: 'V:263; V:453', sev: 'HIGH' },
  // all four correction choices offered (OA overseer gameplay consult 3 "UI offers all four X/Z choices").
  // Two forms satisfy it: four labelled choices, or independent X and Z switches as in the vision's
  // own layout (V:419-421 "X: [ OFF ]  Z: [ ON ]"), which give all four combinations.
  { id: 'R-CHOICES-4', anyOf: [
      [/\b(NONE|NO CORRECTION)\b/i, /\bX ONLY\b/i, /\bZ ONLY\b/i, /\bX\s*(\+|AND|&)\s*Z\b/i],
      [/\bX\s*:?\s*\[[^\]\n]*\][^\n]*\bZ\s*:?\s*\[[^\]\n]*\]/] ],
    desc: 'four X/Z choices: labelled set, or independent X and Z switches', cite: 'OA overseer rulings gameplay consult 3; V:419-421; V:427', sev: 'HIGH' },
  // bits first, corrections second (OA:41 (2)): a string that shows m0 and m1 before the X/Z controls
  { id: 'R-BITS-FIRST', re: /\bm0\b[^\n]*\bm1\b[^\n]*\bX\b[^\n]*\bZ\b/, desc: 'm0, m1 shown before the X/Z choice', cite: 'OA:41 (2); V:413-421', sev: 'HIGH' },
  // the three teach-back questions (V:286-288)
  { id: 'R-TB-Q1', re: /copy\w*[^?]{0,80}(machine|booth|duplicat)\w*[^?]{0,60}\?|(machine|booth|duplicat)\w*[^?]{0,80}cop(y|ied)\w*[^?]{0,60}\?/i, desc: 'teach-back Q1: why copying failed', cite: 'V:286', sev: 'MED' },
  { id: 'R-TB-Q2', re: /entangl\w*[^?]{0,40}(alone|by itself|on its own)[^?]{0,60}\?/i, desc: 'teach-back Q2: why entanglement alone insufficient', cite: 'V:287', sev: 'MED' },
  { id: 'R-TB-Q3', re: /classical bits[^?]{0,80}\?/i, desc: 'teach-back Q3: what the classical bits controlled', cite: 'V:288', sev: 'MED' },
];

// ---- (b) forbidden claims: a hit in a sentence with no negation is a finding ----
// Each pattern is tested per sentence. NEG lists negators; a negated hit is recorded as OK-NEGATED.
export const NEG = /\b(not|no|never|cannot|can't|can’t|isn't|isn’t|doesn't|doesn’t|don't|don’t|won't|won’t|without|nothing|neither|nor|didn't|didn’t|wasn't|wasn’t|impossible|instead of|fails? to|unable)\b/i;
// idioms stripped before the negation test: they contain a negator but negate nothing
export const NEG_IDIOMS = /\b(in no time|no[- ]cloning|no[- ]signall?ing|no[- ]go|nonetheless|not only|no doubt)\b/gi;
export const FORBIDDEN = [
  { id: 'F-FTL', cite: 'V:135; V:511; ctx Truthful physics', sev: 'HIGH',
    re: [/\b(faster[- ]than[- ]light|FTL|superluminal)\b/i,
         /\binstant\w*\b[^.]{0,40}\b(message|signal|transmi\w+|sen[dt]\w*|deliver\w*|commun\w+)\b/i,
         /\b(message|signal|transmi\w+|sen[dt]\w*|deliver\w*|commun\w+)\b[^.]{0,40}\binstant\w*\b/i,
         /\bentangl\w*\b[^.]{0,30}\b(sends?|sent|transmits?|transmitted|carr(y|ies|ied)|delivers?|delivered|beams?|signals?|messages?|tells?)\b(?![^.]{0,12}\b(possible|nothing)\b)/i,
         /\b(message|secret|signal|data|information|authori[sz]ation)\b[^.]{0,25}\b(sent|transmitted|delivered|travel\w*|flows?|went)\b[^.]{0,15}\b(through|via|by|over|down|along|across)\b[^.]{0,10}\b(the\s+)?(entangle\w*|bell\s+pair|blue\s+(link|cable)|quantum\s+(link|channel|relay|cable))/i,
         /\bspooky\b/i, /\binstant quantum message\b/i,
         /\b(pair|bell pair|entangle\w*|blue (link|cable))\b[^.]{0,20}\b(got|brought|moved|carried|took|shipped|pushed)\b[^.]{0,15}\b(token|secret|state|message|authori[sz]ation)\b/i] },
  { id: 'F-CLONE', cite: 'V:135 ("never show a second independent copy of an unknown state"); V:225', sev: 'HIGH',
    re: [/\b(cloned?|copied|duplicated|replicated)\b[^.]{0,30}\b(unknown|arbitrary|the token|the authori[sz]ation|the secret|\|ψ|ψ|the state)\b/i,
         /\b(two|second|backup|spare|extra)\s+(independent\s+)?(cop(y|ies)|clones?|replicas?|duplicates?)\b[^.]{0,30}\b(token|authori[sz]ation|secret|unknown|ψ|state)\b/i,
         /\b(still have|kept|keep)\b[^.]{0,20}\b(a\s+)?(copy|clone|original)\b[^.]{0,20}\b(token|authori[sz]ation|state|secret)\b/i,
         /\b(clone|copy)\s+(succeeded|successful|complete|ok)\b/i,
         /\b(cloned?|copied|duplicated|replicated|made an? (perfect |exact |true )?(copy|clone|duplicate) of)\b(?![^.]{0,20}\|[01]>)[^.]{0,30}\b(state|qubit|superposition|\|\+>|\|->)/i] },
  { id: 'F-RANDOM', cite: 'V:135; V:511', sev: 'HIGH',
    re: [/\bcertif\w*\b[^.]{0,20}\brandom\w*/i, /\b(true|truly|genuine|genuinely|physical(ly)?|real)\s+(quantum\s+)?random\w*/i,
         /\bquantum\s+entropy\b/i, /\bunhackable\b/i, /\bquantum\s+encryption\b/i, /\bquantum advantage\b/i,
         /\btruly quantum\b/i, /\brandom\w*\s+(is|was|are)\s+(truly |really |genuinely )?quantum\b/i] },
  { id: 'F-MATTER', cite: 'V:135 ("never conflate ... with material teleportation"); V:127', sev: 'HIGH',
    re: [/\b(teleport\w*|beam\w*)\b[^.]{0,20}\b(particle|atom|matter|person|body|rin|herself|himself|object|capsule|photon|people|you)\b/i,
         /\b(particle|photon|atom|matter|capsule|qubit itself)\b[^.]{0,20}\b(travel\w*|moved|flew|went|jump\w*|arriv\w*|crossed)\b/i,
         /\bphysical(ly)?\s+(teleport\w*|transport\w*)\b/i] },
  { id: 'F-TOKEN-REUSE', cite: 'V:267; V:505-507; CLAUDE.md "consumed ONCE"; OA overseer gameplay consult 3', sev: 'HIGH',
    re: [/\b(re-?run|retry|try again|reuse|re-?measure|replay|second attempt|another attempt|redo)\b[^.]{0,40}\b(story token|token|authori[sz]ation|live state|story state)\b/i,
         /\b(token|authori[sz]ation)\b[^.]{0,30}\b(restored|returned|refunded|reset|unconsumed|recovered at source|back in the capsule)\b/i] },
  { id: 'F-RELAY-M1', cite: 'OA:41 (1); oracle P5', sev: 'HIGH',
    re: [/\bRELAY\s+(BELL[- ]HALF\s+)?READ\s*-?OUT\b/i, /\bm1\b[^.\n]{0,25}\brelay\b/i, /\brelay\b[^.\n]{0,25}\bm1\b/i,
         /\b(remote|receiver|bob'?s?)\s+(bell[- ]half\s+)?read\s*-?out\b[^.]{0,20}\bm1\b/i] },
  { id: 'F-RAN-ON', cite: 'qollab-runtime.md; V:30; Q:49; ctx Only the overseer touches Qollab', sev: 'HIGH',
    re: [/\b(ran|run|runs|running|executed|computed|measured|verified|processed|performed|teleported)\b[^.]{0,20}\b(on|by|via|using|through)\b\s+(an?\s+|the\s+)?(ionq|qollab|real quantum|quantum (hardware|computer|processor)|qpu|trapped[- ]ion)/i,
         /\b(ionq|qollab)\b\s+(hardware|qpu|result|output|measured|confirmed|verified)/i,
         /\breal quantum (hardware|computer|device)\b/i] },
  { id: 'F-WCAG', cite: 'OA:47 (2) "targets WCAG 2.2 AA" only for checks actually run', sev: 'MED',
    re: [/\bWCAG\b/i, /\b(fully|100%)\s+accessible\b/i, /\baccessib\w*\s+(compliant|certified|compliance)\b/i, /\bADA\b/] },
  { id: 'F-EYE', cite: 'V:135 ("never frame measurement as a literal human eye looking at a particle")', sev: 'MED',
    re: [/\b(look(s|ing|ed)?\s+at|watch(es|ing|ed)?|observ\w+|see(s|ing)?|eyes?)\b[^.]{0,25}\b(particle|qubit|photon|state)\b[^.]{0,25}\b(collaps\w+|chang\w+|destroy\w+|break\w*|disturb\w*)/i,
         /\b(by|just)\s+(looking|observing|watching)\b/i, /\bact of (looking|observ\w+|seeing)\b/i] },
  { id: 'F-NOCLONE-OVERREACH', cite: 'V:135 ("avoid saying the no-cloning theorem prevents storage, authentication, or all forms of copying classical information")', sev: 'MED',
    re: [/\bno[- ]cloning\b[^.]{0,80}\b(storage|store|stored|authenticat\w*|classical (data|information|bits?|files?)|any (copy|copying)|all (copy|copying|copies)|every copy)/i,
         /\b(can'?t|cannot|never)\s+(be\s+)?(cop(y|ied)|clone\w*|duplicat\w*)\s+(any|anything|data|information|classical)\b/i] },
  { id: 'F-DEFERRED-REMOTE', cite: 'V:503 (deferred circuit "must not be displayed as remote quantum controls")', sev: 'MED',
    re: [/\b(coherent|quantum)\s+(controlled\s+)?(correction|control)s?\b[^.]{0,30}\b(remote|across|between stations|over the link|to the receiver)\b/i,
         /\b(CX|CZ|CNOT)\b[^.]{0,30}\b(across the city|to the vault|to the remote|over the link)\b/i] },
  { id: 'F-ONE-SHOT', cite: 'V:489 ("do not pretend one shot proves accuracy"); V:510', sev: 'MED',
    re: [/\b(one|single|a)\s+(shot|measurement|run)\b[^.]{0,20}\b(proves?|confirms?|guarantees?|certif\w+)\b/i] },
  { id: 'F-ZBASIS-COPIES', cite: 'V:404 (replace "two copies in Z basis" with "two basis values matched")', sev: 'LOW',
    re: [/\btwo copies in z basis\b/i] },
  { id: 'F-RECEIVER-SAMPLED', cite: 'OA:41 (4) "exact partial_trace probabilities only ... no sampled counts there"', sev: 'HIGH',
    re: [/\breceiver\b[^.\n]{0,40}\b(shots?|counts?|sampled|samples)\b/i, /\b(shots?|counts?|sampled)\b[^.\n]{0,40}\breceiver\b/i] },
  { id: 'F-PLACEHOLDER', cite: 'CLAUDE.md "should not expose broken unfinished experiences in public build"; V:1202', sev: 'MED', nonegate: true,
    re: [/\bTODO|FIXME|\bTBD\b|lorem ipsum|\bplaceholder\b/i] },
  { id: 'F-EMAIL', cite: 'OA:50 ("Never include anyone\'s email")', sev: 'HIGH', nonegate: true,
    re: [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/] },
];

// ---- (c) correctness rules on the X/Z rule and endianness ----
// A rule sentence that binds X to m0 or Z to m1 is a swap (V:453). Endianness: Qiskit key order is
// highest clbit first, so key '01' means m0=1, m1=0 (evidence/red-team/physics-oracle/out/endianness_table.txt).
export const RULE_SWAP = [
  /\bX\b(?:(?!m[01])[^.,;\n]){0,20}\b(if|iff|when|on)\b\s*m0\b/,
  /\bZ\b(?:(?!m[01])[^.,;\n]){0,20}\b(if|iff|when|on)\b\s*m1\b/,
  /\bm0\b\s*(=\s*1)?\s*(→|->|=>|means|controls|selects|triggers|sets)\s*(apply\s+)?X\b/i,
  /\bm1\b\s*(=\s*1)?\s*(→|->|=>|means|controls|selects|triggers|sets)\s*(apply\s+)?Z\b/i,
];
// raw 2-bit key shown next to a bit word with no explicit m0/m1 naming (V:454 "always label bits explicitly")
export const RAW_KEY = /(\bbits?\b|\breadout\b|\bkey\b|\bresult\b)[^.\n]{0,15}['"`]?\b[01]{2}\b['"`]?/i;

// ---- (d) teach-back answers must carry the three truths in plain words (V:286-290; V:225; V:241; V:263) ----
export const TEACHBACK_TRUTHS = [
  { id: 'TB-A1-NOCLONE', cite: 'V:286; V:225; V:458', all: [/\b(unknown|arbitrary|superposition)\b/i, /\b(cop(y|ied|ies)|clone|duplicat\w*)\b/i, NEG], },
  { id: 'TB-A2-NOSIGNAL', cite: 'V:287; V:237; V:241', all: [/\b(random|50\s*%|50\/50|correlat\w*|same)\b/i, /\b(message|signal|information|classical)\b/i, NEG] },
  { id: 'TB-A3-BITS', cite: 'V:288; V:263; V:453', all: [/\b(correction|correct|fix|X)\b/i, /\b(Z)\b/, /\b(two|2|m0|m1|bits?)\b/i] },
];

// ---- byte census: allowed non-ASCII (with reason); everything else is reported ----
export const ALLOWED_NONASCII = {
  0x2014: 'em dash (owner credit string uses it)', 0x2013: 'en dash', 0x2018: 'left single quote', 0x2019: 'right single quote / apostrophe',
  0x201C: 'left double quote', 0x201D: 'right double quote', 0x2026: 'ellipsis', 0x27E8: 'ket left ⟨', 0x27E9: 'ket right ⟩',
  0x03C8: 'psi ψ (standalone)', 0x03B1: 'alpha', 0x03B2: 'beta', 0x221A: 'sqrt', 0x00B7: 'middle dot', 0x2192: 'right arrow',
  0x2190: 'left arrow', 0x2265: '≥', 0x2264: '≤', 0x00B1: '±', 0x2297: '⊗', 0x2248: '≈', 0x00D7: '×', 0x2022: 'bullet',
  0x25B6: '▶', 0x25B8: '▸', 0x2191: '↑', 0x2193: '↓', 0x00B2: '²', 0x2502: 'box line', 0x2500: 'box line', 0x00BD: '½', 0x03C0: 'pi',
};
// confusables that must never appear (law 13a): hyphen lookalikes, invisible chars, Latin-lookalike letters
export const CONFUSABLE_RANGES = [
  [0x2010, 0x2012, 'hyphen lookalike'], [0x2212, 0x2212, 'minus sign'], [0x00AD, 0x00AD, 'soft hyphen'], [0xFE58, 0xFE58, 'small em dash'],
  [0xFE63, 0xFE63, 'small hyphen'], [0xFF0D, 0xFF0D, 'fullwidth hyphen'], [0x00A0, 0x00A0, 'no-break space'], [0x200B, 0x200F, 'zero-width / bidi'],
  [0x202A, 0x202E, 'bidi override'], [0x2060, 0x2064, 'invisible operator'], [0xFEFF, 0xFEFF, 'BOM / ZWNBSP'], [0x0400, 0x04FF, 'Cyrillic letter'],
  [0xFF01, 0xFF5E, 'fullwidth ASCII'], [0x2000, 0x200A, 'typographic space'],
];
