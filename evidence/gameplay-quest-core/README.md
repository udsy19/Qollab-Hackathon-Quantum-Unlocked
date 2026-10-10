# gameplay-quest-core evidence (lane gameplay, consult 1)
- 01-red-before-impl.txt — `node --test 'dev/gameplay/tests/*.test.mjs'` before any echo/game code existed: exit 1.
- 02-green.txt — same command on the branch tip: exit 0.
- 03-sabotage.md — sabotage table (disposable copies in /tmp/gq-sab), nulls explained.
- 04-playthrough.txt + *.png — `node dev/gameplay/playthrough.mjs 8611 evidence/gameplay-quest-core` against
  `python3 -m http.server 8611` serving the worktree root; headless system Chrome clicking the harness buttons. Local, dev harness only — not Qollab.
