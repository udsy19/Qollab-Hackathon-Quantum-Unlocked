I re-ran the opening worker's checks myself on a separate copy, and both passed. The opening driver passed all its checks and the ui-shell driver passed 30 of 30, so the change to `dialogue.js` didn't break anything. Next I'm writing the supervisor output.

=== PLAN ===
**Lane story-ui plan, consult 7 (Sat 2026-10-10 ~00:30 ET / 04:30 UTC, T+5.5h)**

**Goal (unchanged):** vision §4 and §6. That covers:
- a skippable opening and 2-line captions;
- the HUD;
- three terminals (copy_booth, relay_core, teleport_terminal) wired to the §8.4 adapter, with honest error states;
- progressive hints;
- Declassified mode, with the teach-back and the credits;
- pause and settings menus;
- keyboard navigation, visible focus, reduced motion and text scaling.

These are plan rows 5 (G2, Sat 17:00 ET) and 6 (G3, Sun 05:00 ET).

**State, checked from git this consult**
- **The opening is judged and merges this consult.**
  - I looked at all 6 renders myself:
    - the captions are whole sentences;
    - the Skip/Esc button is visible from frame 1;
    - the high-contrast caption style works;
    - 200% text at 1024×640 does not clip;
    - the HUD objective appears in shot D.
  - I re-ran both drivers in a disposable worktree on `73b4ca0`. `drive-opening.mjs` exits 0. The ui-shell `drive.mjs` passes 30 of 30 on the same tree, so the `dialogue.js` auto-mode change did not break the shell.
  - `merge-tree` is clean.
- **`terminals-c4` is running.** It has 4 commits, and its last commit message says 86 checks are green. It still has to conform to v2 before I merge it (the conditions are in the lane memory, consult 5).
  - New merge condition: it must not parse raw bitstrings. It reads the teleport failure cases by the named bits `{m0, m1}` from the contract's `measurementBits`. This is red-team's integration hazard: a lookup in Qiskit's bit order shows a false line in 8 of 16 cases.
- **`declassified` is running.** It has 3 commits and reports 58 of 58 checks green. It also carries the ruled credits line.
- **The free slot goes to `shell-polish`.** It now includes red-team's player-text-audit fixes, except the bit-key rekey, which waits on terminals.

**Red-team player-text-audit, and where each item goes**
- **T1**, the EXACT receiver label: goes to `terminals-c4`. It is a merge condition.
- **T2**, remove "Subtitles off" and route the setting through `captionStyle`: goes to `shell-polish`.
- **T3**, render the terminals, Declassified, the teach-back and the credits: each worker's screenshots must show them, and the integration graybox shows them again.
- **T4**, the credits line, with no `TODO_OWNER` left for names: goes to `declassified` and is a merge condition.
- **MED** items:
  - `teachback.js:46` voices the §2.4 banned sentence: goes to `shell-polish`.
  - Explain "fidelity" in plain words where it is shown: goes to `shell-polish` (data) and `terminals-c4` (display).
- **Bit-key rekey** of `TELEPORT_FAILURE_CASES` to named bits: a small follow-up after `terminals-c4` merges, so that the producer and the consumer change together.

**Approach (unchanged)**
- `mount(root, deps)` UI modules and JS data.
- Delimited sections in `main.css`, and harnesses in `evidence/story-ui/harness/` with one port per worker.
- Contracts come from `echo/contracts.js`.
- Kets are ASCII in the data and become ⟩ at display time.
- The engine label is always visible.

**Done:** ui-shell (consult 2), story-data (c3), data-fixes (c6), opening (c7).

**In flight:** `terminals-c4`, `declassified`, `shell-polish` (new, port 8801).

**Next, in order, as slots free:**
1. **`failure-keys`:** rekey the failure cases by named bits, and update the terminal consumer and the data gate. Starts after `terminals-c4` merges.
2. **`integration`:** mount everything into platform `main.js` and the gameplay code, swap the stub for `echo/quantum/bridge.js` once it lands, and play a graybox in the local runner. Target about Sat 12:00 ET.
3. **A11y pass:** 3 viewports × 200%, with accesslint.

**Merge order** (`main.css` is a hot spot): opening, then terminals-c4, then declassified, then shell-polish. Each later branch merges the lane integration branch first.

