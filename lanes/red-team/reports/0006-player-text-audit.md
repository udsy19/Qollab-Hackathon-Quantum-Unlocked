## TL;DR
- **Physics wording is clean in scope.** No FTL, copied unknown state, "certified random", matter teleportation, token reuse, "RELAY READOUT", ran-on-IonQ/Qollab, WCAG claim, email or homoglyph was found in story-ui `echo/data`+`echo/ui`+`main.css` @320613e. The only exception is three quoted misconceptions, each refuted in the next line. The rule reads X if m1=1, Z if m0=1 everywhere it is stated.
- **Branch truth confirmed.** Story-ui's claim that its 16 teleport failure lines are true in every branch passes an independent Qiskit check: 16/16 (`out/branch_truth.md`). The check goes red when sabotaged.
- **4 HIGH findings for story-ui:**
  - T1: the Mission 2 receiver panel has no EXACT label.
  - T2: a "Subtitles" Off setting hides all dialogue (`main.css:298`), against "captions always on".
  - T3: no UI renders the terminals, Declassified, teach-back or credits yet, so those strings are verified as data only.
  - T4: the credits use ":" where the ruled line has " — ".
- **MED:** a TODO_OWNER line in the credits; 3 voiced misconceptions (teachback.js:46 is nearly V:135's banned sentence); "fidelity" is never explained to the player.
- **Integration hazard:** the failure-case keys are `m0m1`, the reverse of Qiskit's key order. Read in Qiskit order, 8/16 cases show false lines.
- **Reproduce:** `bash evidence/red-team/player-text-audit/reproduce.sh` gives good fixture 0, bad 37, baseline 9 (3/4/2), sabotage 58/58, branch truth 16/16.
- **Story-ui's 4 old nulls** are real gaps in its gate, but no live defect at 320613e. This checker has 5 demonstrated nulls of its own (`out/known_nulls.md`).
- **Recommend:** relay T1–T5 to story-ui as a fix brief. Gate story-ui's terminal UI on screenshots of the EXACT panel, the X/Z switches and the credits.

## Vault check
- **Read:**
  - `vault/AGENTS.md`;
  - `vault/Reports/physics-oracle-audit.md` (rows 7, 14, 28, 31, proposals P2/P5) and `quest-state-audit.md` (Q1–Q11);
  - `vault/Research/judging-rubric.md` §2 and §7;
  - story-ui's `vault/Reports/story-data-script-gate.md` on 320613e;
  - `lanes/red-team/{context,rulings,owner-answers}.md`;
  - `ECHO_MASTER_VISION.md` §2.4, §4, §6, §7, §9.1, §10.6 and §15.
- **Reused:**
  - the oracle's `endianness_table.txt` (key '01' = m0=1, m1=0), as the endianness ground truth;
  - P2 and P5 as owner rulings (OA:41);
  - the quest-state-audit layout for reproduce.sh.
- **Already known:** story-ui reported 4 phrase-gate nulls and a 16-case branch-truth gate.
- **Stale or wrong:**
  - Story-ui's report says the credits are "ruled", but the line differs from OA:50 by its punctuation (T4).
  - Its credits sabotage only mutates "Epa", so its check is calibrated on its own wording.
  - Vision V:261 still says "RELAY READOUT m1". The owner superseded it (OA:41), but the vision doc itself is unchanged. That doc is owner-only, so the update is proposed here, not made.

## What I found
Full table with doc citations: `vault/Reports/player-text-audit.md`. Raw checker output: `evidence/red-team/player-text-audit/out/baseline-320613e/findings.md`.

**story-ui:**
- T1 HIGH, objectives.js:241. The receiver panel is "RECEIVER-ONLY DATA", with no "EXACT" label. OA:41 (4).
- T2 HIGH, menu.js:107, accessibility.js:12, main.css:298. The Subtitles toggle hides dialogue with `display:none`. OA:41 says captions are always on and the setting is caption style (standard / high-contrast). V:436.
- T3 HIGH, coverage. At 320613e there is no `ui/terminal.js` (it is named at objectives.js:218), and no Declassified, teach-back or credits renderer. The four X/Z choices (as two switches in `planRowTemplate`, matching V:419-421), bits-before-choice, EXACT and credits are verified as **data only**.
- T4 HIGH (exactness), teachback.js:111. The credits use ":" where OA:50 has "—".
- T5 MED, teachback.js:115. "TODO_OWNER" ships in the credits.
- T6 MED ×3, teachback.js:46, 65, 92. Voiced misconceptions. Each is refuted next to it; the checker validates that the following `why` negates the claim. They need a visible "MYTH" framing, which cannot be checked without a renderer. Suggest rewording line 46 away from V:135's literal banned sentence.
- T7 MED UX, objectives.js:263. "Receiver test fidelity" has no plain-words gloss.
- T9–T15 LOW:
  - T9: the m0/m1 labels duplicate `contracts.js:338 BIT_LABELS`, which story-ui does not import.
  - T10: "bits are not 00" and "00 needs no fix" are unlabeled.
  - T11: the Z case is never explained in the compared logs.
  - T12: "STATE PRESENT" vs "Q-SOURCE: PRESERVED".
  - T13: "its fix" is ambiguous.
  - T14: GRID SHUTDOWN vs grid isolation.
  - T15: the theme is not in-game.

**Integration (story-ui terminal and gameplay):**
- T8. `TELEPORT_FAILURE_CASES` keys are `m0m1:XZ`. Qiskit counts keys are `m1m0`. Built from a counts key, 8/16 cases show false lines (`out/branch_truth_sabotage.md`). Build the key from `measurementBits.m0/.m1`.

**Other lanes (scanned with the same checker; forbidden-claim rules only):**
- gameplay `7c4741b`, quantum `f7efb92` and platform `b385c06` (JS/HTML only): no forbidden claim.
- One LOW: missionRules.js:69 "bits 00".
- Platform `contracts.js:338` already holds the ruled bit labels.
- Python strings were grepped, not graded.

**By eye, physics:** I read all 554 lines of data and 649 of ui:
- Every vision-verbatim line, every journal and Declassified line, and every hint, failure line and teach-back answer is true.
- The deferred-measurement note (teachback.js:63) matches V:503.
- "50/50 in every basis" (story.js:55) is true, because the reduced state is I/2.
- The three teach-back answers state the three truths in plain words.

## Commits (branch lane/red-team/player-text-audit)
- f986827: expected set and checker; red on the bad fixture, green on the good one; baseline.
- 7bf3b86: sabotage round 58/58, Qiskit branch truth, reproduce.sh.
- cf53c2b: known nulls, README, vault report.

## Evidence
- `evidence/red-team/player-text-audit/`: `expected.mjs`, `check.mjs`, `sabotage.mjs`, `branch_truth.py`, `reproduce.sh`, `README.md`, `fixtures/`.
- `out/`: `baseline-320613e/{findings.md,findings.json,census.tsv,strings.tsv,negated_ok.tsv}`, `sabotage.md`, `branch_truth.md`, `branch_truth_sabotage.md`, `known_nulls.md`, `bad-fixture/`.
- `vault/Reports/player-text-audit.md`.

## Nulls
- **First sabotage pass: 7 nulls.**
  - 3 were checker gaps, now fixed: a negator excused a no-cloning over-reach; R-BITS-FIRST was satisfied by the Declassified gates line; teach-back truths were graded anywhere in the file instead of after the question.
  - 4 were harness defects, now fixed: rule deletions missed "X on q2 if m1 = 1"; a raw-key case replaced an already-flagged line.
- **Final pass:** 58/58. Every check went red, or green on repair, at least once. Both enabling-step cases are refused with exit 2.
- **Demonstrated live nulls, each 0 findings** (`out/known_nulls.md`):
  - "Nothing stops the pair sending the secret instantly." (excused by a negator)
  - "Rin's capsule now sits in the vault."
  - "The vault now holds the token, and so does Rin."
  - "Both bits were set by the receiver."
  - "Apply the X fix when the source bit is 1."
- **Provenance:** 4 paraphrase patterns were added after reading story-ui's null strings, so sabotage rows 3, 4, 7 and 10 are not independent evidence.

## What I did NOT do or could not verify
- No screenshots. Nothing renders the terminals, Declassified, teach-back or credits at 320613e (T3), so no on-screen claim is made.
- Text composed at runtime, or split across concatenation, is not graded. Neither are Python-emitted labels in quantum's files (grepped only).
- The README and Qollab page text are outside this export and were not audited; that is where the attribution, MIT and theme matter most.
- Severity is my reading. T4 could reasonably be MED, since only the punctuation differs.

## Decisions inferred from the docs
- **Four X/Z choices:** two independent switches count, because the vision's own layout uses them (V:419-421).
- **Voiced misconceptions** are MED, not HIGH, when the next literal refutes them. V:283 requires a "misconception corrected"; V:135 bans the sentence. I read the two together as "quote only when framed and refuted". If the owner reads V:135 literally, T6 becomes HIGH.
- **"00"** is LOW: a symmetric key carries no endianness hazard (oracle table).
- **The attribution, theme and MIT** were required in-game per the brief. The attribution appears twice (menu.js:58, teachback.js:112) and MIT once; the theme is absent (LOW, see T15).

## What the supervisor should do next
1. Send story-ui a fix brief:
   - T1: an EXACT label;
   - T2: replace the Subtitles toggle with a caption style setting (standard / high-contrast), captions always visible;
   - T4: the em dash;
   - T5: remove the TODO;
   - T6: a MYTH framing, and reword line 46;
   - T7: a fidelity gloss;
   - T9: import BIT_LABELS.
2. Before the terminal UI lands (T3), require a screenshot set: the EXACT receiver panel, the bits shown before the X/Z switches with all four combinations reachable, a failure line, the credits screen and the teach-back. Require that T8's key is built from `measurementBits`.
3. Re-run `reproduce.sh <new story-ui ref>` after the fixes. Expected: T1, T2, T4 and T5 go green.
4. Optional proposal to the owner: change V:261 "RELAY READOUT m1" to match OA:41, so the vision doc stops contradicting the ruling.
