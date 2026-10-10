## TL;DR
- CHECKPOINT (in progress). Red-first fixtures committed (9fa7b91): 23 backend.run form/site fixtures + 6 false-positive fixtures/controls under `tools/qollab-caps/fixtures/forms/`.
- On the UNCHANGED gate: 19 of 21 escape/site fixtures go GREEN (blind), only `js-bracket` and `js-object-prop` are caught (by the JS count). Both false-positive fixtures are RED. Log: `evidence/platform/caps-backend-run-forms/fixtures-before.log`.
- Assembled integration tree (assemble-echo, exit 1 for 2 contracts CONFLICTs) has 2 genuine sites: `main.js:199` (JS, not in bridge.js) and `quantum/qollab_job.py:169` (Python, reached via bridge.js `callPromising(backend)`). Today's gate reds only the Python one; its count rule counted JS sites only.
- Next: taint-tracking detector + `backend-run-site` rule (site must be in `quantum/bridge.js` inside `verifySelectedBackendOnce`) + reachability-scoped downgrade of string-only hits in files main.js cannot execute.

### Checkpoint 2
- Commit: the detector (taint through aliases, containers, destructuring, reflection, and call arguments, tree-wide by function name, JS and Python), plus the `backend-run-site` and `backend-run-escape` rules and the reachability-scoped string hits. Fixtures: 54/54 as written (`fixtures-after.log`).
- Integration tree: RED with 2 genuine sites (`main.js:199`, `quantum/qollab_job.py:169`) and 1 escape (`quantum/bridge.js:52`, `fn.callPromising(...args)`, which is how backend reaches Python). Red-team's 2 real false positives (test_qollab_job.py:207 at c6558fb) are now info lines.
- Next: Python adversarial probes, sabotage round, docs/LIMITATIONS, vault report.
