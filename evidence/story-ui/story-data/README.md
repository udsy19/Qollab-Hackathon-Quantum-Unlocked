# story-data evidence (lane story-ui)

What this proves: every word of ECHO's script, HUD, hints, failure lines, terminals, Declassified, teach-back and credits ships as data in `echo/data/{story,objectives,teachback}.js`. It fits 2×42 subtitles, uses only the §2.2 cast, keys on §9.1 states verbatim, gives every interactive state an escalating 3-hint ladder, and avoids the §2.4/§7.5 forbidden claims.

| file | what |
|---|---|
| `check.mjs` | the gate. Exit 0 green · 1 red · 2 refused. Ground truth (states, cast, verbatim text) is parsed from `ECHO_MASTER_VISION.md`, not from the data. |
| `fixtures/bad/` | a deliberately bad data set. The gate must stay red on it. |
| `01-red-on-bad-fixture.txt` | the gate on the bad fixture: exit 1, 43 failures. |
| `02-green.txt` | the gate on the real data: exit 0. |
| `sabotage.mjs` / `03-sabotage.md` | 20 one-line mutations of the real data, each on a temp copy: 16 red, 4 nulls (listed in the table). Refuses if the baseline is not green. |
| `render-script.mjs` / `script.md` | the full script in play order, rendered from the data. ✎ marks new text; *(verbatim §x)* marks text the gate verified against the vision. |

Re-run: `node evidence/story-ui/story-data/check.mjs; node evidence/story-ui/story-data/sabotage.mjs; node evidence/story-ui/story-data/render-script.mjs > evidence/story-ui/story-data/script.md`

**Enabling-step sabotage (law 15):** a vision copy with the §9.1 heading renamed gives exit 2, and one with `### MIRROR` deleted gives exit 2. The gate refuses; it does not grade against a shrunken truth.

**Known nulls (the gate is phrase-based):**
- an entanglement-signalling claim using a verb outside its list ("got the token to the vault");
- a claim excused by an unrelated negation ("in no time");
- a clone claim without a trigger word ("duplicated the |+> state");
- a randomness claim in other words ("truly quantum").

A human physics read of `script.md` is still required.
