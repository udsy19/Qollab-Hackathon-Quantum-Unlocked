## TL;DR
- **DONE and verified in the local harness:** Declassified mode is built and works by keyboard. It has the run journal, the 3 §4.5 tabs, the teach-back (3 questions, every choice shows its "why", no score) and the credits. Esc closes it and never opens pause.
- **Gate:** `node evidence/story-ui/declassified/drive.mjs` → 61/61, exit 0, provenance `e6fa20da62c9`. I recomputed that hash with `cat echo/main.css echo/ui/accessibility.js echo/ui/menu.js echo/ui/declassified.js echo/data/teachback.js | shasum -a 256` and got the same `e6fa20da62c9`. The gate was written first: 51/59 red on a skeleton.
- **Sabotage:** 17 mutations on disposable copies → 14 red, 3 nulls. All 3 nulls were predicted (`03-sabotage.md`).
- **accesslint** (@accesslint/core 0.21.0, every tab, 100% and 200%): 0 violations inside the dialog. The positive control fires.
- **Renders:** `renders/declassified/` has 11 PNGs; I read each one myself. Kets show ⟩, nothing breaks mid-sentence, credits match the ruling exactly, and every journal number sits in an engine-labelled group.
- **The credits still show a `TODO_OWNER` assets line from the data** (see Not done).
- **Recommend:** merge `lane/story-ui/declassified` into the lane. Hand platform the run-record contract request and the `CREDITS` exit-edge request.

## Vault check
- **Read:** `vault/AGENTS.md` (hook), `vault/Index.md` (grep: nothing on Declassified, journal or teach-back), `vault/Reports/story-ui-ui-shell-harness.md`, `vault/Reports/story-data-script-gate.md`, `lanes/story-ui/context.md`, `echo/CONTRACTS.md`, `echo/contracts.js`, ECHO_MASTER_VISION §4.5, §6.1–6.6, §7.1, §8.4 (EngineKind), `evidence/story-ui/harness/{shell.html,shell.js,drive.mjs}`, `evidence/story-ui/story-data/check.mjs`.
- **Already known and reused:**
  - The `visibility 0s` show/hide pattern (ui-shell report).
  - `trapTab`, `el` and the settings data attributes from `accessibility.js`; `menu.setPauseAllowed`.
  - The harness pattern and provenance badge (forked into `declassified.html/js`; reason: a different module under test and file list).
  - From the contracts: `validateExperimentResult`, `marginalProbabilities`, `BIT_LABELS`, `expectedCorrections`, `makeCorrectionRequest`, `dryRunVerdict`. The journal does not re-implement any of them.
  - The ui-shell lesson "accesslint caches": it applies to the core engine too (below).
- **Searched before writing:** `where.mjs mountDeclassified --branches` found nothing anywhere. No ket-display helper exists on any story-ui branch (`git grep ⟩` across them), so I added `displayKets` to `accessibility.js`.
- **Stale:** none of the notes I read. `vault/Reports/README.md` and `vault/Map.md` are stale only because I added a report; I did not regenerate them, per the rules.

## What I found
- In the first renders, system monospace drew the ket bracket ⟩ almost like ")", so `|0⟩` read `|0)` even with the right bytes. Fix: anything that can hold a ket now uses the proportional font with tabular figures. The gate cannot see glyph shapes, so this is a human-read item.
- `{ '00', '11' }` displayed "11" first, because integer-like keys reorder. The keys are now sorted.
- The rule label wrapped mid-formula ("Z if m0 = / 1)"). Fixed with no-break spaces in the data and a wider label column.
- **Physics, read against all 4 bit pairs:**
  - The Transfer tab said the receiver's half was the source state "up to a known flip, which the bits undid". That is false for 00 (no flip) and loose for 11 (two flips).
  - It now reads: "up to a known correction (none, X, Z, or X and Z), and the two bits said which one to apply."
  - Every other line holds in every branch: Copy, Connection, Transfer, the 9 teach-back whys and the journal labels. In particular, "X if m1 = 1, Z if m0 = 1", "Two bits pick one of four fixes", and "Receiver alone 50/50 for I, X and Z" are all true.
  - The journal's rule line is checked by the gate for 00, 01, 10 and 11 (no correction / X / Z / X then Z), typed from §7.1. It is not read from contracts.js.
- accesslint 0.21.0 caches between runs and names a dialog from its content, so `aria-dialog-name` cannot catch a nameless dialog that has text in it. I verified this with a probe page. Its findings are in `vault/Reports/story-ui-declassified.md`.

## What I changed (branch `lane/story-ui/declassified`)
- `9e46d06`: gate first (red 51/59 on a skeleton), harness, journal and UI copy, owner credits line.
- `65f6914`: `echo/ui/declassified.js` and the `/* ==== declassified ==== */` CSS. Gate green 58/58.
- `0d94e75`: no mid-formula wrap; a scrolled journal render; the gate waits for port 8771.
- `11d1953`: sabotage harness, accesslint with a positive control, de-flaked keyboard-scroll check.
- `3ea2cca`: all-4-branch journal check, branch-true Transfer wording, Declassified copy added to the story-data gate (red on a stripped copy with 7 failures, green on the real data).
- `fea5366`: evidence README, final sabotage table, vault report.

