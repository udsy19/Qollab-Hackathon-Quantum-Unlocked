## TL;DR
- **Done and verified locally.** All 6 brief items are fixed in `echo/data/` and gated. Gate: red (exit 1, 28 failures) → green (exit 0). Branch `lane/story-ui/data-fixes`: commits b52954b, 8cf12cb, 9127f62, e61a537.
- **Teleport failure lines are now true for all 16 (m0, m1) × (X, Z) cases**, checked against the real protocol in local Qiskit: `evidence/story-ui/data-fixes/branch-truth.md`.
- **The case map is now data** (`TELEPORT_FAILURE_CASES`). With the map added and the OLD text kept, the gate went red in exactly the 4 both-wrong cases, with 8 false claims (`02-red-branch-truth-old-text.txt`).
- **New defect your read missed:** `missing_X`/`missing_Z` ("left bit-flipped") were also false in those 4 cases. The receiver held XZ·state.
- **Sabotage:** 48 cases, 43 red, 4 nulls (the same 4 old phrase nulls), 1 refused by the gate (Python missing → exit 2). Every one of the 28 new cases goes red, including 2 that break the PHYSICS script rather than the data (`04-sabotage.md`).
- **Old → new for every changed line:** `evidence/story-ui/data-fixes/05-diff.md`.
- **Recommend:** merge into `lane/story-ui`. Tell gameplay/ui that `TELEPORT_FAILURE_CASES`, `MOMENTS.teleport_dry_run_00`, `MOMENTS.countdown_zero` and `HUD.countdownHeld` now exist and need triggers.

## Vault check
- **Read:**
  - `vault/AGENTS.md` (delivered by the SessionStart hook);
  - `vault/Reports/story-data-script-gate.md`;
  - `evidence/story-ui/story-data/{README.md,03-sabotage.md,check.mjs,sabotage.mjs}`;
  - `lanes/story-ui/context.md` and `rulings.md`;
  - vision §1 anti-goals (line 89), §2.2, §4.4 Beat 3, §7.4 (line 507), §9.1, §9.3 (line 787).
- **Already known:** the phrase gate has 4 nulls and cannot judge physics, and `sabotage.mjs` refuses on a non-green baseline.
- **Reused:**
  - I extended `check.mjs` and `sabotage.mjs` rather than writing new gates;
  - I reused `render-script.mjs` unchanged;
  - `where.mjs`/`git grep`: no consumer of `FAILURES` exists on any branch (`echo/ui` has only hud/menu/dialogue/accessibility), so restructuring the teleport failure keys breaks nothing.
- **Stale:** none of the notes I read. `rulings.md` words the credits "(NYU Tandon)". Your brief's "(NYU Tandon School of Engineering)" is what I used, byte for byte.

## What I found
1. **The named defect:** `extra_X`/`extra_Z` say "already right". That is false in 00:11, 01:01 and 10:10, where the receiver holds XZ·state.
2. **An unnamed defect:** `missing_X`/`missing_Z` say "left bit-/phase-flipped". That is false (it claims a single flip) in 01:01, 10:10 and 11:00.
3. **The physics:** before correction the receiver holds X^m1 Z^m0·state. After the plan it holds X^(x⊕m1) Z^(z⊕m0)·state. A line that speaks only about its own switch is therefore true whatever the other switch is. The new lines do exactly that, and a both-wrong plan shows two lines.
4. **Two more lines claimed too much.** `no_corrections` ("Without the two bits the receiver cannot know…") is shown after the player has seen the bits, and it duplicated `missing_*`, so I deleted it. "Your correction rule holds/is proven" after one tested branch was an overclaim; it now reads "Those corrections were right" and "Your corrections worked on a test state".
5. **The 00 bits case:** a dry run with bits 00 and the correct plan needs no correction, yet per the ruling it must not unlock COMMIT. There was no line for it, so I added `MOMENTS.teleport_dry_run_00`.

**The 16 cases (fidelity with the test state, from Qiskit):**

| key m0m1:XZ | receiver holds | fidelity | lines |
|---|---|---|---|
| 00:00 · 01:10 · 10:01 · 11:11 | state | 1.0000 | none |
| 00:10 · 10:11 | X·state | 0.6740 | extra_X |
| 01:00 · 11:01 | X·state | 0.6740 | missing_X |
| 00:01 · 01:11 | Z·state | 0.1767 | extra_Z |
| 10:00 · 11:10 | Z·state | 0.1767 | missing_Z |
| 00:11 | XZ·state | 0.1494 | extra_X + extra_Z |
| 01:01 | XZ·state | 0.1494 | missing_X + extra_Z |
| 10:10 | XZ·state | 0.1494 | extra_X + missing_Z |
| 11:00 | XZ·state | 0.1494 | missing_X + missing_Z |

**The lines:**
- `missing_X` "m1 = 1 but X was off. The bit flip that m1 = 1 flags was never undone."
- `missing_Z` "m0 = 1 but Z was off. The phase flip that m0 = 1 flags was never undone."
- `extra_X` "X was on but m1 = 0. That X added a bit flip the bits never called for."
- `extra_Z` "Z was on but m0 = 0. That Z added a phase flip the bits never called for."

