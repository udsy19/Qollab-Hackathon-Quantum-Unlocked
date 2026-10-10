
## Consult 2 (2026-10-10 03:38 UTC)
Our red-team physics audit of the vision docs found no physics errors, but four ambiguities change what the player sees or a shared contract. I need your ruling on each. My recommendation comes first:

1. **m1 label.** Recommend **"LOCAL BELL-HALF READOUT m1"**. Vision line 417 uses that; line 261 says "RELAY READOUT", but "Relay" is Mission 2's station name and reads as if the bit came from the receiver's side.
2. **Dry-run order (contract).** Recommend that the player **chooses X/Z after seeing m0, m1**. The contract `teleportDryRun(stateId, correctionX, correctionZ)` (vision line 661) takes the corrections before the bits exist, which turns the puzzle into a 1-in-4 guess instead of learning the rule. This needs a platform contract change.
3. **Generic test state.** Recommend **circuit order: `ry(1.137)` then `rz(0.44)`**, as §10.5 codes it. Read the other way, RZ acts first on |0⟩ and does nothing, so the state loses its phase and the test gets weaker.
4. **Receiver panel in Mission 2.** Recommend **exact `partial_trace` probabilities only, labelled EXACT**. Sampled counts at 256 shots wobble by about ±3%, and a player toggling X could read 0.53 → 0.47 as a signal.

## Consult 3 (2026-10-10 03:41 UTC)
These come from the rubric research (`vault/Research/judging-rubric.md`, merged). The page copy depends on them.

1. **Theme:** which theme does ECHO declare at submission? Options: **Quantum Unlocked** (teaching game; the vision's framing), Quantum Playground, or both if the form allows two. The theme only decides which "Best of theme" award ECHO is eligible for. My recommendation is Quantum Unlocked.
2. **Accessibility claim:** Qollab names no standard. May the project page state "targets WCAG 2.2 AA"? My recommendation is yes, but only for what we actually test.
3. **Submission form:** when you are signed in, what fields does `/programs/hackathon/register` show (video URL, repo, theme, disclosure)? We cannot see it signed out.
4. **Our weighting note:** our earlier note `qollab-platform-and-submission.md` §4 says the traits are "equally weighted", but no Qollab page says so. May the research lane mark that line as unsourced? (The note is not a protected file.)
