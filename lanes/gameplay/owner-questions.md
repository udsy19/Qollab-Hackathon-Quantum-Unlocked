
## Consult 2 (2026-10-10 03:32 UTC)
Gameplay lane has three small questions. They come from the quest-core worker and the vision docs do not settle them. The build continues with the current behaviour in the meantime.

1. **Teleport dry-run retry.** When the player picks the wrong X/Z corrections, the retry uses a newly prepared calibration state. As built, it cycles through 6 calibration states. Should a retry use the **same** calibration state with fresh measurement bits instead? Or keep cycling?
2. **ENDING → restart.** Should the ending screen offer RESTART directly? Right now restart is only reachable via Declassified → Credits.
3. **Acknowledgement steps** ("I read the explanation", "view receiver marginal"). Is a button press enough to advance? Or must the player first have had the result panel on screen? As built, a press is enough.

Evidence of the current flow:
- [dry run, wrong corrections](renders/gameplay-quest-core/04-dry-run-wrong-corrections.png)
- [committed](renders/gameplay-quest-core/05-committed.png)

## Consult 3 (2026-10-10 03:40 UTC)
Two quest choices that the vision docs do not settle. They come from the gameplay adversarial review (`vault/Reports/quest-core-adversarial-review.md`). Building continues meanwhile.

1. **What happens if the final COMMIT fails after the story token was measured?** Possible causes are a bridge error or a rejected result. §7.4 forbids measuring the token again, so a plain retry would break the physics. Options:
   - (a) **Recommended:** an honest "transfer lost — the original was consumed" screen that offers RESTART (`resetGame()`).
   - (b) A scripted recovery with no second measurement.
   - (c) Something else.

   Until you answer, gameplay latches the commit so it can never fire twice.
2. **What unlocks COMMIT in the rooftop dry run?** Today, one correct calibration is enough, and if the random bits come out 00 the passing answer is "change nothing". `CLAUDE.md` says the player should "make all four conditional correction choices". Options:
   - (a) **Recommended:** at least one correct pass where the bits are not 00, so the player must actually apply X and/or Z.
   - (b) All four bit outcomes corrected correctly.
   - (c) One correct pass of any kind, as built.