**Data edits** (`echo/data/teachback.js`; data-fixes is editing `echo/data/` concurrently):
- The team credits line is byte-identical to data-fixes' edit.
- One Transfer sentence was reworded.
- `RUN_JOURNAL` and `DECLASSIFIED_UI` were appended.
- `git merge-tree HEAD lane/story-ui/data-fixes` merges clean.

**Run-record shape** (a guarded JS shape documented in `declassified.js`):
`{ clone: ExperimentResult[], relay: ExperimentResult[], dryRuns: {bits, result}[], commit: ExperimentResult, backend: ExperimentResult }`.
Every entry is validated. An invalid entry shows "not recorded (the result failed its contract check)"; an absent one shows "not recorded".

## Evidence
- `evidence/story-ui/declassified/` contains README.md, `01-red-on-skeleton.txt`, `02-green.txt`, `03-sabotage.md`, `04-accesslint.txt`, `drive-result.json` and the PNGs.
- The supervisor's copies are in `renders/declassified/`. The most important images are `01-journal`, `01b-journal-dryruns-commit`, `09b-all-four-branches` (newest).
- Vault: `vault/Reports/story-ui-declassified.md`.

## Not done / not verified
- **Credits show `TODO_OWNER: third-party assets and their licenses (art lane to list; none yet)`.** That is the data's honest placeholder. I did not invent an assets line. The art lane needs to supply it, or the supervisor should rule "procedural only, no third-party assets" if that is true.
- **Not wired into `echo/main.js`** (platform's file). Nothing in the game opens Declassified yet; it is verified only in the harness. Integration means:
  - `mountDeclassified(uiRoot, { menu, onEvent: (e) => fire(e) })`;
  - `open(runRecord)` on OPEN_SCIENCE.
- **No real run record has been seen.** The samples are §10.3/§10.4 reference values and the CONTRACTS worked dry run. No backend sample exists, so that line always reads "not recorded" in the renders.
- **Not run on Qollab** (only the overseer does that). Every result here is from the local harness.
- **Sabotage nulls the gate cannot see:**
  - ket glyph shape in monospace;
  - probability key order;
  - removing only `setPauseAllowed(false)` (stopPropagation still guards Esc).
- **Not measured:** viewports narrower than 1024×640, and screen-reader output (accesslint only).
- **Port clash:** `terminals-c4`'s sabotage harness held port 8771 during my run. The gate now waits up to 3 minutes. Please give the two lanes distinct ports.

## Decisions inferred from the docs
- **Six tabs:** Journal, The Copy, The Connection, The Transfer, Teach-back, Credits. §4.5 names the three tabs, and the brief asks for journal, teach-back and credits in the same mode. The tabs follow the WAI-ARIA pattern (arrows between tabs, Tab into the panel), per §6.6 "keyboard alone".
- **Teach-back:** each choice shows ✓ "Right." or ✕ "Not quite." plus its why. There is no tally. The right answer is rotated to a different position in each question, so the order gives nothing away. Source: §4.5 "optional, no scoring pressure… not a graded exam".
- **Esc closes Declassified** and fires CLOSE_SCIENCE, unless the credits were reached. Source: §6.6 "Escape backs out… without softlocking".
- **OPEN_CREDITS fires once,** the first time the credits tab opens. Source: contracts v2 edge DECLASSIFIED → CREDITS.
- **Numbers** show at 6 decimals with trailing zeros dropped. Each group is headed by its engine label from §8.4 EngineKind; I named them EXACT / PREVIEW / SAMPLED in plain words.
- **The commit's fidelity** is labelled "Fidelity with the original state (simulation check)", so a reader can't take it for a measurement of the unknown token (§7.4).

## Contract requests for platform
1. **A run-record type in `contracts.js`.** It should be the shape above plus a validator, so gameplay builds the same record the journal reads. Vision §4.5 asks for "What I did", and §8.4 for typed results.
2. **`CREDITS` is terminal.** Once the player reaches the credits there is no valid event for leaving: CLOSE_SCIENCE and RESTART are only valid from DECLASSIFIED and ENDING. Please add `CREDITS: { RESTART: 'TITLE' }`, or `CLOSE_CREDITS → ENDING`. Today `close()` after the credits fires no event.
3. **Wire `mountDeclassified` in `echo/main.js`** on OPEN_SCIENCE with the run record.

## Questions for the owner
- None. The assets credits line is for the art lane or the supervisor to settle, not the owner.

## What the supervisor should do next
1. Read `renders/declassified/` (11 PNGs, provenance `e6fa20da62c9`). Recompute the hash with the command in `evidence/story-ui/declassified/README.md`.
2. Merge `lane/story-ui/declassified` into the lane. It merges clean with `data-fixes`.
3. Send platform the 3 requests above. Contract request 2 blocks a clean exit from the credits.
4. Get the third-party-assets credits line from the art lane, or rule "none, all procedural".
5. Assign distinct harness ports to `declassified` (8771) and `terminals-c4`.
