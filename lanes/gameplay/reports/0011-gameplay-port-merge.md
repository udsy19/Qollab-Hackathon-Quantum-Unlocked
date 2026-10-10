# 0011 gameplay-port-merge — CHECKPOINT 1

## TL;DR
- IN PROGRESS. Merge commit `666c499` on `lane/gameplay/gameplay-port-merge`: integration (7c4741b) merged into the port (6660774); `merge-base --is-ancestor 7c4741b` true; the awaiting_ruling/quest:enter/BOOTED grep is empty (exit 1).
- Unit 56/56 exit 0; contract-check 1264/1264 exit 0; qollab-caps exit 1 (entry-index, entry-main only); flat playthrough exit 0 with commit calls {"0":2,"2":1,"3":1}.
- The auto-merge of state.test hid a v1 call (`send('ANIMATION_END')` with no via) — red until fixed.
- Next: world playthrough --falsify --publish (run 2 forces a refused commit in the 3D world), seam.mjs, report.
