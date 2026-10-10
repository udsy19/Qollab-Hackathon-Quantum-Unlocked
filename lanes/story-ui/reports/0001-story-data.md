## TL;DR
DONE and verified locally with Node; not wired into the game and not run on Qollab. All of ECHO's text now ships as data on `lane/story-ui/story-data`: commit `680608e` (the gate, written first), then `502b20d` and `e234721` (the data).
- `echo/data/story.js` holds 74 beats (23 verbatim from the vision, 51 new), keyed by §9.1 states. `objectives.js` holds the HUD and terminal copy, 15 objectives, 14 three-step hint ladders and the failure lines. `teachback.js` holds the journal, the Declassified tabs, the 3 teach-back questions and the credits (team names are a marked `TODO_OWNER` placeholder).
- The gate is `node evidence/story-ui/story-data/check.mjs`:
  - exit 2 with no data, exit 1 on the bad fixture (43 failures), exit 0 on the real data.
  - It also caught 6 real defects in my own first draft.
- Sabotage: 20 mutations of the real data → **16 red, 4 nulls** (below). Breaking the enabling step (a vision copy with §9.1 or MIRROR removed) → exit 2.
- **Read this:** `evidence/story-ui/story-data/script.md`, the full script in play order. ✎ marks every new line for owner review; *(verbatim §x)* marks text the gate checked byte-for-byte against the vision.
- Recommend: merge after a human physics read of script.md, then send the 7 owner questions below.

## Vault check
- **Read:** vault/AGENTS.md, vault/Index.md, vault/Home.md (NOW), vault/Research/qollab-platform-and-submission.md, lanes/story-ui/{context,owner-answers,rulings}.md, reports/0001-ui-shell.md, and ECHO_MASTER_VISION §2, §4, §6, §7, §8.2, §9.
- **Already known:**
  - No story data existed. `where.mjs STORY|OBJECTIVES|HINTS|teachback --branches` exited 1 everywhere.
  - Story data must ship as JS modules, not JSON.
  - The ui-shell `dialogue.play()` takes `[{speaker, text}]`.
  - The platform `echo/contracts.js` (unlanded, `lane/platform/shared-contracts`) holds the state names and the interactable ids, including `teleport_terminal`.
  - Owner rulings: dry runs use fresh random generic states; the "mistake doesn't show on this state" note is an optional fact; RESTART sits on the ending screen.
- **Reused:**
  - The §9.1 state names and the contract's interactable ids, verbatim.
  - The ui-shell beat shape. My extra fields (`src`, `direction`, `misconception`) are ignored by `play()`.
- **Stale:** the vault Index lists no story-ui reports yet. That is expected, since hubs are regenerated on merge, and I did not commit hub output.

## What I found / decided
- **Story-physics gap in the vision.** §4.3 implies one pre-shared pair at the relay, but unlimited dry runs (§7.4) each use up a pair. I wrote the relay as holding *many* pre-shared halves, with their partners at the vault, plus an in-room test rig for the no-signalling demo. That keeps the vault pairs for the real transfer. *(Question 2.)*
- **VEGA's first appearance.** §4.2 has VEGA speaking at the booth, but §4.3 says the relay switch "awakens" VEGA. I wrote the booth VEGA as a voice on the maintenance channel and the relay as its full wake-up. *(Question 1.)*
- **m1's label.** §4.4 calls it `RELAY READOUT m1`; §6.5 and §7.1 call it the local Bell half. I followed the normative §7.1: `m1  LOCAL BELL-HALF READOUT`. *(Question 3.)*
- **Mica's two misconceptions** ("Then copy it…", "But you still have it, right?") are tagged `misconception: true`. The gate requires the very next beat to correct each one with a negation.
- **Hint ladders.** There is one ladder per interactive state (FREE_ROAM_ALLEY … TELEPORT_DRY_RUN_PASSED), each ordered `inspect → resource → operation` (§6.6). The order is checked by `kind`.
- **Rin's pronouns** are not in the vision. I used none, and replaced one "her" I had written.

## What I changed (commits on `lane/story-ui/story-data`)
- `680608e`: `check.mjs` and the bad fixture, written and run red before any data existed.
- `502b20d`: `echo/data/story.js`, `objectives.js`, `teachback.js`.
- `e234721`: the sabotage round, the rendered `script.md`, the evidence README, physics fixes from my read-through, and `vault/Reports/story-data-script-gate.md`.

