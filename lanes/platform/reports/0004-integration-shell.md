# 0004 integration-shell — CHECKPOINT 1 (partial)

## TL;DR
- PARTIAL. `tools/assemble-echo/` committed (31a85f7): assembles echo/ from the five lane refs by lane ownership; fixtures 8/8 in a throw-away repo.
- On today's real refs it is RED (exit 1), as predicted: `CONFLICT echo/main.css` (platform vs story-ui) and `NON-OWNER echo/quantum/smoke.py` (platform carries a quantum path).
- Next: real `echo/index.html` + `echo/main.js` (story-ui menu over the canvas, gameplay machine on contracts.js), retire the G0 smoke files, serve the assembled tree on port 4890+, screenshots.
- Finding: `lane/gameplay/integration` still has its OWN state table (`BOOTED`, not contracts' `BOOT_COMPLETE`); the contracts-based machine is on `lane/gameplay/gameplay-contracts-migration`. Shell targets the migration API.
- Finding: quantum's `qollab_job.py` returns `experiment: "bell_verification"`; contracts v1 has neither it nor the owner-ruled `backend_verification`.

## Next
Build the shell, then the runner check + sabotage round.
