---
type: report
status: current
date: 2026-10-10
owner: red-team
---

# Player-text audit: does every word ECHO shows tell the truth?

**Audited:** story-ui `lane/story-ui/integration` @ `320613e`, scoped to `echo/data` + `echo/ui` + `echo/main.css`.

**Evidence:** `evidence/red-team/player-text-audit/`, reproduced by `bash reproduce.sh`. Citations: V = `ECHO_MASTER_VISION.md` line; OA = `lanes/red-team/owner-answers.md` line.

## Verdict
**No physics falsehood was found in that scope**, by checker or by eye, except quoted misconceptions that are refuted in the adjacent line. The following were all absent from `echo/data`+`echo/ui`@320613e:
- an FTL or entanglement-alone message;
- a copied unknown state;
- "certified random";
- matter teleportation;
- token reuse;
- "RELAY READOUT";
- a claim that anything ran on IonQ or Qollab;
- a WCAG claim;
- an email address;
- a homoglyph.

The rule appears as "X if m1 = 1, Z if m0 = 1" everywhere it is stated, with no swap. Endianness wording is the same as the oracle's `endianness_table.txt`: the bits are always named m0 and m1. The only raw key is the symmetric "00".

Story-ui claims its 16 failure lines are branch-true. **An independent Qiskit check confirms it: 16/16** (`out/branch_truth.md`). The check's own sabotage goes red.

## Findings (owner: story-ui unless noted)
| # | sev | where | finding | doc |
|---|---|---|---|---|
| T1 | HIGH | objectives.js:241 | The Mission 2 receiver panel is "RECEIVER-ONLY DATA", with no EXACT label. | OA:41 (4) |
| T2 | HIGH | menu.js:107, accessibility.js:12, main.css:298 | A "Subtitles" on/off setting exists, and Off sets `display:none` on all dialogue, which has no voice-over. There is no caption-style setting. | OA:41 "Captions are always on; the setting is caption style"; V:436 |
| T3 | HIGH | — (coverage) | No UI renders the terminals, Declassified, teach-back or credits at 320613e. `ui/terminal.js` is named at objectives.js:218 but absent. EXACT, four X/Z choices, bits-before-choice and credits are verified as **data only**, never on screen. | V:350-358 |
| T4 | HIGH (exactness) | teachback.js:111 | The credits read "…Engineering): Udaya…". The ruled line is "…Engineering) — Udaya…". Story-ui's own credits check matches only "Harman, Epa", so it is calibrated on its own wording (law 4). | OA:50 |
| T5 | MED | teachback.js:115 | The shipped credits contain "TODO_OWNER: third-party assets…". | CLAUDE.md; V:1202 |
| T6 | MED ×3 | teachback.js:46, 65, 92 | Voiced misconceptions. Line 46 is nearly V:135's banned sentence ("entanglement transmits the secret instantly"). Each is refuted in its `why`, but no renderer exists to show it framed as a myth. | V:135 vs V:283 |
| T7 | MED (UX) | objectives.js:263 | "Receiver test fidelity" is never explained in plain words. A first-time player sees 0.673960 with no "1 = perfect match". | V:433 |
| T8 | INFO→integration | objectives.js:173-177 | `TELEPORT_FAILURE_CASES` keys are `m0m1`, the reverse of the Qiskit counts-key order (`m1m0`). Read in Qiskit order, 8/16 cases show false lines (`out/branch_truth_sabotage.md`). The key must be built from `measurementBits`, never from a counts key. | V:454 |
| T9 | LOW | objectives.js:258-259 | The m0/m1 labels are a second copy of `contracts.js:338 BIT_LABELS`. Story-ui imports nothing from contracts (no-bloat drift on an owner-ruled string). | no-bloat; OA:41 |
| T10 | LOW | objectives.js:162, story.js:161 | "bits are not 00" and "00 needs no fix" are unlabeled. They are symmetric, so endianness does not matter. Suggested wording: "where m0 or m1 is 1". | V:454 |
| T11 | LOW (UX) | story.js:92-93, teachback.js:43 | Only I and X are explained in the compared logs. A player who picks Z sees logs that "always match", with no line saying why. | V:476 |
| T12 | LOW (UX) | objectives.js:134 vs hud.js:103 | The hint says "STATE PRESENT"; the capsule HUD shows "Q-SOURCE: PRESERVED". | — |
| T13 | LOW (UX) | story.js:118 | "You choose its fix": the antecedent of "its" is unclear. | — |
| T14 | LOW (UX) | objectives.js:184 vs story.js:30 | The countdown is called both "GRID SHUTDOWN" and "grid isolation". | — |
| T15 | LOW | — | The theme "Quantum Unlocked" is not in-game. It may belong only on the page. | V:6; OA:47 |

## Story-ui's 4 old nulls
The 4 nulls are signalling verbs outside the list, a claim excused by an unrelated "no", a clone claim in other words, and randomness in other words.
- **They are real gaps in story-ui's gate.**
- **They are not live defects in the text:** none of those claim classes occurs in data/ui@320613e by eye or by this checker.
- This checker flags all 4 strings, but its paraphrase patterns for them were written after reading story-ui's sabotage file. Those rows are not independent.

## Nulls of this checker (demonstrated, `out/known_nulls.md`)
Each of these five false lines produced 0 findings:
- "Nothing stops the pair sending the secret instantly." (excused by the negator "Nothing")
- "Rin's capsule now sits in the vault."
- "The vault now holds the token, and so does Rin."
- "Both bits were set by the receiver."
- "Apply the X fix when the source bit is 1." (a rule swap without m0/m1 names)

A regex gate cannot replace the by-eye read; both were done here.

The first sabotage pass had 7 nulls:
- **3 checker gaps, fixed:** a negator excused a no-cloning over-reach; bits-first was satisfied by the Declassified gates line; teach-back truths were graded anywhere in the file.
- **4 harness defects, fixed.**

## Related
[[Reports/physics-oracle-audit]] (P2, P5), [[Reports/quest-state-audit]], [[Research/judging-rubric]]