**For platform and gameplay** (relay through owner-answers):
- Wire `mountOpening`: `onShot` A–D drives the camera, and `onFinished`/`onSkip` map to the `QUEST_EVENTS`.
- The menu's `subtitles` setting becomes `captionStyle`.
- The triggers for `MOMENTS.teleport_dry_run_00`, `countdown_zero` and `HUD.countdownHeld` are still pending.

**Risks:**
- `terminals-c4` still needs its v2 conform round.
- `bridge.js` has not landed.
- `main.css` conflicts.
- `teachback.js` is touched by both `declassified` (credits) and `shell-polish` (line 46). Those are different hunks, and the later branch rebases.
- G2 is Sat 17:00.

**Per-consult check:** compare the in-flight list with the running list and each branch's commits, and re-dispatch anything missing.
=== END PLAN ===

=== MERGE branch=lane/story-ui/opening ===

=== AGENT name=shell-polish model=opus base=lane/story-ui/integration ===
**GOAL:** a first-time player using only the keyboard, at 100% or 200% text, never sees a sentence cut mid-page, never sees ASCII kets, never meets a control in the wrong font, and can never turn the story text off. Every caption and teach-back line they read is physically true and plain-spoken.

**VISION:** ECHO_MASTER_VISION §6 (UI, captions of 2 lines at most, accessibility), §2.4 (what never to claim), §12.5. CLAUDE.md lists subtitles, contrast, reduced motion and visible focus as non-negotiable. Owner ruling: captions are always on, and the setting is a style only.

**WHAT WE ARE BUILDING:** the story-ui shell in `echo/ui/{accessibility,dialogue,menu,hud}.js`, the shell sections of `echo/main.css`, and the copy in `echo/data/`. It all mounts into the platform's `#echo-ui` root. Qollab loads only `main.css`. There is no storage, and harnesses stay outside `echo/`.

**WHAT HAS NOT WORKED:**
- ui-shell's driver passed 30 of 30, yet the supervisor's own look found three defects: pages break mid-sentence, kets render as ASCII `|x>`, and the settings select uses the system font. A green driver checks what its author thought of, not what a reader sees.
- "Subtitles off" (`main.css` ~line 298, `[data-subtitles="off"] .echo-dialogue {display:none}`) hides the whole story, because there is no voice-over. Red-team flagged this as HIGH (T2).
- `echo/data/teachback.js` ~line 46 quotes the §2.4 banned sentence "Entanglement sends the secret instantly." as a misconception (MED).
- The 200% check ran only at 1280×720, and the HUD `nowrap` sabotage was a null there.
- The phrase gate cannot judge physics. A human read is still required.

**DO FIRST:**
1. Check whether the opening is in your base: `git merge-base --is-ancestor lane/story-ui/opening HEAD`. If it exits 1, run `git merge lane/story-ui/opening`. The opening added `captionStyle` to `accessibility.js` and an auto mode to `dialogue.js`. Build on both, and do not fork them.
2. Do the same check for `main`.

**SCOPE (one task: shell polish):**
1. **Pagination:** dialogue pages break at sentence boundaries, and a page is 2 lines at most at every text scale. Fall back to a word boundary only when one sentence is longer than 2 lines.
2. **Kets:** `|x>` becomes `|x⟩` at display time in the dialogue, the HUD and any shell text. The data stays ASCII, because the story-data gate compares it byte for byte with the vision. Put the transform in ONE exported helper that the terminals and Declassified can import. First run `node scripts/where.mjs ket --branches` and `git grep -n "⟩"` across `lane/story-ui/*`; if terminals-c4 or declassified already wrote one, reuse it and say so.
3. **Select font:** form controls inherit the UI font.
4. **Captions are always on:**
   - remove the Subtitles on/off control and the `data-subtitles="off"` rule;
   - the menu exposes `captionStyle` exactly as `echo/contracts.js` defines it;
   - delete the now-dead `subtitles` path from `accessibility.js` and `menu.js`, then grep that zero references remain (no-bloat).
5. **Teach-back line 46:** rephrase the misconception so the banned sentence is never voiced, even as a quote, and keep the refutation on the very next line. Do not touch the credits block, because declassified owns that edit.
6. **"Fidelity" in plain words:** where the data shows fidelity to the player, add a one-line plain gloss, e.g. "how closely the received state matches the original, where 1 means identical". It must stay true for every value shown. Check it against the closed form X^(x⊕m1) Z^(z⊕m0)·ψ: on ry(1.137), a wrong Z correction gives 0.177.
7. **200% at more viewports:** run the existing `drive.mjs` at 1024×640 and 1366×768 at 200% text. Close the HUD `nowrap` null with a check that goes red when wrapping is allowed.