## What I changed
- **Gate** (`evidence/story-ui/story-data/check.mjs`), § 7 rulings:
  - credits team/support/license exact, no emails;
  - m0/m1 labels exact;
  - no "partner at the vault", and a dry-run sentence naming the vault must be about COMMIT or be negated;
  - 00:00: a `countdown_zero` beat whose "held" is about the isolation, plus `HUD.countdownHeld`, and no "game over / too late" anywhere (anchored to the vision's anti-goal text; refuses if that text is gone);
  - a 00 dry-run beat, and `commit_locked` names the non-00 rule;
  - no gendered pronouns;
  - teach-back: exactly 1 right and 2 wrong, every choice has a why, unscored;
  - no "captions off".
- **Gate § 8, branch truth:**
  - it spawns `branch_truth.py` and refuses (exit 2) if the script will not run;
  - it requires all 16 keys, and a correct plan shows no line;
  - every leftover flip must be named;
  - each selected line's claim must hold for that case;
  - "already right" or "left X-flipped" wording is only allowed when that flip is the whole error;
  - an unknown failure key cannot be judged, so it is red;
  - each claim record is bound to its line's words.
- **Data:** `echo/data/objectives.js`, `story.js`, `teachback.js`. Every line, old and new, is in `05-diff.md`. Highlights:
  - credits;
  - labels "SOURCE READOUT m0" and "LOCAL BELL-HALF READOUT m1";
  - dry run: "This console has a test rig. Both Bell halves stay here." / "Only COMMIT spends a vault pair.";
  - slot label `RECEIVER BELL HALF` (it was REMOTE, which was false for a dry run);
  - `countdown_zero`: MIRROR "Grid isolation held. Manual confirmation pending." / MICA "The clock hit zero. Backup is still holding. Hurry, Rin.";
  - `HUD.countdownHeld` 'ISOLATION HELD // AWAITING CONFIRMATION';
  - VEGA at the relay: "Relay maintenance core online. Fully awake, at last.";
  - relay scan adds "TEST RIG ON SITE.";
  - hint drops "Set this for all four results", which contradicted the bits-first ruling.
- **Sabotage** (`sabotage.mjs`): 28 new cases, physics-script mutation support, and refusals by the gate reported as exit 2.
- **Rendered and reported:** `script.md` regenerated; `vault/Reports/story-data-script-gate.md` gets a consult-4 section.

## Evidence
`evidence/story-ui/data-fixes/`:
- `01-red-on-current-data.txt` (exit 1, 28 failures);
- `02-red-branch-truth-old-text.txt` (exit 1);
- `03-green.txt` (exit 0);
- `04-sabotage.md` (48 / 43 red / 4 null / 1 refused by the gate);
- `05-diff.md`;
- `branch-truth.md`, `branch_truth.py`, `render-branch-truth.mjs`.

Plus `evidence/story-ui/story-data/script.md`. All of this is local only (Node and the repo venv's Qiskit 2.5). Nothing ran on Qollab.

## What I did NOT do or could not verify
- **No product screenshot.** No terminal UI consumes these lines yet, so there is no real-product path to show. The data is verified by the gate and the Qiskit table only.
- **Nulls (still unseen by the gate):**
  - the 4 old phrase nulls (signalling verb outside the list, an unrelated "no", a clone claim with no trigger word, a randomness claim in other words);
  - § 7's checks are presence/phrase checks, so a pronoun-free sentence that still genders Rin, or a timer-ends-game claim in other words, would pass.
- **`blind_spot` is not table-checked.** It is conditional on a random state's fidelity; on the ruled generic state it never fires.
- **The assets credit is still `TODO_OWNER`**, reported as a placeholder. The art lane lists no assets yet.
- **The gate's Python path defaults to the main checkout's venv** (`ECHO_PYTHON` overrides it). On a machine without it the gate refuses (exit 2); it never passes.

## Decisions inferred from the docs
- **Failure lines** are one line per wrong switch, two for a both-wrong plan. Basis: vision §6.6 "every failure says why" and §4.4 Beat 3 "with explanation". A single composite line per case would be equally true; the per-switch form was the smallest set.
- **`no_corrections` deleted.** It duplicated `missing_*` and misframed a case where the bits were visible (no-bloat rule).
- **00:00 wording.** MIRROR's "held, manual confirmation pending" gives an in-world reason the isolation does not complete. Basis: vision §1 line 89 (no game-over from the timer) and §9.3 line 787 (never negative). TELEPORT_COMMITTED's "isolation aborted" still follows from it.
- **"Receiver applies the same rule" at commit.** Basis: vision §7.4 line 507 ("already-calibrated receiver applies X/Z conditioned on those live bits") and the atomic-commit ruling.
- **Slot label RECEIVER BELL HALF.** It is true in both dry run and commit; REMOTE was false for the in-room rig.

## What the supervisor should do next
1. Read the 4 failure lines against the 16-row table above, or `branch-truth.md`.
2. Merge `lane/story-ui/data-fixes` into `lane/story-ui`.
3. Tell **gameplay** about the new triggers:
   - `MOMENTS.teleport_dry_run_00` fires on a correct 00 dry run, and COMMIT stays locked;
   - `MOMENTS.countdown_zero` and `HUD.countdownHeld` fire at 00:00, with the display held and no state change;
   - the terminal looks up `TELEPORT_FAILURE_CASES['m0m1:XZ']` and shows every listed line.
4. Tell **ui/terminal** that the m0/m1 labels and the RECEIVER slot changed.
5. Ask the **art lane** for the asset/license list to replace the last `TODO_OWNER`.
