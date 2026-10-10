| # | file:line | string | rule | why | doc | owner | sev |
|---|---|---|---|---|---|---|---|
| 1 | (absent):0 | LOCAL BELL-HALF READOUT m1 | MISSING R-M1-LABEL | required string not found in any scanned literal (exact bytes) | OA:41 (1); V:417 | story-ui | HIGH |
| 2 | (absent):0 | Mission 2 receiver panel labelled EXACT | MISSING R-EXACT | required string not found in any scanned literal (exact bytes) | OA:41 (4) | story-ui | HIGH |
| 3 | (absent):0 | Team The Quantubians (NYU Tandon School of Engineering) — Udaya (captain), George, Harman, Epa | MISSING R-CREDITS | required string not found in any scanned literal (exact bytes) | OA:50 | story-ui | HIGH |
| 4 | (absent):0 | rule stated: X if m1 = 1 | MISSING R-RULE-X | required string not found in any scanned literal (exact bytes) | V:263; V:453; ctx Truthful physics | story-ui | HIGH |
| 5 | (absent):0 | rule stated: Z if m0 = 1 | MISSING R-RULE-Z | required string not found in any scanned literal (exact bytes) | V:263; V:453 | story-ui | HIGH |
| 6 | (absent):0 | four X/Z choices: labelled set, or independent X and Z switches | MISSING R-CHOICES-4 | required string not found in any scanned literal (exact bytes) | OA overseer rulings gameplay consult 3; V:419-421; V:427 | story-ui | HIGH |
| 7 | (absent):0 | m0, m1 shown before the X/Z choice | MISSING R-BITS-FIRST | required string not found in any scanned literal (exact bytes) | OA:41 (2); V:413-421 | story-ui | HIGH |
| 8 | echo/data/story.js:2 | RELAY READOUT m1 | F-RELAY-M1 | matches /\bRELAY\s+(BELL[- ]HALF\s+)?READ\s*-?OUT\b/i | OA:41 (1); oracle P5 | story-ui | HIGH |
| 9 | echo/data/story.js:2 | Receiver counts: 129 / 127 shots | F-RECEIVER-SAMPLED | matches /\breceiver\b[^.\n]{0,40}\b(shots?\|counts?\|sampled\|samples)\b/i | OA:41 (4) "exact partial_trace probabilities only ... no sampled counts there" | story-ui | HIGH |
| 10 | echo/data/story.js:3 | Apply X if m0 = 1. | C-RULE-SWAP | X bound to m0 or Z bound to m1: /\bX\b(?:(?!m[01])[^.,;\n]){0,20}\b(if\|iff\|when\|on)\b\s*m0\b/ | V:453; V:263 | story-ui | HIGH |
| 11 | echo/data/story.js:3 | Apply Z if m1 = 1. | C-RULE-SWAP | X bound to m0 or Z bound to m1: /\bZ\b(?:(?!m[01])[^.,;\n]){0,20}\b(if\|iff\|when\|on)\b\s*m1\b/ | V:453; V:263 | story-ui | HIGH |
| 12 | echo/data/story.js:4 | The entanglement sends the secret instantly. | F-FTL | matches /\b(message\|signal\|transmi\w+\|sen[dt]\w*\|deliver\w*\|commun\w+)\b[^.]{0,40}\binstant\w*\b/i | V:135; V:511; ctx Truthful physics | story-ui | HIGH |
| 13 | echo/data/story.js:4 | You cloned the unknown state! | F-CLONE | matches /\b(cloned?\|copied\|duplicated\|replicated)\b[^.]{0,30}\b(unknown\|arbitrary\|the token\|the authori[sz]ation\|the secret\|\\|ψ\|ψ\|the state)\b/i | V:135 ("never show a second independent copy of an unknown state"); V:225 | story-ui | HIGH |
| 14 | echo/data/story.js:5 | Certified quantum random bits. | F-RANDOM | matches /\bcertif\w*\b[^.]{0,20}\brandom\w*/i | V:135; V:511 | story-ui | HIGH |
| 15 | echo/data/story.js:5 | The particle travelled across the city. | F-MATTER | matches /\b(particle\|photon\|atom\|matter\|capsule\|qubit itself)\b[^.]{0,20}\b(travel\w*\|moved\|flew\|went\|jump\w*\|arriv\w*\|crossed)\b/i | V:135 ("never conflate ... with material teleportation"); V:127 | story-ui | HIGH |
| 16 | echo/data/story.js:6 | Retry the story token as often as you like. | F-TOKEN-REUSE | matches /\b(re-?run\|retry\|try again\|reuse\|re-?measure\|replay\|second attempt\|another attempt\|redo)\b[^.]{0,40}\b(story token\|token\|authori[sz]ation\|live state\|story state)\b/i | V:267; V:505-507; CLAUDE.md "consumed ONCE"; OA overseer gameplay consult 3 | story-ui | HIGH |
| 17 | echo/data/story.js:6 | Verified on IonQ hardware. | F-RAN-ON | matches /\b(ran\|run\|runs\|running\|executed\|computed\|measured\|verified\|processed\|performed\|teleported)\b[^.]{0,20}\b(on\|by\|via\|using\|through)\b\s+(an?\s+\|the\s+)?(ionq\|qollab\|real quantum\|quantum (hardware\|computer\|processor)\|qpu\|trapped[- ]ion)/i | qollab-runtime.md; V:30; Q:49; ctx Only the overseer touches Qollab | story-ui | HIGH |
| 18 | echo/data/story.js:7 | Contact udaya@example.com | F-EMAIL | matches /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/ | OA:50 ("Never include anyone's email") | story-ui | HIGH |
| 19 | echo/data/story.js:8 | 'Team The Quantubians (NYU Tandon School of Engineering) ‐ Udaya (captain), George, Harman, Epa', | HOMOGLYPH | CONFUSABLE hyphen lookalike U+2010 | gate-independence law 13a; exact owner strings OA:41, OA:50 | story-ui | HIGH |
| 20 | echo/data/story.js:9 | 'LOCAL BELL‐HALF READOUT m1', | HOMOGLYPH | CONFUSABLE hyphen lookalike U+2010 | gate-independence law 13a; exact owner strings OA:41, OA:50 | story-ui | HIGH |
| 21 | echo/ui/hud.js:1 | export const x = "Ехасt"; | HOMOGLYPH | CONFUSABLE Cyrillic letter U+415 | gate-independence law 13a; exact owner strings OA:41, OA:50 | story-ui | HIGH |
| 22 | echo/ui/hud.js:1 | export const x = "Ехасt"; | HOMOGLYPH | CONFUSABLE Cyrillic letter U+445 | gate-independence law 13a; exact owner strings OA:41, OA:50 | story-ui | HIGH |
| 23 | echo/ui/hud.js:1 | export const x = "Ехасt"; | HOMOGLYPH | CONFUSABLE Cyrillic letter U+430 | gate-independence law 13a; exact owner strings OA:41, OA:50 | story-ui | HIGH |
| 24 | echo/ui/hud.js:1 | export const x = "Ехасt"; | HOMOGLYPH | CONFUSABLE Cyrillic letter U+441 | gate-independence law 13a; exact owner strings OA:41, OA:50 | story-ui | HIGH |
| 25 | (absent):0 | This effort is supported by Qollab & IonQ | MISSING R-ATTRIB | required string not found in any scanned literal (exact bytes) | V:1205; V:1124; Q:78 | story-ui | MED |
| 26 | (absent):0 | udsy19 and contributors | MISSING R-LICENSE-HOLDER | required string not found in any scanned literal (exact bytes) | OA:50; ctx Licensing | story-ui | MED |
| 27 | (absent):0 | MIT license named | MISSING R-MIT | required string not found in any scanned literal (exact bytes) | V:1201; CLAUDE.md Non-negotiable | story-ui | MED |
| 28 | (absent):0 | required clear learning text | MISSING R-CLONE-LEARN | required string not found in any scanned literal (exact bytes) | V:225 | story-ui | MED |
| 29 | (absent):0 | teach-back Q1: why copying failed | MISSING R-TB-Q1 | required string not found in any scanned literal (exact bytes) | V:286 | story-ui | MED |
| 30 | (absent):0 | teach-back Q2: why entanglement alone insufficient | MISSING R-TB-Q2 | required string not found in any scanned literal (exact bytes) | V:287 | story-ui | MED |
| 31 | (absent):0 | teach-back Q3: what the classical bits controlled | MISSING R-TB-Q3 | required string not found in any scanned literal (exact bytes) | V:288 | story-ui | MED |
| 32 | (question absent):0 | TB-A1-NOCLONE | MISSING TB-A1-NOCLONE | no answer literal after the question carries all the truth markers | V:286; V:225; V:458 | story-ui | MED |
| 33 | (question absent):0 | TB-A2-NOSIGNAL | MISSING TB-A2-NOSIGNAL | no answer literal after the question carries all the truth markers | V:287; V:237; V:241 | story-ui | MED |
| 34 | (question absent):0 | TB-A3-BITS | MISSING TB-A3-BITS | no answer literal after the question carries all the truth markers | V:288; V:263; V:453 | story-ui | MED |
| 35 | echo/data/story.js:3 | Result key 01 | C-RAW-KEY | asymmetric raw key, no m0/m1 naming: Qiskit key order is m1 m0 (physics-oracle/out/endianness_table.txt) | V:454; V:428 | story-ui | MED |
| 36 | echo/data/story.js:7 | This game is WCAG 2.2 AA compliant. | F-WCAG | matches /\bWCAG\b/i | OA:47 (2) "targets WCAG 2.2 AA" only for checks actually run | story-ui | MED |
| 37 | (absent):0 | Quantum Unlocked | MISSING R-THEME | required string not found in any scanned literal (exact bytes) | V:6; OA:47 (1) | story-ui | LOW |
