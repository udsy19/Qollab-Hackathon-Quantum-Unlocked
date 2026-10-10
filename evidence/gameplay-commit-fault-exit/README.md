# gameplay-commit-fault-exit: a commit refused after measurement offers RESTART

Goal: a player whose final COMMIT came back from the engine but was refused is never stranded. The story token was measured (§7.4), so COMMIT never re-arms. The player sees an honest scientific-module error and RESTART (§9.5). The next session gets a fresh token and commits.

| file | what it shows |
|---|---|
| `red-before.txt` | new unit tests on the old tip c49a922: 2 fail (old latch name; `commitFault` undefined) |
| `red-before-playthrough.txt` | new playthrough on a scratch copy of c49a922: exit 1 at the latch assertion |
| `green-after.txt` | `node --test 'dev/gameplay/tests/*.test.mjs'` after the fix: 56 pass, exit 0 |
| `playthrough.txt` + `playthrough/*.png` | harness playthrough on a private port, exit 0; includes the per-session engine commit-call count, measured at the quantum adapter and not the machine |
| `playthrough/11-commit-measured-refused-honest-error-restart-offered.png` | honest error; COMMIT disabled; RESTART offered |
| `playthrough/12-after-fault-restart-next-session-reaches-ending.png` | the session after RESTART commits and reaches ENDING |
| `sabotage/run.sh`, `sabotage/summary.txt`, `sabotage/*.txt` | sabotage round on disposable copies in /tmp, with an unmutated control (green) and a no-op control (refused) |

PNG numbering depends on how many dry runs came back 00 and were retried (random); the names are stable.

Re-run: `node --test 'dev/gameplay/tests/*.test.mjs'`; `python3 -m http.server <port> --bind 127.0.0.1` at the repo root, then `node dev/gameplay/playthrough.mjs <port> <outDir>`; `bash evidence/gameplay-commit-fault-exit/sabotage/run.sh`.

Fake quantum (`documented_preview`) only. This is no evidence about the real engine, Qollab or IonQ.