**Vault notes to read:**
- `vault/Reports/story-ui-ui-shell-harness.md`
- `vault/Reports/story-ui-opening.md`
- `vault/Reports/story-data-script-gate.md`
- `vault/Research/qollab-platform-and-submission.md`
- `vault/Index.md` (promoted lessons)
- `lanes/story-ui/rulings.md`
- the red-team relay "player-text-audit" in `lanes/story-ui/owner-answers.md` (newest entry)

**Where to start:**
- `evidence/story-ui/harness/drive.mjs` (extend it, do not write a new driver);
- `echo/ui/dialogue.js`;
- `echo/ui/menu.js`;
- `echo/main.css`;
- `evidence/story-ui/story-data/check.mjs`, which must stay green.

Serve on port **8801**, and only on that port.

**Deliver:**
- **Checks written first and watched red:** a mid-sentence break, a `|x>` on screen, a system-font select, a "Subtitles off" control, and the banned sentence present in the data.
- **The fixes**, with both gates green: `node evidence/story-ui/harness/drive.mjs 8801 …` and `node evidence/story-ui/story-data/check.mjs`.
- **A sabotage round on disposable copies**, reporting its nulls.
- **Renders** in `evidence/story-ui/shell-polish/` and `renders/shell-polish/`, at minimum:
  - a long line at 200% at 1024×640, split at a sentence boundary;
  - a ket line showing ⟩;
  - the settings menu with the caption-style select, in the UI font, with visible focus;
  - the HUD at 1366×768 at 200%.

  Each render carries a provenance badge from your file hash.
- **Contract-check results:** `node tools/contract-check/check.mjs` and `node tools/qollab-caps/check.mjs`. Report their exit codes; red caused by another lane's missing files counts as "not mine" only with the output to show it.
- **A vault report** at `vault/Reports/story-ui-shell-polish.md`.

**How I will judge it:**
- I will open your renders myself, and the screenshot wins over the driver.
- I will re-run both gates in a disposable worktree.
- I will grep for `subtitles` and the banned sentence.
- I will check every fidelity gloss against all 16 (bits × plan) cases.

**Report:** `lanes/story-ui/reports/NNNN-shell-polish.md`.
- Open with the TL;DR and the **Vault check** (notes read, already known, reused, stale).
- Then: results with commands, exit codes and paths; nulls; not done; decisions inferred from the docs, with citations.
- Commit a **checkpoint within 25 minutes** and a checkpoint report within 1 hour. Commit as you go: a lane restart loses uncommitted work.
=== END AGENT ===

=== LEARN ===
2026-10-10, consult 7. I merged the opening after re-running BOTH the opening driver and the ui-shell `drive.mjs` in a disposable worktree on the opening tip. The ui-shell driver passed 30 of 30. The opening edited the shared `dialogue.js` (auto mode), so a branch that edits a shared module must also pass the gates of the modules it touched, not only its own driver.

Recipe: run `git worktree add --detach /tmp/sv-X <branch>`, start a `python3 -m http.server <port>` from that root, run each `drive*.mjs <port> /tmp/out`, then remove the worktree.
=== END LEARN ===

=== LEARN ===
2026-10-10, consult 7. Red-team's bit-order hazard: `TELEPORT_FAILURE_CASES` is keyed by `'m0m1:XZ'`, which is the reverse of Qiskit's bitstring order (c1c0). A consumer that builds the key from raw counts shows false lines in 8 of 16 cases.

Rule: every consumer reads `measurementBits.{m0, m1}` by name from the contract `ExperimentResult`. I will refuse to merge any terminal code that slices a bitstring. The data rekey to named bits is a separate follow-up (`failure-keys`) after terminals-c4 merges, so that the producer and the consumer change in one branch.
=== END LEARN ===

=== LEARN ===
2026-10-10, consult 7, decided from the docs. Quoting a banned claim as a "misconception" still voices it. §2.4 says "Never say 'quantum entanglement transmits the secret instantly'", and it gives no exception for quotes. Misconception copy must paraphrase the wrong idea without the banned wording and refute it on the next line.
=== END LEARN ===
