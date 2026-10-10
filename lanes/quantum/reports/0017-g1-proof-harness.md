## TL;DR (CHECKPOINT 1)
- Trial merge: integration 24e0ba7 + backend-site-move 490f3b1 + commit-seam-fix b18b878 is CLEAN, zero conflicting paths, same tree (6f60010…) in both merge orders. Trial commit 28e94ea (commit-tree, parents a95dd81 and b18b878).
- prove.sh written at evidence/quantum/g1-proof/prove.sh; fast gates already run on integration (pytest 595 PASS, contract-check 1087/1087 PASS, caps RED on backend-run-python (qollab_job.py:169), seam RED 7 FAIL). Full round and falsification still to do.