## Evidence (command → exit → artifact)
- `node evidence/story-ui/story-data/check.mjs` (before any data) → exit 2 (refused: `echo/data/story.js` missing).
- `node evidence/story-ui/story-data/check.mjs --data evidence/story-ui/story-data/fixtures/bad` → exit 1 → `evidence/story-ui/story-data/01-red-on-bad-fixture.txt`.
- `node evidence/story-ui/story-data/check.mjs` → exit 0 → `evidence/story-ui/story-data/02-green.txt` (74 beats, 14 ladders, ~500 strings scanned).
- `node evidence/story-ui/story-data/sabotage.mjs` → exit 0 → `evidence/story-ui/story-data/03-sabotage.md` (20 cases: 16 red, 4 null).
- `node evidence/story-ui/story-data/render-script.mjs > evidence/story-ui/story-data/script.md` → exit 0.

**Red-first catches in my own gate and data:**
1. `\bno\b` matched "No-cloning". That excused "No-cloning prevents storing classical data" until the name was stripped first.
2. Four overlong beats, which I split rather than truncated.
3. A false `src` claim on a hint.
4. "…not physical quantum randomness" was flagged. I reworded the text and kept the rule.
5. A new "perfect/true copy" rule flagged a correct counterfactual in the baseline, which made every sabotage read red for the wrong reason. `sabotage.mjs` now refuses unless the baseline is green.

## Nulls (sabotages that stayed GREEN)
1. An entanglement-signalling claim with a verb outside the list: "The Bell pair alone got the token to the vault."
2. A claim excused by an unrelated negation: "…carried the secret across the city in no time."
3. A clone claim with no trigger word: "The booth duplicated the |+> state."
4. A randomness claim in other words: "Simulator randomness is truly quantum."

The gate matches phrases. It catches the classes it names, and it does not replace a human physics read.

## What I did NOT do / could not verify
- I did not wire the data into `ui/` or `game/`, and I did not play it in a browser. There are no screenshots, because nothing renders this text yet.
- Not run on Qollab. Node only.
- I did not time the script in play. It has 673 spoken words (about 4.5 min of captions at 150 wpm), so ~10 minutes with play is an estimate, not a measurement.
- I did not commit vault hub output (`vault-hubs --check` reports 2 stale hubs; the loop regenerates them).

## Contract requests for platform/gameplay
- **Gameplay** must fire 4 MOMENTS that are not state transitions:
  - `clone_increase_voltage`: the voltage choice;
  - `relay_bay_cable`: §4.3 Beat 3's amber cable in the relay bay. This is an interaction §9.2 has no event for, so gameplay needs to decide whether it exists;
  - `teleport_commit_locked`;
  - `teleport_dry_run_failed`.
- **Terminal (story-ui) and quantum:** `FAILURES.teleportation.{missing_X, missing_Z, extra_X, extra_Z, no_corrections, blind_spot}` need to know which correction was wrong. The terminal can derive this from `measurementBits` and the player's plan. `blind_spot` needs the quantum lane's optional "does not show on this state" fact.
- **HUD:** templates use `{n}`, `{m0}`, `{m1}`, `{x}`, `{z}` slots.
- **HUD:** interact labels are keyed by the `INTERACTABLE_IDS` values.

## Questions for the owner
1. VEGA speaks at the booth (§4.2), but §4.3 says the relay "awakens" VEGA. I made the booth VEGA a voice on the maintenance channel and the relay its full wake-up. Is that OK?
2. I made the relay hold many pre-shared pairs, plus an in-room test rig, so unlimited dry runs don't use up "the" pair. Do you accept this addition to §4.3?
3. m1's label: §4.4 says `RELAY READOUT m1`, §6.5/§7.1 say local Bell half. I used `LOCAL BELL-HALF READOUT`. Is that OK?
4. Credits: what are the team and credit names? (They are a `TODO_OWNER` placeholder.)
5. What happens when the GRID SHUTDOWN countdown reaches zero? The vision does not say, so I wrote no line for it.
6. Rin's pronouns are not in the vision. Should the text use any?
7. Teach-back: I wrote each question as 1 right and 2 wrong choices, with no score and a "why" for every choice. Is that OK, or do you want the questions open-ended?

## What the supervisor should do next
1. Read `evidence/story-ui/story-data/script.md` top to bottom. Every ✎ line is new text, and the nulls above are the reason a human physics read is still needed.
2. Raise the 7 questions with `=== ASK_OWNER ===`. Q2 and Q5 affect gameplay as well.
3. Merge `lane/story-ui/story-data` once you are satisfied: it touches only `echo/data/`, plus evidence and the vault report.
4. Then brief the terminal worker to consume `TERMINALS` and `FAILURES`, and gameplay to fire the 4 MOMENTS.
