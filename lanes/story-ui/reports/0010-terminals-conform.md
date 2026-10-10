## TL;DR (CHECKPOINT, in progress)
- Merged `lane/story-ui/integration` (is-ancestor exit 0, commit aafc8cc). Data wording won; kept terminal CSS + opening CSS, kept `trivial_pass`.
- `TELEPORT_FAILURE_CASES` rekeyed to `'m0=<b>,m1=<b>|X=<on|off>,Z=<on|off>'` (bade512); check.mjs / sabotage.mjs / render-branch-truth.mjs follow. story-data check GREEN, sabotage 43 red / 4 pre-existing lexical nulls.
- `dryExplanation` now reads the map by named bits (20af3ef). Drive extended to all 16 (m0,m1,X,Z) with its own closed form: red first (5 fail, `evidence/story-ui/terminals/60-red-16-cases-before-fix.txt`), then 172/172 green.
- Pending: fidelity gloss (shell-polish not on integration yet), other drivers, renders, sabotage round, vault report.
